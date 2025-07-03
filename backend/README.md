# Tool Tracking Web App - Backend

A Node.js Express backend for managing tools, users, and assignments in an organization.

## Features

- **User Management**: Registration, login, profile management with role-based access
- **Tool Management**: CRUD operations for tools with detailed tracking
- **Assignment System**: Assign/unassign tools to users
- **Role-based Access Control**: Admin, Manager, and Employee roles
- **Search & Filter**: Advanced filtering for tools and users
- **Dashboard Statistics**: Overview of tools and users
- **JWT Authentication**: Secure token-based authentication

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express Validator
- **Security**: bcryptjs for password hashing

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/tool-tracking
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Install MongoDB**
   - Download and install MongoDB Community Edition
   - Start MongoDB service
   - Or use MongoDB Atlas (cloud database)

5. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/change-password` - Change password

### Users
- `GET /api/users` - Get all users (Admin/Manager only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user (Admin only)
- `PUT /api/users/:id/activate` - Activate user (Admin only)
- `GET /api/users/:id/tools` - Get tools assigned to user
- `GET /api/users/stats/dashboard` - Get dashboard statistics

### Tools
- `GET /api/tools` - Get all tools with filtering
- `GET /api/tools/:id` - Get tool by ID
- `POST /api/tools` - Create new tool
- `PUT /api/tools/:id` - Update tool
- `DELETE /api/tools/:id` - Delete tool (Admin/Manager only)
- `PUT /api/tools/:id/assign` - Assign/unassign tool

## Database Models

### User Model
- firstName, lastName, email, password
- role (Admin, Manager, Employee)
- department, employeeId, phone
- isActive, lastLogin, profileImage

### Tool Model
- name, description, category, brand, model
- serialNumber, location, status, condition
- purchaseDate, purchasePrice
- assignedTo, assignedDate
- maintenance dates, imageUrl, notes

## User Roles

1. **Admin**: Full access to all features
2. **Manager**: Can view and manage tools and users (limited)
3. **Employee**: Can view tools and manage their own profile

## Authentication

All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Query Parameters

### Tools Filtering
- `category` - Filter by tool category
- `status` - Filter by tool status
- `location` - Filter by location (partial match)
- `search` - Search in name, description, brand, model

### Users Filtering
- `department` - Filter by department
- `role` - Filter by user role
- `isActive` - Filter by active status
- `search` - Search in name, email, employeeId

## Error Handling

The API returns consistent error responses:
```json
{
  "success": false,
  "message": "Error message",
  "errors": [] // Validation errors if any
}
```

## Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

### Environment Variables
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `CORS_ORIGIN` - Allowed CORS origin

## Security Considerations

1. Change JWT_SECRET in production
2. Use HTTPS in production
3. Implement rate limiting
4. Add input sanitization
5. Use environment variables for sensitive data

## Testing

Create test users and tools to verify the API:

1. Register an admin user
2. Create some tools
3. Assign tools to users
4. Test all CRUD operations

## Deployment

1. Set up production MongoDB
2. Configure environment variables
3. Use PM2 or similar process manager
4. Set up reverse proxy (nginx)
5. Enable SSL certificate

## Support

For issues and questions, please refer to the project documentation or contact the development team.
