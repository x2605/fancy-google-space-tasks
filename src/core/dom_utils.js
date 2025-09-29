// core/dom_utils.js - DOM manipulation utilities with lock styles management
console.log('🔧 Core DOM Utils loading...');

/**
 * Core DOM manipulation utilities for all modules
 */
class CoreDOMUtils {
    // Lock styles management
    static lockStyleElement = null;

    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    static escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    /**
     * Create mouse event for CSP compliance
     * @param {string} type - Event type
     * @param {Object} options - Event options
     * @returns {MouseEvent} - Created event
     */
    static createMouseEvent(type, options = {}) {
        return new MouseEvent(type, {
            view: window,
            bubbles: true,
            cancelable: true,
            ...options
        });
    }

    /**
     * Create and dispatch input event
     * @param {Object} options - Event options
     * @returns {Event} - Created event
     */
    static createInputEvent(options = {}) {
        return new Event('input', {
            bubbles: true,
            ...options
        });
    }

    /**
     * Get computed style value
     * @param {Element} element - Target element
     * @param {string} property - CSS property
     * @returns {string} - Style value
     */
    static getComputedStyle(element, property) {
        return window.getComputedStyle(element).getPropertyValue(property);
    }

    /**
     * Wait for DOM element to appear
     * @param {Element} parentElement - Parent element to search in
     * @param {string} selector - CSS selector
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<Element>} - Found element
     */
    static async waitForElement(parentElement, selector, timeout = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const element = parentElement.querySelector(selector);
            if (element && element.offsetParent !== null) {
                return element;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error(`Element ${selector} not found within timeout`);
    }

    /**
     * Wait for dynamic textarea to appear and manipulate it
     * @param {Element} parentElement - Parent element to search in
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<HTMLTextAreaElement>} - Found textarea
     */
    static async waitForTextarea(parentElement, timeout = 5000) {
        return await CoreDOMUtils.waitForElement(parentElement, 'textarea', timeout);
    }
    
    /**
     * Wait for DOM to be ready with task containers
     * @param {number} maxWait - Maximum wait time in milliseconds (default: 2s)
     * @returns {Promise<void>}
     */
    static waitForDOM(maxWait = 2000) {
        return new Promise((resolve) => {
            // Check immediately first
            const hasTasks = document.querySelector('[role="list"]');
            if (hasTasks) {
                console.log('✅ Task containers already present');
                resolve();
                return;
            }
            
            let timeoutId;
            let observer;
            
            // Setup one-time observer
            observer = new MutationObserver((mutations) => {
                const taskContainer = document.querySelector('[role="list"]');
                if (taskContainer) {
                    console.log('✅ Task containers detected');
                    clearTimeout(timeoutId);
                    observer.disconnect();
                    resolve();
                }
            });
            
            // Start observing
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Timeout fallback (2 seconds)
            timeoutId = setTimeout(() => {
                console.log('⏰ Timeout waiting for task containers (2s), proceeding anyway');
                observer.disconnect();
                resolve();
            }, maxWait);
        });
    }

    /**
     * Create element with attributes and styles
     * @param {string} tagName - HTML tag name
     * @param {Object} attributes - Element attributes
     * @param {Object} styles - CSS styles
     * @param {string} textContent - Text content
     * @returns {Element} - Created element
     */
    static createElement(tagName, attributes = {}, styles = {}, textContent = '') {
        const element = document.createElement(tagName);
        
        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        
        // Set styles
        Object.entries(styles).forEach(([key, value]) => {
            element.style[key] = value;
        });
        
        // Set text content
        if (textContent) {
            element.textContent = textContent;
        }
        
        return element;
    }

    /**
     * Load CSS file with fallback
     * @param {string} cssPath - CSS file path
     * @param {string} fallbackCSS - Fallback CSS content
     * @returns {Promise<boolean>} - Success status
     */
    static loadCSS(cssPath, fallbackCSS = '') {
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = chrome.runtime.getURL(cssPath);
                
                link.onload = () => {
                    console.log(`✅ CSS file loaded: ${cssPath}`);
                    resolve(true);
                };
                
                link.onerror = () => {
                    console.warn(`⚠️ CSS file loading failed: ${cssPath}, using fallback`);
                    if (fallbackCSS) {
                        CoreDOMUtils.injectCSS(fallbackCSS);
                    }
                    resolve(false);
                };
                
                document.head.appendChild(link);
            } else {
                console.warn(`⚠️ Not a Chrome extension environment, using fallback CSS`);
                if (fallbackCSS) {
                    CoreDOMUtils.injectCSS(fallbackCSS);
                }
                resolve(false);
            }
        });
    }

    /**
     * Inject CSS content directly
     * @param {string} cssContent - CSS content
     */
    static injectCSS(cssContent) {
        const style = document.createElement('style');
        style.textContent = cssContent;
        document.head.appendChild(style);
        console.log('✅ Fallback CSS injected');
    }

    // ========== Lock Styles Management ==========

    /**
     * Initialize lock styles element (call once on startup)
     */
    static initLockStyles() {
        if (!this.lockStyleElement) {
            this.lockStyleElement = document.createElement('style');
            this.lockStyleElement.id = 'fancy-gst-lock-styles';
            document.head.appendChild(this.lockStyleElement);
            console.log('🔒 Lock styles element initialized');
        }
    }

    /**
     * Enable lock styles (activate UI lock)
     */
    static enableLockStyles() {
        if (!this.lockStyleElement) {
            this.initLockStyles();
        }

        this.lockStyleElement.textContent = `
/* Lock Styles - Active */

/* Locked state - container level */
.fgt-lockable {
    pointer-events: none;
    opacity: 0.5;
    filter: grayscale(50%) brightness(0.95);
    cursor: not-allowed;
}

.fgt-lockable:hover {
    background-color: inherit;
    transform: none;
    border-color: inherit;
}
        `;

        console.log('🔒 Lock styles enabled');
    }

    /**
     * Disable lock styles (deactivate UI lock)
     */
    static disableLockStyles() {
        if (this.lockStyleElement) {
            this.lockStyleElement.textContent = '';
            console.log('🔓 Lock styles disabled');
        }
    }

    /**
     * Check if lock styles are enabled
     * @returns {boolean} - Lock status
     */
    static isLockStylesEnabled() {
        return this.lockStyleElement && this.lockStyleElement.textContent.length > 0;
    }

    /**
     * Cleanup lock styles (call on extension shutdown)
     */
    static cleanupLockStyles() {
        if (this.lockStyleElement) {
            this.lockStyleElement.remove();
            this.lockStyleElement = null;
            console.log('🧹 Lock styles cleaned up');
        }
    }
}

// Export to global scope
window.CoreDOMUtils = CoreDOMUtils;

console.log('✅ Core DOM Utils loaded successfully with lock styles management');