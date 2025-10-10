// assignee/assignee_dropdown.ts - Assignee dropdown modal
import * as Logger from '@/core/logger';
import { CoreNotificationUtils } from '@/core/notification_utils';
import { CoreDOMUtils } from '@/core/dom_utils';
import { AssigneeUtils } from './assignee_utils';
import { CoreEventUtils } from '@/core/event_utils';
import { ModalBase } from '@/modal/modal_base';

Logger.fgtlog('👤 Assignee Dropdown loading...');

/**
 * Assignee dropdown modal for task assignment
 */
class AssigneeDropdown {
    namespace: string;
    taskId: string | null;
    currentAssignee: string | null;
    onAssigneeSet: Function | null;
    interactionHandler: any;
    availableAssignees: string[];
    isLoading: boolean;
    modal: any;
    cleanupFunctions: Function[];

    constructor(namespace: string = 'fancy-gst') {
        this.namespace = namespace;
        this.taskId = null;
        this.currentAssignee = null;
        this.onAssigneeSet = null;
        this.interactionHandler = null;
        this.availableAssignees = [];
        this.isLoading = false;
        this.modal = null;
        this.cleanupFunctions = [];
    }

    /**
     * Show assignee dropdown modal
     * @param taskId - Task ID
     * @param interactionHandler - Interaction handler instance
     * @param onAssigneeSet - Callback when assignee is set
     * @param currentAssignee - Current assignee name
     * @param availableAssignees - List of available assignees
     */
    show(taskId: string, interactionHandler: any, onAssigneeSet: Function | null = null, currentAssignee: string = '', availableAssignees: string[] = []): void {
        this.taskId = taskId;
        this.interactionHandler = interactionHandler;
        this.onAssigneeSet = onAssigneeSet;
        this.currentAssignee = currentAssignee;
        this.availableAssignees = availableAssignees;

        // Create modal
        this.modal = new ModalBase(this.namespace);
        this.modal.createModal({
            maxWidth: '400px',
            minWidth: '300px'
        });

        // Set modal content
        this.modal.updateContent(this.generateAssigneeModalHTML());

        // Attach event handlers
        this.attachAssigneeModalHandlers();

        // Open modal
        this.modal.open();

        // Focus search input
        setTimeout(() => {
            const searchInput = this.modal.modal.querySelector(`.${this.namespace}-assignee-search`);
            if (searchInput) {
                searchInput.focus();
            }
        }, 100);

        Logger.fgtlog('👤 Assignee dropdown opened for task: ' + taskId);
    }

    /**
     * Generate assignee modal HTML content
     * @returns Modal content HTML
     */
    generateAssigneeModalHTML(): string {
        return `
            ${this.modal.createHeader('Assign Task')}
            ${this.modal.createBody(`
                <div class="${this.namespace}-assignee-selector">
                    <!-- Current assignee display -->
                    <div class="${this.namespace}-current-assignee">
                        <div class="${this.namespace}-assignee-label">Current Assignee:</div>
                        <div class="${this.namespace}-assignee-display">
                            ${this.currentAssignee ?
                `<div class="${this.namespace}-assignee-item current">
                                    <div class="${this.namespace}-assignee-avatar">${AssigneeUtils.getInitials(this.currentAssignee)}</div>
                                    <div class="${this.namespace}-assignee-name">${CoreDOMUtils.escapeHtml(this.currentAssignee)}</div>
                                    <div class="${this.namespace}-assignee-badge">Current</div>
                                </div>` :
                `<div class="${this.namespace}-no-assignee">No one assigned</div>`
            }
                        </div>
                    </div>

                    <!-- Search input -->
                    <div class="${this.namespace}-assignee-search-wrapper">
                        <div class="${this.namespace}-assignee-label">Search Team Members:</div>
                        <input type="text" 
                               class="${this.namespace}-assignee-search" 
                               placeholder="Type name or email..."
                               autocomplete="off">
                    </div>

                    <!-- Assignee options -->
                    <div class="${this.namespace}-assignee-options">
                        <div class="${this.namespace}-assignee-label">Available Team Members:</div>
                        <div class="${this.namespace}-assignee-list" id="${this.namespace}-assignee-list">
                            ${this.renderAssigneeList()}
                        </div>
                    </div>

                    <!-- Quick actions -->
                    <div class="${this.namespace}-quick-actions">
                        <div class="${this.namespace}-assignee-label">Quick Actions:</div>
                        <div class="${this.namespace}-quick-action-buttons">
                            <button class="${this.namespace}-quick-action-btn" data-action="assign-me">
                                👤 Assign to Me
                            </button>
                            <button class="${this.namespace}-quick-action-btn" data-action="unassign">
                                ❌ Unassign
                            </button>
                        </div>
                    </div>

                    <!-- Add new member option -->
                    <div class="${this.namespace}-add-member">
                        <div class="${this.namespace}-assignee-label">Can't find someone?</div>
                        <button class="${this.namespace}-add-member-btn" data-action="add-member">
                            ➕ Add New Team Member
                        </button>
                    </div>
                </div>
            `)}
            ${this.modal.createFooter([
                { text: 'Cancel', action: 'cancel' },
                { text: 'Assign', action: 'assign', primary: true, disabled: true }
            ])}
        `;
    }

