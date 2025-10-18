// dom_bringer/task_element/desc_wrapper/desc_viewer.ts
import * as Logger from '@/core/logger';
import type { OgtDescWrapper } from '@/dom_bringer/task_element/desc_wrapper/desc_wrapper';

Logger.fgtlog('📝 OGT Desc Viewer loading...');

/**
 * Wrapper class for the description viewer element in original Google Tasks
 * This element displays the task description in view mode
 * 
 * @class OgtDescViewer
 */
class OgtDescViewer {
    _element: HTMLTextAreaElement;

    /**
     * Can be called directly from class
     * @returns - Selector string
     */
    static selector = '[jsname][title]';

    /**
     * Can be called directly from class
     * @returns - An HTML element which can be used in constructor
     */
    static findElementInObject(object: OgtDescWrapper): HTMLTextAreaElement | null {
        return object.element.querySelector(this.selector);
    }

    /**
     * Create a description viewer wrapper
     * @param element - The description viewer DOM element
     */
    constructor(element: HTMLTextAreaElement) {
        if (!element) {
            throw new Error('OgtDescViewer requires a valid DOM element');
        }
        this._element = element;
    }

    /**
     * Get the underlying DOM element
     * @returns The wrapped DOM element
     */
    get element(): HTMLTextAreaElement {
        return this._element;
    }

    /**
     * Get the description text content
     * @returns The description text
     */
    get text(): string {
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

export { OgtDescViewer };

Logger.fgtlog('✅ OGT Desc Viewer loaded successfully');