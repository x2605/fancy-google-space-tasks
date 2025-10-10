// manipulator/task_container.ts
import * as Logger from '@/core/logger';
import { OgtTaskElement } from './task_element/task_element';

Logger.fgtlog('📦 OGT Task Container loading...');

/**
 * Wrapper class for the task list container
 * This element contains all visible task rows in the list
 * Selector: div[role="list"]
 * 
 * @class OgtTaskContainer
 * @example
 * const container = OgtFinder.findTaskContainer();
 * if (container) {
 *   const tasks = container.findAllTaskElements();
 *   console.log(`Container has ${tasks.length} tasks`);
 * }
 */
class OgtTaskContainer {
    _element: Element;

    /**
     * Create a task container wrapper
     * @param element - The container list element
     */
    constructor(element: Element) {
        if (!element) throw new Error('OgtTaskContainer requires a valid DOM element');
        this._element = element;
    }
    
    /**
     * Get the underlying DOM element
     * @returns The wrapped list element
     */
    get element(): Element { 
        return this._element; 
    }
    
    /**
     * Find all task elements within this container
     * @returns Array of task element wrappers
     */
    findAllTaskElements(): any[] {
        const elements = this._element.querySelectorAll('[role="listitem"][data-id][data-type="0"]');
        return Array.from(elements).map(el => new OgtTaskElement(el));
    }
    
    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean { 
        return this._element.isConnected; 
    }
}

export { OgtTaskContainer };

Logger.fgtlog('✅ OGT Task Container loaded');