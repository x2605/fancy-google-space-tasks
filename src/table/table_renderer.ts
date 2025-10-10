// table/table_renderer.ts - Table rendering with unified OKLCH/HSL color logic + Depth Classes
import * as Logger from '@/core/logger';
import { CategoryUtils } from '@/category/category_utils';
import { AssigneeUtils } from '@/assignee/assignee_utils';
import { singletonAssigneeColorUtils } from '@/assignee/assignee_color_utils';
import { CoreDOMUtils } from '@/core/dom_utils';

Logger.fgtlog('📊 Table Renderer loading...');

/**
 * Table rendering utilities for fancy-gst-tasks-table block
 */
class TableRenderer {
    namespace: string;

    constructor(namespace: string = 'fancy-gst') {
        this.namespace = namespace;
    }

    /**
     * Check if OKLCH color space is supported
     * @returns OKLCH support status
     */
    checkOKLCHSupport(): boolean {
        if (typeof CSS === 'undefined' || !CSS.supports) {
            return false;
        }
        return CSS.supports('color', 'oklch(0.7 0.15 180)');
    }

    /**
     * Generate color from category seed - UNIFIED OKLCH/HSL logic
     * @param seed - Category seed (e.g., "[Work][ProjectA]")
     * @param level - Category level (0-based for table, 1-based for display)
     * @returns Color style object
     */
    generateColorFromSeed(seed: string, level: number = 0): any {
        const oklchSupported = this.checkOKLCHSupport();

        // Generate hue from seed
        const hue = CategoryUtils.generateHueFromSeed(seed);

        // Base parameters for color generation
        const saturation = 65 + (level * 5) % 20; // 65-85%
        const lightness = 85 + (level * 5) % 15; // 85-100%

        // OKLCH parameters
        const oklchLightness = lightness / 100; // Convert to 0-1 range
        const oklchChroma = saturation * 0.004; // Convert to OKLCH chroma

        // Generate colors with OKLCH/HSL fallback
        const backgroundColor = oklchSupported ?
            `oklch(${oklchLightness} ${oklchChroma} ${hue})` :
            `hsl(${hue}, ${saturation}%, ${lightness}%)`;

        return {
            borderColor: '#000',
            backgroundColor: backgroundColor,
            color: '#000', // ALWAYS BLACK TEXT
            fontWeight: '500',
            fontSize: Math.max(1.2, 1.6 - level * 0.1) + 'em',
            hue: hue
        };
    }

    /**
     * Group and sort tasks hierarchically
     */
    groupAndSortTasks(tasks: Map<string, any>): any[] {
        const tasksArray = Array.from(tasks.values());

        // Add original index
        tasksArray.forEach((task, index) => {
            task.originalIndex = index;
        });

        // Build hierarchical structure
        const result: any[] = [];
        const firstOccurrence = new Map<string, number>(); // Track first occurrence of each category path

        // 1. First, add uncategorized tasks
        const uncategorized = tasksArray.filter(t => !t.categories || t.categories.length === 0);
        result.push(...uncategorized.sort((a, b) => a.originalIndex - b.originalIndex));

        // 2. Build category tree with first occurrence tracking
        const categorized = tasksArray.filter(t => t.categories && t.categories.length > 0);

        // Group by full category path
        categorized.forEach(task => {
            const path = task.categories.join('|');
            if (!firstOccurrence.has(path)) {
                firstOccurrence.set(path, task.originalIndex);
            }
        });

        // 3. Recursively process each level
        const processLevel = (tasks: any[], level: number = 0): any[] => {
            if (tasks.length === 0) return [];

            const grouped = new Map<string, any[]>();
            const categoryOrder: string[] = [];

            // Group by category at current level
            tasks.forEach(task => {
                const categoryAtLevel = task.categories[level] || '';

                if (!grouped.has(categoryAtLevel)) {
                    grouped.set(categoryAtLevel, []);
                    categoryOrder.push(categoryAtLevel);
                }
                grouped.get(categoryAtLevel)!.push(task);
            });

            const result: any[] = [];

            // Process each group in order of first occurrence
            categoryOrder.forEach(category => {
                const groupTasks = grouped.get(category)!;

                // Separate tasks: those with only current level vs those with deeper levels
                const exactDepth = groupTasks.filter(t => t.categories.length === level + 1);
                const deeper = groupTasks.filter(t => t.categories.length > level + 1);

                // Add exact depth tasks first (sorted by original index)
                result.push(...exactDepth.sort((a, b) => a.originalIndex - b.originalIndex));

                // Recursively process deeper tasks
                if (deeper.length > 0) {
                    result.push(...processLevel(deeper, level + 1));
                }
            });

            return result;
        };

        // Process categorized tasks hierarchically
        result.push(...processLevel(categorized, 0));

        return result;
    }

