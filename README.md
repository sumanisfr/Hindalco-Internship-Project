# Hindalco Tool Tracking System - Complete Documentation

## 🏢 System Overview

The Hindalco Tool Tracking System is a comprehensive real-time web application designed for managing tools, users, and maintenance requests in an industrial environment. The system provides role-based access control, real-time notifications, and complete audit trails.

## 🎯 Key Features

### **Real-Time Functionality**
- **Instant Notifications**: Socket.IO powered real-time updates
- **Live Dashboard**: Auto-refreshing statistics and metrics
- **Audio Alerts**: Sound notifications for managers on urgent requests
- **Real-Time Collaboration**: Multiple users can work simultaneously

### **User Management**
- **Role-Based Access**: Admin, Manager, Employee roles with specific permissions
- **User Authentication**: JWT-based secure authentication
- **Session Management**: Automatic session timeout and renewal
- **Profile Management**: User can update their own profile information

### **Tool Management**
- **Comprehensive Tool Database**: Complete tool information including serial numbers, locations, maintenance history
- **Tool Assignment**: Direct assignment of tools to employees
- **Request Workflow**: Structured tool request and approval process
- **Maintenance Scheduling**: Preventive and corrective maintenance scheduling

### **Request Management**
- **Tool Requests**: Employees can request tools with priority levels
- **Approval Workflow**: Managers can approve/reject requests with comments
- **Real-Time Updates**: Instant status updates for all parties
- **Request History**: Complete audit trail of all requests

### **Maintenance Management**
- **Maintenance Scheduling**: Schedule preventive and corrective maintenance
- **Task Assignment**: Assign maintenance tasks to specific users
- **Status Tracking**: Track maintenance progress and completion
- **Cost Tracking**: Record maintenance costs and parts used

### **Data Management**
- **Export Functionality**: Export data in JSON/CSV formats
- **System Backup**: Complete system backup with download capability
- **Analytics Dashboard**: Comprehensive statistics and reporting
- **Audit Logging**: Complete activity and change logging

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (HTML/JS)                   │
├─────────────────────────────────────────────────────────┤
│  • User Dashboards (Employee/Manager/Admin)            │
│  • Real-time UI Updates (Socket.IO Client)             │
│  • Authentication & Authorization                       │
│  • API Communication                                    │
└─────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────┐
│                Backend API (Node.js/Express)            │
├─────────────────────────────────────────────────────────┤
│  • RESTful API Endpoints                               │
│  • JWT Authentication                                  │
│  • Real-time Events (Socket.IO Server)                │
│  • Business Logic & Validation                        │
└─────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────┐
│                 Database (MongoDB)                      │
├─────────────────────────────────────────────────────────┤
│  • Users Collection                                    │
│  • Tools Collection                                    │
│  • Tool Requests Collection                           │
│  • Maintenance Collection                             │
└─────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
Internship_Project/
├── backend/                    # Backend API server
│   ├── models/                # Database models
│   │   ├── User.js            # User schema
│   │   ├── Tool.js            # Tool schema
│   │   ├── ToolRequest.js     # Tool request schema
│   │   └── Maintenance.js     # Maintenance schema
│   ├── routes/                # API route handlers
│   │   ├── auth.js            # Authentication routes
│   │   ├── users.js           # User management routes
│   │   ├── tools.js           # Tool management routes
│   │   ├── toolRequests.js    # Request management routes
│   │   ├── maintenance.js     # Maintenance routes
│   │   └── reports.js         # Export/backup routes
│   ├── middleware/            # Express middleware
│   │   └── auth.js            # JWT authentication middleware
│   ├── server.js              # Main server file
│   ├── package.json           # Backend dependencies
│   └── .env                   # Environment variables
├── frontend/                  # Frontend web application
│   ├── index.html             # Login page
│   ├── register.html          # Registration page
│   ├── user_new.html          # Employee dashboard
│   ├── manager_new.html       # Manager dashboard
│   ├── admin.html             # Admin dashboard
│   ├── profile.html           # User profile page
│   ├── api.js                 # API service layer
│   ├── login.js               # Authentication logic
│   ├── auth-utils.js          # Authentication utilities
│   ├── dashboard-utils.js     # Dashboard utilities
│   └── login.css              # Styling
├── start-system.bat           # Windows startup script
├── SETUP_GUIDE.md             # Setup instructions
├── START_SERVERS.md           # Server startup guide
└── SYSTEM_DOCUMENTATION.md    # This file
```

## 👥 User Roles & Permissions

### **Employee Role**
**Permissions:**
- ✅ View available tools
- ✅ Submit tool requests (borrow, return, maintenance, replacement)
- ✅ View own request history and status
- ✅ Update own profile information
- ✅ Receive real-time notifications for request updates

**Dashboard Features:**
- Tool browsing and search
- Request submission form
- Request tracking table
- Personal statistics
- Real-time notifications

### **Manager Role**
**Permissions:**
- ✅ All Employee permissions +
- ✅ View and review all pending requests
- ✅ Approve/reject requests with comments
- ✅ Assign tools directly to employees
- ✅ Schedule maintenance tasks
- ✅ View user management interface
- ✅ Export system data
- ✅ Receive audio alerts for new requests

**Dashboard Features:**
- Pending requests review interface
- Tool assignment tools
- Maintenance scheduling
- User management (view/activate/deactivate)
- Data export functionality
- Advanced statistics

### **Admin Role**
**Permissions:**
- ✅ All Manager permissions +
- ✅ Complete user management (create/update/delete)
- ✅ System backup and restore
- ✅ Advanced system settings
- ✅ Complete audit access
- ✅ System configuration

**Dashboard Features:**
- Complete user management interface
- System backup and restore tools
- Advanced analytics and reporting
- System configuration settings
- Audit logs and activity tracking

## 🔄 Real-Time Communication Flow

### **User Requests Tool Workflow**

```
1. Employee submits tool request
   ↓
