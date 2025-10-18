// dom_bringer/task_element/title_wrapper/title_wrapper.ts
import * as Logger from '@/core/logger';
import { OgtTitleEditor } from './title_editor';
import { OgtTitleViewer } from './title_viewer';
import type { OgtTaskWrapper } from '@/dom_bringer/task_element/task_element';

Logger.fgtlog('📦 OGT Title Wrapper loading...');

const findTitleWrapperElement = function(object: OgtTaskWrapper): HTMLDivElement | null {
    return object.element.querySelector('div[role="group"][data-max-length]:not([data-multiline])');
}

/**
 * Wrapper class for the title area container
 * Contains both the viewer (display mode) and editor (edit mode) elements
 * 
 * @class OgtTitleWrapper
 */
class OgtTitleWrapper {
    _element: Element;

    /**
     * Can be called directly from class
     * @returns - Selector string
     */
    static selector = 'div[role="group"][data-max-length]:not([data-multiline])';

    /**
     * Can be called directly from class
     * @returns - An HTML element which can be used in constructor
     */
    static findElementInObject(object: OgtTaskWrapper): HTMLDivElement | null {
        return object.element.querySelector(this.selector);
    }

    /**
     * Create a title wrapper
     * @param element - The wrapper div element
     */
    constructor(element: Element) {
        if (!element) {
            throw new Error('OgtTitleWrapper requires a valid DOM element');
        }
        this._element = element;
    }

    /**
     * Get the underlying DOM element
     * @returns The wrapped div element
     */
    get element(): Element {
        return this._element;
    }

    /**
     * Find the title viewer element (view mode)
     * This is the element with [jsname][title] attributes
     * @returns Title viewer wrapper or null if not found
     */
    findTitleViewer(): OgtTitleViewer | null {
        const viewerElement = OgtTitleViewer.findElementInObject(this);
        if (!viewerElement) {
            return null;
        }
        return new OgtTitleViewer(viewerElement);
    }

    /**
     * Find the title editor element (edit mode)
     * This textarea appears when user clicks to edit
     * Selector: textarea[rows="1"][maxlength]
     * @returns Title editor wrapper or null if not found
     */
    findTitleEditor(): any {
        const editorElement = OgtTitleEditor.findElementInObject(this);
        if (!editorElement) {
            return null;
        }
        return new OgtTitleEditor(editorElement);
    }

    /**
     * Wait for title editor to appear
     * Useful when transitioning from view to edit mode
     * @param timeout - Maximum wait time in milliseconds
     * @returns Promise that resolves with editor wrapper
     */
    async waitForTitleEditor(timeout: number = 3000): Promise<any> {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const editor = this.findTitleEditor();
            if (editor && editor.element.offsetParent !== null) {
                return editor;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error('Title editor did not appear within timeout');
    }

    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean {
        return this._element.isConnected;
    }
}

export { findTitleWrapperElement, OgtTitleWrapper };

Logger.fgtlog('✅ OGT Title Wrapper loaded successfully');