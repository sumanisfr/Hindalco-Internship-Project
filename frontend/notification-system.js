// Real-time Notification System for Tool Tracking App
class NotificationSystem {
  constructor() {
    this.socket = null;
    this.notifications = [];
    this.userId = null;
    this.userRole = null;
    this.container = null;
    this.soundEnabled = true;
    this.notificationQueue = [];
    this.isProcessingQueue = false;
    this.init();
  }

  // Initialize the notification system
  init() {
    this.createNotificationContainer();
    this.loadUserInfo();
    this.initSocket();
    this.loadSavedNotifications();
    this.setupNotificationPermissions();
  }

  // Create the notification container in the DOM
  createNotificationContainer() {
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.className = 'fixed top-4 right-4 z-50 space-y-3 max-w-sm';
    this.container.style.cssText = `
      max-height: 80vh;
      overflow-y: auto;
      scroll-behavior: smooth;
    `;
    document.body.appendChild(this.container);

    // Add notification count badge to header
    this.createNotificationBadge();
  }

  // Create notification badge in header
  createNotificationBadge() {
    const badge = document.createElement('div');
    badge.id = 'notification-badge';
    badge.className = 'hidden';
    badge.style.cssText = `
      position: fixed;
      top: 20px;
      right: 80px;
      background: #ef4444;
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      z-index: 51;
    `;
    document.body.appendChild(badge);
  }