2. Backend saves request to database
   ↓
3. Socket.IO broadcasts to Manager/Admin rooms
   ↓
4. Managers receive real-time notification + audio alert
   ↓
5. Manager reviews and approves/rejects request
   ↓
6. Backend updates request status
   ↓
7. Socket.IO broadcasts update to all users
   ↓
8. Employee receives real-time status notification
```

### **Socket.IO Events**

```javascript
// Client-side events
socket.emit('join-role', userRole);           // Join role-based room
socket.emit('new-request', requestData);      // New request submitted
socket.emit('request-reviewed', reviewData);  // Request reviewed

// Server-side broadcasts
socket.to('Manager').emit('request-created', data);  // New request alert
socket.emit('request-updated', data);                // Status update
socket.emit('tool-assigned', data);                  // Tool assignment
socket.emit('maintenance-scheduled', data);          // Maintenance scheduled
```

## 🗄️ Database Schema

### **Users Collection**
```javascript
{
  _id: ObjectId,
  firstName: String,
  lastName: String,
  email: String (unique),
  password: String (hashed),
  role: String ['Admin', 'Manager', 'Employee'],
  department: String,
  employeeId: String (unique),
  phone: String,
  isActive: Boolean,
  lastLogin: Date,
  profileImage: String,
  createdAt: Date,
  updatedAt: Date
}
```

### **Tools Collection**
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  category: String ['Hand Tools', 'Power Tools', 'Measuring Tools', 'Safety Equipment', 'Other'],
  brand: String,
  model: String,
  serialNumber: String (unique),
  location: String,
  status: String ['Available', 'In Use', 'Maintenance', 'Damaged', 'Lost'],
  condition: String ['Excellent', 'Good', 'Fair', 'Poor'],
  purchaseDate: Date,
  purchasePrice: Number,
  assignedTo: ObjectId (ref: User),
  assignedDate: Date,
  expectedReturnDate: Date,
  lastMaintenanceDate: Date,
  nextMaintenanceDate: Date,
  imageUrl: String,
  notes: String,
  createdBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

### **Tool Requests Collection**
```javascript
{
  _id: ObjectId,
  requestedBy: ObjectId (ref: User),
  tool: ObjectId (ref: Tool),
  requestType: String ['borrow', 'return', 'maintenance', 'replacement'],
  reason: String,
  urgency: String ['low', 'medium', 'high', 'critical'],
  expectedDuration: Number, // days
  status: String ['pending', 'approved', 'rejected', 'cancelled'],
  reviewedBy: ObjectId (ref: User),
  reviewedAt: Date,
  reviewComments: String,
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}
```

### **Maintenance Collection**
```javascript
{
  _id: ObjectId,
  tool: ObjectId (ref: Tool),
  scheduledBy: ObjectId (ref: User),
  assignedTo: ObjectId (ref: User),
  maintenanceType: String ['preventive', 'corrective', 'emergency', 'inspection'],
  priority: String ['low', 'medium', 'high', 'critical'],
  scheduledDate: Date,
  estimatedDuration: Number, // hours
  description: String,
  status: String ['scheduled', 'in-progress', 'completed', 'cancelled', 'overdue'],
  actualStartDate: Date,
  actualEndDate: Date,
  actualDuration: Number,
  completionNotes: String,
  cost: Number,
  partsUsed: [{ partName: String, quantity: Number, cost: Number }],
  nextMaintenanceDate: Date,
  attachments: [{ filename: String, path: String, uploadedAt: Date }],
  createdAt: Date,
  updatedAt: Date
}
```

## 🔌 API Endpoints

### **Authentication Endpoints**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password

### **User Management Endpoints**
- `GET /api/users` - Get all users (Admin/Manager)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user (Admin)
- `PUT /api/users/:id/activate` - Activate user (Admin)
- `GET /api/users/stats/dashboard` - Get user statistics

### **Tool Management Endpoints**
- `GET /api/tools` - Get all tools
- `GET /api/tools/:id` - Get tool by ID
- `POST /api/tools` - Create new tool (Manager/Admin)
- `PUT /api/tools/:id` - Update tool
- `DELETE /api/tools/:id` - Delete tool (Admin/Manager)
- `PUT /api/tools/:id/assign` - Assign/unassign tool

### **Tool Request Endpoints**
- `GET /api/tool-requests` - Get tool requests
- `GET /api/tool-requests/:id` - Get request by ID
- `POST /api/tool-requests` - Create new request
- `PUT /api/tool-requests/:id/review` - Review request (Manager/Admin)
- `PUT /api/tool-requests/:id/cancel` - Cancel request
- `GET /api/tool-requests/stats/dashboard` - Get request statistics

### **Maintenance Endpoints**
- `GET /api/maintenance` - Get maintenance tasks
- `GET /api/maintenance/:id` - Get maintenance by ID
- `POST /api/maintenance` - Schedule maintenance
- `PUT /api/maintenance/:id` - Update maintenance
- `DELETE /api/maintenance/:id` - Delete maintenance (Admin/Manager)
- `GET /api/maintenance/stats/dashboard` - Get maintenance statistics

### **Reports & Export Endpoints**
- `GET /api/reports/export/:type` - Export data (tools/users/requests/maintenance)
- `POST /api/reports/backup` - Create system backup (Admin)
- `GET /api/reports/dashboard` - Get comprehensive dashboard data

## 🔐 Security Implementation

### **Authentication & Authorization**
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Role-Based Access**: Granular permission system
- **Session Management**: Token expiration and renewal

### **Data Protection**
- **Input Validation**: Express-validator for all inputs
- **SQL Injection Prevention**: MongoDB parameterized queries
- **XSS Protection**: Input sanitization and output encoding
- **CORS Configuration**: Restricted origin access

### **Security Headers**
```javascript
// Security middleware implementation
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));

