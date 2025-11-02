// modal/assignee_utils.ts - Utility functions for assignee operations
import * as Logger from '@/core/logger';
import { OgtAssigneeButton } from '@/dom_bringer/task_element/assignee_button/assignee_button';
import { OgtAssigneeInputContainer } from '@/dom_bringer/task_element/assignee_input_container/assignee_input_container';
import { OgtAssigneeListbox } from '@/dom_bringer/task_element/assignee_input_container/assignee_listbox';
import { OgtAssigneeInput } from '@/dom_bringer/task_element/assignee_input_container/assignee_input';
import { OgtAssigneeItem } from '@/dom_bringer/task_element/assignee_input_container/assignee_item';
import type { OgtTaskWrapper } from '@/dom_bringer/task_element/task_element';

Logger.fgtlog('👥 Assignee Utils loading...');

/**
 * Assignee information result
 */
export interface AssigneeInfo {
    initialText: string;
    availableAssignees: Array<{name: string, email: string}>;
    hasUnassignOption: boolean;
    selfAssigneeName: string | null;  // Name extracted from unassign option when assigned to self
}

/**
 * Get initial assignee text from task element
 * @param taskElement - Task wrapper element
 * @returns Initial assignee text or null if not found
 */
export function getInitialAssigneeText(taskElement: OgtTaskWrapper): string | null {
    try {
        const assigneeButtonEl = OgtAssigneeButton.findElementInObject(taskElement);
        if (!assigneeButtonEl) {
            Logger.fgtlog('ℹ️ Assignee button not found - assignee feature may not be available');
            return null;
        }

        const assigneeButton = new OgtAssigneeButton(assigneeButtonEl);
        const assigneeText = assigneeButton.findAssigneeText();

        if (assigneeText) {
            const text = assigneeText.text;
            Logger.fgtlog(`👤 Initial assignee text: "${text}"`);
            return text;
        }

        return null;
    } catch (error: any) {
        Logger.fgterror(`❌ Failed to get initial assignee text: ${error.message}`);
        return null;
    }
}

/**
 * Get available assignees by opening the list and reading items
 * Uses polling to wait for listbox to appear
 * @param taskElement - Task wrapper element
 * @param maxPollingAttempts - Maximum number of polling attempts
 *                            Default: 50 (5 seconds) for first attempt, 10 (1 second) for subsequent attempts
 * @returns AssigneeInfo object with available assignees and unassign option availability
 */