    /**
     * Calculate rowspan with parent level awareness
     */
    calculateRowspanInfo(sortedTasks: any[], maxCategoryDepth: number): any[] {
        if (maxCategoryDepth === 0) {
            return sortedTasks.map(task => ({ ...task, rowspanInfo: {} }));
        }

        // Clear all existing rowspanInfo before recalculation
        sortedTasks.forEach(task => {
            task.rowspanInfo = {};
        });

        for (let level = 0; level < maxCategoryDepth; level++) {
            let currentCategoryPath: string | null = null;
            let groupStart = 0;

            for (let i = 0; i <= sortedTasks.length; i++) {
                const task = sortedTasks[i];

                // Build category path up to current level
                const categoryPath = task?.categories?.slice(0, level + 1).join('|') || '';

                // Check if group ended
                if (i === sortedTasks.length || categoryPath !== currentCategoryPath) {
                    // Set rowspan for previous group
                    if (currentCategoryPath !== null && groupStart < i) {
                        const groupSize = i - groupStart;
                        const categoryAtLevel = sortedTasks[groupStart].categories?.[level];

                        if (groupSize > 1 && categoryAtLevel) {
                            if (!sortedTasks[groupStart].rowspanInfo) {
                                sortedTasks[groupStart].rowspanInfo = {};
                            }
                            sortedTasks[groupStart].rowspanInfo[level] = groupSize;

                            for (let j = groupStart + 1; j < i; j++) {
                                if (!sortedTasks[j].rowspanInfo) {
                                    sortedTasks[j].rowspanInfo = {};
                                }
                                sortedTasks[j].rowspanInfo[level] = 'skip';
                            }
                        }
                    }

                    // Start new group
                    if (i < sortedTasks.length) {
                        currentCategoryPath = categoryPath;
                        groupStart = i;
                    }
                }
            }
        }

        return sortedTasks;
    }

    /**
     * Render complete table structure - ENHANCED WITH ASYNC COLOR LOADING
     * @param filteredTasks - Filtered tasks data (for display)
     * @param maxCategoryDepth - Maximum category depth
     * @param allTasks - All tasks data (for statistics) - optional
     * @returns Complete table HTML
     */
    renderTable(filteredTasks: Map<string, any>, maxCategoryDepth: number, allTasks: Map<string, any> | null = null): string {
        // Use allTasks for statistics if provided, otherwise use filteredTasks
        const tasksForStats = allTasks || filteredTasks;

        const headerHTML = this.createTableHeader(tasksForStats, maxCategoryDepth);
        const bodyHTML = this.createTableBody(filteredTasks, maxCategoryDepth);

        const tableHTML = `
            <table class="${this.namespace}-tasks-table" id="${this.namespace}-tasks-table">
                <thead>
                    ${headerHTML}
                </thead>
                <tbody>
                    ${bodyHTML}
                </tbody>
            </table>
        `;

        // Load assignee colors asynchronously after rendering
        setTimeout(() => {
            this.loadAssigneeColorsAsync(filteredTasks);
        }, 100);

        return tableHTML;
    }

