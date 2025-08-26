# Express Login Application with File Session Store

A comprehensive Express.js login application demonstrating session management using file-based session storage.

## Features

- **User Authentication**: Secure login with bcrypt password hashing
- **File Session Store**: Sessions stored as JSON files in the filesystem
- **Protected Routes**: Middleware-based route protection
- **Role-Based Access**: Admin and user roles with different permissions
- **Session Management**: View active sessions, session details, and admin panel
- **Modern UI**: Responsive design with gradient styling and animations
- **Auto-refresh**: Real-time session monitoring and auto-logout on expiry

## Demo Accounts

| Role  | Username | Password |
|-------|----------|----------|
| Admin | admin    | password |
| User  | user     | password |

## Installation

1. Navigate to the project directory:
   ```bash
   cd "Problem 2"
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
   http://localhost:3001
   ```

## Project Structure

```
Problem 2/
├── server.js              # Main Express server with session config
├── package.json           # Dependencies and scripts
├── README.md              # This file
├── views/                 # EJS templates
│   ├── login.ejs          # Login form
│   ├── dashboard.ejs      # User dashboard
│   ├── profile.ejs        # User profile page
│   ├── admin.ejs          # Admin panel
│   └── error.ejs          # Error page
├── public/                # Static files
│   └── styles.css         # CSS styling
└── sessions/              # Session files (created automatically)
```

## Session Configuration

- **Store Type**: File-based session store
- **Session TTL**: 24 hours
- **Cleanup Interval**: 1 hour (automatic expired session cleanup)
- **Storage Location**: `./sessions/` directory
- **Session Format**: JSON files named by session ID

## Routes

### Public Routes
- `GET /` - Redirects to login or dashboard
- `GET /login` - Login form
- `POST /login` - Process login

### Protected Routes (Require Authentication)
- `GET /dashboard` - User dashboard with session info
- `GET /profile` - User profile page
- `GET /api/session` - Session details API endpoint
- `POST /logout` - Logout and destroy session

### Admin Routes (Admin Role Required)
- `GET /admin` - Admin panel with session management

## Session Features

### File Session Store
- Sessions are stored as individual JSON files
- Automatic cleanup of expired sessions
- Configurable TTL and cleanup intervals
- Session file monitoring and management

### Session Security
- HTTP-only cookies
- Secure session configuration
- CSRF protection ready
- Session regeneration on login

### Admin Panel Features
- View all active sessions
- Monitor session files
- User management
- System statistics
- Real-time session monitoring

## Authentication Flow

1. **Login**: User submits credentials
2. **Validation**: Server validates using bcrypt
3. **Session Creation**: New session created and stored in file
4. **Cookie Setting**: Session ID sent as HTTP-only cookie
5. **Route Protection**: Middleware checks session on protected routes
6. **Auto-logout**: Sessions expire after 24 hours

## Technologies Used

- **Backend**: Node.js, Express.js
- **Session Store**: session-file-store
- **Authentication**: bcryptjs for password hashing
- **Template Engine**: EJS
- **Validation**: express-validator
- **Frontend**: HTML5, CSS3, JavaScript
- **Styling**: Modern CSS with gradients and animations

## Security Features

- Password hashing with bcrypt
- HTTP-only session cookies
- Session expiration and cleanup
- CSRF protection ready
- Input validation and sanitization
- Protected route middleware
- Role-based access control

## Session File Structure

Sessions are stored as JSON files in the `./sessions/` directory:

```json
{
  "cookie": {
    "originalMaxAge": 86400000,
    "expires": "2024-01-02T12:00:00.000Z",
    "secure": false,
    "httpOnly": true,
    "path": "/"
  },
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "loginTime": "2024-01-01T12:00:00.000Z"
  }
}
```

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for mobile devices
- Progressive enhancement for older browsers

## Development

For development with automatic server restart:

```bash
npm run dev
```

This uses nodemon to watch for file changes and restart the server automatically.
