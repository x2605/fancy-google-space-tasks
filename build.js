// build.js
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
  'zh-HK': 'zh-Hant-HK',
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
  
  // Load numberingSystems data
  const numberingSystemsPath = path.join(cldrCorePath, 'numberingSystems.json');
  const numberingSystems = JSON.parse(fs.readFileSync(numberingSystemsPath, 'utf8')).supplemental.numberingSystems;
  
  // Get list of all available locales from cldr-dates-full
  const locales = fs.readdirSync(cldrDatesPath).filter(item => {
    const itemPath = path.join(cldrDatesPath, item);
    return fs.statSync(itemPath).isDirectory();
  });
  
  console.log(`Found ${locales.length} locales in CLDR data`);
  
  const dynamicLangPath = path.join(distPath, 'dynamic_lang');
  fs.mkdirSync(dynamicLangPath, { recursive: true });
  
  let successCount = 0;
  let failCount = 0;
  
  locales.forEach(locale => {
    try {
      const dateFieldsPath = path.join(cldrDatesPath, locale, 'dateFields.json');
      const caGregorianPath = path.join(cldrDatesPath, locale, 'ca-gregorian.json');
      const numbersPath = path.join(cldrNumbersPath, locale, 'numbers.json');
      
      if (!fs.existsSync(dateFieldsPath)) {
        return; // Skip if no dateFields
      }
      
      const dateFieldsData = JSON.parse(fs.readFileSync(dateFieldsPath, 'utf8'));
      const fields = dateFieldsData.main[locale]?.dates?.fields;
      
      if (!fields) {
        return;
      }
      
      // Extract keywords
      const keywords = {
        locale: locale,
        today: fields.day?.['relative-type-0'] || null,
        tomorrow: fields.day?.['relative-type-1'] || null,
        yesterday: fields.day?.['relative-type--1'] || null,
        day: extractUnitKeyword(fields.day),
        week: extractUnitKeyword(fields.week),
        meridiem: { am: null, pm: null },
        usesLatinNumbers: true,
        numberingDigits: null
      };
      
      // Extract AM/PM from ca-gregorian
      if (fs.existsSync(caGregorianPath)) {
        try {
          const caData = JSON.parse(fs.readFileSync(caGregorianPath, 'utf8'));
          const dayPeriods = caData.main[locale]?.dates?.calendars?.gregorian?.dayPeriods?.format?.wide;
          if (dayPeriods) {
            keywords.meridiem.am = dayPeriods.am || null;
            keywords.meridiem.pm = dayPeriods.pm || null;
          }
        } catch (e) {
          // Silently ignore
        }
      }
      
      // Check numbering system
      if (fs.existsSync(numbersPath)) {
        try {
          const numbersData = JSON.parse(fs.readFileSync(numbersPath, 'utf8'));
          const defaultNumberingSystem = numbersData.main[locale]?.numbers?.defaultNumberingSystem;
          
          if (defaultNumberingSystem && defaultNumberingSystem !== 'latn') {
            const system = numberingSystems[defaultNumberingSystem];
            if (system && system._type === 'numeric' && system._digits) {
              keywords.usesLatinNumbers = false;
              keywords.numberingDigits = system._digits;
            }
          }
        } catch (e) {
          // Silently ignore
        }
      }
      
      // Generate JS file with locale aliases
      const aliases = [locale];
      
      // Find all HTML lang codes that map to this CLDR locale
      for (const [htmlLang, cldrLocale] of Object.entries(LOCALE_MAPPING)) {
        if (cldrLocale === locale) {
          aliases.push(htmlLang);
        }
      }
      
      const jsContent = `// Auto-generated date keywords for locale: ${locale}
// Generated at build time from CLDR data
(function() {
  var keywords = ${JSON.stringify(keywords, null, 2)};
  window.FGT_DATE_KEYWORDS = window.FGT_DATE_KEYWORDS || {};
  
  // Register keywords for all aliases
  var aliases = ${JSON.stringify(aliases)};
  aliases.forEach(function(loc) {
    window.FGT_DATE_KEYWORDS[loc] = keywords;
  });
  
  // Runtime helper: Get keywords with fallback logic
  // Only define once (first loaded locale file will define this)
  if (!window.FGT_GET_LOCALE_KEYWORDS) {
    window.FGT_GET_LOCALE_KEYWORDS = function(locale) {
      // 1. Try exact match (e.g., "pt-BR")
      if (window.FGT_DATE_KEYWORDS[locale]) {
        return window.FGT_DATE_KEYWORDS[locale];
      }
      
      // 2. Try first 2 characters fallback (e.g., "pt-BR" → "pt")
      if (locale && locale.length > 2) {
        var baseLocale = locale.substring(0, 2);
        if (window.FGT_DATE_KEYWORDS[baseLocale]) {
          return window.FGT_DATE_KEYWORDS[baseLocale];
        }
      }
      
      // 3. No fallback - return null to disable date parsing features
      return null;
    };
  }
})();
`;
      
      const outputPath = path.join(dynamicLangPath, `${locale}.js`);
      fs.writeFileSync(outputPath, jsContent, 'utf8');
      successCount++;
      
    } catch (error) {
      console.warn(`Warning: Failed to process locale ${locale}:`, error.message);
      failCount++;
    }
  });
  
  console.log(`Date keywords extraction completed: ${successCount} succeeded, ${failCount} failed`);
}

