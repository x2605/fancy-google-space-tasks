// dom_bringer/task_element/title_wrapper/title_viewer.ts
import * as Logger from '@/core/logger';
import type { OgtTitleWrapper } from '@/dom_bringer/task_element/title_wrapper/title_wrapper';

Logger.fgtlog('📄 OGT Title Viewer loading...');

/**
 * Wrapper class for the title viewer element in original Google Tasks
 * This element displays the task title in view mode (not editing)
 * 
 * @class OgtTitleViewer
 */
class OgtTitleViewer {
    _element: Element;

    /**
     * Can be called directly from class
     * @returns - Selector string
     */
    static selector = '[jsname][title]';

    /**
     * Can be called directly from class
     * @returns - An HTML element which can be used in constructor
     */
    static findElementInObject(object: OgtTitleWrapper): HTMLElement | null {
        return object.element.querySelector(this.selector);
    }

    /**
     * Create a title viewer wrapper
     * @param element - The title viewer DOM element
     */
    constructor(element: Element) {
        if (!element) {
            throw new Error('OgtTitleViewer requires a valid DOM element');
        }
        this._element = element;
    }

    /**
     * Get the underlying DOM element
     * @returns The wrapped DOM element
     */
    get element(): Element {
        return this._element;
    }

    /**
     * Get the title text content
     * This extracts the actual text displayed in the viewer
     * IMPORTANT: Preserves newline characters (\n) from multiline titles
     * Mobile app can create tasks with \n in titles, and we need to preserve them
     * @returns The title text with newlines preserved
     */
    get text(): string {
        // textContent preserves \n characters from the DOM
        // Only trim leading/trailing whitespace, not internal newlines
        return this._element.textContent?.trim() || '';
    }

    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean {
        return this._element.isConnected;
    }
}

export { OgtTitleViewer };

Logger.fgtlog('✅ OGT Title Viewer loaded successfully');