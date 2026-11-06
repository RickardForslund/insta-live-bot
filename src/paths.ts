import path from 'node:path';
import { fileURLToPath } from 'node:url';

// src/paths.ts and dist/paths.js are both one directory below the repo root.
const here = path.dirname(fileURLToPath(import.meta.url));

export const rootDir = path.resolve(here, '..');
export const publicDir = path.join(rootDir, 'public');
export const overlayDir = path.join(publicDir, 'overlay');
export const devHtmlPath = path.join(publicDir, 'dev.html');
