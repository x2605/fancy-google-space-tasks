// manipulator/task_container.ts
import * as Logger from '@/core/logger';
import { OgtTaskWrapper } from './task_element/task_element';

Logger.fgtlog('📦 OGT Task Container loading...');

/**
 * Wrapper class for the task list container
 * This element contains all visible task rows in the list
 * 
 * @class OgtTaskContainer
 * @example
 * const container = OgtFinder.findTaskContainer();
 * if (container) {
 *   const tasks = container.findAllTaskWrappers();
 *   console.log(`Container has ${tasks.length} tasks`);
 * }
 */
class OgtTaskContainer {
    _element: HTMLDivElement;

    /**
     * Can be called directly from class
     * @returns - Selector string
     */
    static selector = 'div[role="list"]';

    /**
     * Can be called directly from class
     * @returns - An HTML element which can be used in constructor
     */
    static findElement(): HTMLDivElement | null {
        return document.querySelector(this.selector);
    }

    /**
     * Can be called directly from class
     * @returns - Node list of HTML elements which can be used in constructor
     */
    static findAllElements(): NodeListOf<HTMLDivElement> {
        return document.querySelectorAll(this.selector);
    }

    /**
     * Create a task container wrapper
     * @param element - The container list element
     */
    constructor(element: HTMLDivElement) {
        if (!element) throw new Error('OgtTaskContainer requires a valid DOM element');
        this._element = element;
    }
    
    /**
     * Get the underlying DOM element
     * @returns The wrapped list element
     */
    get element(): HTMLDivElement { 
        return this._element; 
    }
    
    /**
     * Find all task elements within this container
     * @returns Array of task element wrappers
     */
    findAllTaskWrappers(): OgtTaskWrapper[] {
        const elements = OgtTaskWrapper.findAllElementsInDOM(this._element);
        return Array.from(elements).map(el => new OgtTaskWrapper(el));
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