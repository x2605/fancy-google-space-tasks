// core/event_utils.js - Event handling utilities with integrated timer management
console.log('⚡ Core Event Utils loading...');

/**
 * Timeout manager for centralized timeout control
 */
class TimeoutManager {
    constructor() {
        this.timeouts = new Map(); // id -> {timeoutId, callback, delay, created}
        this.nextId = 1;
    }

    /**
     * Create managed timeout
     * @param {Function} callback - Callback function
     * @param {number} delay - Delay in milliseconds
     * @param {boolean} autoCleanup - Auto cleanup after execution
     * @returns {number} - Timeout ID for later reference
     */
    create(callback, delay = 0, autoCleanup = true) {
        const id = this.nextId++;
        
        const timeoutId = setTimeout(() => {
            try {
                callback();
            } catch (error) {
                console.error('Timeout callback error:', error);
            } finally {
                if (autoCleanup) {
                    this.timeouts.delete(id);
                }
            }
        }, delay);

        this.timeouts.set(id, {
            timeoutId,
            callback,
            delay,
            created: Date.now()
        });

        return id;
    }

    /**
     * Clear specific timeout
     * @param {number} id - Timeout ID
     * @returns {boolean} - Success status
     */
    clear(id) {
        const timeout = this.timeouts.get(id);
        if (timeout) {
            clearTimeout(timeout.timeoutId);
            this.timeouts.delete(id);
            return true;
        }
        return false;
    }

    /**
     * Clear all timeouts
     */
    clearAll() {
        this.timeouts.forEach(timeout => {
            clearTimeout(timeout.timeoutId);
        });
        this.timeouts.clear();
        console.log('🧹 All timeouts cleared');
    }

    /**
     * Check if timeout exists
     * @param {number} id - Timeout ID
     * @returns {boolean}
     */
    exists(id) {
        return this.timeouts.has(id);
    }

    /**
     * Get timeout info
     * @param {number} id - Timeout ID
     * @returns {Object|null} - Timeout info
     */
    getInfo(id) {
        return this.timeouts.get(id) || null;
    }

    /**
     * Get all active timeouts count
     * @returns {number}
     */
    getActiveCount() {
        return this.timeouts.size;
    }

    /**
     * Get debug information
     * @returns {Object} - Debug info
     */
    getDebugInfo() {
        const info = {
            activeCount: this.timeouts.size,
            timeouts: []
        };

        this.timeouts.forEach((timeout, id) => {
            info.timeouts.push({
                id,
                delay: timeout.delay,
                elapsed: Date.now() - timeout.created
            });
        });

        return info;
    }
}

/**
 * Interval manager for centralized interval control
 */
class IntervalManager {
    constructor() {
        this.intervals = new Map(); // id -> {intervalId, callback, delay, created, execCount}
        this.nextId = 1;
    }

    /**
     * Create managed interval
     * @param {Function} callback - Callback function
     * @param {number} delay - Delay in milliseconds
     * @param {number} maxExecutions - Maximum executions (0 = infinite)
     * @returns {number} - Interval ID for later reference
     */
    create(callback, delay = 1000, maxExecutions = 0) {
        const id = this.nextId++;
        let execCount = 0;

        const intervalId = setInterval(() => {
            try {
                execCount++;
                callback(execCount);
                
                // Auto-clear if max executions reached
                if (maxExecutions > 0 && execCount >= maxExecutions) {
                    this.clear(id);
                }
            } catch (error) {
                console.error('Interval callback error:', error);
            }
        }, delay);

        this.intervals.set(id, {
            intervalId,
            callback,
            delay,
            created: Date.now(),
            execCount: 0,
            maxExecutions
        });

        return id;
    }

    /**
     * Clear specific interval
     * @param {number} id - Interval ID
     * @returns {boolean} - Success status
     */
    clear(id) {
        const interval = this.intervals.get(id);
        if (interval) {
            clearInterval(interval.intervalId);
            this.intervals.delete(id);
            return true;
        }
        return false;
    }

    /**
     * Clear all intervals
     */
    clearAll() {
        this.intervals.forEach(interval => {
            clearInterval(interval.intervalId);
        });
        this.intervals.clear();
        console.log('🧹 All intervals cleared');
    }

