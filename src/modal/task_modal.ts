// modal/task_modal.ts - Unified task modal for edit/create operations
import * as Logger from '@/core/logger';
import { ModalBase } from '@/modal/modal_base';
import { CoreNotificationUtils } from '@/core/notification_utils';
import { CategoryParser } from '@/category/category_parser';
import { CoreEventUtils } from '@/core/event_utils';
import { CoreDOMUtils } from '@/core/dom_utils';
import { CategoryUtils } from '@/category/category_utils';
import { parseNaturalDate, formatDateForModal } from '@/manipulator/task_element/date_button/date_parser';
import { OgtFinder } from '@/manipulator/finder';

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
    allExistingCategories: string[][];
    onConfirm: Function | null;
    onCancel: Function | null;
    interactionHandler: any;
    isProcessing: boolean;
    categoryDropdown: HTMLElement | null;
    dropdownCleanup: Function | null;
    toBeAddedTaskElement: any;
    lastBadgeRemoveTime: number;

    constructor(namespace: string = 'fancy-gst') {
        super(namespace);

        // Modal state
        this.taskId = null;
        this.actionType = 'edit';
        this.originalTask = null;
        this.currentCategories = [];
        this.allExistingCategories = [];

        // Callbacks
        this.onConfirm = null;
        this.onCancel = null;
        this.interactionHandler = null;

        // State flags
        this.isProcessing = false;
        this.categoryDropdown = null;
        this.dropdownCleanup = null;
        this.toBeAddedTaskElement = null;
        this.lastBadgeRemoveTime = 0;
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
            onCancel = null,
            toBeAddedTaskElement = null
        } = options;

        // Store toBeAddedTaskElement
        this.toBeAddedTaskElement = toBeAddedTaskElement;

        // If taskId is empty and not toBeAdded mode, force newAtTop
        if ((!taskId || taskId === '') && actionType !== 'toBeAdded') {
            this.taskId = '';
            this.actionType = 'newAtTop';
            this.originalTask = null;
            this.currentCategories = [];
        } else if (actionType === 'toBeAdded') {
            // ToBeAdded mode
            this.taskId = '';
            this.actionType = 'toBeAdded';
            this.originalTask = taskData;

            // Set initial categories from taskData
            if (taskData && taskData.categories) {
                this.currentCategories = [...taskData.categories];
            } else {
                this.currentCategories = [];
            }
        } else {
            this.taskId = taskId;
            this.actionType = actionType;
            this.originalTask = taskData;

            // Set initial categories based on action type
            if (taskData && taskData.categories) {
                if (actionType === 'edit' || actionType === 'newAtTop') {
                    this.currentCategories = [...taskData.categories];
                } else {
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

        // Create modal
        this.createModal({
            size: 'large',
            closeOnBackdrop: false,
            closeOnEscape: true
        });

        // Set modal content
        this.updateContent(this.generateTaskModalHTML());

        // Attach event handlers
        this.attachTaskModalHandlers();

        // Open modal
        this.open(() => {
            if (this.onCancel) {
                this.onCancel();
            }
        });

        Logger.fgtlog('📝 Task modal opened: ' + this.actionType + ' for task ' + (this.taskId || 'new'));
    }

    /**
     * Generate modal title based on action type
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
            case 'toBeAdded':
                return 'Add new task';
            default:
                return 'Task Modal';
        }
    }

    /**
     * Get full task title with categories
     */
    getFullTaskTitle(): string {
        if (!this.originalTask) {
            return '';
        }
        
        const categoryPrefix = this.originalTask.categories && this.originalTask.categories.length > 0
            ? this.originalTask.categories.map((cat: string) => `[${cat}]`).join('')
            : '';
        
        const title = this.originalTask.displayTitle ?? '';
        
        return `${categoryPrefix}${title}`;
    }

    /**
     * Get initial title value (without categories)
     */
    getInitialTitle(): string {
        if (!this.originalTask) {
            return '';
        }

        if (this.actionType === 'edit' || this.actionType === 'newAtTop' || this.actionType === 'toBeAdded') {
            return this.originalTask.displayTitle || '';
        }

        return '';
    }

    /**
     * Get initial description value
     */
    getInitialDescription(): string {
        if (!this.originalTask) {
            return '';
        }

        if (this.actionType === 'edit' || this.actionType === 'newAtTop' || this.actionType === 'toBeAdded') {
            return this.originalTask.description || '';
        }

        return '';
    }

    /**
     * Generate task modal HTML content
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

                    <!-- Title textarea (multiline support for mobile compatibility) -->
                    <div class="${this.namespace}-form-group">
                        <label for="${this.namespace}-task-title-input" class="${this.namespace}-form-label">
                            Title
                        </label>
                        <textarea id="${this.namespace}-task-title-input"
                                  class="${this.namespace}-task-title-input ${this.namespace}-form-input"
                                  placeholder="Enter task title or [Category] to add category..."
                                  rows="2">${CoreDOMUtils.escapeHtml(this.getInitialTitle())}</textarea>
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

                    <!-- Set Date/Time display -->
                    ${this.originalTask && this.originalTask.date ? `
                    <div class="${this.namespace}-form-group">
                        <label class="${this.namespace}-form-label">Set Date/Time</label>
                        <div class="${this.namespace}-readonly-field">
                            ${this.getFormattedDueDate()}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Assignee display -->
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
     * Get formatted due date for modal display
     */
    getFormattedDueDate(): string {
        if (!this.originalTask || !this.originalTask.date || !this.originalTask.dateFull) {
            return 'No date';
        }
        
        // Parse date using the same logic as date button
        const locale = document.documentElement.lang || 'en';
        const dateInfo = parseNaturalDate(this.originalTask.dateFull, this.originalTask.date, locale);
        return formatDateForModal(dateInfo);
    }

    /**
     * Render category badges HTML
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
     * Generate category color
     */
    generateCategoryColor(seed: string, level: number): any {
        const hue = CategoryUtils.generateHueFromSeed(seed);
        const saturation = 65 + (level * 5) % 20;
        const lightness = 85 + (level * 5) % 15;
        
        const backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        
        return {
            backgroundColor: backgroundColor,
            color: '#000',
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

        // Title input blur event
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
            const cleanup4 = CoreEventUtils.addListener(addSubcategoryBtn, 'click', (event: Event) => {
                this.handleAddSubcategory(event);
            });
            this.cleanupFunctions.push(cleanup4);
        }
    }

    /**
     * Handle title input blur - detect and extract [Category]
     */
    handleTitleBlur(): void {
        const titleInput = this.modal!.querySelector(`#${this.namespace}-task-title-input`) as HTMLTextAreaElement;
        if (!titleInput) return;

        const text = titleInput.value;
        const categoryMatch = text.match(/^\[([^\]]+)\]/);
        
        if (categoryMatch) {
            const newCategory = categoryMatch[1].trim();
            
            if (newCategory && CategoryParser.isValidCategory(newCategory)) {
                this.currentCategories.push(newCategory);
                titleInput.value = text.substring(categoryMatch[0].length).trim();
                this.updateCategoryBadges();
                Logger.fgtlog('✅ Added category from title: ' + newCategory);
            } else {
                CoreNotificationUtils.warning('Invalid category name', this.namespace);
            }
        }
    }

    /**
     * Handle category badge remove
     */
    handleRemoveBadge(event: any): void {
        event.stopPropagation();

        // Prevent rapid consecutive clicks (within 500ms)
        const now = Date.now();
        if (now - this.lastBadgeRemoveTime < 500) {
            Logger.fgtlog('⚠️ Badge remove ignored (too fast)');
            return;
        }
        this.lastBadgeRemoveTime = now;

        const button = event.currentTarget;
        const categoryIndex = parseInt(button.dataset.categoryIndex);
        const category = this.currentCategories[categoryIndex];

        // Remove category without confirmation
        this.currentCategories.splice(categoryIndex, 1);
        this.updateCategoryBadges();
        Logger.fgtlog('🗑️ Removed category: ' + category);
    }

    /**
     * Handle category badge click - show dropdown
     */
    handleBadgeClick(event: any): void {
        // Prevent badge remove button from triggering this
        if (event.target.classList.contains(`${this.namespace}-badge-remove`)) {
            return;
        }

        event.stopPropagation();
        
        const badge = event.currentTarget;
        const categoryIndex = parseInt(badge.dataset.categoryIndex);
        
        Logger.fgtlog('🏷️ Badge clicked: index ' + categoryIndex);
        
        // Close any existing dropdown
        this.closeCategoryDropdown();
        
        // Show dropdown for this badge
        this.showCategoryDropdown(badge, categoryIndex);
    }

    /**
     * Show category dropdown menu
     */
    showCategoryDropdown(badge: HTMLElement, categoryIndex: number): void {
        // Get same level categories
        const sameLevelCategories = this.getSameLevelCategories(categoryIndex);
        
        // Create dropdown element
        const dropdown = document.createElement('div');
        dropdown.className = `${this.namespace}-category-dropdown`;
        dropdown.id = `${this.namespace}-category-dropdown`;
        
        // Build dropdown content
        let dropdownHTML = '';
        
        // Modify option
        dropdownHTML += `
            <div class="${this.namespace}-dropdown-item modify-option" data-action="modify">
                ✏️ Modify
            </div>
        `;
        
        // Same level categories
        if (sameLevelCategories.length > 0) {
            dropdownHTML += `<div class="${this.namespace}-dropdown-divider"></div>`;
            
            sameLevelCategories.forEach(categoryName => {
                dropdownHTML += `
                    <div class="${this.namespace}-dropdown-item category-option" 
                         data-action="switch" 
                         data-category-name="${CoreDOMUtils.escapeHtml(categoryName)}">
                        ${CoreDOMUtils.escapeHtml(categoryName)}
                    </div>
                `;
            });
        }
        
        dropdown.innerHTML = dropdownHTML;
        
        // Calculate position
        const rect = badge.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.minWidth = `${rect.width}px`;
        
        // Add to document
        document.body.appendChild(dropdown);
        this.categoryDropdown = dropdown;
        
        // Attach dropdown event handlers
        const modifyOption = dropdown.querySelector('.modify-option');
        if (modifyOption) {
            const cleanup1 = CoreEventUtils.addListener(modifyOption, 'click', () => {
                this.handleModifyCategory(categoryIndex);
            });
            
            this.dropdownCleanup = () => {
                cleanup1();
                // Clean up other handlers below
            };
        }
        
        const categoryOptions = dropdown.querySelectorAll('.category-option');
        categoryOptions.forEach(option => {
            const cleanup2 = CoreEventUtils.addListener(option, 'click', () => {
                const categoryName = option.getAttribute('data-category-name');
                if (categoryName) {
                    this.handleSwitchCategory(categoryIndex, categoryName);
                }
            });
            
            // Add to cleanup chain
            if (this.dropdownCleanup) {
                const prevCleanup = this.dropdownCleanup;
                this.dropdownCleanup = () => {
                    prevCleanup();
                    cleanup2();
                };
            }
        });
        
        // Close dropdown on outside click
        const outsideClickCleanup = CoreEventUtils.addListener(document, 'click', (e: any) => {
            if (!dropdown.contains(e.target) && e.target !== badge) {
                this.closeCategoryDropdown();
            }
        });
        
        // Add to cleanup chain
        if (this.dropdownCleanup) {
            const prevCleanup = this.dropdownCleanup;
            this.dropdownCleanup = () => {
                prevCleanup();
                outsideClickCleanup();
            };
        } else {
            this.dropdownCleanup = outsideClickCleanup;
        }
        
        // Close on ESC key
        const escapeCleanup = CoreEventUtils.addListener(document, 'keydown', (e: any) => {
            if (e.key === 'Escape') {
                this.closeCategoryDropdown();
            }
        });
        
        // Add to cleanup chain
        if (this.dropdownCleanup) {
            const prevCleanup = this.dropdownCleanup;
            this.dropdownCleanup = () => {
                prevCleanup();
                escapeCleanup();
            };
        }
        
        Logger.fgtlog('📋 Category dropdown shown with ' + sameLevelCategories.length + ' options');
    }

    /**
     * Get categories at the same level (sharing same parent sequence)
     */
    getSameLevelCategories(categoryIndex: number): string[] {
        const parentPath = this.currentCategories.slice(0, categoryIndex);
        const currentCategory = this.currentCategories[categoryIndex];
        
        const sameLevelCategories: string[] = [];
        const seen = new Set<string>();
        
        // Search through all existing category sequences
        this.allExistingCategories.forEach((catArray: string[]) => {
            // Check if this array has the same parent path
            if (catArray.length > categoryIndex) {
                // Compare parent paths
                let parentMatches = true;
                for (let i = 0; i < categoryIndex; i++) {
                    if (catArray[i] !== parentPath[i]) {
                        parentMatches = false;
                        break;
                    }
                }
                
                if (parentMatches) {
                    const categoryAtLevel = catArray[categoryIndex];
                    
                    // Don't include current category
                    if (categoryAtLevel !== currentCategory && !seen.has(categoryAtLevel)) {
                        seen.add(categoryAtLevel);
                        sameLevelCategories.push(categoryAtLevel);
                    }
                }
            }
        });
        
        Logger.fgtlog(`🔍 Found ${sameLevelCategories.length} same-level categories for index ${categoryIndex}`);
        return sameLevelCategories;
    }

    /**
     * Handle modify category option
     */
    handleModifyCategory(categoryIndex: number): void {
        this.closeCategoryDropdown();
        
        const currentCategory = this.currentCategories[categoryIndex];
        const newName = prompt(`Modify category name:`, currentCategory);
        
        if (newName !== null && newName.trim() !== '') {
            const cleanName = CategoryParser.cleanCategory(newName);
            
            if (CategoryParser.isValidCategory(cleanName)) {
                // Only change this category, keep children
                this.currentCategories[categoryIndex] = cleanName;
                this.updateCategoryBadges();
                
                Logger.fgtlog(`✏️ Modified category at index ${categoryIndex}: ${currentCategory} → ${cleanName}`);
                CoreNotificationUtils.success('Category modified', this.namespace);
            } else {
                CoreNotificationUtils.warning('Invalid category name', this.namespace);
            }
        }
    }

    /**
     * Handle switch category option - replace category at index
     */
    handleSwitchCategory(categoryIndex: number, newCategoryName: string): void {
        this.closeCategoryDropdown();
        
        Logger.fgtlog(`🔄 Switching category at index ${categoryIndex} to: ${newCategoryName}`);
        
        // Simply replace the category at this index
        this.currentCategories[categoryIndex] = newCategoryName;
        this.updateCategoryBadges();
        
        Logger.fgtlog(`✅ Updated to: ${JSON.stringify(this.currentCategories)}`);
        CoreNotificationUtils.success('Category switched', this.namespace);
    }

    /**
     * Close category dropdown
     */
    closeCategoryDropdown(): void {
        if (this.categoryDropdown) {
            // Clean up event handlers
            if (this.dropdownCleanup) {
                this.dropdownCleanup();
                this.dropdownCleanup = null;
            }
            
            // Remove from DOM
            this.categoryDropdown.remove();
            this.categoryDropdown = null;
            
            Logger.fgtlog('❌ Category dropdown closed');
        }
    }

    /**
     * Handle add subcategory button
     */
    handleAddSubcategory(event?: Event): void {
        // Get next level categories
        const nextLevelCategories = this.getNextLevelCategories();

        // If no options available, show prompt directly
        if (nextLevelCategories.length === 0) {
            this.promptForNewSubcategory();
            return;
        }

        // Show dropdown with options
        const button = event?.currentTarget as HTMLElement || this.modal!.querySelector(`#${this.namespace}-add-subcategory-btn`) as HTMLElement;
        if (button) {
            this.showAddSubcategoryDropdown(button, nextLevelCategories);
        }
    }

    /**
     * Prompt user for new subcategory name
     */
    promptForNewSubcategory(): void {
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
     * Get next level categories based on current categories
     * @returns Array of category names at the next level
     */
    getNextLevelCategories(): string[] {
        const nextLevelIndex = this.currentCategories.length;
        const currentPath = this.currentCategories;

        const nextLevelCategories: string[] = [];
        const seen = new Set<string>();

        // Search through all existing category sequences
        this.allExistingCategories.forEach((catArray: string[]) => {
            // Check if this array extends our current path
            if (catArray.length > nextLevelIndex) {
                // Compare current path
                let pathMatches = true;
                for (let i = 0; i < currentPath.length; i++) {
                    if (catArray[i] !== currentPath[i]) {
                        pathMatches = false;
                        break;
                    }
                }

                if (pathMatches) {
                    const categoryAtNextLevel = catArray[nextLevelIndex];

                    if (!seen.has(categoryAtNextLevel)) {
                        seen.add(categoryAtNextLevel);
                        nextLevelCategories.push(categoryAtNextLevel);
                    }
                }
            }
        });

        Logger.fgtlog(`🔍 Found ${nextLevelCategories.length} next-level categories`);
        return nextLevelCategories;
    }

    /**
     * Show add subcategory dropdown menu
     */
    showAddSubcategoryDropdown(button: HTMLElement, categories: string[]): void {
        // Close any existing dropdown
        this.closeCategoryDropdown();

        // Create dropdown element
        const dropdown = document.createElement('div');
        dropdown.className = `${this.namespace}-category-dropdown`;
        dropdown.id = `${this.namespace}-category-dropdown`;

        // Build dropdown content
        let dropdownHTML = '';

        // Modify option (prompts for new category)
        dropdownHTML += `
            <div class="${this.namespace}-dropdown-item modify-option" data-action="add-new">
                ✏️ Modify
            </div>
        `;

        // Existing categories
        if (categories.length > 0) {
            dropdownHTML += `<div class="${this.namespace}-dropdown-divider"></div>`;

            categories.forEach(categoryName => {
                dropdownHTML += `
                    <div class="${this.namespace}-dropdown-item category-option"
                         data-action="select"
                         data-category-name="${CoreDOMUtils.escapeHtml(categoryName)}">
                        ${CoreDOMUtils.escapeHtml(categoryName)}
                    </div>
                `;
            });
        }

        dropdown.innerHTML = dropdownHTML;

        // Calculate position
        const rect = button.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.minWidth = `${rect.width}px`;

        // Add to document
        document.body.appendChild(dropdown);
        this.categoryDropdown = dropdown;

        // Attach dropdown event handlers
        const modifyOption = dropdown.querySelector('.modify-option');
        if (modifyOption) {
            const cleanup1 = CoreEventUtils.addListener(modifyOption, 'click', () => {
                this.closeCategoryDropdown();
                this.promptForNewSubcategory();
            });

            this.dropdownCleanup = () => {
                cleanup1();
            };
        }

        const categoryOptions = dropdown.querySelectorAll('.category-option');
        categoryOptions.forEach(option => {
            const cleanup2 = CoreEventUtils.addListener(option, 'click', () => {
                const categoryName = option.getAttribute('data-category-name');
                if (categoryName) {
                    this.closeCategoryDropdown();
                    this.currentCategories.push(categoryName);
                    this.updateCategoryBadges();
                    Logger.fgtlog('➕ Added subcategory from dropdown: ' + categoryName);
                    CoreNotificationUtils.success('Category added', this.namespace);
                }
            });

            // Add to cleanup chain
            if (this.dropdownCleanup) {
                const prevCleanup = this.dropdownCleanup;
                this.dropdownCleanup = () => {
                    prevCleanup();
                    cleanup2();
                };
            }
        });

        // Close dropdown on outside click
        const outsideClickCleanup = CoreEventUtils.addListener(document, 'click', (e: any) => {
            if (!dropdown.contains(e.target) && e.target !== button) {
                this.closeCategoryDropdown();
            }
        });

        // Add to cleanup chain
        if (this.dropdownCleanup) {
            const prevCleanup = this.dropdownCleanup;
            this.dropdownCleanup = () => {
                prevCleanup();
                outsideClickCleanup();
            };
        } else {
            this.dropdownCleanup = outsideClickCleanup;
        }

        // Close on ESC key
        const escapeCleanup = CoreEventUtils.addListener(document, 'keydown', (e: any) => {
            if (e.key === 'Escape') {
                this.closeCategoryDropdown();
            }
        });

        // Add to cleanup chain
        if (this.dropdownCleanup) {
            const prevCleanup = this.dropdownCleanup;
            this.dropdownCleanup = () => {
                prevCleanup();
                escapeCleanup();
            };
        }

        Logger.fgtlog('📋 Add subcategory dropdown shown with ' + categories.length + ' options');
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
     * Simulate click on div elements with coordinate-based mouse events
     * Required for div elements that don't respond to simple click events
     * @param element - Target element (typically a div)
     */
    private simulateClick(element: Element): void {
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const clientX = rect.left + (rect.width / 2);
        const clientY = rect.top + (rect.height / 2);

        const mousedownEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window,
            detail: 1,
            screenX: clientX,
            screenY: clientY,
            clientX: clientX,
            clientY: clientY,
            button: 0
        });

        const mouseupEvent = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            view: window,
            detail: 1,
            screenX: clientX,
            screenY: clientY,
            clientX: clientX,
            clientY: clientY,
            button: 0
        });

        element.dispatchEvent(mousedownEvent);
        element.dispatchEvent(mouseupEvent);
    }

    /**
     * Handle cancel button
     */
    handleCancel(): void {
        this.closeCategoryDropdown();

        // Call onCancel before closing
        if (this.onCancel) {
            this.onCancel();
        }

        // Prevent onClose callback from firing
        this.onClose = null;
        this.close();
    }

    /**
     * Handle confirm button
     */
    async handleConfirm(): Promise<void> {
        if (this.isProcessing) {
            return;
        }

        this.closeCategoryDropdown();

        const titleInput = this.modal!.querySelector(`#${this.namespace}-task-title-input`) as HTMLTextAreaElement;
        const descInput = this.modal!.querySelector(`#${this.namespace}-task-desc-input`) as HTMLTextAreaElement;

        // DO NOT trim - let original UI decide whether to trim or not
        // We only check for empty using trim, but pass untrimmed value
        const title = titleInput?.value || '';
        const description = descInput?.value || '';

        if (this.currentCategories.length === 0 && title.trim() === '') {
            CoreNotificationUtils.warning('Please add at least a category or title', this.namespace);
            titleInput?.focus();
            return;
        }

        // Get original full title (with categories, without newline)
        const originalFullTitle = this.originalTask ?
            CategoryParser.reconstructTitle(
                this.originalTask.categories || [],
                this.originalTask.displayTitle || '',
                false  // No newline for comparison
            ) : '';
        const originalDescription = this.originalTask?.description || '';

        // Reconstruct full title with current values (without newline for comparison)
        const fullTitleWithoutNewline = CategoryParser.reconstructTitle(
            this.currentCategories,
            title,
            false  // No newline for comparison
        );

        // Check if FULL title was modified (including categories or clean title)
        // This means: if user changed either category badges OR clean title, we add newline
        // Example: [A][B]Title → [A][B][C]Title (category changed) → should add newline
        // Example: [A][B]Title → [A][B]NewTitle (title changed) → should add newline
        // Example: [A][B]Title → [A][B]Title (nothing changed) → no newline
        const fullTitleWasModified = (fullTitleWithoutNewline !== originalFullTitle);

        // Add newline between categories and title for better readability
        // - toBeAdded mode: always add newline (new task)
        // - edit mode: only if full title was modified (categories or clean title changed)
        const shouldAddNewline = this.currentCategories.length > 0 &&
                                 (this.actionType === 'toBeAdded' || fullTitleWasModified);

        // Now create final fullTitle with newline if needed
        const fullTitle = CategoryParser.reconstructTitle(
            this.currentCategories,
            title,
            shouldAddNewline
        );

        Logger.fgtlog(`📝 Full title modified: ${fullTitleWasModified}, shouldAddNewline: ${shouldAddNewline}`);

        // Check if FULL title is placeholder text (for toBeAdded mode)
        // This check must be done AFTER fullTitle is constructed
        if (this.actionType === 'toBeAdded' && this.toBeAddedTaskElement) {
            const titleWrapper = this.toBeAddedTaskElement.findTitleWrapper();
            const titleEditor = titleWrapper?.findTitleEditor();
            const placeholder = titleEditor?.placeholder || '';

            if (placeholder && fullTitle === placeholder) {
                CoreNotificationUtils.error('Please enter a valid title (not placeholder text)', this.namespace);
                titleInput?.focus();
                return;
            }
        }

        // Validate duplicate title for both edit and toBeAdded modes
        if (this.actionType === 'edit' || this.actionType === 'toBeAdded') {
            if (!this.validateUniqueTitle(fullTitle, this.taskId)) {
                CoreNotificationUtils.error('A task with this title already exists', this.namespace);
                titleInput?.focus();
                return;
            }
        }

        // Handle toBeAdded mode
        if (this.actionType === 'toBeAdded' && this.toBeAddedTaskElement) {
            // Lock UI to prevent interaction
            this.isProcessing = true;
            CoreDOMUtils.enableLockStyles();
            this.showLoading('Adding task...');

            Logger.fgtlog('🆕 Starting toBeAdded task operation...');

            // Dispatch event to container to mark as manual operation
            const manualOpEvent = new CustomEvent('manualOperation', { bubbles: true });
            this.modal?.dispatchEvent(manualOpEvent);

            try {
                // Update title in the original UI
                const titleWrapper = this.toBeAddedTaskElement.findTitleWrapper();
                const titleEditor = titleWrapper?.findTitleEditor();
                if (titleEditor) {
                    titleEditor.focus();
                    titleEditor.element.value = fullTitle;
                    const inputEvent = CoreDOMUtils.createInputEvent();
                    titleEditor.element.dispatchEvent(inputEvent);
                    titleEditor.blur();
                    Logger.fgtlog('✅ Title updated in original UI');
                }

                // Click title wrapper to make descViewer visible (like Edit mode)
                // This is required before updating description
                if (titleWrapper && description) {
                    Logger.fgtlog('🎯 Clicking title wrapper to reveal description UI');
                    this.simulateClick(titleWrapper.element);
                    await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 300));
                }

                // Update description in the original UI
                let descEditor = null; // Declare outside try block to avoid scope issue
                const descWrapper = this.toBeAddedTaskElement.findDescWrapper();
                if (descWrapper && description) {
                    try {
                        // Click wrapper to activate description editor (like Edit mode)
                        // Note: Must click wrapper, not viewer, to render textarea
                        Logger.fgtlog('🎯 Clicking description wrapper to activate editor');
                        this.simulateClick(descWrapper.element);
                        await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 200));

                        // Wait for editor to appear (using existing waitForDescEditor method)
                        descEditor = await descWrapper.waitForDescEditor(3000);

                        if (descEditor) {
                            descEditor.focus();
                            descEditor.element.value = description;
                            const inputEvent = CoreDOMUtils.createInputEvent();
                            descEditor.element.dispatchEvent(inputEvent);
                            descEditor.blur();
                            Logger.fgtlog('✅ Description updated in original UI');
                        }
                    } catch (error: any) {
                        Logger.fgtwarn(`⚠️ Failed to activate description editor: ${error.message}`);
                        // If description is not empty, this is a failure - throw error to outer catch
                        // If description is empty, continue (descEditor remains null)
                        if (description) {
                            throw new Error(`Failed to activate description editor: ${error.message}`);
                        }
                    }
                }

                // Wait for changes to apply - monitor DOM changes
                await this.waitForToBeAddedChanges(titleEditor, descEditor, fullTitle, description, 5000);

                // Unlock UI
                CoreDOMUtils.disableLockStyles();
                this.isProcessing = false;

                // Call confirm callback first (which will click the Add button)
                if (this.onConfirm) {
                    this.onConfirm({
                        taskId: '',
                        actionType: this.actionType,
                        title: fullTitle,
                        cleanTitle: title,
                        description: description,
                        categories: this.currentCategories
                    });
                }

                Logger.fgtlog('✅ ToBeAdded task operation completed');

                // Prevent onClose callback from firing
                this.onClose = null;
                this.close();

            } catch (error: any) {
                Logger.fgterror('❌ ToBeAdded task operation failed: ' + error.message);

                // Unlock UI
                CoreDOMUtils.disableLockStyles();
                this.isProcessing = false;

                // Show error in modal
                this.showError('Failed to add task: ' + error.message);
                CoreNotificationUtils.error('Failed to add task: ' + error.message, this.namespace);
            }

            return;
        }

        // Check if in edit mode and has valid taskId
        if (this.actionType === 'edit' && this.taskId && this.taskId !== '') {
            // Lock UI to prevent interaction
            this.isProcessing = true;
            CoreDOMUtils.enableLockStyles();
            this.showLoading('Updating task...');

            Logger.fgtlog('📝 Starting task edit operation...');

            // Dispatch event to container to mark as manual operation
            const manualOpEvent = new CustomEvent('manualOperation', { bubbles: true });
            this.modal?.dispatchEvent(manualOpEvent);
            
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

                    // Prevent onClose callback from firing
                    this.onClose = null;
                    this.close();
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

            // Prevent onClose callback from firing
            this.onClose = null;
            this.close();
        }
    }

    /**
     * Wait for toBeAdded task changes to be applied to the DOM
     * @param titleEditor - Title editor element
     * @param descEditor - Description editor element
     * @param expectedTitle - Expected title text
     * @param expectedDesc - Expected description text
     * @param timeout - Maximum wait time (default 5000ms)
     */
    async waitForToBeAddedChanges(titleEditor: any, descEditor: any, expectedTitle: string, expectedDesc: string, timeout: number = 5000): Promise<void> {
        const startTime = Date.now();

        return new Promise((resolve) => {
            let intervalId: number | null = null;
            let timeoutId: number | null = null;

            const checkChange = () => {
                const elapsed = Date.now() - startTime;

                try {
                    let titleMatches = true;
                    let descMatches = true;

                    // Check title if titleEditor exists
                    if (titleEditor && titleEditor.element) {
                        const currentTitle = titleEditor.element.value || '';
                        titleMatches = currentTitle === expectedTitle;
                    }

                    // Check description if descEditor exists
                    if (descEditor && descEditor.element) {
                        const currentDesc = descEditor.element.value || '';
                        descMatches = currentDesc === expectedDesc;
                    }

                    // If both match, we're done
                    if (titleMatches && descMatches) {
                        if (intervalId !== null) CoreEventUtils.intervals.clear(intervalId);
                        if (timeoutId !== null) CoreEventUtils.timeouts.clear(timeoutId);
                        Logger.fgtlog(`✅ ToBeAdded changes detected in ${elapsed}ms`);
                        resolve();
                        return true;
                    }
                } catch (error: any) {
                    Logger.fgtwarn(`⚠️ Error checking toBeAdded changes: ${error.message}`);
                }

                return false;
            };

            // Start polling
            intervalId = CoreEventUtils.intervals.create(() => {
                checkChange();
            }, 50);

            // Set timeout
            timeoutId = CoreEventUtils.timeouts.create(() => {
                if (intervalId !== null) CoreEventUtils.intervals.clear(intervalId);
                Logger.fgtlog(`✅ ToBeAdded changes verified on timeout`);
                resolve();
            }, timeout);
        });
    }

    /**
     * Validate that the title is unique (no duplicate task titles)
     *
     * Uses flexible whitespace comparison because original UI sometimes
     * trims titles and sometimes doesn't - we need to handle both cases
     *
     * @param fullTitle - Full title to check (with categories)
     * @param excludeTaskId - Task ID to exclude from check (for edit mode)
     * @returns True if title is unique, false if duplicate exists
     */
    validateUniqueTitle(fullTitle: string, excludeTaskId: string | null): boolean {
        // Get all task elements using OgtFinder (imported at top)
        const allTasks = OgtFinder.findAllTaskElements();

        // Check each task for duplicate title
        for (const taskElement of allTasks) {
            // Skip the task being edited
            if (excludeTaskId && taskElement.taskId === excludeTaskId) {
                continue;
            }

            // Get title of this task
            const titleWrapper = taskElement.findTitleWrapper();
            const titleViewer = titleWrapper?.findTitleViewer();
            const existingTitle = titleViewer?.text || '';

            // Compare titles with flexible whitespace handling
            // This handles cases where original UI trims or doesn't trim
            if (CoreDOMUtils.compareWithFlexibleWhitespace(existingTitle, fullTitle)) {
                Logger.fgtwarn(`⚠️ Duplicate title found: "${fullTitle}" matches "${existingTitle}" (task: ${taskElement.taskId})`);
                return false;
            }
        }

        Logger.fgtlog(`✅ Title is unique: "${fullTitle}"`);
        return true;
    }

    /**
     * Override close to ensure dropdown cleanup
     */
    close(): void {
        this.closeCategoryDropdown();
        super.close();
    }

    /**
     * Show task modal (static method)
     */
    static show(options: any): TaskModal {
        const modal = new TaskModal(options.namespace || 'fancy-gst');
        modal.show(options);
        return modal;
    }
}

export { TaskModal };

Logger.fgtlog('✅ Task Modal loaded successfully');