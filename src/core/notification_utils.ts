// core/notification_utils.ts - Notification system utilities (CSS-based)
import * as Logger from '@/core/logger';
import { CoreDOMUtils } from './dom_utils';

Logger.fgtlog('📢 Core Notification Utils loading...');

type NotificationType = 'success' | 'error' | 'info' | 'warning' | 'loading';

/**
 * Core notification utilities for all modules
 */
class CoreNotificationUtils {
    /**
     * Show notification message
     * @param message - Notification message
     * @param type - Notification type
     * @param namespace - CSS namespace
     * @param duration - Display duration in milliseconds
     */
    static show(message: string, type: NotificationType = 'info', namespace: string = 'fancy-gst', duration: number = 3000): void {
        // Remove existing notification
        const existing = document.querySelector(`.${namespace}-notification`);
        if (existing) {
            existing.remove();
        }

        // Create notification element
        const notification = CoreDOMUtils.createElement('div', {
            class: `${namespace}-notification ${namespace}-notification-${type}`
        }, {}, message);

        // Add to DOM
        document.body.appendChild(notification);

        // Trigger animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Auto remove
        setTimeout(() => {
            CoreNotificationUtils.remove(notification);
        }, duration);

        // Click to dismiss
        notification.addEventListener('click', () => {
            CoreNotificationUtils.remove(notification);
        });

        Logger.fgtlog('📢 Notification (' + type + '): ' + message);
    }

    /**
     * Remove notification with animation
     * @param notification - Notification element
     */
    static remove(notification: Element): void {
        if (notification && notification.parentNode) {
            notification.classList.remove('show');

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    /**
     * Show success notification
     * @param message - Message
     * @param namespace - CSS namespace
     * @param duration - Duration
     */
    static success(message: string, namespace: string = 'fancy-gst', duration: number = 3000): void {
        CoreNotificationUtils.show(message, 'success', namespace, duration);
    }

    /**
     * Show error notification
     * @param message - Message
     * @param namespace - CSS namespace
     * @param duration - Duration
     */
    static error(message: string, namespace: string = 'fancy-gst', duration: number = 4000): void {
        CoreNotificationUtils.show(message, 'error', namespace, duration);
    }

    /**
     * Show warning notification
     * @param message - Message
     * @param namespace - CSS namespace
     * @param duration - Duration
     */
    static warning(message: string, namespace: string = 'fancy-gst', duration: number = 3500): void {
        CoreNotificationUtils.show(message, 'warning', namespace, duration);
    }

    /**
     * Show info notification
     * @param message - Message
     * @param namespace - CSS namespace
     * @param duration - Duration
     */
    static info(message: string, namespace: string = 'fancy-gst', duration: number = 3000): void {
        CoreNotificationUtils.show(message, 'info', namespace, duration);
    }

    /**
     * Show loading notification
     * @param message - Message
     * @param namespace - CSS namespace
     * @returns Notification element for manual removal
     */
    static loading(message: string, namespace: string = 'fancy-gst'): Element {
        // Remove existing notification
        const existing = document.querySelector(`.${namespace}-notification`);
        if (existing) {
            existing.remove();
        }

        // Create loading notification
        const notification = CoreDOMUtils.createElement('div', {
            class: `${namespace}-notification ${namespace}-notification-loading`
        });

        // Add loading spinner and message
        const spinner = CoreDOMUtils.createElement('div', {
            class: `${namespace}-loading-spinner`
        });
        
        const messageElement = document.createTextNode(message);

        notification.appendChild(spinner);
        notification.appendChild(messageElement);

        // Add to DOM
        document.body.appendChild(notification);

        // Trigger animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        Logger.fgtlog('⏳ Loading notification: ' + message);
        return notification;
    }
}

export { CoreNotificationUtils };

Logger.fgtlog('✅ Core Notification Utils loaded successfully');