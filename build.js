// build.js
/**
 * @typedef {Object} UnitKeywords
 * @property {string|null} singular - Singular form of the unit
 * @property {string} plural - Plural form of the unit
 * @property {boolean} usesArticle - Whether this unit uses articles
 */

/**
 * @typedef {Object} MeridiemKeywords
 * @property {string} am - AM variants (pipe-separated)
 * @property {string} pm - PM variants (pipe-separated)
 */

/**
 * @typedef {Object} TimeFormats
 * @property {string|null} short - Short time format
 */

/**
 * @typedef {Object} MonthsData
 * @property {string[]} combined - Array of month names with variants (pipe-separated)
 */

/**
 * @typedef {Object} LocaleKeywords
 * @property {string|null} today - Today keyword variants
 * @property {string|null} tomorrow - Tomorrow keyword variants
 * @property {string|null} yesterday - Yesterday keyword variants
 * @property {UnitKeywords} day - Day unit keywords
 * @property {UnitKeywords} week - Week unit keywords
 * @property {MeridiemKeywords|null} meridiem - AM/PM keywords
 * @property {boolean} usesLatinNumbers - Whether locale uses Latin digits
 * @property {string|null} numberingDigits - Local digit system (pipe-separated)
 * @property {string} dateFormats - Date format order (e.g., "d|M|y")
 * @property {TimeFormats|null} timeFormats - Time format patterns
 * @property {string} timeSeparator - Time separator character
 * @property {boolean} uses24Hour - Whether locale uses 24-hour format
 * @property {MonthsData|null} months - Month names with variants
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Check command line arguments for build mode
const isMinified = process.argv.includes('--minify');
const isWatch = process.argv.includes('--watch');

// Display build mode for user feedback
console.log(`Building in ${isMinified ? 'minify' : 'development'} mode...`);

const distPath = path.join(__dirname, 'dist');

// Function to clean and re-create the dist folder
function cleanDist() {
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
    console.log('Cleaned previous build artifacts');
  }
  fs.mkdirSync(distPath, { recursive: true });
  console.log('Created dist folder');
}

// Function to copy files and directories
function copySync(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(item => {
      copySync(path.join(src, item), path.join(dest, item));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// --- Version Management ---
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;
console.log(`Project version: ${version}`);

// Update manifest.json with the version and copy to dist
function updateManifestVersion() {
  const manifestTemplatePath = path.join(__dirname, 'manifest.template.json');
  let manifestContent = fs.readFileSync(manifestTemplatePath, 'utf8');
  const manifest = JSON.parse(manifestContent);
  manifest.version = version;
  fs.writeFileSync(path.join(distPath, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Updated manifest.json with current version and copied to dist');
}
// --- End Version Management ---

// --- Hardcoded Locale Mapping (HTML lang → CLDR locale) ---
// Only map locales that don't have 1:1 correspondence
const LOCALE_MAPPING = {
  'zh-CN': 'zh-Hans',
  'zh-TW': 'zh-Hant',
  'zh-HK': 'zh-Hant',
  'zh-SG': 'zh-Hans-SG',
  'zh-MO': 'zh-Hant-MO',
};
// --- End Locale Mapping ---

// --- CLDR Date Keywords Extraction ---
function extractDateKeywords() {
  console.log('Extracting date keywords from CLDR data...');

  // Paths
  const cldrDatesPath = path.join(__dirname, 'node_modules', 'cldr-dates-full', 'main');
  const cldrNumbersPath = path.join(__dirname, 'node_modules', 'cldr-numbers-full', 'main');
  const cldrCorePath = path.join(__dirname, 'node_modules', 'cldr-core', 'supplemental');

  // Check if packages are installed
  if (!fs.existsSync(cldrDatesPath)) {
    console.error('ERROR: cldr-dates-full not found. Please run: npm install cldr-dates-full --save-dev');
    process.exit(1);
  }

  if (!fs.existsSync(cldrNumbersPath)) {
    console.error('ERROR: cldr-numbers-full not found. Please run: npm install cldr-numbers-full --save-dev');
    process.exit(1);
  }

  if (!fs.existsSync(cldrCorePath)) {
    console.error('ERROR: cldr-core not found. Please run: npm install cldr-core --save-dev');
    process.exit(1);
  }

  // Load numbering systems data (for digit conversion)
  const numberingSystemsPath = path.join(cldrCorePath, 'numberingSystems.json');
  const numberingSystemsData = JSON.parse(fs.readFileSync(numberingSystemsPath, 'utf8')).supplemental.numberingSystems;

  // Prepare output directory
  const dynamicLangPath = path.join(distPath, 'dynamic_lang');
  if (!fs.existsSync(dynamicLangPath)) {
    fs.mkdirSync(dynamicLangPath, { recursive: true });
  }

  // Get list of all locales
  const locales = fs.readdirSync(cldrDatesPath).filter(dir => {
    const stat = fs.statSync(path.join(cldrDatesPath, dir));
    return stat.isDirectory();
  });

  console.log(`Found ${locales.length} locales in CLDR data`);

  let successCount = 0;
  let failCount = 0;

  // Process each locale
  locales.forEach(locale => {
    try {
      // Load data for this locale
      const caGregorianPath = path.join(cldrDatesPath, locale, 'ca-gregorian.json');
      const dateFieldsPath = path.join(cldrDatesPath, locale, 'dateFields.json');
      const numbersPath = path.join(cldrNumbersPath, locale, 'numbers.json');

      if (!fs.existsSync(caGregorianPath) || !fs.existsSync(dateFieldsPath)) {
        return;
      }

      const caGregorian = JSON.parse(fs.readFileSync(caGregorianPath, 'utf8'));
      const dateFields = JSON.parse(fs.readFileSync(dateFieldsPath, 'utf8'));
      const numbersData = fs.existsSync(numbersPath) ?
        JSON.parse(fs.readFileSync(numbersPath, 'utf8')) : null;

      // Extract data from nested structure
      const localeData = caGregorian.main[locale];
      const dateFieldsData = dateFields.main[locale].dates.fields;
      const numbersLocaleData = numbersData?.main[locale];

      if (!localeData || !localeData.dates || !localeData.dates.calendars || !localeData.dates.calendars.gregorian) {
        return;
      }

      const gregorian = localeData.dates.calendars.gregorian;

      // Extract meridiem with all variants (wide, abbreviated, narrow)
      const meridiemVariants = extractMeridiemVariants(gregorian);

      // Extract month names with all variants
      const monthsData = extractMonthsWithVariants(gregorian);

      // CRITICAL FIX: Apply month variant filtering to remove ambiguous short forms
      // This prevents "11", "J", "с" from causing false matches
      const filteredMonthsData = monthsData ? {
        combined: monthsData.combined.map(monthString => filterMonthVariants(monthString))
      } : null;

      // Extract date format ORDER (y|M|d style)
      const dateFormatOrder = extractDateFormatOrder(gregorian);

      // Extract base keywords (without locale field yet)
      /** @type {LocaleKeywords} */
      const baseKeywords = {
        // Special keywords from dateFields
        today: dateFieldsData?.day?.['relative-type-0'] || null,
        tomorrow: dateFieldsData?.day?.['relative-type-1'] || null,
        yesterday: dateFieldsData?.day?.['relative-type--1'] || null,

        // Unit keywords (both singular and plural forms)
        day: extractUnitKeywords(dateFieldsData?.day),
        week: extractUnitKeywords(dateFieldsData?.week),

        // AM/PM with all variants (pipe-separated)
        meridiem: meridiemVariants,

        // Number system info
        usesLatinNumbers: !numbersLocaleData ||
          numbersLocaleData.numbers?.defaultNumberingSystem === 'latn',
        numberingDigits: extractNumberingDigits(numbersLocaleData, numberingSystemsData),

        // Date format ORDER ONLY (e.g., "y|M|d" or "M|d|y")
        dateFormats: dateFormatOrder,

        // Time formats (for parsing time)
        timeFormats: {
          short: gregorian.timeFormats?.short || null
        },

        // Extract time separator and 24-hour format info
        timeSeparator: extractTimeSeparator(gregorian.timeFormats?.short),
        uses24Hour: detectUses24Hour(gregorian.timeFormats?.short, gregorian.dayPeriods),

        // Month names with all variants (pipe-separated, FILTERED)
        months: filteredMonthsData
      };

      // Apply manual overrides for specific locales
      const finalKeywords = applyManualOverrides(locale, baseKeywords);

      // Register all aliases for this locale
      const aliases = getLocaleAliases(locale);

      // Write JSON file for each alias with CORRECT locale field
      // IMPORTANT: Each file must have its own filename as the locale value
      aliases.forEach(aliasLocale => {
        const keywordsForAlias = {
          locale: aliasLocale,  // Use the alias name, not the source CLDR locale
          ...finalKeywords
        };
        const outputPath = path.join(dynamicLangPath, `${aliasLocale}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(keywordsForAlias, null, 2), 'utf8');
      });

      successCount++;

    } catch (error) {
      console.warn(`Warning: Failed to process locale ${locale}:`, error.message);
      failCount++;
    }
  });

  console.log(`Date keywords extraction completed: ${successCount} locales succeeded, ${failCount} failed`);
  console.log(`Total JSON files created in dynamic_lang/`);
}

/**
 * Extract date format token ORDER from CLDR pattern
 * Extracts only the ORDER of y/M/d tokens, not the full pattern
 * 
 * Examples:
 *   "yy.MM.dd" → "y|M|d"
 *   "dd/MM/yyyy" → "d|M|y"
 *   "MM-dd-yy" → "M|d|y"
 */
function extractDateFormatOrder(gregorian) {
  if (!gregorian.dateFormats || !gregorian.dateFormats.short) {
    return 'y|M|d'; // Default fallback
  }

  const pattern = gregorian.dateFormats.short;

  // Find positions of y, M, d tokens
  const tokens = [];

  // Check for y (year)
  const yMatch = pattern.match(/y+/);
  if (yMatch) {
    tokens.push({ token: 'y', index: yMatch.index });
  }

  // Check for M (month)
  const mMatch = pattern.match(/M+/);
  if (mMatch) {
    tokens.push({ token: 'M', index: mMatch.index });
  }

  // Check for d (day)
  const dMatch = pattern.match(/d+/);
  if (dMatch) {
    tokens.push({ token: 'd', index: dMatch.index });
  }

  // Sort by position in pattern
  tokens.sort((a, b) => a.index - b.index);

  // Return tokens joined with |
  return tokens.map(t => t.token).join('|') || 'y|M|d';
}

/**
 * Extract meridiem variants (AM/PM) from CLDR data
 * Collects wide, abbreviated, and narrow forms from both format and stand-alone contexts
 * Returns: { am: "AM|a.m.|a", pm: "PM|p.m.|p" }
 */
function extractMeridiemVariants(gregorian) {
  if (!gregorian.dayPeriods) {
    return null;
  }

  const dayPeriods = gregorian.dayPeriods;
  const amVariants = new Set();
  const pmVariants = new Set();

  // Check both format and stand-alone contexts
  ['format', 'stand-alone'].forEach(context => {
    if (!dayPeriods[context]) return;

    // Check all widths: wide, abbreviated, narrow
    ['wide', 'abbreviated', 'narrow'].forEach(width => {
      if (!dayPeriods[context][width]) return;

      const formatAm = dayPeriods[context][width]?.am;
      const formatPm = dayPeriods[context][width]?.pm;

      if (formatAm) amVariants.add(formatAm);
      if (formatPm) pmVariants.add(formatPm);
    });
  });

  // Special check for stand-alone context (may be stored differently)
  ['wide', 'abbreviated', 'narrow'].forEach(width => {
    const standaloneAm = dayPeriods['stand-alone']?.[width]?.am;
    const standalonePm = dayPeriods['stand-alone']?.[width]?.pm;

    if (standaloneAm) amVariants.add(standaloneAm);
    if (standalonePm) pmVariants.add(standalonePm);
  });

  return {
    am: amVariants.size > 0 ? Array.from(amVariants).join('|') : null,
    pm: pmVariants.size > 0 ? Array.from(pmVariants).join('|') : null
  };
}

/**
 * Extract month names with all variants
 * Collects wide and abbreviated forms and joins with "|"
 * Example: ["January|Jan|1월", "February|Feb|2월", ...]
 */
function extractMonthsWithVariants(gregorian) {
  if (!gregorian.months) {
    return null;
  }

  const monthsWide = gregorian.months.format?.wide;
  const monthsAbbr = gregorian.months.format?.abbreviated;
  const monthsNarrow = gregorian.months.format?.narrow;

  if (!monthsWide) {
    return null;
  }

  // Build combined month names
  const combinedMonths = [];

  for (let i = 1; i <= 12; i++) {
    const variants = new Set();

    // Add wide form
    if (monthsWide[i]) {
      variants.add(monthsWide[i]);
    }

    // Add abbreviated form (if different from wide)
    if (monthsAbbr && monthsAbbr[i]) {
      variants.add(monthsAbbr[i]);
    }

    // Add narrow form (if different)
    if (monthsNarrow && monthsNarrow[i]) {
      variants.add(monthsNarrow[i]);
    }

    combinedMonths.push(Array.from(variants).join('|'));
  }

  return {
    combined: combinedMonths
  };
}

/**
 * CRITICAL: Filter out ambiguous month variants
 * 
 * Remove variants that are too short or could cause false matches:
 * - Pure numbers (e.g., "1", "11") - too ambiguous, matches any "1" in text
 * - Single letters (e.g., "J", "F", "M") - matches too easily
 * 
 * Examples:
 *   "tháng 11|thg 11|11" → "tháng 11|thg 11" (remove "11")
 *   "January|Jan|J" → "January|Jan" (remove "J")
 *   "серпня|серп.|с" → "серпня|серп." (remove "с")
 * 
 * This prevents false matches like:
 * - "Just 1 day" being parsed as January
 * - "15일 전" being parsed with "1" as month
 */
function filterMonthVariants(monthString) {
  const variants = monthString.split('|');
  
  const filtered = variants.filter(variant => {
    const trimmed = variant.trim();
    
    // Remove pure numbers (e.g., "1", "11")
    // "tháng 11|thg 11|11" → remove "11"
    if (/^\d+$/.test(trimmed)) {
      return false;
    }
    
    // Remove single letters (e.g., "J", "F", "M")
    // "January|Jan|J" → remove "J"
    // These are too ambiguous and cause false matches
    if (trimmed.length === 1) {
      return false;
    }
    
    // Keep variants with 2+ characters that aren't pure numbers
    return true;
  });
  
  // Return filtered variants joined with |
  // If all variants were filtered out, return the first one as fallback
  return filtered.length > 0 ? filtered.join('|') : variants[0];
}

// Helper: Extract unit keywords with ALL plural forms from CLDR
// Returns: { singular: "day", plural: "days|дней|дня", usesArticle: false }
//
// CLDR provides multiple plural categories based on language rules:
// - count-zero: for 0 (Arabic, etc.)
// - count-one: for 1 (most languages)
// - count-two: for 2 (Arabic, etc.)
// - count-few: for 2-4 (Slavic languages like Russian, Polish)
// - count-many: for 5+ (Slavic languages)
// - count-other: default plural form (English uses this for all plurals)
//
// Slavic languages example (Russian):
// - "1 неделю назад" (count-one: accusative singular)
// - "2 недели назад" (count-few: genitive singular)
// - "5 недель назад" (count-many: genitive plural)
// - "48 недель назад" (count-many: genitive plural)
//
// By extracting ALL forms, we can recognize any number's format!
function extractUnitKeywords(fieldData) {
  if (!fieldData || !fieldData['relativeTime-type-past']) {
    return null;
  }

  const pastObj = fieldData['relativeTime-type-past'];

  // All possible CLDR plural categories
  const countCategories = [
    'count-zero',
    'count-one',
    'count-two',
    'count-few',
    'count-many',
    'count-other'
  ];

  // Extract unit word that comes AFTER {0} in template
  const extractUnit = (template) => {
    if (!template) return null;

    const parts = template.split(/\{0\}/);
    if (parts.length < 2) return null;

    const afterPlaceholder = parts[1].trim();
    if (!afterPlaceholder) return null;

    // Get first word after {0}
    const words = afterPlaceholder.split(/\s+/);
    return words[0] || null;
  };

  // Collect all unique unit forms
  const singularForms = new Set();
  const pluralForms = new Set();
  let usesArticle = false;

  // Iterate through all count categories
  for (const category of countCategories) {
    const templateKey = `relativeTimePattern-${category}`;
    const template = pastObj[templateKey];

    if (!template) continue;

    // Extract unit word
    const unit = extractUnit(template);
    if (!unit) continue;

    // Categorize as singular or plural
    if (category === 'count-one') {
      singularForms.add(unit);
      
      // Check if "a" article is used (only check count-one)
      if (!usesArticle) {
        usesArticle = /\ba\s+\{0\}/i.test(template);
      }
    } else {
      // All other categories are plural forms
      pluralForms.add(unit);
    }
  }

  // Fallback: if no forms found, return null
  if (singularForms.size === 0 && pluralForms.size === 0) {
    return null;
  }

  // Convert Sets to pipe-separated strings
  // Sort alphabetically for consistency
  const singularStr = Array.from(singularForms).sort().join('|') || null;
  const pluralStr = Array.from(pluralForms).sort().join('|') || null;

  return {
    singular: singularStr,
    // If no singular form, use plural as fallback
    // If no plural form, use singular as fallback
    plural: pluralStr || singularStr,
    usesArticle: usesArticle
  };
}

// Helper: Extract time separator from time format
function extractTimeSeparator(timeFormat) {
  if (!timeFormat) {
    return ':'; // Default
  }

  // Check for common separators
  if (timeFormat.includes('.')) return '.';
  if (timeFormat.includes(':')) return ':';

  return ':'; // Default fallback
}

// Helper: Detect if locale uses 24-hour format
function detectUses24Hour(timeFormat, dayPeriods) {
  if (!timeFormat) {
    return true; // Default to 24-hour
  }

  // Check if format contains 'H' or 'k' (24-hour) vs 'h' or 'K' (12-hour)
  const has24HourMarker = /[Hk]/.test(timeFormat);
  const has12HourMarker = /[hK]/.test(timeFormat);

  // Also check if AM/PM markers are present in format
  const hasAmPmInFormat = /a/.test(timeFormat) || /b/.test(timeFormat) || /B/.test(timeFormat);

  // If dayPeriods exist and format uses 12-hour, it's not 24-hour
  if (has12HourMarker || hasAmPmInFormat) {
    return false;
  }

  return has24HourMarker || true; // Default to 24-hour if unclear
}

// Helper: Extract numbering system digits with improved Unicode handling
function extractNumberingDigits(numbersLocaleData, numberingSystemsData) {
  if (!numbersLocaleData || !numberingSystemsData) {
    return null;
  }
  
  const defaultSystem = numbersLocaleData.numbers?.defaultNumberingSystem;
  
  if (!defaultSystem || defaultSystem === 'latn') {
    return null; // Uses standard Latin digits
  }
  
  const systemInfo = numberingSystemsData[defaultSystem];
  
  if (!systemInfo) {
    console.warn(`Warning: Numbering system '${defaultSystem}' not found in supplemental data`);
    return null;
  }
  
  // Check if it's a numeric system
  const systemType = systemInfo.type || systemInfo._type;
  if (systemType !== 'numeric') {
    console.warn(`Warning: Numbering system '${defaultSystem}' is not numeric type (${systemType})`);
    return null;
  }
  
  // Get digits string
  const digits = systemInfo.digits || systemInfo._digits;
  
  if (!digits) {
    console.warn(`Warning: No digits found for numbering system '${defaultSystem}'`);
    return null;
  }
  
  // Validate: should be exactly 10 characters (0-9)
  // Use proper Unicode handling with spread operator
  const digitArray = [...digits];
  if (digitArray.length !== 10) {
    console.warn(`Warning: Invalid digit count for '${defaultSystem}': expected 10, got ${digitArray.length}`);
    console.warn(`  Digits: ${digits}`);
    return null;
  }
  
  // CRITICAL FIX: Convert to regex pattern format: "0|1|2|3|4|5|6|7|8|9"
  // This allows using it in regex patterns
  const pattern = digitArray.join('|');
  
  return pattern;
}

/**
 * Apply manual overrides for specific locales
 * 
 * Some CLDR data may be incomplete or have variants that need to be added
 *
 * WHY MANUAL OVERRIDES ARE NEEDED:
 * 1. Colloquial vs Literary language: CLDR records formal/literary forms,
 *    but real software UIs use colloquial expressions
 * 2. Regional variations: Same language may have different words in different regions
 * 3. Historical word borrowing: Languages may have multiple words for same concept
 *    from different origins (native, borrowed from other languages)
 * 4. Digital interface conventions: Modern UIs often omit punctuation marks
 *    that appear in formal written forms (e.g., periods in abbreviations)
 * 
 * @param {string} locale - Locale code (e.g., 'es', 'bn', 'hi')
 * @param {LocaleKeywords} keywords - Base keywords extracted from CLDR
 * @returns {LocaleKeywords} Modified keywords with manual overrides applied
 */
function applyManualOverrides(locale, keywords) {
  // Extract base locale (e.g., 'es' from 'es-MX', 'bn' from 'bn-IN')
  const baseLocale = locale.split('-')[0];
  
  // Ukrainian: Add "Вчора" variant for yesterday
  if (baseLocale === 'uk' && keywords.yesterday) {
    if (!keywords.yesterday.includes('Вчора')) {
      keywords.yesterday = 'Вчора|' + keywords.yesterday;
    }
  }
  
  // Hindi: Add colloquial "हफ़्ता/हफ़्ते" for week
  if (baseLocale === 'hi' && keywords.week) {
    if (keywords.week.singular && !keywords.week.singular.includes('हफ़्ता')) {
      keywords.week.singular = keywords.week.singular + '|हफ़्ता';
    }
    if (keywords.week.plural && !keywords.week.plural.includes('हफ़्ते')) {
      keywords.week.plural = keywords.week.plural + '|हफ़्ते';
    }
  }
  
  // Bengali: Add shortened month abbreviations without visarga (ঃ)
  if (baseLocale === 'bn' && keywords.months) {
    const bnMonthAdditions = [
      'জানু', 'ফেব', null, null, null, null,
      'জুল', 'আগ', 'সে', 'অক্টো', 'নভে', 'ডি'
    ];
    
    keywords.months.combined = keywords.months.combined.map((monthStr, index) => {
      const addition = bnMonthAdditions[index];
      if (addition && !monthStr.split('|').includes(addition)) {
        return monthStr + '|' + addition;
      }
      return monthStr;
    });
  }
  
  // Spanish: Add month abbreviations without period
  if (baseLocale === 'es' && keywords.months) {
    const esMonthAdditions = [
      'ene', 'feb', 'mar', 'abr', null, 'jun',
      'jul', 'ago', null, 'oct', 'nov', 'dic'
    ];
    
    keywords.months.combined = keywords.months.combined.map((monthStr, index) => {
      const addition = esMonthAdditions[index];
      if (addition && !monthStr.split('|').includes(addition)) {
        return monthStr + '|' + addition;
      }
      return monthStr;
    });
  }
  
  return keywords;
}

/**
 * CRITICAL FIX: Check if locale subtag is a script code
 * 
 * Script codes are 4 letters with first letter capitalized: Latn, Deva, Arab, Cyrl, Hans, Hant, etc.
 * Region codes are 2 letters, all uppercase: US, GB, CN, TW, KR, etc.
 * 
 * Examples:
 *   isScriptCode('Latn') → true
 *   isScriptCode('Deva') → true
 *   isScriptCode('CN') → false (region)
 *   isScriptCode('IN') → false (region)
 */
function isScriptCode(subtag) {
  // Script codes: exactly 4 characters, first uppercase, rest lowercase
  return /^[A-Z][a-z]{3}$/.test(subtag);
}

/**
 * Get all aliases for a locale
 * 
 * CRITICAL FIX: Do NOT create base locale alias for script variants!
 * 
 * Examples:
 *   'hi' → ['hi']                    ✅ No alias needed
 *   'hi-Latn' → ['hi-Latn']          ✅ Keep script variant separate
 *   'hi-IN' → ['hi-IN', 'hi']        ✅ Regional variant can alias to base
 *   'zh-Hans' → ['zh-Hans']          ✅ Keep script variant separate
 *   'zh-CN' → ['zh-CN'] (special)    ✅ Handled by LOCALE_MAPPING
 */
function getLocaleAliases(cldrLocale) {
  const aliases = [cldrLocale];

  // Add reverse mappings from LOCALE_MAPPING
  for (const [htmlLang, cldrLang] of Object.entries(LOCALE_MAPPING)) {
    if (cldrLang === cldrLocale) {
      aliases.push(htmlLang);
    }
  }

  // Check if this locale has a subtag (after '-')
  if (cldrLocale.includes('-')) {
    const parts = cldrLocale.split('-');
    const baseLocale = parts[0];
    const subtag = parts[1];

    // CRITICAL: Only add base locale alias if subtag is NOT a script code
    // This prevents hi-Latn from overwriting hi.json
    if (!isScriptCode(subtag)) {
      if (!aliases.includes(baseLocale)) {
        aliases.push(baseLocale);
      }
    } else {
      // Log script variants for debugging
      console.log(`  Note: ${cldrLocale} is a script variant, not creating base locale alias`);
    }
  }

  return aliases;
}
// --- End CLDR Date Keywords Extraction ---

// Perform clean before build
cleanDist();

const buildOptions = {
  entryPoints: ['src/container/container_manager.ts'],
  bundle: true,
  outfile: 'dist/bundled_fgt.js',
  format: 'iife',
  globalName: 'FancyGST',
  platform: 'browser',
  target: 'es2020',

  sourcemap: !isMinified,
  minify: isMinified,

  define: {
    'process.env.APP_VERSION': JSON.stringify(version),
  },
};

// Run in watch mode or single build
if (isWatch) {
  esbuild.context(buildOptions).then(ctx => {
    ctx.watch();
    console.log('Watching for file changes...');
    copyAdditionalFiles();
    extractDateKeywords();
    updateManifestVersion();
  }).catch(() => process.exit(1));
} else {
  esbuild.build(buildOptions).then(() => {
    console.log('Build completed successfully');
    copyAdditionalFiles();
    extractDateKeywords();
    updateManifestVersion();
  }).catch(() => process.exit(1));
}

// Function to copy additional assets
function copyAdditionalFiles() {
  console.log('Copying additional assets...');

  // Copy CSS files
  const cssSrc = path.join(__dirname, 'css');
  const cssDest = path.join(distPath, 'css');
  if (fs.existsSync(cssSrc)) {
    copySync(cssSrc, cssDest);
    console.log('Copied css/**/* to dist/css');
  } else {
    console.warn('Warning: css folder not found.');
  }

  // Copy bundles
  const bundlesSrc = path.join(__dirname, 'bundles');
  const bundlesDest = path.join(distPath, 'bundles');
  if (fs.existsSync(bundlesSrc)) {
    copySync(bundlesSrc, bundlesDest);
    console.log('Copied bundles/**/* to dist/bundles');
  } else {
    console.warn('Warning: bundles folder not found.');
  }

  // Copy icon files
  ['16px.png', '48px.png', '128px.png'].forEach(iconFile => {
    const iconSrc = path.join(__dirname, iconFile);
    const iconDest = path.join(distPath, iconFile);
    if (fs.existsSync(iconSrc)) {
      fs.copyFileSync(iconSrc, iconDest);
    }
  });
  console.log('Copied icon files');
}