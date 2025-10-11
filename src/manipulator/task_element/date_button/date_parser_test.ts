// manipulator/task_element/date_button/date_parser_test.ts
/**
 * Test utility for date_parser.ts
 * 
 * This file exposes a test function to window scope for browser console testing.
 * Usage in browser console:
 * 
 *   const test = `[ko]
 *   날짜/시간 추가
 *   2026년 1월 1일
 *   오늘
 *   [en]
 *   Add date/time
 *   January 1, 2026
 *   Today`;
 *   
 *   window.fancyTestUnformatDate(test);
 * 
 * This will parse each date line and log the results to console.
 */

import { parseNaturalDate } from './date_parser';

/**
 * Test function for parsing dates from test.txt format
 * 
 * Expected format:
 * [locale]
 * Full label line (skipped or tested)
 * Short date text (parsed)
 * Full label line
 * Short date text
 * ...
 * [next-locale]
 * ...
 * 
 * @param testContent - Content from test.txt file
 */
export function testDateParser(testContent: string): void {
    console.log('=================================================');
    console.log('📅 Starting Date Parser Test');
    console.log('=================================================\n');

    const lines = testContent.split('\n');
    let currentLocale = 'en'; // Default locale
    let lineNumber = 0;
    let totalTests = 0;
    let successCount = 0;
    let failCount = 0;

    for (const line of lines) {
        lineNumber++;
        const trimmedLine = line.trim();

        // Skip empty lines
        if (!trimmedLine) {
            continue;
        }

        // Check for locale marker: [ko], [en], etc.
        const localeMatch = trimmedLine.match(/^\[([a-z-]+)\]$/i);
        if (localeMatch) {
            currentLocale = localeMatch[1];
            console.log(`\n${'='.repeat(50)}`);
            console.log(`🌍 Locale: ${currentLocale.toUpperCase()}`);
            console.log(`${'='.repeat(50)}`);
            continue;
        }

        // Skip "Add date/time" header lines (first line after locale)
        // These contain keywords like "추가", "Add", "Añadir", etc.
        if (isHeaderLine(trimmedLine)) {
            continue;
        }

        // Skip full label lines (lines with "Scheduled for", "(으)로 일정 예약", etc.)
        if (isFullLabelLine(trimmedLine)) {
            continue;
        }

        // This is a date text line - parse it
        totalTests++;
        const result = parseNaturalDate(trimmedLine, currentLocale);

        if (result) {
            successCount++;
            console.log(`✅ [${currentLocale}] "${trimmedLine}"`);
            console.log(`   → ${formatDateResult(result)}`);
        } else {
            failCount++;
            console.log(`❌ [${currentLocale}] "${trimmedLine}"`);
            console.log(`   → PARSE FAILED`);
        }
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary');
    console.log('='.repeat(50));
    console.log(`Total tests: ${totalTests}`);
    console.log(`✅ Success: ${successCount} (${Math.round(successCount / totalTests * 100)}%)`);
    console.log(`❌ Failed: ${failCount} (${Math.round(failCount / totalTests * 100)}%)`);
    console.log('='.repeat(50));
}

/**
 * Check if line is a header line (e.g., "Add date/time", "날짜/시간 추가")
 */
function isHeaderLine(line: string): boolean {
    // Common patterns in header lines
    const headerPatterns = [
        /추가/,           // Korean "추가"
        /Add/i,           // English "Add"
        /Añadir/i,        // Spanish "Añadir"
        /Ajouter/i,       // French "Ajouter"
        /Hinzufügen/i,    // German "Hinzufügen"
        /Tambah/i,        // Indonesian "Tambah"
        /Aggiungi/i,      // Italian "Aggiungi"
        /追加/,           // Japanese "追加"
        /Adicionar/i,     // Portuguese "Adicionar"
        /Добавить/i,      // Russian "Добавить"
        /เพิ่ม/,          // Thai "เพิ่ม"
        /Додати/i,        // Ukrainian "Додати"
        /Thêm/i,          // Vietnamese "Thêm"
        /新增/,           // Chinese "新增"
        /जोड़ें/,         // Hindi "जोड़ें"
        /যোগ/,           // Bengali "যোগ"
    ];

    return headerPatterns.some(pattern => pattern.test(line));
}

/**
 * Check if line is a full label line (with "Scheduled for", "예약", etc.)
 */
function isFullLabelLine(line: string): boolean {
    // Full label lines contain these patterns
    const fullLabelPatterns = [
        /일정\s*예약/,                  // Korean "일정 예약"
        /Scheduled\s+for/i,             // English "Scheduled for"
        /Programada\s+para/i,           // Spanish "Programada para"
        /Planifié\s+pour/i,             // French "Planifié pour"
        /Geplant\s+für/i,               // German "Geplant für"
        /Dijadwalkan\s+untuk/i,         // Indonesian "Dijadwalkan untuk"
        /Data\s+programmazione/i,       // Italian "Data programmazione"
        /にスケジュール設定/,            // Japanese "にスケジュール設定"
        /Tarefa\s+programada/i,         // Portuguese "Tarefa programada"
        /Запланировано\s+на/i,          // Russian "Запланировано на"
        /กำหนดเวลา/,                    // Thai "กำหนดเวลา"
        /Заплановано\s+на/i,            // Ukrainian "Заплановано на"
        /Đã\s+lên\s+lịch/i,             // Vietnamese "Đã lên lịch"
        /预定时间/,                      // Chinese Simplified "预定时间"
        /預定時間/,                      // Chinese Traditional "預定時間"
        /शेड्यूल\s+किया/,              // Hindi "शेड्यूल किया"
        /শেড্যুল\s+করা/,               // Bengali "শেড্যুল করা"
    ];

    return fullLabelPatterns.some(pattern => pattern.test(line));
}

/**
 * Format Date object for console output
 */
function formatDateResult(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // Show time if not midnight
    if (date.getHours() !== 0 || date.getMinutes() !== 0) {
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    } else {
        return `${year}-${month}-${day}`;
    }
}

// Expose test function to window for browser console access
if (typeof window !== 'undefined') {
    (window as any).fancyTestUnformatDate = testDateParser;
    console.log('✅ Test function registered: window.fancyTestUnformatDate()');
}