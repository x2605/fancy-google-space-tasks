// manipulator/task_element/date_button/date_parser_test.ts
/**
 * Test utility for date_parser.ts
 * 
 * This file exposes a test function to window scope for browser console testing.
 * It automatically fetches CLDR keywords for each locale and tests parsing.
 * 
 * Usage in browser console:
 * 
 *   const test = `[ko]
 *   날짜/시간 추가
 *   2026년 1월 1일 목요일(으)로 일정 예약
 *   2026년 1월 1일
 *   [en]
 *   Add date/time
 *   Scheduled for Thursday, January 1, 2026
 *   January 1, 2026`;
 *   
 *   const expectedTimes = `null
 *   null
 *   13:30`;
 *   
 *   await window.fancyTestUnformatDate(test, expectedTimes);
 * 
 * TEST FORMAT:
 * -----------
 * Each test consists of TWO lines (representing Google Tasks date button behavior):
 * Line 1: fullLabel (aria-label with full date info)
 * Line 2: text (visible text, may omit year if current year)
 * 
 * The parser receives BOTH texts and processes them simultaneously.
 */

import { parseNaturalDate, loadLocaleKeywords, LocaleKeywords, ParsedDateInfo } from './date_parser';

/**
 * Backup structure for restoring keywords after test
 */
interface KeywordsBackup {
    keywords: Record<string, LocaleKeywords> | undefined;
    getFunction: ((locale: string) => LocaleKeywords | null) | undefined;
}

/**
 * Backup current keywords state before test
 */
function backupKeywords(): KeywordsBackup {
    return {
        keywords: window.FGT_DATE_KEYWORDS,
        getFunction: window.FGT_GET_LOCALE_KEYWORDS
    };
}

/**
 * Restore keywords state after test
 */
function restoreKeywords(backup: KeywordsBackup): void {
    if (backup.keywords !== undefined) {
        window.FGT_DATE_KEYWORDS = backup.keywords;
    } else {
        delete (window as any).FGT_DATE_KEYWORDS;
    }

    if (backup.getFunction !== undefined) {
        window.FGT_GET_LOCALE_KEYWORDS = backup.getFunction;
    } else {
        delete (window as any).FGT_GET_LOCALE_KEYWORDS;
    }

    console.log('✅ Restored original keywords state');
}

/**
 * Test function for parsing dates from test.txt format
 * 
 * Expected format:
 * [locale]
 * Header line (always skipped)
 * fullLabel line 1
 * text line 1
 * fullLabel line 2
 * text line 2
 * ...
 * [next-locale]
 * Header line (always skipped)
 * ...
 * 
 * CRITICAL: Lines are processed in PAIRS
 * - First line of pair = fullLabel (full date info)
 * - Second line of pair = text (short date, may omit year)
 * 
 * @param testContent - Content from test.txt file
 * @param expectedTimesContent - Optional content from expected_times.txt file
 */
