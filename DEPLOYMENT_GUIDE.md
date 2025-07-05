# Real-Time Tool Tracking System - Deployment Guide

## Overview

This guide provides step-by-step instructions to deploy and test the complete real-time tool tracking system with "User adds tool, Manager approves" feature.

## System Architecture

### Frontend Components

- **HTML Pages**: `user.html`, `manager.html`, `index.html`
- **JavaScript Modules**:
  - `api.js` - API communication
  - `notification-system.js` - Real-time notifications
  - `manager-tool-requests.js` - Manager dashboard functionality
  - `login.js` - Authentication

### Backend Components

- **Server**: `server.js` - Express.js with Socket.IO
- **Models**:
  - `ToolAdditionRequest.js` - Tool addition requests
  - `Tool.js` - Tool inventory
  - `User.js` - User management
- **Routes**:
  - `toolAdditionRequests.js` - Request handling
  - `auth.js` - Authentication

## Prerequisites

1. **Node.js** (v14 or higher)
2. **MongoDB** (local or MongoDB Atlas)
3. **Web Browser** (Chrome, Firefox, Safari, Edge)

## Step 1: Backend Setup

### 1.1 Install Dependencies

```bash
cd backend
npm install
```

### 1.2 Environment Configuration

Create a `.env` file in the `backend` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tool-tracking
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=development
```

### 1.3 Start MongoDB

Make sure MongoDB is running:

```bash
# For local MongoDB
mongod

# Or if using MongoDB as a service
sudo systemctl start mongodb
```

### 1.4 Start Backend Server

```bash
cd backend
npm start
```

Expected output:

```
MongoDB connected successfully
Server is running on port 5000
```

## Step 2: Frontend Setup

### 2.1 Install Dependencies (if needed)

```bash
cd frontend
# Install live-server for development (optional)
npm install -g live-server
```

### 2.2 Start Frontend Server

Option 1 - Using live-server:

```bash
cd frontend
live-server --port=3000
```

Option 2 - Using Python (if available):

```bash
cd frontend
python -m http.server 3000
```

Option 3 - Double-click HTML files (basic testing)

## Step 3: System Testing

### 3.1 Create Test Users

Run the user creation script:

```bash
cd backend
node create-test-users.js
```

This creates:

- **Employee**: email: `user@test.com`, password: `password123`
- **Manager**: email: `manager@test.com`, password: `password123`
- **Admin**: email: `admin@test.com`, password: `password123`

### 3.2 Test Real-Time Tool Addition Flow

#### Step 1: User Login and Tool Request

1. Open browser to `http://localhost:3000/user.html`
2. Login with employee credentials: `user@test.com` / `password123`
3. Scroll to "Request New Tool Addition" section
4. Fill out the form:
   - **Tool Name**: "Electric Drill XYZ"
   - **Category**: "Power Tools"
   - **Brand**: "Bosch"
   - **Description**: "High-performance electric drill for heavy-duty work"
   - **Location**: "Workshop A"
   - **Estimated Cost**: "15000"
   - **Reason**: "Current drill is broken and needs replacement"
   - **Urgency**: "High"
5. Click "Submit Request"

#### Step 2: Manager Real-Time Notification

1. Open new browser tab/window to `http://localhost:3000/manager.html`
2. Login with manager credentials: `manager@test.com` / `password123`
3. **Observe**: Real-time notification appears immediately showing new tool request
4. Click on "Tool Requests" in navigation
5. **Verify**: New request appears in the table with pending status
6. **Note**: Badge shows count of pending requests

#### Step 3: Manager Approval/Rejection

1. In manager dashboard, click "View" on the new request
2. Review all details in the modal
3. Click "Approve" or "Reject"
4. Add review comments
5. Submit decision

#### Step 4: User Real-Time Update

1. Switch back to user dashboard
2. **Observe**: Real-time notification appears showing approval/rejection
3. **Verify**: Request status updated in "My Tool Addition Requests" table
4. If approved, check that tool was added to inventory

