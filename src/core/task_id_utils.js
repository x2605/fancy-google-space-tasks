// core/task_id_utils.js - TaskId extraction utilities for change detection
fgtlog('🆔 Task ID Utils loading...');

/**
 * TaskId extraction utilities for efficient change detection
 */
class TaskIdUtils {
    /**
     * Extract only taskId from a task element (lightweight version)
     * @param {Element} element - Task element
     * @param {number} fallbackIndex - Fallback index for ID
     * @returns {string|null} - Task ID or null if invalid
     */
    static extractTaskId(element, fallbackIndex) {
        if (!element) return null;

        // Extract task ID - same logic as parseTaskElement
        const taskId = element.getAttribute('data-id') || `task-${fallbackIndex}`;

        // Validate it's actually a task element
        if (!element.matches('[role="listitem"][data-id][data-type="0"]')) {
            return null;
        }

        return taskId;
    }

    /**
     * Extract all current taskIds from DOM
     * @returns {Set<string>} - Set of current task IDs
     */
    static extractAllTaskIds() {
        const taskElements = document.querySelectorAll('[role="listitem"][data-id][data-type="0"]');
        const taskIds = new Set();

        taskElements.forEach((element, index) => {
            const taskId = TaskIdUtils.extractTaskId(element, index);
            if (taskId) {
                taskIds.add(taskId);
            }
        });

        return taskIds;
    }

    /**
     * Extract lightweight task data for comparison (only essential fields)
     * @param {Element} element - Task element
     * @param {number} fallbackIndex - Fallback index for ID
     * @returns {Object|null} - Lightweight task data
     */
    static extractLightweightTaskData(element, fallbackIndex) {
        const taskId = TaskIdUtils.extractTaskId(element, fallbackIndex);
        if (!taskId) return null;

        try {
            // Extract minimal data for comparison
            const titleElement = element.querySelector('[data-max-length]:not([data-multiline])');
            const rawTitle = titleElement?.querySelector('[jsname][title]')?.textContent?.trim() ||
                titleElement?.textContent?.trim() || 'Untitled Task';

            const checkboxElement = element.querySelector('button[aria-pressed]');
            const isCompleted = checkboxElement?.getAttribute('aria-pressed') === 'true';

            const dateElement = element.querySelector('[role="button"][data-first-date-el]');
            const date = dateElement?.textContent?.trim() || '';

            const assigneeElement = element.querySelector('[role="button"][aria-disabled]:not([data-first-date-el])');
            const assignee = assigneeElement?.querySelector('span[title]')?.textContent?.trim() || '';

            return {
                id: taskId,
                title: rawTitle,
                isCompleted,
                date,
                assignee,
                // Create a hash for quick comparison
                hash: TaskIdUtils.createDataHash(rawTitle, isCompleted, date, assignee)
            };
        } catch (error) {
            fgtwarn(`Failed to extract lightweight data for task ${taskId}:`, error);
            return { id: taskId, hash: 'error' };
        }
    }

    /**
     * Create a simple hash from task data for quick comparison
     * @param {string} title - Task title
     * @param {boolean} isCompleted - Completion status
     * @param {string} date - Task date
     * @param {string} assignee - Task assignee
     * @returns {string} - Simple hash
     */
    static createDataHash(title, isCompleted, date, assignee) {
        const data = `${title}|${isCompleted}|${date}|${assignee}`;
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Extract all lightweight task data from DOM
     * @returns {Map<string, Object>} - Map of taskId -> lightweight data
     */
    static extractAllLightweightTaskData() {
        const taskElements = document.querySelectorAll('[role="listitem"][data-id][data-type="0"]');
        const taskData = new Map();

        taskElements.forEach((element, index) => {
            const data = TaskIdUtils.extractLightweightTaskData(element, index);
            if (data) {
                taskData.set(data.id, data);
            }
        });

        return taskData;
    }

    /**
     * Compare two task data maps and detect changes
     * @param {Map} oldData - Previous task data
     * @param {Map} newData - Current task data
     * @returns {Object} - Change detection result
     */
    static detectChanges(oldData, newData) {
        const changes = {
            added: [],
            removed: [],
            modified: [],
            hasChanges: false
        };

        // Check for removed tasks
        oldData.forEach((oldTask, taskId) => {
            if (!newData.has(taskId)) {
                changes.removed.push(taskId);
            }
        });

        // Check for added and modified tasks
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
     * Check if DOM structure is still valid
     * @param {Element} savedTaskContainer - Previously saved task container reference
     * @returns {boolean} - Is DOM still valid
     */
    static isDOMValid(savedTaskContainer) {
        return savedTaskContainer &&
            document.contains(savedTaskContainer) &&
            savedTaskContainer.querySelector('[role="listitem"][data-id]');
    }

    /**
     * Find the current task container element
     * @returns {Element|null} - Task container element (first one if multiple exist)
     */
    static findTaskContainer() {
        // Find all task list containers
        const containers = document.querySelectorAll('[role="list"]');

        if (containers.length > 0) {
            fgtlog(`🔍 Found ${containers.length} task containers`);
            return containers[0]; // Return first container as representative
        }

        fgterror('❌ No task containers found - page not ready');
        return null;
    }
}

// Export to global scope
window.TaskIdUtils = TaskIdUtils;

fgtlog('✅ Task ID Utils loaded successfully');