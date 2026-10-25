import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localizeSeoHtml } from './localize-seo-html.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(projectRoot, 'dist/index.html');
const outputPath = resolve(projectRoot, 'dist/ko/index.html');
const html = await readFile(sourcePath, 'utf8');
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, localizeSeoHtml(html, 'ko'));
await writeFile(sourcePath, localizeSeoHtml(html, 'en'));
