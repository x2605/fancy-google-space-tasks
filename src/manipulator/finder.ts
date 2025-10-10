// manipulator/finder.ts
import * as Logger from '@/core/logger';
import { OgtTaskElement } from './task_element/task_element';
import { OgtDeleteConfirmDialog } from './delete_confirm_dialog';
import { OgtViewMore } from './view_more';
import { OgtTaskContainer } from './task_container';

Logger.fgtlog('🔍 OGT Finder loading...');

/**
 * Top-level finder functions for Original Google Tasks DOM elements
 * These are the entry points for finding elements in the page
 * All functions can accept either taskId (string) or OgtTaskElement instance
 * 
 * @class OgtFinder
 */
class OgtFinder {
    /**
     * Find a single task element by ID
     * @param taskId - The task ID from data-id attribute
     * @returns Task element wrapper or null if not found
     */
    static findTaskElement(taskId: string): OgtTaskElement | null {
        if (!taskId) {
            Logger.fgterror('findTaskElement requires a taskId');
            return null;
        }
        
        const element = document.querySelector(`[role="listitem"][data-id="${taskId}"][data-type="0"]`);
        if (!element) {
            return null;
        }
        
        return new OgtTaskElement(element);
    }

    /**
     * Find all task elements in the page
     * @returns Array of task element wrappers
     */
    static findAllTaskElements(): OgtTaskElement[] {
        const elements = document.querySelectorAll('[role="listitem"][data-id][data-type="0"]');
        return Array.from(elements).map(el => new OgtTaskElement(el));
    }

    /**
     * Find the first task container
     * @returns Task container wrapper or null if not found
     */
    static findTaskContainer(): any {
        const element = document.querySelector('[role="list"]');
        if (!element) {
            return null;
        }
        
        return new OgtTaskContainer(element);
    }

    /**
     * Find all task containers in the page
     * @returns Array of task container wrappers
     */
    static findAllTaskContainers(): any[] {
        const elements = document.querySelectorAll('[role="list"]');
        return Array.from(elements).map(el => new OgtTaskContainer(el));
    }

    /**
     * Find the "view more" button element
     * @returns View more wrapper or null if not found
     */
    static findViewMore(): any {
        const element = document.querySelector('[role="listitem"][data-id][data-type="5"]');
        if (!element) {
            return null;
        }
        
        return new OgtViewMore(element);
    }

    /**
     * Find title wrapper for a task
     * Accepts either taskId or OgtTaskElement for convenience
     * @param taskIdOrElement - Task ID or task element instance
     * @returns Title wrapper or null if not found
     */
    static findTitleWrapper(taskIdOrElement: string | any): any {
        const taskElement = OgtFinder._resolveTaskElement(taskIdOrElement);
        if (!taskElement) return null;
        
        return taskElement.findTitleWrapper();
    }

    /**
     * Find description wrapper for a task
     * @param taskIdOrElement - Task ID or task element instance
     * @returns Description wrapper or null if not found
     */
    static findDescWrapper(taskIdOrElement: string | any): any {
        const taskElement = OgtFinder._resolveTaskElement(taskIdOrElement);
        if (!taskElement) return null;
        
        return taskElement.findDescWrapper();
    }

    /**
     * Find complete checkbox for a task
     * @param taskIdOrElement - Task ID or task element instance
     * @returns Complete checkbox or null if not found
     */
    static findCompleteCheckbox(taskIdOrElement: string | any): any {
        const taskElement = OgtFinder._resolveTaskElement(taskIdOrElement);
        if (!taskElement) return null;
        
        return taskElement.findCompleteCheckbox();
    }

    /**
     * Find date button for a task
     * @param taskIdOrElement - Task ID or task element instance
     * @returns Date button or null if not found
     */
    static findDateButton(taskIdOrElement: string | any): any {
        const taskElement = OgtFinder._resolveTaskElement(taskIdOrElement);
        if (!taskElement) return null;
        
        return taskElement.findDateButton();
    }

    /**
     * Find assignee button for a task
     * @param taskIdOrElement - Task ID or task element instance
     * @returns Assignee button or null if not found
     */
    static findAssigneeButton(taskIdOrElement: string | any): any {
        const taskElement = OgtFinder._resolveTaskElement(taskIdOrElement);
        if (!taskElement) return null;
        
        return taskElement.findAssigneeButton();
    }

    /**
     * Find go to chat button for a task
     * @param taskIdOrElement - Task ID or task element instance
     * @returns Go to chat button or null if not found
     */
    static findGoToChatButton(taskIdOrElement: string | any): any {
        const taskElement = OgtFinder._resolveTaskElement(taskIdOrElement);
        if (!taskElement) return null;
        
        return taskElement.findGoToChatButton();
    }

    /**
     * Find delete button for a task
     * @param taskIdOrElement - Task ID or task element instance
     * @returns Delete button or null if not found
     */
    static findDeleteButton(taskIdOrElement: string | any): any {
        const taskElement = OgtFinder._resolveTaskElement(taskIdOrElement);
        if (!taskElement) return null;
        
        return taskElement.findDeleteButton();
    }

    /**
     * Find currently visible delete confirmation dialog
     * @returns Delete confirmation dialog or null if not found
     */
    static findDeleteConfirmDialog(): any {
        const element = document.querySelector('div[aria-modal="true"][role="dialog"]');
        if (!element) {
            return null;
        }
        
        return new OgtDeleteConfirmDialog(element);
    }

    /**
     * Helper: Resolve taskId or OgtTaskElement to OgtTaskElement
     * Internal method used by other finder functions
     * @param taskIdOrElement - Task ID string or task element instance
     * @returns Resolved task element or null
     */
    static _resolveTaskElement(taskIdOrElement: string | any): any {
        if (!taskIdOrElement) {
            return null;
        }
        
        // If it's already an OgtTaskElement, return as-is
        if (taskIdOrElement instanceof OgtTaskElement) {
            return taskIdOrElement;
        }
        
        // If it's a string (taskId), find the task element
        if (typeof taskIdOrElement === 'string') {
            return OgtFinder.findTaskElement(taskIdOrElement);
        }
        
        Logger.fgtwarn('Invalid input to finder function: ' + taskIdOrElement);
        return null;
    }
}

export { OgtFinder };

Logger.fgtlog('✅ OGT Finder loaded successfully');