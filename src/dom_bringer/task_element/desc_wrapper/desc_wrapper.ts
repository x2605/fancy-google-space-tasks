// dom_bringer/task_element/desc_wrapper/desc_wrapper.ts
import * as Logger from '@/core/logger';
import { OgtDescEditor } from './desc_editor';
import { OgtDescViewer } from './desc_viewer';
import type { OgtTaskWrapper } from '@/dom_bringer/task_element/task_element';

Logger.fgtlog('📦 OGT Desc Wrapper loading...');

/**
 * Wrapper class for the description area container
 * Contains both the viewer (display mode) and editor (edit mode) elements
 * 
 * @class OgtDescWrapper
 */
class OgtDescWrapper {
    _element: HTMLDivElement;

    /**
     * Can be called directly from class
     * @returns - Selector string
     */
    static selector = 'div[role="group"][data-multiline][data-max-length]';

    /**
     * Can be called directly from class
     * @returns - An HTML element which can be used in constructor
     */
    static findElementInObject(object: OgtTaskWrapper): HTMLDivElement | null {
        return object.element.querySelector(this.selector);
    }

    /**
     * Create a description wrapper
     * @param element - The wrapper div element
     */
    constructor(element: HTMLDivElement) {
        if (!element) {
            throw new Error('OgtDescWrapper requires a valid DOM element');
        }
        this._element = element;
    }

    /**
     * Get the underlying DOM element
     * @returns The wrapped div element
     */
    get element(): HTMLDivElement {
        return this._element;
    }

    /**
     * Get the placeholder text
     * This is shown when there's no description
     * @returns The placeholder text
     */
    get placeholder(): string {
        return this._element.getAttribute('data-placeholder') || '';
    }

    /**
     * Find the description viewer element (view mode)
     * This is the element with [jsname][title] attributes
     * @returns Description viewer wrapper or null if not found
     */
    findDescViewer(): OgtDescViewer | null {
        const viewerElement = OgtDescViewer.findElementInObject(this);
        if (!viewerElement) {
            return null;
        }
        return new OgtDescViewer(viewerElement);
    }

    /**
     * Find the description editor element (edit mode)
     * This textarea appears when user clicks to edit
     * Selector: textarea[rows][maxlength][data-is-auto-expanding]
     * @returns Description editor wrapper or null if not found
     */
    findDescEditor(): OgtDescEditor | null {
        const editorElement = OgtDescEditor.findElementInObject(this);
        if (!editorElement) {
            return null;
        }
        return new OgtDescEditor(editorElement);
    }

    /**
     * Wait for description editor to appear
     * Useful when transitioning from view to edit mode
     * @param timeout - Maximum wait time in milliseconds
     * @returns Promise that resolves with editor wrapper
     */
    async waitForDescEditor(timeout: number = 3000): Promise<OgtDescEditor | null> {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const editor = this.findDescEditor();
            if (editor && editor.element.offsetParent !== null) {
                return editor;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error('Description editor did not appear within timeout');
    }

    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean {
        return this._element.isConnected;
    }
}

export { OgtDescWrapper };

Logger.fgtlog('✅ OGT Desc Wrapper loaded successfully');