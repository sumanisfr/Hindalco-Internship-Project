// Manager Tool Addition Requests JavaScript with Real-time Updates
// Real-time Tool Addition Request Management for Manager Dashboard

class ManagerToolRequestSystem {
  constructor() {
    this.socket = null;
    this.toolAdditionRequests = [];
    this.filteredRequests = [];
    this.currentFilters = {
      status: '',
      urgency: ''
    };
    this.init();
  }

  // Initialize the system
  init() {
    this.initializeSocketConnection();
    this.setupEventListeners();
    this.loadToolAdditionRequests();
    this.setupRealTimeUpdates();
  }

  // Initialize Socket.IO connection
  initializeSocketConnection() {
    if (typeof io !== 'undefined') {
      this.socket = apiService.initSocket();
      
      if (this.socket) {
        // Join manager role room for real-time updates
        this.socket.emit('join-role', 'Manager');
        
        console.log('Manager connected to real-time system');
        
        // Listen for real-time events
        this.setupSocketEventListeners();
      }
    }
  }

  // Setup Socket.IO event listeners
  setupSocketEventListeners() {
    if (!this.socket) return;

    // Listen for new tool addition requests
    this.socket.on('tool-addition-request-created', (data) => {
      console.log('New tool addition request received:', data);
      this.handleNewToolAdditionRequest(data);
    });

    // Listen for request updates
    this.socket.on('tool-addition-request-reviewed', (data) => {
      console.log('Tool addition request reviewed:', data);
      this.handleRequestUpdate(data);
    });

    // Listen for cancelled requests
    this.socket.on('tool-addition-request-cancelled', (data) => {
      console.log('Tool addition request cancelled:', data);
      this.handleRequestUpdate(data);
    });

    // Listen for new tools created
    this.socket.on('tool-created', (data) => {
      console.log('New tool created:', data);
      this.showSuccessNotification(`New tool "${data.tool.name}" added to inventory`);
    });
  }

