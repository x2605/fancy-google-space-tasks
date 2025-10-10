// category/category_parser.ts - Category parsing utilities
import * as Logger from '@/core/logger';

Logger.fgtlog('🏷️ Category Parser loading...');

/**
 * Category parsing utilities for task titles
 */
class CategoryParser {
    /**
     * Parse task title to extract categories and clean title
     * @param title - Original task title
     * @returns Object with categories array and clean title
     */
    static parseTaskTitle(title: string): { categories: string[]; cleanTitle: string } {
        if (!title || typeof title !== 'string') {
            return { categories: [], cleanTitle: title || '' };
        }

        const categories: string[] = [];
        let cleanTitle = title;

        // Extract categories using regex: [category1][category2]Title
        const categoryRegex = /\[([^\]]+)\]/g;
        let match;

        while ((match = categoryRegex.exec(cleanTitle)) !== null) {
            const category = match[1].trim();
            if (category) {
                categories.push(category);
            }
        }

        // Remove all category brackets from the title
        cleanTitle = cleanTitle.replace(/\[([^\]]+)\]/g, '').trim();

        return { categories, cleanTitle };
    }

    /**
     * Reconstruct title with categories
     * @param categories - Category array
     * @param title - Clean title
     * @returns Reconstructed title with categories
     */
    static reconstructTitle(categories: string[], title: string): string {
        if (!categories || categories.length === 0) {
            return title || '';
        }

        const categoryPrefix = categories.map(cat => `[${cat}]`).join('');
        return `${categoryPrefix}${title || ''}`;
    }

    /**
     * Validate category name
     * @param category - Category name to validate
     * @returns Is valid category
     */
    static isValidCategory(category: string): boolean {
        if (!category || typeof category !== 'string') {
            return false;
        }

        const trimmed = category.trim();

        // Check length
        if (trimmed.length === 0 || trimmed.length > 50) {
            return false;
        }

        // Check for invalid characters
        const invalidChars = /[\[\]<>]/;
        if (invalidChars.test(trimmed)) {
            return false;
        }

        return true;
    }

    /**
     * Clean category name
     * @param category - Category name to clean
     * @returns Cleaned category name
     */
    static cleanCategory(category: string): string {
        if (!category || typeof category !== 'string') {
            return '';
        }

        return category
            .trim()
            .replace(/[\[\]<>]/g, '') // Remove invalid characters
            .substring(0, 50) // Limit length
            .trim();
    }

    /**
     * Parse multiple task titles
     * @param titles - Array of task titles
     * @returns Array of parsed results
     */
    static parseMultipleTitles(titles: string[]): any[] {
        if (!Array.isArray(titles)) {
            return [];
        }

        return titles.map(title => CategoryParser.parseTaskTitle(title));
    }

    /**
     * Extract all unique categories from parsed results
     * @param parsedResults - Array of parsed results
     * @returns Unique categories
     */
    static extractUniqueCategories(parsedResults: any[]): string[] {
        const allCategories = new Set<string>();

        parsedResults.forEach(result => {
            if (result.categories && Array.isArray(result.categories)) {
                result.categories.forEach((category: string) => {
                    allCategories.add(category);
                });
            }
        });

        return Array.from(allCategories).sort();
    }

    /**
     * Calculate maximum category depth
     * @param parsedResults - Array of parsed results
     * @returns Maximum category depth
     */
    static calculateMaxDepth(parsedResults: any[]): number {
        let maxDepth = 0;

        parsedResults.forEach(result => {
            if (result.categories && Array.isArray(result.categories)) {
                maxDepth = Math.max(maxDepth, result.categories.length);
            }
        });

        return maxDepth;
    }

    /**
     * Group tasks by first category
     * @param tasks - Array of task objects
     * @returns Grouped tasks by category
     */
    static groupByFirstCategory(tasks: any[]): any {
        const grouped: any = {
            uncategorized: []
        };

        tasks.forEach(task => {
            const firstCategory = task.categories && task.categories[0];

            if (firstCategory) {
                if (!grouped[firstCategory]) {
                    grouped[firstCategory] = [];
                }
                grouped[firstCategory].push(task);
            } else {
                grouped.uncategorized.push(task);
            }
        });

        return grouped;
    }

    /**
     * Create category hierarchy
     * @param parsedResults - Array of parsed results
     * @returns Category hierarchy tree
     */
    static createCategoryHierarchy(parsedResults: any[]): any {
        const hierarchy: any = {};

        parsedResults.forEach(result => {
            if (!result.categories || result.categories.length === 0) {
                return;
            }

            let current = hierarchy;

            result.categories.forEach((category: string) => {
                if (!current[category]) {
                    current[category] = {
                        children: {},
                        tasks: []
                    };
                }
                current = current[category].children;
            });

            // Add task to the deepest level
            let taskLevel = hierarchy;
            result.categories.forEach((category: string) => {
                taskLevel = taskLevel[category];
            });

            if (taskLevel.tasks) {
                taskLevel.tasks.push(result);
            }
        });

        return hierarchy;
    }

    /**
     * Suggest category name based on existing categories
     * @param input - Partial input
     * @param existingCategories - Existing categories
     * @returns Suggested categories
     */
    static suggestCategories(input: string, existingCategories: string[]): string[] {
        if (!input || !Array.isArray(existingCategories)) {
            return [];
        }

        const inputLower = input.toLowerCase().trim();

        return existingCategories
            .filter(category =>
                category.toLowerCase().includes(inputLower)
            )
            .sort((a, b) => {
                // Prioritize exact matches and starts-with matches
                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();

                if (aLower === inputLower) return -1;
                if (bLower === inputLower) return 1;
                if (aLower.startsWith(inputLower)) return -1;
                if (bLower.startsWith(inputLower)) return 1;

                return a.localeCompare(b);
            })
            .slice(0, 5); // Limit to 5 suggestions
    }

    /**
     * Parse category from title with position info
     * @param title - Task title
     * @returns Detailed parsing info
     */
    static parseWithPositions(title: string): any {
        if (!title || typeof title !== 'string') {
            return {
                categories: [],
                cleanTitle: title || '',
                positions: [],
                originalTitle: title || ''
            };
        }

        const categories: string[] = [];
        const positions: any[] = [];
        let cleanTitle = title;
        const categoryRegex = /\[([^\]]+)\]/g;
        let match;

        while ((match = categoryRegex.exec(title)) !== null) {
            const category = match[1].trim();
            if (category) {
                categories.push(category);
                positions.push({
                    category: category,
                    start: match.index,
                    end: match.index + match[0].length,
                    full: match[0]
                });
            }
        }

        // Remove categories from title
        cleanTitle = title.replace(/^\[([^\]]+)\]/g, '').trim();

        // Default title if empty
        if (!cleanTitle && categories.length > 0) {
            cleanTitle = `Task (${categories.join(' > ')})`;
        } else if (!cleanTitle) {
            cleanTitle = 'Untitled Task';
        }

        return {
            categories,
            cleanTitle,
            positions,
            originalTitle: title
        };
    }

    /**
     * Validate and clean multiple categories
     * @param categories - Categories to validate
     * @returns Cleaned valid categories
     */
    static validateAndCleanCategories(categories: string[]): string[] {
        if (!Array.isArray(categories)) {
            return [];
        }

        return categories
            .map(cat => CategoryParser.cleanCategory(cat))
            .filter(cat => CategoryParser.isValidCategory(cat))
            .filter((cat, index, arr) => arr.indexOf(cat) === index); // Remove duplicates
    }
}

export { CategoryParser };

Logger.fgtlog('✅ Category Parser loaded successfully');