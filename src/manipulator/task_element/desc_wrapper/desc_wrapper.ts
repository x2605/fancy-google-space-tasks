// manipulator/task_element/desc_wrapper/desc_wrapper.ts
import * as Logger from '@/core/logger';
import { findDescEditorElement, OgtDescEditor } from './desc_editor';
import { findDescViewerElement, OgtDescViewer } from './desc_viewer';
import type { OgtTaskWrapper } from '@/manipulator/task_element/task_element';

Logger.fgtlog('📦 OGT Desc Wrapper loading...');

const findDescWrapperElement = function(object: OgtTaskWrapper): HTMLDivElement | null {
    return object.element.querySelector('div[role="group"][data-multiline][data-max-length]') as HTMLDivElement;
}

/**
 * Wrapper class for the description area container
 * Contains both the viewer (display mode) and editor (edit mode) elements
 * The wrapper has [data-multiline] and [data-max-length] attributes
 * 
 * @class OgtDescWrapper
 */
class OgtDescWrapper {
    _element: HTMLDivElement;

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
        const viewerElement = findDescViewerElement(this);
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
        const editorElement = findDescEditorElement(this);
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

export { findDescWrapperElement, OgtDescWrapper };

Logger.fgtlog('✅ OGT Desc Wrapper loaded successfully');