// main.ts - Entry point for the extension
// URL pattern guard: only load the extension on supported Google Tasks URLs

import * as Logger from '@/core/logger';

/**
 * Check if the current URL matches the supported patterns
 * Currently supported: https://tasks.google.com/embed/room/*
 *
 * @returns true if the URL is supported, false otherwise
 */
function isSupportedUrl(): boolean {
    const url = window.location.href;

    // Pattern 1: https://tasks.google.com/embed/room/{SPACE_ID}/...
    const roomPattern = /^https:\/\/tasks\.google\.com\/([\da-z]{1,3}\/){0,2}embed\/room\/.+/;

    if (roomPattern.test(url)) {
        Logger.fgtlog('✅ Supported URL pattern detected: embed/room/*');
        return true;
    }

    // Additional patterns can be added here in the future
    // Example:
    // const fullscreenPattern = /^https:\/\/tasks\.google\.com\/embed\/fullscreen.+/;
    // if (fullscreenPattern.test(url)) {
    //     Logger.fgtlog('✅ Supported URL pattern detected: embed/fullscreen');
    //     return true;
    // }

    Logger.fgtlog(`⏭️ Unsupported URL pattern: ${url} - Extension will not load`);
    return false;
}

/**
 * Dynamically load and initialize the container manager
 * Only called when the URL pattern is supported
 */
async function loadContainerManager() {
    try {
        Logger.fgtlog('📦 Loading container manager...');

        // Dynamic import to prevent loading when URL pattern is not matched
        const { ContainerManager } = await import('@/container/container_manager');

        Logger.fgtlog('🚀 Auto-initializing Container Manager...');

        const autoInit = () => {
            const manager = new ContainerManager();
            manager.initialize();
            window.fancyGSTManager = manager;
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', autoInit);
        } else {
            // Use a small timeout to ensure DOM is fully ready
            setTimeout(autoInit, 100);
        }

    } catch (error: any) {
        Logger.fgterror('❌ Failed to load container manager: ' + error.message);
    }
}

// Entry point - check URL and load extension if supported
if (typeof window !== 'undefined' && isSupportedUrl()) {
    if (!window.fancyGSTManager) {
        loadContainerManager();
    }
} else {
    Logger.fgtlog('⏹️ Extension not loaded - URL pattern not supported');
}

Logger.fgtlog('✅ Main entry point executed');
