// table/table_events.ts - Table event handling (FIXED)
import * as Logger from '@/core/logger';
import { CoreNotificationUtils } from '@/core/notification_utils';
import { CoreEventUtils } from '@/core/event_utils';

Logger.fgtlog('⚡ Table Events loading...');

/**
 * Table event handling for fancy-gst-tasks-table block
 */
class TableEvents {
    namespace: string;
    cleanupFunctions: Function[];
    interactionHandler: any;
    pendingOperations: Map<string, number>;

    constructor(namespace: string = 'fancy-gst') {
        this.namespace = namespace;
        this.cleanupFunctions = [];
        this.interactionHandler = null;
        this.pendingOperations = new Map(); // Track operation start times
    }

    /**
     * Initialize table events
     * @param tableContainer - Table container element
     * @param interactionHandler - Interaction handler instance
     */
    initialize(tableContainer: Element, interactionHandler: any): void {
        // Cleanup existing event listeners first to prevent duplicates
        this.cleanup();

        this.interactionHandler = interactionHandler;
        this.attachAllTableEvents(tableContainer);
        Logger.fgtlog('✅ Table events initialized');
    }

    /**
     * Attach all table event listeners
     * @param tableContainer - Table container element
     */
    attachAllTableEvents(tableContainer: Element): void {
        this.attachCheckboxEvents(tableContainer);
        this.attachActionButtonEvents(tableContainer);
    }

    /**
     * Attach checkbox event listeners
     * @param tableContainer - Table container element
     */
    attachCheckboxEvents(tableContainer: Element): void {
        const cleanup = CoreEventUtils.delegate(
            tableContainer,
            `.${this.namespace}-task-checkbox`,
            'click',
            this.handleCheckboxClick.bind(this)
        );

        this.cleanupFunctions.push(cleanup);
        Logger.fgtlog('🎯 Checkbox events attached');
    }

    /**
     * Handle checkbox click - FIXED VERSION
     * @param event - Click event
     */
    handleCheckboxClick(event: any): void {
        event.preventDefault();
        event.stopPropagation();

        const checkbox = event.currentTarget;
        const taskId = checkbox.dataset.taskId;

        // Record operation start time for total duration tracking
        const operationStartTime = Date.now();
        this.pendingOperations.set(taskId, operationStartTime);

        if (taskId && this.interactionHandler) {
            // Show loading state immediately
            /*const originalContent = */checkbox.innerHTML;
            checkbox.innerHTML = '⟳';
            checkbox.style.opacity = '0.6';

            this.interactionHandler.toggleTask(taskId, () => {
                const domUpdateTime = Date.now() - operationStartTime;

                // Reset loading state
                checkbox.style.opacity = '1';

                // Toggle visual state
                const wasCompleted = checkbox.classList.contains('fgt-completed');

                if (wasCompleted) {
                    checkbox.classList.remove('fgt-completed');
                    checkbox.innerHTML = '';
                    Logger.fgtlog(`✅ Task ${taskId} marked as incomplete (DOM update: ${domUpdateTime}ms)`);
                } else {
                    checkbox.classList.add('fgt-completed');
                    checkbox.innerHTML = '';
                    Logger.fgtlog(`✅ Task ${taskId} marked as complete (DOM update: ${domUpdateTime}ms)`);
                }

                // Notify container to refresh data immediately
                this.notifyDataChange();
            });
        } else {
            this.pendingOperations.delete(taskId);
            Logger.fgterror('❌ Missing taskId or interactionHandler');
            CoreNotificationUtils.error('Failed to toggle task', this.namespace);
        }
    }

    /**
     * Attach action button event listeners
     * @param tableContainer - Table container element
     */
    attachActionButtonEvents(tableContainer: Element): void {
        const cleanup = CoreEventUtils.delegate(
            tableContainer,
            `.${this.namespace}-action-btn`,
            'click',
            this.handleActionButtonClick.bind(this)
        );

        this.cleanupFunctions.push(cleanup);
        Logger.fgtlog('🎯 Action button events attached');
    }

    /**
     * Handle action button clicks - FIXED VERSION
     * @param event - Click event
     */
    handleActionButtonClick(event: any): void {
        event.preventDefault();
        event.stopPropagation();

        const button = event.currentTarget;
        const action = button.dataset.action;
        const taskId = button.dataset.taskId;

        Logger.fgtlog('🎯 Action button clicked: ' + action + ' for task ' + taskId);

        if (!taskId) {
            Logger.fgterror('❌ Missing taskId');
            CoreNotificationUtils.error('Task ID not found', this.namespace);
            return;
        }

        // Handle different actions
        switch (action) {
            case 'chat':
                this.handleChatAction(taskId, button);
                break;
            case 'date':
            case 'assignee':
            case 'delete':
                // Dispatch custom event for container to handle modal opening
                const actionEvent = new CustomEvent('tableAction', {
                    detail: { action, taskId, button },
                    bubbles: true
                });
                button.dispatchEvent(actionEvent);
                break;
            default:
                Logger.fgtwarn('⚠️ Unknown action: ' + action);
        }
    }

    /**
     * Handle chat action directly (no modal needed)
     * @param taskId - Task ID
     * @param button - Button element
     */
    handleChatAction(taskId: string, button: Element): void {
        if (!this.interactionHandler) {
            CoreNotificationUtils.error('Interaction handler not available', this.namespace);
            return;
        }

        // Show loading state
        const originalContent = button.innerHTML;
        button.innerHTML = '⟳';
        (button as HTMLButtonElement).disabled = true;

        this.interactionHandler.showInChat(taskId).finally(() => {
            // Reset button state
            button.innerHTML = originalContent;
            (button as HTMLButtonElement).disabled = false;
        });
    }

    /**
     * Notify container of data changes
     */
    notifyDataChange(): void {
        const event = new CustomEvent('tableDataChange', {
            bubbles: true
        });

        const table = document.querySelector(`#${this.namespace}-tasks-table`);
        if (table) {
            table.dispatchEvent(event);
        }
    }

    /**
     * Update event handlers for new table content
     * @param tableContainer - Table container element
     */
    updateEventHandlers(_tableContainer: Element): void {
        // Events are delegated, so no need to re-attach
        Logger.fgtlog('📊 Table events updated (delegated events)');
    }

    /**
     * Report completion of pending operations after table render
     * Called by container manager after table is fully rendered
     */
    reportPendingOperationsComplete(): void {
        if (this.pendingOperations.size > 0) {
            this.pendingOperations.forEach((startTime, taskId) => {
                const totalTime = Date.now() - startTime;
                Logger.fgtlog(`⏱️ Task ${taskId} operation completed: ${totalTime}ms total (click → DOM → table refresh)`);
            });
            this.pendingOperations.clear();
        }
    }

    /**
     * Cleanup all event listeners
     */
    cleanup(): void {
        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.cleanupFunctions = [];
        Logger.fgtlog('🧹 Table events cleaned up');
    }

    /**
     * Destroy table events
     */
    destroy(): void {
        this.cleanup();
        this.interactionHandler = null;
    }
}

export { TableEvents };

Logger.fgtlog('✅ Table Events loaded successfully');