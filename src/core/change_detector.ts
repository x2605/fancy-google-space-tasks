// core/change_detector.ts - Task change detection system with migrated timer management
import * as Logger from '@/core/logger';
import { CoreEventUtils } from './event_utils';
import { TaskIdUtils } from './task_id_utils';

Logger.fgtlog('🔍 Change Detector loading...');

/**
 * Task change detection system for monitoring DOM updates
 */
class TaskChangeDetector {
    namespace: string;
    savedDOMRefs: any;
    lastTaskData: Map<string, any>;
    lastTaskIds: Set<string>;
    lastCheckTime: number;
    config: any;
    activeTimers: any;

    constructor(namespace: string = 'fancy-gst') {
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
        Logger.fgtlog('🔍 Change detector initialized');
    }

    /**
     * Update DOM references to current state
     */
    updateDOMReferences() {
        const taskContainer = TaskIdUtils.findTaskContainer();

        if (taskContainer) {
            this.savedDOMRefs.taskContainer = taskContainer;
            this.savedDOMRefs.lastValidContainer = taskContainer;
            Logger.fgtlog('📌 DOM references updated');
        } else {
            Logger.fgterror('📌 Could not find task containers - page not ready or corrupted');
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

            Logger.fgtlog(`📊 Task data updated: ${currentTaskIds.size} tasks`);
        } catch (error: any) {
            Logger.fgtwarn('📊 Could not update task data yet:' + error.message);
            // Initialize with empty data for now
            this.lastTaskData = new Map();
            this.lastTaskIds = new Set();
            this.lastCheckTime = Date.now();
        }
    }

    /**
     * Check for changes since last update
     * @returns Change detection result
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
                result.changes = changes as any;

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

        } catch (error: any) {
            Logger.fgterror('❌ Error during change detection:' + error);
            result.shouldForceRefresh = true;
            result.changeType = 'error';
            result.message = `Detection error: ${error.message}`;
            return result;
        }
    }

    /**
     * Apply detected changes and update stored data
     * @param detectionResult - Result from detectChanges()
     */
    applyChanges(detectionResult: any) {
        if (detectionResult.shouldForceRefresh || !detectionResult.domValid) {
            // Update everything
            this.updateDOMReferences();
            this.updateTaskData();
        } else if (detectionResult.hasChanges) {
            // Update only what changed
            this.updateTaskData();
        }

        Logger.fgtlog(`🔄 Changes applied: ${detectionResult.message}`);
    }

    /**
     * Check if DOM is still valid
     * @returns Is DOM valid
     */
    isDOMValid() {
        return TaskIdUtils.isDOMValid(this.savedDOMRefs.taskContainer);
    }

    /**
     * Perform a manual check and return if action is needed
     * @returns Action recommendation
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
        Logger.fgtlog('🔄 Forcing complete refresh...');
        this.updateDOMReferences();
        this.updateTaskData();
    }

    /**
     * Get current statistics
     * @returns Current statistics
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
        this.activeTimers.timeouts.forEach((id: number) => {
            CoreEventUtils.timeouts.clear(id);
        });
        this.activeTimers.intervals.forEach((id: number) => {
            CoreEventUtils.intervals.clear(id);
        });

        this.activeTimers.timeouts = [];
        this.activeTimers.intervals = [];

        Logger.fgtlog('🔄 Change detector reset');
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.reset();
        Logger.fgtlog('🧹 Change detector cleaned up');
    }

    /**
     * Create a change detector instance and initialize it
     * @param namespace - CSS namespace
     * @returns Initialized detector
     */
    static create(namespace: string = 'fancy-gst') {
        const detector = new TaskChangeDetector(namespace);
        detector.initialize();
        return detector;
    }
}

export { TaskChangeDetector };

Logger.fgtlog('✅ Change Detector loaded successfully with timer management');