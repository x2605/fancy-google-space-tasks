// core/operation_verifier.ts - Operation verification with UI lock management
import * as Logger from '@/core/logger';
import { CoreEventUtils } from './event_utils';
import { CoreNotificationUtils } from './notification_utils';
import { CoreDOMUtils } from './dom_utils';

Logger.fgtlog('🔍 Operation Verifier loading...');

/**
 * Operation verifier for ensuring operations complete successfully
 * Provides UI locking and polling-based verification
 */
class OperationVerifier {
    namespace: string;
    activeOperations: Map<number, any>;
    nextOperationId: number;
    lockOverlay: HTMLDivElement | null;

    constructor(namespace: string = 'fancy-gst') {
        this.namespace = namespace;
        this.activeOperations = new Map();
        this.nextOperationId = 1;
        this.lockOverlay = null;
    }

    /**
     * Lock UI to prevent user interaction during operation
     * @param targetContainer - Container to lock (default: main container)
     * @param message - Optional message to display
     */
    lockUI(targetContainer: Element | null = null, message: string = ''): void {
        const container = targetContainer || document.getElementById(`${this.namespace}-container`);

        if (!container) {
            Logger.fgtwarn('⚠️ Cannot lock UI: container not found');
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

        Logger.fgtlog('🔒 UI locked');
    }

    /**
     * Unlock UI to restore user interaction
     * @param targetContainer - Container to unlock (default: main container)
     */
    unlockUI(targetContainer: Element | null = null): void {
        const container = targetContainer || document.getElementById(`${this.namespace}-container`);

        if (!container) {
            Logger.fgtwarn('⚠️ Cannot unlock UI: container not found');
            return;
        }

        // Remove locked class from container
        container.classList.remove(`${this.namespace}-locked`);

        // Disable lock styles
        CoreDOMUtils.disableLockStyles();

        // Remove overlay message
        this.hideLockOverlay();

        Logger.fgtlog('🔓 UI unlocked');
    }

    /**
     * Check if any operation is currently in progress
     * @returns True if any operation is active
     */
    isOperationInProgress(): boolean {
        return this.activeOperations.size > 0;
    }

    /**
     * Show lock overlay with message
     * @param message - Message to display
     */
    showLockOverlay(message: string): void {
        // Remove existing overlay if present
        this.hideLockOverlay();

        this.lockOverlay = CoreDOMUtils.createElement('div', {
            class: `${this.namespace}-lock-overlay`
        }, {}, message) as HTMLDivElement;

        document.body.appendChild(this.lockOverlay);
    }

    /**
     * Hide lock overlay
     */
    hideLockOverlay(): void {
        if (this.lockOverlay && this.lockOverlay.parentNode) {
            this.lockOverlay.parentNode.removeChild(this.lockOverlay);
            this.lockOverlay = null;
        }
    }

    /**
     * Verify operation completion using polling
     * @param checkFn - Function that returns true when operation is complete
     * @param timeout - Maximum wait time in milliseconds
     * @param onSuccess - Callback on successful verification
     * @param onFail - Callback on verification failure/timeout
     * @param options - Additional options
     * @returns Operation ID for tracking
     */
    verifyOperation(checkFn: Function, timeout: number = 5000, onSuccess: Function | null = null, onFail: Function | null = null, options: any = {}): number {
        const operationId = this.nextOperationId++;
        const pollInterval = options.pollInterval || 200;
        const startTime = Date.now();

        Logger.fgtlog('🔍 Starting operation verification (ID: ' + operationId + ', timeout: ' + timeout + 'ms)');

        // Create polling interval
        const intervalId = CoreEventUtils.intervals.create((execCount: number) => {
            const elapsed = Date.now() - startTime;

            // Check if operation completed
            try {
                if (checkFn()) {
                    Logger.fgtlog('✅ Operation ' + operationId + ' verified successfully (' + elapsed + 'ms, ' + execCount + ' checks)');
                    this.completeOperation(operationId, true, onSuccess);
                    return;
                }
            } catch (error: any) {
                Logger.fgterror('❌ Operation ' + operationId + ' check error: ' + error);
                this.completeOperation(operationId, false, onFail, error);
                return;
            }

            // Check timeout
            if (elapsed >= timeout) {
                Logger.fgtwarn('⏱️ Operation ' + operationId + ' verification timeout (' + elapsed + 'ms, ' + execCount + ' checks)');
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
     * @param operationId - Operation ID
     * @param success - Success status
     * @param callback - Callback to execute
     * @param error - Error if failed
     */
    completeOperation(operationId: number, success: boolean, callback: Function | null, error: Error | null = null): void {
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
            } catch (callbackError: any) {
                Logger.fgterror('Operation callback error: ' + callbackError);
            }
        }
    }

    /**
     * Cancel ongoing operation
     * @param operationId - Operation ID
     * @returns Success status
     */
    cancelOperation(operationId: number): boolean {
        const operation = this.activeOperations.get(operationId);

        if (operation) {
            CoreEventUtils.intervals.clear(operation.intervalId);
            this.activeOperations.delete(operationId);
            Logger.fgtlog('🚫 Operation ' + operationId + ' cancelled');
            return true;
        }

        return false;
    }

    /**
     * Cancel all ongoing operations
     */
    cancelAllOperations(): void {
        this.activeOperations.forEach((operation, _operationId) => {
            CoreEventUtils.intervals.clear(operation.intervalId);
        });
        this.activeOperations.clear();
        Logger.fgtlog('🚫 All operations cancelled');
    }

    /**
     * Get active operations count
     * @returns Count of active operations
     */
    getActiveOperationsCount(): number {
        return this.activeOperations.size;
    }

    /**
     * Check if operation is active
     * @param operationId - Operation ID
     * @returns Is active
     */
    isOperationActive(operationId: number): boolean {
        return this.activeOperations.has(operationId);
    }

    /**
     * Get operation info
     * @param operationId - Operation ID
     * @returns Operation info
     */
    getOperationInfo(operationId: number): any {
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
     * @param operationFn - Function to execute (should be async)
     * @param checkFn - Function to verify completion
     * @param options - Options
     * @returns Promise that resolves when operation completes
     */
    async lockAndVerify(operationFn: Function, checkFn: Function, options: any = {}): Promise<void> {
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
                        (error: Error) => {
                            // Failure
                            this.unlockUI(targetContainer);
                            if (errorMessage) {
                                CoreNotificationUtils.error(errorMessage, this.namespace);
                            }
                            reject(error);
                        }
                    );
                })
                .catch((error: Error) => {
                    // Operation execution error
                    this.unlockUI(targetContainer);
                    CoreNotificationUtils.error('Operation execution failed', this.namespace);
                    reject(error);
                });
        });
    }

    /**
     * Wait for element to disappear (common verification pattern)
     * @param selector - CSS selector
     * @returns Check function for verifyOperation
     */
    static waitForElementDisappear(selector: string): Function {
        return () => {
            return !document.querySelector(selector);
        };
    }

    /**
     * Wait for element to appear (common verification pattern)
     * @param selector - CSS selector
     * @returns Check function for verifyOperation
     */
    static waitForElementAppear(selector: string): Function {
        return () => {
            const element = document.querySelector(selector);
            return element && (element as HTMLElement).offsetParent !== null;
        };
    }

    /**
     * Wait for specific task to disappear (delete verification)
     * @param taskId - Task ID
     * @returns Check function for verifyOperation
     */
    static waitForTaskDelete(taskId: string): Function {
        return () => {
            return !document.querySelector(`[role="listitem"][data-id="${taskId}"][data-type="0"]`);
        };
    }

    /**
     * Wait for task attribute change (update verification)
     * @param taskId - Task ID
     * @param attribute - Attribute name
     * @param expectedValue - Expected value
     * @returns Check function for verifyOperation
     */
    static waitForTaskAttributeChange(taskId: string, attribute: string, expectedValue: string): Function {
        return () => {
            const element = document.querySelector(`[role="listitem"][data-id="${taskId}"][data-type="0"]`);
            if (!element) return false;

            const actualValue = element.querySelector(`[${attribute}]`)?.getAttribute(attribute);
            return actualValue === expectedValue;
        };
    }

    /**
     * Get debug information
     * @returns Debug info
     */
    getDebugInfo(): any {
        const operations: any[] = [];

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
    cleanup(): void {
        this.cancelAllOperations();
        this.unlockUI();
        this.hideLockOverlay();
        Logger.fgtlog('🧹 OperationVerifier cleaned up');
    }

    /**
     * Create verifier instance
     * @param namespace - CSS namespace
     * @returns Verifier instance
     */
    static create(namespace: string = 'fancy-gst'): OperationVerifier {
        return new OperationVerifier(namespace);
    }
}

export { OperationVerifier };

Logger.fgtlog('✅ Operation Verifier loaded successfully');