### 3.3 Verify Real-Time Features

#### Real-Time Notifications Test

1. Keep both user and manager dashboards open
2. Submit multiple requests from user
3. **Verify**: Each request triggers immediate notification on manager side
4. Approve/reject from manager
5. **Verify**: User receives immediate notification of decision

#### Socket.IO Connection Test

1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for Socket.IO connection messages:

   ```
   Connected to notification server
   Manager connected to real-time system
   ```

## Step 4: Advanced Testing

### 4.1 Test Multiple Users

1. Open multiple browser windows/incognito tabs
2. Login with different users
3. Submit requests from multiple users
4. Verify manager sees all requests in real-time

### 4.2 Test Persistence

1. Submit requests
2. Refresh browser pages
3. **Verify**: All data persists correctly
4. **Verify**: Notifications and requests remain after refresh

### 4.3 Test Error Handling

1. Try submitting incomplete forms
2. Try duplicate requests
3. **Verify**: Appropriate error messages appear

## Step 5: Production Deployment

### 5.1 Environment Setup

1. Update `.env` for production:

   ```env
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://your-atlas-connection-string
   JWT_SECRET=your-production-secret
   PORT=5000
   ```

### 5.2 Frontend Configuration

Update `api.js` for production URLs:

```javascript
const API_BASE_URL = 'https://your-backend-domain.com/api';
const SOCKET_URL = 'https://your-backend-domain.com';
```

### 5.3 Security Considerations

1. Use HTTPS in production
2. Set secure JWT secret
3. Configure CORS properly
4. Enable MongoDB authentication

## Troubleshooting

### Common Issues

#### 1. Socket.IO Not Connecting

- **Check**: Backend server is running on port 5000
- **Check**: CORS configuration in `server.js`
- **Check**: Firewall settings

#### 2. MongoDB Connection Failed

- **Check**: MongoDB service is running
- **Check**: Connection string in `.env`
- **Check**: Network connectivity

#### 3. Real-Time Updates Not Working

- **Check**: Socket.IO client library loaded
- **Check**: User role assignment
- **Check**: Browser console for errors

#### 4. Authentication Issues

- **Check**: JWT secret matches between requests
- **Check**: Token storage in localStorage
- **Check**: User creation script completed

### Debug Commands

#### Check Backend Health

```bash
curl http://localhost:5000/
```

#### Check MongoDB Connection

```bash
node backend/test-connection.js
```

#### Check Socket.IO

Open browser console and run:

```javascript
io.connect('http://localhost:5000')
```

## Features Implemented

### ✅ Real-Time Tool Addition Requests

- Users can submit tool addition requests
- Forms with validation and error handling
- Immediate submission to backend

### ✅ Real-Time Manager Notifications

- Instant notifications when requests are submitted
- Visual and audio alerts
- Notification badge with counts

### ✅ Real-Time Approval System

- Managers can approve/reject in real-time
- Modal dialogs for detailed review
- Comment system for feedback

### ✅ Real-Time User Updates

- Users receive immediate approval/rejection notifications
- Status updates reflect immediately
- Tool creation upon approval

### ✅ Complete Socket.IO Integration

- Role-based room management
- Event-driven architecture
- Connection resilience

### ✅ Data Persistence

- MongoDB storage for all data
- Relationship management between collections
- Historical tracking

## System Architecture Benefits

1. **Real-Time Communication**: Socket.IO enables instant updates
2. **Scalable Design**: Role-based permissions and modular structure
3. **User Experience**: Immediate feedback and notifications
4. **Data Integrity**: Proper validation and error handling
5. **Production Ready**: Complete authentication and security

## Next Steps

1. **Testing**: Run through all test scenarios
2. **Customization**: Modify UI/UX as needed
3. **Deployment**: Set up production environment
4. **Monitoring**: Add logging and analytics
5. **Scaling**: Consider load balancing for high traffic

The system is now fully functional with real-time capabilities, ready for production deployment!
