// core/change_detector.js - Task change detection system with migrated timer management
fgtlog('🔍 Change Detector loading...');

/**
 * Task change detection system for monitoring DOM updates
 */
class TaskChangeDetector {
    constructor(namespace = 'fancy-gst') {
        this.namespace = namespace;

        // Stored references and data
        this.savedDOMRefs = {
            taskContainer: null,
            lastValidContainer: null
        };

        this.lastTaskData = new Map(); // taskId -> lightweight data
        this.lastTaskIds = new Set();
        this.lastCheckTime = Date.now();

        // Configuration
        this.config = {
            forceRefreshThreshold: 10000, // 10 seconds - force refresh if too much time passed
            maxTaskDifference: 50, // If more than 50 tasks changed, force full refresh
        };

        // Timer tracking
        this.activeTimers = {
            timeouts: [],
            intervals: []
        };
    }

    /**
     * Initialize change detector
     */
    initialize() {
        this.updateDOMReferences();
        this.updateTaskData();
        fgtlog('🔍 Change detector initialized');
    }

    /**
     * Update DOM references to current state
     */
    updateDOMReferences() {
        const taskContainer = TaskIdUtils.findTaskContainer();

        if (taskContainer) {
            this.savedDOMRefs.taskContainer = taskContainer;
            this.savedDOMRefs.lastValidContainer = taskContainer;
            fgtlog('📌 DOM references updated');
        } else {
            fgterror('📌 Could not find task containers - page not ready or corrupted');
            // Don't set references if containers don't exist
        }
    }

    /**
     * Update stored task data to current state
     */
    updateTaskData() {
        try {
            const currentTaskData = TaskIdUtils.extractAllLightweightTaskData();
            const currentTaskIds = new Set(currentTaskData.keys());

            this.lastTaskData = currentTaskData;
            this.lastTaskIds = currentTaskIds;
            this.lastCheckTime = Date.now();

            fgtlog(`📊 Task data updated: ${currentTaskIds.size} tasks`);
        } catch (error) {
            fgtwarn('📊 Could not update task data yet:', error.message);
            // Initialize with empty data for now
            this.lastTaskData = new Map();
            this.lastTaskIds = new Set();
            this.lastCheckTime = Date.now();
        }
    }

    /**
     * Check for changes since last update
     * @returns {Object} - Change detection result
     */
    detectChanges() {
        const result = {
            hasChanges: false,
            changeType: 'none',
            changes: null,
            domValid: true,
            shouldForceRefresh: false,
            message: 'No changes detected'
        };

        try {
            // 1. Check if enough time has passed to force refresh
            const timeSinceLastCheck = Date.now() - this.lastCheckTime;
            if (timeSinceLastCheck > this.config.forceRefreshThreshold) {
                result.shouldForceRefresh = true;
                result.changeType = 'timeout';
                result.message = `Force refresh due to time threshold (${timeSinceLastCheck}ms)`;
                return result;
            }

            // 2. Check DOM validity
            if (!this.isDOMValid()) {
                result.domValid = false;
                result.shouldForceRefresh = true;
                result.changeType = 'dom_invalid';
                result.message = 'DOM structure changed or became invalid';

                // Try to find new container
                this.updateDOMReferences();
                return result;
            }

            // 3. Extract current task data
            const currentTaskData = TaskIdUtils.extractAllLightweightTaskData();

            // 4. Compare with stored data
            const changes = TaskIdUtils.detectChanges(this.lastTaskData, currentTaskData);

            if (changes.hasChanges) {
                result.hasChanges = true;
                result.changes = changes;

                // Check if changes are too extensive (force full refresh)
                const totalChanges = changes.added.length + changes.removed.length + changes.modified.length;
                if (totalChanges > this.config.maxTaskDifference) {
                    result.shouldForceRefresh = true;
                    result.changeType = 'extensive_changes';
                    result.message = `Extensive changes detected (${totalChanges} tasks)`;
                } else {
                    result.changeType = 'incremental_changes';
                    result.message = `Incremental changes: +${changes.added.length}, -${changes.removed.length}, ~${changes.modified.length}`;
                }
            }

            return result;

        } catch (error) {
            fgterror('❌ Error during change detection:', error);
            result.shouldForceRefresh = true;
            result.changeType = 'error';
            result.message = `Detection error: ${error.message}`;
            return result;
        }
    }

    /**
     * Apply detected changes and update stored data
     * @param {Object} detectionResult - Result from detectChanges()
     */
    applyChanges(detectionResult) {
        if (detectionResult.shouldForceRefresh || !detectionResult.domValid) {
            // Update everything
            this.updateDOMReferences();
            this.updateTaskData();
        } else if (detectionResult.hasChanges) {
            // Update only what changed
            this.updateTaskData();
        }

        fgtlog(`🔄 Changes applied: ${detectionResult.message}`);
    }

    /**
     * Check if DOM is still valid
     * @returns {boolean} - Is DOM valid
     */
    isDOMValid() {
        return TaskIdUtils.isDOMValid(this.savedDOMRefs.taskContainer);
    }

    /**
     * Perform a manual check and return if action is needed
     * @returns {Object} - Action recommendation
     */
    checkAndRecommendAction() {
        const detectionResult = this.detectChanges();

        const recommendation = {
            needsAction: false,
            actionType: 'none',
            detectionResult: detectionResult
        };

        if (detectionResult.shouldForceRefresh) {
            recommendation.needsAction = true;
            recommendation.actionType = 'full_refresh';
        } else if (detectionResult.hasChanges) {
            recommendation.needsAction = true;
            recommendation.actionType = 'incremental_update';
        }

        return recommendation;
    }

    /**
     * Force a complete refresh of stored data
     */
    forceRefresh() {
        fgtlog('🔄 Forcing complete refresh...');
        this.updateDOMReferences();
        this.updateTaskData();
    }

    /**
     * Get current statistics
     * @returns {Object} - Current statistics
     */
    getStatistics() {
        return {
            taskCount: this.lastTaskIds.size,
            lastCheckTime: this.lastCheckTime,
            timeSinceLastCheck: Date.now() - this.lastCheckTime,
            domValid: this.isDOMValid(),
            containerFound: !!this.savedDOMRefs.taskContainer,
            activeTimeouts: this.activeTimers.timeouts.length,
            activeIntervals: this.activeTimers.intervals.length
        };
    }

    /**
     * Reset change detector (useful when switching modes)
     */
    reset() {
        this.lastTaskData.clear();
        this.lastTaskIds.clear();
        this.savedDOMRefs.taskContainer = null;
        this.lastCheckTime = 0;

        // Cleanup all timers using CoreEventUtils
        this.activeTimers.timeouts.forEach(id => {
            CoreEventUtils.timeouts.clear(id);
        });
        this.activeTimers.intervals.forEach(id => {
            CoreEventUtils.intervals.clear(id);
        });

        this.activeTimers.timeouts = [];
        this.activeTimers.intervals = [];

        fgtlog('🔄 Change detector reset');
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.reset();
        fgtlog('🧹 Change detector cleaned up');
    }

    /**
     * Create a change detector instance and initialize it
     * @param {string} namespace - CSS namespace
     * @returns {TaskChangeDetector} - Initialized detector
     */
    static create(namespace = 'fancy-gst') {
        const detector = new TaskChangeDetector(namespace);
        detector.initialize();
        return detector;
    }
}

// Export to global scope
window.TaskChangeDetector = TaskChangeDetector;

fgtlog('✅ Change Detector loaded successfully with timer management');