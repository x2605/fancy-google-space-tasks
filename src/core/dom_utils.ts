// core/dom_utils.ts - DOM manipulation utilities with lock and depth styles management
import * as Logger from '@/core/logger';

Logger.fgtlog('🔧 Core DOM Utils loading...');

/**
 * Core DOM manipulation utilities for all modules
 */
class CoreDOMUtils {
    // Lock styles management
    static lockStyleElement: HTMLStyleElement | null = null;

    // Depth styles management
    static depthStyleElement: HTMLStyleElement | null = null;

    /**
     * Escape HTML special characters
     * @param text - Text to escape
     * @returns Escaped text
     */
    static escapeHtml(text: string): string {
        if (typeof text !== 'string') return '';
        const map: Record<string, string> = {
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
     * @param type - Event type
     * @param options - Event options
     * @returns Created event
     */
    static createMouseEvent(type: string, options: MouseEventInit = {}): MouseEvent {
        return new MouseEvent(type, {
            view: window,
            bubbles: true,
            cancelable: true,
            ...options
        });
    }

    /**
     * Create and dispatch input event
     * @param options - Event options
     * @returns Created event
     */
    static createInputEvent(options: EventInit = {}): Event {
        return new Event('input', {
            bubbles: true,
            ...options
        });
    }

    /**
     * Get computed style value
     * @param element - Target element
     * @param property - CSS property
     * @returns Style value
     */
    static getComputedStyle(element: Element, property: string): string {
        return window.getComputedStyle(element).getPropertyValue(property);
    }

    /**
     * Wait for DOM element to appear
     * @param parentElement - Parent element to search in
     * @param selector - CSS selector
     * @param timeout - Timeout in milliseconds
     * @returns Found element
     */
    static async waitForElement(parentElement: Element, selector: string, timeout: number = 5000): Promise<Element> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const element = parentElement.querySelector(selector) as HTMLElement;
            if (element && element.offsetParent !== null) {
                return element;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        throw new Error(`Element ${selector} not found within timeout`);
    }

    /**
     * Wait for dynamic textarea to appear and manipulate it
     * @param parentElement - Parent element to search in
     * @param timeout - Timeout in milliseconds
     * @returns Found textarea
     */
    static async waitForTextarea(parentElement: Element, timeout: number = 5000): Promise<HTMLTextAreaElement> {
        return await CoreDOMUtils.waitForElement(parentElement, 'textarea', timeout) as HTMLTextAreaElement;
    }

    /**
     * Wait for DOM to be ready with task containers
     * @param maxWait - Maximum wait time in milliseconds (default: 2s)
     * @returns Promise that resolves when ready
     */
    static waitForDOM(maxWait: number = 2000): Promise<void> {
        return new Promise((resolve) => {
            // Check immediately first
            const hasTasks = document.querySelector('[role="list"]');
            if (hasTasks) {
                Logger.fgtlog('✅ Task containers already present');
                resolve();
                return;
            }

            let timeoutId: number;
            let observer: MutationObserver;

            // Setup one-time observer
            observer = new MutationObserver((_mutations) => {
                const taskContainer = document.querySelector('[role="list"]');
                if (taskContainer) {
                    Logger.fgtlog('✅ Task containers detected');
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
                Logger.fgtlog('⏰ Timeout waiting for task containers (2s), proceeding anyway');
                observer.disconnect();
                resolve();
            }, maxWait);
        });
    }

    /**
     * Create element with attributes and styles
     * @param tagName - HTML tag name
     * @param attributes - Element attributes
     * @param styles - CSS styles
     * @param textContent - Text content
     * @returns Created element
     */
    static createElement(
        tagName: string,
        attributes: Record<string, string> = {},
        styles: Record<string, string> = {},
        textContent: string = ''
    ): HTMLElement {
        const element = document.createElement(tagName);

        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });

        // Set styles
        Object.entries(styles).forEach(([key, value]) => {
            (element.style as any)[key] = value;
        });

        // Set text content
        if (textContent) {
            element.textContent = textContent;
        }

        return element;
    }

    /**
     * Load CSS file with fallback
     * @param cssPath - CSS file path
     * @param fallbackCSS - Fallback CSS content
     * @returns Success status
     */
    static loadCSS(cssPath: string, fallbackCSS: string = ''): Promise<boolean> {
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = chrome.runtime.getURL(cssPath);

                link.onload = () => {
                    Logger.fgtlog(`✅ CSS file loaded: ${cssPath}`);
                    resolve(true);
                };

                link.onerror = () => {
                    Logger.fgtwarn(`⚠️ CSS file loading failed: ${cssPath}, using fallback`);
                    if (fallbackCSS) {
                        CoreDOMUtils.injectCSS(fallbackCSS);
                    }
                    resolve(false);
                };

                document.head.appendChild(link);
            } else {
                Logger.fgtwarn(`⚠️ Not a Chrome extension environment, using fallback CSS`);
                if (fallbackCSS) {
                    CoreDOMUtils.injectCSS(fallbackCSS);
                }
                resolve(false);
            }
        });
    }

    /**
     * Inject CSS content directly
     * @param cssContent - CSS content
     */
    static injectCSS(cssContent: string): void {
        const style = document.createElement('style');
        style.textContent = cssContent;
        document.head.appendChild(style);
        Logger.fgtlog('✅ Fallback CSS injected');
    }

    // ========== Lock Styles Management ==========

    /**
     * Initialize lock styles element (call once on startup)
     */
    static initLockStyles(): void {
        if (!this.lockStyleElement) {
            this.lockStyleElement = document.createElement('style');
            this.lockStyleElement.id = 'fancy-gst-lock-styles';
            document.head.appendChild(this.lockStyleElement);
            Logger.fgtlog('🔒 Lock styles element initialized');
        }
    }

    /**
     * Enable lock styles (activate UI lock)
     */
    static enableLockStyles(): void {
        if (!this.lockStyleElement) {
            this.initLockStyles();
        }

        this.lockStyleElement!.textContent = `
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

        Logger.fgtlog('🔒 Lock styles enabled');
    }

    /**
     * Disable lock styles (deactivate UI lock)
     */
    static disableLockStyles(): void {
        if (this.lockStyleElement) {
            this.lockStyleElement.textContent = '';
            Logger.fgtlog('🔓 Lock styles disabled');
        }
    }

    /**
     * Check if lock styles are enabled
     * @returns Lock status
     */
    static isLockStylesEnabled(): boolean {
        return this.lockStyleElement !== null && this.lockStyleElement.textContent.length > 0;
    }

    /**
     * Cleanup lock styles (call on extension shutdown)
     */
    static cleanupLockStyles(): void {
        if (this.lockStyleElement) {
            this.lockStyleElement.remove();
            this.lockStyleElement = null;
            Logger.fgtlog('🧹 Lock styles cleaned up');
        }
    }

    // ========== Depth Styles Management ==========

    /**
     * Initialize depth styles element (call once on startup)
     */
    static initDepthStyles(): void {
        if (!this.depthStyleElement) {
            this.depthStyleElement = document.createElement('style');
            this.depthStyleElement.id = 'fancy-gst-depth-styles';
            document.head.appendChild(this.depthStyleElement);
            Logger.fgtlog('📏 Depth styles element initialized');
        }
    }

    /**
     * Hide depths above the specified maximum visible depth
     * @param maxVisibleDepth - Maximum visible depth (0-based)
     */
    static hideDepthsAbove(maxVisibleDepth: number): void {
        if (!this.depthStyleElement) {
            this.initDepthStyles();
        }

        // Hide depths greater than maxVisibleDepth (0-based)
        let css = '/* Hide unnecessary depth columns */\n';

        // Support up to depth 20 (should be more than enough)
        for (let i = maxVisibleDepth + 1; i <= 20; i++) {
            css += `.fgt-depth-${i} { display: none !important; }\n`;
        }

        this.depthStyleElement!.textContent = css;
        Logger.fgtlog(`📏 Hiding depths above ${maxVisibleDepth}`);
    }

    /**
     * Show all depths (remove depth hiding)
     */
    static showAllDepths(): void {
        if (this.depthStyleElement) {
            this.depthStyleElement.textContent = '';
            Logger.fgtlog('📏 Showing all depths');
        }
    }

    /**
     * Cleanup depth styles (call on extension shutdown)
     */
    static cleanupDepthStyles(): void {
        if (this.depthStyleElement) {
            this.depthStyleElement.remove();
            this.depthStyleElement = null;
            Logger.fgtlog('🧹 Depth styles cleaned up');
        }
    }
}

export { CoreDOMUtils };

Logger.fgtlog('✅ Core DOM Utils loaded successfully with lock and depth styles management');