// manipulator/task_element/desc_wrapper/desc_editor.ts
import * as Logger from '@/core/logger';

Logger.fgtlog('✏️ OGT Desc Editor loading...');

/**
 * Wrapper class for the description editor (textarea) in original Google Tasks
 * This element appears when editing the task description
 * Auto-expanding textarea with special attributes
 * 
 * @class OgtDescEditor
 */
class OgtDescEditor {
    _element: HTMLTextAreaElement;

    /**
     * Create a description editor wrapper
     * @param element - The textarea DOM element
     */
    constructor(element: HTMLTextAreaElement) {
        if (!element) {
            throw new Error('OgtDescEditor requires a valid DOM element');
        }
        this._element = element;
    }

    /**
     * Get the underlying DOM element
     * @returns The wrapped textarea element
     */
    get element(): HTMLTextAreaElement {
        return this._element;
    }

    /**
     * Get the current value of the textarea
     * @returns The description text being edited
     */
    get value(): string {
        return this._element.value || '';
    }

    /**
     * Get the maximum length allowed for the description
     * @returns Maximum character length
     */
    get maxLength(): number {
        return parseInt(this._element.getAttribute('maxlength') || '4095');
    }

    /**
     * Check if this is an auto-expanding textarea
     * @returns True if textarea auto-expands
     */
    get isAutoExpanding(): boolean {
        return this._element.hasAttribute('data-is-auto-expanding');
    }

    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean {
        return this._element.isConnected;
    }

    /**
     * Focus on the textarea
     */
    focus(): void {
        this._element.focus();
    }

    /**
     * Blur the textarea (trigger save)
     */
    blur(): void {
        this._element.blur();
    }
}

export { OgtDescEditor };

Logger.fgtlog('✅ OGT Desc Editor loaded successfully');