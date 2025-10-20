// manipulator/task_element/assignee_button/assignee_image.ts
import * as Logger from '@/core/logger';
import type { OgtAssigneeButton } from '@/dom_bringer/task_element/assignee_button/assignee_button';

Logger.fgtlog('🖼️ OGT Assignee Image loading...');

/**
 * Wrapper class for the assignee avatar image element
 * Contains the background-image style with the avatar URL
 * 
 * @class OgtAssigneeImage
 */
class OgtAssigneeImage {
    _element: HTMLDivElement;

    /**
     * Can be called directly from class
     * @returns - Selector string
     */
    static selector = 'div[style*="background-image"]';

    /**
     * Can be called directly from class
     * @returns - An HTML element which can be used in constructor
     */
    static findElementInObject(object: OgtAssigneeButton): HTMLDivElement | null {
        return object.element.querySelector(this.selector);
    }

    /**
     * Create an assignee image wrapper
     * @param element - The div element with background-image style
     */
    constructor(element: HTMLDivElement) {
        if (!element) {
            throw new Error('OgtAssigneeImage requires a valid DOM element');
        }
        this._element = element;
    }

    /**
     * Get the underlying DOM element
     * @returns The wrapped div element
     */
    get element(): Element {
        return this._element;
    }

    /**
     * Get the CSS url() string from background-image style
     * Returns the full CSS value including "url(...)"
     * @returns The CSS background-image value
     */
    get cssURL(): string {
        const bgImage = this._element.style.backgroundImage;
        if (bgImage) {
            return bgImage;
        }
        
        return '';
    }

    /**
     * Extract just the URL from the CSS url() format
     * Removes "url(" and ")" wrapper and quotes
     * @returns The raw image URL
     */
    get url(): string {
        const cssURL = this.cssURL;
        const match = cssURL.match(/url\(['"]?([^'"]+)['"]?\)/);
        return match ? match[1] : '';
    }

    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean {
        return this._element.isConnected;
    }
}

export { OgtAssigneeImage };

Logger.fgtlog('✅ OGT Assignee Image loaded successfully');