  // Load current user information
  loadUserInfo() {
    const userStr = sessionStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.userId = user.id;
      this.userRole = user.role;
    }
  }

  // Initialize Socket.IO connection
  initSocket() {
    if (typeof io !== 'undefined') {
      this.socket = io('http://localhost:5000');
      
      this.socket.on('connect', () => {
        console.log('Connected to notification server');
        if (this.userRole) {
          this.socket.emit('join-role', this.userRole);
        }
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from notification server');
      });

      // Listen for general notifications
      this.socket.on('notification', (data) => {
        this.handleNotification(data);
      });

      // Listen for tool addition request events
      this.socket.on('tool-addition-request-created', (data) => {
        if (this.userRole === 'Manager' || this.userRole === 'Admin') {
          this.showNotification({
            title: 'New Tool Addition Request',
            message: data.message,
            type: 'info',
            data: data.request,
            timestamp: data.timestamp,
            actions: [
              {
                label: 'Review',
                action: () => this.openToolAdditionRequest(data.request._id)
              }
            ]
          });
        }
      });

      // Listen for tool addition request reviews
      this.socket.on('tool-addition-request-reviewed', (data) => {
        if (data.targetUserId === this.userId) {
          const isApproved = data.request.status === 'approved';
          this.showNotification({
            title: `Request ${data.request.status.charAt(0).toUpperCase() + data.request.status.slice(1)}`,
            message: `Your tool addition request for "${data.request.toolData.name}" has been ${data.request.status}`,
            type: isApproved ? 'success' : 'warning',
            data: data.request,
            timestamp: data.timestamp,
            actions: isApproved ? [
              {
                label: 'View Tool',
                action: () => this.openTool(data.request.createdToolId)
              }
            ] : []
          });
        }
      });

      // Listen for new tool created events
      this.socket.on('tool-created', (data) => {
        this.showNotification({
          title: 'New Tool Added',
          message: `${data.tool.name} has been added to inventory`,
          type: 'success',
          data: data.tool,
          timestamp: data.timestamp
        });
      });

      // Listen for existing tool request events
      this.socket.on('request-created', (data) => {
        if (this.userRole === 'Manager' || this.userRole === 'Admin') {
          this.showNotification({
            title: 'New Tool Request',
            message: data.message,
            type: 'info',
            data: data.request,
            timestamp: data.timestamp,
            actions: [
              {
                label: 'Review',
                action: () => this.openToolRequest(data.request._id)
              }
            ]
          });
        }
      });

      // Listen for tool request reviews
      this.socket.on('request-reviewed', (data) => {
        if (data.targetUserId === this.userId) {
          this.showNotification({
            title: `Request ${data.request.status.charAt(0).toUpperCase() + data.request.status.slice(1)}`,
            message: data.message,
            type: data.request.status === 'approved' ? 'success' : 'warning',
            data: data.request,
            timestamp: data.timestamp
          });
        }
      });

    } else {
      console.warn('Socket.IO not available, real-time notifications disabled');
    }
  }

  // Handle incoming notifications
  handleNotification(data) {
    // Check if notification is targeted to specific user
    if (data.targetUserId && data.targetUserId !== this.userId) {
      return;
    }

    // Add to queue for processing
    this.notificationQueue.push(data);
    this.processNotificationQueue();
  }

  // Process notification queue to avoid flooding
  async processNotificationQueue() {
    if (this.isProcessingQueue || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      this.showNotification(notification);
      
      // Delay between notifications to prevent overwhelming user
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.isProcessingQueue = false;
  }

  // Show notification
  showNotification(data) {
    const notification = {
      id: this.generateId(),
      title: data.title,
      message: data.message,
      type: data.type || 'info',
      timestamp: data.timestamp || new Date(),
      data: data.data || {},
      actions: data.actions || [],
      read: false,
      persistent: data.persistent || false
    };

    // Add to notifications array
    this.notifications.unshift(notification);

    // Create DOM element
    const element = this.createNotificationElement(notification);
    
    // Add to container
    this.container.insertBefore(element, this.container.firstChild);

    // Play notification sound
    this.playNotificationSound(notification.type);

    // Show browser notification if permitted
    this.showBrowserNotification(notification);

    // Auto-remove non-persistent notifications
    if (!notification.persistent) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, 8000);
    }

    // Update notification badge
    this.updateNotificationBadge();

    // Save to localStorage
    this.saveNotifications();

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('notificationReceived', {
      detail: notification
    }));
  }

  // Create notification DOM element
  createNotificationElement(notification) {
    const element = document.createElement('div');
    element.id = `notification-${notification.id}`;
    element.className = `notification transform transition-all duration-300 ease-in-out translate-x-full opacity-0`;
    
    const typeColors = {
      success: 'bg-green-500 border-green-600',
      error: 'bg-red-500 border-red-600',
      warning: 'bg-yellow-500 border-yellow-600',
      info: 'bg-blue-500 border-blue-600'
    };

    const bgColor = typeColors[notification.type] || typeColors.info;

    element.innerHTML = `
      <div class="bg-white rounded-lg shadow-lg border-l-4 ${bgColor} p-4 max-w-sm">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <i class="fas ${this.getNotificationIcon(notification.type)} text-${notification.type === 'error' ? 'red' : notification.type === 'warning' ? 'yellow' : notification.type === 'success' ? 'green' : 'blue'}-500 text-lg"></i>
          </div>
          <div class="ml-3 flex-1">
            <h4 class="text-sm font-semibold text-gray-900 mb-1">${notification.title}</h4>
            <p class="text-sm text-gray-700 mb-2">${notification.message}</p>
            ${notification.actions.length > 0 ? `
              <div class="flex space-x-2">
                ${notification.actions.map(action => `
                  <button onclick="notificationSystem.executeAction('${notification.id}', '${action.label}')" 
                          class="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded transition-colors">
                    ${action.label}
                  </button>
                `).join('')}
              </div>
            ` : ''}
            <div class="text-xs text-gray-500 mt-2">${this.formatTimestamp(notification.timestamp)}</div>
          </div>
          <div class="flex-shrink-0 ml-4">
            <button onclick="notificationSystem.removeNotification('${notification.id}')" 
                    class="text-gray-400 hover:text-gray-600 transition-colors">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    // Animate in
    setTimeout(() => {
      element.classList.remove('translate-x-full', 'opacity-0');
    }, 100);

    return element;
  }

  // Get icon for notification type
  getNotificationIcon(type) {
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
  }

  // Execute notification action
  executeAction(notificationId, actionLabel) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      const action = notification.actions.find(a => a.label === actionLabel);
      if (action && action.action) {
        action.action();
        this.removeNotification(notificationId);
      }
    }
  }

  // Remove notification
  removeNotification(notificationId) {
    const element = document.getElementById(`notification-${notificationId}`);
    if (element) {
      element.classList.add('translate-x-full', 'opacity-0');
      setTimeout(() => {
        element.remove();
      }, 300);
    }

    // Remove from array
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.updateNotificationBadge();
    this.saveNotifications();
  }

  // Clear all notifications
  clearAllNotifications() {
    this.notifications = [];
    this.container.innerHTML = '';
    this.updateNotificationBadge();
    this.saveNotifications();
  }

  // Update notification badge
  updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    const unreadCount = this.notifications.filter(n => !n.read).length;
    
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  // Format timestamp
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  // Play notification sound
  playNotificationSound(type) {
    if (!this.soundEnabled) return;

    try {
      const audio = new Audio();
      
      // Different sounds for different types
      switch (type) {
        case 'success':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBDOFzvLZeyIC';
          break;
        case 'error':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBDOFzvLZeyIC';
          break;
        default:
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBDOFzvLZeyIC';
      }
      
      audio.volume = 0.3;
      audio.play().catch(e => console.log('Could not play notification sound:', e));
    } catch (error) {
      console.log('Error playing notification sound:', error);
    }
  }

  // Show browser notification
  showBrowserNotification(notification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.persistent
      });

      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
      };

      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }
  }

  // Setup notification permissions
  setupNotificationPermissions() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // Save notifications to localStorage
  saveNotifications() {
    try {
      const toSave = this.notifications.slice(0, 50); // Keep only last 50
      localStorage.setItem('notifications', JSON.stringify(toSave));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  // Load saved notifications
  loadSavedNotifications() {
    try {
      const saved = localStorage.getItem('notifications');
      if (saved) {
        this.notifications = JSON.parse(saved);
        this.updateNotificationBadge();
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  // Generate unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Navigation helpers
  openToolAdditionRequest(requestId) {
    if (this.userRole === 'Manager' || this.userRole === 'Admin') {
      window.location.href = `manager.html#tool-addition-requests?id=${requestId}`;
    }
  }

  openToolRequest(requestId) {
    if (this.userRole === 'Manager' || this.userRole === 'Admin') {
      window.location.href = `manager.html#tool-requests?id=${requestId}`;
    }
  }

  openTool(toolId) {
    window.location.href = `${this.userRole === 'Employee' ? 'user' : 'manager'}.html#tools?id=${toolId}`;
  }

  // Toggle sound
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('notificationSoundEnabled', this.soundEnabled.toString());
  }

  // Get notification count
  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  // Mark all as read
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.updateNotificationBadge();
    this.saveNotifications();
  }
}

// Initialize global notification system
const notificationSystem = new NotificationSystem();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationSystem;
}
