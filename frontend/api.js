// // API Configuration
// const API_BASE_URL = 'http://localhost:5000/api';
// const SOCKET_URL = 'http://localhost:5000';
const API_BASE_URL = 'https://internship-project.onrender.com/api';
const SOCKET_URL = 'https://internship-project.onrender.com';


// API Service class for handling all backend communications
class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.socket = null;
  }

  // Initialize Socket.IO connection
  initSocket() {
    if (typeof io !== 'undefined') {
      this.socket = io(SOCKET_URL);
      return this.socket;
    }
    return null;
  }

  // Join role-based room for real-time updates
  joinRoleRoom(role) {
    if (this.socket) {
      this.socket.emit('join-role', role);
    }
  }

  // Generic fetch wrapper with error handling
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
  }

  // User methods
  async getCurrentUser() {
    return this.request('/users/profile');
  }

  async getAllUsers() {
    return this.request('/users');
  }

  async updateUser(userId, userData) {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId) {
    return this.request(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Tool methods
  async getAllTools() {
    return this.request('/tools');
  }

  async getToolById(toolId) {
    return this.request(`/tools/${toolId}`);
  }

  async createTool(toolData) {
    return this.request('/tools', {
      method: 'POST',
      body: JSON.stringify(toolData),
    });
  }

  async updateTool(toolId, toolData) {
    return this.request(`/tools/${toolId}`, {
      method: 'PUT',
      body: JSON.stringify(toolData),
    });
  }

  async deleteTool(toolId) {
    return this.request(`/tools/${toolId}`, {
      method: 'DELETE',
    });
  }

  async assignTool(toolId, userId) {
    return this.request(`/tools/${toolId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async returnTool(toolId) {
    return this.request(`/tools/${toolId}/return`, {
      method: 'POST',
    });
  }

  // Tool Request methods
  async getAllToolRequests(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/tool-requests${queryString ? '?' + queryString : ''}`);
  }

  async getToolRequestById(requestId) {
    return this.request(`/tool-requests/${requestId}`);
  }

  async createToolRequest(requestData) {
    return this.request('/tool-requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async reviewToolRequest(requestId, reviewData) {
    return this.request(`/tool-requests/${requestId}/review`, {
      method: 'PUT',
      body: JSON.stringify(reviewData),
    });
  }

  async cancelToolRequest(requestId) {
    return this.request(`/tool-requests/${requestId}/cancel`, {
      method: 'PUT',
    });
  }

  async getRequestStats() {
    return this.request('/tool-requests/stats/dashboard');
  }

  // User Management
  async createUser(userData) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId, userData) {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deactivateUser(userId) {
    return this.request(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Tool Management
  async assignTool(toolId, userId) {
    return this.request(`/tools/${toolId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ userId }),
    });
  }

  async returnTool(toolId) {
    return this.request(`/tools/${toolId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ userId: null }),
    });
  }

  async requestTool(toolId, requestData) {
    return this.request('/tool-requests', {
      method: 'POST',
      body: JSON.stringify({ tool: toolId, ...requestData }),
    });
  }

  // Maintenance Scheduling
  async scheduleMaintenance(data) {
    return this.request('/maintenance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMaintenance(id, data) {
    return this.request(`/maintenance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Notifications
  async sendNotification(notificationData) {
    return this.request('/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    });
  }

  // Quick Actions
  async performQuickAction(actionData) {
    return this.request('/quick-actions', {
      method: 'POST',
      body: JSON.stringify(actionData),
    });
  }

  // Data Export and Backup
  async exportData(dataType) {
    return this.request(`/reports/export/${dataType}`);
  }

  async createBackup() {
    return this.request('/reports/backup', {
      method: 'POST',
    });
  }
  async getDashboardStats() {
    return this.request('/users/stats/dashboard');
  }

  // Maintenance methods
  async getAllMaintenance(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/maintenance${queryString ? '?' + queryString : ''}`);
  }

  async getMaintenanceById(maintenanceId) {
    return this.request(`/maintenance/${maintenanceId}`);
  }

  async scheduleMaintenance(maintenanceData) {
    return this.request('/maintenance', {
      method: 'POST',
      body: JSON.stringify(maintenanceData),
    });
  }

  async updateMaintenance(maintenanceId, maintenanceData) {
    return this.request(`/maintenance/${maintenanceId}`, {
      method: 'PUT',
      body: JSON.stringify(maintenanceData),
    });
  }

  async deleteMaintenance(maintenanceId) {
    return this.request(`/maintenance/${maintenanceId}`, {
      method: 'DELETE',
    });
  }

  async getMaintenanceStats() {
    return this.request('/maintenance/stats/dashboard');
  }

  // Export and Backup methods
  async exportData(type, format = 'json') {
    return this.request(`/reports/export/${type}?format=${format}`);
  }

  async createBackup() {
    return this.request('/reports/backup', {
      method: 'POST',
    });
  }

  async getComprehensiveDashboard() {
    return this.request('/reports/dashboard');
  }

  // User assignment methods
  async assignToolToUser(toolId, userId, assignmentData) {
    return this.request(`/tools/${toolId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ userId, ...assignmentData }),
    });
  }

  async unassignTool(toolId) {
    return this.request(`/tools/${toolId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ userId: null }),
    });
  }

  // Tool Addition Request methods
  async getAllToolAdditionRequests(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/tool-addition-requests${queryString ? '?' + queryString : ''}`);
  }

  async getToolAdditionRequestById(requestId) {
    return this.request(`/tool-addition-requests/${requestId}`);
  }

  async createToolAdditionRequest(requestData) {
    return this.request('/tool-addition-requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async reviewToolAdditionRequest(requestId, reviewData) {
    return this.request(`/tool-addition-requests/${requestId}/review`, {
      method: 'PUT',
      body: JSON.stringify(reviewData),
    });
  }

  async cancelToolAdditionRequest(requestId) {
    return this.request(`/tool-addition-requests/${requestId}/cancel`, {
      method: 'PUT',
    });
  }

  async getToolAdditionRequestStats() {
    return this.request('/tool-addition-requests/stats/dashboard');
  }

  async updateToolAdditionRequestPriority(requestId, priority) {
    return this.request(`/tool-addition-requests/${requestId}/priority`, {
      method: 'PUT',
      body: JSON.stringify({ priority }),
    });
  }

  // Health check method
  async healthCheck() {
    try {
      const response = await fetch('http://localhost:5000/');
      return await response.json();
    } catch (error) {
      throw new Error('Backend server is not running');
    }
  }
}

// Create global instance
const apiService = new ApiService();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiService;
}

