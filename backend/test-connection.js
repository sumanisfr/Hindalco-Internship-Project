const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
  try {
    console.log('Testing database connection...');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tool-tracking', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully');
    
    // Test database operations
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    console.log(`✅ Found ${userCount} users in database`);
    
    // Test server endpoint
    const express = require('express');
    const app = express();
    
    app.get('/test', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date() });
    });
    
    const server = app.listen(5001, () => {
      console.log('✅ Test server started on port 5001');
      console.log('✅ All connections working properly');
      server.close();
      mongoose.connection.close();
    });
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
  }
};

testConnection();
