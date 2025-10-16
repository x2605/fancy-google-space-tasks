// core/task_id_utils.ts - TaskId extraction utilities (REFACTORED)
import * as Logger from '@/core/logger';
import { OgtFinder } from '@/manipulator/finder';
import { OgtTaskElement } from '@/manipulator/task_element/task_element';
import { OgtTaskContainer } from '@/manipulator/task_container';

Logger.fgtlog('🆔 Task ID Utils loading...');

/**
 * Information about which fields changed in a task
 */
export interface ChangedFields {
    title?: boolean;
    description?: boolean;
    date?: boolean;
    assignee?: boolean;
    isCompleted?: boolean;
}

/**
 * Detailed change detection result
 */
export interface DetailedChangeResult {
    added: string[];
    removed: string[];
    modified: Map<string, ChangedFields>;
    hasChanges: boolean;
    isContentUnchanged: boolean; // True if title, description, and completion state are all unchanged (date/assignee may change)
}

/**
 * TaskId extraction utilities for efficient change detection
 * Now uses manipulator layer for DOM access
 */
class TaskIdUtils {
    /**
     * Extract only taskId from a task element (lightweight version)
     * REFACTORED: Now uses OgtTaskElement
     */
    static extractTaskId(element: Element, fallbackIndex: number): string | null {
        if (!element) return null;

        // Wrap in OgtTaskElement to use consistent interface
        try {
            const taskElement = new OgtTaskElement(element);
            
            // Validate it's actually a task element
            if (!taskElement.taskId) {
                return `task-${fallbackIndex}`;
            }
            
            return taskElement.taskId;
        } catch (error) {
            // Not a valid task element
            return null;
        }
    }

    /**
     * Extract all current taskIds from DOM
     * REFACTORED: Now uses OgtFinder
     */
    static extractAllTaskIds(): Set<string> {
        // Use manipulator to find all tasks
        const taskElements = OgtFinder.findAllTaskElements();
        const taskIds = new Set<string>();

        taskElements.forEach((taskElement: any) => {
            const taskId = taskElement.taskId;
            if (taskId) {
                taskIds.add(taskId);
            }
        });

        return taskIds;
    }

    /**
     * Extract lightweight task data for comparison
     * REFACTORED: Now uses OgtTaskElement and its find methods
     */
    static extractLightweightTaskData(element: Element, fallbackIndex: number): any {
        try {
            // Wrap element in OgtTaskElement
            const taskElement = new OgtTaskElement(element);
            const taskId = taskElement.taskId || `task-${fallbackIndex}`;

            // Use manipulator to find components
            const titleWrapper = taskElement.findTitleWrapper();
            const titleViewer = titleWrapper?.findTitleViewer();
            const rawTitle = titleViewer?.text || 'Untitled Task';

            // Extract description (if exists)
            const descWrapper = taskElement.findDescWrapper();
            const descViewer = descWrapper?.findDescViewer();
            let description = descViewer?.text || '';
            if (description === descWrapper?.placeholder) {
                description = '';
            }

            const checkbox = taskElement.findCompleteCheckbox();
            const isCompleted = checkbox?.complete || false;

            const dateButton = taskElement.findDateButton();
            const date = dateButton?.text || '';

            const assigneeButton = taskElement.findAssigneeButton();
            const assigneeText = assigneeButton?.findAssigneeText();
            const assignee = assigneeText?.text || '';

            return {
                id: taskId,
                title: rawTitle,
                description,
                isCompleted,
                date,
                assignee,
                // Create a hash for quick comparison
                hash: TaskIdUtils.createDataHash(rawTitle, isCompleted, date, assignee)
            };
        } catch (error) {
            Logger.fgtwarn('Failed to extract lightweight data: ' + error);
            return { id: `task-${fallbackIndex}`, hash: 'error' };
        }
    }

