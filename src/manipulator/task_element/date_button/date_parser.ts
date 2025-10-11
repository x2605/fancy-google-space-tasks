// manipulator/task_element/date_button/date_parser.ts
/**
 * Date Parser for Google Tasks Natural Language Dates
 * 
 * This module parses date strings from Google Tasks UI into Date objects.
 * It uses CLDR data (loaded via dynamic_lang/*.js files) to handle multiple languages.
 * 
 * Supported formats:
 * - Special keywords: "today", "tomorrow", "yesterday"
 * - Relative dates: "2 days ago", "1 week ago"
 * - Absolute dates: "2026년 1월 1일", "January 1, 2026"
 * - With time: "오후 3:30", "3:30 PM", "15:30"
 */

interface LocaleKeywords {
    locale: string;
    today: string | null;
    tomorrow: string | null;
    yesterday: string | null;
    day: string | null;
    week: string | null;
    meridiem: {
        am: string | null;
        pm: string | null;
    };
    usesLatinNumbers: boolean;
    numberingDigits: string | null;
    dateFormats: {
        short: string;
        medium: string;
    } | null;
    timeFormats: {
        short: string;
    } | null;
    months: {
        wide: string[];
        abbreviated: string[] | null;
    } | null;
}

/**
 * Main parsing function
 * Converts natural language date string to Date object
 * 
 * @param text - Date string from Google Tasks (e.g., "2026년 1월 1일", "2 days ago")
 * @param locale - Language code (e.g., "ko", "en", "ja")
 * @returns Parsed Date object or null if parsing fails
 */
export function parseNaturalDate(text: string, locale: string): Date | null {
    // Get locale-specific keywords from dynamically loaded CLDR data
    const keywords = getLocaleKeywords(locale);
    if (!keywords) {
        console.warn(`[DateParser] No keywords found for locale: ${locale}`);
        return null;
    }

    // Normalize text: convert local digits to latin numbers
    const normalizedText = normalizeNumbers(text, keywords);

    // Step 1: Check special keywords (today, tomorrow, yesterday)
    const specialDate = parseSpecialKeywords(normalizedText, keywords);
    if (specialDate) {
        return applyTimeIfPresent(specialDate, normalizedText, keywords);
    }

    // Step 2: Check relative dates (n days/weeks ago)
    const relativeDate = parseRelativeDate(normalizedText, keywords);
    if (relativeDate) {
        // Relative dates in the past don't have time in Google Tasks
        return relativeDate;
    }

    // Step 3: Parse absolute dates
    const absoluteDate = parseAbsoluteDate(normalizedText, keywords);
    if (absoluteDate) {
        return applyTimeIfPresent(absoluteDate, normalizedText, keywords);
    }

    console.warn(`[DateParser] Failed to parse: "${text}" (locale: ${locale})`);
    return null;
}

/**
 * Get locale keywords from window.FGT_DATE_KEYWORDS
 * This data is loaded from dynamic_lang/*.js files at runtime
 */
function getLocaleKeywords(locale: string): LocaleKeywords | null {
    if (typeof window === 'undefined' || !window.FGT_GET_LOCALE_KEYWORDS) {
        return null;
    }
    return window.FGT_GET_LOCALE_KEYWORDS(locale);
}

/**
 * Convert local digit characters to latin numbers
 * Example: Bengali "০১২" → "012"
 */
function normalizeNumbers(text: string, keywords: LocaleKeywords): string {
    if (keywords.usesLatinNumbers || !keywords.numberingDigits) {
        return text;
    }

    let normalized = text;
    for (let i = 0; i < 10; i++) {
        const localDigit = keywords.numberingDigits[i];
        const regex = new RegExp(localDigit, 'g');
        normalized = normalized.replace(regex, i.toString());
    }
    return normalized;
}

/**
 * Parse special keywords: today, tomorrow, yesterday
 */
function parseSpecialKeywords(text: string, keywords: LocaleKeywords): Date | null {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight

    if (keywords.today && text.includes(keywords.today)) {
        return today;
    }

    if (keywords.tomorrow && text.includes(keywords.tomorrow)) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
    }

    if (keywords.yesterday && text.includes(keywords.yesterday)) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday;
    }

    return null;
}

/**
 * Parse relative dates: "2 days ago", "1 week ago"
 * Note: Google Tasks doesn't show time for past relative dates
 */
