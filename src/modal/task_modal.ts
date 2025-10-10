// modal/task_modal.ts - Unified task modal for edit/create operations
import * as Logger from '@/core/logger';
import { ModalBase } from '@/modal/modal_base';
import { CoreNotificationUtils } from '@/core/notification_utils';
import { CategoryParser } from '@/category/category_parser';
import { CoreEventUtils } from '@/core/event_utils';
import { CoreDOMUtils } from '@/core/dom_utils';
import { CategoryUtils } from '@/category/category_utils';

Logger.fgtlog('📝 Task Modal loading...');

/**
 * Unified task modal for editing and creating tasks
 * Handles all task modal operations with category management
 */
class TaskModal extends ModalBase {
    taskId: string | null;
    actionType: string;
    originalTask: any;
    currentCategories: string[];
    allExistingCategories: string[];
    onConfirm: Function | null;
    onCancel: Function | null;
    interactionHandler: any;
    isProcessing: boolean;

    constructor(namespace: string = 'fancy-gst') {
        super(namespace);
        
        // Modal state
        this.taskId = null;
        this.actionType = 'edit'; // 'edit', 'newAtTop', 'newAtAfter', 'newAtBefore'
        this.originalTask = null;
        this.currentCategories = [];
        this.allExistingCategories = []; // For dropdown suggestions
        
        // Callbacks
        this.onConfirm = null;
        this.onCancel = null;
        this.interactionHandler = null;
        
        // State flags
        this.isProcessing = false;
    }

    /**
     * Show task modal with specified mode
     * @param options - Modal options
     */
    show(options: any = {}): void {
        const {
            taskId = '',
            actionType = 'edit',
            taskData = null,
            interactionHandler = null,
            allCategories = [],
            onConfirm = null,
            onCancel = null
        } = options;

        // If taskId is empty, force newAtTop regardless of actionType
        if (!taskId || taskId === '') {
            this.taskId = '';
            this.actionType = 'newAtTop';
            this.originalTask = null;
            this.currentCategories = [];
        } else {
            this.taskId = taskId;
            this.actionType = actionType;
            this.originalTask = taskData;
            
            // Set initial categories based on action type
            if (taskData && taskData.categories) {
                if (actionType === 'edit' || actionType === 'newAtTop') {
                    // Copy all data including categories
                    this.currentCategories = [...taskData.categories];
                } else {
                    // newAtAfter or newAtBefore: copy only categories
                    this.currentCategories = [...taskData.categories];
                }
            } else {
                this.currentCategories = [];
            }
        }

        this.interactionHandler = interactionHandler;
        this.allExistingCategories = allCategories;
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;

        // Create modal with specific options - Use 'large' size instead of maxWidth
        this.createModal({
            size: 'large',
            closeOnBackdrop: false, // Cannot close by clicking backdrop
            closeOnEscape: true // Can close with ESC key
        });

        // Set modal content
        this.updateContent(this.generateTaskModalHTML());

        // Attach event handlers
        this.attachTaskModalHandlers();

        // Open modal
        this.open(() => {
            // Modal closed without confirmation
            if (this.onCancel) {
                this.onCancel();
            }
        });

        Logger.fgtlog('📝 Task modal opened: ' + this.actionType + ' for task ' + (this.taskId || 'new'));
    }

    /**
     * Generate modal title based on action type
     * @returns Modal title
     */
    getModalTitle(): string {
        switch (this.actionType) {
            case 'edit':
                return `Edit a task : ${this.getFullTaskTitle()}`;
            case 'newAtTop':
                return 'New task at top';
            case 'newAtAfter':
                return `New task after a task : ${this.getFullTaskTitle()}`;
            case 'newAtBefore':
                return `New task before a task : ${this.getFullTaskTitle()}`;
            default:
                return 'Task Modal';
        }
    }

    /**
     * Get full task title with categories
     * @returns Full title with [categories]
     */
    getFullTaskTitle(): string {
        if (!this.originalTask) {
            return '';
        }
        
        const categoryPrefix = this.originalTask.categories && this.originalTask.categories.length > 0
            ? this.originalTask.categories.map((cat: string) => `[${cat}]`).join('')
            : '';
        
        // Use nullish coalescing to preserve empty strings
        // Only replace null/undefined with empty string
        const title = this.originalTask.displayTitle ?? '';
        
        return `${categoryPrefix}${title}`;
    }

