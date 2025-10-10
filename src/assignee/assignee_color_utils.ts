// assignee/assignee_color_utils.ts - Color extraction and management for assignee avatars
import * as Logger from '@/core/logger';
import { AssigneeUtils } from './assignee_utils';

Logger.fgtlog('🎨 Assignee Color Utils loading...');

/**
 * Color utilities for extracting dominant colors from assignee avatars
 */
class AssigneeColorUtils {
    colorCache: Map<string, any>;
    imageCache: Map<string, HTMLImageElement>;
    defaultColors: any;

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
     * @param assigneeIconUrl - Background image URL or style
     * @param assigneeName - Assignee name for fallback
     * @returns Color object with backgroundColor and textColor
     */
    async getAssigneeColors(assigneeIconUrl: string, assigneeName: string = ''): Promise<any> {
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
            Logger.fgtwarn('Failed to extract color from assignee icon: ' + error);
            return this.getNameBasedColors(assigneeName);
        }
    }

    /**
     * Extract image URL from various input formats
     * @param input - CSS background-image string or direct URL
     * @returns Cleaned image URL
     */
    extractImageUrl(input: string): string | null {
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
     * @param imageUrl - Image URL
     * @returns Color object
     */
    async extractColorFromImage(imageUrl: string): Promise<any> {
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
            Logger.fgtwarn('Failed to extract color from image: ' + imageUrl + error);
            return this.defaultColors;
        }
    }

    /**
     * Load image element with caching
     * @param imageUrl - Image URL
     * @returns Loaded image element
     */
    async loadImage(imageUrl: string): Promise<HTMLImageElement> {
        // Check image cache first
        if (this.imageCache.has(imageUrl)) {
            const cachedImg = this.imageCache.get(imageUrl)!;
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
     * @param imgElement - Image element
     * @returns RGB array [r, g, b]
     */
    async getDominantColor(imgElement: HTMLImageElement): Promise<number[]> {
        // Ensure ColorThief is available
        if (typeof (window as any).ColorThief === 'undefined') {
            throw new Error('ColorThief library not available');
        }

        // Follow ColorThief FAQ recommendation: ensure image is fully loaded
        if (!imgElement.complete) {
            return new Promise((resolve, reject) => {
                imgElement.addEventListener('load', () => {
                    try {
                        const colorThief = new (window as any).ColorThief();
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
        const colorThief = new (window as any).ColorThief();
        const color = colorThief.getColor(imgElement, 10);

        // Ensure we have a valid RGB array
        if (!Array.isArray(color) || color.length !== 3) {
            throw new Error('Invalid color format from ColorThief');
        }

        return color;
    }

    /**
     * Calculate appropriate text color based on background brightness
     * @param rgbColor - RGB array [r, g, b]
     * @returns Text color (#000000 or #ffffff)
     */
    calculateTextColor(rgbColor: number[]): string {
        const [r, g, b] = rgbColor;

        // Calculate relative luminance using sRGB formula
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Use black text for bright backgrounds, white text for dark backgrounds
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    /**
     * Convert RGB array to CSS color string
     * @param rgbColor - RGB array [r, g, b]
     * @returns CSS color string
     */
    rgbToCss(rgbColor: number[]): string {
        const [r, g, b] = rgbColor;
        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Generate colors based on assignee name (fallback)
     * @param assigneeName - Assignee name
     * @returns Color object
     */
    getNameBasedColors(assigneeName: string): any {
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
     * @param cssColor - CSS color string
     * @returns RGB array [r, g, b]
     */
    cssToRgb(_cssColor: string): number[] {
        // Simple implementation for HSL to RGB conversion
        // This is a fallback, so we'll use a default
        return [128, 128, 128];
    }

    /**
     * Apply colors to element
     * @param element - Target element
     * @param colors - Color object from getAssigneeColors
     */
    applyColorsToElement(element: Element, colors: any): void {
        if (!element || !colors) return;

        (element as HTMLElement).style.backgroundColor = colors.backgroundColor;
        (element as HTMLElement).style.color = colors.textColor;
    }

    /**
     * Preload colors for multiple assignees
     * @param assigneeList - Array of {name, iconUrl} objects
     * @returns Map of name -> colors
     */
    async preloadAssigneeColors(assigneeList: any[]): Promise<Map<string, any>> {
        const preloadPromises = assigneeList.map(async (assignee) => {
            const colors = await this.getAssigneeColors(assignee.iconUrl, assignee.name);
            return [assignee.name, colors];
        });

        const results = await Promise.all(preloadPromises);
        return new Map(results as [string, any][]);
    }

    /**
     * Clear cache (useful for memory management)
     * @param clearImages - Also clear image cache
     */
    clearCache(clearImages: boolean = false): void {
        this.colorCache.clear();

        if (clearImages) {
            this.imageCache.clear();
        }

        Logger.fgtlog('🎨 Assignee color cache cleared');
    }

    /**
     * Get cache statistics
     * @returns Cache statistics
     */
    getCacheStats(): any {
        return {
            colorCacheSize: this.colorCache.size,
            imageCacheSize: this.imageCache.size,
            colorCacheKeys: Array.from(this.colorCache.keys()),
            imageCacheKeys: Array.from(this.imageCache.keys())
        };
    }

    /**
     * Create CSS style string from colors
     * @param colors - Color object
     * @returns CSS style string
     */
    createStyleString(colors: any): string {
        return `background-color: ${colors.backgroundColor}; color: ${colors.textColor};`;
    }
}
const singletonAssigneeColorUtils = new AssigneeColorUtils();

export { AssigneeColorUtils, singletonAssigneeColorUtils };

Logger.fgtlog('✅ Assignee Color Utils loaded successfully');