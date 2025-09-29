// table/table_events.js - Table event handling (FIXED)
console.log('⚡ Table Events loading...');

/**
 * Table event handling for fancy-gst-tasks-table block
 */
class TableEvents {
    constructor(namespace = 'fancy-gst') {
        this.namespace = namespace;
        this.cleanupFunctions = [];
        this.interactionHandler = null;
    }

    /**
     * Initialize table events
     * @param {Element} tableContainer - Table container element
     * @param {Object} interactionHandler - Interaction handler instance
     */
    initialize(tableContainer, interactionHandler) {
        this.interactionHandler = interactionHandler;
        this.attachAllTableEvents(tableContainer);
        console.log('✅ Table events initialized');
    }

    /**
     * Attach all table event listeners
     * @param {Element} tableContainer - Table container element
     */
    attachAllTableEvents(tableContainer) {
        this.attachCheckboxEvents(tableContainer);
        this.attachActionButtonEvents(tableContainer);
    }

    /**
     * Attach checkbox event listeners
     * @param {Element} tableContainer - Table container element
     */
    attachCheckboxEvents(tableContainer) {
        const cleanup = CoreEventUtils.delegate(
            tableContainer,
            `.${this.namespace}-task-checkbox`,
            'click',
            this.handleCheckboxClick.bind(this)
        );

        this.cleanupFunctions.push(cleanup);
        console.log('🎯 Checkbox events attached');
    }

    /**
     * Handle checkbox click - FIXED VERSION
     * @param {Event} event - Click event
     */
    handleCheckboxClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const checkbox = event.currentTarget;
        const taskId = checkbox.dataset.taskId;
        
        console.log(`🔄 Toggling task: ${taskId}`);
        
        if (taskId && this.interactionHandler) {
            // Show loading state immediately
            const originalContent = checkbox.innerHTML;
            checkbox.innerHTML = '⟳';
            checkbox.style.opacity = '0.6';
            
            this.interactionHandler.toggleTask(taskId, () => {
                // Reset loading state
                checkbox.style.opacity = '1';
                
                // Toggle visual state
                const wasCompleted = checkbox.classList.contains('fgt-completed');
                
                if (wasCompleted) {
                    checkbox.classList.remove('fgt-completed');
                    checkbox.innerHTML = '';
                    console.log(`✅ Task ${taskId} marked as incomplete`);
                } else {
                    checkbox.classList.add('fgt-completed');
                    checkbox.innerHTML = '';
                    console.log(`✅ Task ${taskId} marked as complete`);
                }
                
                // Notify container to refresh data
                this.notifyDataChange();
            });
        } else {
            console.error('❌ Missing taskId or interactionHandler');
            CoreNotificationUtils.error('Failed to toggle task', this.namespace);
        }
    }

    /**
     * Attach action button event listeners
     * @param {Element} tableContainer - Table container element
     */
    attachActionButtonEvents(tableContainer) {
        const cleanup = CoreEventUtils.delegate(
            tableContainer,
            `.${this.namespace}-action-btn`,
            'click',
            this.handleActionButtonClick.bind(this)
        );

        this.cleanupFunctions.push(cleanup);
        console.log('🎯 Action button events attached');
    }

    /**
     * Handle action button clicks - FIXED VERSION
     * @param {Event} event - Click event
     */
    handleActionButtonClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const button = event.currentTarget;
        const action = button.dataset.action;
        const taskId = button.dataset.taskId;
        
        console.log(`🎯 Action button clicked: ${action} for task ${taskId}`);
        
        if (!taskId) {
            console.error('❌ Missing taskId');
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
                console.warn(`⚠️ Unknown action: ${action}`);
        }
    }

    /**
     * Handle chat action directly (no modal needed)
     * @param {string} taskId - Task ID
     * @param {Element} button - Button element
     */
    handleChatAction(taskId, button) {
        if (!this.interactionHandler) {
            CoreNotificationUtils.error('Interaction handler not available', this.namespace);
            return;
        }

        // Show loading state
        const originalContent = button.innerHTML;
        button.innerHTML = '⟳';
        button.disabled = true;
        
        this.interactionHandler.showInChat(taskId).finally(() => {
            // Reset button state
            button.innerHTML = originalContent;
            button.disabled = false;
        });
    }

    /**
     * Notify container of data changes
     */
    notifyDataChange() {
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
     * @param {Element} tableContainer - Table container element
     */
    updateEventHandlers(tableContainer) {
        // Events are delegated, so no need to re-attach
        console.log('📊 Table events updated (delegated events)');
    }

    /**
     * Cleanup all event listeners
     */
    cleanup() {
        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.cleanupFunctions = [];
        console.log('🧹 Table events cleaned up');
    }

    /**
     * Destroy table events
     */
    destroy() {
        this.cleanup();
        this.interactionHandler = null;
    }
}

// Export to global scope
window.TableEvents = TableEvents;

console.log('✅ Table Events loaded successfully');