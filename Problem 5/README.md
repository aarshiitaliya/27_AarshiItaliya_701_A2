# Problem 5: Employee Portal with JWT Authentication

A comprehensive employee portal built with Node.js, Express, MongoDB, and JWT authentication. This application allows employees to view their profiles and manage leave applications.

## Features

### 🔐 Authentication
- JWT-based authentication for secure access
- Employee login using Employee ID and password
- Token-based session management
- Auto-logout on token expiration

### 👤 Employee Profile (Page 1)
- Complete employee information display
- Personal details (Name, Email, Phone, etc.)
- Work details (Department, Position, Joining Date)
- Comprehensive salary breakdown
- Allowances and deductions overview
- Net salary calculation

### 📝 Leave Management (Page 2)
- Apply for leave with date and reason
- View all submitted leave applications
- Real-time status tracking (Pending/Approved/Rejected)
- Leave history with timestamps
- Form validation and error handling

### 🎨 Modern UI/UX
- Responsive design with gradient backgrounds
- Glass-morphism design elements
- Interactive forms with real-time feedback
- Professional styling with smooth animations
- Mobile-friendly interface

## Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **express-validator** - Input validation

### Frontend
- **HTML5** - Markup
- **CSS3** - Styling with modern features
- **JavaScript/jQuery** - Client-side functionality
- **AJAX** - API communication

## Installation & Setup

1. **Install Dependencies**
   ```bash
   cd "Problem 5"
   npm install
   ```

2. **Environment Configuration**
   - Update `.env` file with your MongoDB connection string
   - Change JWT_SECRET for production use

3. **Database Setup**
   - Ensure MongoDB is running
   - The application will connect to `employee_portal` database
   - Employee data should be created using Problem 4 (Admin Panel)

4. **Start the Application**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

5. **Access the Application**
   - Open browser and go to `http://localhost:3005`
   - Use Employee ID and password created from Admin Panel (Problem 4)

## API Endpoints

### Authentication
- `POST /api/auth/login` - Employee login

### Employee Operations
- `GET /api/employee/profile` - Get employee profile
- `POST /api/employee/leave/apply` - Apply for leave
- `GET /api/employee/leave/list` - Get leave applications

## Database Models

### Employee Model
- Inherits from Problem 4's Employee model
- Includes salary calculations and virtual fields
- Password comparison methods

### Leave Application Model
- Employee ID reference
- Leave date and reason
- Status tracking (pending/approved/rejected)
- Timestamps for application and review

## Security Features

- JWT token validation
- Password hashing with bcrypt
- Input validation and sanitization
- CORS enabled for cross-origin requests
- Protected routes with authentication middleware

## Usage Instructions

1. **Login**: Use Employee ID and password from Admin Panel
2. **Profile**: View complete employee information and salary details
3. **Leave Application**: 
   - Select future date for leave
   - Provide detailed reason (10-500 characters)
   - Submit application
4. **Leave History**: View all submitted applications with status
5. **Logout**: Secure logout with token removal

## Integration with Problem 4

This employee portal works seamlessly with Problem 4 (Admin Panel):
- Uses the same Employee model and database
- Employees created in Admin Panel can login here
- Admin can review leave applications (extend Problem 4)

## File Structure

```
Problem 5/
├── models/
│   ├── Employee.js          # Employee data model
│   └── LeaveApplication.js  # Leave application model
├── middleware/
│   └── auth.js             # JWT authentication middleware
├── routes/
│   ├── auth.js             # Authentication routes
│   └── employee.js         # Employee operations routes
├── public/
│   ├── login.html          # Login page
│   ├── profile.html        # Employee profile page
│   ├── leave.html          # Leave management page
│   └── styles.css          # Styling
├── server.js               # Main server file
├── package.json            # Dependencies
├── .env                    # Environment variables
└── README.md              # Documentation
```

## Demo Credentials

Use any Employee ID and password created from the Admin Panel (Problem 4). If you haven't created employees yet:

1. Run Problem 4 admin panel
2. Create employees with credentials
3. Use those credentials to login to this portal

## Future Enhancements

- Email notifications for leave status updates
- Leave balance tracking
- Calendar integration
- Mobile app version
- Advanced reporting features
