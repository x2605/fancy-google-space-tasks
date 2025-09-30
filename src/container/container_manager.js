// container/container_manager.js - Main container management with optimized initialization
console.log('📋 Container Manager loading...');

/**
 * Main container management for the entire extension
 * Handles everything outside the fancy-gst-tasks-table block
 */
class ContainerManager {
    constructor(namespace = 'fancy-gst') {
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
     * @returns {string} - Space ID or 'personal'
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
        console.log(`💾 Storage key initialized: ${this.storageKey}`);
    }

    /**
     * Load state from storage.session
     * @returns {Promise<Object>} - Loaded state or defaults
     */
    async loadStateFromStorage() {
        try {
            if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.session) {
                console.warn('⚠️ chrome.storage.session not available, using defaults');
                return {
                    isCustomUIVisible: true,
                    showCompleted: false
                };
            }

            const result = await chrome.storage.session.get(this.storageKey);
            const savedState = result[this.storageKey];

            if (savedState) {
                console.log(`✅ State loaded from storage for ${this.spaceId}:`, savedState);
                return savedState;
            } else {
                console.log(`ℹ️ No saved state for ${this.spaceId}, using defaults`);
                return {
                    isCustomUIVisible: true,
                    showCompleted: false
                };
            }
        } catch (error) {
            console.error('❌ Failed to load state from storage:', error);
            return {
                isCustomUIVisible: true,
                showCompleted: false
            };
        }
    }

    /**
     * Save state to storage.session
     */
    async saveStateToStorage() {
        try {
            if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.session) {
                console.warn('⚠️ chrome.storage.session not available, state not saved');
                return;
            }

            const state = {
                isCustomUIVisible: this.isCustomUIVisible,
                showCompleted: this.showCompleted
            };

            await chrome.storage.session.set({
                [this.storageKey]: state
            });

            console.log(`💾 State saved to storage for ${this.spaceId}:`, state);
        } catch (error) {
            console.error('❌ Failed to save state to storage:', error);
        }
    }

    /**
     * Initialize the container manager
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('⚠️ Container Manager already initialized');
            return;
        }

        console.log('🚀 Container Manager initializing...');

        try {
            // Initialize storage key for current space
            this.initializeStorageKey();

            // Load saved state from storage
            const savedState = await this.loadStateFromStorage();
            this.isCustomUIVisible = savedState.isCustomUIVisible;
            this.showCompleted = savedState.showCompleted;
            console.log(`📊 Initial state: customUI=${this.isCustomUIVisible}, showCompleted=${this.showCompleted}`);

            // Wait for required modules
            await this.waitForDependencies();

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
                console.log('⏭️ Skipping initial render (Original UI mode)');
            }

            // Start change detection
            this.startObserving();

            this.isInitialized = true;
            console.log('✅ Container Manager initialized successfully');

        } catch (error) {
            console.error('❌ Container Manager initialization failed:', error);
            CoreNotificationUtils.error('Failed to initialize extension', this.namespace);
        }
    }

    /**
     * Wait for required dependencies
     */
    async waitForDependencies() {
        let attempts = 0;
        const maxAttempts = 50;

        while (attempts < maxAttempts) {
            if (window.CoreDOMUtils &&
                window.CoreInteractionUtils &&
                window.CoreNotificationUtils &&
                window.CoreEventUtils &&
                window.ContainerUI &&
                window.TableRenderer &&
                window.TableEvents &&
                window.CategoryParser &&
                window.TaskIdUtils &&
                window.TaskChangeDetector &&
                window.OperationVerifier) {
                console.log('✅ All dependencies loaded');
                return;
            }

            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        throw new Error('Required dependencies not loaded within timeout');
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
        
        console.log('🔧 Components initialized');
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

        console.log('🎨 UI setup complete');
    }

    /**
     * Hide original Google Tasks DOM
     */
    hideOriginalDOM() {
        document.body.childNodes.forEach((child) => {
            if (child.nodeType === Node.ELEMENT_NODE &&
                child.id !== this.CONTAINER_ID &&
                child.id !== `${this.namespace}-toggle-button` &&
                child.id !== `${this.namespace}-completed-toggle-button`) {

                const computedZIndex = CoreDOMUtils.getComputedStyle(child, 'z-index');
                this.originalZIndexes.set(child, computedZIndex === 'auto' ? null : computedZIndex);
                child.style.zIndex = '-1';
            }
        });

        console.log('👁️ Original DOM hidden');
    }

    /**
     * Show original Google Tasks DOM
     */
    showOriginalDOM() {
        this.originalZIndexes.forEach((originalZIndex, element) => {
            if (originalZIndex !== null) {
                element.style.zIndex = originalZIndex;
            } else {
                element.style.removeProperty('z-index');
            }
        });
        this.originalZIndexes.clear();

        console.log('👁️ Original DOM restored');
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
        console.log('⚡ Container events attached');
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

        console.log(`📋 Completed tasks toggled: ${this.showCompleted ? 'visible' : 'hidden'}`);
    }

    /**
     * Handle table actions (from table events)
     * @param {CustomEvent} event - Table action event
     */
    handleTableAction(event) {
        const { action, taskId } = event.detail;
        
        console.log(`🎯 Table action received: ${action} for task ${taskId}`);

        switch (action) {
            case 'date':
                this.showDateModal(taskId);
                break;
            case 'assignee':
                this.showAssigneeModal(taskId);
                break;
            case 'delete':
                this.showDeleteModal(taskId);
                break;
            default:
                console.warn('Unknown table action:', action);
        }
    }

    /**
     * Handle table data change
     */
    handleTableDataChange() {
        console.log('📊 Table data changed, refreshing...');
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
                console.log('🔍 Change detector initialized after DOM ready');
            } else {
                // Update change detector with current state
                this.changeDetector.updateTaskData();
            }

            // Update container content
            this.updateDisplay();

            console.log(`📊 Extracted ${this.tasks.size} tasks with max category depth: ${this.maxCategoryDepth}`);

        } catch (error) {
            console.error('❌ Failed to extract tasks:', error);
            CoreNotificationUtils.error('Failed to load tasks', this.namespace);
        }
    }

    /**
     * Extract task data from original DOM
     */
    extractTaskData() {
        const tasks = new Map();
        let maxCategoryDepth = 0;

        // Find task elements in original DOM
        const taskElements = document.querySelectorAll('[role="listitem"][data-id][data-type="0"]');
        console.log(`🔍 Found ${taskElements.length} task elements in DOM`);

        taskElements.forEach((element, index) => {
            try {
                const task = this.parseTaskElement(element, index);
                if (task) {
                    tasks.set(task.id, task);
                    maxCategoryDepth = Math.max(maxCategoryDepth, task.categories.length);
                }
            } catch (error) {
                console.warn('Failed to parse task element:', error);
            }
        });

        return { tasks, maxCategoryDepth };
    }

    /**
     * Parse individual task element
     * @param {Element} element - Task element
     * @param {number} fallbackIndex - Fallback index for ID
     * @returns {Object|null} - Parsed task data
     */
    parseTaskElement(element, fallbackIndex) {
        // Extract task ID
        const taskId = element.getAttribute('data-id') || `task-${fallbackIndex}`;

        // Extract title
        const titleElement = element.querySelector('[data-max-length]:not([data-multiline])');
        const rawTitle = titleElement?.querySelector('[jsname][title]')?.textContent?.trim() || 
                        titleElement?.textContent?.trim() || 'Untitled Task';

        // Parse categories and clean title
        const { categories, cleanTitle } = CategoryParser.parseTaskTitle(rawTitle);

        // Extract description
        const descElement = element.querySelector('[data-multiline][data-max-length]');
        const descPlaceHolder = descElement?.getAttribute('data-placeholder') || '';
        let description = descElement?.querySelector('[jsname][title]')?.textContent?.trim() || 
                           descElement?.textContent?.trim() || '';
        if (description == descPlaceHolder) {
            description = '';
        }

        // Extract completion status
        const checkboxElement = element.querySelector('button[aria-pressed]');
        const isCompleted = checkboxElement?.getAttribute('aria-pressed') === 'true';

        // Extract date
        const dateElement = element.querySelector('[role="button"][data-first-date-el]');
        const dateFull = dateElement?.getAttribute('aria-label') || '';
        const date = dateElement?.textContent?.trim() || '';

        // Extract assignee
        const assigneeElement = element.querySelector('[role="button"][aria-disabled]:not([data-first-date-el])');
        let assignee = '';
        let assigneeTitle = '';
        let assigneeIcon = '';
        let assigneeColors = null;

        if (assigneeElement) {
            const spanWithTitle = assigneeElement.querySelector('span[title]');
            assignee = spanWithTitle?.textContent?.trim() || '😶';
            assigneeTitle = spanWithTitle?.getAttribute('title') || 'assign';
            
            const imgElement = assigneeElement.querySelector('div[style*="background-image"]');
            if (imgElement) {
                assigneeIcon = imgElement.style.backgroundImage || 
                              `url(${imgElement.src})` || '';
            }
        }

        console.log(`🔍 Parsed task: ${taskId} - "${cleanTitle}" (${categories.length} categories) (date: ${date}) (assignee: ${assignee}) (completed: ${isCompleted})`);

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
        if (assigneeIcon && window.assigneeColorUtils) {
            window.assigneeColorUtils.getAssigneeColors(assigneeIcon, assignee)
                .then(colors => {
                    taskData.assigneeColors = colors;
                    this.updateAssigneeColors(taskId, colors);
                })
                .catch(error => {
                    console.warn(`Failed to load colors for ${assignee}:`, error);
                });
        }

        return taskData;
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
        
        console.log(`🔍 Max visible depth: ${maxDepth} (showCompleted: ${this.showCompleted})`);
        
        // Always re-render for completed tasks toggle to handle rowspan properly
        this.renderFullTable(tableContainer, filteredTasks);
    }

    /**
     * Render full table (with completed tasks filter applied)
     * @param {Element} tableContainer - Table container element
     * @param {Map} filteredTasks - Filtered tasks to display
     */
    renderFullTable(tableContainer, filteredTasks) {
        // Pass both filtered tasks (for display) and all tasks (for statistics)
        const tableHTML = this.tableRenderer.renderTable(
            filteredTasks, 
            this.maxCategoryDepth,
            this.tasks  // Pass original tasks for statistics
        );
        
        tableContainer.innerHTML = tableHTML;

        // Initialize table events
        this.tableEvents.initialize(tableContainer, this.interactionHandler);
        
        console.log(`🆕 Table rendered with ${filteredTasks.size} tasks (showCompleted: ${this.showCompleted})`);
    }

    /**
     * Get filtered tasks based on showCompleted setting and calculate max depth
     * @returns {Object} - { tasks: Map, maxDepth: number }
     */
    getFilteredTasks() {
        if (this.showCompleted) {
            // Show all tasks - use original max depth
            return { tasks: this.tasks, maxDepth: this.maxCategoryDepth };
        }

        // Filter out completed tasks and calculate max depth of visible items
        const filteredTasks = new Map();
        let maxDepth = 0;
        
        this.tasks.forEach((task, taskId) => {
            if (!task.isCompleted) {
                filteredTasks.set(taskId, task);
                // Update max depth based on visible tasks only
                maxDepth = Math.max(maxDepth, task.categories.length);
            }
        });

        return { tasks: filteredTasks, maxDepth };
    }

    /**
     * Update assignee colors for a specific task
     * @param {string} taskId - Task ID
     * @param {Object} colors - Color object from AssigneeColorUtils
     */
    updateAssigneeColors(taskId, colors) {
        try {
            const existingTable = document.querySelector(`#${this.namespace}-tasks-table`);
            if (!existingTable) return;

            const assigneeButton = existingTable.querySelector(`[data-task-id="${taskId}"].fgt-assignee`);
            if (assigneeButton && window.assigneeColorUtils) {
                window.assigneeColorUtils.applyColorsToElement(assigneeButton, colors);
                console.log(`🎨 Applied colors to assignee button for task: ${taskId}`);
            }
        } catch (error) {
            console.warn(`⚠️ Failed to update assignee colors for task ${taskId}:`, error);
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
                console.log('🆕 First time rendering fancy UI');
                this.extractAndDisplayTasks();
            } else {
                // Check for changes if already rendered
                const hasChanges = this.detectAndUpdateChanges();
                if (hasChanges) {
                    console.log('🔄 Changes detected during mode switch, data refreshed');
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
            
            console.log('💡 Switched to original UI - change detection will run on next fancy UI switch');
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

        console.log(`🔄 UI toggled to: ${this.isCustomUIVisible ? 'Fancy' : 'Original'}`);
    }
    
    /**
     * Detect changes and update if necessary
     * @returns {boolean} - Whether changes were detected and applied
     */
    detectAndUpdateChanges() {
        if (!this.changeDetector) {
            console.warn('⚠️ Change detector not available');
            return false;
        }

        try {
            const recommendation = this.changeDetector.checkAndRecommendAction();
            
            if (recommendation.needsAction) {
                const { actionType, detectionResult } = recommendation;
                
                console.log(`🔍 Change detection: ${detectionResult.message}`);
                
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
                console.log('✅ No changes detected');
                return false;
            }
        } catch (error) {
            console.error('❌ Error during change detection:', error);
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
            CoreEventUtils.debounce((mutations) => {
                this.handleDOMChanges(mutations);
            }, 2000)
        );

        const taskContainers = document.querySelectorAll('[role="list"]');
        
        if (taskContainers.length === 0) {
            console.error('❌ No task containers found - cannot start observing');
            return;
        }

        console.log(`👁️ Found ${taskContainers.length} task containers to observe`);
        
        taskContainers.forEach((container, index) => {
            console.log(`👁️ Setting up observer for container ${index + 1}`);
            this.observer.observe(container, {
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

        console.log('👁️ Enhanced DOM observer started for all task containers');
    }

    /**
     * Handle DOM changes
     * @param {MutationRecord[]} mutations - DOM mutations
     */
    handleDOMChanges(mutations) {
        // Skip DOM updates if operation is in progress
        if (this.operationVerifier && this.operationVerifier.isOperationInProgress()) {
            console.log('⏸️ Skipping DOM update - operation in progress');
            return;
        }
        
        console.log(`🔄 DOM changes detected (${mutations.length} mutations)`);
        
        if (this.changeDetector) {
            const recommendation = this.changeDetector.checkAndRecommendAction();
            
            if (recommendation.needsAction) {
                console.log(`🔍 Background change detection: ${recommendation.detectionResult.message}`);
                
                if (this.isCustomUIVisible) {
                    this.applyDetectedChanges(recommendation);
                } else {
                    console.log('🔍 Changes detected in background (original mode)');
                }
            }
        }
        
        // Legacy fallback for obvious changes
        let shouldUpdate = false;
        
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                const hasTaskChanges = Array.from(mutation.addedNodes).some(node => 
                    node.nodeType === Node.ELEMENT_NODE && 
                    (node.matches && node.matches('[role="listitem"][data-id]') || 
                     node.querySelector && node.querySelector('[role="listitem"][data-id]'))
                ) || Array.from(mutation.removedNodes).some(node =>
                    node.nodeType === Node.ELEMENT_NODE && 
                    (node.matches && node.matches('[role="listitem"][data-id]') ||
                     node.querySelector && node.querySelector('[role="listitem"][data-id]'))
                );
                
                if (hasTaskChanges) {
                    shouldUpdate = true;
                    break;
                }
            }
            
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'aria-pressed' &&
                mutation.target.matches && 
                mutation.target.matches('button[aria-pressed]')) {
                shouldUpdate = true;
                break;
            }
        }
        
        if (shouldUpdate && this.isCustomUIVisible) {
            console.log('🔄 Applying legacy DOM change update');
            this.extractAndDisplayTasks();
        }
    }

    /**
     * Handle window focus events
     */
    handleWindowFocus() {
        console.log('👁️ Window focus detected - checking for background changes');
        
        if (this.isCustomUIVisible && this.changeDetector) {
            const recommendation = this.changeDetector.checkAndRecommendAction();
            if (recommendation.needsAction) {
                console.log('🔄 Background sync changes detected');
                this.applyDetectedChanges(recommendation);
            }
        }
    }

    /**
     * Apply detected changes based on recommendation
     * @param {Object} recommendation - Change recommendation from detector
     */
    applyDetectedChanges(recommendation) {
        const { actionType, detectionResult } = recommendation;
        
        if (actionType === 'full_refresh') {
            this.extractAndDisplayTasks();
            this.changeDetector.applyChanges(detectionResult);
            console.log('🔄 Tasks refreshed');
        } else if (actionType === 'incremental_update') {
            this.extractAndDisplayTasks();
            this.changeDetector.applyChanges(detectionResult);
            console.log('🔄 Tasks updated');
        }
    }

    /**
     * Stop observing DOM changes
     */
    stopObserving() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
            console.log('👁️ DOM observer stopped');
        }
    }

    /**
     * Show modal dialogs
     */
    showAddTaskModal() {
        CoreNotificationUtils.info('Add task modal - coming soon', this.namespace);
    }

    showDateModal(taskId) {
        CoreNotificationUtils.info(`Date modal for task ${taskId} - coming soon`, this.namespace);
    }

    showAssigneeModal(taskId) {
        CoreNotificationUtils.info(`Assignee modal for task ${taskId} - coming soon`, this.namespace);
    }

    /**
     * Show delete modal with operation verification
     * @param {string} taskId - Task ID to delete
     */
    showDeleteModal(taskId) {
        // Check if modal is already showing
        if (this.isShowingDeleteModal) {
            console.log('⏸️ Ignoring duplicate delete - modal already showing');
            return;
        }
        
        // Check if operation is in progress
        if (this.operationVerifier && this.operationVerifier.isOperationInProgress()) {
            console.log('⏸️ Ignoring duplicate delete - operation in progress');
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
            (confirmedTaskId) => {
                // User confirmed deletion
                console.log(`🗑️ User confirmed deletion for task: ${confirmedTaskId}`);
                
                // Clear modal flag
                this.isShowingDeleteModal = false;
                
                // Lock UI and start delete operation with verification
                this.operationVerifier.lockAndVerify(
                    // Operation function
                    () => {
                        return new Promise((resolve, reject) => {
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
                    console.log('✅ Task deletion completed and verified');
                    this.extractAndDisplayTasks();
                }).catch((error) => {
                    console.error('❌ Task deletion failed:', error);
                    // Still refresh in case of partial changes
                    this.extractAndDisplayTasks();
                });
            },
            () => {
                // User cancelled or closed modal
                console.log('🗑️ Delete cancelled by user');
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

        console.log('🧹 Container Manager destroyed');
    }
}

// Export to global scope
window.ContainerManager = ContainerManager;

// Auto-initialize when this script loads
if (typeof window !== 'undefined' && window.location && window.location.href.includes('tasks.google.com')) {
    if (!window.fancyGSTManager) {
        console.log('🚀 Auto-initializing Container Manager...');

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

console.log('✅ Enhanced Container Manager loaded successfully with optimized initialization');