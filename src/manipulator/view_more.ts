// manipulator/view_more.ts
import * as Logger from '@/core/logger';

Logger.fgtlog('➕ OGT View More loading...');

/**
 * Wrapper class for the "View more" button element
 * This button appears at the bottom of the task list to load additional tasks
 * Selector: div[role="listitem"][data-id][data-type="5"]
 * 
 * @class OgtViewMore
 * @example
 * const viewMore = OgtFinder.findViewMore();
 * if (viewMore) {
 *   // More tasks available to load
 *   viewMore.element.click();
 * }
 */
class OgtViewMore {
    _element: Element;

    /**
     * Create a view more wrapper
     * @param element - The view more element
     */
    constructor(element: Element) {
        if (!element) throw new Error('OgtViewMore requires a valid DOM element');
        this._element = element;
    }
    
    /**
     * Get the underlying DOM element
     * @returns The wrapped element
     */
    get element(): Element { 
        return this._element; 
    }
    
    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean { 
        return this._element.isConnected; 
    }
}

export { OgtViewMore };

Logger.fgtlog('✅ OGT View More loaded');