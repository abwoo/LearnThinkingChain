/**
 * Package Release Script
 * 
 * Creates a production-ready .zip file of the extension
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist/extension');
const releaseDir = path.resolve(rootDir, 'release');

// Read package.json for version
const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(rootDir, 'package.json'), 'utf-8')
);
const version = packageJson.version || '1.0.0';
const zipName = `LearnThinkingChain-v${version}.zip`;
const zipPath = path.resolve(releaseDir, zipName);

// Ensure release directory exists
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

// Check if dist directory exists
if (!fs.existsSync(distDir)) {
  console.error(`Error: Build directory not found at ${distDir}`);
  console.error('Please run "npm run build" first');
  process.exit(1);
}

// Create zip file
const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

output.on('close', () => {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`✅ Release package created: ${zipName}`);
  console.log(`   Size: ${sizeMB} MB`);
  console.log(`   Location: ${zipPath}`);
});

archive.on('error', (err) => {
  console.error('Error creating zip:', err);
  process.exit(1);
});

archive.pipe(output);

// Add extension files
archive.directory(distDir, false);

// Finalize
archive.finalize();
