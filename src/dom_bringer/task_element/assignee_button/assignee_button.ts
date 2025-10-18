// dom_bringer/task_element/assignee_button/assignee_button.ts
import * as Logger from '@/core/logger';
import { OgtAssigneeListbox } from './assignee_listbox';
import { OgtAssigneeImage } from './assignee_image';
import { OgtAssigneeText } from './assignee_text';
import type { OgtTaskWrapper } from '@/dom_bringer/task_element/task_element';

Logger.fgtlog('👤 OGT Assignee Button loading...');

/**
 * Wrapper class for the assignee button element
 * This button shows the current assignee and opens the assignee selector when clicked
 * 
 * @class OgtAssigneeButton
 */
class OgtAssigneeButton {
    _element: HTMLDivElement;

    /**
     * Can be called directly from class
     * @returns - Selector string
     */
    static selector = 'div[role="button"][aria-disabled]:not([data-first-date-el])';

    /**
     * Can be called directly from class
     * @returns - An HTML element which can be used in constructor
     */
    static findElementInObject(object: OgtTaskWrapper): HTMLDivElement | null {
        return object.element.querySelector(this.selector);
    }

    /**
     * Create an assignee button wrapper
     * @param element - The button element
     */
    constructor(element: HTMLDivElement) {
        if (!element) {
            throw new Error('OgtAssigneeButton requires a valid DOM element');
        }
        this._element = element;
    }

    /**
     * Get the underlying DOM element
     * @returns The wrapped button element
     */
    get element(): HTMLDivElement {
        return this._element;
    }

    /**
     * Find the assignee text element (span with title)
     * @returns OgtAssigneeText or null
     */
    findAssigneeText(): OgtAssigneeText | null {
        const textElement = this._element.querySelector('span[title]');
        if (!textElement) return null;
        return new OgtAssigneeText(textElement);
    }

    /**
     * Find the assignee avatar image element
     * @returns OgtAssigneeImage or null
     */
    findAssigneeImage(): OgtAssigneeImage | null {
        const imgElement = this._element.querySelector('div[style*="background-image"]') as HTMLDivElement;
        if (!imgElement) return null;
        return new OgtAssigneeImage(imgElement);
    }

    /**
     * Wait for assignee listbox to appear after clicking button
     * @param timeout - Maximum wait time
     * @returns Promise resolving to OgtAssigneeListbox
     */
    async waitForAssigneeListbox(timeout: number = 3000): Promise<any> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const listbox = document.querySelector('div[data-stable-unique-listbox-id]') as HTMLDivElement;
            if (listbox && listbox.offsetParent !== null) {
                return new OgtAssigneeListbox(listbox);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        throw new Error('Assignee listbox did not appear within timeout');
    }

    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean {
        return this._element.isConnected;
    }
}

export { OgtAssigneeButton };

Logger.fgtlog('✅ OGT Assignee Button loaded successfully');