// category/category_parser.js - Category parsing utilities
fgtlog('🏷️ Category Parser loading...');

/**
 * Category parsing utilities for task titles
 */
class CategoryParser {
    /**
     * Parse task title to extract categories and clean title
     * @param {string} title - Original task title
     * @returns {Object} - {categories: string[], cleanTitle: string}
     */
    static parseTaskTitle(title) {
        if (!title || typeof title !== 'string') {
            return { categories: [], cleanTitle: title || '' };
        }

        const categories = [];
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
     * @param {string[]} categories - Category array
     * @param {string} title - Clean title
     * @returns {string} - Reconstructed title with categories
     */
    static reconstructTitle(categories, title) {
        if (!categories || categories.length === 0) {
            return title || '';
        }

        const categoryPrefix = categories.map(cat => `[${cat}]`).join('');
        return `${categoryPrefix}${title || ''}`;
    }

    /**
     * Validate category name
     * @param {string} category - Category name to validate
     * @returns {boolean} - Is valid category
     */
    static isValidCategory(category) {
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
     * @param {string} category - Category name to clean
     * @returns {string} - Cleaned category name
     */
    static cleanCategory(category) {
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
     * @param {string[]} titles - Array of task titles
     * @returns {Object[]} - Array of parsed results
     */
    static parseMultipleTitles(titles) {
        if (!Array.isArray(titles)) {
            return [];
        }

        return titles.map(title => CategoryParser.parseTaskTitle(title));
    }

    /**
     * Extract all unique categories from parsed results
     * @param {Object[]} parsedResults - Array of parsed results
     * @returns {string[]} - Unique categories
     */
    static extractUniqueCategories(parsedResults) {
        const allCategories = new Set();

        parsedResults.forEach(result => {
            if (result.categories && Array.isArray(result.categories)) {
                result.categories.forEach(category => {
                    allCategories.add(category);
                });
            }
        });

        return Array.from(allCategories).sort();
    }

    /**
     * Calculate maximum category depth
     * @param {Object[]} parsedResults - Array of parsed results
     * @returns {number} - Maximum category depth
     */
    static calculateMaxDepth(parsedResults) {
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
     * @param {Object[]} tasks - Array of task objects
     * @returns {Object} - Grouped tasks by category
     */
    static groupByFirstCategory(tasks) {
        const grouped = {
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
     * @param {Object[]} parsedResults - Array of parsed results
     * @returns {Object} - Category hierarchy tree
     */
    static createCategoryHierarchy(parsedResults) {
        const hierarchy = {};

        parsedResults.forEach(result => {
            if (!result.categories || result.categories.length === 0) {
                return;
            }

            let current = hierarchy;

            result.categories.forEach(category => {
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
            result.categories.forEach(category => {
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
     * @param {string} input - Partial input
     * @param {string[]} existingCategories - Existing categories
     * @returns {string[]} - Suggested categories
     */
    static suggestCategories(input, existingCategories) {
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
     * @param {string} title - Task title
     * @returns {Object} - Detailed parsing info
     */
    static parseWithPositions(title) {
        if (!title || typeof title !== 'string') {
            return {
                categories: [],
                cleanTitle: title || '',
                positions: [],
                originalTitle: title || ''
            };
        }

        const categories = [];
        const positions = [];
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
     * @param {string[]} categories - Categories to validate
     * @returns {string[]} - Cleaned valid categories
     */
    static validateAndCleanCategories(categories) {
        if (!Array.isArray(categories)) {
            return [];
        }

        return categories
            .map(cat => CategoryParser.cleanCategory(cat))
            .filter(cat => CategoryParser.isValidCategory(cat))
            .filter((cat, index, arr) => arr.indexOf(cat) === index); // Remove duplicates
    }
}

// Export to global scope
window.CategoryParser = CategoryParser;

fgtlog('✅ Category Parser loaded successfully');