function parseRelativeDate(text: string, keywords: LocaleKeywords): Date | null {
    // Extract number from text (should be normalized to latin digits)
    const numberMatch = text.match(/\d+/);
    if (!numberMatch) {
        return null;
    }
    const count = parseInt(numberMatch[0], 10);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for "day" keyword
    if (keywords.day && text.includes(keywords.day)) {
        const result = new Date(today);
        result.setDate(result.getDate() - count);
        return result;
    }

    // Check for "week" keyword
    if (keywords.week && text.includes(keywords.week)) {
        const result = new Date(today);
        result.setDate(result.getDate() - (count * 7));
        return result;
    }

    return null;
}

/**
 * Parse absolute dates using dateFormats patterns
 * Examples: "2026년 1월 1일" (ko), "January 1, 2026" (en), "1/15/26" (en-short)
 */
function parseAbsoluteDate(text: string, keywords: LocaleKeywords): Date | null {
    if (!keywords.dateFormats) {
        return null;
    }

    // Try both short and medium formats
    const formats = [keywords.dateFormats.short, keywords.dateFormats.medium];

    for (const format of formats) {
        if (!format) continue;

        const parsed = tryParseWithFormat(text, format, keywords);
        if (parsed) {
            return parsed;
        }
    }

    return null;
}

/**
 * Try to parse date string using a specific format pattern
 * Format patterns use CLDR symbols: y=year, M=month, d=day
 */
function tryParseWithFormat(text: string, format: string, keywords: LocaleKeywords): Date | null {
    // Parse the format pattern to understand date element order and separators
    const patternInfo = analyzePattern(format);
    
    // Extract date components from text based on pattern
    const components = extractDateComponents(text, patternInfo, keywords);
    if (!components) {
        return null;
    }

    // Validate and create Date object
    const { year, month, day } = components;
    if (year === null || month === null || day === null) {
        return null;
    }

    // Handle 2-digit years (yy format)
    let fullYear = year;
    if (year < 100) {
        // Assume 20xx for years 00-49, 19xx for 50-99
        fullYear = year < 50 ? 2000 + year : 1900 + year;
    }

    // Month is 0-indexed in JavaScript Date
    const date = new Date(fullYear, month - 1, day);
    
    // Validate the date is real (e.g., not Feb 30)
    if (date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null;
    }

    return date;
}

/**
 * Analyze format pattern to extract element order and separators
 * Example: "yy. M. d." → {elements: ["yy", "M", "d"], separators: [". ", ". "]}
 */
function analyzePattern(format: string): { elements: string[], separators: string[] } {
    const elements: string[] = [];
    const separators: string[] = [];
    
    // Pattern tokens: y (year), M (month), d (day)
    const tokenRegex = /([yMd]+)/g;
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(format)) !== null) {
        // Extract separator before this token
        if (match.index > lastIndex) {
            separators.push(format.substring(lastIndex, match.index));
        }
        
        elements.push(match[0]);
        lastIndex = match.index + match[0].length;
    }

    // Extract trailing separator if exists
    if (lastIndex < format.length) {
        separators.push(format.substring(lastIndex));
    }

    return { elements, separators };
}

/**
 * Extract year, month, day from text based on pattern analysis
 */
function extractDateComponents(
    text: string,
    patternInfo: { elements: string[], separators: string[] },
    keywords: LocaleKeywords
): { year: number | null, month: number | null, day: number | null } | null {
    const result = {
        year: null as number | null,
        month: null as number | null,
        day: null as number | null
    };

    // Split text by separators (handle various separator patterns)
    const parts = splitByMultipleSeparators(text, patternInfo.separators);
    
    if (parts.length < patternInfo.elements.length) {
        return null;
    }

    // Map each part to corresponding date element
    for (let i = 0; i < patternInfo.elements.length; i++) {
        const element = patternInfo.elements[i];
        const value = parts[i].trim();

        if (element.startsWith('y')) {
            // Year
            const yearNum = parseInt(value, 10);
            if (!isNaN(yearNum)) {
                result.year = yearNum;
            }
        } else if (element.startsWith('M')) {
            // Month - can be number or name
            if (element.length >= 3 && keywords.months) {
                // Month name (MMM or MMMM)
                result.month = findMonthByName(value, keywords);
            } else {
                // Month number
                const monthNum = parseInt(value, 10);
                if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
                    result.month = monthNum;
                }
            }
        } else if (element.startsWith('d')) {
            // Day
            const dayNum = parseInt(value, 10);
            if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
                result.day = dayNum;
            }
        }
    }

    return result;
}

