// modal/task_modal.ts - Unified task modal for edit/create operations
import * as Logger from '@/core/logger';
import { ModalBase } from '@/modal/modal_base';
import { CoreNotificationUtils } from '@/core/notification_utils';
import { CategoryParser } from '@/category/category_parser';
import { CoreEventUtils } from '@/core/event_utils';
import { CoreDOMUtils } from '@/core/dom_utils';
import { CategoryUtils } from '@/category/category_utils';
import { parseNaturalDate, formatDateForModal, extractAndRemoveTime, getLocaleKeywords, normalizeNumbers } from '@/dom_bringer/task_element/date_button/date_parser';
import { OgtFinder } from '@/dom_bringer/finder';
import { DateController } from '@/manipulator/date/date_controller';
import { DateVerification } from '@/manipulator/date/date_verification';
import { DateDialogUtils } from '@/manipulator/date/date_dialog_utils';
import { DATE_VERIFICATION_TIMEOUT } from '@/dom_bringer/date/date_constants';

Logger.fgtlog('📝 Task Modal loading...');

// Does not show loading spinner and expose original ui during operation
const TEST_MODE = false;

/**
 * Unified task modal for editing and creating tasks
 * Handles all task modal operations with category management
 */
class TaskModal extends ModalBase {
    taskId: string | null;
    actionType: string;
    originalTask: any;
    currentCategories: string[];
    allExistingCategories: string[][];
    onConfirm: Function | null;
    onCancel: Function | null;
    interactionHandler: any;
    isProcessing: boolean;
    categoryDropdown: HTMLElement | null;
    dropdownCleanup: Function | null;
    toBeAddedTaskElement: any;
    lastBadgeRemoveTime: number;
    parsedDateInfo: any; // Cached parsed date info to avoid repeated parsing
    localeAvailable: boolean; // Whether locale keywords are available for date parsing

    constructor(namespace: string = 'fancy-gst') {
        super(namespace);

        // Modal state
        this.taskId = null;
        this.actionType = 'edit';
        this.originalTask = null;
        this.currentCategories = [];
        this.allExistingCategories = [];

        // Callbacks
        this.onConfirm = null;
        this.onCancel = null;
        this.interactionHandler = null;

        // State flags
        this.isProcessing = false;
        this.categoryDropdown = null;
        this.dropdownCleanup = null;
        this.toBeAddedTaskElement = null;
        this.lastBadgeRemoveTime = 0;
        this.parsedDateInfo = null;
        this.localeAvailable = !!(window as any).FGT_LOCALE;
    }

    /**
     * Show task modal with specified mode
     * @param options - Modal options
     */
    async show(options: any = {}): Promise<void> {
        const {
            taskId = '',
            actionType = 'edit',
            taskData = null,
            interactionHandler = null,
            allCategories = [],
            onConfirm = null,
            onCancel = null,
            toBeAddedTaskElement = null
        } = options;

        // Store toBeAddedTaskElement
        this.toBeAddedTaskElement = toBeAddedTaskElement;

        // If taskId is empty and not toBeAdded mode, force newAtTop
        if ((!taskId || taskId === '') && actionType !== 'toBeAdded') {
            this.taskId = '';
            this.actionType = 'newAtTop';
            this.originalTask = null;
            this.currentCategories = [];
        } else if (actionType === 'toBeAdded') {
            // ToBeAdded mode
            this.taskId = '';
            this.actionType = 'toBeAdded';
            this.originalTask = taskData;

            // Set initial categories from taskData
            if (taskData && taskData.categories) {
                this.currentCategories = [...taskData.categories];
            } else {
                this.currentCategories = [];
            }
        } else {
            this.taskId = taskId;
            this.actionType = actionType;
            this.originalTask = taskData;

            // Set initial categories based on action type
            if (taskData && taskData.categories) {
                if (actionType === 'edit' || actionType === 'newAtTop') {
                    this.currentCategories = [...taskData.categories];
                } else {
                    this.currentCategories = [...taskData.categories];
                }
            } else {
                this.currentCategories = [];
            }
        }

        this.interactionHandler = interactionHandler;
        this.allExistingCategories = allCategories;
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;

        // Parse date info once and cache it to avoid repeated parsing
        // Uses window.FGT_LOCALE set during app initialization
        if (this.localeAvailable && this.originalTask && this.originalTask.dateFull) {
            this.parsedDateInfo = parseNaturalDate(
                this.originalTask.dateFull,
                this.originalTask.date || '',
                (window as any).FGT_LOCALE
            );
            Logger.fgtlog(`📅 Date info parsed and cached: year=${this.parsedDateInfo?.year}, month=${this.parsedDateInfo?.month}, day=${this.parsedDateInfo?.day}, weekago=${this.parsedDateInfo?.weekago}`);
        } else {
            this.parsedDateInfo = null;
        }

        // Create modal first
        this.createModal({
            size: 'large',
            closeOnBackdrop: false,
            closeOnEscape: true
        });

        // Set modal content
        this.updateContent(this.generateTaskModalHTML());

        // Attach event handlers
        this.attachTaskModalHandlers();

        // Open modal
        this.open(() => {
            if (this.onCancel) {
                this.onCancel();
            }
        });

        // Pre-load exact date for past date patterns (after modal is opened)
        // This includes "# weeks ago" and "# days ago" patterns where time is hidden in UI
        if (this.localeAvailable && this.parsedDateInfo) {
            const dateInfo = this.parsedDateInfo;

            let needsCalendarLoad = false;
            let patternDescription = '';

            if (dateInfo) {
                if (dateInfo.weekago > 0) {
                    // Week pattern: "1 week ago", "18 weeks ago", etc.
                    needsCalendarLoad = true;
                    patternDescription = `${dateInfo.weekago} week(s) ago`;
                } else if (dateInfo.year > 0) {
                    // Check if it's a past date (D+# pattern: "2 days ago", "3 days ago", etc.)
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const taskDate = new Date(dateInfo.year, dateInfo.month - 1, dateInfo.day);
                    taskDate.setHours(0, 0, 0, 0);
                    const isPast = taskDate < today;

                    if (isPast) {
                        const diffMs = today.getTime() - taskDate.getTime();
                        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
                        needsCalendarLoad = true;
                        patternDescription = `${diffDays} day(s) ago (past date)`;
                    }
                }
            }

            if (needsCalendarLoad) {
                Logger.fgtlog(`📅 Pre-loading exact date for ${patternDescription} pattern...`);

                try {
                    // Show loading spinner
                    if (!TEST_MODE) {
                        this.showLoading('Loading date information...', true);
                    }

                    const result = await this.loadExactDateFromCalendar();

                    if (result && result.date) {
                        // Store exact date and time in originalTask for later use
                        this.originalTask.exactDate = result.date;
                        this.originalTask.exactTime = result.time;
                        Logger.fgtlog(`✅ Exact date loaded: ${result.date}${result.time ? ', time: ' + result.time : ''}`);
                    }
                } finally {
                    // Always restore modal content and remove spinner (even if error occurred)
                    if (!TEST_MODE) {
                        this.updateContent(this.generateTaskModalHTML());
                        this.attachTaskModalHandlers();
                        this.removeLoadingSpinner(); // Remove spinner only (preserve event listeners)
                    }
                }
            }
        }

        Logger.fgtlog('📝 Task modal opened: ' + this.actionType + ' for task ' + (this.taskId || 'new'));

        // Log original task data for debugging
        if (this.originalTask) {
            Logger.fgtlog('📋 Original task data:');
            Logger.fgtlog(`  - taskId: ${this.taskId || 'N/A'}`);
            Logger.fgtlog(`  - actionType: ${this.actionType}`);
            Logger.fgtlog(`  - date: ${this.originalTask.date || 'N/A'}`);
            Logger.fgtlog(`  - dateFull: ${this.originalTask.dateFull || 'N/A'}`);

            // Use cached parsed date info
            if (this.parsedDateInfo) {
                Logger.fgtlog(`  - parsed time: ${this.parsedDateInfo.hours !== 99 ? this.parsedDateInfo.hours : 'N/A'}:${this.parsedDateInfo.minutes !== 99 ? this.parsedDateInfo.minutes : 'N/A'}`);
                Logger.fgtlog(`  - parsed date: ${this.parsedDateInfo.year}-${this.parsedDateInfo.month}-${this.parsedDateInfo.day}`);
            }

            Logger.fgtlog(`  - title: ${this.originalTask.displayTitle || 'N/A'}`);
            Logger.fgtlog(`  - description: ${this.originalTask.description || 'N/A'}`);
            Logger.fgtlog(`  - categories: ${JSON.stringify(this.originalTask.categories || [])}`);
        }
    }

