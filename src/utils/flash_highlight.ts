/**
 * Flash Highlight Utility
 *
 * Provides visual feedback for task updates by applying temporary
 * highlight effects to cells or buttons.
 */

export type FlashHighlightType = 'full' | 'date' | 'assignee';

/**
 * Apply a flash highlight effect to a specific task element
 *
 * @param taskId - The task ID to highlight
 * @param changeType - Type of highlight: 'full' (entire cell), 'date' (date button), 'assignee' (assignee button)
 * @param skipIfCompletedHidden - If true, skip highlight if task was just completed and completed tasks are hidden
 */
export function flashTaskHighlight(
    taskId: string,
    changeType: FlashHighlightType,
    skipIfCompletedHidden: boolean = false
): void {
    // Find the task row
    const taskRow = document.querySelector<HTMLTableRowElement>(
        `.fancy-gst-task-row[data-task-id="${taskId}"]`
    );

    if (!taskRow) {
        return; // Task not found (might have been filtered out)
    }

    // If skipIfCompletedHidden is true, check if this task was just completed
    // and if it's about to be hidden (will be filtered out)
    if (skipIfCompletedHidden) {
        const checkbox = taskRow.querySelector<HTMLElement>('.fancy-gst-task-checkbox');
        const isCompleted = checkbox?.classList.contains('fgt-completed');

        // If completed and skip flag is true, don't highlight
        if (isCompleted) {
            return;
        }
    }

    if (changeType === 'full') {
        // Full cell highlight - add overlay to content cell
        const contentCell = taskRow.querySelector<HTMLTableCellElement>(
            '.fancy-gst-task-content-cell'
        );

        if (!contentCell) {
            return;
        }

        // Create overlay div
        const overlay = document.createElement('div');
        overlay.className = 'fancy-gst-flash-highlight-full';

        // Add to cell
        contentCell.appendChild(overlay);

        // Remove after animation completes
        overlay.addEventListener('animationend', () => {
            overlay.remove();
        });

    } else if (changeType === 'date' || changeType === 'assignee') {
        // Button border highlight
        const buttonSelector = changeType === 'date'
            ? `.fancy-gst-action-btn.fgt-date[data-task-id="${taskId}"]`
            : `.fancy-gst-action-btn.fgt-assignee[data-task-id="${taskId}"]`;

        const button = document.querySelector<HTMLButtonElement>(buttonSelector);

        if (!button) {
            return;
        }

        // Add highlight class
        button.classList.add('fancy-gst-flash-highlight-border');

        // Remove after animation completes
        const removeHighlight = () => {
            button.classList.remove('fancy-gst-flash-highlight-border');
            button.removeEventListener('animationend', removeHighlight);
        };

        button.addEventListener('animationend', removeHighlight);
    }
}

/**
 * Flash highlight information for a single task
 */
export interface TaskHighlightInfo {
    taskId: string;
    highlightTypes: FlashHighlightType[];
}

/**
 * Apply flash highlights to multiple tasks based on their changed fields
 *
 * @param highlights - Array of task highlight information
 * @param skipCompletedHidden - If true, skip highlights for tasks that are completed and hidden
 */
export function flashMultipleTaskHighlights(
    highlights: TaskHighlightInfo[],
    skipCompletedHidden: boolean = false
): void {
    // Apply highlights with a small delay to ensure DOM has updated
    setTimeout(() => {
        highlights.forEach(({ taskId, highlightTypes }) => {
            highlightTypes.forEach(type => {
                flashTaskHighlight(taskId, type, skipCompletedHidden);
            });
        });
    }, 50); // Small delay to ensure rendering is complete
}
