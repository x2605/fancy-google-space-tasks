// core/operation_verifier.js - Operation verification with UI lock management
console.log('🔍 Operation Verifier loading...');

/**
 * Operation verifier for ensuring operations complete successfully
 * Provides UI locking and polling-based verification
 */
class OperationVerifier {
    constructor(namespace = 'fancy-gst') {
        this.namespace = namespace;
        this.activeOperations = new Map(); // operationId -> {locked, checkInterval, timeout}
        this.nextOperationId = 1;
        this.lockOverlay = null;
    }

    /**
     * Lock UI to prevent user interaction during operation
     * @param {Element} targetContainer - Container to lock (default: main container)
     * @param {string} message - Optional message to display
     */
    lockUI(targetContainer = null, message = '') {
        const container = targetContainer || document.getElementById(`${this.namespace}-container`);
        
        if (!container) {
            console.warn('⚠️ Cannot lock UI: container not found');
            return;
        }

        // Add locked class to container
        container.classList.add(`${this.namespace}-locked`);
        
        // Enable lock styles
        CoreDOMUtils.enableLockStyles();

        // Show overlay message if provided
        if (message) {
            this.showLockOverlay(message);
        }

        console.log('🔒 UI locked');
    }

    /**
     * Unlock UI to restore user interaction
     * @param {Element} targetContainer - Container to unlock (default: main container)
     */
    unlockUI(targetContainer = null) {
        const container = targetContainer || document.getElementById(`${this.namespace}-container`);
        
        if (!container) {
            console.warn('⚠️ Cannot unlock UI: container not found');
            return;
        }

        // Remove locked class from container
        container.classList.remove(`${this.namespace}-locked`);
        
        // Disable lock styles
        CoreDOMUtils.disableLockStyles();

        // Remove overlay message
        this.hideLockOverlay();

        console.log('🔓 UI unlocked');
    }

    /**
     * Check if any operation is currently in progress
     * @returns {boolean} - True if any operation is active
     */
    isOperationInProgress() {
        return this.activeOperations.size > 0;
    }

    /**
     * Show lock overlay with message
     * @param {string} message - Message to display
     */
    showLockOverlay(message) {
        // Remove existing overlay if present
        this.hideLockOverlay();

        this.lockOverlay = CoreDOMUtils.createElement('div', {
            class: `${this.namespace}-lock-overlay`
        }, {}, message);

        document.body.appendChild(this.lockOverlay);
    }

    /**
     * Hide lock overlay
     */
    hideLockOverlay() {
        if (this.lockOverlay && this.lockOverlay.parentNode) {
            this.lockOverlay.parentNode.removeChild(this.lockOverlay);
            this.lockOverlay = null;
        }
    }

    /**
     * Verify operation completion using polling
     * @param {Function} checkFn - Function that returns true when operation is complete
     * @param {number} timeout - Maximum wait time in milliseconds
     * @param {Function} onSuccess - Callback on successful verification
     * @param {Function} onFail - Callback on verification failure/timeout
     * @param {Object} options - Additional options
     * @returns {number} - Operation ID for tracking
     */
    verifyOperation(checkFn, timeout = 5000, onSuccess = null, onFail = null, options = {}) {
        const operationId = this.nextOperationId++;
        const pollInterval = options.pollInterval || 200;
        const startTime = Date.now();

        console.log(`🔍 Starting operation verification (ID: ${operationId}, timeout: ${timeout}ms)`);

        // Create polling interval
        const intervalId = CoreEventUtils.intervals.create((execCount) => {
            const elapsed = Date.now() - startTime;

            // Check if operation completed
            try {
                if (checkFn()) {
                    console.log(`✅ Operation ${operationId} verified successfully (${elapsed}ms, ${execCount} checks)`);
                    this.completeOperation(operationId, true, onSuccess);
                    return;
                }
            } catch (error) {
                console.error(`❌ Operation ${operationId} check error:`, error);
                this.completeOperation(operationId, false, onFail, error);
                return;
            }

            // Check timeout
            if (elapsed >= timeout) {
                console.warn(`⏱️ Operation ${operationId} verification timeout (${elapsed}ms, ${execCount} checks)`);
                this.completeOperation(operationId, false, onFail, new Error('Verification timeout'));
                return;
            }
        }, pollInterval);

        // Store operation info
        this.activeOperations.set(operationId, {
            intervalId,
            startTime,
            timeout,
            checkFn
        });

        return operationId;
    }

    /**
     * Complete operation and cleanup
     * @param {number} operationId - Operation ID
     * @param {boolean} success - Success status
     * @param {Function} callback - Callback to execute
     * @param {Error} error - Error if failed
     */
    completeOperation(operationId, success, callback, error = null) {
        const operation = this.activeOperations.get(operationId);
        
        if (operation) {
            // Clear interval
            CoreEventUtils.intervals.clear(operation.intervalId);
            
            // Remove from active operations
            this.activeOperations.delete(operationId);
        }

        // Execute callback
        if (callback) {
            try {
                if (success) {
                    callback();
                } else {
                    callback(error);
                }
            } catch (callbackError) {
                console.error('Operation callback error:', callbackError);
            }
        }
    }

