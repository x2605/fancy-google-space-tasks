// modal/date_modal.js - Date picker modal
console.log('📅 Date Modal loading...');

/**
 * Date picker modal for setting task due dates
 */
class DateModal extends ModalBase {
    constructor(namespace = 'fancy-gst') {
        super(namespace);
        this.taskId = null;
        this.currentDate = null;
        this.onDateSet = null;
        this.interactionHandler = null;
    }

    /**
     * Show date modal for a task
     * @param {string} taskId - Task ID
     * @param {Object} interactionHandler - Interaction handler instance
     * @param {Function} onDateSet - Callback when date is set
     * @param {string} currentDate - Current date value (YYYY-MM-DD)
     */
    show(taskId, interactionHandler, onDateSet = null, currentDate = '') {
        this.taskId = taskId;
        this.interactionHandler = interactionHandler;
        this.onDateSet = onDateSet;
        this.currentDate = currentDate;

        // Create modal
        this.createModal({
            maxWidth: '400px',
            minWidth: '350px'
        });

        // Set modal content
        this.updateContent(this.generateDateModalHTML());

        // Attach event handlers
        this.attachDateModalHandlers();

        // Open modal
        this.open();

        console.log(`📅 Date modal opened for task: ${taskId}`);
    }

    /**
     * Generate date modal HTML content
     * @returns {string} - Modal content HTML
     */
    generateDateModalHTML() {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

        return `
            ${this.createHeader('Set Due Date')}
            ${this.createBody(`
                <div class="${this.namespace}-date-picker">
                    <!-- Quick date options -->
                    <div class="${this.namespace}-quick-dates">
                        <h4>Quick Options</h4>
                        <div class="${this.namespace}-quick-date-buttons">
                            <button class="${this.namespace}-quick-date-btn" data-quick-date="today" data-date="${today}">
                                📅 Today
                            </button>
                            <button class="${this.namespace}-quick-date-btn" data-quick-date="tomorrow" data-date="${tomorrow}">
                                📅 Tomorrow
                            </button>
                            <button class="${this.namespace}-quick-date-btn" data-quick-date="next-week" data-date="${nextWeek}">
                                📅 Next Week
                            </button>
                        </div>
                    </div>

                    <!-- Custom date picker -->
                    <div class="${this.namespace}-custom-date">
                        <h4>Custom Date</h4>
                        <div class="${this.namespace}-date-input-wrapper">
                            <label for="${this.namespace}-date-input">Select Date:</label>
                            <input type="date" 
                                   id="${this.namespace}-date-input"
                                   class="${this.namespace}-date-input" 
                                   value="${this.currentDate}"
                                   min="${today}">
                        </div>
                    </div>

                    <!-- Date preview -->
                    <div class="${this.namespace}-date-preview">
                        <div class="${this.namespace}-preview-label">Selected Date:</div>
                        <div class="${this.namespace}-preview-value">
                            ${this.currentDate ? this.formatDateForDisplay(this.currentDate) : 'No date selected'}
                        </div>
                    </div>

                    <!-- Time option (optional) -->
                    <div class="${this.namespace}-time-option">
                        <label>
                            <input type="checkbox" class="${this.namespace}-include-time" id="${this.namespace}-include-time">
                            Include specific time
                        </label>
                        <div class="${this.namespace}-time-inputs" style="display: none;">
                            <input type="time" class="${this.namespace}-time-input" value="09:00">
                        </div>
                    </div>
                </div>
            `)}
            ${this.createFooter([
                { text: 'Clear Date', action: 'clear', danger: true },
                { text: 'Cancel', action: 'cancel' },
                { text: 'Set Date', action: 'set', primary: true }
            ])}
        `;
    }