    /**
     * Load assignee colors asynchronously for all tasks
     * @param tasks - Tasks data
     */
    async loadAssigneeColorsAsync(tasks: Map<string, any>): Promise<void> {
        if (!singletonAssigneeColorUtils) {
            Logger.fgtwarn('AssigneeColorUtils not available');
            return;
        }

        const colorPromises: Promise<any>[] = [];

        tasks.forEach((task) => {
            if (task.assigneeIcon && !task.assigneeColors) {
                const colorPromise = singletonAssigneeColorUtils.getAssigneeColors(task.assigneeIcon, task.assignee)
                    .then((colors: any) => {
                        // Update the task data
                        task.assigneeColors = colors;

                        // Update the UI element
                        const assigneeButton = document.querySelector(`[data-task-id="${task.id}"].fgt-assignee`);
                        if (assigneeButton) {
                            singletonAssigneeColorUtils.applyColorsToElement(assigneeButton, colors);
                        }

                        return { taskId: task.id, colors };
                    })
                    .catch((error: any) => {
                        Logger.fgtwarn('Failed to load colors for task ' + task.id + ': ' + error);
                        return null;
                    });

                colorPromises.push(colorPromise);
            }
        });

        if (colorPromises.length > 0) {
            try {
                const results = await Promise.all(colorPromises);
                const successCount = results.filter(r => r !== null).length;
                Logger.fgtlog('🎨 Loaded colors for ' + successCount + '/' + colorPromises.length + ' assignee buttons');
            } catch (error) {
                Logger.fgtwarn('Some assignee colors failed to load: ' + error);
            }
        }
    }

    /**
     * Create table header - individual columns for each category level with depth classes
     * @param tasks - Tasks data (for statistics)
     * @param maxCategoryDepth - Maximum category depth
     * @returns Header HTML
     */
    createTableHeader(tasks: Map<string, any>, maxCategoryDepth: number): string {
        let headerHTML = '<tr>';

        // Category headers - individual columns for each category level with depth classes
        if (maxCategoryDepth > 0) {
            for (let i = 0; i < maxCategoryDepth; i++) {
                headerHTML += `<th class="${this.namespace}-category-header fgt-depth-${i}">${i + 1}</th>`;
            }
        }

        headerHTML += `<th class="${this.namespace}-task-header">${this.renderStatistics(tasks, maxCategoryDepth)}</th>`;
        headerHTML += '</tr>';

        return headerHTML;
    }

    /**
     * Create table body with all task rows (sorted and grouped with proper rowspan)
     * @param tasks - Tasks data
     * @param maxCategoryDepth - Maximum category depth
     * @returns Body HTML
     */
    createTableBody(tasks: Map<string, any>, maxCategoryDepth: number): string {
        // Sort tasks according to rules
        const sortedTasks = this.groupAndSortTasks(tasks);

        // Calculate rowspan information
        const tasksWithRowspan = this.calculateRowspanInfo(sortedTasks, maxCategoryDepth);

        let bodyHTML = '';

        tasksWithRowspan.forEach((task) => {
            bodyHTML += this.createTaskRow(task, maxCategoryDepth);
        });

        return bodyHTML;
    }

