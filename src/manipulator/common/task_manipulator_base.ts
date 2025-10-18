// manipulator/common/task_manipulator_base.ts - Base class for task manipulation
import * as Logger from '@/core/logger';
import { CoreDOMUtils } from '@/core/dom_utils';
import { CoreEventUtils } from '@/core/event_utils';
import { OgtTaskWrapper } from '@/dom_bringer/task_element/task_element';

Logger.fgtlog('🔧 Task Manipulator Base loading...');

/**
 * Base class for task manipulation controllers
 * Provides common utility methods for DOM manipulation and event handling
 *
 * Note: Date-related methods are in manipulator/date/ instead
 */
export class TaskManipulatorBase {
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
     * Opens the task detail panel by clicking the first div
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
     * Verify task element is still valid after operations
     * @param taskId - Task ID to verify
     * @returns Promise resolving to true if valid
     */
    protected async verifyTaskElement(taskId: string): Promise<boolean> {
        return new Promise((resolve) => {
            const check = () => {
                const element = OgtTaskWrapper.findElementByTaskId(taskId);
                resolve(!!element);
            };

            CoreEventUtils.timeouts.create(check, 100);
        });
    }
}

Logger.fgtlog('✅ Task Manipulator Base loaded successfully');
