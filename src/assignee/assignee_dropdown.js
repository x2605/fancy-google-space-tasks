// assignee/assignee_dropdown.js - Assignee dropdown modal
fgtlog('👤 Assignee Dropdown loading...');

/**
 * Assignee dropdown modal for task assignment
 */
class AssigneeDropdown extends ModalBase {
    constructor(namespace = 'fancy-gst') {
        super(namespace);
        this.taskId = null;
        this.currentAssignee = null;
        this.onAssigneeSet = null;
        this.interactionHandler = null;
        this.availableAssignees = [];
        this.isLoading = false;
    }

    /**
     * Show assignee dropdown modal
     * @param {string} taskId - Task ID
     * @param {Object} interactionHandler - Interaction handler instance
     * @param {Function} onAssigneeSet - Callback when assignee is set
     * @param {string} currentAssignee - Current assignee name
     * @param {string[]} availableAssignees - List of available assignees
     */
    show(taskId, interactionHandler, onAssigneeSet = null, currentAssignee = '', availableAssignees = []) {
        this.taskId = taskId;
        this.interactionHandler = interactionHandler;
        this.onAssigneeSet = onAssigneeSet;
        this.currentAssignee = currentAssignee;
        this.availableAssignees = availableAssignees;

        // Create modal
        this.createModal({
            maxWidth: '400px',
            minWidth: '300px'
        });

        // Set modal content
        this.updateContent(this.generateAssigneeModalHTML());

        // Attach event handlers
        this.attachAssigneeModalHandlers();

        // Open modal
        this.open();

        // Focus search input
        setTimeout(() => {
            const searchInput = this.modal.querySelector(`.${this.namespace}-assignee-search`);
            if (searchInput) {
                searchInput.focus();
            }
        }, 100);

        fgtlog(`👤 Assignee dropdown opened for task: ${taskId}`);
    }