/**
 * Split text by multiple possible separators
 */
function splitByMultipleSeparators(text: string, separators: string[]): string[] {
    if (separators.length === 0) {
        return [text];
    }

    // Build regex pattern from all separators, escaping special chars
    const escapedSeparators = separators.map(sep => 
        sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const pattern = escapedSeparators.join('|');
    const regex = new RegExp(pattern);

    return text.split(regex).filter(part => part.length > 0);
}

/**
 * Find month number by matching month name (wide or abbreviated)
 */
function findMonthByName(name: string, keywords: LocaleKeywords): number | null {
    if (!keywords.months) {
        return null;
    }

    const nameLower = name.toLowerCase();

    // Check wide names first
    for (let i = 0; i < keywords.months.wide.length; i++) {
        if (keywords.months.wide[i].toLowerCase() === nameLower) {
            return i + 1; // Month is 1-indexed
        }
    }

    // Check abbreviated names
    if (keywords.months.abbreviated) {
        for (let i = 0; i < keywords.months.abbreviated.length; i++) {
            if (keywords.months.abbreviated[i]?.toLowerCase() === nameLower) {
                return i + 1;
            }
        }
    }

    return null;
}

/**
 * Apply time to a date if time is present in the text
 * Time can be 12-hour (with AM/PM) or 24-hour format
 */
function applyTimeIfPresent(date: Date, text: string, keywords: LocaleKeywords): Date {
    if (!keywords.timeFormats) {
        return date;
    }

    const timeInfo = extractTime(text, keywords);
    if (!timeInfo) {
        return date;
    }

    const result = new Date(date);
    result.setHours(timeInfo.hours, timeInfo.minutes, 0, 0);
    return result;
}

/**
 * Extract time from text
 * Returns { hours, minutes } in 24-hour format
 */
function extractTime(text: string, keywords: LocaleKeywords): { hours: number, minutes: number } | null {
    if (!keywords.timeFormats?.short) {
        return null;
    }

    const format = keywords.timeFormats.short;
    
    // Determine time separator from format (: or .)
    const timeSeparator = format.includes('.') ? '\\.' : ':';
    
    // Detect if format uses 12-hour (h/K) or 24-hour (H/k)
    const uses12Hour = /[hK]/.test(format);
    
    // Extract time pattern (handles various formats)
    // Matches: "3:30", "15:30", "03:30", "3.30", etc.
    const timeRegex = new RegExp(`(\\d{1,2})${timeSeparator}(\\d{2})`);
    const timeMatch = text.match(timeRegex);
    
    if (!timeMatch) {
        return null;
    }

    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);

    if (isNaN(hours) || isNaN(minutes) || minutes > 59) {
        return null;
    }

    // Handle 12-hour format with AM/PM
    if (uses12Hour) {
        const isPM = detectMeridiem(text, keywords);
        
        if (isPM === true) {
            // PM: 12 stays 12, others add 12
            if (hours !== 12) {
                hours += 12;
            }
        } else if (isPM === false) {
            // AM: 12 becomes 0, others stay same
            if (hours === 12) {
                hours = 0;
            }
        }
        // If isPM is null (not detected), assume based on hour range
        else if (hours >= 1 && hours <= 11) {
            // Ambiguous: keep as-is for now
            // Could use heuristics here if needed
        }
    }

    return { hours, minutes };
}

/**
 * Detect if time has PM meridiem marker
 * Returns: true (PM), false (AM), null (not detected)
 */
function detectMeridiem(text: string, keywords: LocaleKeywords): boolean | null {
    if (!keywords.meridiem.am || !keywords.meridiem.pm) {
        return null;
    }

    // Check case-insensitive
    const textLower = text.toLowerCase();
    const amLower = keywords.meridiem.am.toLowerCase();
    const pmLower = keywords.meridiem.pm.toLowerCase();

    if (textLower.includes(pmLower)) {
        return true; // PM
    } else if (textLower.includes(amLower)) {
        return false; // AM
    }

    return null; // Not detected
}

// Type declaration for window globals
declare global {
    interface Window {
        FGT_DATE_KEYWORDS?: Record<string, LocaleKeywords>;
        FGT_GET_LOCALE_KEYWORDS?: (locale: string) => LocaleKeywords | null;
    }
}