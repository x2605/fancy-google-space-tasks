// modal/add_task_modal.js - Add new task modal
fgtlog('➕ Add Task Modal loading...');

/**
 * Add new task modal with title, description, and categories
 */
class AddTaskModal extends ModalBase {
    constructor(namespace = 'fancy-gst') {
        super(namespace);
        this.onTaskAdd = null;
        this.interactionHandler = null;
        this.existingCategories = [];
        this.selectedCategories = [];
        this.isAdding = false;
    }

    /**
     * Show add task modal
     * @param {Object} interactionHandler - Interaction handler instance
     * @param {Function} onTaskAdd - Callback when task is added
     * @param {string[]} existingCategories - List of existing categories for suggestions
     */
    show(interactionHandler, onTaskAdd = null, existingCategories = []) {
        this.interactionHandler = interactionHandler;
        this.onTaskAdd = onTaskAdd;
        this.existingCategories = existingCategories;
        this.selectedCategories = [];

        // Create modal
        this.createModal({
            maxWidth: '500px',
            minWidth: '400px'
        });

        // Set modal content
        this.updateContent(this.generateAddTaskModalHTML());

        // Attach event handlers
        this.attachAddTaskModalHandlers();

        // Open modal
        this.open();

        // Focus title input
        setTimeout(() => {
            const titleInput = this.modal.querySelector(`.${this.namespace}-task-title-input`);
            if (titleInput) {
                titleInput.focus();
            }
        }, 100);

        fgtlog('➕ Add task modal opened');
    }