    /**
     * Create task row with proper rowspan support for each category level and depth classes
     * @param task - Task data with rowspan info
     * @param maxCategoryDepth - Maximum category depth  
     * @returns Row HTML
     */
    createTaskRow(task: any, maxCategoryDepth: number): string {
        const categoryColumns = maxCategoryDepth > 0 ? maxCategoryDepth : 0;

        let rowHTML = `<tr class="${this.namespace}-task-row" data-task-id="${task.id || task.taskId}">`;

        // Category cells with proper rowspan support and depth classes
        if (maxCategoryDepth > 0) {
            for (let level = 0; level < categoryColumns; level++) {
                const category = task.categories && task.categories[level] ? task.categories[level] : '';
                const rowspanInfo = task.rowspanInfo || {};

                // Skip this cell if it's part of a rowspan group (but not the first)
                if (rowspanInfo[level] === 'skip') {
                    continue; // Don't render this cell
                }

                // Generate seed for this level using CategoryUtils
                const seed = CategoryUtils.generateCategorySeed(task.categories || [], level);
                const colorStyle = this.generateColorFromSeed(seed, level);

                // Create inline style string
                const styleString = category ?
                    `background-color: ${colorStyle.backgroundColor}; color: ${colorStyle.color}; font-weight: ${colorStyle.fontWeight}; border: 1px solid #444;` :
                    '';

                // Add rowspan attribute if this cell spans multiple rows
                const rowspanValue = rowspanInfo[level];
                const rowspanAttr = (typeof rowspanValue === 'number' && rowspanValue > 1) ?
                    `rowspan="${rowspanValue}"` : '';

                // Add additional classes for styling
                const additionalClasses = rowspanValue && typeof rowspanValue === 'number' && rowspanValue > 1 ?
                    'grouped' : '';

                rowHTML += `<td class="${this.namespace}-category-cell fgt-depth-${level} ${additionalClasses}" 
                               style="${styleString}"
                               data-seed="${CoreDOMUtils.escapeHtml(seed)}"
                               data-level="${level}"
                               ${rowspanAttr}><div style="font-size: ${colorStyle.fontSize};">${CoreDOMUtils.escapeHtml(category)}</div></td>`;
            }
        }

        // Task content cell
        rowHTML += `
            <td class="${this.namespace}-task-content-cell">
                <div class="${this.namespace}-task-content-wrapper">
                    ${this.renderTaskDetails(task)}
                    ${this.renderTaskActions(task)}
                </div>
            </td>
        `;

        rowHTML += '</tr>';
        return rowHTML;
    }

    /**
     * Render task checkbox
     * @param task - Task data
     * @returns Checkbox HTML
     */
    renderTaskCheckbox(task: any): string {
        return `
            <div class="${this.namespace}-task-checkbox ${task.isCompleted ? 'fgt-completed' : ''} fgt-lockable" 
                 data-task-id="${task.id || task.taskId}"></div>
        `;
    }

    /**
     * Render task details section
     * @param task - Task data
     * @returns Details HTML
     */
    renderTaskDetails(task: any): string {
        return `
            <div class="${this.namespace}-task-details">
                ${this.renderTaskTitle(task)}
                ${this.renderTaskDescription(task)}
            </div>
        `;
    }

    /**
     * Render task title
     * @param task - Task data
     * @returns Title HTML
     */
    renderTaskTitle(task: any): string {
        const html = (window as any).linkifyStr(CoreDOMUtils.escapeHtml(task.displayTitle || ''));
        return `
            <div class="${this.namespace}-title-wrapper">
                ${this.renderTaskCheckbox(task)}
                <div class="${this.namespace}-task-title" 
                         data-task-id="${task.id || task.taskId}"
                         data-field="title">${html}</div>
            </div>
        `;
    }

    /**
     * Render task description
     * @param task - Task data
     * @returns Description HTML
     */
    renderTaskDescription(task: any): string {
        const html = (window as any).linkifyStr(CoreDOMUtils.escapeHtml(task.description || '')).replace(/(\r\n|\r|\n)/g, '<br/>');
        return `
            <div class="${this.namespace}-description-wrapper">
                <div class="${this.namespace}-task-description" 
                         data-task-id="${task.id || task.taskId}"
                         data-field="description" 
                         placeholder="Add description...">${html}</div>
            </div>
        `;
    }

