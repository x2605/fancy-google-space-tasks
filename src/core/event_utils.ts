// core/event_utils.ts - Event handling utilities with timer management
import * as Logger from '@/core/logger';

Logger.fgtlog('⚡ Core Event Utils loading...');

/**
 * Timeout manager for controlled cleanup
 */
class TimeoutManager {
    timeouts: Map<number, any>;
    nextId: number;

    constructor() {
        this.timeouts = new Map();
        this.nextId = 1;
    }

    /**
     * Create a managed timeout
     * @param callback - Callback function
     * @param delay - Delay in milliseconds
     * @returns Timeout ID
     */
    create(callback: Function, delay: number) {
        const id = this.nextId++;
        const timeoutId = setTimeout(() => {
            callback();
            this.timeouts.delete(id);
        }, delay);

        this.timeouts.set(id, {
            timeoutId,
            delay,
            created: Date.now()
        });

        return id;
    }

    /**
     * Clear a specific timeout
     * @param id - Timeout ID
     */
    clear(id: number) {
        const timeout = this.timeouts.get(id);
        if (timeout) {
            clearTimeout(timeout.timeoutId);
            this.timeouts.delete(id);
        }
    }

    /**
     * Clear all timeouts
     */
    clearAll() {
        this.timeouts.forEach(timeout => {
            clearTimeout(timeout.timeoutId);
        });
        this.timeouts.clear();
        Logger.fgtlog('🧹 All timeouts cleared');
    }

    /**
     * Check if timeout exists
     * @param id - Timeout ID
     * @returns Whether timeout exists
     */
    exists(id: number) {
        return this.timeouts.has(id);
    }

    /**
     * Get timeout info
     * @param id - Timeout ID
     * @returns Timeout info
     */
    getInfo(id: number) {
        return this.timeouts.get(id) || null;
    }

    /**
     * Get all active timeouts count
     * @returns Active count
     */
    getActiveCount() {
        return this.timeouts.size;
    }

