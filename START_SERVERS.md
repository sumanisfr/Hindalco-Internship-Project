# 🚀 Quick Start Guide - Hindalco Tool Tracking System

## Start the Servers

### 1. Start Backend Server (Terminal 1)
```bash
cd C:\Users\suman\Music\Internship_Project\backend
npm start
```
**✅ Backend will run on:** http://localhost:5000

### 2. Start Frontend Server (Terminal 2)
```bash
cd C:\Users\suman\Music\Internship_Project\frontend
npx http-server -p 8000 -c-1 --cors
```
**✅ Frontend will run on:** http://localhost:8000

## 📱 Access the Application

1. **Open your browser** and go to: **http://localhost:8000**
2. **You'll see the login page** - Click "Register here" to create your first account
3. **Register with different roles:**
   - Employee (to test tool requests)
   - Manager (to test request approval)
   - Admin (to test system administration)

## 🎯 Test the Real-time Features

### As an Employee:
1. Register/Login as Employee
2. Go to "Available Tools" section
3. Click "Request Tool" on any tool
4. Fill the form and submit

### As a Manager:
1. Open another browser tab/window
2. Register/Login as Manager
3. You'll see the pending request in real-time!
4. Click "Review" to approve/reject

### Real-time Magic ✨:
- The Employee will see the approval status update instantly
- Managers get audio notifications for new requests
- Dashboard statistics update in real-time

## 🔧 Current Status

**✅ Backend:** Running on port 5000 with MongoDB connected
**✅ Frontend:** Ready to run on port 8000
**✅ Real-time:** Socket.IO enabled for live updates
**✅ Features:** Complete registration, login, role-based dashboards

## 🌐 Available URLs

- **Main Application:** http://localhost:8000
- **Login Page:** http://localhost:8000/index.html
- **Registration:** http://localhost:8000/register.html
- **Employee Dashboard:** http://localhost:8000/user_new.html
- **Manager Dashboard:** http://localhost:8000/manager_new.html
- **API Endpoint:** http://localhost:5000/api

## 🎉 You're All Set!

The system is now running and ready for testing. Try registering users with different roles and test the real-time tool request workflow!
