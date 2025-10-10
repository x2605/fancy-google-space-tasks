// container/container_manager.ts - Main container management with unified task modal (UPDATED)
import * as Logger from '@/core/logger';
import { CoreEventUtils } from '@/core/event_utils';
import { CoreDOMUtils } from '@/core/dom_utils';
import { CoreNotificationUtils } from '@/core/notification_utils';
import { OperationVerifier } from '@/core/operation_verifier';
import { DeleteModal } from '@/modal/delete_modal';
import { CoreInteractionUtils } from '@/core/interaction_utils';
import { ContainerUI } from './container_ui';
import { TableRenderer } from '@/table/table_renderer';
import { TableEvents } from '@/table/table_events';
import { CategoryParser } from '@/category/category_parser';
import { TaskChangeDetector } from '@/core/change_detector';
import { OgtFinder } from '@/manipulator/finder';
import { singletonAssigneeColorUtils } from '@/assignee/assignee_color_utils';
import { TaskModal } from '@/modal/task_modal';
import { OgtTaskElement } from '@/manipulator/task_element/task_element';

Logger.fgtlog('📋 Container Manager loading...');

/**
 * Main container management for the entire extension
 * Handles everything outside the fancy-gst-tasks-table block
 */
class ContainerManager {
    namespace: string;
    CONTAINER_ID: string;
    containerUI: any;
    tableRenderer: TableRenderer | null;
    tableEvents: any;
    interactionHandler: any;
    changeDetector: any;
    operationVerifier: any;
    isInitialized: boolean;
    isCustomUIVisible: boolean;
    showCompleted: boolean;
    isShowingDeleteModal: boolean;
    isShowingTaskModal: boolean;
    tasks: Map<string, any>;
    maxCategoryDepth: number;
    observer: MutationObserver | null;
    spaceId: string | null;
    storageKey: string | null;
    customContainer: HTMLElement | null;
    toggleButton: HTMLElement | null;
    completedToggleButton: HTMLElement | null;
    originalZIndexes: Map<Element, string | null>;
    cleanupFunctions: Function[];

    constructor(namespace: string = 'fancy-gst') {
        this.namespace = namespace;
        this.CONTAINER_ID = `${namespace}-container`;

        // Core components
        this.containerUI = null;
        this.tableRenderer = null;
        this.tableEvents = null;
        this.interactionHandler = null;
        this.changeDetector = null;
        this.operationVerifier = null;

        // State management
        this.isInitialized = false;
        this.isCustomUIVisible = true;
        this.showCompleted = false;
        this.isShowingDeleteModal = false;
        this.isShowingTaskModal = false; // NEW: Task modal flag
        this.tasks = new Map();
        this.maxCategoryDepth = 0;
        this.observer = null;

        // Storage key for current space
        this.spaceId = null;
        this.storageKey = null;

        // UI elements
        this.customContainer = null;
        this.toggleButton = null;
        this.completedToggleButton = null;
        this.originalZIndexes = new Map();

        // Cleanup functions
        this.cleanupFunctions = [];
    }

    /**
     * Extract space ID from current URL
     * @returns Space ID or 'personal'
     */
    getSpaceIdFromUrl() {
        const url = window.location.href;
        
        // Remove query params
        const baseUrl = url.split('?')[0];
        
        // Pattern: https://tasks.google.com/embed/room/{SPACE_ID}/list/~default
        const roomMatch = baseUrl.match(/\/room\/([^/]+)\//);
        
        if (roomMatch) {
            return roomMatch[1];
        }
        
        // Pattern: https://tasks.google.com/embed/
        // This is personal tasks
        return 'personal';
    }

    /**
     * Initialize storage key for current space
     */
    initializeStorageKey() {
        this.spaceId = this.getSpaceIdFromUrl();
        this.storageKey = `space_${this.spaceId}`;
        Logger.fgtlog(`💾 Storage key initialized: ${this.storageKey} for space: ${this.spaceId}`);
    }

    /**
     * Load state from Chrome storage
     * @returns Saved state or defaults
     */
    async loadStateFromStorage() {
        try {
            if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
                Logger.fgtwarn('⚠️ chrome.storage.local not available, using defaults');
                return {
                    isCustomUIVisible: true,
                    showCompleted: false
                };
            }

            const result = await chrome.storage.local.get(this.storageKey!);
            const savedState = result[this.storageKey!];

            if (savedState) {
                Logger.fgtlog(`💾 State loaded from storage for ${this.spaceId}:` + savedState);
                return savedState;
            } else {
                Logger.fgtlog(`💾 No saved state found for ${this.spaceId}, using defaults`);
                return {
                    isCustomUIVisible: true,
                    showCompleted: false
                };
            }
        } catch (error) {
            Logger.fgterror('❌ Failed to load state from storage:' + error);
            return {
                isCustomUIVisible: true,
                showCompleted: false
            };
        }
    }

