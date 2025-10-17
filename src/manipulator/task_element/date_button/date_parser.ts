// manipulator/task_element/date_button/date_parser.ts
/**
 * ============================================================================
 * Date Parser for Google Tasks Natural Language Dates
 * ============================================================================
 * 
 * This parser extracts dates from Google Tasks date button text with extremely
 * high accuracy by processing TWO text sources simultaneously and cross-validating
 * them against each other.
 * 
 * CRITICAL: These comments document hard-won insights about Google Tasks behavior.
 * DO NOT DELETE OR MODIFY these comments without understanding the full context.
 * 
 * ============================================================================
 * GOOGLE TASKS DATE BUTTON BEHAVIOR - DUAL TEXT SOURCES
 * ============================================================================
 * 
 * Google Tasks provides TWO text fields for the same date:
 * 
 * 1. OgtDateButton.fullLabel (aria-label attribute)
 *    - Always contains COMPLETE date information including year
 *    - Example: "Scheduled for Thursday, January 1, 2026"
 *    - Example: "Scheduled for 3 days ago"
 *    - Contains the word "Scheduled" or localized equivalent
 * 
 * 2. OgtDateButton.text (visible text content)
 *    - Contains SHORT date, may omit year if current year
 *    - Example: "January 1" (year omitted because it's 2025)
 *    - Example: "January 1, 2026" (year included because it's not 2025)
 *    - Example: "3 days ago" (same as fullLabel for relative dates)
 * 
 * 3. When NO date is set:
 *    - fullLabel and text are IDENTICAL after whitespace normalization
 *    - Both show "Add date/time" or localized equivalent
 *    - We detect this and return null immediately
 * 
 * WHY TWO TEXTS MATTER - CROSS-VALIDATION:
 * ----------------------------------------
 * By processing both texts simultaneously, we can cross-validate patterns:
 * - If both texts show "no year, single number 2-6" → Definitely "days ago"
 * - If fullLabel has year "2025" but text doesn't → Absolute date (current year)
 * - If patterns don't match → Abnormal case, reject to avoid wrong parsing
 * 
 * This dual-text approach dramatically improves accuracy and catches edge cases.
 * 
 * ============================================================================
 * GOOGLE TASKS DATE EXPRESSION PATTERNS - THREE TIERS
 * ============================================================================
 * 
 * Google Tasks uses different patterns based on how far in the past a date is:
 * 
 * TIER 1: YESTERDAY (1 day ago)
 * ------------------------------
 * Special keyword: "Yesterday" / "어제" / etc.
 * Handled by: ROUTE C (Special Keywords)
 * Example: "Scheduled for Yesterday"
 * 
 * TIER 2: RECENT PAST (2-6 days ago)
 * -----------------------------------
 * Pattern: "N days ago" where N is in range [2, 6]
 * Handled by: ROUTE B (Relative Dates - Days Mode)
 * Examples:
 * - "Scheduled for 2 days ago" → 2일 전
 * - "Scheduled for 3 days ago" → 3일 전
 * - "Scheduled for 6 days ago" → 6일 전
 * 
 * CRITICAL INSIGHT: Google Tasks ALWAYS uses "days ago" for 2-6 days past.
 * It never uses "1 week ago" for 7 days. It switches from "6 days ago" 
 * directly to "1 week ago" (7 days).
 * 
 * Detection heuristic:
 * - No 4-digit year present (rules out absolute dates)
 * - Exactly ONE number present
 * - That number is in range [2, 6]
 * - Both fullLabel AND text must match this pattern (cross-validation)
 * - The word "day" or "days" MAY be present, but is NOT required
 *   (some locales omit it or use different forms)
 * 
 * Why this heuristic works:
 * - "January 3, 2025" has year "2025" → Not days ago
 * - "15 days ago" has number "15" outside [2, 6] → Would be "weeks ago" instead
 * - "2 days ago" has no year, number "2" in range → Days ago pattern!
 * 
 * TIER 3: DISTANT PAST (7+ days ago)
 * -----------------------------------
 * Pattern: "N weeks ago" where N ≥ 1
 * Handled by: ROUTE B (Relative Dates - Weeks Mode)
 * Examples:
 * - "Scheduled for 1 week ago" → 1주 전
 * - "Scheduled for 48 weeks ago" → 48주 전
 * - "Scheduled for 112 weeks ago" → 112주 전
 * 
 * Detection: Presence of "week" or "weeks" keyword in the text
 * 
 * ============================================================================
 * PARSING STRATEGY - THREE ROUTES WITH PRIORITY
 * ============================================================================
 * 
 * ROUTE SELECTION LOGIC (executed in this order):
 * 
 * 1. Check if date is set
 *    - If fullLabel == text (after normalization) → No date set, return null
 * 
 * 2. Check for "week" keyword
 *    - If found → ROUTE B (Weeks Mode)
 * 
 * 3. Check for "2-6 days ago" pattern
 *    - If detected → ROUTE B (Days Mode)
 * 
 * 4. Otherwise → ROUTE A (Absolute Dates)
 * 
 * 5. If ROUTE A fails → ROUTE C (Special Keywords: today, tomorrow, yesterday)
 * 
 * ROUTE A: ABSOLUTE DATES
 * -----------------------
 * Handles: "January 1, 2026", "2026년 1월 1일", "15/03/2028"
 * 
 * Process (sequential removal from BOTH texts simultaneously):
 * 1. Remove TIME from both texts (HH:MM + optional AM/PM)
 * 2. Remove YEAR from fullLabel (required) and text (optional)
 * 3. Remove MONTH from both texts
 * 4. Remove DAY from both texts
 * 5. VALIDATION: Check if any digits remain
 *    - If digits remain → PARSING FAILED (incomplete extraction)
 * 
 * Why this works:
 * - fullLabel always has complete info including year
 * - text may omit year if current year, but we extract from fullLabel
 * - By removing components sequentially, we can validate nothing is left over
 * 
 * ROUTE B: RELATIVE DATES (Days or Weeks)
 * ----------------------------------------
 * Handles: "2 days ago", "1 week ago", "48 weeks ago"
 * 
 * Process:
 * 1. Extract COUNT (the number before "days" or "weeks")
 * 2. Determine mode: days or weeks
 * 3. Calculate date: today - (COUNT * multiplier)
 *    - Days mode: multiplier = 1
 *    - Weeks mode: multiplier = 7
 * 4. VALIDATION: Check if any digits remain
 * 
 * Special handling:
 * - Days mode: "day" keyword is OPTIONAL (may be omitted in some locales)
 * - Weeks mode: "week" keyword is REQUIRED (used for route detection)
 * 
 * ROUTE C: SPECIAL KEYWORDS (Fallback)
 * -------------------------------------
 * Handles: "Today", "Tomorrow", "Yesterday"
 * 
 * Triggered only when:
 * - ROUTE A and ROUTE B both failed
 * - The failure was NOT due to remaining digits
 *   (if digits remain, it's a genuine parse error, not a special keyword case)
 * 
 * Process:
 * - Check for locale-specific keywords from JSON
 * - Support pipe-separated variants (e.g., "Yesterday|어제")
 * - Return calculated date (today, today+1, today-1)
 * 
 * ============================================================================
 * NUMBER NORMALIZATION - LATIN DIGITS AFTER PREPROCESSING
 * ============================================================================
 * 
 * Different locales use different number systems:
 * - Latin: 0123456789
 * - Bengali: ০১২৩৪৫৬৭৮৯
 * - Devanagari (Hindi): ०१२३४५६७८९
 * - Thai: ๐๑๒๓๔๕๖๗๘๙
 * 
 * TEXT PROCESSING FLOW:
 * 1. Input text: "সোমবার, ১৩ অক্টোবর, ২০২৫" (Bengali numbers)
 * 2. normalizeNumbers() converts to Latin: "সোমবার, 13 অক্টোবর, 2025"
 * 3. All parsing functions work on NORMALIZED text
 * 4. Therefore, ALL regex patterns use Latin digit patterns: [0-9], [1-9]
 * 
 * CRITICAL: After normalizeNumbers() is called, we ALWAYS use Latin digit patterns.
 * Do NOT use locale-specific digit patterns in parsing functions.
 * 
 * NUMBER PATTERNS (always Latin after normalization):
 * - Year: [1-9][0-9]{3}        (1000-9999, 4 digits)
 * - Day: 0?[1-9][0-9]?          (1-31, 1-2 digits, allows optional leading zero like "01")
 * - Count: [1-9][0-9]*          (1+, for relative dates)
 * 
 * ============================================================================
 * VALIDATION STRATEGY - REMAINING DIGITS CHECK
 * ============================================================================
 * 
 * After parsing date components, we validate that NO unexpected digits remain:
 * 
 * WHY: If we successfully extracted year/month/day, no digits should be left.
 * Remaining digits indicate incomplete parsing or wrong pattern match.
 * 
 * Examples:
 * - Input: "January 1, 2026"
 *   After extraction: "" (empty, all numbers used) → VALID ✓
 * 
 * - Input: "January 1, 2026, 2027" (abnormal)
 *   After extraction: "2027" (extra year!) → INVALID ✗
 * 
 * - Input: "3 days ago"
 *   After extraction: "days ago" (no digits) → VALID ✓
 * 
 * We check ONLY for digits, not for any remaining text. Words like "ago", "전",
 * "पहले" are allowed to remain. Only unparsed numbers indicate failure.
 * 
 * ============================================================================
 */

