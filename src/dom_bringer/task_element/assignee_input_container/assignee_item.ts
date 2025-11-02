// manipulator/task_element/assignee_button/assignee_item.ts
import * as Logger from '@/core/logger';
import type { OgtAssigneeListbox } from '@/dom_bringer/task_element/assignee_input_container/assignee_listbox';

Logger.fgtlog('👤 OGT Assignee Item loading...');

/**
 * Wrapper class for individual assignee option in the listbox
 * Each item represents a team member that can be assigned to a task
 * 
 * @class OgtAssigneeItem
 * @example
 * const items = listbox.findAllAssigneeItems();
 * items.forEach(item => {
 *   if (!item.isUnassignOption()) {
 *     console.log('Assignee:', item.text);
 *   }
 * });
 */
class OgtAssigneeItem {
    _element: HTMLLIElement;

    /**
     * Can be called directly from class
     * @returns - Selector string
     */
    static selector = 'li[role="option"]';

    /**
     * Can be called directly from class
     * @returns - Node list of HTML elements which can be used in constructor
     */
    static findAllElementsInObject(object: OgtAssigneeListbox): NodeListOf<HTMLLIElement> {
        return object.element.querySelectorAll(this.selector);
    }

    /**
     * Create an assignee item wrapper
     * @param element - The list item element
     */
    constructor(element: HTMLLIElement) {
        if (!element) throw new Error('OgtAssigneeItem requires a valid DOM element');
        this._element = element;
    }
    
    /**
     * Get the underlying DOM element
     * @returns The wrapped list item element
     */
    get element(): HTMLLIElement { 
        return this._element; 
    }
    
    /**
     * Get the assignee name text
     * @returns The assignee name or empty string
     */
    get texts(): string[] {
        const array = this._element.querySelectorAll('span[jsname]') as NodeListOf<HTMLSpanElement>;
        let result: string[] = [];
        for (let i = 0; i < array.length; i++) {
            if (array[i].innerText) {
                result.push(array[i].innerText)
            }
        }

        return result
    }
    
    /**
     * Check if this item has an avatar image
     * @returns True if item contains an img element
     */
    hasImage(): boolean {
        return !!this._element.querySelector('img');
    }
    
    /**
     * Check if this item has an SVG icon
     * @returns True if item contains an svg element
     */
    hasSvg(): boolean {
        return !!this._element.querySelector('svg');
    }
    
    /**
     * Check if this is the "unassign" option
     * The unassign option has SVG but no image
     * @returns True if this is the unassign option
     */
    isUnassignOption(): boolean {
        return this.hasSvg() && !this.hasImage();
    }
    
    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean { 
        return this._element.isConnected; 
    }
}

export { OgtAssigneeItem };

Logger.fgtlog('✅ OGT Assignee Item loaded');