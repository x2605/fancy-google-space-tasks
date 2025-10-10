// manipulator/task_element/title_wrapper/title_viewer.ts
import * as Logger from '@/core/logger';

Logger.fgtlog('📄 OGT Title Viewer loading...');

/**
 * Wrapper class for the title viewer element in original Google Tasks
 * This element displays the task title in view mode (not editing)
 * 
 * @class OgtTitleViewer
 */
class OgtTitleViewer {
    _element: Element;

    /**
     * Create a title viewer wrapper
     * @param element - The title viewer DOM element
     */
    constructor(element: Element) {
        if (!element) {
            throw new Error('OgtTitleViewer requires a valid DOM element');
        }
        this._element = element;
    }

    /**
     * Get the underlying DOM element
     * @returns The wrapped DOM element
     */
    get element(): Element {
        return this._element;
    }

    /**
     * Get the title text content
     * This extracts the actual text displayed in the viewer
     * @returns The title text
     */
    get text(): string {
        return this._element.textContent?.trim() || '';
    }

    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean {
        return this._element.isConnected;
    }
}

export { OgtTitleViewer };

Logger.fgtlog('✅ OGT Title Viewer loaded successfully');