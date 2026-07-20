// Validates regions/*.json integrity. Run: npm run validate:regions
// Checks: global id uniqueness, key === id, parent exists, coordinate ranges,
// and that the src/regions.js loader list matches the files on disk exactly once each.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const regionsDir = join(root, 'regions');

const errors = [];

/** @type {Map<string, {file: string, entry: Record<string, unknown>}>} */
const byId = new Map();
const files = readdirSync(regionsDir).filter((f) => f.endsWith('.json')).sort();

for (const file of files) {
  let data;
  try {
    data = JSON.parse(readFileSync(join(regionsDir, file), 'utf8'));
  } catch (err) {
    errors.push(`${file}: invalid JSON — ${err instanceof Error ? err.message : String(err)}`);
    continue;
  }
  for (const [key, entry] of Object.entries(data)) {
    if (entry.id !== key) {
      errors.push(`${file}: key "${key}" !== id "${entry.id}"`);
    }
    const seen = byId.get(key);
    if (seen) {
      errors.push(
        `duplicate id "${key}" in ${file} (parent: ${entry.parent}) and ${seen.file} (parent: ${seen.entry.parent}) — later file silently overwrites the earlier one in the tree`
      );
    } else {
      byId.set(key, { file, entry });
    }
    const c = entry.coordinates;
    const coordsOk =
      Array.isArray(c) && c.length === 2 &&
      typeof c[0] === 'number' && typeof c[1] === 'number' &&
      c[0] >= -90 && c[0] <= 90 && c[1] >= -180 && c[1] <= 180;
    if (!coordsOk) {
      errors.push(`${file}: "${key}" has invalid coordinates ${JSON.stringify(c)} (expected [lat, lon])`);
    }
  }
}

// Parent links: a missing parent makes the node (and its whole subtree) silently
// disappear from the rendered tree in src/tree.js.
for (const [key, { file, entry }] of byId) {
  if (entry.parent && !byId.has(entry.parent)) {
    errors.push(`${file}: "${key}" has dangling parent "${entry.parent}" — node is invisible in the tree`);
  }
}

// Loader list must reference each existing file exactly once.
const loaderSrc = readFileSync(join(root, 'src', 'regions.js'), 'utf8');
const listed = [...loaderSrc.matchAll(/'([\w-]+\.json)'/g)].map((m) => m[1]);
for (const file of new Set(listed)) {
  const n = listed.filter((f) => f === file).length;
  if (n > 1) errors.push(`src/regions.js: "${file}" listed ${n} times — later load overwrites earlier ids`);
  if (!files.includes(file)) errors.push(`src/regions.js: "${file}" listed but missing from regions/`);
}
for (const file of files) {
  if (!listed.includes(file)) errors.push(`src/regions.js: "${file}" exists in regions/ but is not loaded`);
}

if (errors.length > 0) {
  console.error(`validate-regions: ${errors.length} error(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`validate-regions: OK — ${byId.size} unique region ids across ${files.length} files`);