import * as Logger from '@/core/logger';

/**
 * Parsed date information structure
 */
export interface ParsedDateInfo {
    weekago: number;   // 0 = absolute date, 1+ = N weeks ago
    year: number;      // Real year if weekago=0, else 0
    month: number;     // Real month (1-12) if weekago=0, else 0
    day: number;       // Real day if weekago=0, else 0
    hours: number;     // 0-23 if time exists, else 99
    minutes: number;   // 0-59 if time exists, else 99
}

export interface LocaleKeywords {
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

/**
 * Load locale keywords from dynamic JSON file with fallback support
 * 
 * FALLBACK STRATEGY:
 * 1. Try the full locale code (e.g., "pt-BR", "zh-CN", "en-US")
 * 2. If not found, try the base locale (e.g., "pt", "zh", "en")
 * 3. If still not found, throw error
 * 
 * This allows regional variants to fall back to their base language:
 * - pt-BR (Brazilian Portuguese) → pt (Portuguese)
 * - zh-CN (Simplified Chinese) → zh (Chinese)
 * - en-US (US English) → en (English)
 */
export async function loadLocaleKeywords(locale: string): Promise<LocaleKeywords> {
    // Initialize FGT_LOCALE (can be changed in this block after)
    (window as any).FGT_LOCALE = locale;

    // Helper function to store keywords in global space
    const storeKeywords = (localeKey: string, keywords: LocaleKeywords) => {
        if (!(window as any).FGT_DATE_KEYWORDS) {
            (window as any).FGT_DATE_KEYWORDS = {} as Record<string, LocaleKeywords>;
        }
        
        ((window as any).FGT_DATE_KEYWORDS as Record<string, LocaleKeywords>)[localeKey] = keywords;
        
        // Set up the getter function if not exists
        if (!(window as any).FGT_GET_LOCALE_KEYWORDS) {
            (window as any).FGT_GET_LOCALE_KEYWORDS = (key: string): LocaleKeywords | null => {
                const allKeywords = (window as any).FGT_DATE_KEYWORDS as Record<string, LocaleKeywords> | undefined;
                return allKeywords?.[key] || null;
            };
        }
    };
    
    // STEP 1: Try loading the exact locale requested
    try {
        const url = chrome.runtime.getURL(`dynamic_lang/${locale}.json`);
        const response = await fetch(url);
        
        if (response.ok) {
            const keywords = await response.json() as LocaleKeywords;
            storeKeywords(locale, keywords);
            Logger.fgtlog(`✅ Loaded keywords for locale: ${locale}`);
            return keywords;
        }
    } catch (firstError) {
        // fetch failed (file not found, network error, etc.)
        // Continue to fallback logic below
        Logger.fgtlog(`[DateParser] Failed to load ${locale}.json, will try fallback if applicable`);
    }
    
    // STEP 2: If exact locale failed and it has a region code, try base locale
    if (locale.includes('-')) {
        const baseLocale = locale.split('-')[0];
        Logger.fgtlog(`[DateParser] Trying base locale: ${baseLocale}`);
        
        try {
            const baseUrl = chrome.runtime.getURL(`dynamic_lang/${baseLocale}.json`);
            const baseResponse = await fetch(baseUrl);
            
            if (baseResponse.ok) {
                const keywords = await baseResponse.json() as LocaleKeywords;
                
                // IMPORTANT: Store with ORIGINAL locale key (pt-BR, not pt)
                // so that future lookups with pt-BR will find it
                storeKeywords(locale, keywords);
                
                Logger.fgtlog(`✅ Loaded keywords for locale: ${locale} (using base locale: ${baseLocale})`);
                (window as any).FGT_LOCALE = baseLocale
                return keywords;
            }
        } catch (baseError) {
            // Base locale also failed
            Logger.fgterror(`❌ Base locale ${baseLocale} also failed`);
        }
    }
    
    // STEP 3: Both attempts failed
    const errorMsg = `Failed to load keywords for locale: ${locale}` + 
                     (locale.includes('-') ? ' (including base locale fallback)' : '');
    Logger.fgterror(`❌ ${errorMsg}`);
    throw new Error(errorMsg);
}

/**
 * Main entry point for parsing natural language dates
 * 
 * CRITICAL: Processes TWO texts simultaneously (fullLabel and text)
 * 
 * @param fullLabel - Full date text from aria-label (e.g., "Scheduled for Thursday, January 1, 2026")
 * @param text - Short date text from visible content (e.g., "January 1")
 * @param locale - Locale code (e.g., "en", "ko", "vi")
 * @returns Date object or null if parsing fails
 */
export function parseNaturalDate(fullLabel: string, text: string, locale: string): ParsedDateInfo | null {
    const keywords = getLocaleKeywords(locale);
    if (!keywords) {
        Logger.fgtwarn(`[DateParser] No keywords found for locale: ${locale}`);
        return null;
    }

    // Preprocess both texts: normalize numbers and clean
    let normalizedFullLabel = normalizeNumbers(fullLabel, keywords);
    let normalizedText = normalizeNumbers(text, keywords);
    normalizedFullLabel = preprocessText(normalizedFullLabel);
    normalizedText = preprocessText(normalizedText);

    // Vietnamese: Remove weekday prefix from abbreviated text
    // The "2" in "Th 2, " gets misread as a date number
    if (locale.startsWith('vi')) {
        normalizedText = removeVietnameseWeekdayPrefix(normalizedText);
    }

    // Check if date is set (fullLabel and text should differ when date is set)
    if (normalizedFullLabel === normalizedText) {
        return null; // No date set (both show "Add date/time")
    }

    // ROUTE SELECTION:
    // Priority 1: Check for "week" keyword → ROUTE B (Weeks Mode)
    const hasWeek = containsWeekKeyword(normalizedFullLabel, keywords) || 
                    containsWeekKeyword(normalizedText, keywords);
    
    if (hasWeek) {
        return parseRouteB_RelativeDates(normalizedFullLabel, normalizedText, keywords, fullLabel, 'week');
    }
    
    // Priority 2: Check for "2-6 days ago" pattern → ROUTE B (Days Mode)
    const hasRecentDays = detectRecentDayPattern(normalizedFullLabel, normalizedText);
    
    if (hasRecentDays) {
        return parseRouteB_RelativeDates(normalizedFullLabel, normalizedText, keywords, fullLabel, 'day');
    }
    
    // Priority 3: Try ROUTE A (Absolute Dates)
    const result = parseRouteA_AbsoluteDates(normalizedFullLabel, normalizedText, keywords, fullLabel, text);
    
    if (result) {
        return result;
    }
    
    // Priority 4: Fallback to ROUTE C (Special Keywords)
    return parseRouteC_SpecialKeywords(normalizedFullLabel, normalizedText, keywords);
}

/**
 * Get locale keywords from global storage
 */
export function getLocaleKeywords(locale: string): LocaleKeywords | null {
    if (typeof window === 'undefined') {
        return null;
    }
    
    const windowAny = window as any;
    if (!windowAny.FGT_GET_LOCALE_KEYWORDS) {
        return null;
    }
    
    const getterFunc = windowAny.FGT_GET_LOCALE_KEYWORDS as (locale: string) => LocaleKeywords | null;
    return getterFunc(locale);
}

/**
 * Detect "2-6 days ago" pattern with cross-validation
 * 
 * This pattern is unique to Google Tasks behavior:
 * - Used for 2-6 days in the past (not 1 day = "yesterday", not 7+ days = "weeks ago")
 * - No 4-digit year present (distinguishes from absolute dates like "January 3, 2025")
 * - Exactly ONE number present, in range [2, 6]
 * - BOTH fullLabel and text must match pattern (cross-validation for accuracy)
 * 
 * @param fullLabel - Normalized full label text
 * @param text - Normalized short text
 * @returns true if both texts match "2-6 days ago" pattern
 */
function detectRecentDayPattern(fullLabel: string, text: string): boolean {
    function checkSingleText(textToCheck: string): boolean {
        // STEP 1: Check for 4-digit year
        // Year pattern: [1-9][0-9]{3} (1000-9999)
        // If year exists, this is an absolute date, not "days ago"
        const hasYear = /[1-9][0-9]{3}/.test(textToCheck);
        
        if (hasYear) {
            return false; // Year present → absolute date
        }
        
        // STEP 2: Extract all numbers (1-2 digits typically)
        // Pattern: [0-9]+ (one or more consecutive digits)
        const allNumbers = textToCheck.match(/[0-9]+/g);
        
        if (!allNumbers || allNumbers.length !== 1) {
            return false; // Must have exactly 1 number
        }
        
        // STEP 3: Check if that single number is in [2, 6] range
        const singleNumber = parseInt(allNumbers[0], 10);
        return singleNumber >= 2 && singleNumber <= 6;
    }
    
    // CRITICAL: Cross-validation
    // Both fullLabel and text must match the pattern
    // This dramatically improves accuracy and catches abnormal cases
    const fullLabelMatches = checkSingleText(fullLabel);
    const textMatches = checkSingleText(text);
    
    return fullLabelMatches && textMatches;
}

/**
 * Check if text contains week keyword
 * 
 * CRITICAL FIX: Split pipe-separated variants before checking
 * This function was previously checking the entire pipe-separated string,
 * which would fail to match individual variants.
 * 
 * Example of the bug:
 *   keyword = "недели|недель" (Russian: "weeks" in different grammatical forms)
 *   text = "48 недель назад" (Russian: "48 weeks ago")
 *   textLower.includes("недели|недель") → false (pipe character not in text!)
 * 
 * After fix:
 *   Split to ["недели", "недель"]
 *   Check each variant individually
 *   "48 недель назад".includes("недель") → true ✓
 * 
 * This pattern matches other functions in the codebase:
 * - parseRouteC_SpecialKeywords() splits keywords.today/tomorrow/yesterday
 * - extractAndRemoveMonth() splits month name variants
 * - extractAndRemoveTime() splits meridiem variants
 */
function containsWeekKeyword(text: string, keywords: LocaleKeywords): boolean {
    if (!keywords.week) {
        return false;
    }
    
    const textLower = text.toLowerCase();
    
    // Check singular variants
    if (keywords.week.singular) {
        const singularVariants = keywords.week.singular.split('|');
        for (const variant of singularVariants) {
            // Match keyword with flexible boundaries:
            // Before keyword: start of string OR whitespace OR digit (allows "1주전")
            // After keyword: end of string OR whitespace
            // This prevents false positives like "понедельник" containing "недел"
            // while allowing both "1 주 전" (with spaces) and "1주전" (without spaces)
            const pattern = new RegExp(`(?:^|\\s|\\d)${escapeRegExp(variant.toLowerCase())}(?:$|\\s)`);
            if (pattern.test(textLower)) {
                return true;
            }
        }
    }
    
    // Check plural variants
    if (keywords.week.plural) {
        const pluralVariants = keywords.week.plural.split('|');
        for (const variant of pluralVariants) {
            const pattern = new RegExp(`(?:^|\\s|\\d)${escapeRegExp(variant.toLowerCase())}(?:$|\\s)`);
            if (pattern.test(textLower)) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize numbers from local digits to Latin digits
 * Example: Bengali "১২৩" → "123", Devanagari "१२३" → "123"
 */
export function normalizeNumbers(text: string, keywords: LocaleKeywords): string {
    if (keywords.usesLatinNumbers || !keywords.numberingDigits) {
        return text;
    }

    const digits = keywords.numberingDigits.split('|');
    
    let normalized = text;
    for (let i = 0; i < 10; i++) {
        if (digits[i]) {
            const localDigit = digits[i];
            const latinDigit = String(i);
            normalized = normalized.replace(new RegExp(localDigit, 'g'), latinDigit);
        }
    }
    
    return normalized;
}

/**
 * Preprocess text: normalize apostrophes, whitespace, and HTML entities
 * 
 * CRITICAL: 
 * - Normalize straight apostrophe (U+0027) to curly apostrophe (U+2019)
 *   This prevents mismatches like "Aujourd'hui" vs "Aujourd'hui"
 * - Normalize &nbsp; (non-breaking space HTML entity) to regular space
 *   This ensures proper keyword matching in texts like "1&nbsp;week ago"
 */
function preprocessText(text: string): string {
    // Normalize apostrophes: U+0027 (straight) → U+2019 (curly)
    let processed = text.replace(/\u0027/g, '\u2019');
    
    // Normalize &nbsp; HTML entity to regular space
    // This is critical for matching week keywords in locales like German, French, Russian
    // where Google Tasks uses &nbsp; between numbers and keywords
    processed = processed.replace(/&nbsp;/g, ' ');
    
    // Normalize all whitespace sequences to single space
    processed = processed.replace(/\s+/g, ' ').trim();
    
    return processed;
}

/**
 * Build regex pattern for a specific digit type
 * 
 * CRITICAL: After normalizeNumbers() is called, ALL text uses Latin digits!
 * Therefore, we ALWAYS use [0-9] and [1-9] patterns, regardless of locale.
 * 
 * @param type - 'year' | 'day' | 'count'
 * @param keywords - Locale keywords (unused but kept for interface consistency)
 * @returns RegExp pattern (NO /g flag - find one at a time)
 */
function buildDigitPattern(type: 'year' | 'day' | 'count', _keywords: LocaleKeywords): RegExp {
    // Use Latin digit patterns because text is already normalized
    const d0to9 = '[0-9]';
    const d1to9 = '[1-9]';
    
    if (type === 'year') {
        return new RegExp(`${d1to9}${d0to9}{3}`);
    } else if (type === 'day') {
        return new RegExp(`0?${d1to9}${d0to9}?`);  // 0?[1-9][0-9]? - allows optional leading zero
    } else {
        return new RegExp(`${d1to9}${d0to9}*`);
    }
}

/**
 * Extract first number of specific type from text
 * Returns: { number: string, remaining: string } or null
 */
function extractNumber(text: string, type: 'year' | 'day' | 'count', keywords: LocaleKeywords): { number: string; remaining: string } | null {
    const pattern = buildDigitPattern(type, keywords);
    const match = text.match(pattern);
    
    if (!match) {
        return null;
    }
    
    const number = match[0];
    const remaining = text.replace(number, ' ').replace(/\s+/g, ' ').trim();
    
    return { number, remaining };
}

/**
 * Check if text has remaining digits (validation helper)
 * 
 * CRITICAL: Uses Latin digit pattern because text is already normalized
 */
function hasRemainingDigits(text: string, _keywords: LocaleKeywords): boolean {
    // Remove all whitespace and common punctuation
    const cleaned = text.replace(/[\s\-\.,;:!?()[\]{}'"]/g, '');
    // Use Latin digit pattern because text is already normalized
    return /[0-9]/.test(cleaned);
}

/**
 * Create and validate a date with clear error messages
 */
function createAndValidateDate(year: number, month: number, day: number): Date | null {
    if (year < 1000 || year > 9999) {
        Logger.fgtwarn(`[DateParser] Invalid year: ${year} (must be 1000-9999)`);
        return null;
    }
    if (month < 1 || month > 12) {
        Logger.fgtwarn(`[DateParser] Invalid month: ${month} (must be 1-12)`);
        return null;
    }
    if (day < 1 || day > 31) {
        Logger.fgtwarn(`[DateParser] Invalid day: ${day} (must be 1-31)`);
        return null;
    }
    
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    
    // Validate date components match (catches invalid dates like Feb 31)
    if (date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day) {
        Logger.fgtwarn(`[DateParser] Invalid date combination: ${year}-${month}-${day} (e.g., Feb 31 doesn't exist)`);
        return null;
    }
    
    return date;
}

/**
 * ROUTE A: Parse absolute dates
 * 
 * Sequential removal from BOTH texts simultaneously:
 * 1. Remove time (both)
 * 2. Remove year (fullLabel required, text optional)
 * 3. Remove month (both)
 * 4. Remove day (both)
 * 5. Validate no digits remain
 */
function parseRouteA_AbsoluteDates(
    fullLabel: string,
    text: string,
    keywords: LocaleKeywords,
    originalFullLabel: string,
    originalText: string
): ParsedDateInfo | null {
    let fullLabelRemaining = fullLabel;
    let textRemaining = text;
    let extractedTime: { hours: number; minutes: number } | null = null;
    let extractedYear: number | null = null;
    let extractedMonth: number | null = null;
    let extractedDay: number | null = null;
    
    // STEP A1: Remove TIME from both texts
    const fullLabelTimeResult = extractAndRemoveTime(fullLabelRemaining, keywords);
    fullLabelRemaining = fullLabelTimeResult.remainingText;
    
    const textTimeResult = extractAndRemoveTime(textRemaining, keywords);
    textRemaining = textTimeResult.remainingText;
    
    // Use time from whichever text had it
    if (fullLabelTimeResult.hours !== null) {
        extractedTime = { hours: fullLabelTimeResult.hours, minutes: fullLabelTimeResult.minutes! };
    } else if (textTimeResult.hours !== null) {
        extractedTime = { hours: textTimeResult.hours, minutes: textTimeResult.minutes! };
    }
    
    // STEP A2: Remove YEAR from fullLabel (required) and text (optional)
    const fullLabelYearResult = extractNumber(fullLabelRemaining, 'year', keywords);
    if (!fullLabelYearResult) {
        Logger.fgtlog(`[ROUTE A] Failed: No year found in fullLabel`);
        return null;
    }
    
    extractedYear = parseInt(fullLabelYearResult.number, 10);
    fullLabelRemaining = fullLabelYearResult.remaining;
    
    // Try to extract year from text (may not exist if current year)
    const textYearResult = extractNumber(textRemaining, 'year', keywords);
    if (textYearResult) {
        const textYear = parseInt(textYearResult.number, 10);
        if (textYear !== extractedYear) {
            Logger.fgtlog(`[ROUTE A] Failed: Year mismatch (fullLabel=${extractedYear}, text=${textYear})`);
            return null;
        }
        textRemaining = textYearResult.remaining;
    }
    
    // STEP A3: Remove MONTH from both texts
    const monthResult = extractAndRemoveMonth(fullLabelRemaining, textRemaining, keywords);
    if (!monthResult) {
        Logger.fgtlog(`[ROUTE A] Failed: No month found`);
        return null;
    }
    
    extractedMonth = monthResult.month;
    fullLabelRemaining = monthResult.fullLabelRemaining;
    textRemaining = monthResult.textRemaining;
    
    // STEP A4: Remove DAY from both texts
    const fullLabelDayResult = extractNumber(fullLabelRemaining, 'day', keywords);
    if (!fullLabelDayResult) {
        Logger.fgtlog(`[ROUTE A] Failed: No day found in fullLabel`);
        return null;
    }
    
    extractedDay = parseInt(fullLabelDayResult.number, 10);
    fullLabelRemaining = fullLabelDayResult.remaining;
    
    const textDayResult = extractNumber(textRemaining, 'day', keywords);
    if (textDayResult) {
        textRemaining = textDayResult.remaining;
    }
    
    // STEP A5: Validate no digits remain
    if (hasRemainingDigits(fullLabelRemaining, keywords) || hasRemainingDigits(textRemaining, keywords)) {
        Logger.fgtlog(`[ROUTE A] Failed: Digits remain after parsing`);
        Logger.fgtlog(`  Original fullLabel: "${originalFullLabel}"`);
        Logger.fgtlog(`  Remaining fullLabel: "${fullLabelRemaining}"`);
        Logger.fgtlog(`  Original text: "${originalText}"`);
        Logger.fgtlog(`  Remaining text: "${textRemaining}"`);
        return null;
    }
    
    // Create and validate date components
    const date = createAndValidateDate(extractedYear, extractedMonth, extractedDay);
    if (!date) {
        return null;
    }
    
    // Return structured date info (absolute date, weekago=0)
    return {
        weekago: 0,
        year: extractedYear,
        month: extractedMonth,
        day: extractedDay,
        hours: extractedTime?.hours ?? 99,
        minutes: extractedTime?.minutes ?? 99
    };
}

/**
 * ROUTE B: Parse relative dates (days or weeks based)
 * 
 * Mode 'day': "2 days ago", "3일 전" (day keyword optional)
 * Mode 'week': "1 week ago", "48주 전" (week keyword required for detection)
 * 
 * @param mode - 'day' or 'week' determines multiplier and keyword handling
 */
function parseRouteB_RelativeDates(
    fullLabel: string,
    _text: string,
    keywords: LocaleKeywords,
    originalFullLabel: string,
    mode: 'day' | 'week'
): ParsedDateInfo | null {
    // Use fullLabel for parsing (it has complete information)
    let remaining = fullLabel;
    
    // STEP B1: Extract COUNT
    const countResult = extractNumber(remaining, 'count', keywords);
    if (!countResult) {
        Logger.fgtlog(`[ROUTE B] Failed: No count found`);
        return null;
    }
    
    const count = parseInt(countResult.number, 10);
    remaining = countResult.remaining;
    
    // Validate count is reasonable (1-999)
    if (count < 1 || count > 999) {
        Logger.fgtlog(`[ROUTE B] Failed: Count out of range: ${count}`);
        return null;
    }
    
    // STEP B2: Validate no digits remain
    if (hasRemainingDigits(remaining, keywords)) {
        Logger.fgtlog(`[ROUTE B] Failed: Digits remain after parsing`);
        Logger.fgtlog(`  Original fullLabel: "${originalFullLabel}"`);
        Logger.fgtlog(`  Remaining: "${remaining}"`);
        return null;
    }
    
    // STEP B3: Return structured date info based on mode
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (mode === 'week') {
        // Weeks mode: return weekago with count
        return {
            weekago: count,
            year: 0,
            month: 0,
            day: 0,
            hours: 99,
            minutes: 99
        };
    } else {
        // Days mode: calculate actual date
        const result = new Date(today);
        result.setDate(result.getDate() - count);
        
        return {
            weekago: 0,
            year: result.getFullYear(),
            month: result.getMonth() + 1,
            day: result.getDate(),
            hours: 99,
            minutes: 99
        };
    }
}

/**
 * ROUTE C: Parse special keywords (today, tomorrow, yesterday)
 * 
 * CRITICAL FIX: Also extract time information
 * 
 * Before: Only returned date with 00:00 time
 * After: Extracts time using extractAndRemoveTime
 * 
 * Examples:
 * - "내일 오전 12:30" → Tomorrow at 00:30
 * - "오늘 오후 8:30" → Today at 20:30
 * - "어제" → Yesterday at 00:00 (no time specified)
 */
function parseRouteC_SpecialKeywords(
    fullLabel: string,
    text: string,
    keywords: LocaleKeywords
): ParsedDateInfo | null {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // STEP C1: Extract time from fullLabel (if present)
    const timeResult = extractAndRemoveTime(fullLabel, keywords);
    const fullLabelRemaining = timeResult.remainingText;
    
    // STEP C2: Check for special keywords
    const textToCheck = fullLabelRemaining.toLowerCase();
    
    let resultDate: Date | null = null;
    
    // Try today
    if (keywords.today) {
        const variants = keywords.today.split('|');
        for (const variant of variants) {
            if (textToCheck.includes(variant.toLowerCase())) {
                resultDate = new Date(today);
                break;
            }
        }
    }
    
    // Try tomorrow
    if (!resultDate && keywords.tomorrow) {
        const variants = keywords.tomorrow.split('|');
        for (const variant of variants) {
            if (textToCheck.includes(variant.toLowerCase())) {
                resultDate = new Date(today);
                resultDate.setDate(resultDate.getDate() + 1);
                break;
            }
        }
    }
    
    // Try yesterday
    if (!resultDate && keywords.yesterday) {
        const variants = keywords.yesterday.split('|');
        for (const variant of variants) {
            if (textToCheck.includes(variant.toLowerCase())) {
                resultDate = new Date(today);
                resultDate.setDate(resultDate.getDate() - 1);
                break;
            }
        }
    }
    
    // If no keyword matched, fail
    if (!resultDate) {
        Logger.fgtlog(`[ROUTE C] Failed: No special keywords matched`);
        Logger.fgtlog(`  fullLabel: "${fullLabel}"`);
        Logger.fgtlog(`  text: "${text}"`);
        return null;
    }
    
    // STEP C3: Apply time if extracted and return structured date info
    return {
        weekago: 0,
        year: resultDate.getFullYear(),
        month: resultDate.getMonth() + 1,
        day: resultDate.getDate(),
        hours: timeResult.hours ?? 99,
        minutes: timeResult.minutes ?? 99
    };
}

/**
 * Extract and remove time from text
 *
 * CRITICAL FIXES:
 * 1. Meridiem can appear BEFORE or AFTER time (e.g., "오후 1:30" or "1:30 PM")
 * 2. Correct 12-hour to 24-hour conversion for ALL cases
 * 3. Word boundary for single-letter meridiem (except CJK)
 *
 * Pattern examples:
 * - "오후 1:30" (Korean: meridiem before)
 * - "1:30 PM" (English: meridiem after)
 * - "PM 1:30" (meridiem before)
 * - "오후1:30" (Korean: no space, still valid)
 */
export function extractAndRemoveTime(text: string, keywords: LocaleKeywords): { hours: number | null; minutes: number | null; remainingText: string } {
    const timeSep = keywords.timeSeparator || ':';
    const timeSepEscaped = timeSep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Build time pattern (using Latin digits because text is normalized)
    const timePattern = `[0-2]?[0-9]${timeSepEscaped}[0-5][0-9]`;
    
    // Build meridiem patterns if needed
    if (keywords.meridiem && !keywords.uses24Hour) {
        const amVariants = keywords.meridiem.am.split('|');
        const pmVariants = keywords.meridiem.pm.split('|');
        const allVariants = [...amVariants, ...pmVariants];
        
        // Helper to check if string contains CJK characters
        const isCJK = (str: string): boolean => {
            return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/.test(str);
        };
        
        // Build meridiem pattern with proper word boundaries
        const variantPatterns = allVariants.map(v => {
            const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // If variant contains CJK, no word boundary needed (can be attached)
            if (isCJK(v)) {
                return escaped;
            }
            
            // For non-CJK, use word boundary \b (but only if alphanumeric)
            // \b works for: "a 5:30" but not "somethinga 5:30"
            if (/^[a-zA-Z0-9]+$/.test(v)) {
                return `\\b${escaped}\\b`;
            }
            
            // For meridiem with dots or special chars (like "a.m."), no word boundary
            return escaped;
        });
        
        const meridiemGroup = `(${variantPatterns.join('|')})`;
        
        // Try three patterns in order:
        // 1. Meridiem before time: "오후 1:30" or "PM 1:30"
        const patternBefore = new RegExp(`${meridiemGroup}\\s*(${timePattern})`, 'i');
        let match = text.match(patternBefore);
        
        if (match) {
            // match[1] = meridiem, match[2] = time
            const meridiemStr = match[1];
            const timePart = match[2];
            const [hoursStr, minutesStr] = timePart.split(timeSep);
            let hours = parseInt(hoursStr, 10);
            const minutes = parseInt(minutesStr, 10);
            
            // Convert meridiem
            hours = convertMeridiem(hours, meridiemStr, keywords);
            
            // Validate and return
            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                const remainingText = text.replace(match[0], '').replace(/\s+/g, ' ').trim();
                return { hours, minutes, remainingText };
            }
        }
        
        // 2. Meridiem after time: "1:30 PM" or "1:30 pm"
        const patternAfter = new RegExp(`(${timePattern})\\s*${meridiemGroup}`, 'i');
        match = text.match(patternAfter);
        
        if (match) {
            // match[1] = time, match[2] = meridiem
            const timePart = match[1];
            const meridiemStr = match[2];
            const [hoursStr, minutesStr] = timePart.split(timeSep);
            let hours = parseInt(hoursStr, 10);
            const minutes = parseInt(minutesStr, 10);
            
            // Convert meridiem
            hours = convertMeridiem(hours, meridiemStr, keywords);
            
            // Validate and return
            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                const remainingText = text.replace(match[0], '').replace(/\s+/g, ' ').trim();
                return { hours, minutes, remainingText };
            }
        }
    }
    
    // 3. Time only (no meridiem): "13:30" (24-hour format)
    const patternTimeOnly = new RegExp(`(${timePattern})`, 'i');
    const match = text.match(patternTimeOnly);
    
    if (!match) {
        return { hours: null, minutes: null, remainingText: text };
    }
    
    const timePart = match[1];
    const [hoursStr, minutesStr] = timePart.split(timeSep);
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    // Validate time
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return { hours: null, minutes: null, remainingText: text };
    }
    
    // Remove time from text
    const remainingText = text.replace(match[0], '').replace(/\s+/g, ' ').trim();
    
    return { hours, minutes, remainingText };
}

/**
 * Convert 12-hour format to 24-hour format based on meridiem
 * 
 * CRITICAL: Correct conversion logic for ALL cases
 * 
 * 12-hour → 24-hour conversion rules:
 * AM:
 *   12:00 AM → 00:00 (midnight)
 *   1:00 AM  → 01:00
 *   11:00 AM → 11:00
 * PM:
 *   12:00 PM → 12:00 (noon, no change)
 *   1:00 PM  → 13:00
 *   10:00 PM → 22:00
 *   11:00 PM → 23:00
 */
function convertMeridiem(hours: number, meridiemStr: string, keywords: LocaleKeywords): number {
    if (!keywords.meridiem) {
        return hours;
    }
    
    const meridiemLower = meridiemStr.toLowerCase().trim();
    const amVariants = keywords.meridiem.am.split('|');
    const pmVariants = keywords.meridiem.pm.split('|');
    
    const isAM = amVariants.some(v => meridiemLower.includes(v.toLowerCase()));
    const isPM = pmVariants.some(v => meridiemLower.includes(v.toLowerCase()));
    
    if (isPM) {
        // PM conversion: 12 PM stays 12, others add 12
        if (hours !== 12) {
            return hours + 12;
        }
        return hours; // 12 PM = 12 (noon)
    } else if (isAM) {
        // AM conversion: 12 AM becomes 0, others stay same
        if (hours === 12) {
            return 0; // 12 AM = 00 (midnight)
        }
        return hours;
    }
    
    // No meridiem matched, return as-is
    return hours;
}

/**
 * Extract and remove month from both texts using PARALLEL PROCESSING
 * 
 * CRITICAL DESIGN: Two-phase parallel processing with AND condition
 * 
 * Phase 1: INDEPENDENT SEARCH
 * - Search for month variants in fullLabel independently
 * - Search for month variants in text independently  
 * - Each text may match different variants (e.g., "October" vs "Oct")
 * 
 * Phase 2: MERGE DECISION
 * - Month uses AND condition: foundInFullLabel AND foundInText
 * - Reason: Month is NEVER omitted in date expressions
 * - Both texts must contain month information
 * 
 * Phase 3: INDEPENDENT REMOVAL
 * - Remove the matched variant from fullLabel
 * - Remove the matched variant from text
 * - Each text uses its own matched variant for removal
 * 
 * This solves the Vietnamese "tháng 10" vs "thg 10" problem:
 * - fullLabel has "tháng 10" → finds and removes "tháng 10"
 * - text has "thg 10" → finds and removes "thg 10"
 * - No variant mismatch, both succeed independently
 * 
 * Also solves variant mismatch in other languages:
 * - English: "October" in fullLabel, "Oct" in text
 * - German: "Januar" in fullLabel, "Jan." in text
 * - Each text is processed with its own matched pattern
 */
function extractAndRemoveMonth(
    fullLabel: string,
    text: string,
    keywords: LocaleKeywords
): { month: number; fullLabelRemaining: string; textRemaining: string } | null {
    const fullLabelLower = fullLabel.toLowerCase();
    const textLower = text.toLowerCase();
    
    // Helper function to escape special regex characters
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Try each month (12 down to 1) - check longer month variants first
    // This prevents false matches: "tháng 10" should match before "tháng 1"
    // Otherwise "tháng 1" might partially match the "1" in "10"
    for (let monthIndex = keywords.months.combined.length - 1; monthIndex >= 0; monthIndex--) {
        const variants = keywords.months.combined[monthIndex].split('|');
        
        // PHASE 1: INDEPENDENT SEARCH
        // Search for month in fullLabel
        let fullLabelVariant: string | null = null;
        for (const variant of variants) {
            if (fullLabelLower.includes(variant.toLowerCase())) {
                fullLabelVariant = variant;
                break; // Found in fullLabel, stop searching
            }
        }
        
        // Search for month in text
        let textVariant: string | null = null;
        for (const variant of variants) {
            if (textLower.includes(variant.toLowerCase())) {
                textVariant = variant;
                break; // Found in text, stop searching
            }
        }
        
        const foundInFullLabel = fullLabelVariant !== null;
        const foundInText = textVariant !== null;
        
        // PHASE 2: MERGE DECISION (AND condition for month)
        // Month must exist in BOTH texts (it's never omitted)
        if (!foundInFullLabel || !foundInText) {
            continue; // This month doesn't match, try next month
        }
        
        // Both texts have this month, proceed with removal
        
        // PHASE 3: INDEPENDENT REMOVAL
        // Remove month from fullLabel using its matched variant
        let fullLabelRemaining = fullLabel;
        if (fullLabelVariant) {
            const regex = new RegExp(escapeRegex(fullLabelVariant), 'gi');
            fullLabelRemaining = fullLabel.replace(regex, ' ');
        }
        
        // Remove month from text using its matched variant
        let textRemaining = text;
        if (textVariant) {
            const regex = new RegExp(escapeRegex(textVariant), 'gi');
            textRemaining = text.replace(regex, ' ');
        }
        
        // Clean up extra whitespace
        fullLabelRemaining = fullLabelRemaining.replace(/\s+/g, ' ').trim();
        textRemaining = textRemaining.replace(/\s+/g, ' ').trim();
        
        return {
            month: monthIndex + 1, // 1-based month number
            fullLabelRemaining,
            textRemaining
        };
    }
    
    // No month matched in both texts
    return null;
}

/*-----------------------------*/

/**
 * Remove Vietnamese weekday abbreviations that interfere with date parsing
 * 
 * Vietnamese abbreviated dates have weekday prefixes like "Th 2, " (Monday)
 * where the number gets misinterpreted as a date during parsing.
 * This function removes these prefixes from the start of the text.
 * 
 * Pattern: "CN, " (Sunday) or "Th 2, " through "Th 7, " (Monday-Saturday)
 * 
 * Examples:
 * - "Th 2, 13 thg 10" → "13 thg 10"
 * - "CN, 15 thg 3" → "15 thg 3"
 * 
 * @param text - Short date text with potential weekday prefix
 * @returns Text with weekday prefix removed
 */
function removeVietnameseWeekdayPrefix(text: string): string {
    // Remove weekday abbreviation from start of string
    // Pattern: "CN, " or "Th 2, " through "Th 7, "
    return text.replace(/^(CN|Th\s+[2-7]),\s*/i, '');
}

/**
 * Format ParsedDateInfo for date button display
 * Uses D+N / D-N format for dates within range
 * 
 * Format rules:
 * 1. No date set (null) → "📅"
 * 2. Weeks ago → "1 week ago" or "N weeks ago" (English only, NO weekday)
 * 3. D+6 to D-7 range → "D+6 (Wed)", "D-DAY (Tue)", "D-1 (Mon)", etc.
 * 4. 8+ days ahead, current year → "Dec.4 (Thu)"
 * 5. 8+ days ahead, next year+ → "2026.Jan.25 (Sun)"
 * 6. Time exists (not 99) → append " HH:MM" (24-hour format with leading zeros)
 */
export function formatDateForButton(dateInfo: ParsedDateInfo | null): string {
    if (!dateInfo) return "📅";
    
    // Weeks ago format (English only, as requested) - NO WEEKDAY
    if (dateInfo.weekago > 0) {
        return dateInfo.weekago === 1 ? "1 week ago" : `${dateInfo.weekago} weeks ago`;
    }
    
    // Calculate days difference from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(dateInfo.year, dateInfo.month - 1, dateInfo.day);
    targetDate.setHours(0, 0, 0, 0);
    
    const diffMs = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    // Get weekday abbreviation (Sun, Mon, Tue, Wed, Thu, Fri, Sat)
    const weekdayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekday = weekdayAbbr[targetDate.getDay()];
    
    // Month abbreviations
    const monthAbbr = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 
                       'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
    
    let dateStr = '';
    
    // D+6 to D-7 range
    if (diffDays >= -6 && diffDays <= 7) {
        if (diffDays === 0) {
            dateStr = `D-DAY (${weekday})`;
        } else if (diffDays > 0) {
            dateStr = `D${-diffDays} (${weekday})`;
        } else {
            dateStr = `D+${-diffDays} (${weekday})`;
        }
    }
    // 8+ days ahead
    else if (diffDays >= 8) {
        const currentYear = today.getFullYear();
        const month = monthAbbr[dateInfo.month - 1];
        const day = String(dateInfo.day);
        
        if (dateInfo.year === currentYear) {
            dateStr = `${month}${day} (${weekday})`;
        } else {
            dateStr = `${dateInfo.year}.${month}${day} (${weekday})`;
        }
    }
    // 7+ days before (past dates beyond D+6)
    else {
        const month = monthAbbr[dateInfo.month - 1];
        const day = String(dateInfo.day);
        const currentYear = today.getFullYear();
        
        if (dateInfo.year === currentYear) {
            dateStr = `${month}${day} (${weekday})`;
        } else {
            dateStr = `${dateInfo.year}.${month}${day} (${weekday})`;
        }
    }
    
    // Append time if exists
    if (dateInfo.hours !== 99 && dateInfo.minutes !== 99) {
        const hours = String(dateInfo.hours).padStart(2, '0');
        const minutes = String(dateInfo.minutes).padStart(2, '0');
        dateStr += ` ${hours}:${minutes}`;
    }
    
    return dateStr;
}

/**
 * Format ParsedDateInfo for task modal display
 * Always shows exact date (mmm.DD or YYYY.mmm.DD), except for weeks ago
 * 
 * Format rules:
 * 1. No date set (null) → "No date"
 * 2. Weeks ago → "1 week ago" or "N weeks ago"
 * 3. All other dates → "mmm.DD" (current year) or "YYYY.mmm.DD" (other years)
 * 4. Time exists (not 99) → append " HH:MM"
 */
export function formatDateForModal(dateInfo: ParsedDateInfo | null): string {
    if (!dateInfo) return "No date";
    
    // Weeks ago format
    if (dateInfo.weekago > 0) {
        return dateInfo.weekago === 1 ? "1 week ago" : `${dateInfo.weekago} weeks ago`;
    }
    
    // Month abbreviations
    const monthAbbr = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 
                       'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
    
    const today = new Date();
    const currentYear = today.getFullYear();
    
    const month = monthAbbr[dateInfo.month - 1];
    const day = String(dateInfo.day);
    
    let dateStr = '';
    if (dateInfo.year === currentYear) {
        dateStr = `${month}${day}`;
    } else {
        dateStr = `${dateInfo.year}.${month}${day}`;
    }
    
    // Append time if exists
    if (dateInfo.hours !== 99 && dateInfo.minutes !== 99) {
        const hours = String(dateInfo.hours).padStart(2, '0');
        const minutes = String(dateInfo.minutes).padStart(2, '0');
        dateStr += ` ${hours}:${minutes}`;
    }
    
    return dateStr;
}