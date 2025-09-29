// assignee/assignee_color_utils.js - Color extraction and management for assignee avatars
console.log('🎨 Assignee Color Utils loading...');

/**
 * Color utilities for extracting dominant colors from assignee avatars
 */
class AssigneeColorUtils {
    constructor() {
        // Cache for storing processed colors by URL
        this.colorCache = new Map();
        
        // Cache for storing loaded image elements
        this.imageCache = new Map();
        
        // Default colors for fallback
        this.defaultColors = {
            backgroundColor: '#9aa0a6',
            textColor: '#ffffff'
        };
    }

    /**
     * Get or extract dominant color from assignee icon
     * @param {string} assigneeIconUrl - Background image URL or style
     * @param {string} assigneeName - Assignee name for fallback
     * @returns {Promise<Object>} - Color object with backgroundColor and textColor
     */
    async getAssigneeColors(assigneeIconUrl, assigneeName = '') {
        try {
            // Clean and extract URL from style string
            const imageUrl = this.extractImageUrl(assigneeIconUrl);
            
            if (!imageUrl) {
                // No image URL, return name-based colors
                return this.getNameBasedColors(assigneeName);
            }

            // Check cache first
            if (this.colorCache.has(imageUrl)) {
                return this.colorCache.get(imageUrl);
            }

            // Extract color from image
            const colors = await this.extractColorFromImage(imageUrl);
            
            // Cache the result
            this.colorCache.set(imageUrl, colors);
            
            return colors;

        } catch (error) {
            console.warn('Failed to extract color from assignee icon:', error);
            return this.getNameBasedColors(assigneeName);
        }
    }

    /**
     * Extract image URL from various input formats
     * @param {string} input - CSS background-image string or direct URL
     * @returns {string|null} - Cleaned image URL
     */
    extractImageUrl(input) {
        if (!input || typeof input !== 'string') {
            return null;
        }

        // Handle background-image: url("...") format
        const urlMatch = input.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (urlMatch) {
            return urlMatch[1];
        }

        // Handle direct URL
        if (input.startsWith('http') || input.startsWith('//')) {
            return input;
        }

        return null;
    }

    /**
     * Extract dominant color from image URL
     * @param {string} imageUrl - Image URL
     * @returns {Promise<Object>} - Color object
     */
    async extractColorFromImage(imageUrl) {
        try {
            // Get or load image element
            const imgElement = await this.loadImage(imageUrl);
            
            // Extract dominant color using ColorThief
            const dominantColor = await this.getDominantColor(imgElement);
            
            // Calculate appropriate text color
            const textColor = this.calculateTextColor(dominantColor);
            
            // Convert to CSS color strings
            const backgroundColor = this.rgbToCss(dominantColor);
            
            return {
                backgroundColor,
                textColor,
                rgb: dominantColor
            };

        } catch (error) {
            console.warn('Failed to extract color from image:', imageUrl, error);
            return this.defaultColors;
        }
    }

