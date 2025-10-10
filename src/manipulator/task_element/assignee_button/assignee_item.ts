// manipulator/task_element/assignee_button/assignee_item.ts
import * as Logger from '@/core/logger';

Logger.fgtlog('👤 OGT Assignee Item loading...');

/**
 * Wrapper class for individual assignee option in the listbox
 * Each item represents a team member that can be assigned to a task
 * Selector: li[role="option"]
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
    _element: Element;

    /**
     * Create an assignee item wrapper
     * @param element - The list item element
     */
    constructor(element: Element) {
        if (!element) throw new Error('OgtAssigneeItem requires a valid DOM element');
        this._element = element;
    }
    
    /**
     * Get the underlying DOM element
     * @returns The wrapped list item element
     */
    get element(): Element { 
        return this._element; 
    }
    
    /**
     * Get the assignee name text
     * @returns The assignee name or empty string
     */
    get text(): string {
        return this._element.textContent?.trim() || '';
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