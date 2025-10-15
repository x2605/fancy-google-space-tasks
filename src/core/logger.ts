// core/ts - Logging wrapper for controlling debugging environment.
// FGTDEBUG is replaced at build time via esbuild's define option
// Development builds: FGTDEBUG = true
// Release builds: FGTDEBUG = false
declare const FGTDEBUG: boolean;

export const fgtdebug = typeof FGTDEBUG !== 'undefined' ? FGTDEBUG : true;

export function fgtlog(str: string): void {
    if (fgtdebug) {
        console.log(str);
    }
}

export function fgtwarn(str: string): void {
    console.warn(str);
}

export function fgterror(str: string): void {
    console.error(str);
}