    /**
     * Save state to Chrome storage
     */
    async saveStateToStorage() {
        try {
            if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
                Logger.fgtwarn('⚠️ chrome.storage.local not available, state not saved');
                return;
            }

            const state = {
                isCustomUIVisible: this.isCustomUIVisible,
                showCompleted: this.showCompleted
            };

            await chrome.storage.local.set({
                [this.storageKey!]: state
            });

            Logger.fgtlog(`💾 State saved to storage for ${this.spaceId}:` + state);
        } catch (error: any) {
            Logger.fgterror('❌ Failed to save state to storage:' + error);
        }
    }

    /**
     * Initialize the container manager
     */
    async initialize() {
        if (this.isInitialized) {
            Logger.fgtlog('⚠️ Container Manager already initialized');
            return;
        }

        Logger.fgtlog('🚀 Container Manager initializing...');

        try {
            // Initialize storage key for current space
            this.initializeStorageKey();

            // Load saved state from storage
            const savedState = await this.loadStateFromStorage();
            this.isCustomUIVisible = savedState.isCustomUIVisible;
            this.showCompleted = savedState.showCompleted;
            Logger.fgtlog(`📊 Initial state: customUI=${this.isCustomUIVisible}, showCompleted=${this.showCompleted}`);

            // Initialize components
            this.initializeComponents();

            // Wait for DOM
            await CoreDOMUtils.waitForDOM();

            // Setup UI
            await this.setupUI();

            // Extract and display initial data - CONDITIONAL RENDERING
            if (this.isCustomUIVisible) {
                this.extractAndDisplayTasks();
            } else {
                Logger.fgtlog('⭐️ Skipping initial render (Original UI mode)');
            }

            // Start change detection
            this.startObserving();

            this.isInitialized = true;
            Logger.fgtlog('✅ Container Manager initialized successfully');

        } catch (error: any) {
            Logger.fgterror('❌ Container Manager initialization failed:' + error);
            CoreNotificationUtils.error('Failed to initialize extension', this.namespace);
        }
    }

    /**
     * Initialize component instances
     */
    initializeComponents() {
        this.containerUI = new ContainerUI(this.namespace);
        this.tableRenderer = new TableRenderer(this.namespace);
        this.tableEvents = new TableEvents(this.namespace);
        this.interactionHandler = new CoreInteractionUtils(this.namespace);
        this.operationVerifier = new OperationVerifier(this.namespace);

        // Initialize lock and depth styles
        CoreDOMUtils.initLockStyles();
        CoreDOMUtils.initDepthStyles();

        Logger.fgtlog('🔧 Components initialized');
    }

    /**
     * Setup the complete UI
     */
    async setupUI() {
        // Create container UI
        await this.containerUI.createContainer();
        this.customContainer = this.containerUI.getContainer();

        // Create floating toggle buttons (both main and completed)
        this.containerUI.createToggleButtons();
        this.toggleButton = this.containerUI.getToggleIndicator();
        this.completedToggleButton = this.containerUI.getCompletedToggleIndicator();

        // Apply loaded state to UI
        if (this.isCustomUIVisible) {
            this.hideOriginalDOM();
            if (this.customContainer) {
                this.customContainer.style.display = 'block';
            }
            // Show completed toggle button
            this.containerUI.showCompletedToggleButton();
        } else {
            this.showOriginalDOM();
            if (this.customContainer) {
                this.customContainer.style.display = 'none';
            }
            // Hide completed toggle button (not needed in Original UI)
            this.containerUI.hideCompletedToggleButton();
        }

        // Update toggle button states
        this.containerUI.updateToggleButton(this.isCustomUIVisible);
        this.containerUI.updateCompletedToggleButton(this.showCompleted);

        // Attach container events
        this.attachContainerEvents();

        Logger.fgtlog('🎨 UI setup complete');
    }

    /**
     * Hide original Google Tasks DOM
     */
    hideOriginalDOM() {
        document.body.childNodes.forEach((child) => {
            if (child.nodeType === Node.ELEMENT_NODE &&
                (child as Element).id !== this.CONTAINER_ID &&
                (child as Element).id !== `${this.namespace}-toggle-button` &&
                (child as Element).id !== `${this.namespace}-completed-toggle-button`) {

                const computedZIndex = CoreDOMUtils.getComputedStyle((child as Element), 'z-index');
                this.originalZIndexes.set(child as Element, computedZIndex === 'auto' ? null : computedZIndex);
                (child as HTMLElement).style.zIndex = '-1';
            }
        });

        Logger.fgtlog('👁️ Original DOM hidden');
    }

    /**
     * Show original Google Tasks DOM
     */
    showOriginalDOM() {
        this.originalZIndexes.forEach((originalZIndex, element) => {
            if (originalZIndex !== null) {
                (element as HTMLElement).style.zIndex = originalZIndex;
            } else {
                (element as HTMLElement).style.removeProperty('z-index');
            }
        });
        this.originalZIndexes.clear();

        Logger.fgtlog('👁️ Original DOM restored');
    }

    /**
     * Attach container-level event listeners
     */
    attachContainerEvents() {
        if (!this.customContainer) return;

        // Table action events
        const cleanup1 = CoreEventUtils.addListener(
            this.customContainer,
            'tableAction',
            this.handleTableAction.bind(this)
        );

        // Table data change events
        const cleanup2 = CoreEventUtils.addListener(
            this.customContainer,
            'tableDataChange',
            CoreEventUtils.debounce(this.handleTableDataChange.bind(this), 500)
        );

        // Main toggle button events
        if (this.toggleButton) {
            const cleanup3 = CoreEventUtils.addListener(
                this.toggleButton,
                'click',
                this.toggleCustomUI.bind(this)
            );
            this.cleanupFunctions.push(cleanup3);
        }

        // Completed toggle button events
        if (this.completedToggleButton) {
            const cleanup4 = CoreEventUtils.addListener(
                this.completedToggleButton,
                'click',
                this.toggleCompletedTasks.bind(this)
            );
            this.cleanupFunctions.push(cleanup4);
        }

        this.cleanupFunctions.push(cleanup1, cleanup2);
        Logger.fgtlog('⚡ Container events attached');
    }

    /**
     * Toggle completed tasks visibility
     */
    toggleCompletedTasks() {
        this.showCompleted = !this.showCompleted;

        // Update button appearance
        this.containerUI.updateCompletedToggleButton(this.showCompleted);

        // Re-render table with new filter and depth adjustment
        this.updateDisplay();

        // Save state to storage
        this.saveStateToStorage();

        // Show notification
        CoreNotificationUtils.success(
            `${this.showCompleted ? 'Showing' : 'Hiding'} completed tasks`,
            this.namespace
        );

        Logger.fgtlog(`📋 Completed tasks toggled: ${this.showCompleted ? 'visible' : 'hidden'}`);
    }

    /**
     * Handle table actions (from table events)
     * @param event - Table action event
     */
    handleTableAction(event: CustomEvent) {
        const { action, taskId } = event.detail;

        Logger.fgtlog(`🎯 Table action received: ${action} for task ${taskId}`);

        switch (action) {
            case 'date':
            case 'assignee':
                // Open unified task modal for editing
                this.showTaskModal(taskId, 'edit');
                break;
            case 'delete':
                this.showDeleteModal(taskId);
                break;
            default:
                Logger.fgtwarn('Unknown table action:' + action);
        }
    }

    /**
     * Handle table data change
     */
    handleTableDataChange() {
        Logger.fgtlog('📊 Table data changed, refreshing...');
        CoreEventUtils.timeouts.create(() => {
            this.extractAndDisplayTasks();
        }, 1000);
    }

    /**
     * Extract and display tasks
     */
    extractAndDisplayTasks() {
        try {
            // Extract task data from original DOM
            const extractedData = this.extractTaskData();
            this.tasks = extractedData.tasks;
            this.maxCategoryDepth = extractedData.maxCategoryDepth;

            // Initialize change detector on first run
            if (!this.changeDetector) {
                this.changeDetector = TaskChangeDetector.create(this.namespace);
                Logger.fgtlog('🔍 Change detector initialized after DOM ready');
            } else {
                // Update change detector with current state
                this.changeDetector.updateTaskData();
            }

            // Update container content
            this.updateDisplay();

            Logger.fgtlog(`📊 Extracted ${this.tasks.size} tasks with max category depth: ${this.maxCategoryDepth}`);

        } catch (error: any) {
            Logger.fgterror('❌ Failed to extract tasks:' + error);
            CoreNotificationUtils.error('Failed to load tasks', this.namespace);
        }
    }

    /**
     * Extract task data from original DOM
     * REFACTORED: Now uses OgtFinder instead of querySelectorAll
     */
    extractTaskData() {
        const tasks = new Map();
        let maxCategoryDepth = 0;

        // Use manipulator to find all task elements
        const taskElements = OgtFinder.findAllTaskElements();
        Logger.fgtlog(`🔎 Found ${taskElements.length} task elements via manipulator`);

        taskElements.forEach((taskElement: OgtTaskElement, index: number) => {
            try {
                const task = this.parseTaskElement(taskElement, index);
                if (task) {
                    tasks.set(task.id, task);
                    maxCategoryDepth = Math.max(maxCategoryDepth, task.categories.length);
                }
            } catch (error: any) {
                Logger.fgtwarn('Failed to parse task element:' + error);
            }
        });

        return { tasks, maxCategoryDepth };
    }

    /**
     * Parse individual task element
     * REFACTORED: Now uses OgtTaskElement methods instead of querySelector
     * 
     * @param taskElement - Task element wrapper (not raw element!)
     * @param index - Index position
     */
    parseTaskElement(taskElement: OgtTaskElement, index: number) {
        const taskId = taskElement.taskId;
        if (!taskId) {
            Logger.fgtwarn(`Task at index ${index} has no ID, skipping`);
            return null;
        }

        // Extract title using wrapper
        const titleWrapper = taskElement.findTitleWrapper();
        if (!titleWrapper) {
            Logger.fgtwarn(`Task ${taskId} has no title wrapper, skipping`);
            return null;
        }

        const titleViewer = titleWrapper.findTitleViewer();
        if (!titleViewer) {
            Logger.fgtwarn(`Task ${taskId} has no title viewer, skipping`);
            return null;
        }

        const rawTitle = titleViewer.text;
        const { categories, cleanTitle } = CategoryParser.parseTaskTitle(rawTitle);

        // Extract description
        const descWrapper = taskElement.findDescWrapper();
        const descViewer = descWrapper?.findDescViewer();
        let description = descViewer?.text || '';
        if (description == descWrapper?.placeholder) {
            description = '';
        }

        // Extract completion status
        const completeCheckbox = taskElement.findCompleteCheckbox();
        const isCompleted = completeCheckbox ? completeCheckbox.complete : false;

        // Extract date
        const dateButton = taskElement.findDateButton();
        const dateFull = dateButton?.fullLabel || null;
        const date = dateButton?.text || '';

        // Extract assignee
        const assigneeButton = taskElement.findAssigneeButton();
        let assignee = null;
        let assigneeTitle = null;
        let assigneeIcon = null;
        let assigneeColors = null;

        if (assigneeButton) {
            const assigneeText = assigneeButton.findAssigneeText();
            if (assigneeText) {
                assignee = assigneeText.text;
                assigneeTitle = assigneeText.title;

                const assigneeImage = assigneeButton.findAssigneeImage();
                if (assigneeImage) {
                    assigneeIcon = assigneeImage.cssURL;
                }
            }
        }

        const taskData = {
            id: taskId,
            originalTitle: rawTitle,
            displayTitle: cleanTitle,
            description,
            categories,
            isCompleted,
            dateFull,
            date,
            assignee,
            assigneeTitle,
            assigneeIcon,
            assigneeColors
        };

        // Load assignee colors asynchronously
        if (assigneeIcon && singletonAssigneeColorUtils) {
            singletonAssigneeColorUtils.getAssigneeColors(assigneeIcon, assignee as string)
                .then((colors: any) => {
                    taskData.assigneeColors = colors;
                    this.updateAssigneeColors(taskId, colors);
                })
                .catch((error: any) => {
                    Logger.fgtwarn(`Failed to load colors for ${assignee}:` + error);
                });
        }

        return taskData;
    }

    /**
     * Update assignee colors for a specific task
     * @param taskId - Task ID
     * @param colors - Color data
     */
    updateAssigneeColors(taskId: string, colors: any) {
        try {
            const cell = document.querySelector(`[data-task-id="${taskId}"] .${this.namespace}-assignee-cell`);
            const assigneeButton = cell?.querySelector(`.${this.namespace}-assignee-button`);

            if (assigneeButton && singletonAssigneeColorUtils) {
                singletonAssigneeColorUtils.applyColorsToElement(assigneeButton, colors);
                Logger.fgtlog(`🎨 Applied colors to assignee button for task: ${taskId}`);
            }
        } catch (error: any) {
            Logger.fgtwarn(`⚠️ Failed to update assignee colors for task ${taskId}:` + error);
        }
    }

    /**
     * Update the display with current task data
     */
    updateDisplay() {
        if (!this.customContainer) return;

        const tableContainer = this.customContainer.querySelector(`.${this.namespace}-table-container`);
        if (!tableContainer) return;

        // Get filtered tasks and calculate max depth for visible items
        const { tasks: filteredTasks, maxDepth } = this.getFilteredTasks();

        // Update depth visibility
        if (this.showCompleted) {
            // Show all depths when completed tasks are visible
            CoreDOMUtils.showAllDepths();
        } else {
            // Hide depths beyond what's needed for incomplete tasks
            CoreDOMUtils.hideDepthsAbove(maxDepth - 1); // Convert to 0-based
        }

        Logger.fgtlog(`📏 Max visible depth: ${maxDepth} (showCompleted: ${this.showCompleted})`);

        // Always re-render for completed tasks toggle to handle rowspan properly
        this.renderFullTable(tableContainer, filteredTasks);
    }

    /**
     * Render full table (with completed tasks filter applied)
     * @param tableContainer - Table container element
     * @param filteredTasks - Filtered tasks map
     */
    renderFullTable(tableContainer: Element, filteredTasks: Map<string, any>) {
        // Render table with filtered tasks
        if (this.tableRenderer) {
            const tableHTML = this.tableRenderer.renderTable(
                filteredTasks,
                this.maxCategoryDepth,
                this.tasks  // Pass original tasks for statistics
            );
            tableContainer.innerHTML = tableHTML;
        }

        // Initialize table events
        this.tableEvents.initialize(tableContainer, this.interactionHandler);

        Logger.fgtlog(`🆕 Table rendered with ${filteredTasks.size} tasks (showCompleted: ${this.showCompleted})`);
    }

    /**
     * Get filtered tasks based on showCompleted flag
     * @returns Filtered tasks and max depth
     */
    getFilteredTasks() {
        if (this.showCompleted) {
            // Show all tasks
            return {
                tasks: this.tasks,
                maxDepth: this.maxCategoryDepth
            };
        } else {
            // Filter out completed tasks
            const incompleteTasks = new Map();
            let maxDepth = 0;

            this.tasks.forEach((task, taskId) => {
                if (!task.isCompleted) {
                    incompleteTasks.set(taskId, task);
                    maxDepth = Math.max(maxDepth, task.categories.length);
                }
            });

            return {
                tasks: incompleteTasks,
                maxDepth: maxDepth
            };
        }
    }

    /**
     * Toggle between custom and original UI
     */
    toggleCustomUI() {
        this.isCustomUIVisible = !this.isCustomUIVisible;

        if (this.isCustomUIVisible) {
            // Switch to fancy UI

            // Render if not rendered yet
            if (this.tasks.size === 0) {
                Logger.fgtlog('🆕 First time rendering fancy UI');
                this.extractAndDisplayTasks();
            } else {
                // Check for changes if already rendered
                const hasChanges = this.detectAndUpdateChanges();
                if (hasChanges) {
                    Logger.fgtlog('🔄 Changes detected during mode switch, data refreshed');
                }
            }

            this.hideOriginalDOM();
            if (this.customContainer) {
                this.customContainer.style.display = 'block';
            }

            // Show completed toggle button
            this.containerUI.showCompletedToggleButton();
        } else {
            // Switch to original UI
            this.showOriginalDOM();
            if (this.customContainer) {
                this.customContainer.style.display = 'none';
            }

            // Hide completed toggle button (not needed in Original UI)
            this.containerUI.hideCompletedToggleButton();

            Logger.fgtlog('💡 Switched to original UI - change detection will run on next fancy UI switch');
        }

        // Update toggle button appearance
        this.containerUI.updateToggleButton(this.isCustomUIVisible);

        // Save state to storage
        this.saveStateToStorage();

        // Show notification
        CoreNotificationUtils.success(
            `Switched to ${this.isCustomUIVisible ? 'Fancy' : 'Original'} UI`,
            this.namespace
        );

        Logger.fgtlog(`🔄 UI toggled to: ${this.isCustomUIVisible ? 'Fancy' : 'Original'}`);
    }

    /**
     * Detect changes and update if necessary
     * @returns Whether changes were detected and applied
     */
    detectAndUpdateChanges() {
        if (!this.changeDetector) {
            Logger.fgtwarn('⚠️ Change detector not available');
            return false;
        }

        try {
            const recommendation = this.changeDetector.checkAndRecommendAction();

            if (recommendation.needsAction) {
                const { actionType, detectionResult } = recommendation;

                Logger.fgtlog(`🔍 Change detection: ${detectionResult.message}`);

                if (actionType === 'full_refresh') {
                    this.extractAndDisplayTasks();
                    this.changeDetector.applyChanges(detectionResult);
                    CoreNotificationUtils.info('Data refreshed due to changes', this.namespace);
                    return true;

                } else if (actionType === 'incremental_update') {
                    this.extractAndDisplayTasks();
                    this.changeDetector.applyChanges(detectionResult);
                    CoreNotificationUtils.info('Data updated', this.namespace);
                    return true;
                }
            } else {
                Logger.fgtlog('✅ No changes detected');
                return false;
            }
        } catch (error: any) {
            Logger.fgterror('❌ Error during change detection:' + error);
            this.extractAndDisplayTasks();
            if (this.changeDetector) {
                this.changeDetector.forceRefresh();
            }
            return true;
        }

        return false;
    }

    /**
     * Start observing DOM changes
     */
    startObserving() {
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver(
            CoreEventUtils.debounce((mutations: any) => {
                this.handleDOMChanges(mutations);
            }, 2000)
        );

        const taskContainers = document.querySelectorAll('[role="list"]');

        if (taskContainers.length === 0) {
            Logger.fgterror('❌ No task containers found - cannot start observing');
            return;
        }

        Logger.fgtlog(`👁️ Found ${taskContainers.length} task containers to observe`);

        taskContainers.forEach((container, index) => {
            Logger.fgtlog(`👁️ Setting up observer for container ${index + 1}`);
            this.observer!.observe(container, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['aria-pressed', 'data-id', 'data-type'],
                characterData: true
            });
        });

        const focusCleanup = CoreEventUtils.addListener(window, 'focus',
            CoreEventUtils.debounce(() => {
                this.handleWindowFocus();
            }, 1000)
        );
        this.cleanupFunctions.push(focusCleanup);

        Logger.fgtlog('👁️ Enhanced DOM observer started for all task containers');
    }

    /**
     * Handle DOM changes
     * @param mutations - DOM mutations
     */
    handleDOMChanges(_mutations: MutationRecord[]) {
        // Skip DOM updates if operation is in progress
        if (this.operationVerifier && this.operationVerifier.isOperationInProgress()) {
            Logger.fgtlog('⏸️ Skipping DOM update - operation in progress');
            return;
        }

        Logger.fgtlog(`🔄 DOM changes detected (${_mutations.length} mutations)`);

        if (this.changeDetector) {
            const recommendation = this.changeDetector.checkAndRecommendAction();

            if (recommendation.needsAction) {
                Logger.fgtlog(`🔍 Background change detection: ${recommendation.detectionResult.message}`);

                if (this.isCustomUIVisible) {
                    this.applyDetectedChanges(recommendation);
                } else {
                    Logger.fgtlog('⏭️ Skipping update - Original UI is currently visible');
                }
            }
        }
    }

    /**
     * Handle window focus event
     */
    handleWindowFocus() {
        Logger.fgtlog('🔍 Window focused, checking for changes...');

        if (this.isCustomUIVisible && this.changeDetector) {
            const recommendation = this.changeDetector.checkAndRecommendAction();

            if (recommendation.needsAction) {
                this.applyDetectedChanges(recommendation);
            }
        }
    }

    /**
     * Apply detected changes based on recommendation
     * @param recommendation - Change recommendation from detector
     */
    applyDetectedChanges(recommendation: any) {
        const { actionType, detectionResult } = recommendation;

        if (actionType === 'full_refresh') {
            this.extractAndDisplayTasks();
            this.changeDetector.applyChanges(detectionResult);
            Logger.fgtlog('🔄 Tasks refreshed');
        } else if (actionType === 'incremental_update') {
            this.extractAndDisplayTasks();
            this.changeDetector.applyChanges(detectionResult);
            Logger.fgtlog('🔄 Tasks updated');
        }
    }

    /**
     * Stop observing DOM changes
     */
    stopObserving() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
            Logger.fgtlog('👁️ DOM observer stopped');
        }
    }

    /**
     * Show unified task modal
     * @param taskId - Task ID (empty for new at top)
     * @param actionType - Action type: 'edit', 'newAtTop', 'newAtAfter', 'newAtBefore'
     */
    showTaskModal(taskId: string = '', actionType: string = 'edit') {
        // Check if modal is already showing
        if (this.isShowingTaskModal) {
            Logger.fgtlog('⏸️ Ignoring duplicate task modal request - modal already showing');
            return;
        }

        // Check if operation is in progress
        if (this.operationVerifier && this.operationVerifier.isOperationInProgress()) {
            Logger.fgtlog('⏸️ Ignoring task modal request - operation in progress');
            return;
        }

        // Set flag to prevent duplicate modal calls
        this.isShowingTaskModal = true;

        // Get task data if taskId is provided
        let taskData = null;
        if (taskId && taskId !== '') {
            taskData = this.tasks.get(taskId);
            if (!taskData) {
                Logger.fgtwarn(`⚠️ Task not found: ${taskId}`);
                this.isShowingTaskModal = false;
                return;
            }
        }

        // Extract all existing categories for suggestions
        const allCategories: any[] = [];
        this.tasks.forEach(task => {
            if (task.categories && task.categories.length > 0) {
                allCategories.push(task.categories);
            }
        });

        // Show TaskModal
        TaskModal.show({
            taskId: taskId,
            actionType: actionType,
            taskData: taskData,
            interactionHandler: this.interactionHandler,
            allCategories: allCategories,
            namespace: this.namespace,
            onConfirm: (resultData: any) => {
                // Clear modal flag
                this.isShowingTaskModal = false;
                
                Logger.fgtlog('✅ Task modal confirmed:' + resultData);
                // TODO: Implement actual task creation/update logic
            },
            onCancel: () => {
                // Clear modal flag
                this.isShowingTaskModal = false;
                Logger.fgtlog('🚫 Task modal cancelled');
            }
        });
    }

    /**
     * Show delete modal with operation verification
     * @param taskId - Task ID to delete
     */
    showDeleteModal(taskId: string) {
        // Check if modal is already showing
        if (this.isShowingDeleteModal) {
            Logger.fgtlog('⏸️ Ignoring duplicate delete - modal already showing');
            return;
        }

        // Check if operation is in progress
        if (this.operationVerifier && this.operationVerifier.isOperationInProgress()) {
            Logger.fgtlog('⏸️ Ignoring duplicate delete - operation in progress');
            return;
        }

        // Set flag to prevent duplicate modal calls
        this.isShowingDeleteModal = true;

        const task = this.tasks.get(taskId);
        const taskTitle = task ? task.displayTitle : `task ${taskId}`;

        // Show DeleteModal with both confirm and cancel callbacks
        DeleteModal.show(
            taskId,
            taskTitle,
            this.namespace,
            (confirmedTaskId: string) => {
                // User confirmed deletion
                Logger.fgtlog(`🗑️ User confirmed deletion for task: ${confirmedTaskId}`);

                // Clear modal flag
                this.isShowingDeleteModal = false;

                // Lock UI and start delete operation with verification
                this.operationVerifier.lockAndVerify(
                    // Operation function
                    () => {
                        return new Promise((resolve, _reject) => {
                            this.interactionHandler.deleteTask(confirmedTaskId, resolve);
                        });
                    },
                    // Verification function
                    OperationVerifier.waitForTaskDelete(confirmedTaskId),
                    // Options
                    {
                        timeout: 5000,
                        lockMessage: 'Deleting task...',
                        successMessage: 'Task deleted successfully',
                        errorMessage: 'Failed to delete task',
                        targetContainer: this.customContainer
                    }
                ).then(() => {
                    // Refresh data after successful deletion
                    Logger.fgtlog('✅ Task deletion completed and verified');
                    this.extractAndDisplayTasks();
                }).catch((error: any) => {
                    Logger.fgterror('❌ Task deletion failed:' + error);
                    // Still refresh in case of partial changes
                    this.extractAndDisplayTasks();
                });
            },
            () => {
                // User cancelled or closed modal
                Logger.fgtlog('🗑️ Delete cancelled by user');
                this.isShowingDeleteModal = false;
            }
        );
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.stopObserving();
        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.cleanupFunctions = [];

        if (this.tableEvents) {
            this.tableEvents.destroy();
        }

        if (this.containerUI) {
            this.containerUI.destroy();
        }

        if (this.changeDetector) {
            this.changeDetector.reset();
            this.changeDetector = null;
        }

        if (this.operationVerifier) {
            this.operationVerifier.cleanup();
            this.operationVerifier = null;
        }

        if (this.interactionHandler) {
            this.interactionHandler.cleanup();
            this.interactionHandler = null;
        }

        this.showOriginalDOM();

        if (this.customContainer && this.customContainer.parentNode) {
            this.customContainer.parentNode.removeChild(this.customContainer);
        }

        // Cleanup lock and depth styles
        CoreDOMUtils.cleanupLockStyles();
        CoreDOMUtils.cleanupDepthStyles();

        // Cleanup all timers
        CoreEventUtils.cleanupAll();

        this.isInitialized = false;
        this.tasks.clear();

        Logger.fgtlog('🧹 Container Manager destroyed');
    }
}

export { ContainerManager };

// Export to global scope
declare global {
    interface Window {
        fancyGSTManager?: ContainerManager;
    }
}

// Auto-initialize when this script loads
if (typeof window !== 'undefined' && window.location && window.location.href.includes('tasks.google.com')) {
    if (!window.fancyGSTManager) {
        Logger.fgtlog('🚀 Auto-initializing Container Manager...');

        const autoInit = () => {
            const manager = new ContainerManager();
            manager.initialize();
            window.fancyGSTManager = manager;
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', autoInit);
        } else {
            CoreEventUtils.timeouts.create(autoInit, 100);
        }
    }
}

Logger.fgtlog('✅ Container Manager loaded successfully');