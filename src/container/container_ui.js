// container/container_ui.js - Container UI creation and management with toggle visibility
console.log('🎨 Container UI loading...');

/**
 * Container UI management for everything outside the table block
 */
class ContainerUI {
    constructor(namespace = 'fancy-gst') {
        this.namespace = namespace;
        this.CONTAINER_ID = `${namespace}-container`;
        this.customContainer = null;
        this.toggleIndicator = null;
        this.completedToggleIndicator = null;
    }

    /**
     * Create the main container structure
     */
    async createContainer() {
        // Load CSS first
        await this.loadStyles();
        
        // Create main container
        this.customContainer = CoreDOMUtils.createElement('div', {
            id: this.CONTAINER_ID
        });
        
        // Add container content
        this.customContainer.innerHTML = this.generateContainerHTML();
        
        // Add to document
        document.body.appendChild(this.customContainer);
        
        console.log('📦 Main container created');
        return this.customContainer;
    }

    /**
     * Generate complete container HTML structure
     * @returns {string} - Container HTML
     */
    generateContainerHTML() {
        return `
            ${this.generateTableContainerHTML()}
            ${this.generateFooterHTML()}
        `;
    }

    /**
     * Generate table container HTML
     * @returns {string} - Table container HTML
     */
    generateTableContainerHTML() {
        return `
            <div class="${this.namespace}-table-container">
                <!-- Table will be populated by TableRenderer -->
                <div class="${this.namespace}-loading-table">
                    <div class="${this.namespace}-loading-content">
                        <span class="${this.namespace}-loading-spinner"></span>
                        <div class="${this.namespace}-loading-text">Loading tasks...</div>
                        <div class="${this.namespace}-loading-subtitle">Extracting data from Google Tasks</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate footer HTML
     * @returns {string} - Footer HTML
     */
    generateFooterHTML() {
        return `
            <div class="${this.namespace}-footer">
                <div class="${this.namespace}-footer-left">
                    <span class="${this.namespace}-status">Fancy Google Space Tasks</span>
                    <span class="${this.namespace}-separator">•</span>
                    <span class="${this.namespace}-version">v0.1.1</span>
                    <span class="${this.namespace}-separator">•</span>
                    <span class="${this.namespace}-github"><a target="_blank" href="https://github.com/x2605/fancy-google-space-tasks">github</a></span>
                </div>
                <div class="${this.namespace}-footer-right">
                </div>
            </div>
        `;
    }

    /**
     * Create floating toggle buttons (bottom-right)
     */
    createToggleButtons() {
        // Create completed tasks toggle button (left one)
        this.completedToggleIndicator = CoreDOMUtils.createElement('div', {
            id: `${this.namespace}-completed-toggle-button`,
            className: 'fgt-completed-hidden fgt-lockable', // Default: hidden
            title: 'Show completed tasks'
        }, {}, 'show');

        // Create main toggle button (right one)
        this.toggleIndicator = CoreDOMUtils.createElement('div', {
            id: `${this.namespace}-toggle-button`,
            className: 'fgt-lockable fgt-enhanced',
            title: 'Switch to Original UI'
        }, {}, '⇄');

        // Add both buttons to document
        document.body.appendChild(this.completedToggleIndicator);
        document.body.appendChild(this.toggleIndicator);
        
        console.log('🎯 Floating toggle buttons created');
    }

    /**
     * Create floating toggle button (backward compatibility)
     */
    createToggleButton() {
        this.createToggleButtons();
    }

    /**
     * Update toggle button appearance based on current mode
     * @param {boolean} isEnhancedMode - Whether enhanced mode is active
     */
    updateToggleButton(isEnhancedMode) {
        if (!this.toggleIndicator) return;

        if (isEnhancedMode) {
            // Enhanced mode - show original mode button
            this.toggleIndicator.className = 'fgt-original fgt-lockable';
            this.toggleIndicator.title = 'Switch to Original UI';
        } else {
            // Original mode - show enhanced mode button  
            this.toggleIndicator.className = 'fgt-enhanced fgt-lockable';
            this.toggleIndicator.title = 'Switch to Enhanced UI';
        }
    }

    /**
     * Update completed toggle button appearance
     * @param {boolean} showCompleted - Whether completed tasks are shown
     */
    updateCompletedToggleButton(showCompleted) {
        if (!this.completedToggleIndicator) return;

        if (showCompleted) {
            // Completed tasks visible - show hide button
            this.completedToggleIndicator.className = 'fgt-completed-visible fgt-lockable';
            this.completedToggleIndicator.title = 'Hide completed tasks';
            this.completedToggleIndicator.textContent = 'hide';
        } else {
            // Completed tasks hidden - show show button
            this.completedToggleIndicator.className = 'fgt-completed-hidden fgt-lockable';
            this.completedToggleIndicator.title = 'Show completed tasks';
            this.completedToggleIndicator.textContent = 'show';
        }
    }

    /**
     * Show main toggle button
     */
    showToggleButton() {
        if (this.toggleIndicator) {
            this.toggleIndicator.style.display = 'flex';
        }
    }

    /**
     * Hide main toggle button
     */
    hideToggleButton() {
        if (this.toggleIndicator) {
            this.toggleIndicator.style.display = 'none';
        }
    }

    /**
     * Show completed toggle button
     */
    showCompletedToggleButton() {
        if (this.completedToggleIndicator) {
            this.completedToggleIndicator.style.display = 'flex';
        }
    }

    /**
     * Hide completed toggle button
     */
    hideCompletedToggleButton() {
        if (this.completedToggleIndicator) {
            this.completedToggleIndicator.style.display = 'none';
        }
    }

    /**
     * Update footer status
     * @param {string} status - Status text
     */
    updateStatus(status) {
        const statusElement = this.customContainer?.querySelector(`.${this.namespace}-status`);
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    /**
     * Show loading state
     * @param {string} message - Loading message
     */
    showLoading(message = 'Loading...') {
        this.updateStatus('Loading...');
        
        const loadingElements = this.customContainer?.querySelectorAll(`.${this.namespace}-loading-text`);
        loadingElements?.forEach(element => {
            element.textContent = message;
        });
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.updateStatus('Ready');
        
        const loadingContainers = this.customContainer?.querySelectorAll(`
            .${this.namespace}-loading-stats,
            .${this.namespace}-loading-table
        `);
        
        loadingContainers?.forEach(container => {
            container.style.display = 'none';
        });
    }

    /**
     * Show error state
     * @param {string} message - Error message
     */
    showError(message) {
        this.updateStatus('Error');
        
        const tableContainer = this.customContainer?.querySelector(`.${this.namespace}-table-container`);
        if (tableContainer) {
            tableContainer.innerHTML = `
                <div class="${this.namespace}-error-state">
                    <div class="${this.namespace}-error-icon">⚠</div>
                    <div class="${this.namespace}-error-title">Failed to Load Tasks</div>
                    <div class="${this.namespace}-error-message">${CoreDOMUtils.escapeHtml(message)}</div>
                    <button class="${this.namespace}-error-retry" onclick="window.fancyGSTManager?.extractAndDisplayTasks()">
                        🔄 Retry
                    </button>
                </div>
            `;
        }
    }

    /**
     * Load CSS styles
     */
    async loadStyles() {
        // fallback style
        const fallbackContainerCSS = `
            /* Minimal fallback styles */
            #${this.CONTAINER_ID} {
                position: absolute;
                top: 0; left: 0; right: 0; bottom: 0;
                z-index: 999999;
                overflow-x: hidden;
                overflow-y: auto;
                font-family: 'Google Sans', Roboto, Arial, sans-serif;
                background: #fff;
                color: #202124;
                padding: 8px;
                box-sizing: border-box;
            }
            
