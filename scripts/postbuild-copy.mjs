import { cpSync, mkdirSync, existsSync } from 'node:fs';
import path, { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.resolve(projectRoot, 'dist');

if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });

const filesToCopy = ['room.glb', 'ghost.glb', 'style.css'];

for (const file of filesToCopy) {
  const src = join(projectRoot, file);
  const dest = join(distDir, file);
  try {
    cpSync(src, dest, { recursive: false });
    // eslint-disable-next-line no-console
    console.log(`[postbuild] Copied ${file} -> dist/`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[postbuild] Skipped ${file}:`, err?.message || err);
  }
}