    /**
     * Render assignee list HTML
     * @param filter - Search filter
     * @returns Assignee list HTML
     */
    renderAssigneeList(filter: string = ''): string {
        let assignees = this.availableAssignees;

        // Apply search filter
        if (filter) {
            const filterLower = filter.toLowerCase();
            assignees = assignees.filter(assignee =>
                assignee.toLowerCase().includes(filterLower)
            );
        }

        if (assignees.length === 0) {
            return `
                <div class="${this.namespace}-no-results">
                    ${filter ? 'No matching team members found' : 'No team members available'}
                </div>
            `;
        }

        return assignees.map(assignee => {
            const isSelected = assignee === this.currentAssignee;
            return `
                <div class="${this.namespace}-assignee-item ${isSelected ? 'selected' : ''}" 
                     data-assignee="${CoreDOMUtils.escapeHtml(assignee)}"
                     tabindex="0">
                    <div class="${this.namespace}-assignee-avatar">
                        ${AssigneeUtils.getInitials(assignee)}
                    </div>
                    <div class="${this.namespace}-assignee-info">
                        <div class="${this.namespace}-assignee-name">${CoreDOMUtils.escapeHtml(assignee)}</div>
                        <div class="${this.namespace}-assignee-status">${AssigneeUtils.getStatus(assignee)}</div>
                    </div>
                    ${isSelected ? `<div class="${this.namespace}-selected-indicator">✓</div>` : ''}
                </div>
            `;
        }).join('');
    }

    /**
     * Attach assignee modal specific event handlers
     */
    attachAssigneeModalHandlers(): void {
        // Button handlers
        this.modal.attachButtonHandlers({
            cancel: () => this.modal.close(),
            assign: () => this.handleAssignTask()
        });

        // Search input handler
        const searchInput = this.modal.modal.querySelector(`.${this.namespace}-assignee-search`);
        if (searchInput) {
            const cleanup = CoreEventUtils.addListener(searchInput, 'input',
                CoreEventUtils.debounce((event: any) => this.handleSearch(event.target.value), 300)
            );
            this.cleanupFunctions.push(cleanup);
        }

        // Assignee selection handlers
        this.attachAssigneeListHandlers();

        // Quick action handlers
        this.attachQuickActionHandlers();

        // Add member handler
        const addMemberBtn = this.modal.modal.querySelector(`.${this.namespace}-add-member-btn`);
        if (addMemberBtn) {
            const cleanup = CoreEventUtils.addListener(addMemberBtn, 'click', () => {
                this.handleAddMember();
            });
            this.cleanupFunctions.push(cleanup);
        }
    }

    /**
     * Attach assignee list event handlers
     */
    attachAssigneeListHandlers(): void {
        const assigneeList = this.modal.modal.querySelector(`#${this.namespace}-assignee-list`);
        if (assigneeList) {
            // Delegate click events
            const cleanup1 = CoreEventUtils.delegate(
                assigneeList,
                `.${this.namespace}-assignee-item`,
                'click',
                this.handleAssigneeSelect.bind(this)
            );

            // Delegate keyboard events
            const cleanup2 = CoreEventUtils.delegate(
                assigneeList,
                `.${this.namespace}-assignee-item`,
                'keydown',
                this.handleAssigneeKeydown.bind(this)
            );

            this.cleanupFunctions.push(cleanup1, cleanup2);
        }
    }

    /**
     * Attach quick action handlers
     */
    attachQuickActionHandlers(): void {
        const quickActionButtons = this.modal.modal.querySelectorAll(`.${this.namespace}-quick-action-btn`);

        quickActionButtons.forEach((button: Element) => {
            const cleanup = CoreEventUtils.addListener(button, 'click', (event: any) => {
                const action = event.target.dataset.action;
                this.handleQuickAction(action);
            });
            this.cleanupFunctions.push(cleanup);
        });
    }

    /**
     * Handle search input
     * @param query - Search query
     */
    handleSearch(query: string): void {
        const assigneeList = this.modal.modal.querySelector(`#${this.namespace}-assignee-list`);
        if (assigneeList) {
            assigneeList.innerHTML = this.renderAssigneeList(query);
            this.attachAssigneeListHandlers();
        }
    }

    /**
     * Handle assignee selection
     * @param event - Click event
     */
    handleAssigneeSelect(event: any): void {
        const assigneeItem = event.target.closest(`.${this.namespace}-assignee-item`);
        if (!assigneeItem) return;

        const assignee = assigneeItem.dataset.assignee;
        this.selectAssignee(assignee);
    }

