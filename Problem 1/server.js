const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 11 // 1 profile pic + max 10 other pics
    }
});

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));

// Validation rules
const validationRules = [
    body('username')
        .isLength({ min: 3, max: 20 })
        .withMessage('Username must be between 3 and 20 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),
    
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email address')
        .normalizeEmail(),
    
    body('gender')
        .notEmpty()
        .withMessage('Please select a gender'),
    
    body('hobbies')
        .optional()
        .isArray({ min: 1 })
        .withMessage('Please select at least one hobby')
];

// Routes
app.get('/', (req, res) => {
    res.render('register', {
        errors: [],
        formData: {},
        success: false
    });
});

app.post('/register', upload.fields([
    { name: 'profilePic', maxCount: 1 },
    { name: 'otherPics', maxCount: 10 }
]), validationRules, (req, res) => {
    const errors = validationResult(req);
    const formData = req.body;
    
    // Handle file upload errors
    let fileErrors = [];
    if (req.fileValidationError) {
        fileErrors.push({ msg: req.fileValidationError });
    }
    
    // Check if profile picture is uploaded
    if (!req.files || !req.files.profilePic) {
        fileErrors.push({ msg: 'Profile picture is required' });
    }
    
    // Combine validation errors with file errors
    let allErrors = errors.array().concat(fileErrors);
    
    if (allErrors.length > 0) {
        // Clean up uploaded files if validation fails
        if (req.files) {
            if (req.files.profilePic) {
                req.files.profilePic.forEach(file => {
                    fs.unlink(file.path, () => {});
                });
            }
            if (req.files.otherPics) {
                req.files.otherPics.forEach(file => {
                    fs.unlink(file.path, () => {});
                });
            }
        }
        
        return res.render('register', {
            errors: allErrors,
            formData: formData,
            success: false
        });
    }
    
    // If validation passes, render success page
    const userData = {
        username: formData.username,
        email: formData.email,
        gender: formData.gender,
        hobbies: Array.isArray(formData.hobbies) ? formData.hobbies : [formData.hobbies],
        profilePic: req.files.profilePic ? req.files.profilePic[0] : null,
        otherPics: req.files.otherPics || []
    };
    
    res.render('success', { userData });
});

// File download route
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('<h1>File Not Found</h1><p>The requested file does not exist.</p>');
    }
    
    // Set appropriate headers for download
    res.download(filePath, (err) => {
        if (err) {
            console.error('Download error:', err);
            res.status(500).send('<h1>Download Error</h1><p>An error occurred while downloading the file.</p>');
        }
    });
});

// Bulk download route for all user files
app.post('/download-all', express.json(), (req, res) => {
    const { files } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'No files specified for download' });
    }
    
    // Create a zip file with all user files
    const archiver = require('archiver');
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    res.attachment('user-files.zip');
    archive.pipe(res);
    
    files.forEach(filename => {
        const filePath = path.join(__dirname, 'uploads', filename);
        if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: filename });
        }
    });
    
    archive.finalize();
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.render('register', {
                errors: [{ msg: 'File size too large. Maximum size is 5MB per file.' }],
                formData: req.body,
                success: false
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.render('register', {
                errors: [{ msg: 'Too many files. Maximum 10 other pictures allowed.' }],
                formData: req.body,
                success: false
            });
        }
    }
    
    if (error.message === 'Only image files are allowed!') {
        return res.render('register', {
            errors: [{ msg: 'Only image files are allowed!' }],
            formData: req.body,
            success: false
        });
    }
    
    res.status(500).render('register', {
        errors: [{ msg: 'An error occurred while processing your request.' }],
        formData: req.body,
        success: false
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).send('<h1>Page Not Found</h1><p>The page you are looking for does not exist.</p>');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
