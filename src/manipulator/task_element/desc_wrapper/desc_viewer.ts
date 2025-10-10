// manipulator/task_element/desc_wrapper/desc_viewer.ts
import * as Logger from '@/core/logger';

Logger.fgtlog('📝 OGT Desc Viewer loading...');

/**
 * Wrapper class for the description viewer element in original Google Tasks
 * This element displays the task description in view mode
 * 
 * @class OgtDescViewer
 */
class OgtDescViewer {
    _element: Element;

    /**
     * Create a description viewer wrapper
     * @param element - The description viewer DOM element
     */
    constructor(element: Element) {
        if (!element) {
            throw new Error('OgtDescViewer requires a valid DOM element');
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
     * Get the description text content
     * @returns The description text
     */
    get text(): string {
        return this._element.textContent?.trim() || '';
    }

    /**
     * Get the placeholder text
     * This is shown when there's no description
     * @returns The placeholder text
     */
    get placeholder(): string {
        return this._element.getAttribute('data-placeholder') || '';
    }

    /**
     * Check if the description is empty (showing only placeholder)
     * @returns True if description is empty
     */
    isEmpty(): boolean {
        const text = this.text;
        const placeholder = this.placeholder;
        return !text || text === placeholder;
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