    /**
     * Load image element with caching
     * @param {string} imageUrl - Image URL
     * @returns {Promise<HTMLImageElement>} - Loaded image element
     */
    async loadImage(imageUrl) {
        // Check image cache first
        if (this.imageCache.has(imageUrl)) {
            const cachedImg = this.imageCache.get(imageUrl);
            if (cachedImg.complete) {
                return cachedImg;
            }
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // Handle CORS for external images
            
            img.onload = () => {
                // Cache the loaded image
                this.imageCache.set(imageUrl, img);
                resolve(img);
            };
            
            img.onerror = () => {
                reject(new Error(`Failed to load image: ${imageUrl}`));
            };
            
            img.src = imageUrl;
            
            // Set timeout to prevent hanging
            setTimeout(() => {
                if (!img.complete) {
                    reject(new Error(`Image load timeout: ${imageUrl}`));
                }
            }, 5000);
        });
    }

    /**
     * Get dominant color using ColorThief
     * @param {HTMLImageElement} imgElement - Image element
     * @returns {Promise<Array>} - RGB array [r, g, b]
     */
    async getDominantColor(imgElement) {
        // Ensure ColorThief is available
        if (typeof ColorThief === 'undefined') {
            throw new Error('ColorThief library not available');
        }

        // Follow ColorThief FAQ recommendation: ensure image is fully loaded
        if (!imgElement.complete) {
            return new Promise((resolve, reject) => {
                imgElement.addEventListener('load', () => {
                    try {
                        const colorThief = new ColorThief();
                        const color = colorThief.getColor(imgElement, 10);
                        
                        if (!Array.isArray(color) || color.length !== 3) {
                            reject(new Error('Invalid color format from ColorThief'));
                        } else {
                            resolve(color);
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
                
                imgElement.addEventListener('error', () => {
                    reject(new Error('Image failed to load for color extraction'));
                });
            });
        }

        // Image is already loaded, safe to extract color
        const colorThief = new ColorThief();
        const color = colorThief.getColor(imgElement, 10);
        
        // Ensure we have a valid RGB array
        if (!Array.isArray(color) || color.length !== 3) {
            throw new Error('Invalid color format from ColorThief');
        }

        return color;
    }

    /**
     * Calculate appropriate text color based on background brightness
     * @param {Array} rgbColor - RGB array [r, g, b]
     * @returns {string} - Text color (#000000 or #ffffff)
     */
    calculateTextColor(rgbColor) {
        const [r, g, b] = rgbColor;
        
        // Calculate relative luminance using sRGB formula
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Use black text for bright backgrounds, white text for dark backgrounds
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    /**
     * Convert RGB array to CSS color string
     * @param {Array} rgbColor - RGB array [r, g, b]
     * @returns {string} - CSS color string
     */
    rgbToCss(rgbColor) {
        const [r, g, b] = rgbColor;
        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Generate colors based on assignee name (fallback)
     * @param {string} assigneeName - Assignee name
     * @returns {Object} - Color object
     */
    getNameBasedColors(assigneeName) {
        if (!assigneeName) {
            return this.defaultColors;
        }

        // Use existing AssigneeUtils color generation as fallback
        const colors = AssigneeUtils.getAvatarColor(assigneeName);
        
        return {
            backgroundColor: colors.background,
            textColor: colors.color,
            rgb: this.cssToRgb(colors.background)
        };
    }

    /**
     * Convert CSS color string to RGB array (simple implementation)
     * @param {string} cssColor - CSS color string
     * @returns {Array} - RGB array [r, g, b]
     */
    cssToRgb(cssColor) {
        // Simple implementation for HSL to RGB conversion
        // This is a fallback, so we'll use a default
        return [128, 128, 128];
    }

    /**
     * Apply colors to element
     * @param {HTMLElement} element - Target element
     * @param {Object} colors - Color object from getAssigneeColors
     */
    applyColorsToElement(element, colors) {
        if (!element || !colors) return;

        element.style.backgroundColor = colors.backgroundColor;
        element.style.color = colors.textColor;
    }

    /**
     * Preload colors for multiple assignees
     * @param {Array} assigneeList - Array of {name, iconUrl} objects
     * @returns {Promise<Map>} - Map of name -> colors
     */
    async preloadAssigneeColors(assigneeList) {
        const preloadPromises = assigneeList.map(async (assignee) => {
            const colors = await this.getAssigneeColors(assignee.iconUrl, assignee.name);
            return [assignee.name, colors];
        });

        const results = await Promise.all(preloadPromises);
        return new Map(results);
    }

    /**
     * Clear cache (useful for memory management)
     * @param {boolean} clearImages - Also clear image cache
     */
    clearCache(clearImages = false) {
        this.colorCache.clear();
        
        if (clearImages) {
            this.imageCache.clear();
        }
        
        console.log('🎨 Assignee color cache cleared');
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache statistics
     */
    getCacheStats() {
        return {
            colorCacheSize: this.colorCache.size,
            imageCacheSize: this.imageCache.size,
            colorCacheKeys: Array.from(this.colorCache.keys()),
            imageCacheKeys: Array.from(this.imageCache.keys())
        };
    }

    /**
     * Create CSS style string from colors
     * @param {Object} colors - Color object
     * @returns {string} - CSS style string
     */
    createStyleString(colors) {
        return `background-color: ${colors.backgroundColor}; color: ${colors.textColor};`;
    }
}

// Create global instance
window.AssigneeColorUtils = AssigneeColorUtils;

// Create singleton instance for easy access
window.assigneeColorUtils = new AssigneeColorUtils();

console.log('✅ Assignee Color Utils loaded successfully');