// Helper: Extract unit keyword by comparing past and future templates
function extractUnitKeyword(fieldData) {
  if (!fieldData || !fieldData['relativeTime-type-past']) {
    return null;
  }
  
  const pastObj = fieldData['relativeTime-type-past'];
  const futureObj = fieldData['relativeTime-type-future'];
  
  // Try different plural forms
  const pastTemplate = pastObj['relativeTimePattern-count-one'] || 
                       pastObj['relativeTimePattern-count-other'] ||
                       null;
  
  const futureTemplate = futureObj?.['relativeTimePattern-count-one'] || 
                         futureObj?.['relativeTimePattern-count-other'] ||
                         null;
  
  if (!pastTemplate) {
    return null;
  }
  
  try {
    // Strategy 1: If we have both past and future, find common part
    if (futureTemplate) {
      const common = findCommonSubstring(pastTemplate, futureTemplate);
      if (common) {
        return common;
      }
    }
    
    // Strategy 2: Extract from past template only
    // Replace {0} with "1"
    let text = pastTemplate.replace(/\{0\}/g, '1');
    
    // Remove all digits
    text = text.replace(/\d+/g, '');
    
    // Remove all whitespace
    text = text.replace(/\s+/g, '');
    
    // Remove common past markers (lowercase comparison)
    const textLower = text.toLowerCase();
    const markers = [
      'ago', 'in', 'within',
      '전', '후', 
      '前', '後',
      'hace', 'atrás', 'dentrodede',
      'ilya', 'dans',
      'vor',
      'atrás', 'em',
      'назад', 'через',
      'yanglalu', 'dalam',
      'fa', 'tra',
      'temu', 'za',
      'önce', 'sonra',
      'trước', 'sau',
      'ที่ผ่านมา', 'ใน',
      'আগে', 'পরে'
    ];
    
    // Find and remove markers
    let result = text;
    for (const marker of markers) {
      const markerLower = marker.toLowerCase();
      const idx = textLower.indexOf(markerLower);
      if (idx !== -1) {
        // Remove the marker from original text (preserving case)
        result = text.substring(0, idx) + text.substring(idx + marker.length);
        break;
      }
    }
    
    result = result.trim();
    
    // If too long, probably failed
    if (result.length > 20 || result.length === 0) {
      return null;
    }
    
    return result;
    
  } catch (e) {
    return null;
  }
}

// Helper: Find common substring between past and future templates
function findCommonSubstring(past, future) {
  // Remove {0} from both
  const p = past.replace(/\{0\}/g, '').trim();
  const f = future.replace(/\{0\}/g, '').trim();
  
  // Find longest common substring
  let longest = '';
  
  for (let i = 0; i < p.length; i++) {
    for (let j = i + 1; j <= p.length; j++) {
      const substr = p.substring(i, j);
      if (f.includes(substr) && substr.length > longest.length) {
        // Filter out pure whitespace or numbers
        if (/\S/.test(substr) && !/^\d+$/.test(substr.trim())) {
          longest = substr;
        }
      }
    }
  }
  
  // Clean up the result
  longest = longest.replace(/\d+/g, '').replace(/\s+/g, '').trim();
  
  return longest.length > 0 && longest.length <= 20 ? longest : null;
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

  // Inject the version string directly into the bundle
  define: {
    'process.env.APP_VERSION': JSON.stringify(version),
  },
};

// Run in watch mode or single build
if (isWatch) {
  esbuild.context(buildOptions).then(ctx => {
    ctx.watch();
    console.log('Watching for file changes...');
    // Initial copy for watch mode
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

  // Copy bundles (linkify, color-thief, etc.)
  const bundlesSrc = path.join(__dirname, 'bundles');
  const bundlesDest = path.join(distPath, 'bundles');
  if (fs.existsSync(bundlesSrc)) {
    copySync(bundlesSrc, bundlesDest);
    console.log('Copied bundles/**/* to dist/bundles');
  } else {
    console.warn('Warning: bundles folder not found.');
  }
  
  // PNG icons
  const pngFiles = ['16px.png', '48px.png', '128px.png'];
  pngFiles.forEach(file => {
    const src = path.join(__dirname, file);
    const dest = path.join(distPath, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`Copied ${file} to dist/${file}`);
    } else {
      console.warn(`Warning: ${file} not found.`);
    }
  });

  // Copy licenses of bundles
  const licensesSrc = path.join(__dirname, 'licenses');
  const licensesDest = path.join(distPath, 'licenses');
  if (fs.existsSync(licensesSrc)) {
    copySync(licensesSrc, licensesDest);
    console.log('Copied licenses/**/* to dist/licenses');
  } else {
    console.warn('Warning: licenses folder not found.');
  }

  // Copy extras
  const extraFiles = ['LICENSE', 'PRIVACY.md'];
  extraFiles.forEach(file => {
    const src = path.join(__dirname, file);
    const dest = path.join(distPath, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`Copied ${file} to dist/${file}`);
    } else {
      console.warn(`Warning: ${file} not found.`);
    }
  });

  console.log('Additional assets copy completed.');
}