    /**
     * Cancel ongoing operation
     * @param {number} operationId - Operation ID
     * @returns {boolean} - Success status
     */
    cancelOperation(operationId) {
        const operation = this.activeOperations.get(operationId);
        
        if (operation) {
            CoreEventUtils.intervals.clear(operation.intervalId);
            this.activeOperations.delete(operationId);
            console.log(`🚫 Operation ${operationId} cancelled`);
            return true;
        }
        
        return false;
    }

    /**
     * Cancel all ongoing operations
     */
    cancelAllOperations() {
        this.activeOperations.forEach((operation, operationId) => {
            CoreEventUtils.intervals.clear(operation.intervalId);
        });
        this.activeOperations.clear();
        console.log('🚫 All operations cancelled');
    }

    /**
     * Get active operations count
     * @returns {number} - Count of active operations
     */
    getActiveOperationsCount() {
        return this.activeOperations.size;
    }

    /**
     * Check if operation is active
     * @param {number} operationId - Operation ID
     * @returns {boolean} - Is active
     */
    isOperationActive(operationId) {
        return this.activeOperations.has(operationId);
    }

    /**
     * Get operation info
     * @param {number} operationId - Operation ID
     * @returns {Object|null} - Operation info
     */
    getOperationInfo(operationId) {
        const operation = this.activeOperations.get(operationId);
        
        if (operation) {
            return {
                operationId,
                elapsed: Date.now() - operation.startTime,
                timeout: operation.timeout,
                remainingTime: operation.timeout - (Date.now() - operation.startTime)
            };
        }
        
        return null;
    }

    /**
     * Verify and lock pattern - common use case
     * @param {Function} operationFn - Function to execute (should be async)
     * @param {Function} checkFn - Function to verify completion
     * @param {Object} options - Options
     * @returns {Promise} - Promise that resolves when operation completes
     */
    async lockAndVerify(operationFn, checkFn, options = {}) {
        const {
            timeout = 5000,
            lockMessage = 'Processing...',
            successMessage = 'Operation completed',
            errorMessage = 'Operation failed',
            targetContainer = null
        } = options;

        return new Promise((resolve, reject) => {
            // Lock UI
            this.lockUI(targetContainer, lockMessage);

            // Execute operation
            Promise.resolve(operationFn())
                .then(() => {
                    // Start verification
                    this.verifyOperation(
                        checkFn,
                        timeout,
                        () => {
                            // Success
                            this.unlockUI(targetContainer);
                            if (successMessage) {
                                CoreNotificationUtils.success(successMessage, this.namespace);
                            }
                            resolve();
                        },
                        (error) => {
                            // Failure
                            this.unlockUI(targetContainer);
                            if (errorMessage) {
                                CoreNotificationUtils.error(errorMessage, this.namespace);
                            }
                            reject(error);
                        }
                    );
                })
                .catch((error) => {
                    // Operation execution error
                    this.unlockUI(targetContainer);
                    CoreNotificationUtils.error('Operation execution failed', this.namespace);
                    reject(error);
                });
        });
    }

    /**
     * Wait for element to disappear (common verification pattern)
     * @param {string} selector - CSS selector
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Function} - Check function for verifyOperation
     */
    static waitForElementDisappear(selector) {
        return () => {
            return !document.querySelector(selector);
        };
    }

    /**
     * Wait for element to appear (common verification pattern)
     * @param {string} selector - CSS selector
     * @returns {Function} - Check function for verifyOperation
     */
    static waitForElementAppear(selector) {
        return () => {
            const element = document.querySelector(selector);
            return element && element.offsetParent !== null;
        };
    }

    /**
     * Wait for specific task to disappear (delete verification)
     * @param {string} taskId - Task ID
     * @returns {Function} - Check function for verifyOperation
     */
    static waitForTaskDelete(taskId) {
        return () => {
            return !document.querySelector(`[role="listitem"][data-id="${taskId}"][data-type="0"]`);
        };
    }

    /**
     * Wait for task attribute change (update verification)
     * @param {string} taskId - Task ID
     * @param {string} attribute - Attribute name
     * @param {string} expectedValue - Expected value
     * @returns {Function} - Check function for verifyOperation
     */
    static waitForTaskAttributeChange(taskId, attribute, expectedValue) {
        return () => {
            const element = document.querySelector(`[role="listitem"][data-id="${taskId}"][data-type="0"]`);
            if (!element) return false;
            
            const actualValue = element.querySelector(`[${attribute}]`)?.getAttribute(attribute);
            return actualValue === expectedValue;
        };
    }

    /**
     * Get debug information
     * @returns {Object} - Debug info
     */
    getDebugInfo() {
        const operations = [];
        
        this.activeOperations.forEach((operation, operationId) => {
            operations.push({
                operationId,
                elapsed: Date.now() - operation.startTime,
                timeout: operation.timeout,
                remainingTime: operation.timeout - (Date.now() - operation.startTime)
            });
        });

        return {
            activeOperationsCount: this.activeOperations.size,
            operations
        };
    }

    /**
     * Cleanup all resources
     */
    cleanup() {
        this.cancelAllOperations();
        this.unlockUI();
        this.hideLockOverlay();
        console.log('🧹 OperationVerifier cleaned up');
    }

    /**
     * Create verifier instance
     * @param {string} namespace - CSS namespace
     * @returns {OperationVerifier} - Verifier instance
     */
    static create(namespace = 'fancy-gst') {
        return new OperationVerifier(namespace);
    }
}

// Export to global scope
window.OperationVerifier = OperationVerifier;

console.log('✅ Operation Verifier loaded successfully');