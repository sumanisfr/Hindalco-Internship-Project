const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const createTestUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tool-tracking', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clear existing users (optional - comment out if you want to keep existing users)
    // await User.deleteMany({});
    // console.log('Cleared existing users');

    // Create test users
    const testUsers = [
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@hindalco.com',
        password: 'password',
        role: 'Admin',
        department: 'IT',
        employeeId: 'ADM001',
        phone: '+91-9876543210'
      },
      {
        firstName: 'Manager',
        lastName: 'User',
        email: 'manager@hindalco.com',
        password: 'password',
        role: 'Manager',
        department: 'Operations',
        employeeId: 'MGR001',
        phone: '+91-9876543211'
      },
      {
        firstName: 'Regular',
        lastName: 'User',
        email: 'user@hindalco.com',
        password: 'password',
        role: 'Employee',
        department: 'Production',
        employeeId: 'USR001',
        phone: '+91-9876543212'
      }
    ];

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`Created user: ${userData.email} (${userData.role})`);
      } else {
        console.log(`User already exists: ${userData.email}`);
      }
    }

    console.log('\nTest users created successfully!');
    console.log('\nYou can now login with:');
    console.log('- admin@hindalco.com / password (Admin)');
    console.log('- manager@hindalco.com / password (Manager)');
    console.log('- user@hindalco.com / password (User)');

  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

// Run the script
createTestUsers();