    /**
     * Check if interval exists
     * @param {number} id - Interval ID
     * @returns {boolean}
     */
    exists(id) {
        return this.intervals.has(id);
    }

    /**
     * Get interval info
     * @param {number} id - Interval ID
     * @returns {Object|null} - Interval info
     */
    getInfo(id) {
        return this.intervals.get(id) || null;
    }

    /**
     * Get all active intervals count
     * @returns {number}
     */
    getActiveCount() {
        return this.intervals.size;
    }

    /**
     * Get debug information
     * @returns {Object} - Debug info
     */
    getDebugInfo() {
        const info = {
            activeCount: this.intervals.size,
            intervals: []
        };

        this.intervals.forEach((interval, id) => {
            info.intervals.push({
                id,
                delay: interval.delay,
                execCount: interval.execCount,
                maxExecutions: interval.maxExecutions,
                elapsed: Date.now() - interval.created
            });
        });

        return info;
    }
}

/**
 * Core event handling utilities for all modules
 */
class CoreEventUtils {
    // Initialize timer managers as static properties
    static timeouts = new TimeoutManager();
    static intervals = new IntervalManager();

    /**
     * Attach event listener with automatic cleanup
     * @param {Element} element - Target element
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options
     * @returns {Function} - Cleanup function
     */
    static addListener(element, event, handler, options = {}) {
        if (!element || !event || !handler) {
            console.warn('Invalid parameters for addListener');
            return () => {};
        }

        element.addEventListener(event, handler, options);
        
        // Return cleanup function
        return () => {
            element.removeEventListener(event, handler, options);
        };
    }

    /**
     * Attach multiple event listeners
     * @param {Element} element - Target element
     * @param {Object} events - Event map {eventType: handler}
     * @param {Object} options - Event options
     * @returns {Function} - Cleanup function for all events
     */
    static addListeners(element, events, options = {}) {
        const cleanupFunctions = [];

        Object.entries(events).forEach(([eventType, handler]) => {
            const cleanup = CoreEventUtils.addListener(element, eventType, handler, options);
            cleanupFunctions.push(cleanup);
        });

        // Return cleanup function for all events
        return () => {
            cleanupFunctions.forEach(cleanup => cleanup());
        };
    }

    /**
     * Create event handler with automatic binding
     * @param {Object} context - Context object for 'this' binding
     * @param {Function} handler - Handler function
     * @returns {Function} - Bound handler
     */
    static bindHandler(context, handler) {
        return handler.bind(context);
    }