    /**
     * Generate modal title based on action type
     */
    getModalTitle(): string {
        switch (this.actionType) {
            case 'edit':
                return `Edit a task : ${this.getFullTaskTitle()}`;
            case 'newAtTop':
                return 'New task at top';
            case 'newAtAfter':
                return `New task after a task : ${this.getFullTaskTitle()}`;
            case 'newAtBefore':
                return `New task before a task : ${this.getFullTaskTitle()}`;
            case 'toBeAdded':
                return 'Add new task';
            default:
                return 'Task Modal';
        }
    }

    /**
     * Get full task title with categories
     */
    getFullTaskTitle(): string {
        if (!this.originalTask) {
            return '';
        }
        
        const categoryPrefix = this.originalTask.categories && this.originalTask.categories.length > 0
            ? this.originalTask.categories.map((cat: string) => `[${cat}]`).join('')
            : '';
        
        const title = this.originalTask.displayTitle ?? '';
        
        return `${categoryPrefix}${title}`;
    }

    /**
     * Get initial title value (without categories)
     */
    getInitialTitle(): string {
        if (!this.originalTask) {
            return '';
        }

        if (this.actionType === 'edit' || this.actionType === 'newAtTop' || this.actionType === 'toBeAdded') {
            return this.originalTask.displayTitle || '';
        }

        return '';
    }

    /**
     * Get initial description value
     */
    getInitialDescription(): string {
        if (!this.originalTask) {
            return '';
        }

        if (this.actionType === 'edit' || this.actionType === 'newAtTop' || this.actionType === 'toBeAdded') {
            return this.originalTask.description || '';
        }

        return '';
    }

    /**
     * Generate task modal HTML content
     */
    generateTaskModalHTML(): string {
        return `
            ${this.createHeader(this.getModalTitle(), true)}
            ${this.createBody(`
                <div class="${this.namespace}-task-modal-content">
                    <!-- Category badges section -->
                    <div class="${this.namespace}-form-group">
                        <label class="${this.namespace}-form-label">Categories</label>
                        <div class="${this.namespace}-category-badges" id="${this.namespace}-category-badges">
                            ${this.renderCategoryBadges()}
                        </div>
                        <button type="button" 
                                class="${this.namespace}-add-subcategory-btn" 
                                id="${this.namespace}-add-subcategory-btn"
                                title="Add subcategory">
                            ➕ Add subcategory
                        </button>
                    </div>

                    <!-- Title textarea (multiline support for mobile compatibility) -->
                    <div class="${this.namespace}-form-group">
                        <label for="${this.namespace}-task-title-input" class="${this.namespace}-form-label">
                            Title
                        </label>
                        <textarea id="${this.namespace}-task-title-input"
                                  class="${this.namespace}-task-title-input ${this.namespace}-form-input"
                                  placeholder="Enter task title or [Category] to add category..."
                                  rows="2">${CoreDOMUtils.escapeHtml(this.getInitialTitle())}</textarea>
                    </div>

                    <!-- Description textarea -->
                    <div class="${this.namespace}-form-group">
                        <label for="${this.namespace}-task-desc-input" class="${this.namespace}-form-label">
                            Description
                        </label>
                        <textarea id="${this.namespace}-task-desc-input"
                                  class="${this.namespace}-task-desc-input ${this.namespace}-form-input" 
                                  placeholder="Enter task description..."
                                  rows="3">${CoreDOMUtils.escapeHtml(this.getInitialDescription())}</textarea>
                    </div>

                    <!-- Set Date/Time input -->
                    <!-- TEMPORARY: Disable date/time editing for completed tasks or when locale is unavailable -->
                    ${!this.originalTask?.isCompleted && this.localeAvailable ? `
                    <div class="${this.namespace}-form-group">
                        <label class="${this.namespace}-form-label">Set Date/Time</label>
                        <div class="${this.namespace}-datetime-inputs">
                            <input type="date"
                                   id="${this.namespace}-date-input"
                                   class="${this.namespace}-date-input ${this.namespace}-form-input"
                                   value="${this.getDateValue()}"
                                   title="Select date">
                            <input type="time"
                                   id="${this.namespace}-time-input"
                                   class="${this.namespace}-time-input ${this.namespace}-form-input"
                                   value="${this.getTimeValue()}"
                                   title="Select time">
                        </div>
                        ${this.originalTask && this.originalTask.date ? `
                        <div class="${this.namespace}-date-display">
                            Current: ${this.getFormattedDueDate()}
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}

                    <!-- Assignee display -->
                    ${this.originalTask && this.originalTask.assignee && this.originalTask.assignee !== '😶' ? `
                    <div class="${this.namespace}-form-group">
                        <label class="${this.namespace}-form-label">Assignee</label>
                        <div class="${this.namespace}-readonly-field">
                            ${CoreDOMUtils.escapeHtml(this.originalTask.assignee)}
                        </div>
                    </div>
                    ` : ''}
                </div>
            `)}
            ${this.createFooter([
                { text: 'Cancel', action: 'cancel' },
                { text: 'Confirm', action: 'confirm', primary: true }
            ])}
        `;
    }

    /**
     * Get formatted due date for modal display
     */
    getFormattedDueDate(): string {
        if (!this.originalTask || !this.originalTask.date || !this.originalTask.dateFull) {
            return 'No date';
        }

        // Use cached parsed date info
        return formatDateForModal(this.parsedDateInfo);
    }