    /**
     * Render task action buttons - ENHANCED WITH COLOR SUPPORT
     * @param task - Task data
     * @returns Actions HTML
     */
    renderTaskActions(task: any): string {
        // Generate assignee button with color styling
        const assigneeColorStyle = this.getAssigneeButtonStyle(task);

        return `
            <div class="${this.namespace}-task-actions">
                <button class="${this.namespace}-action-btn fgt-date" data-action="date" data-task-id="${task.id || task.taskId}" data-meta="${CoreDOMUtils.escapeHtml(task.dateFull)}" title="Edit Task">${CoreDOMUtils.escapeHtml(task.date)}</button>
                <button class="${this.namespace}-action-btn fgt-assignee"
                        style="${assigneeColorStyle}"
                        data-action="assignee" 
                        data-task-id="${task.id || task.taskId}" 
                        title="${CoreDOMUtils.escapeHtml(task.assigneeTitle)}">${CoreDOMUtils.escapeHtml(task.assignee)}</button>
                <button class="${this.namespace}-action-btn fgt-goto" data-action="chat" data-task-id="${task.id || task.taskId}" title="Show in Chat">💬</button>
                <button class="${this.namespace}-action-btn fgt-delete danger fgt-lockable" data-action="delete" data-task-id="${task.id || task.taskId}" title="Delete">🗑️</button>
            </div>
        `;
    }

    /**
     * Get assignee button styling based on available colors
     * @param task - Task data
     * @returns CSS style string
     */
    getAssigneeButtonStyle(task: any): string {
        // If colors are already loaded, use them
        if (task.assigneeColors && singletonAssigneeColorUtils) {
            return singletonAssigneeColorUtils.createStyleString(task.assigneeColors);
        }

        // If assignee name exists but no colors yet, use name-based fallback
        if (task.assignee && task.assignee !== '😶' && AssigneeUtils) {
            const fallbackColors = AssigneeUtils.getAvatarColor(task.assignee);
            return `background-color: ${fallbackColors.background}; color: ${fallbackColors.color};`;
        }

        // No assignee or no color utils available
        return '';
    }

    /**
     * Generate statistics HTML
     * @param tasks - Tasks data
     * @param maxCategoryDepth - Maximum category depth
     * @returns Statistics HTML
     */
    renderStatistics(tasks: Map<string, any>, maxCategoryDepth: number): string {
        const stats = this.calculateStatistics(tasks);

        return `
            <span class="${this.namespace}-stats">
                <span class="${this.namespace}-stat-item">
                    pend: <strong>${stats.pending}</strong>,
                </span>
                <span class="${this.namespace}-stat-item">
                    done: <strong>${stats.completed}</strong>,
                </span>
                <span class="${this.namespace}-stat-item">
                    sum: <strong>${stats.total}</strong>,
                </span>
                <span class="${this.namespace}-stat-item">
                    tag: <strong>${stats.categorized}</strong>,
                </span>
                <span class="${this.namespace}-stat-item">
                    groups: <strong>${stats.groups}</strong>,
                </span>
                <span class="${this.namespace}-stat-item">
                    depth: <strong>${maxCategoryDepth}</strong>
                </span>
            </span>
        `;
    }

    /**
     * Calculate task statistics including group count
     * @param tasks - Tasks data
     * @returns Statistics object
     */
    calculateStatistics(tasks: Map<string, any>): any {
        let total = 0;
        let completed = 0;
        let categorized = 0;
        const categoryKeys = new Set<string>();

        tasks.forEach((task) => {
            total++;
            if (task.isCompleted) {
                completed++;
            }
            if (task.categories && task.categories.length > 0) {
                categorized++;

                // Use seed format for grouping
                const seed = CategoryUtils.generateCategorySeed(task.categories, task.categories.length - 1);
                categoryKeys.add(seed);
            } else {
                categoryKeys.add(''); // Uncategorized group
            }
        });

        return {
            total,
            completed,
            pending: total - completed,
            categorized,
            groups: categoryKeys.size
        };
    }

    /**
     * Get table element
     * @returns Table element
     */
    getTableElement(): Element | null {
        return document.querySelector(`#${this.namespace}-tasks-table`);
    }
}

export { TableRenderer };

Logger.fgtlog('✅ Table Renderer loaded successfully with depth classes');