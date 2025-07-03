// Authentication Utilities for Tool Tracking System
// Handles authentication, authorization, and session management

class AuthUtils {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.authCheckInterval = null;
    }

    // Initialize authentication
    initialize() {
        this.loadStoredAuth();
        this.setupAuthCheck();
        this.setupTokenRefresh();
    }

    // Load stored authentication data
    loadStoredAuth() {
        try {
            this.token = localStorage.getItem('token');
            const userStr = sessionStorage.getItem('currentUser');
            if (userStr) {
                this.currentUser = JSON.parse(userStr);
            }
        } catch (error) {
            console.error('Error loading stored auth:', error);
            this.clearAuth();
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!(this.token && this.currentUser);
    }

    // Check if user has specific role
    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }

    // Check if user has any of the specified roles
    hasAnyRole(roles) {
        return this.currentUser && roles.includes(this.currentUser.role);
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Get auth token
    getToken() {
        return this.token;
    }

    // Set authentication data
    setAuth(token, user) {
        this.token = token;
        this.currentUser = user;
        
        // Store in browser storage
        localStorage.setItem('token', token);
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        
        console.log('Authentication set for user:', user.email);
    }

    // Clear authentication
    clearAuth() {
        this.token = null;
        this.currentUser = null;
        
        // Clear browser storage
        localStorage.removeItem('token');
        sessionStorage.removeItem('currentUser');
        localStorage.removeItem('lastActivity');
        
        console.log('Authentication cleared');
    }

    // Login user
    async login(email, password) {
        try {
            const response = await apiService.login(email, password);
            
            if (response.success && response.token && response.user) {
                this.setAuth(response.token, response.user);
                this.updateLastActivity();
                return {
                    success: true,
                    user: response.user,
                    redirectUrl: this.getRedirectUrl(response.user.role)
                };
            } else {
                throw new Error(response.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: error.message || 'Login failed'
            };
        }
    }

    // Register user
    async register(userData) {
        try {
            const response = await apiService.register(userData);
            
            if (response.success) {
                return {
                    success: true,
                    message: 'Registration successful! Please login with your credentials.'
                };
            } else {
                throw new Error(response.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                message: error.message || 'Registration failed'
            };
        }
    }

    // Logout user
    async logout() {
        try {
            // Clear authentication
            this.clearAuth();
            
            // Stop auth checking
            this.stopAuthCheck();
            
            // Redirect to login
            window.location.href = 'index.html';
            
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, message: error.message };
        }
    }

    // Get redirect URL based on user role
    getRedirectUrl(role) {
        const redirectMap = {
            'Employee': 'user_new.html',
            'Manager': 'manager_new.html',
            'Admin': 'admin.html'
        };
        return redirectMap[role] || 'user_new.html';
    }

    // Check authentication and redirect if needed
    checkAuthAndRedirect(requiredRole = null) {
        if (!this.isAuthenticated()) {
            console.log('User not authenticated, redirecting to login');
            window.location.href = 'index.html';
            return false;
        }

        if (requiredRole && !this.hasRole(requiredRole)) {
            console.log(`User doesn't have required role: ${requiredRole}`);
            // Redirect to appropriate dashboard
            window.location.href = this.getRedirectUrl(this.currentUser.role);
            return false;
        }

        this.updateLastActivity();
        return true;
    }

    // Setup periodic authentication checking
    setupAuthCheck() {
        // Check authentication every 5 minutes
        this.authCheckInterval = setInterval(() => {
            this.checkTokenValidity();
            this.checkSessionTimeout();
        }, 5 * 60 * 1000);
    }

    // Stop authentication checking
    stopAuthCheck() {
        if (this.authCheckInterval) {
            clearInterval(this.authCheckInterval);
            this.authCheckInterval = null;
        }
    }

    // Check if token is still valid
    async checkTokenValidity() {
        if (!this.token) return;

        try {
            const response = await apiService.getCurrentUser();
            if (!response.success) {
                console.log('Token is invalid, logging out');
                this.logout();
            }
        } catch (error) {
            console.log('Token validation failed, logging out');
            this.logout();
        }
    }

    // Check for session timeout
    checkSessionTimeout() {
        const lastActivity = localStorage.getItem('lastActivity');
        if (!lastActivity) {
            this.updateLastActivity();
            return;
        }

        const timeoutDuration = 24 * 60 * 60 * 1000; // 24 hours
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity);

        if (timeSinceLastActivity > timeoutDuration) {
            console.log('Session timeout, logging out');
            this.logout();
        }
    }

    // Update last activity timestamp
    updateLastActivity() {
        localStorage.setItem('lastActivity', Date.now().toString());
    }

    // Setup token refresh
    setupTokenRefresh() {
        // Update activity on user interactions
        ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
            document.addEventListener(event, () => {
                this.updateLastActivity();
            }, { passive: true });
        });
    }

    // Get user permissions based on role
    getUserPermissions() {
        if (!this.currentUser) return [];

        const permissions = {
            'Employee': [
                'view_tools',
                'request_tools',
                'view_own_requests',
                'view_profile',
                'update_profile'
            ],
            'Manager': [
                'view_tools',
                'request_tools',
                'view_own_requests',
                'view_all_requests',
                'approve_requests',
                'reject_requests',
                'assign_tools',
                'unassign_tools',
                'schedule_maintenance',
                'view_users',
                'view_maintenance',
                'export_data',
                'view_dashboard',
                'view_profile',
                'update_profile'
            ],
            'Admin': [
                'view_tools',
                'create_tools',
                'update_tools',
                'delete_tools',
                'request_tools',
                'view_own_requests',
                'view_all_requests',
                'approve_requests',
                'reject_requests',
                'assign_tools',
                'unassign_tools',
                'schedule_maintenance',
                'view_maintenance',
                'update_maintenance',
                'delete_maintenance',
                'view_users',
                'create_users',
                'update_users',
                'delete_users',
                'activate_users',
                'deactivate_users',
                'export_data',
                'backup_system',
                'view_dashboard',
                'view_analytics',
                'system_settings',
                'view_profile',
                'update_profile'
            ]
        };

        return permissions[this.currentUser.role] || [];
    }

    // Check if user has specific permission
    hasPermission(permission) {
        const userPermissions = this.getUserPermissions();
        return userPermissions.includes(permission);
    }

    // Get user role badge class
    getRoleBadgeClass(role = null) {
        const targetRole = role || (this.currentUser && this.currentUser.role);
        const badgeClasses = {
            'Admin': 'bg-purple-100 text-purple-800',
            'Manager': 'bg-blue-100 text-blue-800',
            'Employee': 'bg-gray-100 text-gray-800'
        };
        return badgeClasses[targetRole] || 'bg-gray-100 text-gray-800';
    }

    // Format user display name
    getDisplayName() {
        if (!this.currentUser) return 'User';
        
        if (this.currentUser.firstName && this.currentUser.lastName) {
            return `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        }
        
        if (this.currentUser.firstName) {
            return this.currentUser.firstName;
        }
        
        return this.currentUser.email || 'User';
    }

    // Get user avatar/initials
    getUserInitials() {
        if (!this.currentUser) return 'U';
        
        if (this.currentUser.firstName && this.currentUser.lastName) {
            return `${this.currentUser.firstName.charAt(0)}${this.currentUser.lastName.charAt(0)}`.toUpperCase();
        }
        
        if (this.currentUser.firstName) {
            return this.currentUser.firstName.charAt(0).toUpperCase();
        }
        
        if (this.currentUser.email) {
            return this.currentUser.email.charAt(0).toUpperCase();
        }
        
        return 'U';
    }

    // Update user profile
    async updateProfile(profileData) {
        try {
            if (!this.currentUser) {
                throw new Error('User not authenticated');
            }

            const response = await apiService.updateUser(this.currentUser.id, profileData);
            
            if (response.success) {
                // Update current user data
                this.currentUser = { ...this.currentUser, ...response.data };
                sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                
                return {
                    success: true,
                    message: 'Profile updated successfully',
                    user: this.currentUser
                };
            } else {
                throw new Error(response.message || 'Profile update failed');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            return {
                success: false,
                message: error.message || 'Profile update failed'
            };
        }
    }

    // Change password
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await apiService.request('/auth/change-password', {
                method: 'PUT',
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });
            
            if (response.success) {
                return {
                    success: true,
                    message: 'Password changed successfully'
                };
            } else {
                throw new Error(response.message || 'Password change failed');
            }
        } catch (error) {
            console.error('Password change error:', error);
            return {
                success: false,
                message: error.message || 'Password change failed'
            };
        }
    }

    // Handle authentication errors
    handleAuthError(error) {
        console.error('Authentication error:', error);
        
        if (error.message && error.message.includes('401')) {
            this.logout();
            return;
        }
        
        // Show error notification
        if (typeof showNotification === 'function') {
            showNotification(error.message || 'Authentication error', 'error');
        }
    }

    // Initialize user interface based on role
    initializeUI() {
        if (!this.currentUser) return;

        // Update user display name
        const userNameElements = document.querySelectorAll('[data-user-name]');
        userNameElements.forEach(element => {
            element.textContent = this.getDisplayName();
        });

        // Update user initials
        const userInitialsElements = document.querySelectorAll('[data-user-initials]');
        userInitialsElements.forEach(element => {
            element.textContent = this.getUserInitials();
        });

        // Update user role
        const userRoleElements = document.querySelectorAll('[data-user-role]');
        userRoleElements.forEach(element => {
            element.textContent = this.currentUser.role;
            element.className += ' ' + this.getRoleBadgeClass();
        });

        // Show/hide elements based on permissions
        this.setupPermissionBasedUI();
    }

    // Setup UI based on user permissions
    setupPermissionBasedUI() {
        const permissions = this.getUserPermissions();
        
        // Show elements based on permissions
        permissions.forEach(permission => {
            const elements = document.querySelectorAll(`[data-permission="${permission}"]`);
            elements.forEach(element => {
                element.classList.remove('hidden');
            });
        });

        // Hide elements user doesn't have permission for
        const allPermissionElements = document.querySelectorAll('[data-permission]');
        allPermissionElements.forEach(element => {
            const requiredPermission = element.getAttribute('data-permission');
            if (!permissions.includes(requiredPermission)) {
                element.classList.add('hidden');
            }
        });

        // Setup role-specific elements
        const roleElements = document.querySelectorAll(`[data-role="${this.currentUser.role}"]`);
        roleElements.forEach(element => {
            element.classList.remove('hidden');
        });

        // Hide elements for other roles
        const allRoleElements = document.querySelectorAll('[data-role]');
        allRoleElements.forEach(element => {
            const requiredRole = element.getAttribute('data-role');
            if (requiredRole !== this.currentUser.role) {
                element.classList.add('hidden');
            }
        });
    }

    // Validate form based on user permissions
    validateFormAccess(formElement) {
        const requiredPermission = formElement.getAttribute('data-required-permission');
        const requiredRole = formElement.getAttribute('data-required-role');

        if (requiredPermission && !this.hasPermission(requiredPermission)) {
            return false;
        }

        if (requiredRole && !this.hasRole(requiredRole)) {
            return false;
        }

        return true;
    }
}

// Global authentication utility functions
function checkAuthentication(requiredRole = null) {
    return authUtils.checkAuthAndRedirect(requiredRole);
}

function logout() {
    authUtils.logout();
}

function getCurrentUser() {
    return authUtils.getCurrentUser();
}

function hasPermission(permission) {
    return authUtils.hasPermission(permission);
}

function hasRole(role) {
    return authUtils.hasRole(role);
}

// Create global instance
const authUtils = new AuthUtils();

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    authUtils.initialize();
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthUtils;
}
