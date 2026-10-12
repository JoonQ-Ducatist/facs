import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(projectRoot, 'dist/index.html');
const outputPath = resolve(projectRoot, 'dist/ko/index.html');
const replacements = [
  [/<html lang="en">/, '<html lang="ko">'],
  [/<meta name="description" content="[^"]*"\s*\/>/, '<meta name="description" content="사진과 오늘의 룩에 대한 사람들의 주관적 피드백을 안전하고 투명하게 확인하는 FACt.Smack 커뮤니티입니다." />'],
  [/<link rel="canonical" href="[^"]*"\s*\/>/, '<link rel="canonical" href="https://www.factsmack.com/ko/" />'],
  [/<meta property="og:locale" content="[^"]*"\s*\/>/, '<meta property="og:locale" content="ko_KR" />'],
  [/<meta property="og:locale:alternate" content="[^"]*"\s*\/>/, '<meta property="og:locale:alternate" content="en_US" />'],
  [/<meta property="og:title" content="[^"]*"\s*\/>/, '<meta property="og:title" content="FACt.Smack | 사람들의 평가를 데이터로" />'],
  [/<meta property="og:description" content="[^"]*"\s*\/>/, '<meta property="og:description" content="사진과 오늘의 룩에 대한 사람들의 주관적 피드백을 안전하고 투명하게 확인하는 FACt.Smack 커뮤니티입니다." />'],
  [/<meta property="og:url" content="[^"]*"\s*\/>/, '<meta property="og:url" content="https://www.factsmack.com/ko/" />'],
  [/<meta name="twitter:title" content="[^"]*"\s*\/>/, '<meta name="twitter:title" content="FACt.Smack | 사람들의 평가를 데이터로" />'],
  [/<meta name="twitter:description" content="[^"]*"\s*\/>/, '<meta name="twitter:description" content="사진과 오늘의 룩에 대한 사람들의 주관적 피드백을 안전하고 투명하게 확인하는 FACt.Smack 커뮤니티입니다." />'],
];

let html = await readFile(sourcePath, 'utf8');
for (const [pattern, replacement] of replacements) {
  if (!pattern.test(html)) throw new Error(`Could not localize built HTML for pattern ${pattern}`);
  html = html.replace(pattern, replacement);
}
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, html);