    /**
     * Get date value in YYYY-MM-DD format for input[type="date"]
     *
     * For "# weeks ago" pattern, uses pre-loaded exactDate from originalTask
     */
    getDateValue(): string {
        if (!this.originalTask || !this.originalTask.dateFull) {
            return '';
        }

        // Check if exactDate was pre-loaded (for weeks ago pattern)
        if (this.originalTask.exactDate) {
            Logger.fgtlog(`📅 Using pre-loaded exact date: ${this.originalTask.exactDate}`);
            return this.originalTask.exactDate;
        }

        // Use cached parsed date info
        const dateInfo = this.parsedDateInfo;

        if (dateInfo && dateInfo.year && dateInfo.month && dateInfo.day) {
            const year = dateInfo.year;
            const month = String(dateInfo.month).padStart(2, '0');
            const day = String(dateInfo.day).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        return '';
    }

    /**
     * Load exact date and time from calendar dialog (for weeks ago pattern)
     * Called during show() initialization
     *
     * Returns both date and time information read from the calendar dialog.
     * For "N weeks ago" tasks, this is the only way to get the actual time value
     * since the time is hidden in the date button text for past dates.
     */
    async loadExactDateFromCalendar(): Promise<{ date: string; time: string }> {
        try {
            // Find task element's date button
            let taskElement = null;
            if (this.actionType === 'edit' && this.taskId) {
                taskElement = OgtFinder.findTaskWrapper(this.taskId);
            } else if (this.actionType === 'toBeAdded' && this.toBeAddedTaskElement) {
                taskElement = this.toBeAddedTaskElement;
            }

            if (!taskElement) {
                Logger.fgtwarn('⚠️ Cannot read exact date: task element not found');
                return { date: '', time: '' };
            }

            const dateButton = taskElement.findDateButton();
            if (!dateButton) {
                Logger.fgtwarn('⚠️ Cannot read exact date: date button not found');
                return { date: '', time: '' };
            }

            // Get locale from global constant (set during app initialization)
            const locale = (window as any).FGT_LOCALE;
            if (!locale) {
                throw new Error('Locale not initialized - cannot parse date');
            }

            // Use cached parsed date info to determine navigation target
            const dateInfo = this.parsedDateInfo;
            let targetYear: number | null = null;
            let targetMonth: number | null = null;

            if (dateInfo) {
                // Calculate target month for navigation
                if (dateInfo.weekago > 0) {
                    // Week pattern: calculate actual date from weeks ago
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const targetDate = new Date(today);
                    targetDate.setDate(targetDate.getDate() - (dateInfo.weekago * 7));
                    targetYear = targetDate.getFullYear();
                    targetMonth = targetDate.getMonth() + 1; // 1-based
                    Logger.fgtlog(`📅 Week pattern: ${dateInfo.weekago} week(s) ago → target ${targetYear}-${targetMonth}`);
                } else if (dateInfo.year > 0) {
                    // Normal date pattern
                    targetYear = dateInfo.year;
                    targetMonth = dateInfo.month;
                    Logger.fgtlog(`📅 Normal date pattern: ${targetYear}-${targetMonth}-${dateInfo.day}`);
                }
            } else {
                Logger.fgtlog('⚠️ No cached date info, will try without navigation');
            }

            // Click date button to open calendar
            Logger.fgtlog('🖱️ Clicking date button to open calendar...');
            dateButton.element.click();

            // Wait for dialog
            const dialog = await dateButton.waitForDateSelectDialog(3000);
            Logger.fgtlog('✅ Calendar dialog opened');

            // Navigate to target month (ALWAYS navigate to ensure selected cell is visible)
            // Even if target month = current month, we need to do this because calendar
            // may open showing current month but selected cell might not be rendered yet
            if (targetYear && targetMonth) {
                Logger.fgtlog(`🧭 Navigating to target month: ${targetYear}-${targetMonth}`);
                await DateDialogUtils.navigateToMonthYear(dialog, targetYear, targetMonth);
                Logger.fgtlog('✅ Navigation complete');

                // Wait a bit for calendar rendering after navigation
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Poll for selected cell (it may take time to render)
            let selectedCell: Element | null = null;
            const maxPolling = 10; // Max 1 second
            for (let i = 0; i < maxPolling; i++) {
                selectedCell = dialog.element.querySelector('[role="gridcell"][aria-selected="true"]');
                if (selectedCell) {
                    Logger.fgtlog(`✅ Selected cell found (attempt ${i + 1}/${maxPolling})`);
                    break;
                }
                Logger.fgtlog(`⏳ Waiting for selected cell (attempt ${i + 1}/${maxPolling})...`);
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (!selectedCell) {
                throw new Error('No selected cell found in calendar after polling');
            }

            const dayAttr = selectedCell.getAttribute('data-day-of-month');
            if (!dayAttr) {
                throw new Error('Selected cell has no data-day-of-month attribute');
            }

            const day = parseInt(dayAttr, 10);

            // Read current month/year from label after navigation
            const label = dialog.findMonthYearLabel();
            if (!label) {
                throw new Error('Month/year label not found');
            }

            let labelText = label.innerText.trim();
            const parsed = this.parseMonthYearLabel(labelText, locale);
            if (!parsed) {
                throw new Error(`Failed to parse month/year: "${labelText}"`);
            }

            const year = parsed.year;
            const month = parsed.month;

            Logger.fgtlog(`📅 Read exact date from calendar: ${year}-${month}-${day}`);

            // Read time from time input field
            let timeValue = '';
            const timeInput = dialog.findTimeInput();

            if (timeInput && timeInput.value) {
                const rawTimeValue = timeInput.value.trim();
                Logger.fgtlog(`🕐 Raw time input value: "${rawTimeValue}"`);

                // Parse time using date_parser's extractAndRemoveTime
                const keywords = getLocaleKeywords(locale);
                if (keywords) {
                    // Normalize numbers first (handles Bengali, Devanagari, etc.)
                    const normalizedTime = normalizeNumbers(rawTimeValue, keywords);

                    // Extract time (handles both 12-hour and 24-hour formats)
                    const timeResult = extractAndRemoveTime(normalizedTime, keywords);

                    if (timeResult.hours !== null && timeResult.minutes !== null) {
                        // Format as HH:MM (24-hour format with leading zeros)
                        const hours = String(timeResult.hours).padStart(2, '0');
                        const minutes = String(timeResult.minutes).padStart(2, '0');
                        timeValue = `${hours}:${minutes}`;
                        Logger.fgtlog(`⏰ Parsed time: ${timeValue}`);
                    } else {
                        Logger.fgtlog('⏰ Time input exists but could not be parsed');
                    }
                } else {
                    Logger.fgtwarn('⚠️ Could not get locale keywords for time parsing');
                }
            } else {
                Logger.fgtlog('⏰ No time set (time input is empty)');
            }

            // Close dialog
            const cancelButton = dialog.findCancelButton();
            if (cancelButton) {
                Logger.fgtlog('🔄 Closing calendar dialog...');
                cancelButton.click();
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // Return formatted date and time
            const monthStr = String(month).padStart(2, '0');
            const dayStr = String(day).padStart(2, '0');
            const dateStr = `${year}-${monthStr}-${dayStr}`;

            return { date: dateStr, time: timeValue };

        } catch (error: any) {
            Logger.fgterror(`❌ Failed to read exact date/time from calendar: ${error.message}`);

            // Try to close dialog if open
            try {
                await DateController.cancelOpenDialog();
            } catch {}

            return { date: '', time: '' };
        }
    }

    /**
     * Parse month and year from calendar label text
     * Helper method for getDateValue() weeks ago pattern
     */
    private parseMonthYearLabel(labelText: string, locale: string): { year: number; month: number } | null {
        // Get locale keywords
        const windowAny = window as any;
        if (!windowAny.FGT_GET_LOCALE_KEYWORDS) {
            return null;
        }

        const getterFunc = windowAny.FGT_GET_LOCALE_KEYWORDS as (locale: string) => any;
        const keywords = getterFunc(locale);
        if (!keywords) {
            return null;
        }

        // Normalize numbers
        let normalized = labelText.trim();
        if (!keywords.usesLatinNumbers && keywords.numberingDigits) {
            const digits = keywords.numberingDigits.split('|');
            for (let i = 0; i < 10; i++) {
                if (digits[i]) {
                    normalized = normalized.replace(new RegExp(digits[i], 'g'), String(i));
                }
            }
        }

        // Extract 4-digit year
        const yearMatch = normalized.match(/[1-9][0-9]{3}/);
        if (!yearMatch) {
            return null;
        }

        const year = parseInt(yearMatch[0], 10);
        let remaining = normalized.replace(yearMatch[0], ' ').trim();

        // Extract month
        let foundMonth: number | null = null;
        for (let monthIndex = keywords.months.combined.length - 1; monthIndex >= 0; monthIndex--) {
            const variants = keywords.months.combined[monthIndex].split('|');
            for (const variant of variants) {
                if (remaining.toLowerCase().includes(variant.toLowerCase())) {
                    foundMonth = monthIndex + 1;
                    break;
                }
            }
            if (foundMonth !== null) {
                break;
            }
        }

        if (foundMonth === null) {
            return null;
        }

        return { year, month: foundMonth };
    }

    /**
     * Get time value in HH:MM format for input[type="time"]
     *
     * Priority:
     * 1. Use exactTime if pre-loaded from calendar (for "N weeks ago" pattern)
     * 2. Otherwise parse from dateFull text (for normal dates)
     */
    getTimeValue(): string {
        if (!this.originalTask || !this.originalTask.dateFull) {
            return '';
        }

        // Priority 1: Use pre-loaded exactTime if available
        // This is crucial for "N weeks ago" pattern where time is hidden in UI
        if (this.originalTask.exactTime !== undefined && this.originalTask.exactTime !== null) {
            return this.originalTask.exactTime;
        }

        // Priority 2: Use cached parsed date info
        const dateInfo = this.parsedDateInfo;

        // Check if time exists (hours and minutes are not 99, which means "no time")
        if (dateInfo && dateInfo.hours !== 99 && dateInfo.minutes !== 99) {
            const hour = String(dateInfo.hours).padStart(2, '0');
            const minute = String(dateInfo.minutes).padStart(2, '0');
            return `${hour}:${minute}`;
        }

        return '';
    }

    /**
     * Render category badges HTML
     */
    renderCategoryBadges(): string {
        if (this.currentCategories.length === 0) {
            return `<div class="${this.namespace}-no-categories">No categories</div>`;
        }

        return this.currentCategories.map((category, index) => {
            const seed = CategoryUtils.generateCategorySeed(this.currentCategories, index);
            const colorStyle = this.generateCategoryColor(seed, index);
            
            return `
                <div class="${this.namespace}-category-badge" 
                     data-category-index="${index}"
                     data-category="${CoreDOMUtils.escapeHtml(category)}"
                     style="background-color: ${colorStyle.backgroundColor}; color: ${colorStyle.color};">
                    <span class="${this.namespace}-badge-text">${CoreDOMUtils.escapeHtml(category)}</span>
                    <button type="button" 
                            class="${this.namespace}-badge-remove" 
                            data-category-index="${index}"
                            title="Remove category">×</button>
                </div>
            `;
        }).join('');
    }

    /**
     * Generate category color
     */
    generateCategoryColor(seed: string, level: number): any {
        const hue = CategoryUtils.generateHueFromSeed(seed);
        const saturation = 65 + (level * 5) % 20;
        const lightness = 85 + (level * 5) % 15;
        
        const backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        
        return {
            backgroundColor: backgroundColor,
            color: '#000',
            borderColor: '#000'
        };
    }

    /**
     * Attach task modal event handlers
     */
    attachTaskModalHandlers(): void {
        // Button handlers
        this.attachButtonHandlers({
            cancel: () => this.handleCancel(),
            confirm: () => this.handleConfirm()
        });

        // Title input blur event
        const titleInput = this.modal!.querySelector(`#${this.namespace}-task-title-input`);
        if (titleInput) {
            const cleanup1 = CoreEventUtils.addListener(titleInput, 'blur', () => {
                this.handleTitleBlur();
            });
            this.cleanupFunctions.push(cleanup1);
        }

        // Category badge remove button
        const badgeContainer = this.modal!.querySelector(`#${this.namespace}-category-badges`);
        if (badgeContainer) {
            const cleanup2 = CoreEventUtils.delegate(
                badgeContainer,
                `.${this.namespace}-badge-remove`,
                'click',
                (event: any) => this.handleRemoveBadge(event)
            );
            this.cleanupFunctions.push(cleanup2);

            // Category badge click (for dropdown)
            const cleanup3 = CoreEventUtils.delegate(
                badgeContainer,
                `.${this.namespace}-category-badge`,
                'click',
                (event: any) => this.handleBadgeClick(event)
            );
            this.cleanupFunctions.push(cleanup3);
        }

        // Add subcategory button
        const addSubcategoryBtn = this.modal!.querySelector(`#${this.namespace}-add-subcategory-btn`);
        if (addSubcategoryBtn) {
            const cleanup4 = CoreEventUtils.addListener(addSubcategoryBtn, 'click', (event: Event) => {
                this.handleAddSubcategory(event);
            });
            this.cleanupFunctions.push(cleanup4);
        }
    }

    /**
     * Handle title input blur - detect and extract [Category]
     */
    handleTitleBlur(): void {
        const titleInput = this.modal!.querySelector(`#${this.namespace}-task-title-input`) as HTMLTextAreaElement;
        if (!titleInput) return;

        const text = titleInput.value;
        const categoryMatch = text.match(/^\[([^\]]+)\]/);
        
        if (categoryMatch) {
            const newCategory = categoryMatch[1].trim();
            
            if (newCategory && CategoryParser.isValidCategory(newCategory)) {
                this.currentCategories.push(newCategory);
                titleInput.value = text.substring(categoryMatch[0].length).trim();
                this.updateCategoryBadges();
                Logger.fgtlog('✅ Added category from title: ' + newCategory);
            } else {
                CoreNotificationUtils.warning('Invalid category name', this.namespace);
            }
        }
    }

    /**
     * Handle category badge remove
     */
    handleRemoveBadge(event: any): void {
        event.stopPropagation();

        // Prevent rapid consecutive clicks (within 500ms)
        const now = Date.now();
        if (now - this.lastBadgeRemoveTime < 500) {
            Logger.fgtlog('⚠️ Badge remove ignored (too fast)');
            return;
        }
        this.lastBadgeRemoveTime = now;

        const button = event.currentTarget;
        const categoryIndex = parseInt(button.dataset.categoryIndex);
        const category = this.currentCategories[categoryIndex];

        // Remove category without confirmation
        this.currentCategories.splice(categoryIndex, 1);
        this.updateCategoryBadges();
        Logger.fgtlog('🗑️ Removed category: ' + category);
    }

    /**
     * Handle category badge click - show dropdown
     */
    handleBadgeClick(event: any): void {
        // Prevent badge remove button from triggering this
        if (event.target.classList.contains(`${this.namespace}-badge-remove`)) {
            return;
        }

        event.stopPropagation();
        
        const badge = event.currentTarget;
        const categoryIndex = parseInt(badge.dataset.categoryIndex);
        
        Logger.fgtlog('🏷️ Badge clicked: index ' + categoryIndex);
        
        // Close any existing dropdown
        this.closeCategoryDropdown();
        
        // Show dropdown for this badge
        this.showCategoryDropdown(badge, categoryIndex);
    }

    /**
     * Show category dropdown menu
     */
    showCategoryDropdown(badge: HTMLElement, categoryIndex: number): void {
        // Get same level categories
        const sameLevelCategories = this.getSameLevelCategories(categoryIndex);
        
        // Create dropdown element
        const dropdown = document.createElement('div');
        dropdown.className = `${this.namespace}-category-dropdown`;
        dropdown.id = `${this.namespace}-category-dropdown`;
        
        // Build dropdown content
        let dropdownHTML = '';
        
        // Modify option
        dropdownHTML += `
            <div class="${this.namespace}-dropdown-item modify-option" data-action="modify">
                ✏️ Modify
            </div>
        `;
        
        // Same level categories
        if (sameLevelCategories.length > 0) {
            dropdownHTML += `<div class="${this.namespace}-dropdown-divider"></div>`;
            
            sameLevelCategories.forEach(categoryName => {
                dropdownHTML += `
                    <div class="${this.namespace}-dropdown-item category-option" 
                         data-action="switch" 
                         data-category-name="${CoreDOMUtils.escapeHtml(categoryName)}">
                        ${CoreDOMUtils.escapeHtml(categoryName)}
                    </div>
                `;
            });
        }
        
        dropdown.innerHTML = dropdownHTML;
        
        // Calculate position
        const rect = badge.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.minWidth = `${rect.width}px`;
        
        // Add to document
        document.body.appendChild(dropdown);
        this.categoryDropdown = dropdown;
        
        // Attach dropdown event handlers
        const modifyOption = dropdown.querySelector('.modify-option');
        if (modifyOption) {
            const cleanup1 = CoreEventUtils.addListener(modifyOption, 'click', () => {
                this.handleModifyCategory(categoryIndex);
            });
            
            this.dropdownCleanup = () => {
                cleanup1();
                // Clean up other handlers below
            };
        }
        
        const categoryOptions = dropdown.querySelectorAll('.category-option');
        categoryOptions.forEach(option => {
            const cleanup2 = CoreEventUtils.addListener(option, 'click', () => {
                const categoryName = option.getAttribute('data-category-name');
                if (categoryName) {
                    this.handleSwitchCategory(categoryIndex, categoryName);
                }
            });
            
            // Add to cleanup chain
            if (this.dropdownCleanup) {
                const prevCleanup = this.dropdownCleanup;
                this.dropdownCleanup = () => {
                    prevCleanup();
                    cleanup2();
                };
            }
        });
        
        // Close dropdown on outside click
        const outsideClickCleanup = CoreEventUtils.addListener(document, 'click', (e: any) => {
            if (!dropdown.contains(e.target) && e.target !== badge) {
                this.closeCategoryDropdown();
            }
        });
        
        // Add to cleanup chain
        if (this.dropdownCleanup) {
            const prevCleanup = this.dropdownCleanup;
            this.dropdownCleanup = () => {
                prevCleanup();
                outsideClickCleanup();
            };
        } else {
            this.dropdownCleanup = outsideClickCleanup;
        }
        
        // Close on ESC key
        const escapeCleanup = CoreEventUtils.addListener(document, 'keydown', (e: any) => {
            if (e.key === 'Escape') {
                this.closeCategoryDropdown();
            }
        });
        
        // Add to cleanup chain
        if (this.dropdownCleanup) {
            const prevCleanup = this.dropdownCleanup;
            this.dropdownCleanup = () => {
                prevCleanup();
                escapeCleanup();
            };
        }
        
        Logger.fgtlog('📋 Category dropdown shown with ' + sameLevelCategories.length + ' options');
    }

    /**
     * Get categories at the same level (sharing same parent sequence)
     */
    getSameLevelCategories(categoryIndex: number): string[] {
        const parentPath = this.currentCategories.slice(0, categoryIndex);
        const currentCategory = this.currentCategories[categoryIndex];
        
        const sameLevelCategories: string[] = [];
        const seen = new Set<string>();
        
        // Search through all existing category sequences
        this.allExistingCategories.forEach((catArray: string[]) => {
            // Check if this array has the same parent path
            if (catArray.length > categoryIndex) {
                // Compare parent paths
                let parentMatches = true;
                for (let i = 0; i < categoryIndex; i++) {
                    if (catArray[i] !== parentPath[i]) {
                        parentMatches = false;
                        break;
                    }
                }
                
                if (parentMatches) {
                    const categoryAtLevel = catArray[categoryIndex];
                    
                    // Don't include current category
                    if (categoryAtLevel !== currentCategory && !seen.has(categoryAtLevel)) {
                        seen.add(categoryAtLevel);
                        sameLevelCategories.push(categoryAtLevel);
                    }
                }
            }
        });
        
        Logger.fgtlog(`🔍 Found ${sameLevelCategories.length} same-level categories for index ${categoryIndex}`);
        return sameLevelCategories;
    }

    /**
     * Handle modify category option
     */
    handleModifyCategory(categoryIndex: number): void {
        this.closeCategoryDropdown();
        
        const currentCategory = this.currentCategories[categoryIndex];
        const newName = prompt(`Modify category name:`, currentCategory);
        
        if (newName !== null && newName.trim() !== '') {
            const cleanName = CategoryParser.cleanCategory(newName);
            
            if (CategoryParser.isValidCategory(cleanName)) {
                // Only change this category, keep children
                this.currentCategories[categoryIndex] = cleanName;
                this.updateCategoryBadges();
                
                Logger.fgtlog(`✏️ Modified category at index ${categoryIndex}: ${currentCategory} → ${cleanName}`);
                CoreNotificationUtils.success('Category modified', this.namespace);
            } else {
                CoreNotificationUtils.warning('Invalid category name', this.namespace);
            }
        }
    }

    /**
     * Handle switch category option - replace category at index
     */
    handleSwitchCategory(categoryIndex: number, newCategoryName: string): void {
        this.closeCategoryDropdown();
        
        Logger.fgtlog(`🔄 Switching category at index ${categoryIndex} to: ${newCategoryName}`);
        
        // Simply replace the category at this index
        this.currentCategories[categoryIndex] = newCategoryName;
        this.updateCategoryBadges();
        
        Logger.fgtlog(`✅ Updated to: ${JSON.stringify(this.currentCategories)}`);
        CoreNotificationUtils.success('Category switched', this.namespace);
    }

    /**
     * Close category dropdown
     */
    closeCategoryDropdown(): void {
        if (this.categoryDropdown) {
            // Clean up event handlers
            if (this.dropdownCleanup) {
                this.dropdownCleanup();
                this.dropdownCleanup = null;
            }
            
            // Remove from DOM
            this.categoryDropdown.remove();
            this.categoryDropdown = null;
            
            Logger.fgtlog('❌ Category dropdown closed');
        }
    }

    /**
     * Handle add subcategory button
     */
    handleAddSubcategory(event?: Event): void {
        // Get next level categories
        const nextLevelCategories = this.getNextLevelCategories();

        // If no options available, show prompt directly
        if (nextLevelCategories.length === 0) {
            this.promptForNewSubcategory();
            return;
        }

        // Show dropdown with options
        const button = event?.currentTarget as HTMLElement || this.modal!.querySelector(`#${this.namespace}-add-subcategory-btn`) as HTMLElement;
        if (button) {
            this.showAddSubcategoryDropdown(button, nextLevelCategories);
        }
    }

    /**
     * Prompt user for new subcategory name
     */
    promptForNewSubcategory(): void {
        const newCategory = prompt('Enter new subcategory name:');

        if (newCategory) {
            const cleanCategory = CategoryParser.cleanCategory(newCategory);

            if (CategoryParser.isValidCategory(cleanCategory)) {
                this.currentCategories.push(cleanCategory);
                this.updateCategoryBadges();
                Logger.fgtlog('➕ Added subcategory: ' + cleanCategory);
            } else {
                CoreNotificationUtils.warning('Invalid category name', this.namespace);
            }
        }
    }

    /**
     * Get next level categories based on current categories
     * @returns Array of category names at the next level
     */
    getNextLevelCategories(): string[] {
        const nextLevelIndex = this.currentCategories.length;
        const currentPath = this.currentCategories;

        const nextLevelCategories: string[] = [];
        const seen = new Set<string>();

        // Search through all existing category sequences
        this.allExistingCategories.forEach((catArray: string[]) => {
            // Check if this array extends our current path
            if (catArray.length > nextLevelIndex) {
                // Compare current path
                let pathMatches = true;
                for (let i = 0; i < currentPath.length; i++) {
                    if (catArray[i] !== currentPath[i]) {
                        pathMatches = false;
                        break;
                    }
                }

                if (pathMatches) {
                    const categoryAtNextLevel = catArray[nextLevelIndex];

                    if (!seen.has(categoryAtNextLevel)) {
                        seen.add(categoryAtNextLevel);
                        nextLevelCategories.push(categoryAtNextLevel);
                    }
                }
            }
        });

        Logger.fgtlog(`🔍 Found ${nextLevelCategories.length} next-level categories`);
        return nextLevelCategories;
    }

    /**
     * Show add subcategory dropdown menu
     */
    showAddSubcategoryDropdown(button: HTMLElement, categories: string[]): void {
        // Close any existing dropdown
        this.closeCategoryDropdown();

        // Create dropdown element
        const dropdown = document.createElement('div');
        dropdown.className = `${this.namespace}-category-dropdown`;
        dropdown.id = `${this.namespace}-category-dropdown`;

        // Build dropdown content
        let dropdownHTML = '';

        // Modify option (prompts for new category)
        dropdownHTML += `
            <div class="${this.namespace}-dropdown-item modify-option" data-action="add-new">
                ✏️ Modify
            </div>
        `;

        // Existing categories
        if (categories.length > 0) {
            dropdownHTML += `<div class="${this.namespace}-dropdown-divider"></div>`;

            categories.forEach(categoryName => {
                dropdownHTML += `
                    <div class="${this.namespace}-dropdown-item category-option"
                         data-action="select"
                         data-category-name="${CoreDOMUtils.escapeHtml(categoryName)}">
                        ${CoreDOMUtils.escapeHtml(categoryName)}
                    </div>
                `;
            });
        }

        dropdown.innerHTML = dropdownHTML;

        // Calculate position
        const rect = button.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.minWidth = `${rect.width}px`;

        // Add to document
        document.body.appendChild(dropdown);
        this.categoryDropdown = dropdown;

        // Attach dropdown event handlers
        const modifyOption = dropdown.querySelector('.modify-option');
        if (modifyOption) {
            const cleanup1 = CoreEventUtils.addListener(modifyOption, 'click', () => {
                this.closeCategoryDropdown();
                this.promptForNewSubcategory();
            });

            this.dropdownCleanup = () => {
                cleanup1();
            };
        }

        const categoryOptions = dropdown.querySelectorAll('.category-option');
        categoryOptions.forEach(option => {
            const cleanup2 = CoreEventUtils.addListener(option, 'click', () => {
                const categoryName = option.getAttribute('data-category-name');
                if (categoryName) {
                    this.closeCategoryDropdown();
                    this.currentCategories.push(categoryName);
                    this.updateCategoryBadges();
                    Logger.fgtlog('➕ Added subcategory from dropdown: ' + categoryName);
                    CoreNotificationUtils.success('Category added', this.namespace);
                }
            });

            // Add to cleanup chain
            if (this.dropdownCleanup) {
                const prevCleanup = this.dropdownCleanup;
                this.dropdownCleanup = () => {
                    prevCleanup();
                    cleanup2();
                };
            }
        });

        // Close dropdown on outside click
        const outsideClickCleanup = CoreEventUtils.addListener(document, 'click', (e: any) => {
            if (!dropdown.contains(e.target) && e.target !== button) {
                this.closeCategoryDropdown();
            }
        });

        // Add to cleanup chain
        if (this.dropdownCleanup) {
            const prevCleanup = this.dropdownCleanup;
            this.dropdownCleanup = () => {
                prevCleanup();
                outsideClickCleanup();
            };
        } else {
            this.dropdownCleanup = outsideClickCleanup;
        }

        // Close on ESC key
        const escapeCleanup = CoreEventUtils.addListener(document, 'keydown', (e: any) => {
            if (e.key === 'Escape') {
                this.closeCategoryDropdown();
            }
        });

        // Add to cleanup chain
        if (this.dropdownCleanup) {
            const prevCleanup = this.dropdownCleanup;
            this.dropdownCleanup = () => {
                prevCleanup();
                escapeCleanup();
            };
        }

        Logger.fgtlog('📋 Add subcategory dropdown shown with ' + categories.length + ' options');
    }

    /**
     * Update category badges display
     */
    updateCategoryBadges(): void {
        const badgeContainer = this.modal!.querySelector(`#${this.namespace}-category-badges`);
        if (badgeContainer) {
            badgeContainer.innerHTML = this.renderCategoryBadges();
        }
    }

    /**
     * Simulate click on div elements with coordinate-based mouse events
     * Required for div elements that don't respond to simple click events
     * @param element - Target element (typically a div)
     */
    private simulateClick(element: Element): void {
        CoreDOMUtils.simulateClick(element);
    }

    /**
     * Hide UI for operation visualization based on TEST_MODE
     * @param message - Loading message to display in production mode
     */
    private hideUIForOperation(message: string): void {
        if (TEST_MODE) {
            // TEST MODE: Hide UI completely to see DOM manipulation
            if (this.overlay) {
                (this.overlay as HTMLElement).style.display = 'none';
            }
            const container = document.getElementById('fancy-gst-container');
            if (container) {
                (container as HTMLElement).style.display = 'none';
            }
        } else {
            // PRODUCTION MODE: Show semi-transparent overlay to visualize operation
            this.showLoading(message, true);
        }
    }

    /**
     * Restore UI after operation
     */
    private restoreUIAfterOperation(): void {
        if (TEST_MODE) {
            // TEST MODE: Restore display properties
            if (this.overlay) {
                (this.overlay as HTMLElement).style.display = '';
            }
            const container = document.getElementById('fancy-gst-container');
            if (container) {
                (container as HTMLElement).style.display = '';
            }
        } else {
            // PRODUCTION MODE: Remove visual mode classes and spinner
            if (this.overlay?.classList.contains('fgt-operating-visual')) {
                // Remove spinner from overlay
                const spinner = this.overlay.querySelector(`.${this.namespace}-operating-spinner`);
                if (spinner) {
                    spinner.remove();
                }

                // Remove class from overlay
                this.overlay.classList.remove('fgt-operating-visual');

                // Remove class from container
                const container = document.getElementById('fancy-gst-container');
                if (container) {
                    container.classList.remove('fgt-operating-visual');
                }

                // Remove class from button container
                const buttonContainer = document.getElementById('fancy-gst-button-container');
                if (buttonContainer) {
                    buttonContainer.classList.remove('fgt-operating-visual');
                }
            }
        }
    }

    /**
     * Handle cancel button
     */
    handleCancel(): void {
        this.closeCategoryDropdown();

        // Call onCancel before closing
        if (this.onCancel) {
            this.onCancel();
        }

        // Prevent onClose callback from firing
        this.onClose = null;
        this.close();
    }

    /**
     * Handle confirm button
     */
    async handleConfirm(): Promise<void> {
        if (this.isProcessing) {
            return;
        }

        this.closeCategoryDropdown();

        const titleInput = this.modal!.querySelector(`#${this.namespace}-task-title-input`) as HTMLTextAreaElement;
        const descInput = this.modal!.querySelector(`#${this.namespace}-task-desc-input`) as HTMLTextAreaElement;

        // DO NOT trim - let original UI decide whether to trim or not
        // We only check for empty using trim, but pass untrimmed value
        const title = titleInput?.value || '';
        const description = descInput?.value || '';

        if (this.currentCategories.length === 0 && title.trim() === '') {
            CoreNotificationUtils.warning('Please add at least a category or title', this.namespace);
            titleInput?.focus();
            return;
        }

        // Get original full title (with categories, without newline)
        const originalFullTitle = this.originalTask ?
            CategoryParser.reconstructTitle(
                this.originalTask.categories || [],
                this.originalTask.displayTitle || '',
                false  // No newline for comparison
            ) : '';
        const originalDescription = this.originalTask?.description || '';

        // Reconstruct full title with current values (without newline for comparison)
        const fullTitleWithoutNewline = CategoryParser.reconstructTitle(
            this.currentCategories,
            title,
            false  // No newline for comparison
        );

        // Check if FULL title was modified (including categories or clean title)
        // This means: if user changed either category badges OR clean title, we add newline
        // Example: [A][B]Title → [A][B][C]Title (category changed) → should add newline
        // Example: [A][B]Title → [A][B]NewTitle (title changed) → should add newline
        // Example: [A][B]Title → [A][B]Title (nothing changed) → no newline
        const fullTitleWasModified = (fullTitleWithoutNewline !== originalFullTitle);

        // Add newline between categories and title for better readability
        // - toBeAdded mode: always add newline (new task)
        // - edit mode: only if full title was modified (categories or clean title changed)
        const shouldAddNewline = this.currentCategories.length > 0 &&
                                 (this.actionType === 'toBeAdded' || fullTitleWasModified);

        // Now create final fullTitle with newline if needed
        const fullTitle = CategoryParser.reconstructTitle(
            this.currentCategories,
            title,
            shouldAddNewline
        );

        Logger.fgtlog(`📝 Full title modified: ${fullTitleWasModified}, shouldAddNewline: ${shouldAddNewline}`);

        // Check if FULL title is placeholder text (for toBeAdded mode)
        // This check must be done AFTER fullTitle is constructed
        if (this.actionType === 'toBeAdded' && this.toBeAddedTaskElement) {
            const titleWrapper = this.toBeAddedTaskElement.findTitleWrapper();
            const titleEditor = titleWrapper?.findTitleEditor();
            const placeholder = titleEditor?.placeholder || '';

            if (placeholder && fullTitle === placeholder) {
                CoreNotificationUtils.error('Please enter a valid title (not placeholder text)', this.namespace);
                titleInput?.focus();
                return;
            }
        }

        // Validate duplicate title for both edit and toBeAdded modes
        if (this.actionType === 'edit' || this.actionType === 'toBeAdded') {
            if (!this.validateUniqueTitle(fullTitle, this.taskId)) {
                CoreNotificationUtils.error('A task with this title already exists', this.namespace);
                titleInput?.focus();
                return;
            }
        }

        // STEP 1: Handle date/time changes (COMMON for edit and toBeAdded modes)
        if (this.actionType === 'edit' || this.actionType === 'toBeAdded') {
            const dateInput = this.modal!.querySelector(`#${this.namespace}-date-input`) as HTMLInputElement;
            const timeInput = this.modal!.querySelector(`#${this.namespace}-time-input`) as HTMLInputElement;

            let newDateValue = dateInput?.value || ''; // YYYY-MM-DD
            const newTimeValue = timeInput?.value || ''; // HH:MM

            // Auto-set date to today if user only enters time without date
            if (!newDateValue && newTimeValue) {
                const today = new Date();
                newDateValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                Logger.fgtlog(`📅 Auto-set date to today: ${newDateValue} (user only entered time: ${newTimeValue})`);
            }

            // Get original date/time values
            const originalDateValue = this.getDateValue();
            const originalTimeValue = this.getTimeValue();

            // Check if date/time changed
            const dateChanged = newDateValue !== originalDateValue;
            const timeChanged = newTimeValue !== originalTimeValue;

            if (dateChanged || timeChanged) {
                Logger.fgtlog(`📅 Date/time change detected: date=${dateChanged}, time=${timeChanged}`);

                // Dispatch event to container to mark as manual operation
                const manualOpEvent = new CustomEvent('manualOperation', { bubbles: true });
                this.modal?.dispatchEvent(manualOpEvent);

                // Hide UI for operation visualization
                this.hideUIForOperation('Updating date/time...');

                // Find task element
                let taskElement = null;
                if (this.actionType === 'edit' && this.taskId) {
                    taskElement = OgtFinder.findTaskWrapper(this.taskId);
                } else if (this.actionType === 'toBeAdded' && this.toBeAddedTaskElement) {
                    taskElement = this.toBeAddedTaskElement;
                }

                if (!taskElement) {
                    this.restoreUIAfterOperation();
                    CoreNotificationUtils.error('Cannot change date: task element not found', this.namespace);
                    return;
                }

                // Close any open dialog first (restore UI if in TEST_MODE)
                if (TEST_MODE) {
                    this.restoreUIAfterOperation();
                }
                await DateController.cancelOpenDialog();

                // Activate task element first by clicking titleWrapper
                // This is required to make date button clickable (similar to description activation)
                const titleWrapper = taskElement.findTitleWrapper();
                if (titleWrapper) {
                    Logger.fgtlog('🎯 Clicking title wrapper to activate task element');
                    this.simulateClick(titleWrapper.element);
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                // Find date button
                const dateButton = taskElement.findDateButton();
                if (!dateButton) {
                    this.restoreUIAfterOperation();
                    CoreNotificationUtils.error('Cannot change date: date button not found', this.namespace);
                    return;
                }

                // Store original date button values for change detection
                const originalFullLabel = dateButton.fullLabel || '';
                const originalText = dateButton.text || '';

                Logger.fgtlog(`📅 Original date button state:`);
                Logger.fgtlog(`  - fullLabel: "${originalFullLabel}"`);
                Logger.fgtlog(`  - text: "${originalText}"`);

                // Determine time parameter based on whether time was changed
                // - undefined: Don't touch time (keep existing)
                // - null: Clear time completely
                // - 'HH:MM': Set specific time
                let timeToSet: string | null | undefined;
                if (timeChanged) {
                    if (newTimeValue === '') {
                        timeToSet = null;  // Clear time
                        Logger.fgtlog('⏰ Time will be cleared (timeChanged=true, newTimeValue is empty)');
                    } else {
                        timeToSet = newTimeValue;  // Set time
                        Logger.fgtlog(`⏰ Time will be set to: ${newTimeValue}`);
                    }
                } else {
                    timeToSet = undefined;  // Don't touch time
                    Logger.fgtlog('⏰ Time will not be changed (timeChanged=false)');
                }

                // Apply date/time change
                Logger.fgtlog(`🔄 Applying date/time change: date=${newDateValue}, time=${timeToSet}`);
                const success = await DateController.setDateTime(
                    dateButton,
                    newDateValue || null,
                    timeToSet,
                    {},
                    taskElement
                );

                if (!success) {
                    this.restoreUIAfterOperation();
                    CoreNotificationUtils.error('Failed to update date/time', this.namespace);
                    return;
                }

                Logger.fgtlog('✅ Date/time setDateTime call completed, now waiting for DOM changes...');

                // Wait for DOM changes to be applied and verified
                const verified = await DateVerification.verifyDateTimeChange(
                    taskElement,
                    newDateValue,
                    timeToSet,
                    originalFullLabel,
                    originalText,
                    DATE_VERIFICATION_TIMEOUT
                );

                // Restore UI after verification or timeout
                this.restoreUIAfterOperation();

                if (verified) {
                    Logger.fgtlog('✅ Date/time change verified successfully');
                } else {
                    Logger.fgtwarn('⏱️ Date/time change verification timeout (change may still have occurred)');
                }
            }
        }

        // STEP 2: Handle mode-specific operations (title/description)

        // Check if title/description changed
        const titleChanged = fullTitleWithoutNewline !== originalFullTitle;
        const descriptionChanged = description !== originalDescription;

        // Handle toBeAdded mode
        if (this.actionType === 'toBeAdded' && this.toBeAddedTaskElement) {
            // Lock UI to prevent interaction
            this.isProcessing = true;
            CoreDOMUtils.enableLockStyles();

            // Hide UI for operation visualization
            this.hideUIForOperation('Adding task...');

            Logger.fgtlog('🆕 Starting toBeAdded task operation...');

            // Dispatch event to container to mark as manual operation
            const manualOpEvent = new CustomEvent('manualOperation', { bubbles: true });
            this.modal?.dispatchEvent(manualOpEvent);

            try {
                // Update title in the original UI
                const titleWrapper = this.toBeAddedTaskElement.findTitleWrapper();
                const titleEditor = titleWrapper?.findTitleEditor();
                if (titleEditor) {
                    titleEditor.focus();
                    titleEditor.element.value = fullTitle;
                    const inputEvent = CoreDOMUtils.createInputEvent();
                    titleEditor.element.dispatchEvent(inputEvent);
                    titleEditor.blur();
                    Logger.fgtlog('✅ Title updated in original UI');
                }

                // Click title wrapper to make descViewer visible (like Edit mode)
                // This is required before updating description
                if (titleWrapper && description) {
                    Logger.fgtlog('🎯 Clicking title wrapper to reveal description UI');
                    this.simulateClick(titleWrapper.element);
                    await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 300));
                }

                // Update description in the original UI
                let descEditor = null; // Declare outside try block to avoid scope issue
                const descWrapper = this.toBeAddedTaskElement.findDescWrapper();
                if (descWrapper && description) {
                    try {
                        // Click wrapper to activate description editor (like Edit mode)
                        // Note: Must click wrapper, not viewer, to render textarea
                        Logger.fgtlog('🎯 Clicking description wrapper to activate editor');
                        this.simulateClick(descWrapper.element);
                        await new Promise(resolve => CoreEventUtils.timeouts.create(resolve, 200));

                        // Wait for editor to appear (using existing waitForDescEditor method)
                        descEditor = await descWrapper.waitForDescEditor(3000);

                        if (descEditor) {
                            descEditor.focus();
                            descEditor.element.value = description;
                            const inputEvent = CoreDOMUtils.createInputEvent();
                            descEditor.element.dispatchEvent(inputEvent);
                            descEditor.blur();
                            Logger.fgtlog('✅ Description updated in original UI');
                        }
                    } catch (error: any) {
                        Logger.fgtwarn(`⚠️ Failed to activate description editor: ${error.message}`);
                        // If description is not empty, this is a failure - throw error to outer catch
                        // If description is empty, continue (descEditor remains null)
                        if (description) {
                            throw new Error(`Failed to activate description editor: ${error.message}`);
                        }
                    }
                }

                // Wait for changes to apply - monitor DOM changes
                await this.waitForToBeAddedChanges(titleEditor, descEditor, fullTitle, description, 5000);

                // Restore UI
                this.restoreUIAfterOperation();

                // Unlock UI
                CoreDOMUtils.disableLockStyles();
                this.isProcessing = false;

                // Call confirm callback first (which will click the Add button)
                if (this.onConfirm) {
                    this.onConfirm({
                        taskId: '',
                        actionType: this.actionType,
                        title: fullTitle,
                        cleanTitle: title,
                        description: description,
                        categories: this.currentCategories
                    });
                }

                Logger.fgtlog('✅ ToBeAdded task operation completed');

                // Prevent onClose callback from firing
                this.onClose = null;
                this.close();

            } catch (error: any) {
                Logger.fgterror('❌ ToBeAdded task operation failed: ' + error.message);

                // Restore UI
                this.restoreUIAfterOperation();

                // Unlock UI
                CoreDOMUtils.disableLockStyles();
                this.isProcessing = false;

                // Show error in modal
                this.showError('Failed to add task: ' + error.message);
                CoreNotificationUtils.error('Failed to add task: ' + error.message, this.namespace);
            }

            return;
        }

        // Check if in edit mode and has valid taskId
        if (this.actionType === 'edit' && this.taskId && this.taskId !== '') {
            // If only date/time changed (not title/description), skip editTask
            if (!titleChanged && !descriptionChanged) {
                Logger.fgtlog('ℹ️ Only date/time changed, skipping title/description update');

                // Call confirm callback
                Logger.fgtlog(`🔍 [DEBUG] Calling onConfirm callback with taskId: ${this.taskId}`);
                if (this.onConfirm) {
                    this.onConfirm({
                        taskId: this.taskId,
                        actionType: this.actionType,
                        title: fullTitle,
                        cleanTitle: title,
                        description: description,
                        categories: this.currentCategories
                    });
                    Logger.fgtlog('🔍 [DEBUG] onConfirm callback completed');
                } else {
                    Logger.fgtwarn('⚠️ [DEBUG] onConfirm callback is null!');
                }

                // Prevent onClose callback from firing
                this.onClose = null;
                this.close();
                return;
            }

            // Lock UI to prevent interaction
            this.isProcessing = true;
            CoreDOMUtils.enableLockStyles();

            // Hide UI for operation visualization
            this.hideUIForOperation('Updating task...');

            Logger.fgtlog('📝 Starting task edit operation...');

            // Dispatch event to container to mark as manual operation
            const manualOpEvent = new CustomEvent('manualOperation', { bubbles: true });
            this.modal?.dispatchEvent(manualOpEvent);

            // Call editTask interaction
            this.interactionHandler.editTask(
                this.taskId,
                fullTitle,
                description,
                originalFullTitle,
                originalDescription,
                () => {
                    // Success callback
                    Logger.fgtlog('✅ Task edit completed');

                    // Restore UI
                    this.restoreUIAfterOperation();

                    // Unlock UI
                    CoreDOMUtils.disableLockStyles();
                    this.isProcessing = false;

                    // Call original confirm callback
                    if (this.onConfirm) {
                        this.onConfirm({
                            taskId: this.taskId,
                            actionType: this.actionType,
                            title: fullTitle,
                            cleanTitle: title,
                            description: description,
                            categories: this.currentCategories
                        });
                    }

                    // Prevent onClose callback from firing
                    this.onClose = null;
                    this.close();
                }
            ).catch((error: any) => {
                // Error callback
                Logger.fgterror('❌ Task edit failed: ' + error.message);

                // Restore UI
                this.restoreUIAfterOperation();

                // Unlock UI
                CoreDOMUtils.disableLockStyles();
                this.isProcessing = false;

                // Show error in modal
                this.showError('Failed to update task: ' + error.message);
            });
            
        } else {
            // New task creation (not implemented yet)
            CoreNotificationUtils.info(
                `Coming soon: ${this.actionType} operation with title "${fullTitle}"`,
                this.namespace
            );

            if (this.onConfirm) {
                this.onConfirm({
                    taskId: this.taskId,
                    actionType: this.actionType,
                    title: fullTitle,
                    cleanTitle: title,
                    description: description,
                    categories: this.currentCategories
                });
            }

            // Prevent onClose callback from firing
            this.onClose = null;
            this.close();
        }
    }

    /**
     * Wait for toBeAdded task changes to be applied to the DOM
     * @param titleEditor - Title editor element
     * @param descEditor - Description editor element
     * @param expectedTitle - Expected title text
     * @param expectedDesc - Expected description text
     * @param timeout - Maximum wait time (default 5000ms)
     */
    async waitForToBeAddedChanges(titleEditor: any, descEditor: any, expectedTitle: string, expectedDesc: string, timeout: number = 5000): Promise<void> {
        const startTime = Date.now();

        return new Promise((resolve) => {
            let intervalId: number | null = null;
            let timeoutId: number | null = null;

            const checkChange = () => {
                const elapsed = Date.now() - startTime;

                try {
                    let titleMatches = true;
                    let descMatches = true;

                    // Check title if titleEditor exists
                    if (titleEditor && titleEditor.element) {
                        const currentTitle = titleEditor.element.value || '';
                        titleMatches = currentTitle === expectedTitle;
                    }

                    // Check description if descEditor exists
                    if (descEditor && descEditor.element) {
                        const currentDesc = descEditor.element.value || '';
                        descMatches = currentDesc === expectedDesc;
                    }

                    // If both match, we're done
                    if (titleMatches && descMatches) {
                        if (intervalId !== null) CoreEventUtils.intervals.clear(intervalId);
                        if (timeoutId !== null) CoreEventUtils.timeouts.clear(timeoutId);
                        Logger.fgtlog(`✅ ToBeAdded changes detected in ${elapsed}ms`);
                        resolve();
                        return true;
                    }
                } catch (error: any) {
                    Logger.fgtwarn(`⚠️ Error checking toBeAdded changes: ${error.message}`);
                }

                return false;
            };

            // Start polling
            intervalId = CoreEventUtils.intervals.create(() => {
                checkChange();
            }, 50);

            // Set timeout
            timeoutId = CoreEventUtils.timeouts.create(() => {
                if (intervalId !== null) CoreEventUtils.intervals.clear(intervalId);
                Logger.fgtlog(`✅ ToBeAdded changes verified on timeout`);
                resolve();
            }, timeout);
        });
    }

    /**
     * Validate that the title is unique (no duplicate task titles)
     *
     * Uses flexible whitespace comparison because original UI sometimes
     * trims titles and sometimes doesn't - we need to handle both cases
     *
     * @param fullTitle - Full title to check (with categories)
     * @param excludeTaskId - Task ID to exclude from check (for edit mode)
     * @returns True if title is unique, false if duplicate exists
     */
    validateUniqueTitle(fullTitle: string, excludeTaskId: string | null): boolean {
        // Get all task elements using OgtFinder (imported at top)
        const allTasks = OgtFinder.findAllTaskWrappers();

        // Check each task for duplicate title
        for (const taskElement of allTasks) {
            // Skip the task being edited
            if (excludeTaskId && taskElement.taskId === excludeTaskId) {
                continue;
            }

            // Get title of this task
            const titleWrapper = taskElement.findTitleWrapper();
            const titleViewer = titleWrapper?.findTitleViewer();
            const existingTitle = titleViewer?.text || '';

            // Compare titles with flexible whitespace handling
            // This handles cases where original UI trims or doesn't trim
            if (CoreDOMUtils.compareWithFlexibleWhitespace(existingTitle, fullTitle)) {
                Logger.fgtwarn(`⚠️ Duplicate title found: "${fullTitle}" matches "${existingTitle}" (task: ${taskElement.taskId})`);
                return false;
            }
        }

        Logger.fgtlog(`✅ Title is unique: "${fullTitle}"`);
        return true;
    }

    /**
     * Override close to ensure dropdown cleanup
     */
    close(): void {
        this.closeCategoryDropdown();
        super.close();
    }

    /**
     * Show task modal (static method)
     */
    static show(options: any): TaskModal {
        const modal = new TaskModal(options.namespace || 'fancy-gst');
        modal.show(options);
        return modal;
    }
}

export { TaskModal };

Logger.fgtlog('✅ Task Modal loaded successfully');