    /**
     * Get initial title value (without categories)
     * @returns Title text
     */
    getInitialTitle(): string {
        if (!this.originalTask) {
            return '';
        }
        
        if (this.actionType === 'edit' || this.actionType === 'newAtTop') {
            return this.originalTask.displayTitle || '';
        }
        
        // For newAtAfter/Before, start with empty title
        return '';
    }

    /**
     * Get initial description value
     * @returns Description text
     */
    getInitialDescription(): string {
        if (!this.originalTask) {
            return '';
        }
        
        if (this.actionType === 'edit' || this.actionType === 'newAtTop') {
            return this.originalTask.description || '';
        }
        
        // For newAtAfter/Before, start with empty description
        return '';
    }

    /**
     * Generate task modal HTML content
     * @returns Modal content HTML
     */
    generateTaskModalHTML(): string {
        return `
            ${this.createHeader(this.getModalTitle(), true)}
            ${this.createBody(`
                <div class="${this.namespace}-task-modal-content">
                    <!-- Category badges section -->
                    <div class="${this.namespace}-form-group">
                        <label class="${this.namespace}-form-label">Categories</label>
                        <div class="${this.namespace}-category-badges" id="${this.namespace}-category-badges">
                            ${this.renderCategoryBadges()}
                        </div>
                        <button type="button" 
                                class="${this.namespace}-add-subcategory-btn" 
                                id="${this.namespace}-add-subcategory-btn"
                                title="Add subcategory">
                            ➕ Add subcategory
                        </button>
                    </div>

                    <!-- Title input -->
                    <div class="${this.namespace}-form-group">
                        <label for="${this.namespace}-task-title-input" class="${this.namespace}-form-label">
                            Title
                        </label>
                        <input type="text" 
                               id="${this.namespace}-task-title-input"
                               class="${this.namespace}-task-title-input ${this.namespace}-form-input" 
                               placeholder="Enter task title or [Category] to add category..."
                               value="${CoreDOMUtils.escapeHtml(this.getInitialTitle())}">
                    </div>

                    <!-- Description textarea -->
                    <div class="${this.namespace}-form-group">
                        <label for="${this.namespace}-task-desc-input" class="${this.namespace}-form-label">
                            Description
                        </label>
                        <textarea id="${this.namespace}-task-desc-input"
                                  class="${this.namespace}-task-desc-input ${this.namespace}-form-input" 
                                  placeholder="Enter task description..."
                                  rows="3">${CoreDOMUtils.escapeHtml(this.getInitialDescription())}</textarea>
                    </div>

                    <!-- Due Date display (read-only for now) -->
                    ${this.originalTask && this.originalTask.date ? `
                    <div class="${this.namespace}-form-group">
                        <label class="${this.namespace}-form-label">Due Date</label>
                        <div class="${this.namespace}-readonly-field">
                            ${CoreDOMUtils.escapeHtml(this.originalTask.date)}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Assignee display (read-only for now) -->
                    ${this.originalTask && this.originalTask.assignee && this.originalTask.assignee !== '😶' ? `
                    <div class="${this.namespace}-form-group">
                        <label class="${this.namespace}-form-label">Assignee</label>
                        <div class="${this.namespace}-readonly-field">
                            ${CoreDOMUtils.escapeHtml(this.originalTask.assignee)}
                        </div>
                    </div>
                    ` : ''}
                </div>
            `)}
            ${this.createFooter([
                { text: 'Cancel', action: 'cancel' },
                { text: 'Confirm', action: 'confirm', primary: true }
            ])}
        `;
    }

    /**
     * Render category badges HTML
     * @returns Badges HTML
     */
    renderCategoryBadges(): string {
        if (this.currentCategories.length === 0) {
            return `<div class="${this.namespace}-no-categories">No categories</div>`;
        }

        return this.currentCategories.map((category, index) => {
            const seed = CategoryUtils.generateCategorySeed(this.currentCategories, index);
            const colorStyle = this.generateCategoryColor(seed, index);
            
            return `
                <div class="${this.namespace}-category-badge" 
                     data-category-index="${index}"
                     data-category="${CoreDOMUtils.escapeHtml(category)}"
                     style="background-color: ${colorStyle.backgroundColor}; color: ${colorStyle.color};">
                    <span class="${this.namespace}-badge-text">${CoreDOMUtils.escapeHtml(category)}</span>
                    <button type="button" 
                            class="${this.namespace}-badge-remove" 
                            data-category-index="${index}"
                            title="Remove category">×</button>
                </div>
            `;
        }).join('');
    }

    /**
     * Generate category color (simplified version from TableRenderer)
     * @param seed - Category seed
     * @param level - Category level
     * @returns Color style object
     */
    generateCategoryColor(seed: string, level: number): any {
        const hue = CategoryUtils.generateHueFromSeed(seed);
        const saturation = 65 + (level * 5) % 20;
        const lightness = 85 + (level * 5) % 15;
        
        const backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        
        return {
            backgroundColor: backgroundColor,
            color: '#000', // Always black text
            borderColor: '#000'
        };
    }

    /**
     * Attach task modal event handlers
     */
    attachTaskModalHandlers(): void {
        // Button handlers
        this.attachButtonHandlers({
            cancel: () => this.handleCancel(),
            confirm: () => this.handleConfirm()
        });

        // Title input blur event - detect [Category] pattern
        const titleInput = this.modal!.querySelector(`#${this.namespace}-task-title-input`);
        if (titleInput) {
            const cleanup1 = CoreEventUtils.addListener(titleInput, 'blur', () => {
                this.handleTitleBlur();
            });
            this.cleanupFunctions.push(cleanup1);
        }

