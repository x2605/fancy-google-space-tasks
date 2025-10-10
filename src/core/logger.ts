// core/ts - Logging wrapper for controlling debugging environment.

export const fgtdebug = false;

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