export async function testDateParser(
    testContent: string,
    expectedTimesContent?: string
): Promise<void> {
    console.log('='.repeat(50));
    console.log('📅 Starting Date Parser Test');
    console.log('='.repeat(50) + '\n');

    // Backup current keywords state
    const backup = backupKeywords();
    console.log('💾 Backed up current keywords state\n');

    // Parse expected times if provided
    const expectedTimes: (string | null)[] = [];
    if (expectedTimesContent) {
        const timeLines = expectedTimesContent.split('\n');
        for (const line of timeLines) {
            const trimmed = line.trim();
            // Skip comments and empty lines
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            // "null" means no time expected (date-only case)
            if (trimmed.toLowerCase() === 'null') {
                expectedTimes.push(null);
            } else {
                // Expected format: "HH:MM"
                expectedTimes.push(trimmed);
            }
        }
        console.log(`⏰ Loaded ${expectedTimes.length} expected time entries\n`);
    }

    try {
        const lines = testContent.split('\n');
        let currentLocale = ''; // No default locale
        let totalTests = 0;
        let successCount = 0;
        let failCount = 0;
        let timeMismatchCount = 0;
        let localeLoaded = false;
        let skipNextLine = false; // Flag to skip header line after locale marker
        let waitingForSecondLine = false; // Flag to collect line pairs
        let firstLine = ''; // Store first line of the pair

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Skip empty lines
            if (!trimmedLine) {
                continue;
            }

            // Check for locale marker: [ko], [en], etc.
            const localeMatch = trimmedLine.match(/^\[([a-z]{2}(?:-[A-Z]{2})?)\]$/i);
            if (localeMatch) {
                currentLocale = localeMatch[1];
                localeLoaded = false;
                skipNextLine = true; // CRITICAL: Skip the next line (header)
                waitingForSecondLine = false; // Reset pair collection
                
                console.log('\n' + '='.repeat(50));
                console.log(`🌍 Locale: ${currentLocale.toUpperCase()}`);
                console.log('='.repeat(50));
                
                // Load keywords for this locale
                try {
                    await loadLocaleKeywords(currentLocale);
                    localeLoaded = true;
                } catch (error) {
                    console.error(`❌ Error loading keywords for locale: ${currentLocale}`, error);
                    console.log(`⚠️  Failed to load locale ${currentLocale}, skipping...`);
                    skipNextLine = false; // Don't skip if locale loading failed
                }
                
                continue;
            }

            // CRITICAL: Skip header line after locale marker
            if (skipNextLine) {
                skipNextLine = false;
                continue;
            }

            // Skip if locale not loaded
            if (!localeLoaded) {
                continue;
            }

            // CRITICAL: Process lines in PAIRS
            // First line = fullLabel, Second line = text
            if (!waitingForSecondLine) {
                // This is the first line of a pair (fullLabel)
                firstLine = trimmedLine;
                waitingForSecondLine = true;
                continue;
            } else {
                // This is the second line of a pair (text)
                const fullLabel = firstLine;
                const text = trimmedLine;
                waitingForSecondLine = false;

                // Parse the date with BOTH texts
                totalTests++;
                const parsedDate = parseNaturalDate(fullLabel, text, currentLocale);

                if (parsedDate) {
                    const dateStr = formatDateResult(parsedDate);
                    console.log(`✅ [${currentLocale}] "${fullLabel}"`);
                    console.log(`   → ${dateStr}`);
                    
                    // Validate time if expectedTimes is provided
                    if (expectedTimesContent && expectedTimes.length > 0) {
                        const expectedIndex = totalTests - 1;
                        if (expectedIndex < expectedTimes.length) {
                            const expectedTime = expectedTimes[expectedIndex];
                            const actualHours = parsedDate.hours;
                            const actualMinutes = parsedDate.minutes;
                            const actualTime = `${String(actualHours).padStart(2, '0')}:${String(actualMinutes).padStart(2, '0')}`;
                            
                            if (expectedTime === null) {
                                // No time expected, should be 99
                                if (actualHours !== 99 || actualMinutes !== 99) {
                                    console.log(`   ⚠️  TIME MISMATCH: Expected no time (99:99), got ${actualTime}`);
                                    timeMismatchCount++;
                                }
                            } else {
                                // Time expected, compare
                                const expectedFormatted = expectedTime;
                                const actualFormatted = actualHours !== 99 ? actualTime : '99:99';
                                if (actualFormatted !== expectedFormatted) {
                                    console.log(`   ⚠️  TIME MISMATCH: Expected ${expectedFormatted}, got ${actualFormatted}`);
                                    timeMismatchCount++;
                                }
                            }
                        }
                    }
                    
                    successCount++;
                } else {
                    console.log(`❌ [${currentLocale}] "${fullLabel}"`);
                    console.log(`   → PARSE FAILED`);
                    failCount++;
                }
            }
        }

        // Print summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 Test Summary');
        console.log('='.repeat(50));
        console.log(`Total tests: ${totalTests}`);
        console.log(`✅ Success: ${successCount} (${Math.round(successCount / totalTests * 100)}%)`);
        console.log(`❌ Failed: ${failCount} (${Math.round(failCount / totalTests * 100)}%)`);
        
        if (expectedTimesContent && timeMismatchCount > 0) {
            console.log(`⏰ Time mismatches: ${timeMismatchCount}`);
        }
        
        console.log('='.repeat(50));

    } finally {
        // Always restore keywords state, even if test fails
        restoreKeywords(backup);
    }
}

/**
 * Format Date object for console output
 */
function formatDateResult(dateInfo: ParsedDateInfo): string {
    const year = String(dateInfo.year).padStart(4, '0');
    const month = String(dateInfo.month).padStart(2, '0');
    const day = String(dateInfo.day).padStart(2, '0');
    const hours = String(dateInfo.hours).padStart(2, '0');
    const minutes = String(dateInfo.minutes).padStart(2, '0');
    
    // Show weekago format
    if (dateInfo.weekago > 0) {
        return `${dateInfo.weekago} week${dateInfo.weekago > 1 ? 's' : ''} ago`;
    }
    
    // Show time if exists (not 99)
    if (dateInfo.hours !== 99 && dateInfo.minutes !== 99) {
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    } else {
        return `${year}-${month}-${day}`;
    }
}

// Expose test function to window for browser console access
if (typeof window !== 'undefined') {
    (window as any).fancyTestUnformatDate = testDateParser as (testContent: string, expectedTimesContent?: string) => Promise<void>;
    console.log('✅ Test function registered: window.fancyTestUnformatDate(testString, expectedTimesString?)');
    console.log('   Note: This is an async function, use await or .then()');
}