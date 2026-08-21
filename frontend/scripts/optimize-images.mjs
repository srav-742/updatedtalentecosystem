/**
 * Image Optimization Script
 * 
 * Converts PNG/JPG images in /public to WebP format alongside the originals.
 * Does NOT delete or replace originals — creates .webp copies for faster loading.
 * 
 * Usage: node scripts/optimize-images.mjs
 * 
 * Requires: npm install -D sharp
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const QUALITY = 85;           // WebP quality (80-90 is sweet spot)
const MAX_WIDTH = 1920;       // Max width — don't upscale, only downscale
const SKIP_IF_EXISTS = true;  // Skip if .webp already exists

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg'];

async function optimizeImages() {
  console.log('\n🖼️  Image Optimization Script');
  console.log('━'.repeat(50));
  console.log(`📁 Source: ${PUBLIC_DIR}`);
  console.log(`📐 Max width: ${MAX_WIDTH}px`);
  console.log(`🎨 WebP quality: ${QUALITY}\n`);

  const files = fs.readdirSync(PUBLIC_DIR, { withFileTypes: true });
  const imageFiles = files.filter(
    (f) => f.isFile() && IMAGE_EXTENSIONS.includes(path.extname(f.name).toLowerCase())
  );

  if (imageFiles.length === 0) {
    console.log('ℹ️  No images found to optimize.\n');
    return;
  }

  let optimized = 0;
  let skipped = 0;
  let totalSaved = 0;

  for (const file of imageFiles) {
    const inputPath = path.join(PUBLIC_DIR, file.name);
    const baseName = path.parse(file.name).name;
    const outputPath = path.join(PUBLIC_DIR, `${baseName}.webp`);

    // Skip if WebP already exists
    if (SKIP_IF_EXISTS && fs.existsSync(outputPath)) {
      console.log(`⏭️  Skipped (exists): ${file.name}`);
      skipped++;
      continue;
    }

    try {
      const inputStats = fs.statSync(inputPath);
      const inputSize = inputStats.size;

      await sharp(inputPath)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 4 })
        .toFile(outputPath);

      const outputStats = fs.statSync(outputPath);
      const outputSize = outputStats.size;
      const saved = inputSize - outputSize;
      const pct = ((saved / inputSize) * 100).toFixed(1);

      totalSaved += saved;
      optimized++;

      console.log(
        `✅ ${file.name} → ${baseName}.webp  |  ${formatBytes(inputSize)} → ${formatBytes(outputSize)}  (${pct}% smaller)`
      );
    } catch (err) {
      console.error(`❌ Failed: ${file.name} — ${err.message}`);
    }
  }

  console.log('\n' + '━'.repeat(50));
  console.log(`📊 Results: ${optimized} optimized, ${skipped} skipped`);
  console.log(`💾 Total savings: ${formatBytes(totalSaved)}\n`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

optimizeImages().catch(console.error);