    /**
     * Get debug information
     * @returns Debug info
     */
    getDebugInfo() {
        const info = {
            activeCount: this.timeouts.size,
            timeouts: [] as any[]
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
 * Interval manager for controlled cleanup
 */
class IntervalManager {
    intervals: Map<number, any>;
    nextId: number;

    constructor() {
        this.intervals = new Map();
        this.nextId = 1;
    }

    /**
     * Create a managed interval
     * @param callback - Callback function
     * @param delay - Delay in milliseconds
     * @param maxExecutions - Maximum executions (optional)
     * @returns Interval ID
     */
    create(callback: Function, delay: number, maxExecutions: number | null = null) {
        const id = this.nextId++;
        let execCount = 0;

        const intervalId = setInterval(() => {
            execCount++;
            callback();

            if (maxExecutions !== null && execCount >= maxExecutions) {
                this.clear(id);
            }
        }, delay);

        this.intervals.set(id, {
            intervalId,
            delay,
            created: Date.now(),
            execCount: 0,
            maxExecutions
        });

        return id;
    }

    /**
     * Clear a specific interval
     * @param id - Interval ID
     */
    clear(id: number) {
        const interval = this.intervals.get(id);
        if (interval) {
            clearInterval(interval.intervalId);
            this.intervals.delete(id);
        }
    }

    /**
     * Clear all intervals
     */
    clearAll() {
        this.intervals.forEach(interval => {
            clearInterval(interval.intervalId);
        });
        this.intervals.clear();
        Logger.fgtlog('🧹 All intervals cleared');
    }

    /**
     * Check if interval exists
     * @param id - Interval ID
     * @returns Whether interval exists
     */
    exists(id: number) {
        return this.intervals.has(id);
    }

    /**
     * Get interval info
     * @param id - Interval ID
     * @returns Interval info
     */
    getInfo(id: number) {
        return this.intervals.get(id) || null;
    }

    /**
     * Get all active intervals count
     * @returns Active count
     */
    getActiveCount() {
        return this.intervals.size;
    }

    /**
     * Get debug information
     * @returns Debug info
     */
    getDebugInfo() {
        const info = {
            activeCount: this.intervals.size,
            intervals: [] as any[]
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
     * @param element - Target element
     * @param event - Event type
     * @param handler - Event handler
     * @param options - Event options
     * @returns Cleanup function
     */
    static addListener(element: EventTarget, event: string, handler: Function, options: any = {}) {
        if (!element || !event || !handler) {
            Logger.fgtwarn('Invalid parameters for addListener');
            return () => { };
        }

        element.addEventListener(event, handler as EventListener, options);

        // Return cleanup function
        return () => {
            element.removeEventListener(event, handler as EventListener, options);
        };
    }

    /**
     * Attach multiple event listeners
     * @param element - Target element
     * @param events - Event map {eventType: handler}
     * @param options - Event options
     * @returns Cleanup function for all events
     */
    static addListeners(element: EventTarget, events: any, options: any = {}) {
        const cleanupFunctions: Function[] = [];

        Object.entries(events).forEach(([eventType, handler]) => {
            const cleanup = CoreEventUtils.addListener(element, eventType, handler as Function, options);
            cleanupFunctions.push(cleanup);
        });

        // Return cleanup function for all events
        return () => {
            cleanupFunctions.forEach(cleanup => cleanup());
        };
    }

    /**
     * Create event handler with automatic binding
     * @param context - Context object for 'this' binding
     * @param handler - Handler function
     * @returns Bound handler
     */
    static bindHandler(context: any, handler: Function) {
        return handler.bind(context);
    }

    /**
     * Debounce event handler
     * @param handler - Event handler
     * @param delay - Delay in milliseconds
     * @returns Debounced handler
     */
    static debounce(handler: Function, delay: number = 300) {
        let timeoutId: number;

        return function (this: any, ...args: any[]) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => handler.apply(this, args), delay);
        };
    }

    /**
     * Throttle event handler
     * @param handler - Event handler
     * @param delay - Delay in milliseconds
     * @returns Throttled handler
     */
    static throttle(handler: Function, delay: number = 100) {
        let lastCall = 0;

        return function (this: any, ...args: any[]) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                handler.apply(this, args);
            }
        };
    }

    /**
     * Handle form submission with validation
     * @param form - Form element
     * @param onSubmit - Submit handler
     * @param validate - Validation function
     * @returns Cleanup function
     */
    static handleFormSubmit(form: HTMLFormElement, onSubmit: Function, validate: Function | null = null) {
        const handler = (event: Event) => {
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
     * @param textarea - Textarea element
     * @param onInput - Input handler
     * @returns Cleanup function
     */
    static handleAutoResizeInput(textarea: HTMLTextAreaElement, onInput: Function | null = null) {
        const resizeHandler = () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        };

        const inputHandler = (event: Event) => {
            resizeHandler();
            if (onInput) {
                onInput(event);
            }
        };

        // Initial resize
        CoreEventUtils.timeouts.create(resizeHandler, 0);

        const cleanupInput = CoreEventUtils.addListener(textarea, 'input', inputHandler);
        const cleanupResize = CoreEventUtils.addListener(window as any, 'resize', CoreEventUtils.debounce(resizeHandler, 100));

        return () => {
            cleanupInput();
            cleanupResize();
        };
    }

    /**
     * Handle click outside element
     * @param element - Target element
     * @param handler - Handler function
     * @returns Cleanup function
     */
    static handleClickOutside(element: Element, handler: Function) {
        const clickHandler = (event: Event) => {
            if (!element.contains((event as MouseEvent).target as Node)) {
                handler(event);
            }
        };

        return CoreEventUtils.addListener(document, 'click', clickHandler);
    }

    /**
     * Handle modal events (close, backdrop click, escape)
     * @param modal - Modal element
     * @param onClose - Close handler
     * @param closeOnBackdrop - Close on backdrop click
     * @param closeOnEscape - Close on escape key
     * @returns Cleanup function
     */
    static handleModalEvents(modal: Element, onClose: Function, closeOnBackdrop: boolean = true, closeOnEscape: boolean = true) {
        const cleanupFunctions: Function[] = [];

        // Close button click
        const closeButtons = modal.querySelectorAll('[data-action="close"], .modal-close, .close');
        closeButtons.forEach(button => {
            const cleanup = CoreEventUtils.addListener(button, 'click', (event: Event) => {
                event.preventDefault();
                onClose();
            });
            cleanupFunctions.push(cleanup);
        });

        // Backdrop click
        if (closeOnBackdrop) {
            const cleanup = CoreEventUtils.addListener(modal, 'click', (event: Event) => {
                if ((event as any).target === modal) {
                    onClose();
                }
            });
            cleanupFunctions.push(cleanup);
        }

        // Escape key
        if (closeOnEscape) {
            const cleanup = CoreEventUtils.addListener(document, 'keydown', (event: Event) => {
                if ((event as KeyboardEvent).key === 'Escape') {
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
     * @param container - Container element
     * @param selector - Selector for target elements
     * @param event - Event type
     * @param handler - Event handler
     * @returns Cleanup function
     */
    static delegate(container: Element, selector: string, event: string, handler: Function) {
        const delegationHandler = (originalEvent: Event) => {
            const target = (originalEvent.target as Element).closest(selector);
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
     * @param element - Target element
     * @param event - Event type
     * @param timeout - Timeout in milliseconds
     * @returns Promise that resolves with event
     */
    static waitForEvent(element: Element, event: string, timeout: number = 5000) {
        return new Promise((resolve, reject) => {
            let cleanup: Function;
            let timeoutId: number;

            const handler = (event: Event) => {
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
        Logger.fgtlog('🧹 CoreEventUtils: All resources cleaned up');
    }

    /**
     * Get debug information for all managers
     * @returns Combined debug info
     */
    static getDebugInfo() {
        return {
            timeouts: CoreEventUtils.timeouts.getDebugInfo(),
            intervals: CoreEventUtils.intervals.getDebugInfo()
        };
    }
}

export { CoreEventUtils, TimeoutManager, IntervalManager };

Logger.fgtlog('✅ Core Event Utils loaded successfully with timer management');