        // Category badge remove button
        const badgeContainer = this.modal!.querySelector(`#${this.namespace}-category-badges`);
        if (badgeContainer) {
            const cleanup2 = CoreEventUtils.delegate(
                badgeContainer,
                `.${this.namespace}-badge-remove`,
                'click',
                (event: any) => this.handleRemoveBadge(event)
            );
            this.cleanupFunctions.push(cleanup2);

            // Category badge click (for dropdown)
            const cleanup3 = CoreEventUtils.delegate(
                badgeContainer,
                `.${this.namespace}-category-badge`,
                'click',
                (event: any) => this.handleBadgeClick(event)
            );
            this.cleanupFunctions.push(cleanup3);
        }

        // Add subcategory button
        const addSubcategoryBtn = this.modal!.querySelector(`#${this.namespace}-add-subcategory-btn`);
        if (addSubcategoryBtn) {
            const cleanup4 = CoreEventUtils.addListener(addSubcategoryBtn, 'click', () => {
                this.handleAddSubcategory();
            });
            this.cleanupFunctions.push(cleanup4);
        }
    }

    /**
     * Handle title input blur - detect and extract [Category]
     */
    handleTitleBlur(): void {
        const titleInput = this.modal!.querySelector(`#${this.namespace}-task-title-input`) as HTMLInputElement;
        if (!titleInput) return;

        const text = titleInput.value;
        
        // Check if text starts with [Category] pattern
        const categoryMatch = text.match(/^\[([^\]]+)\]/);
        
        if (categoryMatch) {
            const newCategory = categoryMatch[1].trim();
            
            if (newCategory && CategoryParser.isValidCategory(newCategory)) {
                // Add category to the end
                this.currentCategories.push(newCategory);
                
                // Remove [Category] from title
                titleInput.value = text.substring(categoryMatch[0].length).trim();
                
                // Re-render badges
                this.updateCategoryBadges();
                
                Logger.fgtlog('✅ Added category from title: ' + newCategory);
            } else {
                CoreNotificationUtils.warning('Invalid category name', this.namespace);
            }
        }
    }

    /**
     * Handle category badge remove
     * @param event - Click event
     */
    handleRemoveBadge(event: any): void {
        event.stopPropagation(); // Prevent badge click event
        
        const button = event.currentTarget;
        const categoryIndex = parseInt(button.dataset.categoryIndex);
        const category = this.currentCategories[categoryIndex];
        
        // Show confirmation
        if (confirm(`Remove category "${category}"?`)) {
            this.currentCategories.splice(categoryIndex, 1);
            this.updateCategoryBadges();
            Logger.fgtlog('🗑️ Removed category: ' + category);
        }
    }

    /**
     * Handle category badge click
     * @param event - Click event
     */
    handleBadgeClick(event: any): void {
        const badge = event.currentTarget;
        const categoryIndex = parseInt(badge.dataset.categoryIndex);
        
        Logger.fgtlog('🏷️ Badge clicked: index ' + categoryIndex);
    }

    /**
     * Handle add subcategory button
     */
    handleAddSubcategory(): void {
        const newCategory = prompt('Enter new subcategory name:');
        
        if (newCategory) {
            const cleanCategory = CategoryParser.cleanCategory(newCategory);
            
            if (CategoryParser.isValidCategory(cleanCategory)) {
                this.currentCategories.push(cleanCategory);
                this.updateCategoryBadges();
                Logger.fgtlog('➕ Added subcategory: ' + cleanCategory);
            } else {
                CoreNotificationUtils.warning('Invalid category name', this.namespace);
            }
        }
    }

    /**
     * Update category badges display
     */
    updateCategoryBadges(): void {
        const badgeContainer = this.modal!.querySelector(`#${this.namespace}-category-badges`);
        if (badgeContainer) {
            badgeContainer.innerHTML = this.renderCategoryBadges();
        }
    }

    /**
     * Handle cancel button
     */
    handleCancel(): void {
        this.close();
        if (this.onCancel) {
            this.onCancel();
        }
    }

    /**
     * Handle confirm button - UPDATED to use editTask interaction
     */
    handleConfirm(): void {
        if (this.isProcessing) {
            return; // Prevent double submission
        }
        
        // Get input values
        const titleInput = this.modal!.querySelector(`#${this.namespace}-task-title-input`) as HTMLInputElement;
        const descInput = this.modal!.querySelector(`#${this.namespace}-task-desc-input`) as HTMLTextAreaElement;
        
        const title = titleInput?.value.trim() || '';
        const description = descInput?.value.trim() || '';
        
        // Validate: either category or title must exist
        if (this.currentCategories.length === 0 && title === '') {
            CoreNotificationUtils.warning('Please add at least a category or title', this.namespace);
            titleInput?.focus();
            return;
        }
        
        // Construct full title with categories
        const fullTitle = CategoryParser.reconstructTitle(this.currentCategories, title);
        
        // Get original values for comparison
        const originalFullTitle = this.originalTask ? 
            CategoryParser.reconstructTitle(
                this.originalTask.categories || [], 
                this.originalTask.displayTitle || ''
            ) : '';
        const originalDescription = this.originalTask?.description || '';
        
        // Check if in edit mode and has valid taskId
        if (this.actionType === 'edit' && this.taskId && this.taskId !== '') {
            // Lock UI to prevent interaction
            this.isProcessing = true;
            CoreDOMUtils.enableLockStyles();
            this.showLoading('Updating task...');
            
            Logger.fgtlog('📝 Starting task edit operation...');
            
            // Call editTask interaction
            this.interactionHandler.editTask(
                this.taskId,
                fullTitle,
                description,
                originalFullTitle,
                originalDescription,
                () => {
                    // Success callback
                    Logger.fgtlog('✅ Task edit completed');
                    
                    // Unlock UI
                    CoreDOMUtils.disableLockStyles();
                    this.isProcessing = false;
                    
                    // Close modal
                    this.close();
                    
                    // Call original confirm callback
                    if (this.onConfirm) {
                        this.onConfirm({
                            taskId: this.taskId,
                            actionType: this.actionType,
                            title: fullTitle,
                            cleanTitle: title,
                            description: description,
                            categories: this.currentCategories
                        });
                    }
                }
            ).catch((error: any) => {
                // Error callback
                Logger.fgterror('❌ Task edit failed: ' + error.message);
                
                // Unlock UI
                CoreDOMUtils.disableLockStyles();
                this.isProcessing = false;
                
                // Show error in modal
                this.showError('Failed to update task: ' + error.message);
            });
            
        } else {
            // New task creation (not implemented yet)
            this.close();
            
            CoreNotificationUtils.info(
                `Coming soon: ${this.actionType} operation with title "${fullTitle}"`,
                this.namespace
            );
            
            if (this.onConfirm) {
                this.onConfirm({
                    taskId: this.taskId,
                    actionType: this.actionType,
                    title: fullTitle,
                    cleanTitle: title,
                    description: description,
                    categories: this.currentCategories
                });
            }
        }
    }
    /**
     * Show task modal (static method)
     * @param options - Modal options
     * @returns Modal instance
     */
    static show(options: any): TaskModal {
        const modal = new TaskModal(options.namespace || 'fancy-gst');
        modal.show(options);
        return modal;
    }
}

export { TaskModal };

Logger.fgtlog('✅ Task Modal loaded successfully');