// manipulator/task_element/assignee_button/assignee_listbox.ts
import * as Logger from '@/core/logger';
import { OgtAssigneeItem } from './assignee_item';

Logger.fgtlog('👥 OGT Assignee Listbox loading...');

/**
 * Wrapper class for the assignee selection dropdown listbox
 * This dropdown appears when clicking the assignee button
 * Selector: div[data-stable-unique-listbox-id]
 * 
 * @class OgtAssigneeListbox
 * @example
 * const listbox = await assigneeButton.waitForAssigneeListbox();
 * const items = listbox.findAllAssigneeItems();
 */
class OgtAssigneeListbox {
    _element: Element;

    /**
     * Create an assignee listbox wrapper
     * @param element - The listbox container element
     */
    constructor(element: Element) {
        if (!element) throw new Error('OgtAssigneeListbox requires a valid DOM element');
        this._element = element;
    }

    /**
     * Get the underlying DOM element
     * @returns The wrapped listbox element
     */
    get element(): Element { 
        return this._element; 
    }

    /**
     * Find all assignee items in the listbox
     * @returns Array of assignee item wrappers
     */
    findAllAssigneeItems(): any[] {
        const listbox = this._element.querySelector('ul[role="listbox"][data-list-type][data-childcount]');
        if (!listbox) return [];
        const items = listbox.querySelectorAll('li[role="option"]');
        return Array.from(items).map(el => new OgtAssigneeItem(el));
    }

    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean { 
        return this._element.isConnected; 
    }
}

export { OgtAssigneeListbox };

Logger.fgtlog('✅ OGT Assignee Listbox loaded');