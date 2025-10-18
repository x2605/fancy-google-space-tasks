declare var process: {
    env: {
        APP_VERSION: string;
        [key: string]: string | undefined;
    };
};

// ============================================================
// Global Type Aliases - String-based types for better type safety
// ============================================================

// IDs and Identifiers
type TaskId = string;
type ContainerId = string;

// Names and Text Content
type AssigneeName = string;
type CategoryName = string;
type TaskTitle = string;
type TaskDescription = string;
type HtmlString = string;    // HTML markup as string

// URLs and Paths
type ImageUrl = string;
type Url = string;

// Colors
type HexColor = string;      // e.g. "#ffffff"
type RgbColor = string;      // e.g. "rgb(255, 255, 255)"
type CssColor = string;      // Any CSS color format (hex, rgb, rgba, named, etc.)

// Dates
type DateString = string;    // e.g. "2025-10-19"
type DateTimeString = string;

// CSS and DOM
type CssSelector = string;
type ClassName = string;
type CssUrl = string;        // e.g. "url(...)"

// Miscellaneous
type Hash = string;          // Hash values used for comparison (task_id_utils.ts)

// ============================================================
// Global Interfaces
// ============================================================

/**
 * Locale-specific keywords for date parsing
 * Used by the FGT date parser system
 */
interface LocaleKeywords {
    locale: string;
    today: string | null;
    tomorrow: string | null;
    yesterday: string | null;
    day: {
        singular: string | null;
        plural: string;
        usesArticle: boolean;
    };
    week: {
        singular: string | null;
        plural: string;
        usesArticle: boolean;
    };
    meridiem: {
        am: string;
        pm: string;
    } | null;
    usesLatinNumbers: boolean;
    numberingDigits: string | null;
    dateFormats: string;
    timeFormats: {
        short: string | null;
    } | null;
    timeSeparator: string;
    uses24Hour: boolean;
    months: {
        combined: string[];
    };
}

// ============================================================
// Window Interface Extension - Type-safe global variables
// ============================================================

declare global {
    interface Window {
        // External libraries (bundled via webpack)
        ColorThief: typeof ColorThief;
        linkifyStr: (text: string) => HtmlString;

        // FGT locale system (ALL_CAPS globals only)
        FGT_LOCALE?: string;
        FGT_DATE_KEYWORDS?: Record<string, LocaleKeywords>;
        FGT_GET_LOCALE_KEYWORDS?: (key: string) => LocaleKeywords | null;
    }

    /**
     * ColorThief class for extracting dominant colors from images
     * @see https://lokeshdhakar.com/projects/color-thief/
     */
    class ColorThief {
        /**
         * Get the dominant color from an image
         * @param img - HTML image element
         * @param quality - Quality setting (1 = highest, 10 = default)
         * @returns RGB array [r, g, b] or null if failed
         */
        getColor(img: HTMLImageElement, quality?: number): [number, number, number] | null;

        /**
         * Get a color palette from an image
         * @param img - HTML image element
         * @param colorCount - Number of colors to return (default: 10)
         * @param quality - Quality setting (1 = highest, 10 = default)
         * @returns Array of RGB arrays [[r, g, b], ...] or null if failed
         */
        getPalette(img: HTMLImageElement, colorCount?: number, quality?: number): [number, number, number][] | null;
    }
}

// Make this file a module so that 'declare global' works properly
export {};