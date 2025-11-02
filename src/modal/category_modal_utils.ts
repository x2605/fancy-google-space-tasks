// modal/category_modal_utils.ts - Utility functions for category operations in task modal
import * as Logger from '@/core/logger';
import { CoreDOMUtils } from '@/core/dom_utils';
import { CoreEventUtils } from '@/core/event_utils';
import { CoreNotificationUtils } from '@/core/notification_utils';
import { CategoryUtils } from '@/category/category_utils';
import { CategoryParser } from '@/category/category_parser';

Logger.fgtlog('🏷️ Category Modal Utils loading...');

// ============================================================================
// Part A: Pure functions (no state modification)
// ============================================================================

/**
 * Render category badges HTML
 * @param categories - Array of category names
 * @param namespace - Namespace for CSS classes
 * @returns HTML string for category badges
 */
export function renderCategoryBadges(categories: string[], namespace: string): string {
    if (categories.length === 0) {
        return `<div class="${namespace}-no-categories">No categories</div>`;
    }

    return categories.map((category, index) => {
        const seed = CategoryUtils.generateCategorySeed(categories, index);
        const colorStyle = generateCategoryColor(seed, index);

        return `
            <div class="${namespace}-category-badge"
                 data-category-index="${index}"
                 data-category="${CoreDOMUtils.escapeHtml(category)}"
                 style="background-color: ${colorStyle.backgroundColor}; color: ${colorStyle.color};">
                <span class="${namespace}-badge-text">${CoreDOMUtils.escapeHtml(category)}</span>
                <button type="button"
                        class="${namespace}-badge-remove"
                        data-category-index="${index}"
                        title="Remove category">×</button>
            </div>
        `;
    }).join('');
}

/**
 * Generate category color based on seed and level
 * @param seed - Seed string for color generation
 * @param level - Category level (affects saturation/lightness)
 * @returns Color style object
 */