export async function getAvailableAssigneesWithPolling(
    taskElement: OgtTaskWrapper,
    maxPollingAttempts?: number
): Promise<Omit<AssigneeInfo, 'initialText'>> {
    // Use global timeout if available, otherwise use default 5 seconds (50 attempts)
    if (maxPollingAttempts === undefined) {
        maxPollingAttempts = window.FGT_ASSIGNEE_POLLING_TIMEOUT || 50;
    }
    const result: Omit<AssigneeInfo, 'initialText'> = {
        availableAssignees: [],
        hasUnassignOption: false,
        selfAssigneeName: null
    };

    try {
        // IMPORTANT: OgtAssigneeButton.element and OgtAssigneeInputContainer.element
        // are mutually exclusive. When button is clicked:
        // - OgtAssigneeButton.element disappears from DOM
        // - OgtAssigneeInputContainer.element appears in its place

        // Find and click assignee button to open list
        const assigneeButtonEl = OgtAssigneeButton.findElementInObject(taskElement);
        if (!assigneeButtonEl) {
            Logger.fgtlog('ℹ️ Assignee button not found - cannot get available assignees');
            return result;
        }

        Logger.fgtlog('🖱️ Clicking assignee button to open list...');
        assigneeButtonEl.click();

        // Wait for input container to appear
        await new Promise(resolve => setTimeout(resolve, 100));

        // Start polling for assignee items
        for (let attempt = 0; attempt < maxPollingAttempts; attempt++) {
            // Find input container
            const inputContainerEl = OgtAssigneeInputContainer.findElementInObject(taskElement);

            if (!inputContainerEl) {
                Logger.fgtlog(`⚠️ Input container not found (attempt ${attempt + 1}/${maxPollingAttempts})`);
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
            }

            const inputContainer = new OgtAssigneeInputContainer(inputContainerEl);

            // Find listbox
            const listboxEl = OgtAssigneeListbox.findElementInObject(inputContainer);

            if (!listboxEl) {
                // Try clicking input to toggle listbox
                const inputEl = OgtAssigneeInput.findElementInObject(inputContainer);
                if (inputEl) {
                    Logger.fgtlog(`🖱️ Clicking input to show listbox (attempt ${attempt + 1}/${maxPollingAttempts})`);
                    inputEl.click();
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                continue;
            }

            const listbox = new OgtAssigneeListbox(listboxEl);

            // Find all items
            const items = listbox.findAllAssigneeItems();

            if (items.length === 0) {
                // Try clicking input to toggle listbox
                const inputEl = OgtAssigneeInput.findElementInObject(inputContainer);
                if (inputEl) {
                    Logger.fgtlog(`🖱️ Clicking input to show listbox (attempt ${attempt + 1}/${maxPollingAttempts})`);
                    inputEl.click();
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                // Check if button reappeared (list closed)
                const buttonReappearedEl = OgtAssigneeButton.findElementInObject(taskElement);
                if (buttonReappearedEl && buttonReappearedEl !== assigneeButtonEl) {
                    Logger.fgtlog('🔄 Button reappeared - clicking again to reopen list');
                    buttonReappearedEl.click();
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                continue;
            }

            // Found items! Extract information
            Logger.fgtlog(`✅ Found ${items.length} assignee items`);

            items.forEach((item, index) => {
                const texts = item.texts;

                // Check if this is unassign option
                const isUnassign = item.isUnassignOption();

                if (isUnassign) {
                    result.hasUnassignOption = true;
                    // When assigned to self, unassign option contains self's name in texts[1]
                    if (texts.length >= 2) {
                        result.selfAssigneeName = texts[1];
                        Logger.fgtlog(`  ${index}: [Unassign option] (self: ${texts[1]})`);
                    } else {
                        Logger.fgtlog(`  ${index}: [Unassign option]`);
                    }
                } else if (texts.length >= 2) {
                    // texts[0] = name, texts[1] = email
                    result.availableAssignees.push({
                        name: texts[0],
                        email: texts[1]
                    });
                    Logger.fgtlog(`  ${index}: ${texts[0]} (${texts[1]})`);
                }
            });

            break; // Success, exit polling loop
        }

        Logger.fgtlog(`📊 Assignee info loaded: ${result.availableAssignees.length} assignees, unassign=${result.hasUnassignOption}`);

    } catch (error: any) {
        Logger.fgterror(`❌ Failed to get available assignees: ${error.message}`);
    }

    return result;
}

/**
 * Close assignee list if it's open
 * @param taskElement - Task wrapper element
 */
export async function closeAssigneeList(taskElement: OgtTaskWrapper): Promise<void> {
    try {
        const inputContainerEl = OgtAssigneeInputContainer.findElementInObject(taskElement);
        if (!inputContainerEl) {
            return;
        }

        const inputContainer = new OgtAssigneeInputContainer(inputContainerEl);
        const inputEl = OgtAssigneeInput.findElementInObject(inputContainer);

        if (!inputEl) {
            return;
        }

        // Check if listbox is still visible
        const listboxEl = OgtAssigneeListbox.findElementInObject(inputContainer);
        if (listboxEl) {
            Logger.fgtlog('🔄 Closing assignee list...');
            inputEl.click();
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    } catch (error: any) {
        Logger.fgterror(`❌ Failed to close assignee list: ${error.message}`);
    }
}

/**
 * Apply assignee change by clicking the matching item in the list
 * @param taskElement - Task wrapper element
 * @param targetAssignee - Target assignee to assign (null for unassign)
 * @param maxPollingAttempts - Maximum number of polling attempts
 *                            Default: uses global timeout (50 or 10)
 * @returns True if item was found and clicked
 */
export async function applyAssigneeSelection(
    taskElement: OgtTaskWrapper,
    targetAssignee: {name: string, email: string} | null,
    maxPollingAttempts?: number
): Promise<boolean> {
    // Use global timeout if available, otherwise use default 5 seconds (50 attempts)
    if (maxPollingAttempts === undefined) {
        maxPollingAttempts = window.FGT_ASSIGNEE_POLLING_TIMEOUT || 50;
    }
    try {
        // Find and click assignee button to open list
        const assigneeButtonEl = OgtAssigneeButton.findElementInObject(taskElement);
        if (!assigneeButtonEl) {
            Logger.fgterror('❌ Cannot change assignee: button not found');
            return false;
        }

        Logger.fgtlog('🖱️ Clicking assignee button to open list for change...');
        assigneeButtonEl.click();

        // Wait for input container to appear
        await new Promise(resolve => setTimeout(resolve, 100));

        // Poll for assignee items
        let foundItem: OgtAssigneeItem | null = null;

        for (let attempt = 0; attempt < maxPollingAttempts; attempt++) {
            const inputContainerEl = OgtAssigneeInputContainer.findElementInObject(taskElement);

            if (!inputContainerEl) {
                Logger.fgtlog(`⚠️ Input container not found (attempt ${attempt + 1}/${maxPollingAttempts})`);
                await new Promise(resolve => setTimeout(resolve, 100));
                continue;
            }

            const inputContainer = new OgtAssigneeInputContainer(inputContainerEl);
            const listboxEl = OgtAssigneeListbox.findElementInObject(inputContainer);

            if (!listboxEl) {
                // Try clicking input to toggle listbox
                const inputEl = OgtAssigneeInput.findElementInObject(inputContainer);
                if (inputEl) {
                    Logger.fgtlog(`🖱️ Clicking input to show listbox (attempt ${attempt + 1}/${maxPollingAttempts})`);
                    inputEl.click();
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                continue;
            }

            const listbox = new OgtAssigneeListbox(listboxEl);
            const items = listbox.findAllAssigneeItems();

            if (items.length === 0) {
                // Try clicking input
                const inputEl = OgtAssigneeInput.findElementInObject(inputContainer);
                if (inputEl) {
                    inputEl.click();
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                // Check if button reappeared
                const buttonReappearedEl = OgtAssigneeButton.findElementInObject(taskElement);
                if (buttonReappearedEl && buttonReappearedEl !== assigneeButtonEl) {
                    buttonReappearedEl.click();
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                continue;
            }

            // Find matching item
            Logger.fgtlog(`🔍 Searching for ${targetAssignee ? `assignee: ${targetAssignee.name} (${targetAssignee.email})` : 'unassign option'}`);

            for (const item of items) {
                if (targetAssignee === null) {
                    // Looking for unassign option
                    if (item.isUnassignOption()) {
                        foundItem = item;
                        Logger.fgtlog('✅ Found unassign option');
                        break;
                    }
                } else {
                    // Looking for specific assignee
                    const texts = item.texts;

                    if (texts.length >= 2 && texts[0] === targetAssignee.name && texts[1] === targetAssignee.email) {
                        foundItem = item;
                        Logger.fgtlog(`✅ Found matching assignee: ${texts[0]} (${texts[1]})`);
                        break;
                    }
                }
            }

            if (foundItem) {
                break; // Exit polling loop
            }
        }

        if (!foundItem) {
            Logger.fgterror('❌ Could not find matching assignee item in list');
            return false;
        }

        // Click the found item
        Logger.fgtlog('🖱️ Clicking assignee item to apply change...');
        foundItem.element.click();

        // Wait for change to be applied
        await new Promise(resolve => setTimeout(resolve, 300));

        return true;

    } catch (error: any) {
        Logger.fgterror(`❌ Failed to apply assignee selection: ${error.message}`);
        return false;
    }
}

/**
 * Verify that assignee change was applied successfully
 * @param taskElement - Task wrapper element
 * @param initialText - Initial assignee text before change
 * @param expectedName - Expected assignee name after change (null for unassign)
 * @returns Verification result object
 */
export function verifyAssigneeChange(
    taskElement: OgtTaskWrapper,
    initialText: string,
    expectedName: string | null
): { success: boolean, updatedText: string, warning?: string } {
    try {
        Logger.fgtlog('🔍 Verifying assignee change...');

        const assigneeButtonEl = OgtAssigneeButton.findElementInObject(taskElement);
        if (!assigneeButtonEl) {
            Logger.fgtwarn('⚠️ Button not found after change - verification skipped');
            return { success: true, updatedText: '', warning: 'Button not found after change' };
        }

        const assigneeButton = new OgtAssigneeButton(assigneeButtonEl);
        const assigneeText = assigneeButton.findAssigneeText();
        const updatedText = assigneeText?.text || '';

        Logger.fgtlog(`👤 Assignee text after change: "${updatedText}"`);

        // Check if text changed
        if (updatedText === initialText) {
            Logger.fgterror(`❌ Assignee text did not change (still "${initialText}")`);
            return { success: false, updatedText };
        }

        // Check if updated text matches expected (if expectedName is not null)
        if (expectedName !== null && updatedText !== expectedName) {
            const warning = `⚠️ Assignee text changed but doesn't match expected. Expected: "${expectedName}", Got: "${updatedText}"`;
            Logger.fgtwarn(warning);
            return { success: true, updatedText, warning };
        }

        Logger.fgtlog(`✅ Assignee successfully changed from "${initialText}" to "${updatedText}"`);
        return { success: true, updatedText };

    } catch (error: any) {
        Logger.fgterror(`❌ Failed to verify assignee change: ${error.message}`);
        return { success: false, updatedText: '', warning: error.message };
    }
}

Logger.fgtlog('✅ Assignee Utils loaded successfully');
