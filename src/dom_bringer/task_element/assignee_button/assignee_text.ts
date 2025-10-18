// manipulator/task_element/assignee_button/assignee_text.ts
import * as Logger from '@/core/logger';

Logger.fgtlog('👤 OGT Assignee Text loading...');

/**
 * Wrapper class for the assignee text element
 * Contains the assignee name displayed on the button
 * 
 * @class OgtAssigneeText
 */
class OgtAssigneeText {
    _element: Element;

    /**
     * Create an assignee text wrapper
     * @param element - The span element with title attribute
     */
    constructor(element: Element) {
        if (!element) {
            throw new Error('OgtAssigneeText requires a valid DOM element');
        }
        this._element = element;
    }

    /**
     * Get the underlying DOM element
     * @returns The wrapped span element
     */
    get element(): Element {
        return this._element;
    }

    /**
     * Get the assignee name text
     * @returns The displayed assignee name
     */
    get text(): string {
        return this._element.textContent?.trim() || '😶';
    }

    /**
     * Get the full title attribute
     * Usually contains more info than the text content
     * @returns The title attribute value
     */
    get title(): string {
        return this._element.getAttribute('title') || 'assign';
    }

    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean {
        return this._element.isConnected;
    }
}

export { OgtAssigneeText };

Logger.fgtlog('✅ OGT Assignee Text loaded successfully');