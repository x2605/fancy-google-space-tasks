// iframe_bridge.js - Enhanced bridge with migrated timer management
console.log('🌉 Enhanced Bridge for Modular Architecture');

class FancyGSTBridge {
    constructor() {
        this.NAMESPACE = 'fancy-gst';
        this.isMonitoring = false;
        this.modulesInjected = false;
        this.observer = null;
        this.initAttempts = 0;
        this.maxInitAttempts = 10;
        this.lastInjectedUrl = null;
        
        // Timer tracking for cleanup
        this.activeTimers = {
            timeouts: [],
            intervals: []
        };
    }

    /**
     * Start monitoring for tasks iframes
     */
    start() {
        if (this.isMonitoring) {
            console.log('🌉 Bridge already monitoring');
            return;
        }

        this.isMonitoring = true;
        this.monitorIframes();
        console.log('🌉 Enhanced Bridge started monitoring');
    }

    /**
     * Stop monitoring
     */
    stop() {
        this.isMonitoring = false;
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        // Cleanup all timers
        this.cleanupTimers();
        
        console.log('🌉 Enhanced Bridge stopped monitoring');
    }

    /**
     * Cleanup all active timers
     */
    cleanupTimers() {
        // Clear all tracked timers using native methods (before CoreEventUtils is available)
        this.activeTimers.timeouts.forEach(id => clearTimeout(id));
        this.activeTimers.intervals.forEach(id => clearInterval(id));
        
        this.activeTimers.timeouts = [];
        this.activeTimers.intervals = [];
        
        console.log('🧹 Bridge timers cleaned up');
    }

