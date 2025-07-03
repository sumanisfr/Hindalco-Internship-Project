// Dashboard Utilities for Tool Tracking System
// Real-time dashboard functionality for all user roles

class DashboardUtils {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.refreshInterval = null;
        this.notificationSound = null;
    }

    // Initialize dashboard
    async initialize(userRole) {
        try {
            this.currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
            
            // Initialize Socket.IO
            this.initializeSocket();
            
            // Setup role-based features
            this.setupRoleBasedFeatures(userRole);
            
            // Load initial data
            await this.loadInitialData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            console.log('Dashboard initialized successfully');
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            this.showNotification('Dashboard initialization failed', 'error');
        }
    }

    // Initialize Socket.IO connection
    initializeSocket() {
        if (typeof io !== 'undefined') {
            this.socket = io('http://localhost:5000');
            
            this.socket.on('connect', () => {
                console.log('Connected to real-time server');
                this.socket.emit('join-role', this.currentUser.role);
                this.showNotification('Connected to real-time updates', 'success');
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from real-time server');
                this.showNotification('Real-time connection lost', 'warning');
            });

            // Listen for real-time events
            this.setupSocketListeners();
        }
    }

    // Setup socket event listeners
    setupSocketListeners() {
        if (!this.socket) return;

        // Tool request events
        this.socket.on('request-created', (data) => {
            this.handleNewRequest(data);
        });

        this.socket.on('request-updated', (data) => {
            this.handleRequestUpdate(data);
        });

        this.socket.on('request-reviewed', (data) => {
            this.handleRequestReview(data);
        });

        // Tool events
        this.socket.on('tool-assigned', (data) => {
            this.handleToolAssignment(data);
        });

        this.socket.on('tool-returned', (data) => {
            this.handleToolReturn(data);
        });

        // Maintenance events
        this.socket.on('maintenance-scheduled', (data) => {
            this.handleMaintenanceScheduled(data);
        });

        this.socket.on('maintenance-updated', (data) => {
            this.handleMaintenanceUpdate(data);
        });

        // User management events
        this.socket.on('user-created', (data) => {
            this.handleUserCreated(data);
        });

        this.socket.on('user-updated', (data) => {
            this.handleUserUpdate(data);
        });

        // System events
        this.socket.on('data-exported', (data) => {
            this.handleDataExport(data);
        });

        this.socket.on('backup-created', (data) => {
            this.handleBackupCreated(data);
        });
    }

    // Handle new tool request
    handleNewRequest(data) {
        if (this.currentUser.role === 'Manager' || this.currentUser.role === 'Admin') {
            this.playNotificationSound();
            this.showNotification(`New ${data.request.urgency} priority request from ${data.request.requestedBy.firstName}`, 'info');
            this.updatePendingRequestsBadge();
            this.refreshRequestsTable();
            this.updateDashboardStats();
        }
    }

    // Handle request status update
    handleRequestUpdate(data) {
        this.showNotification(`Request ${data.request.status}: ${data.request.tool.name}`, 
            data.request.status === 'approved' ? 'success' : 'warning');
        this.refreshRequestsTable();
        this.updateDashboardStats();
    }

    // Handle request review
    handleRequestReview(data) {
        if (data.request.requestedBy._id === this.currentUser.id) {
            const message = data.request.status === 'approved' 
                ? `🎉 Your request for ${data.request.tool.name} has been approved!`
                : `❌ Your request for ${data.request.tool.name} has been rejected.`;
            this.showNotification(message, data.request.status === 'approved' ? 'success' : 'error');
        }
        this.refreshRequestsTable();
        this.updateDashboardStats();
    }

    // Handle tool assignment
    handleToolAssignment(data) {
        this.showNotification(`Tool ${data.tool.name} assigned to ${data.assignedTo.firstName}`, 'info');
        this.refreshToolsGrid();
        this.updateDashboardStats();
    }

    // Handle tool return
    handleToolReturn(data) {
        this.showNotification(`Tool ${data.tool.name} has been returned`, 'info');
        this.refreshToolsGrid();
        this.updateDashboardStats();
    }

    // Handle maintenance scheduled
    handleMaintenanceScheduled(data) {
        this.showNotification(`Maintenance scheduled for ${data.tool.name}`, 'info');
        this.refreshMaintenanceList();
    }

    // Handle maintenance update
    handleMaintenanceUpdate(data) {
        this.showNotification(`Maintenance ${data.maintenance.status} for ${data.maintenance.tool.name}`, 'info');
        this.refreshMaintenanceList();
    }

    // Handle user created
    handleUserCreated(data) {
        if (this.currentUser.role === 'Admin' || this.currentUser.role === 'Manager') {
            this.showNotification(`New user created: ${data.user.firstName} ${data.user.lastName}`, 'info');
            this.refreshUsersTable();
            this.updateDashboardStats();
        }
    }

    // Handle user update
    handleUserUpdate(data) {
        this.showNotification(`User ${data.user.firstName} ${data.user.lastName} updated`, 'info');
        this.refreshUsersTable();
        this.updateDashboardStats();
    }

    // Handle data export
    handleDataExport(data) {
        this.showNotification(`${data.type} data exported successfully`, 'success');
    }

    // Handle backup created
    handleBackupCreated(data) {
        this.showNotification('System backup created successfully', 'success');
    }

    // Setup role-based features
    setupRoleBasedFeatures(role) {
        switch (role) {
            case 'Admin':
                this.enableAdminFeatures();
                break;
            case 'Manager':
                this.enableManagerFeatures();
                break;
            case 'Employee':
                this.enableEmployeeFeatures();
                break;
        }
    }

    // Enable admin-specific features
    enableAdminFeatures() {
        this.showElement('#adminOnlyFeatures');
        this.showElement('#userManagementSection');
        this.showElement('#systemSettingsSection');
        this.showElement('#backupSection');
    }

    // Enable manager-specific features
    enableManagerFeatures() {
        this.showElement('#managerOnlyFeatures');
        this.showElement('#requestReviewSection');
        this.showElement('#toolAssignmentSection');
        this.showElement('#maintenanceSection');
    }

    // Enable employee-specific features
    enableEmployeeFeatures() {
        this.hideElement('#adminOnlyFeatures');
        this.hideElement('#managerOnlyFeatures');
        this.showElement('#employeeFeatures');
    }

    // Load initial dashboard data
    async loadInitialData() {
        try {
            const promises = [
                this.loadDashboardStats(),
                this.loadRecentActivities(),
                this.loadNotifications()
            ];

            if (this.currentUser.role === 'Manager' || this.currentUser.role === 'Admin') {
                promises.push(this.loadPendingRequests());
                promises.push(this.loadMaintenanceTasks());
            }

            await Promise.all(promises);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showNotification('Error loading dashboard data', 'error');
        }
    }

    // Load dashboard statistics
    async loadDashboardStats() {
        try {
            const response = await apiService.getComprehensiveDashboard();
            if (response.success) {
                this.updateDashboardStatsDisplay(response.data);
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    // Update dashboard stats display
    updateDashboardStatsDisplay(data) {
        // Update tool statistics
        if (data.tools) {
            this.updateElement('#totalToolsCount', data.tools.total);
            this.updateElement('#availableToolsCount', data.tools.available);
            this.updateElement('#toolsInUseCount', data.tools.inUse);
            this.updateElement('#maintenanceToolsCount', data.tools.maintenance);
        }

        // Update user statistics
        if (data.users) {
            this.updateElement('#totalUsersCount', data.users.total);
            this.updateElement('#activeUsersCount', data.users.active);
        }

        // Update request statistics
        if (data.requests) {
            this.updateElement('#pendingRequestsCount', data.requests.pending);
            this.updateElement('#approvedRequestsCount', data.requests.approved);
            this.updateElement('#rejectedRequestsCount', data.requests.rejected);
            this.updatePendingRequestsBadge(data.requests.pending);
        }

        // Update maintenance statistics
        if (data.maintenance) {
            this.updateElement('#scheduledMaintenanceCount', data.maintenance.scheduled);
            this.updateElement('#completedMaintenanceCount', data.maintenance.completed);
        }
    }

    // Load recent activities
    async loadRecentActivities() {
        try {
            const response = await apiService.getComprehensiveDashboard();
            if (response.success && response.data.recentActivities) {
                this.displayRecentActivities(response.data.recentActivities);
            }
        } catch (error) {
            console.error('Error loading recent activities:', error);
        }
    }

    // Display recent activities
    displayRecentActivities(activities) {
        const container = document.getElementById('recentActivitiesContainer');
        if (!container) return;

        const activitiesHtml = activities.recentRequests.map(request => `
            <div class="activity-item border-l-4 border-blue-500 pl-4 py-2">
                <p class="text-sm font-medium">${request.requestedBy.firstName} requested ${request.tool.name}</p>
                <p class="text-xs text-gray-500">${this.formatDate(request.createdAt)}</p>
            </div>
        `).join('');

        container.innerHTML = activitiesHtml;
    }

    // Load notifications
    async loadNotifications() {
        // Implementation for loading user notifications
        this.showNotification('Welcome to your dashboard!', 'info');
    }

    // Load pending requests (Manager/Admin only)
    async loadPendingRequests() {
        try {
            const response = await apiService.getAllToolRequests({ status: 'pending' });
            if (response.success) {
                this.displayPendingRequests(response.data);
                this.updatePendingRequestsBadge(response.data.length);
            }
        } catch (error) {
            console.error('Error loading pending requests:', error);
        }
    }

    // Display pending requests
    displayPendingRequests(requests) {
        const container = document.getElementById('pendingRequestsContainer');
        if (!container) return;

        if (requests.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No pending requests</p>';
            return;
        }

        const requestsHtml = requests.map(request => `
            <div class="request-card bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold">${request.tool.name}</h4>
                        <p class="text-sm text-gray-600">${request.requestedBy.firstName} ${request.requestedBy.lastName}</p>
                        <span class="inline-block px-2 py-1 text-xs rounded-full ${this.getUrgencyClass(request.urgency)}">
                            ${request.urgency}
                        </span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="reviewRequest('${request._id}')" class="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
                            Review
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = requestsHtml;
    }

    // Load maintenance tasks
    async loadMaintenanceTasks() {
        try {
            const response = await apiService.getAllMaintenance({ status: 'scheduled' });
            if (response.success) {
                this.displayMaintenanceTasks(response.data);
            }
        } catch (error) {
            console.error('Error loading maintenance tasks:', error);
        }
    }

    // Display maintenance tasks
    displayMaintenanceTasks(tasks) {
        const container = document.getElementById('maintenanceTasksContainer');
        if (!container) return;

        if (tasks.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No scheduled maintenance</p>';
            return;
        }

        const tasksHtml = tasks.map(task => `
            <div class="maintenance-card bg-white border rounded-lg p-4">
                <h4 class="font-semibold">${task.tool.name}</h4>
                <p class="text-sm text-gray-600">${task.maintenanceType} - ${task.description}</p>
                <p class="text-xs text-gray-500">Scheduled: ${this.formatDate(task.scheduledDate)}</p>
            </div>
        `).join('');

        container.innerHTML = tasksHtml;
    }

    // Setup event listeners
    setupEventListeners() {
        // User menu toggle
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userMenu = document.getElementById('userMenu');
        
        if (userMenuBtn && userMenu) {
            userMenuBtn.addEventListener('click', () => {
                userMenu.classList.toggle('hidden');
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!userMenuBtn.contains(e.target)) {
                    userMenu.classList.add('hidden');
                }
            });
        }

        // Navigation
        this.setupNavigation();

        // Search functionality
        this.setupSearch();

        // Refresh buttons
        this.setupRefreshButtons();
    }

    // Setup navigation
    setupNavigation() {
        const navLinks = document.querySelectorAll('[data-section]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('data-section');
                this.showSection(section);
            });
        });
    }

    // Setup search functionality
    setupSearch() {
        const searchInputs = document.querySelectorAll('[data-search]');
        searchInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const searchType = e.target.getAttribute('data-search');
                const searchTerm = e.target.value.toLowerCase();
                this.performSearch(searchType, searchTerm);
            });
        });
    }

    // Setup refresh buttons
    setupRefreshButtons() {
        const refreshButtons = document.querySelectorAll('[data-refresh]');
        refreshButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const refreshType = e.target.getAttribute('data-refresh');
                this.performRefresh(refreshType);
            });
        });
    }

    // Start auto-refresh
    startAutoRefresh() {
        // Refresh dashboard data every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadDashboardStats();
            if (this.currentUser.role === 'Manager' || this.currentUser.role === 'Admin') {
                this.loadPendingRequests();
            }
        }, 30000);
    }

    // Stop auto-refresh
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // Utility functions
    updateElement(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = value;
        }
    }

    showElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.remove('hidden');
        }
    }

    hideElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('hidden');
        }
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('hidden');
        });

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }
    }

    performSearch(type, term) {
        // Implementation for different search types
        console.log(`Searching ${type} for: ${term}`);
    }

    performRefresh(type) {
        switch (type) {
            case 'requests':
                this.refreshRequestsTable();
                break;
            case 'tools':
                this.refreshToolsGrid();
                break;
            case 'users':
                this.refreshUsersTable();
                break;
            case 'maintenance':
                this.refreshMaintenanceList();
                break;
            case 'dashboard':
                this.loadDashboardStats();
                break;
        }
        this.showNotification(`${type} refreshed`, 'info');
    }

    refreshRequestsTable() {
        if (typeof loadRequests === 'function') {
            loadRequests();
        }
    }

    refreshToolsGrid() {
        if (typeof loadTools === 'function') {
            loadTools();
        }
    }

    refreshUsersTable() {
        if (typeof loadUsers === 'function') {
            loadUsers();
        }
    }

    refreshMaintenanceList() {
        if (typeof loadMaintenance === 'function') {
            loadMaintenance();
        }
    }

    updatePendingRequestsBadge(count = null) {
        const badges = document.querySelectorAll('.pending-requests-badge');
        badges.forEach(badge => {
            if (count !== null) {
                badge.textContent = count;
                if (count > 0) {
                    badge.classList.remove('hidden');
                    badge.classList.add('badge-notification');
                } else {
                    badge.classList.add('hidden');
                    badge.classList.remove('badge-notification');
                }
            }
        });
    }

    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.log('Audio not supported');
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer') || this.createNotificationContainer();
        const notification = document.createElement('div');
        
        const colors = {
            'success': 'bg-green-500',
            'error': 'bg-red-500',
            'info': 'bg-blue-500',
            'warning': 'bg-yellow-500'
        };
        
        const icons = {
            'success': 'fas fa-check-circle',
            'error': 'fas fa-exclamation-circle',
            'info': 'fas fa-info-circle',
            'warning': 'fas fa-exclamation-triangle'
        };
        
        notification.className = `notification ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 mb-2`;
        notification.innerHTML = `
            <i class="${icons[type]}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" class="ml-auto text-white hover:text-gray-200">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(container);
        return container;
    }

    getUrgencyClass(urgency) {
        const classes = {
            'critical': 'bg-red-100 text-red-800',
            'high': 'bg-orange-100 text-orange-800',
            'medium': 'bg-yellow-100 text-yellow-800',
            'low': 'bg-green-100 text-green-800'
        };
        return classes[urgency] || 'bg-gray-100 text-gray-800';
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Cleanup
    destroy() {
        this.stopAutoRefresh();
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Create global instance
const dashboardUtils = new DashboardUtils();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardUtils;
}
