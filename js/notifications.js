/**
 * ICM - Toast Notifications System
 * SignalR real-time notifications handler
 */

var ICM_Notifications = (function() {
    var _connection = null;
    var _serverURL = ICM_CONFIG.getApiUrl();
    var _toastContainer = null;
    var _statusBadge = null;
    var _toastCounter = 0;
    var _maxToasts = 5;
    var _defaultDuration = 8000; // 8 seconds

    /**
     * Initialize the notification system
     */
    function init() {
        createToastContainer();
        createStatusBadge();
        connectToHub();
    }

    /**
     * Create the toast container element
     */
    function createToastContainer() {
        if (document.getElementById('toastContainer')) {
            _toastContainer = document.getElementById('toastContainer');
            return;
        }

        _toastContainer = document.createElement('div');
        _toastContainer.id = 'toastContainer';
        _toastContainer.className = 'toast-container';
        document.body.appendChild(_toastContainer);
    }

    /**
     * Create the connection status badge
     */
    function createStatusBadge() {
        if (document.getElementById('signalrStatus')) {
            _statusBadge = document.getElementById('signalrStatus');
            return;
        }

        _statusBadge = document.createElement('div');
        _statusBadge.id = 'signalrStatus';
        _statusBadge.className = 'signalr-status';
        _statusBadge.innerHTML = '<span class="signalr-status-dot"></span><span class="signalr-status-text">Connecting...</span>';
        document.body.appendChild(_statusBadge);
    }

    /**
     * Update connection status badge
     * @param {string} status - 'connected', 'connecting', 'disconnected'
     * @param {string} text - Status text to display
     */
    function updateStatus(status, text) {
        if (!_statusBadge) return;

        _statusBadge.className = 'signalr-status ' + status;
        _statusBadge.querySelector('.signalr-status-text').textContent = text;

        // Show badge briefly then hide if connected
        _statusBadge.classList.add('visible');

        if (status === 'connected') {
            setTimeout(function() {
                _statusBadge.classList.remove('visible');
            }, 3000);
        }
    }

    /**
     * Connect to SignalR Hub
     */
    function connectToHub() {
        if (typeof signalR === 'undefined') {
            console.warn('SignalR library not loaded. Notifications disabled.');
            return;
        }

        updateStatus('connecting', 'Connecting...');

        _connection = new signalR.HubConnectionBuilder()
            .withUrl(_serverURL + '/hubs/notifications')
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        // Register event handlers
        registerEventHandlers();

        // Connection state change handlers
        _connection.onreconnecting(function(error) {
            console.log('SignalR reconnecting...', error);
            updateStatus('connecting', 'Reconnecting...');
        });

        _connection.onreconnected(function(connectionId) {
            console.log('SignalR reconnected:', connectionId);
            updateStatus('connected', 'Connected');
        });

        _connection.onclose(function(error) {
            console.log('SignalR connection closed', error);
            updateStatus('disconnected', 'Disconnected');

            // Try to reconnect after 5 seconds
            setTimeout(function() {
                startConnection();
            }, 5000);
        });

        // Start the connection
        startConnection();
    }

    /**
     * Start SignalR connection
     */
    function startConnection() {
        if (!_connection) return;

        _connection.start()
            .then(function() {
                console.log('SignalR connected');
                updateStatus('connected', 'Connected');
            })
            .catch(function(error) {
                console.error('SignalR connection error:', error);
                updateStatus('disconnected', 'Connection failed');

                // Retry after 5 seconds
                setTimeout(function() {
                    startConnection();
                }, 5000);
            });
    }

    /**
     * Register SignalR event handlers
     */
    function registerEventHandlers() {
        if (!_connection) return;

        // GeneratingReport event - for ICM process status
        _connection.on('GeneratingReport', function(data) {
            showToast({
                type: 'processing',
                title: 'ICM Process',
                message: data.status,
                time: data.time,
                duration: 3000
            });
        });

        // Generic notification event
        _connection.on('Notification', function(data) {
            showToast({
                type: data.type || 'info',
                title: data.title || 'Notification',
                message: data.message,
                time: data.time,
                duration: data.duration || _defaultDuration
            });
        });

        // Process started
        _connection.on('ProcessStarted', function(data) {
            showToast({
                type: 'info',
                title: 'Process Started',
                message: data.status || 'ICM calculation process has started.',
                time: data.time
            });
        });

        // Process completed
        _connection.on('ProcessCompleted', function(data) {
            showToast({
                type: 'success',
                title: 'Process Completed',
                message: data.status || 'ICM calculation completed successfully.',
                time: data.time,
                duration: 10000
            });
        });

        // Process error
        _connection.on('ProcessError', function(data) {
            showToast({
                type: 'error',
                title: 'Process Error',
                message: data.status || 'An error occurred during the process.',
                time: data.time,
                duration: 0 // Don't auto-close errors
            });
        });

        // Progress update
        _connection.on('ProgressUpdate', function(data) {
            showToast({
                type: 'processing',
                title: data.step || 'Processing',
                message: data.status,
                time: data.time,
                duration: 3000
            });
        });

        // Process step update - for step tracker UI
        _connection.on('ProcessStepUpdate', function(data) {
            // Determine toast duration based on status
            // - in_progress: short duration (auto-closes, will be replaced by next update)
            // - completed: medium duration
            // - error: longer duration so user can read
            var duration = data.status === 'in_progress' ? 3000 :
                          data.status === 'completed' ? 4000 :
                          data.status === 'error' ? 8000 : 3000;

            var toastType = data.status === 'completed' ? 'success' :
                           data.status === 'error' ? 'error' :
                           data.status === 'in_progress' ? 'processing' : 'info';

            showToast({
                type: toastType,
                title: data.stepName || 'Process Step',
                message: data.message || '',
                time: data.time,
                duration: duration
            });

            // Dispatch custom event for process-runner.js to handle UI update
            var event = new CustomEvent('processStepUpdate', { detail: data });
            document.dispatchEvent(event);
        });

        // Process steps initialization - receive all steps at start
        _connection.on('ProcessStepsInit', function(data) {
            // Dispatch custom event for process-runner.js to initialize steps
            var event = new CustomEvent('processStepsInit', { detail: data });
            document.dispatchEvent(event);
        });

        // Process completed with final status
        _connection.on('ProcessFinished', function(data) {
            var toastType = data.success ? 'success' : 'error';
            showToast({
                type: toastType,
                title: data.success ? 'Process Completed' : 'Process Failed',
                message: data.message || '',
                time: data.time,
                duration: 10000
            });

            // Dispatch custom event for process-runner.js
            var event = new CustomEvent('processFinished', { detail: data });
            document.dispatchEvent(event);
        });

        // Server status update - for header status and last run updates
        _connection.on('ServerStatusUpdate', function(data) {
            // Dispatch custom event for common.js to update header
            var event = new CustomEvent('serverStatusUpdate', { detail: data });
            document.dispatchEvent(event);
        });
    }

    /**
     * Get icon SVG for toast type
     * @param {string} type - Toast type
     * @returns {string} SVG icon HTML
     */
    function getIcon(type) {
        var icons = {
            info: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
            success: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
            warning: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            error: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
            processing: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>'
        };
        return icons[type] || icons.info;
    }

    /**
     * Format time for display
     * @param {string|Date} time - Time value
     * @returns {string} Formatted time string
     */
    function formatTime(time) {
        if (!time) return '';
        var date = new Date(time);
        return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    /**
     * Show a toast notification
     * @param {Object} options - Toast options
     * @param {string} options.type - 'info', 'success', 'warning', 'error', 'processing'
     * @param {string} options.title - Toast title
     * @param {string} options.message - Toast message
     * @param {string|Date} options.time - Timestamp
     * @param {number} options.duration - Auto-close duration in ms (0 = no auto-close)
     */
    function showToast(options) {
        if (!_toastContainer) {
            createToastContainer();
        }

        var type = options.type || 'info';
        var title = options.title || '';
        var message = options.message || '';
        var time = options.time;
        var duration = options.duration !== undefined ? options.duration : _defaultDuration;

        // Remove excess toasts
        var existingToasts = _toastContainer.querySelectorAll('.toast:not(.toast-exit)');
        while (existingToasts.length >= _maxToasts) {
            removeToast(existingToasts[0]);
            existingToasts = _toastContainer.querySelectorAll('.toast:not(.toast-exit)');
        }

        // Create toast element
        var toastId = 'toast-' + (++_toastCounter);
        var toast = document.createElement('div');
        toast.id = toastId;
        toast.className = 'toast toast-' + type;
        toast.style.position = 'relative';

        var html = '<div class="toast-icon">' + getIcon(type) + '</div>';
        html += '<div class="toast-content">';
        if (title) {
            html += '<p class="toast-title">' + escapeHtml(title) + '</p>';
        }
        html += '<p class="toast-message">' + escapeHtml(message) + '</p>';
        if (time) {
            html += '<p class="toast-time">' + formatTime(time) + '</p>';
        }
        html += '</div>';
        html += '<button class="toast-close" onclick="ICM_Notifications.closeToast(\'' + toastId + '\')">';
        html += '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        html += '</button>';

        toast.innerHTML = html;
        _toastContainer.appendChild(toast);

        // Auto-close if duration is set
        if (duration > 0) {
            setTimeout(function() {
                removeToast(toast);
            }, duration);
        }

        return toastId;
    }

    /**
     * Close a toast by ID
     * @param {string} toastId - Toast element ID
     */
    function closeToast(toastId) {
        var toast = document.getElementById(toastId);
        if (toast) {
            removeToast(toast);
        }
    }

    /**
     * Remove a toast with animation
     * @param {HTMLElement} toast - Toast element
     */
    function removeToast(toast) {
        if (!toast || toast.classList.contains('toast-exit')) return;

        toast.classList.add('toast-exit');
        setTimeout(function() {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Clear all toasts
     */
    function clearAll() {
        if (!_toastContainer) return;

        var toasts = _toastContainer.querySelectorAll('.toast');
        toasts.forEach(function(toast) {
            removeToast(toast);
        });
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Manually show a notification (for use without SignalR)
     */
    function notify(type, title, message, duration) {
        return showToast({
            type: type,
            title: title,
            message: message,
            time: new Date(),
            duration: duration
        });
    }

    // Public API
    return {
        init: init,
        showToast: showToast,
        closeToast: closeToast,
        clearAll: clearAll,
        notify: notify,
        info: function(title, message, duration) { return notify('info', title, message, duration); },
        success: function(title, message, duration) { return notify('success', title, message, duration); },
        warning: function(title, message, duration) { return notify('warning', title, message, duration); },
        error: function(title, message, duration) { return notify('error', title, message, duration); },
        processing: function(title, message) { return notify('processing', title, message, 0); }
    };
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    ICM_Notifications.init();
});