// JWT verification middleware
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Access denied' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
```

## 📊 Performance Optimization

### **Frontend Optimization**
- **Lazy Loading**: Components loaded on demand
- **Debounced Search**: Reduced API calls for search
- **Caching**: Browser storage for static data
- **Minification**: Compressed assets for production

### **Backend Optimization**
- **Database Indexing**: Optimized query performance
- **Connection Pooling**: Efficient database connections
- **Response Compression**: Gzip compression enabled
- **Rate Limiting**: API call rate limiting

### **Real-Time Optimization**
- **Room-Based Broadcasting**: Efficient Socket.IO rooms
- **Event Debouncing**: Reduced redundant events
- **Connection Management**: Automatic reconnection
- **Memory Management**: Proper cleanup of listeners

## 🔧 Configuration

### **Environment Variables**
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/tool-tracking

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

### **MongoDB Configuration**
```javascript
const mongoConfig = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};
```

## 🚀 Deployment Guide

### **Development Environment**
1. Install Node.js and MongoDB
2. Clone the repository
3. Install dependencies: `npm install`
4. Configure environment variables
5. Start MongoDB service
6. Run: `npm run dev` or use `start-system.bat`

### **Production Environment**
1. Set up production MongoDB instance
2. Configure environment variables for production
3. Build frontend assets
4. Set up reverse proxy (nginx)
5. Configure SSL certificates
6. Use PM2 for process management
7. Set up monitoring and logging

### **Docker Deployment**
```dockerfile
# Example Dockerfile for backend
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

