// category/category_utils.ts - Category parsing and seed generation (REFACTORED - No color logic)
import * as Logger from '@/core/logger';
import { CoreDOMUtils } from '@/core/dom_utils';

Logger.fgtlog('🏷️ Category Utils loading...');

interface GroupingEntry {
    seed: string;
    categories: string[];
    taskCount: number;
    isUncategorized: boolean;
}

interface CategoryStatistics {
    totalTasks: number;
    categorizedTasks: number;
    uncategorizedTasks: number;
    uniqueCategories: string[];
    categoryUsage: Record<string, number>;
    levelDistribution: Record<number, number>;
    groupings: Map<string, number>;
    maxDepth: number;
    groupingsArray: GroupingEntry[];
}

/**
 * Category utilities for parsing and seed generation (Color logic moved to TableRenderer)
 */
class CategoryUtils {
    /**
     * Generate category seed for consistent color generation
     * @param categories - Category array
     * @param level - Category level (0-based)
     * @returns Cumulative category seed for this level
     */
    static generateCategorySeed(categories: string[], level: number): string {
        if (!categories || categories.length === 0 || level < 0) {
            return '';
        }

        // Create cumulative seed up to this level: [cat1][cat2][cat3]
        const relevantCategories = categories.slice(0, level + 1);
        return relevantCategories.map(cat => `[${cat}]`).join('');
    }

    /**
     * Generate hash from string for consistent color generation
     * @param str - Input string
     * @returns Hash value
     */
    static hashString(str: string): number {
        let hash = 0;
        if (!str || str.length === 0) return hash;

        // Enhanced hash function for better distribution
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
            // Add additional mixing for better distribution
            hash ^= hash >>> 16;
            hash *= 0x85ebca6b;
            hash ^= hash >>> 13;
            hash *= 0xc2b2ae35;
            hash ^= hash >>> 16;
        }