export function generateCategoryColor(seed: string, level: number): { backgroundColor: string, color: string, borderColor: string } {
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
 * Get categories at the same level (sharing same parent sequence)
 * @param currentCategories - Current category array
 * @param allExistingCategories - All existing category arrays
 * @param categoryIndex - Index of category to find siblings for
 * @returns Array of same-level category names
 */
export function getSameLevelCategories(
    currentCategories: string[],
    allExistingCategories: string[][],
    categoryIndex: number
): string[] {
    const parentPath = currentCategories.slice(0, categoryIndex);
    const currentCategory = currentCategories[categoryIndex];

    const sameLevelCategories: string[] = [];
    const seen = new Set<string>();

    // Search through all existing category sequences
    allExistingCategories.forEach((catArray: string[]) => {
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
 * Get next level categories based on current categories
 * @param currentCategories - Current category array
 * @param allExistingCategories - All existing category arrays
 * @returns Array of category names at the next level
 */
export function getNextLevelCategories(
    currentCategories: string[],
    allExistingCategories: string[][]
): string[] {
    const nextLevelIndex = currentCategories.length;
    const currentPath = currentCategories;

    const nextLevelCategories: string[] = [];
    const seen = new Set<string>();

    // Search through all existing category sequences
    allExistingCategories.forEach((catArray: string[]) => {
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

// ============================================================================
// Part B: Handler functions (accepts TaskModal instance)
// ============================================================================

/**
 * Update category badges display
 * @param modal - TaskModal instance
 */
export function updateCategoryBadges(modal: any): void {
    const badgeContainer = modal.modal!.querySelector(`#${modal.namespace}-category-badges`);
    if (badgeContainer) {
        badgeContainer.innerHTML = renderCategoryBadges(modal.currentCategories, modal.namespace);
    }
}

/**
 * Handle category badge remove
 * @param modal - TaskModal instance
 * @param event - Click event
 */
export function handleRemoveBadge(modal: any, event: any): void {
    event.stopPropagation();

    // Prevent rapid consecutive clicks (within 500ms)
    const now = Date.now();
    if (now - modal.lastBadgeRemoveTime < 500) {
        Logger.fgtlog('⚠️ Badge remove ignored (too fast)');
        return;
    }
    modal.lastBadgeRemoveTime = now;

    const button = event.currentTarget;
    const categoryIndex = parseInt(button.dataset.categoryIndex);
    const category = modal.currentCategories[categoryIndex];

    // Remove category without confirmation
    modal.currentCategories.splice(categoryIndex, 1);
    updateCategoryBadges(modal);
    Logger.fgtlog('🗑️ Removed category: ' + category);
}

/**
 * Handle category badge click - show dropdown
 * @param modal - TaskModal instance
 * @param event - Click event
 */
export function handleBadgeClick(modal: any, event: any): void {
    // Prevent badge remove button from triggering this
    if (event.target.classList.contains(`${modal.namespace}-badge-remove`)) {
        return;
    }

    event.stopPropagation();

    const badge = event.currentTarget;
    const categoryIndex = parseInt(badge.dataset.categoryIndex);

    Logger.fgtlog('🏷️ Badge clicked: index ' + categoryIndex);

    // Close any existing dropdown
    closeCategoryDropdown(modal);

    // Show dropdown for this badge
    showCategoryDropdown(modal, badge, categoryIndex);
}

/**
 * Show category dropdown menu
 * @param modal - TaskModal instance
 * @param badge - Badge element
 * @param categoryIndex - Index of category
 */
export function showCategoryDropdown(modal: any, badge: HTMLElement, categoryIndex: number): void {
    // Get same level categories
    const sameLevelCategories = getSameLevelCategories(
        modal.currentCategories,
        modal.allExistingCategories,
        categoryIndex
    );

    // Create dropdown element
    const dropdown = document.createElement('div');
    dropdown.className = `${modal.namespace}-category-dropdown`;
    dropdown.id = `${modal.namespace}-category-dropdown`;

    // Build dropdown content
    let dropdownHTML = '';

    // Modify option
    dropdownHTML += `
        <div class="${modal.namespace}-dropdown-item modify-option" data-action="modify">
            ✏️ Modify
        </div>
    `;

    // Same level categories
    if (sameLevelCategories.length > 0) {
        dropdownHTML += `<div class="${modal.namespace}-dropdown-divider"></div>`;

        sameLevelCategories.forEach(categoryName => {
            dropdownHTML += `
                <div class="${modal.namespace}-dropdown-item category-option"
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
    modal.categoryDropdown = dropdown;

    // Attach dropdown event handlers
    const modifyOption = dropdown.querySelector('.modify-option');
    if (modifyOption) {
        const cleanup1 = CoreEventUtils.addListener(modifyOption, 'click', () => {
            handleModifyCategory(modal, categoryIndex);
        });

        modal.dropdownCleanup = () => {
            cleanup1();
            // Clean up other handlers below
        };
    }

    const categoryOptions = dropdown.querySelectorAll('.category-option');
    categoryOptions.forEach(option => {
        const cleanup2 = CoreEventUtils.addListener(option, 'click', () => {
            const categoryName = option.getAttribute('data-category-name');
            if (categoryName) {
                handleSwitchCategory(modal, categoryIndex, categoryName);
            }
        });

        // Add to cleanup chain
        if (modal.dropdownCleanup) {
            const prevCleanup = modal.dropdownCleanup;
            modal.dropdownCleanup = () => {
                prevCleanup();
                cleanup2();
            };
        }
    });

    // Close dropdown on outside click
    const outsideClickCleanup = CoreEventUtils.addListener(document, 'click', (e: any) => {
        if (!dropdown.contains(e.target) && e.target !== badge) {
            closeCategoryDropdown(modal);
        }
    });

    // Add to cleanup chain
    if (modal.dropdownCleanup) {
        const prevCleanup = modal.dropdownCleanup;
        modal.dropdownCleanup = () => {
            prevCleanup();
            outsideClickCleanup();
        };
    } else {
        modal.dropdownCleanup = outsideClickCleanup;
    }

    // Close on ESC key
    const escapeCleanup = CoreEventUtils.addListener(document, 'keydown', (e: any) => {
        if (e.key === 'Escape') {
            closeCategoryDropdown(modal);
        }
    });

    // Add to cleanup chain
    if (modal.dropdownCleanup) {
        const prevCleanup = modal.dropdownCleanup;
        modal.dropdownCleanup = () => {
            prevCleanup();
            escapeCleanup();
        };
    }

    Logger.fgtlog('📋 Category dropdown shown with ' + sameLevelCategories.length + ' options');
}

/**
 * Handle modify category option
 * @param modal - TaskModal instance
 * @param categoryIndex - Index of category to modify
 */
export function handleModifyCategory(modal: any, categoryIndex: number): void {
    closeCategoryDropdown(modal);

    const currentCategory = modal.currentCategories[categoryIndex];
    const newName = prompt(`Modify category name:`, currentCategory);

    if (newName !== null && newName.trim() !== '') {
        const cleanName = CategoryParser.cleanCategory(newName);

        if (CategoryParser.isValidCategory(cleanName)) {
            // Only change this category, keep children
            modal.currentCategories[categoryIndex] = cleanName;
            updateCategoryBadges(modal);

            Logger.fgtlog(`✏️ Modified category at index ${categoryIndex}: ${currentCategory} → ${cleanName}`);
            CoreNotificationUtils.success('Category modified', modal.namespace);
        } else {
            CoreNotificationUtils.warning('Invalid category name', modal.namespace);
        }
    }
}

/**
 * Handle switch category option - replace category at index
 * @param modal - TaskModal instance
 * @param categoryIndex - Index of category to switch
 * @param newCategoryName - New category name
 */
export function handleSwitchCategory(modal: any, categoryIndex: number, newCategoryName: string): void {
    closeCategoryDropdown(modal);

    Logger.fgtlog(`🔄 Switching category at index ${categoryIndex} to: ${newCategoryName}`);

    // Simply replace the category at this index
    modal.currentCategories[categoryIndex] = newCategoryName;
    updateCategoryBadges(modal);

    Logger.fgtlog(`✅ Updated to: ${JSON.stringify(modal.currentCategories)}`);
    CoreNotificationUtils.success('Category switched', modal.namespace);
}

/**
 * Close category dropdown
 * @param modal - TaskModal instance
 */
export function closeCategoryDropdown(modal: any): void {
    if (modal.categoryDropdown) {
        // Clean up event handlers
        if (modal.dropdownCleanup) {
            modal.dropdownCleanup();
            modal.dropdownCleanup = null;
        }

        // Remove from DOM
        modal.categoryDropdown.remove();
        modal.categoryDropdown = null;

        Logger.fgtlog('❌ Category dropdown closed');
    }
}

/**
 * Handle add subcategory button
 * @param modal - TaskModal instance
 * @param event - Click event (optional)
 */
export function handleAddSubcategory(modal: any, event?: Event): void {
    // Get next level categories
    const nextLevelCategories = getNextLevelCategories(
        modal.currentCategories,
        modal.allExistingCategories
    );

    // If no options available, show prompt directly
    if (nextLevelCategories.length === 0) {
        promptForNewSubcategory(modal);
        return;
    }

    // Show dropdown with options
    const button = event?.currentTarget as HTMLElement || modal.modal!.querySelector(`#${modal.namespace}-add-subcategory-btn`) as HTMLElement;
    if (button) {
        showAddSubcategoryDropdown(modal, button, nextLevelCategories);
    }
}

/**
 * Prompt user for new subcategory name
 * @param modal - TaskModal instance
 */
export function promptForNewSubcategory(modal: any): void {
    const newCategory = prompt('Enter new subcategory name:');

    if (newCategory) {
        const cleanCategory = CategoryParser.cleanCategory(newCategory);

        if (CategoryParser.isValidCategory(cleanCategory)) {
            modal.currentCategories.push(cleanCategory);
            updateCategoryBadges(modal);
            Logger.fgtlog('➕ Added subcategory: ' + cleanCategory);
        } else {
            CoreNotificationUtils.warning('Invalid category name', modal.namespace);
        }
    }
}

/**
 * Show add subcategory dropdown menu
 * @param modal - TaskModal instance
 * @param button - Button element
 * @param categories - Available categories
 */
export function showAddSubcategoryDropdown(modal: any, button: HTMLElement, categories: string[]): void {
    // Close any existing dropdown
    closeCategoryDropdown(modal);

    // Create dropdown element
    const dropdown = document.createElement('div');
    dropdown.className = `${modal.namespace}-category-dropdown`;
    dropdown.id = `${modal.namespace}-category-dropdown`;

    // Build dropdown content
    let dropdownHTML = '';

    // Create new option (prompts for new category)
    dropdownHTML += `
        <div class="${modal.namespace}-dropdown-item modify-option" data-action="add-new">
            ✨ Create new
        </div>
    `;

    // Existing categories
    if (categories.length > 0) {
        dropdownHTML += `<div class="${modal.namespace}-dropdown-divider"></div>`;

        categories.forEach(categoryName => {
            dropdownHTML += `
                <div class="${modal.namespace}-dropdown-item category-option"
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
    modal.categoryDropdown = dropdown;

    // Attach dropdown event handlers
    const modifyOption = dropdown.querySelector('.modify-option');
    if (modifyOption) {
        const cleanup1 = CoreEventUtils.addListener(modifyOption, 'click', () => {
            closeCategoryDropdown(modal);
            promptForNewSubcategory(modal);
        });

        modal.dropdownCleanup = () => {
            cleanup1();
        };
    }

    const categoryOptions = dropdown.querySelectorAll('.category-option');
    categoryOptions.forEach(option => {
        const cleanup2 = CoreEventUtils.addListener(option, 'click', () => {
            const categoryName = option.getAttribute('data-category-name');
            if (categoryName) {
                closeCategoryDropdown(modal);
                modal.currentCategories.push(categoryName);
                updateCategoryBadges(modal);
                Logger.fgtlog('➕ Added subcategory from dropdown: ' + categoryName);
                CoreNotificationUtils.success('Category added', modal.namespace);
            }
        });

        // Add to cleanup chain
        if (modal.dropdownCleanup) {
            const prevCleanup = modal.dropdownCleanup;
            modal.dropdownCleanup = () => {
                prevCleanup();
                cleanup2();
            };
        }
    });

    // Close dropdown on outside click
    const outsideClickCleanup = CoreEventUtils.addListener(document, 'click', (e: any) => {
        if (!dropdown.contains(e.target) && e.target !== button) {
            closeCategoryDropdown(modal);
        }
    });

    // Add to cleanup chain
    if (modal.dropdownCleanup) {
        const prevCleanup = modal.dropdownCleanup;
        modal.dropdownCleanup = () => {
            prevCleanup();
            outsideClickCleanup();
        };
    } else {
        modal.dropdownCleanup = outsideClickCleanup;
    }

    // Close on ESC key
    const escapeCleanup = CoreEventUtils.addListener(document, 'keydown', (e: any) => {
        if (e.key === 'Escape') {
            closeCategoryDropdown(modal);
        }
    });

    // Add to cleanup chain
    if (modal.dropdownCleanup) {
        const prevCleanup = modal.dropdownCleanup;
        modal.dropdownCleanup = () => {
            prevCleanup();
            escapeCleanup();
        };
    }

    Logger.fgtlog('📋 Add subcategory dropdown shown with ' + categories.length + ' options');
}

Logger.fgtlog('✅ Category Modal Utils loaded successfully');
