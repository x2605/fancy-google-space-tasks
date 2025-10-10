// core/complex_interaction/base_interaction.ts - Base class for complex interactions
import * as Logger from '@/core/logger';
import { CoreDOMUtils } from '@/core/dom_utils';
import { CoreEventUtils } from '@/core/event_utils';
import { OgtDateSelectDialog } from '@/manipulator/date_select_dialog';
import { OgtTaskElement } from '@/manipulator/task_element/task_element';

Logger.fgtlog('🔧 Base Interaction loading...');

/**
 * Base class for complex interactions
 * Provides common utility methods for DOM manipulation and event handling
 */
class BaseInteraction {
    namespace: string;

    constructor(namespace: string = 'fancy-gst') {
        this.namespace = namespace;
    }

    /**
     * Trigger click event on element
     * @param element - Target element
     */
    protected triggerClick(element: Element): void {
        if (!element) return;
        const event = CoreDOMUtils.createMouseEvent('click');
        element.dispatchEvent(event);
    }

    /**
     * Simulate click on div elements with coordinate-based mouse events
     * Required for div elements that don't respond to simple click events
     * @param element - Target element (typically a div)
     */
    protected simulateClick(element: Element): void {
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const clientX = rect.left + (rect.width / 2);
        const clientY = rect.top + (rect.height / 2);

        const mousedownEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window,
            detail: 1,
            screenX: clientX,
            screenY: clientY,
            clientX: clientX,
            clientY: clientY,
            button: 0
        });

        const mouseupEvent = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            view: window,
            detail: 1,
            screenX: clientX,
            screenY: clientY,
            clientX: clientX,
            clientY: clientY,
            button: 0
        });

        element.dispatchEvent(mousedownEvent);
        element.dispatchEvent(mouseupEvent);
    }

    /**
     * Trigger blur event on element
     * @param element - Target element
     */
    protected triggerBlur(element: Element): void {
        if (!element) return;
        const event = new Event('blur', { bubbles: true });
        element.dispatchEvent(event);
    }

    /**
     * Wait for element to appear in DOM
     * @param selector - CSS selector
     * @param timeout - Maximum wait time
     * @param parent - Parent element to search in
     * @returns Promise resolving to found element
     */
    protected waitForElement(selector: string, timeout: number = 3000, parent: Element | Document = document): Promise<Element> {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const checkElement = () => {
                const element = parent.querySelector(selector);
                if (element) {
                    resolve(element);
                    return;
                }

                if (Date.now() - startTime >= timeout) {
                    reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                    return;
                }

                CoreEventUtils.timeouts.create(checkElement, 100);
            };

            checkElement();
        });
    }

    /**
     * Ensure task UI is visible (for narrow screens)
     * @param taskElement - Task element wrapper
     */
    protected async ensureTaskUIVisible(taskElement: OgtTaskElement): Promise<void> {
        if (!taskElement) return;

        const firstDiv = taskElement.findFirstDiv();
        if (firstDiv) {
            // Use simulateClick for div element
            this.simulateClick(firstDiv);
            await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 300));
        }
    }

    /**
     * Navigate to specific month in date picker dialog
     * @param dateDialog - Date picker dialog wrapper
     * @param targetYear - Target year
     * @param targetMonth - Target month (1-12)
     */
    protected async navigateToMonth(dateDialog: OgtDateSelectDialog, targetYear: number, targetMonth: number): Promise<void> {
        let attempts = 0;
        const maxAttempts = 24;

        while (attempts < maxAttempts) {
            const monthYearLabel = dateDialog.findMonthYearLabel();
            if (!monthYearLabel) throw new Error('Month/year label not found');

            const [currentYear, currentMonth] = this.parseMonthYearText(monthYearLabel.textContent || '');

            if (currentYear === targetYear && currentMonth === targetMonth) {
                break;
            }

            if (currentYear < targetYear || (currentYear === targetYear && currentMonth < targetMonth)) {
                const nextButton = dateDialog.findMonthNextButton();
                if (nextButton) this.triggerClick(nextButton);
            } else {
                const prevButton = dateDialog.findMonthPrevButton();
                if (prevButton) this.triggerClick(prevButton);
            }

            await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 300));
            attempts++;
        }

        if (attempts >= maxAttempts) {
            throw new Error('Failed to navigate to target month');
        }
    }

    /**
     * Parse month/year text from Korean date format
     * @param text - Text containing year and month (e.g., "2025년 1월")
     * @returns [year, month] tuple
     */
    protected parseMonthYearText(text: string): [number, number] {
        const yearMatch = text.match(/(\d{4})/);
        const monthMatch = text.match(/(\d{1,2})월/);

        const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
        const month = monthMatch ? parseInt(monthMatch[1]) : new Date().getMonth() + 1;

        return [year, month];
    }

    /**
     * Set time in date picker dialog
     * @param dateDialog - Date picker dialog wrapper
     * @param timeString - Time string in HH:mm format
     */
    protected async setTime(dateDialog: OgtDateSelectDialog, timeString: string): Promise<void> {
        const timeInput = dateDialog.findTimeInput();
        if (!timeInput) return;

        timeInput.focus();

        // Wait for dropdown to appear
        await this.waitForElement('div[role="listbox"]', 2000, dateDialog.element);

        const [hour, minute] = timeString.split(':');
        const targetTime = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`;

        const timeOption = dateDialog.findTimeOption(targetTime);
        if (timeOption) {
            this.triggerClick(timeOption);
        }

        // Click outside to close dropdown
        this.triggerClick(dateDialog.element);
        await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 300));
    }

    /**
     * Verify task element is still valid after operations
     * @param taskId - Task ID to verify
     * @returns Promise resolving to true if valid
     */
    protected async verifyTaskElement(taskId: string): Promise<boolean> {
        return new Promise((resolve) => {
            const check = () => {
                const element = document.querySelector(`[role="listitem"][data-id="${taskId}"][data-type="0"]`);
                resolve(!!element);
            };
            
            CoreEventUtils.timeouts.create(check, 100);
        });
    }
}

export { BaseInteraction };

Logger.fgtlog('✅ Base Interaction loaded successfully');