    /**
     * Attach date modal specific event handlers
     */
    attachDateModalHandlers() {
        // Button handlers
        this.attachButtonHandlers({
            clear: () => this.handleClearDate(),
            cancel: () => this.close(),
            set: () => this.handleSetDate()
        });

        // Quick date button handlers
        const quickDateButtons = this.modal.querySelectorAll(`.${this.namespace}-quick-date-btn`);
        quickDateButtons.forEach(button => {
            const cleanup = CoreEventUtils.addListener(button, 'click', (event) => {
                const date = event.target.dataset.date;
                this.selectDate(date);
            });
            this.cleanupFunctions.push(cleanup);
        });

        // Date input change handler
        const dateInput = this.modal.querySelector(`.${this.namespace}-date-input`);
        if (dateInput) {
            const cleanup = CoreEventUtils.addListener(dateInput, 'change', (event) => {
                this.selectDate(event.target.value);
            });
            this.cleanupFunctions.push(cleanup);
        }

        // Time checkbox handler
        const timeCheckbox = this.modal.querySelector(`.${this.namespace}-include-time`);
        const timeInputs = this.modal.querySelector(`.${this.namespace}-time-inputs`);
        if (timeCheckbox && timeInputs) {
            const cleanup = CoreEventUtils.addListener(timeCheckbox, 'change', (event) => {
                timeInputs.style.display = event.target.checked ? 'block' : 'none';
            });
            this.cleanupFunctions.push(cleanup);
        }

        // Enter key handler for date input
        if (dateInput) {
            const cleanup = CoreEventUtils.addListener(dateInput, 'keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.handleSetDate();
                }
            });
            this.cleanupFunctions.push(cleanup);
        }
    }

    /**
     * Select a date and update preview
     * @param {string} date - Selected date (YYYY-MM-DD)
     */
    selectDate(date) {
        this.currentDate = date;
        
        // Update date input
        const dateInput = this.modal.querySelector(`.${this.namespace}-date-input`);
        if (dateInput) {
            dateInput.value = date;
        }

        // Update preview
        const previewValue = this.modal.querySelector(`.${this.namespace}-preview-value`);
        if (previewValue) {
            previewValue.textContent = date ? this.formatDateForDisplay(date) : 'No date selected';
        }

        // Highlight selected quick date button
        const quickDateButtons = this.modal.querySelectorAll(`.${this.namespace}-quick-date-btn`);
        quickDateButtons.forEach(button => {
            button.classList.remove('selected');
            if (button.dataset.date === date) {
                button.classList.add('selected');
            }
        });
    }

    /**
     * Handle clear date action
     */
    async handleClearDate() {
        if (!this.interactionHandler || !this.taskId) {
            CoreNotificationUtils.error('Cannot clear date: missing handler or task ID', this.namespace);
            return;
        }

        try {
            this.showLoading('Clearing date...');
            
            // Clear date through interaction handler
            await this.interactionHandler.setTaskDate(this.taskId, '', () => {
                this.close();
                if (this.onDateSet) {
                    this.onDateSet('');
                }
                CoreNotificationUtils.success('Date cleared successfully', this.namespace);
            });

        } catch (error) {
            console.error('Clear date error:', error);
            this.showError('Failed to clear date. Please try again.');
        }
    }

    /**
     * Handle set date action
     */
    async handleSetDate() {
        if (!this.currentDate) {
            CoreNotificationUtils.warning('Please select a date first', this.namespace);
            return;
        }

        if (!this.interactionHandler || !this.taskId) {
            CoreNotificationUtils.error('Cannot set date: missing handler or task ID', this.namespace);
            return;
        }

        try {
            let finalDate = this.currentDate;
            
            // Include time if specified
            const timeCheckbox = this.modal.querySelector(`.${this.namespace}-include-time`);
            const timeInput = this.modal.querySelector(`.${this.namespace}-time-input`);
            
            if (timeCheckbox && timeCheckbox.checked && timeInput && timeInput.value) {
                finalDate = `${this.currentDate}T${timeInput.value}:00`;
            }

            this.showLoading('Setting date...');
            
            // Set date through interaction handler
            await this.interactionHandler.setTaskDate(this.taskId, finalDate, () => {
                this.close();
                if (this.onDateSet) {
                    this.onDateSet(finalDate);
                }
                CoreNotificationUtils.success('Date set successfully', this.namespace);
            });

        } catch (error) {
            console.error('Set date error:', error);
            this.showError('Failed to set date. Please try again.');
        }
    }

    /**
     * Format date for display
     * @param {string} dateString - Date string (YYYY-MM-DD)
     * @returns {string} - Formatted date
     */
    formatDateForDisplay(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString + 'T00:00:00');
            const today = new Date();
            const tomorrow = new Date(Date.now() + 86400000);
            
            // Check if it's today or tomorrow
            if (this.isSameDate(date, today)) {
                return 'Today (' + date.toLocaleDateString() + ')';
            } else if (this.isSameDate(date, tomorrow)) {
                return 'Tomorrow (' + date.toLocaleDateString() + ')';
            } else {
                return date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        } catch (error) {
            return dateString;
        }
    }

    /**
     * Check if two dates are the same day
     * @param {Date} date1 - First date
     * @param {Date} date2 - Second date
     * @returns {boolean} - Are same date
     */
    isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    /**
     * Get currently selected date
     * @returns {string} - Selected date (YYYY-MM-DD)
     */
    getSelectedDate() {
        return this.currentDate;
    }

    /**
     * Set date programmatically
     * @param {string} date - Date to set (YYYY-MM-DD)
     */
    setDate(date) {
        this.selectDate(date);
    }

    /**
     * Show date modal (static method)
     * @param {string} taskId - Task ID
     * @param {Object} interactionHandler - Interaction handler instance
     * @param {string} namespace - CSS namespace
     * @param {Function} onDateSet - Callback when date is set
     * @param {string} currentDate - Current date value
     * @returns {DateModal} - Modal instance
     */
    static show(taskId, interactionHandler, namespace = 'fancy-gst', onDateSet = null, currentDate = '') {
        const modal = new DateModal(namespace);
        modal.show(taskId, interactionHandler, onDateSet, currentDate);
        return modal;
    }
}

// Export to global scope
window.DateModal = DateModal;

console.log('✅ Date Modal loaded successfully');