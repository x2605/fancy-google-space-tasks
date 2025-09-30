// core/notification_utils.js - Notification system utilities
fgtlog('📢 Core Notification Utils loading...');

/**
 * Core notification utilities for all modules
 */
class CoreNotificationUtils {
    /**
     * Show notification message
     * @param {string} message - Notification message
     * @param {string} type - Notification type ('success', 'error', 'info', 'warning')
     * @param {string} namespace - CSS namespace
     * @param {number} duration - Display duration in milliseconds
     */
    static show(message, type = 'info', namespace = 'fancy-gst', duration = 3000) {
        // Remove existing notification
        const existing = document.querySelector(`.${namespace}-notification`);
        if (existing) {
            existing.remove();
        }

        // Create notification element
        const notification = CoreDOMUtils.createElement('div', {
            class: `${namespace}-notification ${namespace}-notification-${type}`
        }, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 16px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '999999',
            maxWidth: '300px',
            fontSize: '14px',
            fontFamily: 'Google Sans, Roboto, Arial, sans-serif',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease'
        }, message);

        // Set type-specific styles
        const typeStyles = CoreNotificationUtils.getTypeStyles(type);
        Object.entries(typeStyles).forEach(([key, value]) => {
            notification.style[key] = value;
        });

        // Add to DOM
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Auto remove
        setTimeout(() => {
            CoreNotificationUtils.remove(notification);
        }, duration);

        // Click to dismiss
        notification.addEventListener('click', () => {
            CoreNotificationUtils.remove(notification);
        });

        fgtlog(`📢 Notification (${type}): ${message}`);
    }

    /**
     * Get type-specific styles
     * @param {string} type - Notification type
     * @returns {Object} - Style object
     */
    static getTypeStyles(type) {
        const styles = {
            success: {
                background: '#e8f5e8',
                color: '#1e4620',
                border: '1px solid #4caf50'
            },
            error: {
                background: '#fce8e6',
                color: '#c5221f',
                border: '1px solid #ea4335'
            },
            warning: {
                background: '#fef7e0',
                color: '#b06000',
                border: '1px solid #ff9800'
            },
            info: {
                background: '#e3f2fd',
                color: '#0d47a1',
                border: '1px solid #2196f3'
            }
        };

        return styles[type] || styles.info;
    }

    /**
     * Remove notification with animation
     * @param {Element} notification - Notification element
     */
    static remove(notification) {
        if (notification && notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    /**
     * Show success notification
     * @param {string} message - Message
     * @param {string} namespace - CSS namespace
     * @param {number} duration - Duration
     */
    static success(message, namespace = 'fancy-gst', duration = 3000) {
        CoreNotificationUtils.show(message, 'success', namespace, duration);
    }

    /**
     * Show error notification
     * @param {string} message - Message
     * @param {string} namespace - CSS namespace
     * @param {number} duration - Duration
     */
    static error(message, namespace = 'fancy-gst', duration = 4000) {
        CoreNotificationUtils.show(message, 'error', namespace, duration);
    }

    /**
     * Show warning notification
     * @param {string} message - Message
     * @param {string} namespace - CSS namespace
     * @param {number} duration - Duration
     */
    static warning(message, namespace = 'fancy-gst', duration = 3500) {
        CoreNotificationUtils.show(message, 'warning', namespace, duration);
    }

    /**
     * Show info notification
     * @param {string} message - Message
     * @param {string} namespace - CSS namespace
     * @param {number} duration - Duration
     */
    static info(message, namespace = 'fancy-gst', duration = 3000) {
        CoreNotificationUtils.show(message, 'info', namespace, duration);
    }

    /**
     * Show loading notification
     * @param {string} message - Message
     * @param {string} namespace - CSS namespace
     * @returns {Element} - Notification element for manual removal
     */
    static loading(message, namespace = 'fancy-gst') {
        // Remove existing notification
        const existing = document.querySelector(`.${namespace}-notification`);
        if (existing) {
            existing.remove();
        }

        // Create loading notification
        const notification = CoreDOMUtils.createElement('div', {
            class: `${namespace}-notification ${namespace}-notification-loading`
        }, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 16px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '999999',
            maxWidth: '300px',
            fontSize: '14px',
            fontFamily: 'Google Sans, Roboto, Arial, sans-serif',
            background: '#f8f9fa',
            color: '#202124',
            border: '1px solid #dadce0',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        });

        // Add loading spinner
        const spinner = CoreDOMUtils.createElement('div', {}, {
            width: '16px',
            height: '16px',
            border: '2px solid #e0e0e0',
            borderTop: '2px solid #1a73e8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        });

        // Add spinner animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        notification.appendChild(spinner);
        notification.appendChild(document.createTextNode(message));

        // Add to DOM
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);

        fgtlog(`⏳ Loading notification: ${message}`);
        return notification;
    }
}

// Export to global scope
window.CoreNotificationUtils = CoreNotificationUtils;

fgtlog('✅ Core Notification Utils loaded successfully');