            .${this.namespace}-loading-spinner {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #1a73e8;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;

        const cssFiles = [
            'src/container/container.css',
            'src/modal/modal.css', 
            'src/table/table.css'
        ];
        
        // File names that need fallbackCSS
        const containerCSS = 'src/container/container.css';

        // Load all CSS in parallel
        const loadPromises = cssFiles.map((file) => {
            if (file === containerCSS) {
                return CoreDOMUtils.loadCSS(file, fallbackContainerCSS);
            } else {
                return CoreDOMUtils.loadCSS(file);
            }
        });

        return await Promise.all(loadPromises);
    }

    /**
     * Get the main container element
     * @returns {Element} - Container element
     */
    getContainer() {
        return this.customContainer;
    }

    /**
     * Get toggle indicator element
     * @returns {Element} - Toggle indicator element
     */
    getToggleIndicator() {
        return this.toggleIndicator;
    }

    /**
     * Get completed toggle indicator element
     * @returns {Element} - Completed toggle indicator element
     */
    getCompletedToggleIndicator() {
        return this.completedToggleIndicator;
    }

    /**
     * Update container theme
     * @param {string} theme - Theme name ('light', 'dark', 'auto')
     */
    updateTheme(theme) {
        if (this.customContainer) {
            this.customContainer.setAttribute('data-theme', theme);
        }
    }

    /**
     * Add custom CSS class to container
     * @param {string} className - CSS class name
     */
    addClass(className) {
        if (this.customContainer) {
            this.customContainer.classList.add(className);
        }
    }

    /**
     * Remove custom CSS class from container
     * @param {string} className - CSS class name
     */
    removeClass(className) {
        if (this.customContainer) {
            this.customContainer.classList.remove(className);
        }
    }

    /**
     * Toggle container fullscreen mode
     */
    toggleFullscreen() {
        if (this.customContainer) {
            this.customContainer.classList.toggle(`${this.namespace}-fullscreen`);
        }
    }

    /**
     * Destroy container UI
     */
    destroy() {
        // Remove toggle buttons
        if (this.toggleIndicator && this.toggleIndicator.parentNode) {
            this.toggleIndicator.parentNode.removeChild(this.toggleIndicator);
        }
        if (this.completedToggleIndicator && this.completedToggleIndicator.parentNode) {
            this.completedToggleIndicator.parentNode.removeChild(this.completedToggleIndicator);
        }

        // Remove main container
        if (this.customContainer && this.customContainer.parentNode) {
            this.customContainer.parentNode.removeChild(this.customContainer);
        }

        // Reset references
        this.customContainer = null;
        this.toggleIndicator = null;
        this.completedToggleIndicator = null;

        console.log('🧹 Container UI destroyed');
    }
}

// Export to global scope
window.ContainerUI = ContainerUI;

console.log('✅ Container UI loaded successfully');