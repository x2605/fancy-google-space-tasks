// core/complex_interaction/base_interaction.ts - Base class for complex interactions
import * as Logger from '@/core/logger';
import { CoreDOMUtils } from '@/core/dom_utils';
import { CoreEventUtils } from '@/core/event_utils';
import { OgtDateSelectDialog } from '@/manipulator/date_select_dialog';
import { findTaskWrapperElement, OgtTaskWrapper } from '@/manipulator/task_element/task_element';


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
        CoreDOMUtils.simulateClick(element);
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
    protected async ensureTaskUIVisible(taskElement: OgtTaskWrapper): Promise<void> {
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

        // Focus input
        timeInput.focus();
        await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 100));

        // Clear existing value
        timeInput.value = '';
        await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 50));

        // Type each character using keyboard events
        for (const char of timeString) {
            // Get key code and code for this character
            let keyCode: number;
            let code: string;

            if (char >= '0' && char <= '9') {
                keyCode = char.charCodeAt(0);
                code = `Digit${char}`;
            } else if (char === ':') {
                keyCode = 186; // Semicolon key code (Shift+: on most keyboards)
                code = 'Semicolon';
            } else {
                keyCode = char.charCodeAt(0);
                code = `Key${char.toUpperCase()}`;
            }

            // Dispatch keydown event
            const keydownEvent = new KeyboardEvent('keydown', {
                key: char,
                code: code,
                keyCode: keyCode,
                bubbles: true,
                cancelable: true
            });
            timeInput.dispatchEvent(keydownEvent);

            // Dispatch keypress event
            const keypressEvent = new KeyboardEvent('keypress', {
                key: char,
                code: code,
                keyCode: keyCode,
                bubbles: true,
                cancelable: true
            });
            timeInput.dispatchEvent(keypressEvent);

            // Update value manually
            timeInput.value += char;

            // Dispatch input event
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            timeInput.dispatchEvent(inputEvent);

            // Dispatch keyup event
            const keyupEvent = new KeyboardEvent('keyup', {
                key: char,
                code: code,
                keyCode: keyCode,
                bubbles: true,
                cancelable: true
            });
            timeInput.dispatchEvent(keyupEvent);

            // Small delay between characters
            await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 30));
        }

        // Blur input
        timeInput.blur();
        await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 100));
    }

    /**
     * Verify task element is still valid after operations
     * @param taskId - Task ID to verify
     * @returns Promise resolving to true if valid
     */
    protected async verifyTaskElement(taskId: string): Promise<boolean> {
        return new Promise((resolve) => {
            const check = () => {
                const element = findTaskWrapperElement(taskId);
                resolve(!!element);
            };
            
            CoreEventUtils.timeouts.create(check, 100);
        });
    }
}

export { BaseInteraction };

Logger.fgtlog('✅ Base Interaction loaded successfully');