  // Setup regular event listeners
  setupEventListeners() {
    // Ensure DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.attachEventListeners();
      });
    } else {
      this.attachEventListeners();
    }
  }

  // Attach event listeners to DOM elements
  attachEventListeners() {
    // Filter change handlers
    const statusFilter = document.getElementById('requestStatusFilter');
    const urgencyFilter = document.getElementById('requestUrgencyFilter');

    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.currentFilters.status = e.target.value;
        this.applyFilters();
      });
    }

    if (urgencyFilter) {
      urgencyFilter.addEventListener('change', (e) => {
        this.currentFilters.urgency = e.target.value;
        this.applyFilters();
      });
    }

    // Refresh button
    window.refreshToolAdditionRequests = () => {
      this.loadToolAdditionRequests();
    };

    // Filter function
    window.filterToolAdditionRequests = () => {
      this.applyFilters();
    };

    // Global functions for table actions
    window.viewToolAdditionRequest = (requestId) => {
      this.viewRequestDetails(requestId);
    };

    window.approveToolAdditionRequest = (requestId) => {
      this.showApprovalModal(requestId);
    };

    window.rejectToolAdditionRequest = (requestId) => {
      this.showRejectionModal(requestId);
    };

    window.updateRequestPriority = (requestId, priority) => {
      this.updateRequestPriority(requestId, priority);
    };
  }

  // Setup real-time updates
  setupRealTimeUpdates() {
    // Check for real-time notifications
    document.addEventListener('notificationReceived', (event) => {
      const notification = event.detail;
      
      // Handle tool addition request notifications
      if (notification.type === 'tool_addition_request' || 
          notification.title.includes('Tool Addition')) {
        this.loadToolAdditionRequests();
      }
    });
  }

  // Load tool addition requests from API
  async loadToolAdditionRequests() {
    try {
      console.log('Loading tool addition requests...');
      const response = await apiService.getAllToolAdditionRequests();
      
      if (response.success && response.data) {
        this.toolAdditionRequests = response.data;
        this.filteredRequests = [...this.toolAdditionRequests];
        this.updateRequestsDisplay();
        this.updateSummaryCards();
        console.log('Loaded tool addition requests:', this.toolAdditionRequests.length);
      } else {
        console.warn('No tool addition requests found');
        this.showEmptyState();
      }
    } catch (error) {
      console.error('Error loading tool addition requests:', error);
      this.showErrorMessage('Failed to load tool addition requests');
    }
  }

  // Handle new tool addition request
  handleNewToolAdditionRequest(data) {
    // Show real-time notification
    this.showNotification({
      title: 'New Tool Addition Request',
      message: `${data.request.requestedBy?.firstName || 'User'} requested to add "${data.request.toolData.name}"`,
      type: 'info',
      actions: [
        {
          label: 'Review',
          action: () => this.viewRequestDetails(data.request._id)
        }
      ]
    });

    // Add to requests array
    this.toolAdditionRequests.unshift(data.request);
    this.applyFilters();
    this.updateSummaryCards();
    this.updatePendingBadge();

    // Highlight new request in table
    setTimeout(() => {
      this.highlightNewRequest(data.request._id);
    }, 500);
  }

  // Handle request updates
  handleRequestUpdate(data) {
    const requestIndex = this.toolAdditionRequests.findIndex(
      req => req._id === data.request._id
    );

    if (requestIndex !== -1) {
      this.toolAdditionRequests[requestIndex] = data.request;
      this.applyFilters();
      this.updateSummaryCards();
      this.updatePendingBadge();
    }
  }

  // Apply filters to requests
  applyFilters() {
    this.filteredRequests = this.toolAdditionRequests.filter(request => {
      const statusMatch = !this.currentFilters.status || 
                         request.status === this.currentFilters.status;
      const urgencyMatch = !this.currentFilters.urgency || 
                          request.urgency === this.currentFilters.urgency;
      
      return statusMatch && urgencyMatch;
    });

    this.updateRequestsDisplay();
  }

  // Update requests table display
  updateRequestsDisplay() {
    const tableBody = document.getElementById('toolAdditionRequestsTableBody');
    const noRequestsMessage = document.getElementById('noAdditionRequestsMessage');

    if (!tableBody) return;

    if (this.filteredRequests.length === 0) {
      tableBody.innerHTML = '';
      if (noRequestsMessage) {
        noRequestsMessage.style.display = 'block';
      }
      return;
    }

    if (noRequestsMessage) {
      noRequestsMessage.style.display = 'none';
    }

    tableBody.innerHTML = this.filteredRequests.map(request => {
      return this.createRequestRow(request);
    }).join('');
  }

  // Create table row for request
  createRequestRow(request) {
    const urgencyClass = this.getUrgencyClass(request.urgency);
    const statusClass = this.getStatusClass(request.status);
    const requesterName = request.requestedBy ? 
      `${request.requestedBy.firstName} ${request.requestedBy.lastName}` : 'Unknown';

    return `
      <tr class="hover:bg-gray-50 transition-colors duration-150" id="request-${request._id}">
        <td class="py-4 px-4">
          <div class="font-medium text-gray-900">${requesterName}</div>
          <div class="text-sm text-gray-500">${request.requestedBy?.department || 'N/A'}</div>
        </td>
        <td class="py-4 px-4">
          <div class="font-medium text-gray-900">${request.toolData.name}</div>
          <div class="text-sm text-gray-500">${request.toolData.location}</div>
        </td>
        <td class="py-4 px-4">
          <span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
            ${request.toolData.category}
          </span>
        </td>
        <td class="py-4 px-4">
          <span class="px-2 py-1 text-xs font-medium ${urgencyClass} rounded-full">
            ${request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}
          </span>
        </td>
        <td class="py-4 px-4">
          <span class="px-2 py-1 text-xs font-medium ${statusClass} rounded-full">
            ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </span>
        </td>
        <td class="py-4 px-4 text-sm text-gray-500">
          ${new Date(request.createdAt).toLocaleDateString()} 
          <br>
          <span class="text-xs">${new Date(request.createdAt).toLocaleTimeString()}</span>
        </td>
        <td class="py-4 px-4 text-center">
          <div class="flex justify-center space-x-2">
            <button onclick="viewToolAdditionRequest('${request._id}')" 
                    class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs transition-colors">
              <i class="fas fa-eye mr-1"></i>View
            </button>
            ${request.status === 'pending' ? `
              <button onclick="approveToolAdditionRequest('${request._id}')" 
                      class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs transition-colors">
                <i class="fas fa-check mr-1"></i>Approve
              </button>
              <button onclick="rejectToolAdditionRequest('${request._id}')" 
                      class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs transition-colors">
                <i class="fas fa-times mr-1"></i>Reject
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }

  // Update summary cards
  updateSummaryCards() {
    const totalElement = document.getElementById('totalAdditionRequests');
    const pendingElement = document.getElementById('pendingAdditionRequests');
    const approvedElement = document.getElementById('approvedAdditionRequests');
    const rejectedElement = document.getElementById('rejectedAdditionRequests');

    if (!totalElement) return;

    const stats = this.calculateStats();

    totalElement.textContent = stats.total;
    if (pendingElement) pendingElement.textContent = stats.pending;
    if (approvedElement) approvedElement.textContent = stats.approved;
    if (rejectedElement) rejectedElement.textContent = stats.rejected;

    this.updatePendingBadge();
  }

  // Calculate statistics
  calculateStats() {
    return {
      total: this.toolAdditionRequests.length,
      pending: this.toolAdditionRequests.filter(r => r.status === 'pending').length,
      approved: this.toolAdditionRequests.filter(r => r.status === 'approved').length,
      rejected: this.toolAdditionRequests.filter(r => r.status === 'rejected').length
    };
  }

  // Update pending requests badge
  updatePendingBadge() {
    const badge = document.getElementById('pendingRequestsBadge');
    if (badge) {
      const pendingCount = this.toolAdditionRequests.filter(r => r.status === 'pending').length;
      if (pendingCount > 0) {
        badge.textContent = pendingCount;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  // View request details
  async viewRequestDetails(requestId) {
    try {
      const response = await apiService.getToolAdditionRequestById(requestId);
      
      if (response.success) {
        const request = response.data;
        this.showRequestDetailsModal(request);
      } else {
        this.showErrorMessage('Failed to load request details');
      }
    } catch (error) {
      console.error('Error loading request details:', error);
      this.showErrorMessage('Error loading request details');
    }
  }

  // Show request details modal
  showRequestDetailsModal(request) {
    const requesterName = request.requestedBy ? 
      `${request.requestedBy.firstName} ${request.requestedBy.lastName}` : 'Unknown';

    const modalContent = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="requestDetailsModal">
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-90vh overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold text-gray-800">Tool Addition Request Details</h2>
            <button onclick="closeRequestDetailsModal()" class="text-gray-500 hover:text-gray-700">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-3">
              <h3 class="text-lg font-semibold text-gray-700 border-b pb-2">Request Information</h3>
              <div>
                <label class="text-sm font-medium text-gray-600">Requested By:</label>
                <p class="text-gray-800">${requesterName}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">Department:</label>
                <p class="text-gray-800">${request.requestedBy?.department || 'N/A'}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">Status:</label>
                <span class="px-2 py-1 text-xs font-medium ${this.getStatusClass(request.status)} rounded-full">
                  ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">Urgency:</label>
                <span class="px-2 py-1 text-xs font-medium ${this.getUrgencyClass(request.urgency)} rounded-full">
                  ${request.urgency.charAt(0).toUpperCase() + request.urgency.slice(1)}
                </span>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">Requested Date:</label>
                <p class="text-gray-800">${new Date(request.createdAt).toLocaleString()}</p>
              </div>
            </div>
            
            <div class="space-y-3">
              <h3 class="text-lg font-semibold text-gray-700 border-b pb-2">Tool Information</h3>
              <div>
                <label class="text-sm font-medium text-gray-600">Tool Name:</label>
                <p class="text-gray-800 font-medium">${request.toolData.name}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-600">Category:</label>
                <p class="text-gray-800">${request.toolData.category}</p>
              </div>
              
              <div>
                <label class="text-sm font-medium text-gray-600">Location:</label>
                <p class="text-gray-800">${request.toolData.location}</p>
              </div>
             
            </div>
          </div>
          
          <div class="mt-4 space-y-3">
           
            <div>
              <label class="text-sm font-medium text-gray-600">Reason for Request:</label>
              <p class="text-gray-800 bg-gray-50 p-2 rounded">${request.reason}</p>
            </div>
         
            ${request.reviewComments ? `
              <div>
                <label class="text-sm font-medium text-gray-600">Review Comments:</label>
                <p class="text-gray-800 bg-yellow-50 p-2 rounded border border-yellow-200">${request.reviewComments}</p>
              </div>
            ` : ''}
          </div>
          
          <div class="mt-6 flex justify-end space-x-3">
            <button onclick="closeRequestDetailsModal()" 
                    class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">
              Close
            </button>
            ${request.status === 'pending' ? `
              <button onclick="closeRequestDetailsModal(); approveToolAdditionRequest('${request._id}')" 
                      class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                <i class="fas fa-check mr-2"></i>Approve
              </button>
              <button onclick="closeRequestDetailsModal(); rejectToolAdditionRequest('${request._id}')" 
                      class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
                <i class="fas fa-times mr-2"></i>Reject
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalContent);

    // Add close modal function to global scope
    window.closeRequestDetailsModal = () => {
      const modal = document.getElementById('requestDetailsModal');
      if (modal) {
        modal.remove();
      }
    };
  }

  // Show approval modal
  showApprovalModal(requestId) {
    const modalContent = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="approvalModal">
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold mb-4 text-green-700">Approve Tool Addition Request</h3>
          <form id="approvalForm">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">Review Comments (Optional):</label>
              <textarea id="approvalComments" rows="3" 
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                        placeholder="Add any comments about the approval..."></textarea>
            </div>
            <div class="flex justify-end space-x-3">
              <button type="button" onclick="closeApprovalModal()" 
                      class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">
                Cancel
              </button>
              <button type="submit" 
                      class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                <i class="fas fa-check mr-2"></i>Approve Request
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalContent);

    // Add event listeners
    const form = document.getElementById('approvalForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const comments = document.getElementById('approvalComments').value.trim();
      this.approveRequest(requestId, comments);
    });

    window.closeApprovalModal = () => {
      const modal = document.getElementById('approvalModal');
      if (modal) modal.remove();
    };
  }

  // Show rejection modal
  showRejectionModal(requestId) {
    const modalContent = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="rejectionModal">
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold mb-4 text-red-700">Reject Tool Addition Request</h3>
          <form id="rejectionForm">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">Reason for Rejection <span class="text-red-500">*</span>:</label>
              <textarea id="rejectionComments" rows="3" required
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500"
                        placeholder="Please provide a reason for rejecting this request..."></textarea>
            </div>
            <div class="flex justify-end space-x-3">
              <button type="button" onclick="closeRejectionModal()" 
                      class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">
                Cancel
              </button>
              <button type="submit" 
                      class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
                <i class="fas fa-times mr-2"></i>Reject Request
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalContent);

    // Add event listeners
    const form = document.getElementById('rejectionForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const comments = document.getElementById('rejectionComments').value.trim();
      if (comments) {
        this.rejectRequest(requestId, comments);
      }
    });

    window.closeRejectionModal = () => {
      const modal = document.getElementById('rejectionModal');
      if (modal) modal.remove();
    };
  }

  // Approve request
  async approveRequest(requestId, comments) {
    try {
      const reviewData = {
        status: 'approved',
        reviewComments: comments
      };

      const response = await apiService.reviewToolAdditionRequest(requestId, reviewData);
      
      if (response.success) {
        this.showSuccessNotification('Request approved successfully!');
        this.loadToolAdditionRequests(); // Refresh data
        
        // Close modal
        const modal = document.getElementById('approvalModal');
        if (modal) modal.remove();
      } else {
        this.showErrorMessage(response.message || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      this.showErrorMessage('Error approving request');
    }
  }

  

  // Reject request
  async rejectRequest(requestId, comments) {
    try {
      const reviewData = {
        status: 'rejected',
        reviewComments: comments
      };

      const response = await apiService.reviewToolAdditionRequest(requestId, reviewData);
      
      if (response.success) {
        this.showSuccessNotification('Request rejected successfully');
        this.loadToolAdditionRequests(); // Refresh data
        
        // Close modal
        const modal = document.getElementById('rejectionModal');
        if (modal) modal.remove();
      } else {
        this.showErrorMessage(response.message || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      this.showErrorMessage('Error rejecting request');
    }
  }

  // Update request priority
  async updateRequestPriority(requestId, priority) {
    try {
      const response = await apiService.updateToolAdditionRequestPriority(requestId, priority);
      
      if (response.success) {
        this.showSuccessNotification('Priority updated successfully');
        this.loadToolAdditionRequests(); // Refresh data
      } else {
        this.showErrorMessage('Failed to update priority');
      }
    } catch (error) {
      console.error('Error updating priority:', error);
      this.showErrorMessage('Error updating priority');
    }
  }

  // Highlight new request
  highlightNewRequest(requestId) {
    const row = document.getElementById(`request-${requestId}`);
    if (row) {
      row.classList.add('bg-blue-50', 'border-l-4', 'border-blue-400');
      setTimeout(() => {
        row.classList.remove('bg-blue-50', 'border-l-4', 'border-blue-400');
      }, 3000);
    }
  }

  // Show empty state
  showEmptyState() {
    const tableBody = document.getElementById('toolAdditionRequestsTableBody');
    const noRequestsMessage = document.getElementById('noAdditionRequestsMessage');

    if (tableBody) {
      tableBody.innerHTML = '';
    }
    
    if (noRequestsMessage) {
      noRequestsMessage.style.display = 'block';
    }

    this.updateSummaryCards();
  }

  // Utility methods for styling
  getStatusClass(status) {
    const classes = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getUrgencyClass(urgency) {
    const classes = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-orange-100 text-orange-800',
      'critical': 'bg-red-100 text-red-800'
    };
    return classes[urgency] || 'bg-gray-100 text-gray-800';
  }

  // Notification methods
  showNotification(notification) {
    if (typeof notificationSystem !== 'undefined') {
      notificationSystem.showNotification(notification);
    } else {
      console.log('Notification:', notification);
    }
  }

  showSuccessNotification(message) {
    this.showNotification({
      title: 'Success',
      message: message,
      type: 'success'
    });
  }

  showErrorMessage(message) {
    this.showNotification({
      title: 'Error',
      message: message,
      type: 'error'
    });
  }
}

// Initialize the system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if we're on the manager page and toolAdditionRequests section exists
  if (document.getElementById('toolAdditionRequestsSection')) {
    window.managerToolRequestSystem = new ManagerToolRequestSystem();
    console.log('Manager Tool Request System initialized');
  }
});

// Export for global use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ManagerToolRequestSystem;
}