    /**
     * Create a simple hash from task data for quick comparison
     * (unchanged - no DOM access)
     */
    static createDataHash(title: string, isCompleted: boolean, date: string, assignee: string): string {
        const data = `${title}|${isCompleted}|${date}|${assignee}`;
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    /**
     * Extract all lightweight task data from DOM
     * REFACTORED: Now uses OgtFinder
     */
    static extractAllLightweightTaskData(): Map<string, any> {
        // Use manipulator to find all tasks
        const taskElements = OgtFinder.findAllTaskElements();
        const taskData = new Map<string, any>();

        taskElements.forEach((taskElement: any, index: number) => {
            const data = TaskIdUtils.extractLightweightTaskData(taskElement.element, index);
            if (data) {
                taskData.set(data.id, data);
            }
        });

        return taskData;
    }

    /**
     * Compare two task data maps and detect changes
     * (unchanged - no DOM access)
     */
    static detectChanges(oldData: Map<string, any>, newData: Map<string, any>): any {
        const changes = {
            added: [] as string[],
            removed: [] as string[],
            modified: [] as string[],
            hasChanges: false
        };

        oldData.forEach((_oldTask, taskId) => {
            if (!newData.has(taskId)) {
                changes.removed.push(taskId);
            }
        });

        newData.forEach((newTask, taskId) => {
            if (!oldData.has(taskId)) {
                changes.added.push(taskId);
            } else {
                const oldTask = oldData.get(taskId);
                if (oldTask.hash !== newTask.hash) {
                    changes.modified.push(taskId);
                }
            }
        });

        changes.hasChanges = changes.added.length > 0 ||
            changes.removed.length > 0 ||
            changes.modified.length > 0;

        return changes;
    }

    /**
     * Compare two task data maps and detect detailed field-level changes
     * This provides information about which specific fields changed for each task
     */
    static detectDetailedChanges(oldData: Map<string, any>, newData: Map<string, any>): DetailedChangeResult {
        const result: DetailedChangeResult = {
            added: [],
            removed: [],
            modified: new Map<string, ChangedFields>(),
            hasChanges: false,
            isContentUnchanged: true
        };

        // Detect removed tasks
        oldData.forEach((_oldTask, taskId) => {
            if (!newData.has(taskId)) {
                result.removed.push(taskId);
            }
        });

        // Detect added and modified tasks
        newData.forEach((newTask, taskId) => {
            if (!oldData.has(taskId)) {
                // New task added
                result.added.push(taskId);
            } else {
                // Task exists - check for modifications
                const oldTask = oldData.get(taskId);
                const changedFields: ChangedFields = {};
                let hasFieldChanges = false;

                // Compare each field
                if (oldTask.title !== newTask.title) {
                    changedFields.title = true;
                    hasFieldChanges = true;
                    result.isContentUnchanged = false;
                }

                if (oldTask.description !== newTask.description) {
                    changedFields.description = true;
                    hasFieldChanges = true;
                    result.isContentUnchanged = false;
                }

                if (oldTask.date !== newTask.date) {
                    changedFields.date = true;
                    hasFieldChanges = true;
                }

                if (oldTask.assignee !== newTask.assignee) {
                    changedFields.assignee = true;
                    hasFieldChanges = true;
                }

                if (oldTask.isCompleted !== newTask.isCompleted) {
                    changedFields.isCompleted = true;
                    hasFieldChanges = true;
                    result.isContentUnchanged = false;
                }

                // If any field changed, add to modified map
                if (hasFieldChanges) {
                    result.modified.set(taskId, changedFields);
                }
            }
        });

        // Set hasChanges flag
        result.hasChanges = result.added.length > 0 ||
            result.removed.length > 0 ||
            result.modified.size > 0;

        return result;
    }

    /**
     * Check if DOM structure is still valid
     * REFACTORED: Now uses OgtTaskContainer
     */
    static isDOMValid(savedTaskContainer: Element | null): boolean {
        if (!savedTaskContainer || !document.contains(savedTaskContainer)) {
            return false;
        }
        
        // Use manipulator to check if it has tasks
        try {
            const container = new OgtTaskContainer(savedTaskContainer);
            const tasks = container.findAllTaskElements();
            return tasks.length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Find the current task container element
     * REFACTORED: Now uses OgtFinder
     */
    static findTaskContainer(): Element | null {
        // Use manipulator to find container
        const container = OgtFinder.findTaskContainer();
        
        if (container) {
            Logger.fgtlog('🔍 Found task container');
            return container.element; // Return raw element for compatibility
        }

        Logger.fgterror('❌ No task containers found - page not ready');
        return null;
    }
}

export { TaskIdUtils };

Logger.fgtlog('✅ Task ID Utils loaded successfully (refactored)');