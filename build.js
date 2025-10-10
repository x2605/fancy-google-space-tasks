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
  const manifestTemplatePath = path.join(__dirname, 'manifest.template.json'); // Changed path
  let manifestContent = fs.readFileSync(manifestTemplatePath, 'utf8'); // Read from template
  const manifest = JSON.parse(manifestContent);
  manifest.version = version; // Update the version field
  fs.writeFileSync(path.join(distPath, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8'); // Write to dist/manifest.json
  console.log('Updated manifest.json with current version and copied to dist');
}
// --- End Version Management ---


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
    updateManifestVersion(); // Ensure manifest is updated on startup for watch mode
  }).catch(() => process.exit(1));
} else {
  esbuild.build(buildOptions).then(() => {
    console.log('Build completed successfully');
    copyAdditionalFiles();
    updateManifestVersion(); // Ensure manifest is updated for single build
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
  
  // PNG icons (assuming they are in the root directory as per manifest)
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