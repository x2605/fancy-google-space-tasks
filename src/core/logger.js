// core/logger.js - Logging wrapper for controlling debugging environment.

var fgtdebug = false;

var fgtlog = function (str) {
    if (fgtdebug) {
        console.log(str);
    }
}

var fgtwarn = function (str) {
    console.warn(str);
}

var fgterror = function (str) {
    console.error(str);
}