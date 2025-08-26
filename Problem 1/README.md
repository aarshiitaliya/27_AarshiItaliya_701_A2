# User Registration Form with Express.js

A comprehensive user registration form built with Express.js featuring file uploads, form validation, and error handling.

## Features

- **Complete Registration Form** with all required fields:
  - Username (text input with validation)
  - Password & Confirm Password (password inputs with strength validation)
  - Email (email input with validation)
  - Gender (radio buttons: Male, Female, Other)
  - Hobbies (checkboxes: Reading, Sports, Music, Travel, Cooking)
  - Profile Picture (single file upload)
  - Other Pictures (multiple file upload, max 10 files)

- **Comprehensive Validation**:
  - Server-side validation using express-validator
  - Client-side validation with JavaScript
  - File upload validation (size, type, count)
  - Password strength requirements
  - Email format validation

- **Error Handling**:
  - Displays validation errors while preserving form data
  - File upload error handling
  - User-friendly error messages

- **Success Display**:
  - Shows submitted data in a well-formatted table
  - Displays uploaded images with preview
  - Professional tabular layout

- **Modern UI/UX**:
  - Responsive design
  - Beautiful gradient styling
  - Smooth animations and transitions
  - Mobile-friendly interface

## Installation

1. Navigate to the project directory:
   ```bash
   cd "Problem 1"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```
   
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

4. Open your browser and go to:
   ```
   http://localhost:3000
   ```

## Project Structure

```
Problem 1/
├── server.js              # Main Express server
├── package.json           # Dependencies and scripts
├── README.md             # This file
├── views/                # EJS templates
│   ├── register.ejs      # Registration form
│   └── success.ejs       # Success page
├── public/               # Static files
│   └── styles.css        # CSS styling
└── uploads/              # Uploaded files (created automatically)
```

## Validation Rules

- **Username**: 3-20 characters, alphanumeric and underscores only
- **Password**: Minimum 6 characters, must contain uppercase, lowercase, and number
- **Email**: Valid email format
- **Gender**: Must select one option
- **Files**: Images only, max 5MB per file, max 10 other pictures

## API Endpoints

- `GET /` - Display registration form
- `POST /register` - Process form submission with validation

## Technologies Used

- **Backend**: Node.js, Express.js
- **Template Engine**: EJS
- **File Upload**: Multer
- **Validation**: express-validator
- **Frontend**: HTML5, CSS3, JavaScript
- **Styling**: Modern CSS with gradients and animations

## Error Handling

The application handles various error scenarios:
- Invalid form data with field preservation
- File upload errors (size, type, count)
- Server errors with user-friendly messages
- 404 page not found

## File Upload Features

- **Profile Picture**: Single image upload
- **Other Pictures**: Multiple image upload (max 10)
- **File Validation**: Size (5MB max), type (images only)
- **Unique Naming**: Timestamp-based file naming to prevent conflicts
- **Error Handling**: Comprehensive file upload error management

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for mobile devices
- Progressive enhancement for older browsers