    /**
     * Generate assignee modal HTML content
     * @returns {string} - Modal content HTML
     */
    generateAssigneeModalHTML() {
        return `
            ${this.createHeader('Assign Task')}
            ${this.createBody(`
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
            ${this.createFooter([
                { text: 'Cancel', action: 'cancel' },
                { text: 'Assign', action: 'assign', primary: true, disabled: true }
            ])}
        `;
    }

    /**
     * Render assignee list HTML
     * @param {string} filter - Search filter
     * @returns {string} - Assignee list HTML
     */
    renderAssigneeList(filter = '') {
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
    attachAssigneeModalHandlers() {
        // Button handlers
        this.attachButtonHandlers({
            cancel: () => this.close(),
            assign: () => this.handleAssignTask()
        });

        // Search input handler
        const searchInput = this.modal.querySelector(`.${this.namespace}-assignee-search`);
        if (searchInput) {
            const cleanup = CoreEventUtils.addListener(searchInput, 'input',
                CoreEventUtils.debounce((event) => this.handleSearch(event.target.value), 300)
            );
            this.cleanupFunctions.push(cleanup);
        }

        // Assignee selection handlers
        this.attachAssigneeListHandlers();

        // Quick action handlers
        this.attachQuickActionHandlers();

        // Add member handler
        const addMemberBtn = this.modal.querySelector(`.${this.namespace}-add-member-btn`);
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
    attachAssigneeListHandlers() {
        const assigneeList = this.modal.querySelector(`#${this.namespace}-assignee-list`);
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
    attachQuickActionHandlers() {
        const quickActionButtons = this.modal.querySelectorAll(`.${this.namespace}-quick-action-btn`);

        quickActionButtons.forEach(button => {
            const cleanup = CoreEventUtils.addListener(button, 'click', (event) => {
                const action = event.target.dataset.action;
                this.handleQuickAction(action);
            });
            this.cleanupFunctions.push(cleanup);
        });
    }

    /**
     * Handle search input
     * @param {string} query - Search query
     */
    handleSearch(query) {
        const assigneeList = this.modal.querySelector(`#${this.namespace}-assignee-list`);
        if (assigneeList) {
            assigneeList.innerHTML = this.renderAssigneeList(query);
            this.attachAssigneeListHandlers();
        }
    }

    /**
     * Handle assignee selection
     * @param {Event} event - Click event
     */
    handleAssigneeSelect(event) {
        const assigneeItem = event.target.closest(`.${this.namespace}-assignee-item`);
        if (!assigneeItem) return;

        const assignee = assigneeItem.dataset.assignee;
        this.selectAssignee(assignee);
    }

    /**
     * Handle keyboard navigation for assignee items
     * @param {Event} event - Keydown event
     */
    handleAssigneeKeydown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.handleAssigneeSelect(event);
        }
    }

    /**
     * Select an assignee
     * @param {string} assignee - Assignee name
     */
    selectAssignee(assignee) {
        // Update current assignee
        this.currentAssignee = assignee;

        // Update visual selection
        const assigneeItems = this.modal.querySelectorAll(`.${this.namespace}-assignee-item`);
        assigneeItems.forEach(item => {
            item.classList.remove('selected');
            const indicator = item.querySelector(`.${this.namespace}-selected-indicator`);
            if (indicator) {
                indicator.remove();
            }
        });

        // Mark selected item
        const selectedItem = this.modal.querySelector(`[data-assignee="${assignee}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
            selectedItem.innerHTML += `<div class="${this.namespace}-selected-indicator">✓</div>`;
        }

        // Enable assign button
        const assignButton = this.modal.querySelector(`[data-action="assign"]`);
        if (assignButton) {
            assignButton.disabled = false;
        }

        // Update current assignee display
        this.updateCurrentAssigneeDisplay(assignee);
    }

    /**
     * Update current assignee display
     * @param {string} assignee - Assignee name
     */
    updateCurrentAssigneeDisplay(assignee) {
        const display = this.modal.querySelector(`.${this.namespace}-assignee-display`);
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
     * @param {string} action - Action type
     */
    handleQuickAction(action) {
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
    handleAddMember() {
        const name = prompt('Enter team member name or email:');
        if (name && name.trim()) {
            const cleanName = name.trim();
            if (!this.availableAssignees.includes(cleanName)) {
                this.availableAssignees.push(cleanName);
                this.handleSearch(''); // Refresh list
                CoreNotificationUtils.success(`Added ${cleanName} to team members`, this.namespace);
            } else {
                CoreNotificationUtils.info('Team member already exists', this.namespace);
            }
        }
    }

    /**
     * Handle assign task action
     */
    async handleAssignTask() {
        if (this.isLoading) {
            return; // Prevent double assignment
        }

        if (!this.interactionHandler || !this.taskId) {
            CoreNotificationUtils.error('Cannot assign task: missing handler or task ID', this.namespace);
            return;
        }

        try {
            this.isLoading = true;
            this.showLoading('Assigning task...');

            // Assign task through interaction handler (placeholder)
            // In a real implementation, this would update the task assignee
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated delay

            this.close();
            if (this.onAssigneeSet) {
                this.onAssigneeSet(this.currentAssignee);
            }

            const message = this.currentAssignee ?
                `Task assigned to ${this.currentAssignee}` :
                'Task unassigned';
            CoreNotificationUtils.success(message, this.namespace);

        } catch (error) {
            fgterror('Assign task error:', error);
            this.isLoading = false;
            this.showError('Failed to assign task. Please try again.');
        }
    }

    /**
     * Get selected assignee
     * @returns {string} - Selected assignee name
     */
    getSelectedAssignee() {
        return this.currentAssignee;
    }

    /**
     * Set available assignees
     * @param {string[]} assignees - List of assignees
     */
    setAvailableAssignees(assignees) {
        this.availableAssignees = assignees;
        this.handleSearch(''); // Refresh list
    }

    /**
     * Add assignee to available list
     * @param {string} assignee - Assignee to add
     */
    addAssignee(assignee) {
        if (assignee && !this.availableAssignees.includes(assignee)) {
            this.availableAssignees.push(assignee);
            this.handleSearch(''); // Refresh list
        }
    }

    /**
     * Show assignee dropdown (static method)
     * @param {string} taskId - Task ID
     * @param {Object} interactionHandler - Interaction handler instance
     * @param {string} namespace - CSS namespace
     * @param {Function} onAssigneeSet - Callback when assignee is set
     * @param {string} currentAssignee - Current assignee name
     * @param {string[]} availableAssignees - Available assignees
     * @returns {AssigneeDropdown} - Modal instance
     */
    static show(taskId, interactionHandler, namespace = 'fancy-gst', onAssigneeSet = null, currentAssignee = '', availableAssignees = []) {
        const modal = new AssigneeDropdown(namespace);
        modal.show(taskId, interactionHandler, onAssigneeSet, currentAssignee, availableAssignees);
        return modal;
    }
}

// Export to global scope
window.AssigneeDropdown = AssigneeDropdown;

fgtlog('✅ Assignee Dropdown loaded successfully');