    /**
     * Generate add task modal HTML content
     * @returns {string} - Modal content HTML
     */
    generateAddTaskModalHTML() {
        return `
            ${this.createHeader('Add New Task')}
            ${this.createBody(`
                <form class="${this.namespace}-add-task-form" autocomplete="off">
                    <!-- Task Title -->
                    <div class="${this.namespace}-form-group">
                        <label for="${this.namespace}-task-title-input" class="${this.namespace}-form-label">
                            Task Title <span class="${this.namespace}-required">*</span>
                        </label>
                        <input type="text" 
                               id="${this.namespace}-task-title-input"
                               class="${this.namespace}-task-title-input ${this.namespace}-form-input" 
                               placeholder="Enter task title..."
                               required
                               maxlength="1023">
                        <div class="${this.namespace}-input-help">
                            Tip: Use [Category] at the start for automatic categorization
                        </div>
                    </div>

                    <!-- Task Description -->
                    <div class="${this.namespace}-form-group">
                        <label for="${this.namespace}-task-desc-input" class="${this.namespace}-form-label">
                            Description
                        </label>
                        <textarea id="${this.namespace}-task-desc-input"
                                  class="${this.namespace}-task-desc-input ${this.namespace}-form-input" 
                                  placeholder="Add detailed description (optional)..."
                                  rows="3"
                                  maxlength="4095"></textarea>
                    </div>

                    <!-- Category Management -->
                    <div class="${this.namespace}-form-group">
                        <label class="${this.namespace}-form-label">Categories</label>
                        
                        <!-- Selected Categories Display -->
                        <div class="${this.namespace}-selected-categories" id="${this.namespace}-selected-categories">
                            <!-- Dynamic category badges will appear here -->
                        </div>

                        <!-- Category Input -->
                        <div class="${this.namespace}-category-input-wrapper">
                            <input type="text" 
                                   class="${this.namespace}-category-input ${this.namespace}-form-input" 
                                   placeholder="Add category..."
                                   list="${this.namespace}-category-suggestions"
                                   maxlength="50">
                            <button type="button" class="${this.namespace}-add-category-btn">Add</button>
                        </div>

                        <!-- Category Suggestions -->
                        <datalist id="${this.namespace}-category-suggestions">
                            ${this.existingCategories.map(cat =>
            `<option value="${CoreDOMUtils.escapeHtml(cat)}">`
        ).join('')}
                        </datalist>

                        <!-- Category Help -->
                        <div class="${this.namespace}-category-help">
                            <div class="${this.namespace}-help-text">
                                💡 Categories help organize your tasks. They'll appear as colored columns in the table.
                            </div>
                            ${this.existingCategories.length > 0 ? `
                                <details class="${this.namespace}-existing-categories">
                                    <summary>Existing Categories (${this.existingCategories.length})</summary>
                                    <div class="${this.namespace}-category-list">
                                        ${this.existingCategories.map((cat, index) =>
            CategoryUtils.getCategoryBadgeHTML(cat, 1, {
                className: `${this.namespace}-existing-category-badge`
            })
        ).join('')}
                                    </div>
                                </details>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Task Preview -->
                    <div class="${this.namespace}-form-group">
                        <label class="${this.namespace}-form-label">Preview</label>
                        <div class="${this.namespace}-task-preview" id="${this.namespace}-task-preview">
                            <div class="${this.namespace}-preview-title">New Task</div>
                            <div class="${this.namespace}-preview-desc">No description</div>
                            <div class="${this.namespace}-preview-categories">No categories</div>
                        </div>
                    </div>
                </form>
            `)}
            ${this.createFooter([
            { text: 'Cancel', action: 'cancel' },
            { text: 'Add Task', action: 'add', primary: true }
        ])}
        `;
    }

    /**
     * Attach add task modal specific event handlers
     */
    attachAddTaskModalHandlers() {
        // Form submission handlers
        const form = this.modal.querySelector(`.${this.namespace}-add-task-form`);
        if (form) {
            const cleanup = CoreEventUtils.handleFormSubmit(
                form,
                (data) => this.handleAddTask(),
                (form) => this.validateForm(form)
            );
            this.cleanupFunctions.push(cleanup);
        }

        // Button handlers
        this.attachButtonHandlers({
            cancel: () => this.close(),
            add: () => this.handleAddTask()
        });

        // Real-time input handlers
        this.attachInputHandlers();

        // Category management handlers
        this.attachCategoryHandlers();

        // Existing category badge click handlers
        this.attachExistingCategoryHandlers();
    }

    /**
     * Attach real-time input handlers
     */
    attachInputHandlers() {
        const titleInput = this.modal.querySelector(`.${this.namespace}-task-title-input`);
        const descInput = this.modal.querySelector(`.${this.namespace}-task-desc-input`);

        if (titleInput) {
            const cleanup1 = CoreEventUtils.addListener(titleInput, 'input',
                CoreEventUtils.debounce(() => this.updatePreview(), 200)
            );
            this.cleanupFunctions.push(cleanup1);

            // Auto-resize if needed
            const cleanup2 = CoreEventUtils.handleAutoResizeInput(titleInput);
            this.cleanupFunctions.push(cleanup2);
        }

        if (descInput) {
            const cleanup1 = CoreEventUtils.addListener(descInput, 'input',
                CoreEventUtils.debounce(() => this.updatePreview(), 200)
            );
            const cleanup2 = CoreEventUtils.handleAutoResizeInput(descInput);
            this.cleanupFunctions.push(cleanup1, cleanup2);
        }
    }

    /**
     * Attach category management handlers
     */
    attachCategoryHandlers() {
        const categoryInput = this.modal.querySelector(`.${this.namespace}-category-input`);
        const addCategoryBtn = this.modal.querySelector(`.${this.namespace}-add-category-btn`);

        if (categoryInput && addCategoryBtn) {
            // Add category button
            const cleanup1 = CoreEventUtils.addListener(addCategoryBtn, 'click', () => {
                this.addCategory(categoryInput.value.trim());
                categoryInput.value = '';
            });

            // Enter key in category input
            const cleanup2 = CoreEventUtils.addListener(categoryInput, 'keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.addCategory(categoryInput.value.trim());
                    categoryInput.value = '';
                }
            });

            this.cleanupFunctions.push(cleanup1, cleanup2);
        }
    }

    /**
     * Attach existing category badge handlers
     */
    attachExistingCategoryHandlers() {
        const existingBadges = this.modal.querySelectorAll(`.${this.namespace}-existing-category-badge`);

        existingBadges.forEach(badge => {
            const cleanup = CoreEventUtils.addListener(badge, 'click', (event) => {
                const category = event.target.dataset.category;
                if (category) {
                    this.addCategory(category);
                }
            });
            this.cleanupFunctions.push(cleanup);
        });
    }

    /**
     * Add category to selected list
     * @param {string} category - Category to add
     */
    addCategory(category) {
        if (!category || this.selectedCategories.includes(category)) {
            return;
        }

        // Validate category
        if (!CategoryParser.isValidCategory(category)) {
            CoreNotificationUtils.warning('Invalid category name', this.namespace);
            return;
        }

        // Clean and add category
        const cleanCategory = CategoryParser.cleanCategory(category);
        this.selectedCategories.push(cleanCategory);

        this.updateSelectedCategoriesDisplay();
        this.updatePreview();
    }

    /**
     * Remove category from selected list
     * @param {string} category - Category to remove
     */
    removeCategory(category) {
        const index = this.selectedCategories.indexOf(category);
        if (index > -1) {
            this.selectedCategories.splice(index, 1);
            this.updateSelectedCategoriesDisplay();
            this.updatePreview();
        }
    }

    /**
     * Update selected categories display
     */
    updateSelectedCategoriesDisplay() {
        const container = this.modal.querySelector(`#${this.namespace}-selected-categories`);
        if (!container) return;