    /**
     * Monitor for iframe changes
     */
    monitorIframes() {
        // Initial check
        this.checkAndInjectTasksIframes();

        // Setup mutation observer for dynamic iframe loading
        this.observer = new MutationObserver((mutations) => {
            let shouldCheck = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.tagName === 'IFRAME' || node.querySelector('iframe')) {
                                shouldCheck = true;
                            }
                        }
                    });
                }
            });

            if (shouldCheck) {
                const timerId = setTimeout(() => this.checkAndInjectTasksIframes(), 1000);
                this.activeTimers.timeouts.push(timerId);
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Periodic check for missed iframes
        const intervalId = setInterval(() => {
            if (this.isMonitoring) {
                this.checkAndInjectTasksIframes();
            }
        }, 5000);
        this.activeTimers.intervals.push(intervalId);
    }

    /**
     * Check for tasks iframes and inject scripts
     */
    checkAndInjectTasksIframes() {
        const iframes = document.querySelectorAll('iframe[src*="tasks.google.com"]');
        
        iframes.forEach((iframe) => {
            try {
                if (iframe.src && iframe.src.includes('tasks.google.com/embed')) {
                    this.handleTasksIframe(iframe);
                }
            } catch (error) {
                console.log('🌉 Iframe access error (expected for cross-origin):', error.message);
            }
        });
    }

    /**
     * Handle tasks iframe
     * @param {HTMLIFrameElement} iframe - Tasks iframe element
     */
    handleTasksIframe(iframe) {
        console.log('🎯 Found tasks iframe:', iframe.src);

        // Skip if already processed this URL
        if (this.lastInjectedUrl === iframe.src && this.modulesInjected) {
            return;
        }

        iframe.addEventListener('load', () => {
            const timerId = setTimeout(() => {
                this.attemptInjection(iframe);
            }, 1000);
            this.activeTimers.timeouts.push(timerId);
        });

        // If already loaded, attempt injection
        if (iframe.contentDocument) {
            const timerId = setTimeout(() => {
                this.attemptInjection(iframe);
            }, 1000);
            this.activeTimers.timeouts.push(timerId);
        }
    }

    /**
     * Attempt script injection with retries
     * @param {HTMLIFrameElement} iframe - Tasks iframe element
     */
    attemptInjection(iframe) {
        if (this.initAttempts >= this.maxInitAttempts) {
            console.log('🌉 Max injection attempts reached');
            return;
        }

        this.initAttempts++;
        console.log(`🌉 Injection attempt ${this.initAttempts}/${this.maxInitAttempts}`);

        const success = this.injectModularScripts(iframe);
        if (!success && this.initAttempts < this.maxInitAttempts) {
            const timerId = setTimeout(() => this.attemptInjection(iframe), 2000);
            this.activeTimers.timeouts.push(timerId);
        } else if (success) {
            this.lastInjectedUrl = iframe.src;
            this.initAttempts = 0; // Reset for next iframe
        }
    }

    /**
     * Inject modular scripts in proper dependency order
     * @param {HTMLIFrameElement} iframe - Tasks iframe element
     */
    injectModularScripts(iframe) {
        try {
            const tasksDoc = iframe.contentDocument || iframe.contentWindow.document;
            console.log('🌉 Accessing tasks document:');
            console.log('- URL:', tasksDoc.URL);
            console.log('- readyState:', tasksDoc.readyState);
            console.log('- title:', tasksDoc.title);

            if (!tasksDoc.body) {
                console.log('- body not ready yet, retrying...');
                return false;
            }

            // Check if already injected
            if (tasksDoc.querySelector(`#${this.NAMESPACE}-injected`)) {
                console.log('⚠️ Modular scripts already injected.');
                return true;
            }

            // Add injection marker
            const marker = tasksDoc.createElement('div');
            marker.id = `${this.NAMESPACE}-injected`;
            marker.style.display = 'none';
            tasksDoc.body.appendChild(marker);

            // Inject scripts in dependency order
            this.injectScriptsSequentially(tasksDoc);

            console.log('✅ Modular scripts injection initiated!');
            this.showSuccessNotification(tasksDoc);
            this.modulesInjected = true;
            return true;

        } catch (error) {
            console.log('❌ Tasks iframe script injection error:', error.message);
            return false;
        }
    }

    /**
     * Inject scripts sequentially in proper dependency order
     * @param {Document} tasksDoc - Tasks document
     */
    injectScriptsSequentially(tasksDoc) {
        console.log('🔗 Loading modular scripts in dependency order...');
        
        // Define new modular script sequence with proper dependencies
        const scriptsSequence = [
            // Core utilities (no dependencies) - ENHANCED WITH TIMER MANAGEMENT
            'core/dom_utils.js',
            'core/notification_utils.js',
            'core/event_utils.js',              // NOW includes TimeoutManager & IntervalManager
            'core/interaction_utils.js',
            'core/task_id_utils.js',
            'core/change_detector.js',
            'core/operation_verifier.js',       // Operation verification system
            
            // Category utilities (depends on dom_utils)
            'category/category_parser.js',
            'category/category_utils.js',
            
            // Modal system (depends on core utils)
            'modal/modal_base.js',
            'modal/date_modal.js',
            'modal/delete_modal.js',
            'modal/add_task_modal.js',
            
            // Assignee system (depends on core utils)
            'assignee/assignee_utils.js',
            'assignee/assignee_color_utils.js',
            'assignee/assignee_dropdown.js',
            
            // Table system (depends on category and core utils)
            'table/table_renderer.js',
            'table/table_events.js',
            
            // Container system (depends on all above)
            'container/container_ui.js',
            'container/container_manager.js'
        ];

        let loadIndex = 0;

        const loadNextScript = () => {
            if (loadIndex >= scriptsSequence.length) {
                console.log('🎉 All modular scripts loaded successfully!');
                this.initializeManager(tasksDoc);
                return;
            }

            const scriptPath = scriptsSequence[loadIndex];
            console.log(`📦 Loading: ${scriptPath}`);

            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
                // Chrome extension environment
                const script = tasksDoc.createElement('script');
                script.src = chrome.runtime.getURL(`src/${scriptPath}`);
                script.type = 'text/javascript';
                
                script.onload = () => {
                    console.log(`✅ Loaded: ${scriptPath}`);
                    loadIndex++;
                    // Use native setTimeout here (inside iframe context, before CoreEventUtils is ready)
                    setTimeout(loadNextScript, 50);
                };

                script.onerror = () => {
                    console.error(`❌ Failed to load: ${scriptPath}`);
                    loadIndex++;
                    setTimeout(loadNextScript, 50);
                };

                tasksDoc.head.appendChild(script);
            } else {
                // Fallback for non-extension environment
                console.warn(`⚠️ Cannot load ${scriptPath} in non-extension environment`);
                loadIndex++;
                setTimeout(loadNextScript, 50);
            }
        };

        // Start loading sequence
        loadNextScript();
    }

    /**
     * Initialize the container manager after all scripts are loaded
     * @param {Document} tasksDoc - Tasks document
     */
    initializeManager(tasksDoc) {
        console.log('🚀 Initializing Enhanced Container Manager...');
        
        // Wait a bit for all modules to be ready (using native setTimeout in iframe context)
        setTimeout(() => {
            if (tasksDoc.defaultView.ContainerManager) {
                const manager = new tasksDoc.defaultView.ContainerManager();
                manager.initialize();
                
                // Store manager globally for debugging
                tasksDoc.defaultView.fancyGSTManager = manager;
                window.fancyGSTManager = manager;
                
                console.log('✅ Enhanced Container Manager initialized successfully!');
            } else {
                console.error('❌ ContainerManager not found after script loading');
                this.showErrorNotification(tasksDoc, 'Failed to initialize Enhanced Container Manager');
            }
        }, 500);
    }

    /**
     * Show success notification
     * @param {Document} tasksDoc - Tasks document
     */
    showSuccessNotification(tasksDoc) {
        const notification = tasksDoc.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 10px; right: 10px; 
            background: #4caf50; color: white; 
            padding: 8px 12px; border-radius: 4px; 
            font-size: 12px; z-index: 999999;
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = '✅ Fancy GST Enhanced UI Loaded (with Verification)';
        
        // Add animation styles
        const style = tasksDoc.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        tasksDoc.head.appendChild(style);
        
        tasksDoc.body.appendChild(notification);
        
        // Use native setTimeout in iframe context
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => {
                    notification.parentNode.removeChild(notification);
                }, 300);
            }
        }, 3000);
    }

    /**
     * Show error notification
     * @param {Document} tasksDoc - Tasks document
     * @param {string} message - Error message
     */
    showErrorNotification(tasksDoc, message) {
        const notification = tasksDoc.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 10px; right: 10px; 
            background: #f44336; color: white; 
            padding: 8px 12px; border-radius: 4px; 
            font-size: 12px; z-index: 999999;
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            max-width: 250px; word-wrap: break-word;
        `;
        notification.textContent = `❌ ${message}`;
        
        tasksDoc.body.appendChild(notification);
        
        // Use native setTimeout in iframe context
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    /**
     * Get bridge status
     */
    getStatus() {
        return {
            isMonitoring: this.isMonitoring,
            modulesInjected: this.modulesInjected,
            initAttempts: this.initAttempts,
            lastInjectedUrl: this.lastInjectedUrl,
            activeTimeouts: this.activeTimers.timeouts.length,
            activeIntervals: this.activeTimers.intervals.length
        };
    }
}

// Initialize and start the enhanced bridge
const fancyGSTBridge = new FancyGSTBridge();

// Auto-start when document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => fancyGSTBridge.start(), 1000);
    });
} else {
    setTimeout(() => fancyGSTBridge.start(), 1000);
}

// Global access for debugging
window.fancyGSTBridge = fancyGSTBridge;

console.log('🌉 Enhanced Bridge ready for modular architecture with timer management!');