    /**
     * Handle keyboard navigation for assignee items
     * @param event - Keydown event
     */
    handleAssigneeKeydown(event: any): void {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.handleAssigneeSelect(event);
        }
    }

    /**
     * Select an assignee
     * @param assignee - Assignee name
     */
    selectAssignee(assignee: string): void {
        // Update current assignee
        this.currentAssignee = assignee;

        // Update visual selection
        const assigneeItems = this.modal.modal.querySelectorAll(`.${this.namespace}-assignee-item`);
        assigneeItems.forEach((item: Element) => {
            item.classList.remove('selected');
            const indicator = item.querySelector(`.${this.namespace}-selected-indicator`);
            if (indicator) {
                indicator.remove();
            }
        });

        // Mark selected item
        const selectedItem = this.modal.modal.querySelector(`[data-assignee="${assignee}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
            selectedItem.innerHTML += `<div class="${this.namespace}-selected-indicator">✓</div>`;
        }

        // Enable assign button
        const assignButton = this.modal.modal.querySelector(`[data-action="assign"]`);
        if (assignButton) {
            (assignButton as HTMLButtonElement).disabled = false;
        }

        // Update current assignee display
        this.updateCurrentAssigneeDisplay(assignee);
    }

    /**
     * Update current assignee display
     * @param assignee - Assignee name
     */
    updateCurrentAssigneeDisplay(assignee: string): void {
        const display = this.modal.modal.querySelector(`.${this.namespace}-assignee-display`);
        if (display) {
            if (assignee) {
                display.innerHTML = `
                    <div class="${this.namespace}-assignee-item current">
                        <div class="${this.namespace}-assignee-avatar">${AssigneeUtils.getInitials(assignee)}</div>
                        <div class="${this.namespace}-assignee-name">${CoreDOMUtils.escapeHtml(assignee)}</div>
                        <div class="${this.namespace}-assignee-badge">Selected</div>
                    </div>
                `;
            } else {
                display.innerHTML = `<div class="${this.namespace}-no-assignee">No one assigned</div>`;
            }
        }
    }

    /**
     * Handle quick actions
     * @param action - Action type
     */
    handleQuickAction(action: string): void {
        switch (action) {
            case 'assign-me':
                // Get current user (placeholder implementation)
                const currentUser = AssigneeUtils.getCurrentUser();
                if (currentUser) {
                    this.selectAssignee(currentUser);
                } else {
                    CoreNotificationUtils.warning('Cannot determine current user', this.namespace);
                }
                break;

            case 'unassign':
                this.selectAssignee('');
                break;
        }
    }

    /**
     * Handle add member action
     */
    handleAddMember(): void {
        const name = prompt('Enter team member name or email:');
        if (name && name.trim()) {
            const cleanName = name.trim();
            if (!this.availableAssignees.includes(cleanName)) {
                this.availableAssignees.push(cleanName);
                this.handleSearch(''); // Refresh list
                CoreNotificationUtils.success('Added ' + cleanName + ' to team members', this.namespace);
            } else {
                CoreNotificationUtils.info('Team member already exists', this.namespace);
            }
        }
    }

    /**
     * Handle assign task action
     */
    async handleAssignTask(): Promise<void> {
        if (this.isLoading) {
            return; // Prevent double assignment
        }

        if (!this.interactionHandler || !this.taskId) {
            CoreNotificationUtils.error('Cannot assign task: missing handler or task ID', this.namespace);
            return;
        }

        try {
            this.isLoading = true;
            this.modal.showLoading('Assigning task...');

            // Assign task through interaction handler (placeholder)
            // In a real implementation, this would update the task assignee
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated delay

            this.modal.close();
            if (this.onAssigneeSet) {
                this.onAssigneeSet(this.currentAssignee);
            }

            const message = this.currentAssignee ?
                'Task assigned to ' + this.currentAssignee :
                'Task unassigned';
            CoreNotificationUtils.success(message, this.namespace);

        } catch (error) {
            Logger.fgterror('Assign task error: ' + error);
            this.isLoading = false;
            this.modal.showError('Failed to assign task. Please try again.');
        }
    }

    /**
     * Get selected assignee
     * @returns Selected assignee name
     */
    getSelectedAssignee(): string | null {
        return this.currentAssignee;
    }

    /**
     * Set available assignees
     * @param assignees - List of assignees
     */
    setAvailableAssignees(assignees: string[]): void {
        this.availableAssignees = assignees;
        this.handleSearch(''); // Refresh list
    }

    /**
     * Add assignee to available list
     * @param assignee - Assignee to add
     */
    addAssignee(assignee: string): void {
        if (assignee && !this.availableAssignees.includes(assignee)) {
            this.availableAssignees.push(assignee);
            this.handleSearch(''); // Refresh list
        }
    }

    /**
     * Show assignee dropdown (static method)
     * @param taskId - Task ID
     * @param interactionHandler - Interaction handler instance
     * @param namespace - CSS namespace
     * @param onAssigneeSet - Callback when assignee is set
     * @param currentAssignee - Current assignee name
     * @param availableAssignees - Available assignees
     * @returns Modal instance
     */
    static show(taskId: string, interactionHandler: any, namespace: string = 'fancy-gst', onAssigneeSet: Function | null = null, currentAssignee: string = '', availableAssignees: string[] = []): AssigneeDropdown {
        const modal = new AssigneeDropdown(namespace);
        modal.show(taskId, interactionHandler, onAssigneeSet, currentAssignee, availableAssignees);
        return modal;
    }
}

export { AssigneeDropdown };

Logger.fgtlog('✅ Assignee Dropdown loaded successfully');