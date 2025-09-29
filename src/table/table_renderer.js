// table/table_renderer.js - Table rendering with unified OKLCH/HSL color logic + Color Support
console.log('📊 Table Renderer loading...');

/**
 * Table rendering utilities for fancy-gst-tasks-table block
 */
class TableRenderer {
    constructor(namespace = 'fancy-gst') {
        this.namespace = namespace;
    }

    /**
     * Check if OKLCH color space is supported
     * @returns {boolean} - OKLCH support status
     */
    checkOKLCHSupport() {
        if (typeof CSS === 'undefined' || !CSS.supports) {
            return false;
        }
        return CSS.supports('color', 'oklch(0.7 0.15 180)');
    }

    /**
     * Generate color from category seed - UNIFIED OKLCH/HSL logic
     * @param {string} seed - Category seed (e.g., "[Work][ProjectA]")
     * @param {number} level - Category level (0-based for table, 1-based for display)
     * @returns {Object} - Color style object
     */
    generateColorFromSeed(seed, level = 0) {
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
            fontSize: Math.max(1.2, 1.6 - level*0.1) + 'em',
            hue: hue
        };
    }

    /**
     * Group and sort tasks hierarchically
     */
    groupAndSortTasks(tasks) {
        const tasksArray = Array.from(tasks.values());
        
        // Add original index
        tasksArray.forEach((task, index) => {
            task.originalIndex = index;
        });
        
        // Build hierarchical structure
        const result = [];
        const firstOccurrence = new Map(); // Track first occurrence of each category path
        
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
        const processLevel = (tasks, level = 0) => {
            if (tasks.length === 0) return [];
            
            const grouped = new Map();
            const categoryOrder = [];
            
            // Group by category at current level
            tasks.forEach(task => {
                const categoryAtLevel = task.categories[level] || '';
                
                if (!grouped.has(categoryAtLevel)) {
                    grouped.set(categoryAtLevel, []);
                    categoryOrder.push(categoryAtLevel);
                }
                grouped.get(categoryAtLevel).push(task);
            });
            
            const result = [];
            
            // Process each group in order of first occurrence
            categoryOrder.forEach(category => {
                const groupTasks = grouped.get(category);
                
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
    calculateRowspanInfo(sortedTasks, maxCategoryDepth) {
        if (maxCategoryDepth === 0) {
            return sortedTasks.map(task => ({ ...task, rowspanInfo: {} }));
        }

        for (let level = 0; level < maxCategoryDepth; level++) {
            let currentCategoryPath = null; // 상위 레벨까지 포함한 전체 경로
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
     * @param {Map} filteredTasks - Filtered tasks data (for display)
     * @param {number} maxCategoryDepth - Maximum category depth
     * @param {Map} allTasks - All tasks data (for statistics) - optional
     * @returns {string} - Complete table HTML
     */
    renderTable(filteredTasks, maxCategoryDepth, allTasks = null) {
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
     * @param {Map} tasks - Tasks data
     */
    async loadAssigneeColorsAsync(tasks) {
        if (!window.assigneeColorUtils) {
            console.warn('AssigneeColorUtils not available');
            return;
        }

        const colorPromises = [];
        
        tasks.forEach((task) => {
            if (task.assigneeIcon && !task.assigneeColors) {
                const colorPromise = window.assigneeColorUtils.getAssigneeColors(task.assigneeIcon, task.assignee)
                    .then(colors => {
                        // Update the task data
                        task.assigneeColors = colors;
                        
                        // Update the UI element
                        const assigneeButton = document.querySelector(`[data-task-id="${task.id}"].fgt-assignee`);
                        if (assigneeButton) {
                            window.assigneeColorUtils.applyColorsToElement(assigneeButton, colors);
                        }
                        
                        return { taskId: task.id, colors };
                    })
                    .catch(error => {
                        console.warn(`Failed to load colors for task ${task.id}:`, error);
                        return null;
                    });
                
                colorPromises.push(colorPromise);
            }
        });

        if (colorPromises.length > 0) {
            try {
                const results = await Promise.all(colorPromises);
                const successCount = results.filter(r => r !== null).length;
                console.log(`🎨 Loaded colors for ${successCount}/${colorPromises.length} assignee buttons`);
            } catch (error) {
                console.warn('Some assignee colors failed to load:', error);
            }
        }
    }

    /**
     * Create table header - individual columns for each category level
     * @param {Map} tasks - Tasks data (for statistics)
     * @param {number} maxCategoryDepth - Maximum category depth
     * @returns {string} - Header HTML
     */
    createTableHeader(tasks, maxCategoryDepth) {
        let headerHTML = '<tr>';
        
        // Category headers - individual columns for each category level
        if (maxCategoryDepth > 0) {
            for (let i = 0; i < maxCategoryDepth; i++) {
                headerHTML += `<th class="${this.namespace}-category-header">${i + 1}</th>`;
            }
        }
        
        headerHTML += `<th class="${this.namespace}-task-header">${this.renderStatistics(tasks, maxCategoryDepth)}</th>`;
        headerHTML += '</tr>';
        
        return headerHTML;
    }

    /**
     * Create table body with all task rows (sorted and grouped with proper rowspan)
     * @param {Map} tasks - Tasks data
     * @param {number} maxCategoryDepth - Maximum category depth
     * @returns {string} - Body HTML
     */
    createTableBody(tasks, maxCategoryDepth) {
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
     * Create task row with proper rowspan support for each category level
     * @param {Object} task - Task data with rowspan info
     * @param {number} maxCategoryDepth - Maximum category depth  
     * @returns {string} - Row HTML
     */
    createTaskRow(task, maxCategoryDepth) {
        const categoryColumns = maxCategoryDepth > 0 ? maxCategoryDepth : 0;
        
        let rowHTML = `<tr class="${this.namespace}-task-row" data-task-id="${task.id || task.taskId}">`;
        
        // Category cells with proper rowspan support
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
                    `background-color: ${colorStyle.backgroundColor}; color: ${colorStyle.color}; font-weight: ${colorStyle.fontWeight};` : 
                    '';
                
                // Add rowspan attribute if this cell spans multiple rows
                const rowspanValue = rowspanInfo[level];
                const rowspanAttr = (typeof rowspanValue === 'number' && rowspanValue > 1) ? 
                    `rowspan="${rowspanValue}"` : '';
                
                // Add additional classes for styling
                const additionalClasses = rowspanValue && typeof rowspanValue === 'number' && rowspanValue > 1 ? 
                    'grouped' : '';
                
                rowHTML += `<td class="${this.namespace}-category-cell ${additionalClasses}" 
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
     * @param {Object} task - Task data
     * @returns {string} - Checkbox HTML
     */
    renderTaskCheckbox(task) {
        return `
            <div class="${this.namespace}-task-checkbox ${task.isCompleted ? 'fgt-completed' : ''} fgt-lockable" 
                 data-task-id="${task.id || task.taskId}"></div>
        `;
    }

    /**
     * Render task details section
     * @param {Object} task - Task data
     * @returns {string} - Details HTML
     */
    renderTaskDetails(task) {
        return `
            <div class="${this.namespace}-task-details">
                ${this.renderTaskTitle(task)}
                ${this.renderTaskDescription(task)}
            </div>
        `;
    }

    /**
     * Render task title
     * @param {Object} task - Task data
     * @returns {string} - Title HTML
     */
    renderTaskTitle(task) {
        const html = linkifyStr(CoreDOMUtils.escapeHtml(task.displayTitle || ''));
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
     * @param {Object} task - Task data
     * @returns {string} - Description HTML
     */
    renderTaskDescription(task) {
        const html = linkifyStr(CoreDOMUtils.escapeHtml(task.description || '')).replace(/(\r\n|\r|\n)/g, '<br/>');
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
     * @param {Object} task - Task data
     * @returns {string} - Actions HTML
     */
    renderTaskActions(task) {
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
     * @param {Object} task - Task data
     * @returns {string} - CSS style string
     */
    getAssigneeButtonStyle(task) {
        // If colors are already loaded, use them
        if (task.assigneeColors && window.assigneeColorUtils) {
            return window.assigneeColorUtils.createStyleString(task.assigneeColors);
        }
        
        // If assignee name exists but no colors yet, use name-based fallback
        if (task.assignee && task.assignee !== '😶' && window.AssigneeUtils) {
            const fallbackColors = window.AssigneeUtils.getAvatarColor(task.assignee);
            return `background-color: ${fallbackColors.background}; color: ${fallbackColors.color};`;
        }
        
        // No assignee or no color utils available
        return '';
    }

    /**
     * Generate statistics HTML
     * @param {Map} tasks - Tasks data
     * @param {number} maxCategoryDepth - Maximum category depth
     * @returns {string} - Statistics HTML
     */
    renderStatistics(tasks, maxCategoryDepth) {
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
     * @param {Map} tasks - Tasks data
     * @returns {Object} - Statistics object
     */
    calculateStatistics(tasks) {
        let total = 0;
        let completed = 0;
        let categorized = 0;
        const categoryKeys = new Set();

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
     * @returns {Element|null} - Table element
     */
    getTableElement() {
        return document.querySelector(`#${this.namespace}-tasks-table`);
    }
}

// Export to global scope
window.TableRenderer = TableRenderer;

console.log('✅ Table Renderer loaded successfully');