        return Math.abs(hash);
    }

    /**
     * Generate hue from category seed
     * @param seed - Category seed
     * @returns Hue value (0-360)
     */
    static generateHueFromSeed(seed: string): number {
        const hash = CategoryUtils.hashString(seed);
        return hash % 360;
    }

    /**
     * Convert camelCase to kebab-case
     * @param str - CamelCase string
     * @returns kebab-case string
     */
    static camelToKebab(str: string): string {
        return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    }

    /**
     * Get category badge HTML (uses TableRenderer for color generation)
     * @param category - Category name
     * @param level - Category level (1-based)
     * @param options - Styling options
     * @param fullCategories - Full category array for seed generation
     * @returns Badge HTML
     */
    static getCategoryBadgeHTML(category: string, level: number = 1, options: any = {}, fullCategories: string[] = []): string {
        const className = options.className || 'category-badge';
        const extraStyles = options.styles || {};

        // Generate seed for this level (0-based)
        const seed = CategoryUtils.generateCategorySeed(fullCategories, level - 1);
        const hue = CategoryUtils.generateHueFromSeed(seed);

        // Basic styling (color generation will be handled by CSS or inline from TableRenderer)
        const basicStyle: any = {
            fontWeight: level <= 2 ? '600' : '500',
            fontSize: Math.max(10, 15 - level) + 'px',
            borderRadius: '4px',
            padding: '2px 6px'
        };

        const styleString = Object.entries({ ...basicStyle, ...extraStyles })
            .map(([key, value]) => `${CategoryUtils.camelToKebab(key)}: ${value}`)
            .join('; ');

        return `<span class="${className}" 
                      style="${styleString}" 
                      data-category="${CoreDOMUtils.escapeHtml(category)}" 
                      data-level="${level}"
                      data-seed="${CoreDOMUtils.escapeHtml(seed)}"
                      data-hue="${hue}">${CoreDOMUtils.escapeHtml(category)}</span>`;
    }

    /**
     * Create category hierarchy visualization
     * @param hierarchy - Category hierarchy from CategoryParser
     * @param namespace - CSS namespace
     * @returns Hierarchy HTML
     */
    static createHierarchyHTML(hierarchy: any, namespace: string = 'fancy-gst'): string {
        if (!hierarchy || typeof hierarchy !== 'object') {
            return '<div class="no-hierarchy">No categories found</div>';
        }

        const createNode = (node: any, categoryName: string, level: number = 1, parentCategories: string[] = []): string => {
            const currentCategories = [...parentCategories, categoryName];
            const seed = CategoryUtils.generateCategorySeed(currentCategories, level - 1);
            const taskCount = node.tasks ? node.tasks.length : 0;
            const hasChildren = Object.keys(node.children).length > 0;

            let html = `
                <div class="${namespace}-hierarchy-node" data-level="${level}">
                    <div class="${namespace}-hierarchy-header" data-seed="${seed}">
                        ${CategoryUtils.getCategoryBadgeHTML(categoryName, level, {}, currentCategories)}
                        <span class="${namespace}-task-count">(${taskCount})</span>
                    </div>
            `;

            if (hasChildren) {
                html += `<div class="${namespace}-hierarchy-children">`;
                Object.entries(node.children).forEach(([childName, childNode]) => {
                    html += createNode(childNode as any, childName, level + 1, currentCategories);
                });
                html += `</div>`;
            }

            html += `</div>`;
            return html;
        };

        let html = `<div class="${namespace}-category-hierarchy">`;
        Object.entries(hierarchy).forEach(([categoryName, node]) => {
            html += createNode(node as any, categoryName, 1, []);
        });
        html += `</div>`;

        return html;
    }

    /**
     * Generate CSS variables for categories
     * @param categories - Array of categories
     * @param groupMappings - Category group mappings
     * @param namespace - CSS namespace
     * @returns CSS string with variables
     */
    static generateCategoryCSSVariables(categories: string[], groupMappings: any = {}, namespace: string = 'fancy-gst'): string {
        let css = `:root {\n`;

        // Individual categories
        categories.forEach(category => {
            const seed = CategoryUtils.generateCategorySeed([category], 0);
            const hue = CategoryUtils.generateHueFromSeed(seed);
            const safeName = category.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

            css += `  --${namespace}-category-${safeName}-seed: "${seed}";\n`;
            css += `  --${namespace}-category-${safeName}-hue: ${hue};\n`;
        });

        // Category groups
        Object.entries(groupMappings).forEach(([groupKey, groupData]: [string, any]) => {
            const safeName = groupKey.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

            groupData.categories.forEach((_category: string, level: number) => {
                const seed = CategoryUtils.generateCategorySeed(groupData.categories, level);
                const hue = CategoryUtils.generateHueFromSeed(seed);
                css += `  --${namespace}-group-${safeName}-${level}-seed: "${seed}";\n`;
                css += `  --${namespace}-group-${safeName}-${level}-hue: ${hue};\n`;
            });
        });

        css += `}\n`;
        return css;
    }

    /**
     * Get category statistics
     * @param tasks - Array of tasks with categories
     * @returns Category statistics
     */
    static getCategoryStatistics(tasks: any[]): any {
        const uniqueCategoriesSet = new Set<string>();

        const stats: CategoryStatistics = {
            totalTasks: tasks.length,
            categorizedTasks: 0,
            uncategorizedTasks: 0,
            uniqueCategories: [],
            categoryUsage: {},
            levelDistribution: {},
            groupings: new Map<string, number>(),
            maxDepth: 0,
            groupingsArray: []
        };

        tasks.forEach(task => {
            if (task.categories && task.categories.length > 0) {
                stats.categorizedTasks++;
                stats.maxDepth = Math.max(stats.maxDepth, task.categories.length);

                const depth = task.categories.length;
                stats.levelDistribution[depth] = (stats.levelDistribution[depth] || 0) + 1;

                task.categories.forEach((category: string) => {
                    uniqueCategoriesSet.add(category);
                    stats.categoryUsage[category] = (stats.categoryUsage[category] || 0) + 1;
                });

                // Track category combinations using seed format
                const seed = CategoryUtils.generateCategorySeed(task.categories, task.categories.length - 1);
                const currentCount = stats.groupings.get(seed) || 0;
                stats.groupings.set(seed, currentCount + 1);
            } else {
                stats.uncategorizedTasks++;
                const uncategorizedCount = stats.groupings.get('') || 0;
                stats.groupings.set('', uncategorizedCount + 1);
            }
        });

        stats.uniqueCategories = Array.from(uniqueCategoriesSet);

        stats.groupingsArray = Array.from(stats.groupings.entries()).map(([seed, count]): any => ({
            seed: seed,
            categories: seed ? seed.match(/\[([^\]]+)\]/g)?.map(s => s.slice(1, -1)) || [] : [],
            taskCount: count,
            isUncategorized: !seed
        })).sort((a, b) => b.taskCount - a.taskCount);

        return stats;
    }

    /**
     * Create category selector dropdown HTML
     * @param availableCategories - Available categories
     * @param selectedCategories - Currently selected categories
     * @param namespace - CSS namespace
     * @param groupSuggestions - Suggested category combinations
     * @returns Selector HTML
     */
    static createCategorySelectorHTML(availableCategories: string[], selectedCategories: string[] = [], namespace: string = 'fancy-gst', groupSuggestions: any = {}): string {
        let html = `<div class="${namespace}-category-selector">`;

        // Selected categories display
        if (selectedCategories.length > 0) {
            html += `<div class="${namespace}-selected-categories">`;
            selectedCategories.forEach((category, index) => {
                const seed = CategoryUtils.generateCategorySeed(selectedCategories, index);
                html += `
                    <span class="${namespace}-selected-category" 
                          data-seed="${CoreDOMUtils.escapeHtml(seed)}"
                          data-level="${index + 1}">
                        ${CoreDOMUtils.escapeHtml(category)}
                        <button class="${namespace}-remove-category" data-category="${CoreDOMUtils.escapeHtml(category)}">&times;</button>
                    </span>
                `;
            });
            html += `</div>`;
        }

        // Group suggestions
        if (Object.keys(groupSuggestions).length > 0) {
            html += `
                <div class="${namespace}-group-suggestions">
                    <label>Quick Category Groups:</label>
                    <div class="${namespace}-suggestion-buttons">
            `;

            Object.entries(groupSuggestions).forEach(([groupName, categories]: [string, any]) => {
                const seed = CategoryUtils.generateCategorySeed(categories, categories.length - 1);
                html += `
                    <button class="${namespace}-group-suggestion-btn" 
                            data-categories="${CoreDOMUtils.escapeHtml(categories.join('|'))}"
                            data-seed="${CoreDOMUtils.escapeHtml(seed)}">
                        ${CoreDOMUtils.escapeHtml(groupName)} (${categories.join(' > ')})
                    </button>
                `;
            });

            html += `</div></div>`;
        }

        // Category input
        html += `
            <div class="${namespace}-category-input-wrapper">
                <input type="text" 
                       class="${namespace}-category-input" 
                       placeholder="Add category..." 
                       list="${namespace}-category-datalist">
                <datalist id="${namespace}-category-datalist">
        `;

        availableCategories.forEach(category => {
            html += `<option value="${CoreDOMUtils.escapeHtml(category)}">`;
        });

        html += `
                </datalist>
                <button class="${namespace}-add-category">Add</button>
            </div>
        `;

        html += `</div>`;
        return html;
    }
}

export { CategoryUtils };

Logger.fgtlog('✅ Category Utils loaded successfully');