        if (this.selectedCategories.length === 0) {
            container.innerHTML = '<div class="no-categories">No categories selected</div>';
            return;
        }

        const categoriesHTML = this.selectedCategories.map((category, index) => {
            const style = CategoryUtils.generateCategoryLevelStyle(index + 1, category);
            return `
                <span class="${this.namespace}-selected-category-badge" 
                      style="background: ${style.backgroundColor}; color: ${style.color};"
                      data-category="${CoreDOMUtils.escapeHtml(category)}">
                    ${CoreDOMUtils.escapeHtml(category)}
                    <button type="button" 
                            class="${this.namespace}-remove-category-btn" 
                            data-category="${CoreDOMUtils.escapeHtml(category)}" 
                            title="Remove category">&times;</button>
                </span>
            `;
        }).join('');

        container.innerHTML = categoriesHTML;

        // Attach remove handlers
        const removeButtons = container.querySelectorAll(`.${this.namespace}-remove-category-btn`);
        removeButtons.forEach(button => {
            const cleanup = CoreEventUtils.addListener(button, 'click', (event) => {
                event.stopPropagation();
                const category = event.target.dataset.category;
                this.removeCategory(category);
            });
            this.cleanupFunctions.push(cleanup);
        });
    }

    /**
     * Update task preview
     */
    updatePreview() {
        const titleInput = this.modal.querySelector(`.${this.namespace}-task-title-input`);
        const descInput = this.modal.querySelector(`.${this.namespace}-task-desc-input`);
        const previewTitle = this.modal.querySelector(`.${this.namespace}-preview-title`);
        const previewDesc = this.modal.querySelector(`.${this.namespace}-preview-desc`);
        const previewCategories = this.modal.querySelector(`.${this.namespace}-preview-categories`);

        if (!titleInput || !previewTitle) return;

        const title = titleInput.value.trim() || 'New Task';
        const description = descInput?.value.trim() || '';

        // Parse title for categories
        const parsed = CategoryParser.parseTaskTitle(title);

        // Update preview
        previewTitle.textContent = parsed.cleanTitle;

        if (previewDesc) {
            previewDesc.textContent = description || 'No description';
        }

        if (previewCategories) {
            const allCategories = [...new Set([...parsed.categories, ...this.selectedCategories])];
            if (allCategories.length > 0) {
                const categoriesHTML = allCategories.map((cat, index) =>
                    CategoryUtils.getCategoryBadgeHTML(cat, index + 1, {
                        className: `${this.namespace}-preview-category-badge`
                    })
                ).join('');
                previewCategories.innerHTML = categoriesHTML;
            } else {
                previewCategories.textContent = 'No categories';
            }
        }
    }

    /**
     * Validate form data
     * @param {HTMLFormElement} form - Form element
     * @returns {boolean} - Is valid
     */
    validateForm(form) {
        const titleInput = form.querySelector(`.${this.namespace}-task-title-input`);

        if (!titleInput || !titleInput.value.trim()) {
            CoreNotificationUtils.warning('Task title is required', this.namespace);
            titleInput?.focus();
            return false;
        }

        return true;
    }

    /**
     * Handle add task action
     */
    async handleAddTask() {
        if (this.isAdding) {
            return; // Prevent double submission
        }

        const titleInput = this.modal.querySelector(`.${this.namespace}-task-title-input`);
        const descInput = this.modal.querySelector(`.${this.namespace}-task-desc-input`);

        if (!this.validateForm(this.modal)) {
            return;
        }

        const title = titleInput.value.trim();
        const description = descInput?.value.trim() || '';

        // Combine categories from title parsing and manual selection
        const parsed = CategoryParser.parseTaskTitle(title);
        const finalTitle = CategoryParser.reconstructTitle(
            [...new Set([...parsed.categories, ...this.selectedCategories])],
            parsed.cleanTitle
        );

        if (!this.interactionHandler) {
            CoreNotificationUtils.error('Cannot add task: missing interaction handler', this.namespace);
            return;
        }

        try {
            this.isAdding = true;
            this.showLoading('Adding task...');

            // Add task through interaction handler
            await this.interactionHandler.addTask(finalTitle, description, () => {
                this.close();
                if (this.onTaskAdd) {
                    this.onTaskAdd({
                        title: finalTitle,
                        description: description,
                        categories: [...new Set([...parsed.categories, ...this.selectedCategories])]
                    });
                }
                CoreNotificationUtils.success('Task added successfully', this.namespace);
            });

        } catch (error) {
            fgterror('Add task error:', error);
            this.isAdding = false;
            this.showError('Failed to add task. Please try again.');
        }
    }

    /**
     * Get form data
     * @returns {Object} - Form data
     */
    getFormData() {
        const titleInput = this.modal?.querySelector(`.${this.namespace}-task-title-input`);
        const descInput = this.modal?.querySelector(`.${this.namespace}-task-desc-input`);

        const title = titleInput?.value.trim() || '';
        const description = descInput?.value.trim() || '';
        const parsed = CategoryParser.parseTaskTitle(title);

        return {
            originalTitle: title,
            cleanTitle: parsed.cleanTitle,
            description: description,
            categories: [...new Set([...parsed.categories, ...this.selectedCategories])],
            finalTitle: CategoryParser.reconstructTitle(
                [...new Set([...parsed.categories, ...this.selectedCategories])],
                parsed.cleanTitle
            )
        };
    }

    /**
     * Clear form
     */
    clearForm() {
        const titleInput = this.modal?.querySelector(`.${this.namespace}-task-title-input`);
        const descInput = this.modal?.querySelector(`.${this.namespace}-task-desc-input`);

        if (titleInput) titleInput.value = '';
        if (descInput) descInput.value = '';

        this.selectedCategories = [];
        this.updateSelectedCategoriesDisplay();
        this.updatePreview();
    }

    /**
     * Show add task modal (static method)
     * @param {Object} interactionHandler - Interaction handler instance
     * @param {string} namespace - CSS namespace
     * @param {Function} onTaskAdd - Callback when task is added
     * @param {string[]} existingCategories - Existing categories for suggestions
     * @returns {AddTaskModal} - Modal instance
     */
    static show(interactionHandler, namespace = 'fancy-gst', onTaskAdd = null, existingCategories = []) {
        const modal = new AddTaskModal(namespace);
        modal.show(interactionHandler, onTaskAdd, existingCategories);
        return modal;
    }
}

// Export to global scope
window.AddTaskModal = AddTaskModal;

fgtlog('✅ Add Task Modal loaded successfully');