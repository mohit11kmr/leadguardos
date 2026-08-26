import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const forbiddenRules = [
  { scope: /^apps\/web\//, forbidden: [/from ['"].*server\//, /from ['"].*prisma/, /from ['"].*firebase-admin/] },
  { scope: /^packages\//, forbidden: [/from ['"].*react/, /from ['"].*express/, /from ['"].*prisma/, /from ['"].*server\//, /from ['"].*firebase/] },
  { scope: /^apps\/worker\//, forbidden: [/from ['"].*react/, /from ['"].*vite/, /from ['"].*\.tsx['"]/] },
];

function walk(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(entryPath);
    return /\.(ts|tsx|js|jsx|mjs)$/.test(entry.name) ? [entryPath] : [];
  });
}

const violations: string[] = [];
for (const filePath of [...walk(path.join(root, 'packages')), ...walk(path.join(root, 'apps'))]) {
  const relativePath = path.relative(root, filePath).replaceAll(path.sep, '/');
  const rule = forbiddenRules.find((candidate) => candidate.scope.test(relativePath));
  if (!rule) continue;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const pattern of rule.forbidden) {
    if (pattern.test(content)) violations.push(`${relativePath}: forbidden dependency ${pattern}`);
  }
}

if (violations.length > 0) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log('V6 boundary check passed: no forbidden imports detected in new boundaries.');
}
