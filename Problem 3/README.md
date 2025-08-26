# Problem 3: Express Login Application with Redis Session Store

A complete Express.js authentication application using Redis for session management.

## 🚀 Features

- **User Authentication** with bcrypt password hashing
- **Redis Session Store** using connect-redis
- **Protected Routes** with authentication middleware
- **Role-based Access Control** (admin/user roles)
- **Session Management** and monitoring
- **Admin Panel** for viewing active Redis sessions
- **Modern Responsive UI** with gradient styling
- **Real-time Session Info** via API endpoints

## 🔴 Redis Session Benefits

- **⚡ High Performance**: In-memory storage for microsecond response times
- **🔄 Persistence**: Sessions survive server restarts
- **📈 Scalability**: Horizontal scaling with shared session store
- **⏰ TTL Support**: Automatic session expiration
- **🛡️ Security**: Built-in security features and atomic operations

## 🛠️ Technology Stack

- **Express.js** with express-session
- **Redis** with connect-redis for session storage
- **bcryptjs** for password hashing
- **express-validator** for input validation
- **EJS** templating engine
- **Modern CSS** with responsive design

## 📋 Demo Accounts

- **Admin**: username=`admin`, password=`password`
- **User**: username=`user`, password=`password`

## 🔧 Prerequisites

1. **Node.js** (v14 or higher)
2. **Redis Server** running on localhost:6379

### Installing Redis

**Windows:**
```bash
# Using Chocolatey
choco install redis-64

# Or download from: https://github.com/microsoftarchive/redis/releases
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
```

## 🚀 Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Redis Server**
   ```bash
   redis-server
   ```

3. **Start the Application**
   ```bash
   npm start
   ```

4. **Access the Application**
   - Open: http://localhost:3002
   - Login with demo accounts

## 📁 Project Structure

```
Problem 3/
├── server.js              # Main Express application
├── package.json           # Dependencies and scripts
├── README.md             # This file
├── public/
│   └── styles.css        # Modern CSS styling
└── views/
    ├── login.ejs         # Login form
    ├── dashboard.ejs     # User dashboard
    ├── profile.ejs       # User profile
    ├── admin.ejs         # Admin panel
    └── error.ejs         # Error page
```

## 🔗 Available Routes

- `GET /` - Redirect to login or dashboard
- `GET /login` - Login form
- `POST /login` - Process login
- `GET /dashboard` - User dashboard (protected)
- `GET /profile` - User profile (protected)
- `GET /admin` - Admin panel (admin only)
- `POST /logout` - Logout and destroy session
- `GET /api/session` - Session details API
- `GET /api/redis-info` - Redis server info (admin only)

## ⚙️ Redis Configuration

The application connects to Redis with the following settings:

```javascript
const redisClient = createClient({
    host: 'localhost',
    port: 6379,
    retry_strategy: (options) => {
        // Automatic retry logic
    }
});
```

## 🔐 Session Configuration

```javascript
app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
```

## 🎯 Key Differences from File-based Sessions

| Feature | File-based | Redis |
|---------|------------|-------|
| **Performance** | Disk I/O | In-memory |
| **Scalability** | Single server | Multi-server |
| **Persistence** | File system | Configurable |
| **Speed** | Milliseconds | Microseconds |
| **Cleanup** | Manual | Automatic TTL |

## 🔍 Admin Panel Features

- View all active Redis sessions
- Monitor Redis connection status
- Real-time session statistics
- Auto-refresh every 30 seconds
- Redis server information

## 🚨 Error Handling

- Redis connection errors
- Session validation
- Authentication failures
- Route protection
- Graceful error pages

## 🔧 Development

For development with auto-restart:
```bash
npm run dev
```

## 📝 Notes

- Ensure Redis server is running before starting the application
- Sessions are stored in Redis with automatic expiration
- Admin panel shows real-time session data from Redis
- All passwords are hashed using bcrypt
- HTTPS should be enabled in production for secure cookies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Redis
5. Submit a pull request

## 📄 License

ISC License - see package.json for details
