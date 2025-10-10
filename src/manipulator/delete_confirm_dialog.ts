// manipulator/delete_confirm_dialog.ts
import * as Logger from '@/core/logger';

Logger.fgtlog('⚠️ OGT Delete Confirm Dialog loading...');

/**
 * Wrapper class for the delete confirmation dialog
 * This modal appears when user clicks the delete button
 * Selector: div[role="alertdialog"]
 * 
 * @class OgtDeleteConfirmDialog
 * @example
 * // After clicking delete button
 * const dialog = new OgtDeleteConfirmDialog(dialogElement);
 * const confirmButton = dialog.findDeleteConfirmButton();
 * if (confirmButton) {
 *   confirmButton.click(); // Confirm deletion
 * }
 */
class OgtDeleteConfirmDialog {
    _element: Element;

    /**
     * Create a delete confirm dialog wrapper
     * @param element - The dialog element
     */
    constructor(element: Element) {
        if (!element) throw new Error('OgtDeleteConfirmDialog requires a valid DOM element');
        this._element = element;
    }
    
    /**
     * Get the underlying DOM element
     * @returns The wrapped dialog element
     */
    get element(): Element { 
        return this._element; 
    }
    
    /**
     * Find the delete confirmation button in the dialog
     * @returns The OK/Confirm button or null if not found
     */
    findDeleteConfirmButton(): HTMLButtonElement | null {
        const button = this._element.querySelector('button[data-mdc-dialog-action="ok"]') as HTMLButtonElement;
        if (!button) return null;
        return button;
    }
    
    /**
     * Check if the element is still in the DOM
     * @returns True if element is connected to document
     */
    isConnected(): boolean { 
        return this._element.isConnected; 
    }
}

export { OgtDeleteConfirmDialog };

Logger.fgtlog('✅ OGT Delete Confirm Dialog loaded');