## 📈 Monitoring & Analytics

### **System Metrics**
- **User Activity**: Login frequency, feature usage
- **Request Metrics**: Request volume, approval rates
- **Tool Utilization**: Usage patterns, availability
- **Performance**: Response times, error rates

### **Health Checks**
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});
```

## 🛠️ Maintenance & Updates

### **Regular Maintenance Tasks**
- Database backup and cleanup
- Log rotation and archival
- Security patch updates
- Performance monitoring
- User account auditing

### **Update Procedures**
1. Test updates in development environment
2. Create database backup
3. Deploy to staging environment
4. Run automated tests
5. Deploy to production with rollback plan
6. Monitor system health post-deployment

## 🆘 Troubleshooting

### **Common Issues**

**1. MongoDB Connection Issues**
```bash
# Check MongoDB status
mongod --version
mongo --eval "db.adminCommand('ping')"

# Restart MongoDB service
net start MongoDB
```

**2. Socket.IO Connection Problems**
```javascript
// Debug Socket.IO connections
socket.on('connect_error', (error) => {
  console.error('Socket.IO connection error:', error);
});
```

**3. Authentication Failures**
```javascript
// Check JWT token validity
const decoded = jwt.decode(token);
console.log('Token expiry:', new Date(decoded.exp * 1000));
```

### **Debug Mode**
```javascript
// Enable debug logging
localStorage.setItem('debug', 'true');

// Check system status
GET /api/health
```

## 📋 Testing

### **Manual Testing Checklist**
- [ ] User registration and login
- [ ] Role-based dashboard access
- [ ] Tool request workflow
- [ ] Real-time notifications
- [ ] Tool assignment process
- [ ] Maintenance scheduling
- [ ] Data export functionality
- [ ] System backup creation

### **Test Scenarios**
1. **User Workflow**: Employee requests tool → Manager approves → Tool assigned
2. **Real-Time**: Multiple users simultaneously, verify instant updates
3. **Permissions**: Test role-based access restrictions
4. **Data Integrity**: CRUD operations across all entities
5. **Error Handling**: Network failures, invalid inputs

## 📞 Support & Contact

### **Technical Support**
- Check system logs for error details
- Verify database connectivity
- Confirm authentication status
- Test API endpoints individually

### **System Administration**
- User account management
- System configuration updates
- Database maintenance
- Security monitoring

## 🎉 Success Criteria

The system is considered fully operational when:
- ✅ All user roles can access their respective dashboards
- ✅ Real-time notifications work across all browsers
- ✅ Tool request workflow completes end-to-end
- ✅ Data export and backup functions work correctly
- ✅ System handles concurrent users without issues
- ✅ Authentication and authorization work as expected
- ✅ All CRUD operations function properly
- ✅ Mobile responsiveness is maintained

This comprehensive system provides a robust, scalable, and user-friendly solution for tool tracking and management in industrial environments.
