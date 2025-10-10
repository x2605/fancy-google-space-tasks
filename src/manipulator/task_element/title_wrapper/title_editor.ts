// manipulator/task_element/title_wrapper/title_editor.ts
import * as Logger from '@/core/logger';

Logger.fgtlog('✏️ OGT Title Editor loading...');

/**
 * Wrapper class for the title editor (textarea) in original Google Tasks
 * This element appears when editing the task title
 * 
 * @class OgtTitleEditor
 */
class OgtTitleEditor {
    _element: HTMLTextAreaElement;

    /**
     * Create a title editor wrapper
     * @param element - The textarea DOM element
     */
    constructor(element: HTMLTextAreaElement) {
        if (!element) {
            throw new Error('OgtTitleEditor requires a valid DOM element');
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
     * @returns The title text being edited
     */
    get value(): string {
        return this._element.value || '';
    }

    /**
     * Get the maximum length allowed for the title
     * @returns Maximum character length
     */
    get maxLength(): number {
        return parseInt(this._element.getAttribute('maxlength') || '1023');
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

export { OgtTitleEditor };

Logger.fgtlog('✅ OGT Title Editor loaded successfully');