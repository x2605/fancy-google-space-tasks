// dom_bringer/task_element/assignee_button/assignee_button.ts
import * as Logger from '@/core/logger';
import { OgtAssigneeImage } from './assignee_image';
import { OgtAssigneeText } from './assignee_text';
import type { OgtTaskWrapper } from '@/dom_bringer/task_element/task_element';

Logger.fgtlog('👤 OGT Assignee Button loading...');

/**
 * Wrapper class for the assignee button element
 * This button shows the OgtAssigneeInputWrapper.element and removes itself.
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
        const textElement = OgtAssigneeText.findElementInObject(this);
        if (!textElement) return null;
        return new OgtAssigneeText(textElement);
    }

    /**
     * Find the assignee avatar image element
     * @returns OgtAssigneeImage or null
     */
    findAssigneeImage(): OgtAssigneeImage | null {
        const imgElement = OgtAssigneeImage.findElementInObject(this);
        if (!imgElement) return null;
        return new OgtAssigneeImage(imgElement);
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