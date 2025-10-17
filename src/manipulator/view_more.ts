// manipulator/view_more.ts
import * as Logger from '@/core/logger';

Logger.fgtlog('➕ OGT View More loading...');

const findViewMoreElement = function(): HTMLDivElement | null {
    return document.querySelector('div[role="listitem"][data-id][data-type="5"]') as HTMLDivElement;
}

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
    _element: HTMLDivElement;

    /**
     * Create a view more wrapper
     * @param element - The view more element
     */
    constructor(element: HTMLDivElement) {
        if (!element) throw new Error('OgtViewMore requires a valid DOM element');
        this._element = element;
    }
    
    /**
     * Get the underlying DOM element
     * @returns The wrapped element
     */
    get element(): HTMLDivElement { 
        return this._element; 
    }
    
    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean { 
        return this._element.isConnected; 
    }

    /**
     * Find a child button tag
     * @returns Button tag element which accepts simple click event instead of click emulation.
     */
    get button(): HTMLButtonElement { 
        return this._element.querySelector('button') as HTMLButtonElement; 
    }
}

export { findViewMoreElement, OgtViewMore };

Logger.fgtlog('✅ OGT View More loaded');