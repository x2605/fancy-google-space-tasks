// core/ts - Logging wrapper for controlling debugging environment.
// FGTDEBUG is replaced at build time via esbuild's define option
// Development builds: FGTDEBUG = true
// Release builds: FGTDEBUG = false
declare const FGTDEBUG: boolean;

export const fgtdebug = typeof FGTDEBUG !== 'undefined' ? FGTDEBUG : true;

/**
 * Get elapsed time since script load in seconds with millisecond precision
 * @returns Time string in format "123.456s"
 */
function getElapsedTime(): string {
    const ms = performance.now();
    const seconds = (ms / 1000).toFixed(3);
    return `${seconds}s`;
}

export function fgtlog(str: string): void {
    if (fgtdebug) {
        console.log(`[${getElapsedTime()}] ${str}`);
    }
}

export function fgtwarn(str: string): void {
    console.warn(`[${getElapsedTime()}] ${str}`);
}

export function fgterror(str: string): void {
    console.error(`[${getElapsedTime()}] ${str}`);
}
