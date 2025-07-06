const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ✅ Allow Vercel frontend origin
app.use(cors({
  origin: "https://hindalco-internship-project-savn.vercel.app",
  credentials: true
}));

// ✅ Use same origin for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "https://hindalco-internship-project-savn.vercel.app",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

app.use(express.json());

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

app.set('io', io);

// Routes
app.use('/api/tools', require('./routes/tools'));
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tool-requests', require('./routes/toolRequests'));
app.use('/api/tool-addition-requests', require('./routes/toolAdditionRequests'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/reports', require('./routes/reports'));

app.get('/', (req, res) => {
  res.json({ message: 'Tool Tracking API is running!' });
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-role', (role) => {
    socket.join(role);
    console.log(`User ${socket.id} joined ${role} room`);
  });

  socket.on('new-request', (data) => {
    socket.to('Manager').to('Admin').emit('request-created', data);
  });

  socket.on('request-reviewed', (data) => {
    io.emit('request-updated', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
