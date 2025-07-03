# Hindalco Tool Tracking System - Complete Setup Guide

A comprehensive real-time tool tracking and management system with role-based access control, tool request approval workflow, and Socket.IO real-time updates.

## 🚀 Features

### For All Users:
- ✅ Complete registration and login system
- ✅ Role-based dashboard (Employee, Manager, Admin)
- ✅ Real-time notifications via Socket.IO
- ✅ Responsive design with Tailwind CSS

### For Employees:
- ✅ Browse available tools
- ✅ Submit tool requests (borrow, return, maintenance, replacement)
- ✅ Track request status in real-time
- ✅ View personal tool history
- ✅ Dashboard with personal statistics

### For Managers:
- ✅ Real-time tool request approval system
- ✅ View all pending requests with urgency indicators
- ✅ Approve/reject requests with comments
- ✅ Tool and user management
- ✅ Dashboard with comprehensive statistics
- ✅ Audio notifications for new requests

### For Admins:
- ✅ Complete system administration
- ✅ User management (activate/deactivate)
- ✅ Advanced tool management
- ✅ System-wide analytics
- ✅ All manager features plus admin privileges

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express.js
- MongoDB with Mongoose
- Socket.IO for real-time communication
- JWT authentication
- bcryptjs for password hashing
- Express validator for input validation

**Frontend:**
- HTML5, CSS3, JavaScript (ES6+)
- Tailwind CSS for styling
- Socket.IO client for real-time updates
- Font Awesome icons
- Responsive design

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Modern web browser (Chrome, Firefox, Edge, Safari)

## ⚡ Quick Setup

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
# Create a .env file with the following variables:
```

Create `.env` file in the backend directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tool-tracking
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
NODE_ENV=development
```

### 2. Start MongoDB

Make sure MongoDB is running on your system:
```bash
# If using local MongoDB
mongod

# Or if using MongoDB service
net start MongoDB
```

### 3. Start the Backend Server

```bash
# From the backend directory
npm start
# or for development with auto-restart
npm run dev
```

The server will start on `http://localhost:5000`

### 4. Frontend Setup

The frontend files are ready to use! You can:

**Option 1: Use with Live Server (Recommended)**
- Open the frontend folder in VS Code
- Install "Live Server" extension
- Right-click on any HTML file and select "Open with Live Server"

**Option 2: Use a simple HTTP server**
```bash
# Navigate to frontend directory
cd frontend

# Using Python 3
python -m http.server 3000

# Using Node.js (if you have http-server installed)
npx http-server -p 3000
```

## 🎯 Usage Guide

### Getting Started

1. **Access the System:**
   - Open your web browser
   - Navigate to the frontend URL (e.g., `http://localhost:3000`)

2. **Register a New Account:**
   - Click "Register here" on the login page
   - Fill in all required information
   - Select your role (Employee, Manager, or Admin)
   - Submit the registration

3. **Login:**
   - Use your registered email and password
   - The system will redirect you to the appropriate dashboard based on your role

### For Employees

1. **Request a Tool:**
   - Go to the "Available Tools" section
   - Browse or search for tools
   - Click "Request Tool" on any available tool
   - Fill in the request form:
     - Select request type (borrow, return, maintenance, replacement)
     - Set urgency level
     - Specify duration (for borrow requests)
     - Provide a reason
   - Submit the request

2. **Track Requests:**
   - View all your requests in "My Requests" section
   - See real-time status updates
   - Cancel pending requests if needed

### For Managers

1. **Review Requests:**
   - Check the "Pending Requests" section
   - See new requests highlighted with badges
   - Receive audio notifications for new requests
   - Filter by urgency level

2. **Approve/Reject Requests:**
   - Click "Review" on any pending request
   - View complete request details
   - Select "Approve" or "Reject"
   - Add comments (optional)
   - Submit your decision

3. **Manage Users:**
   - View all system users
   - Activate/deactivate user accounts
   - View user details and activity

### For Admins

- All manager features plus:
- Complete user management
- System administration capabilities
- Advanced analytics and reporting

### Real-time Features

The system provides real-time updates through Socket.IO:
- **Instant notifications** when requests are created, approved, or rejected
- **Live dashboard updates** with current statistics
- **Audio alerts** for managers when new requests arrive
- **Automatic badge updates** showing pending request counts

## 🔧 Key Files

### Backend Structure
```
backend/
├── models/
│   ├── User.js              # User schema with roles
│   ├── Tool.js              # Tool management schema
│   └── ToolRequest.js       # Tool request workflow schema
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User management routes
│   ├── tools.js             # Tool management routes
│   └── toolRequests.js      # Request management routes
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── server.js                # Main server with Socket.IO
└── package.json             # Dependencies and scripts
```

### Frontend Structure
```
frontend/
├── index.html               # Login page
├── register.html            # Registration page
├── user_new.html           # Employee dashboard
├── manager_new.html        # Manager dashboard
├── admin.html              # Admin dashboard
├── api.js                  # API service with Socket.IO
├── login.js                # Authentication logic
└── assets/                 # Images and styles
```

## 🎨 Customization

### Styling
- The system uses Tailwind CSS for styling
- Colors can be customized in the CSS variables
- Hindalco brand colors are pre-configured

### Features
- Add new tool categories in the Tool model
- Extend user roles by modifying the User schema
- Add new request types in the ToolRequest model

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Input validation on all forms
- Role-based access control
- Secure API endpoints

## 🐛 Troubleshooting

### Common Issues

1. **Cannot connect to MongoDB:**
   - Ensure MongoDB is running
   - Check the connection string in .env

2. **Socket.IO not working:**
   - Verify the server is running on the correct port
   - Check browser console for connection errors

3. **Authentication issues:**
   - Clear browser localStorage and sessionStorage
   - Verify JWT_SECRET is set in .env

4. **API errors:**
   - Check backend console for error messages
   - Verify all required fields are provided

### Debug Mode

To enable debug mode:
1. Set `NODE_ENV=development` in .env
2. Check browser console for detailed logs
3. Monitor backend console for API calls

## 📞 Support

For technical support or questions:
- Check the browser console for error messages
- Review the backend logs for API issues
- Ensure all dependencies are properly installed

## 🎉 Success!

You now have a fully functional, real-time tool tracking system with:
- ✅ User registration and authentication
- ✅ Role-based dashboards
- ✅ Real-time tool request workflow
- ✅ Manager approval system
- ✅ Live notifications and updates
- ✅ Comprehensive tool and user management

The system is production-ready and can be deployed to any cloud platform supporting Node.js and MongoDB!