    /**
     * Debounce event handler
     * @param {Function} handler - Event handler
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} - Debounced handler
     */
    static debounce(handler, delay = 300) {
        let timeoutId;
        
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => handler.apply(this, args), delay);
        };
    }

    /**
     * Throttle event handler
     * @param {Function} handler - Event handler
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} - Throttled handler
     */
    static throttle(handler, delay = 100) {
        let lastCall = 0;
        
        return function (...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                handler.apply(this, args);
            }
        };
    }

    /**
     * Handle form submission with validation
     * @param {HTMLFormElement} form - Form element
     * @param {Function} onSubmit - Submit handler
     * @param {Function} validate - Validation function
     * @returns {Function} - Cleanup function
     */
    static handleFormSubmit(form, onSubmit, validate = null) {
        const handler = (event) => {
            event.preventDefault();
            
            // Run validation if provided
            if (validate && !validate(form)) {
                return;
            }
            
            // Extract form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // Call submit handler
            onSubmit(data, form);
        };

        return CoreEventUtils.addListener(form, 'submit', handler);
    }

    /**
     * Handle input with auto-resize
     * @param {HTMLTextAreaElement} textarea - Textarea element
     * @param {Function} onInput - Input handler
     * @returns {Function} - Cleanup function
     */
    static handleAutoResizeInput(textarea, onInput = null) {
        const resizeHandler = () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        };

        const inputHandler = (event) => {
            resizeHandler();
            if (onInput) {
                onInput(event);
            }
        };

        // Initial resize
        CoreEventUtils.timeouts.create(resizeHandler, 0);

        const cleanupInput = CoreEventUtils.addListener(textarea, 'input', inputHandler);
        const cleanupResize = CoreEventUtils.addListener(window, 'resize', CoreEventUtils.debounce(resizeHandler, 100));

        return () => {
            cleanupInput();
            cleanupResize();
        };
    }

    /**
     * Handle click outside element
     * @param {Element} element - Target element
     * @param {Function} handler - Handler function
     * @returns {Function} - Cleanup function
     */
    static handleClickOutside(element, handler) {
        const clickHandler = (event) => {
            if (!element.contains(event.target)) {
                handler(event);
            }
        };

        return CoreEventUtils.addListener(document, 'click', clickHandler);
    }

    /**
     * Handle modal events (close, backdrop click, escape)
     * @param {Element} modal - Modal element
     * @param {Function} onClose - Close handler
     * @param {boolean} closeOnBackdrop - Close on backdrop click
     * @param {boolean} closeOnEscape - Close on escape key
     * @returns {Function} - Cleanup function
     */
    static handleModalEvents(modal, onClose, closeOnBackdrop = true, closeOnEscape = true) {
        const cleanupFunctions = [];

        // Close button click
        const closeButtons = modal.querySelectorAll('[data-action="close"], .modal-close, .close');
        closeButtons.forEach(button => {
            const cleanup = CoreEventUtils.addListener(button, 'click', (event) => {
                event.preventDefault();
                onClose();
            });
            cleanupFunctions.push(cleanup);
        });

        // Backdrop click
        if (closeOnBackdrop) {
            const cleanup = CoreEventUtils.addListener(modal, 'click', (event) => {
                if (event.target === modal) {
                    onClose();
                }
            });
            cleanupFunctions.push(cleanup);
        }

        // Escape key
        if (closeOnEscape) {
            const cleanup = CoreEventUtils.addListener(document, 'keydown', (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    onClose();
                }
            });
            cleanupFunctions.push(cleanup);
        }

        // Return combined cleanup function
        return () => {
            cleanupFunctions.forEach(cleanup => cleanup());
        };
    }

    /**
     * Create delegation handler for dynamic elements
     * @param {Element} container - Container element
     * @param {string} selector - Selector for target elements
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     * @returns {Function} - Cleanup function
     */
    static delegate(container, selector, event, handler) {
        const delegationHandler = (originalEvent) => {
            const target = originalEvent.target.closest(selector);
            if (target && container.contains(target)) {
                // Create a custom event object with additional properties
                const customEvent = {
                    ...originalEvent,
                    currentTarget: target,
                    delegateTarget: container,
                    target: originalEvent.target,
                    type: originalEvent.type,
                    preventDefault: () => originalEvent.preventDefault(),
                    stopPropagation: () => originalEvent.stopPropagation(),
                    stopImmediatePropagation: () => originalEvent.stopImmediatePropagation()
                };
                
                // Call handler with custom event
                handler.call(target, customEvent);
            }
        };

        return CoreEventUtils.addListener(container, event, delegationHandler);
    }

    /**
     * Wait for event to occur
     * @param {Element} element - Target element
     * @param {string} event - Event type
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<Event>} - Promise that resolves with event
     */
    static waitForEvent(element, event, timeout = 5000) {
        return new Promise((resolve, reject) => {
            let cleanup;
            let timeoutId;

            const handler = (event) => {
                cleanup();
                CoreEventUtils.timeouts.clear(timeoutId);
                resolve(event);
            };

            cleanup = CoreEventUtils.addListener(element, event, handler);
            
            timeoutId = CoreEventUtils.timeouts.create(() => {
                cleanup();
                reject(new Error(`Event ${event} timeout after ${timeout}ms`));
            }, timeout);
        });
    }

    /**
     * Cleanup all managed resources
     */
    static cleanupAll() {
        CoreEventUtils.timeouts.clearAll();
        CoreEventUtils.intervals.clearAll();
        console.log('🧹 CoreEventUtils: All resources cleaned up');
    }

    /**
     * Get debug information for all managers
     * @returns {Object} - Combined debug info
     */
    static getDebugInfo() {
        return {
            timeouts: CoreEventUtils.timeouts.getDebugInfo(),
            intervals: CoreEventUtils.intervals.getDebugInfo()
        };
    }
}

// Export to global scope
window.CoreEventUtils = CoreEventUtils;
window.TimeoutManager = TimeoutManager;
window.IntervalManager = IntervalManager;

console.log('✅ Core Event Utils loaded successfully with timer management');