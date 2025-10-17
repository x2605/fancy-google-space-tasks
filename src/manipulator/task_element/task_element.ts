// manipulator/task_element/task_element.ts
import * as Logger from '@/core/logger';
import { findDeleteButtonElement, OgtDeleteButton } from './delete_button';
import { findGoToChatButtonElement, OgtGoToChatButton } from './go_to_chat_button';
import { findAssigneeButtonElement, OgtAssigneeButton } from './assignee_button/assignee_button';
import { findDateButtonElement, OgtDateButton } from './date_button/date_button';
import { findCompleteCheckboxElement, OgtCompleteCheckbox } from './complete_checkbox';
import { findDescWrapperElement, OgtDescWrapper } from './desc_wrapper/desc_wrapper';
import { findTitleWrapperElement, OgtTitleWrapper } from './title_wrapper/title_wrapper';
import { findTouchButtonElements, OgtTouchButton } from './touch_button';

Logger.fgtlog('📋 OGT Task Element loading...');

const findTaskWrapperElement = function(taskId: string): HTMLDivElement | null {
    return document.querySelector(`div[role="listitem"][data-id="${taskId}"][data-type="0"]`);
}

const findAllTaskWrapperElements = function(parent: HTMLElement | Document): NodeListOf<HTMLDivElement> {
    return parent.querySelectorAll('div[role="listitem"][data-id][data-type="0"]');
}

/**
 * Wrapper class for the entire task row element in Original Google Tasks
 * 
 * This represents the main container [role="listitem"][data-id][data-type="0"]
 * that contains all task-related UI elements including title, description, 
 * completion checkbox, date button, assignee button, and action buttons.
 * 
 * The task element is the primary unit of interaction in Google Tasks.
 * Each visible task in the list is represented by one OgtTaskWrapper instance.
 * 
 * @class OgtTaskWrapper
 */
class OgtTaskWrapper {
    _element: HTMLDivElement;

    /**
     * Create a task element wrapper
     * @param element - The task listitem element from original Google Tasks DOM
     */
    constructor(element: HTMLDivElement) {
        if (!element) {
            throw new Error('OgtTaskWrapper requires a valid DOM element');
        }
        this._element = element;
    }

    /**
     * Get the underlying DOM element
     * @returns The wrapped listitem element
     */
    get element(): HTMLDivElement {
        return this._element;
    }

    /**
     * Get the task ID from data-id attribute
     * @returns The task ID (e.g., "task-123")
     */
    get taskId(): string {
        return this._element.getAttribute('data-id') || '';
    }

    /**
     * Find the title wrapper element
     * The title wrapper contains both the viewer (display mode) and editor (edit mode)
     * for the task title. Selector: [data-max-length]:not([data-multiline])
     * @returns Title wrapper or null if not found
     */
    findTitleWrapper(): OgtTitleWrapper | null {
        const wrapper = findTitleWrapperElement(this);
        if (!wrapper) return null;
        return new OgtTitleWrapper(wrapper);
    }

    /**
     * Find the description wrapper element
     * The description wrapper contains both the viewer and editor for the task description.
     * Selector: [data-multiline][data-max-length]
     * @returns Description wrapper or null if not found
     */
    findDescWrapper(): OgtDescWrapper | null {
        const wrapper = findDescWrapperElement(this);
        if (!wrapper) return null;
        return new OgtDescWrapper(wrapper);
    }

    /**
     * Find the complete checkbox button
     * This is the circular button on the left side of the task that marks completion.
     * Selector: button[aria-pressed]
     * @returns Complete checkbox or null if not found
     */
    findCompleteCheckbox(): OgtCompleteCheckbox | null {
        const checkbox = findCompleteCheckboxElement(this);
        if (!checkbox) return null;
        return new OgtCompleteCheckbox(checkbox);
    }

    /**
     * Find the date button
     * This button shows the due date and opens the date picker when clicked.
     * Selector: [data-first-date-el]
     * @returns Date button or null if not found
     */
    findDateButton(): OgtDateButton | null {
        const button = findDateButtonElement(this);
        if (!button) return null;
        return new OgtDateButton(button);
    }

    /**
     * Find the assignee button
     * This button shows the current assignee and opens the assignee selector when clicked.
     * Selector: [role="button"][aria-disabled]:not([data-first-date-el])
     * @returns Assignee button or null if not found
     */
    findAssigneeButton(): OgtAssigneeButton | null {
        const button = findAssigneeButtonElement(this);
        if (!button) return null;
        return new OgtAssigneeButton(button);
    }

    /**
     * Find the go to chat button
     * This button navigates to the task in the chat/space view.
     * Selector: button[title]:not([aria-pressed],[data-tooltip-enabled])
     * @returns Go to chat button or null if not found
     */
    findGoToChatButton(): OgtGoToChatButton | null {
        const button = findGoToChatButtonElement(this);
        if (!button) return null;
        return new OgtGoToChatButton(button);
    }

    /**
     * Find the delete button
     * This button deletes the task (shows confirmation dialog first).
     * Selector: button[data-tooltip-enabled]:not([aria-pressed],[title])
     * @returns Delete button or null if not found
     */
    findDeleteButton(): OgtDeleteButton | null {
        const button = findDeleteButtonElement(this);
        if (!button) return null;
        return new OgtDeleteButton(button);
    }

    /**
     * Find the touch buttons. Generally 2 or 0 elements can be found.
     * @returns List of touch buttons. [0]: Add button, [1]: Cancel button
     */
    findTouchButtons(): OgtTouchButton[] {
        const elements = findTouchButtonElements(this);
        return Array.from(elements).map(el => new OgtTouchButton(el));
    }

    /**
     * Find the Add button for toBeAdded task
     * 2 buttons: [0]=add, [1]=cancel
     * 3 buttons: [0]=expand description, [1]=add, [2]=cancel
     * @returns Add button or null if not found
     */
    findAddButton(): OgtTouchButton | null {
        const touchButtons = this.findTouchButtons();
        if (touchButtons.length === 2) {
            return touchButtons[0];
        } else if (touchButtons.length === 3) {
            return touchButtons[1];
        }
        return null;
    }

    /**
     * Find the Cancel button for toBeAdded task
     * 2 buttons: [0]=add, [1]=cancel
     * 3 buttons: [0]=expand description, [1]=add, [2]=cancel
     * @returns Cancel button or null if not found
     */
    findCancelButton(): OgtTouchButton | null {
        const touchButtons = this.findTouchButtons();
        if (touchButtons.length === 2) {
            return touchButtons[1];
        } else if (touchButtons.length === 3) {
            return touchButtons[2];
        }
        return null;
    }

    /**
     * Find the first div child
     * This div is used to trigger edit UI visibility on narrow screens.
     * When clicked, it ensures all task buttons and edit controls become visible.
     * @returns First div element or null if not found
     */
    findFirstDiv(): HTMLElement | null {
        return this._element.querySelector('div');
    }

    /**
     * Check if the element is still in the DOM
     * Useful for detecting if the task was deleted or removed from the page.
     * @returns True if element is connected to document, false otherwise
     */
    isConnected(): boolean {
        return this._element.isConnected;
    }
}

export { findTaskWrapperElement, findAllTaskWrapperElements, OgtTaskWrapper };

Logger.fgtlog('✅ OGT Task Element loaded successfully');