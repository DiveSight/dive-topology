#!/usr/bin/env node
/**
 * validate-dives.ts
 *
 * Comprehensive validation of the dive seed data:
 *   1. Unique IDs — every dive must have a unique id
 *   2. Region validation — every dive's region.country must match a formal region
 *   3. Marine life tags — every tags.marineLife entry should match a species in the taxonomy
 *
 * Usage:
 *   npx tsx tools/validate-dive-regions.ts
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { connect, disconnect } from '../db/connection.js';
import type { Dive } from '../db/types.js';
import type { Region } from '../db/regions-types.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIVES_PATH = join(__dirname, '../seed-data/dives_2026-02-17.json');
const TAXONOMY_PATH = join(__dirname, '../seed-data/20251110-master-taxonomy.json');

// ─── Types ───────────────────────────────────────────────────────────────

interface TaxonomyEntry {
  id: string;
  meta: {
    name: string;
    alias?: string[];
    tags?: string[];
    [key: string]: any;
  };
  [key: string]: any;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)
      );
    }
  }
  return dp[m][n];
}

function findClosestRegion(country: string, regions: Region[]): Region | null {
  const target = country.toLowerCase();
  let best: Region | null = null;
  let bestScore = Infinity;

  for (const r of regions) {
    if (r.type !== 'country') continue;
    const name = r.name.toLowerCase();

    if (name.includes(target) || target.includes(name)) {
      const score = Math.abs(name.length - target.length);
      if (score < bestScore) { bestScore = score; best = r; }
      continue;
    }

    if (r.aliases) {
      for (const alias of r.aliases) {
        const a = alias.toLowerCase();
        if (a.includes(target) || target.includes(a)) return r;
      }
    }

    const dist = levenshtein(target, name);
    if (dist < bestScore && dist <= 3) { bestScore = dist; best = r; }
  }

  return best;
}

function banner(title: string) {
  console.log('\n' + '═'.repeat(70));
  console.log(`  ${title}`);
  console.log('═'.repeat(70));
}

// ─── Validation 1: Unique IDs ───────────────────────────────────────────

function validateUniqueIds(dives: Dive[]) {
  banner('VALIDATION 1: UNIQUE IDs');

  const idMap = new Map<string, number[]>(); // id -> array of indexes
  for (let i = 0; i < dives.length; i++) {
    const id = dives[i].id;
    if (!id) {
      console.log(`  ⚠️  Dive at index ${i} ("${dives[i].name}") has NO id`);
      continue;
    }
    if (!idMap.has(id)) idMap.set(id, []);
    idMap.get(id)!.push(i);
  }

  const duplicates = [...idMap.entries()].filter(([, idxs]) => idxs.length > 1);

  console.log(`  Total dives:   ${dives.length}`);
  console.log(`  Unique IDs:    ${idMap.size}`);
  console.log(`  Duplicate IDs: ${duplicates.length}`);

  if (duplicates.length > 0) {
    console.log('\n  🚨 DUPLICATE IDs:\n');
    for (const [id, idxs] of duplicates.slice(0, 30)) {
      const names = idxs.map(i => `"${dives[i].name}" (${dives[i].location})`).join(', ');
      console.log(`    "${id}" — appears ${idxs.length}x: ${names}`);
    }
    if (duplicates.length > 30) {
      console.log(`    ... and ${duplicates.length - 30} more`);
    }
  } else {
    console.log('  ✅ All IDs are unique');
  }

  return duplicates.length;
}

// ─── Validation 2: Regions ──────────────────────────────────────────────

function validateRegions(dives: Dive[], allRegions: Region[]) {
  banner('VALIDATION 2: REGIONS');

  const regionsByName = new Map<string, Region>();
  const regionsByAlias = new Map<string, Region>();
  const countriesByName = new Map<string, Region>();

  for (const r of allRegions) {
    regionsByName.set(r.name.toLowerCase(), r);
    if (r.type === 'country') countriesByName.set(r.name.toLowerCase(), r);
    if (r.aliases) {
      for (const alias of r.aliases) regionsByAlias.set(alias.toLowerCase(), r);
    }
  }

  console.log(`  Regions in DB: ${allRegions.length} (${countriesByName.size} countries, ${regionsByAlias.size} aliases)`);

  const missingRegion: Dive[] = [];
  const unmatchedCountries = new Map<string, Dive[]>();
  let valid = 0, aliasMatch = 0;

  for (const dive of dives) {
    if (!dive.region) { missingRegion.push(dive); continue; }
    if (!dive.region.country) { missingRegion.push(dive); continue; }

    const countryLower = dive.region.country.toLowerCase();

    if (countriesByName.has(countryLower)) { valid++; continue; }
    if (regionsByAlias.has(countryLower)) { aliasMatch++; valid++; continue; }
    if (regionsByName.has(countryLower)) { valid++; continue; }

    if (!unmatchedCountries.has(dive.region.country)) unmatchedCountries.set(dive.region.country, []);
    unmatchedCountries.get(dive.region.country)!.push(dive);
  }

  const unmatchedTotal = [...unmatchedCountries.values()].reduce((s, arr) => s + arr.length, 0);

  console.log(`  Valid (exact):       ${valid - aliasMatch}`);
  console.log(`  Valid (alias):       ${aliasMatch}`);
  console.log(`  Missing region:      ${missingRegion.length}`);
  console.log(`  Unmatched country:   ${unmatchedTotal} dives across ${unmatchedCountries.size} countries`);

  if (unmatchedCountries.size > 0) {
    console.log('\n  🚨 UNMATCHED COUNTRIES:\n');
    const sorted = [...unmatchedCountries.entries()].sort((a, b) => b[1].length - a[1].length);
    for (const [country, countryDives] of sorted) {
      const suggestion = findClosestRegion(country, allRegions);
      const hint = suggestion ? ` → did you mean "${suggestion.name}" (${suggestion.id})?` : '';
      console.log(`    "${country}" — ${countryDives.length} dive(s)${hint}`);
      for (const d of countryDives.slice(0, 2)) {
        console.log(`        ${d.id} (${d.name}, ${d.location})`);
      }
      if (countryDives.length > 2) console.log(`        ... and ${countryDives.length - 2} more`);
    }
  }

  if (missingRegion.length > 0) {
    console.log('\n  ⚠️  DIVES WITH NO REGION:\n');
    for (const d of missingRegion.slice(0, 15)) {
      console.log(`    ${d.id} — ${d.name} (${d.location}) [${d.coordinates}]`);
    }
    if (missingRegion.length > 15) console.log(`    ... and ${missingRegion.length - 15} more`);
  }

  return unmatchedTotal + missingRegion.length;
}

// ─── Validation 3: Marine Life Tags ─────────────────────────────────────

function validateMarineLifeTags(dives: Dive[], taxonomy: TaxonomyEntry[]) {
  banner('VALIDATION 3: MARINE LIFE TAGS');

  // Build lookup tables from taxonomy
  // Primary: meta.name (normalized)
  // Secondary: meta.alias entries (normalized)
  // Tertiary (ambiguous): meta.tags entries (normalized)
  const byName = new Map<string, TaxonomyEntry>();
  const byAlias = new Map<string, TaxonomyEntry>();
  const byTag = new Map<string, TaxonomyEntry[]>(); // tags can be shared, so array

  for (const entry of taxonomy) {
    const name = normalize(entry.meta.name);
    byName.set(name, entry);

    if (entry.meta.alias) {
      for (const alias of entry.meta.alias) {
        byAlias.set(normalize(alias), entry);
      }
    }

    if (entry.meta.tags) {
      for (const tag of entry.meta.tags) {
        const t = normalize(tag);
        if (!byTag.has(t)) byTag.set(t, []);
        byTag.get(t)!.push(entry);
      }
    }
  }

  console.log(`  Taxonomy entries:  ${taxonomy.length}`);
  console.log(`  Lookup by name:    ${byName.size}`);
  console.log(`  Lookup by alias:   ${byAlias.size}`);
  console.log(`  Lookup by tag:     ${byTag.size} tag values`);

  // Scan all dive marineLife tags
  const allTagValues = new Set<string>(); // unique raw tag values
  let divesWithML = 0, divesWithoutML = 0;
  const tagUsageCount = new Map<string, number>(); // normalized tag -> count of dives using it

  for (const dive of dives) {
    const ml = dive.tags?.marineLife;
    if (!ml || ml.length === 0) { divesWithoutML++; continue; }
    divesWithML++;
    for (const tag of ml) {
      allTagValues.add(tag);
      const n = normalize(tag);
      tagUsageCount.set(n, (tagUsageCount.get(n) || 0) + 1);
    }
  }

  console.log(`\n  Dives with marineLife tags:    ${divesWithML}`);
  console.log(`  Dives without marineLife tags: ${divesWithoutML}`);
  console.log(`  Unique marineLife tag values:  ${allTagValues.size}`);

  // Classify each unique tag value
  const matched: { tag: string; via: string; entry: string }[] = [];
  const tagOnlyMatch: { tag: string; matchedTags: string[] }[] = [];  // ambiguous
  const unmatched: { tag: string; diveCount: number }[] = [];

  for (const rawTag of allTagValues) {
    const n = normalize(rawTag);
    const count = tagUsageCount.get(n) || 0;

    // 1. Exact name match
    if (byName.has(n)) {
      matched.push({ tag: rawTag, via: 'name', entry: byName.get(n)!.meta.name });
      continue;
    }

    // 2. Alias match
    if (byAlias.has(n)) {
      matched.push({ tag: rawTag, via: 'alias', entry: byAlias.get(n)!.meta.name });
      continue;
    }

    // 3. Pluralization — try removing/adding trailing 's'
    const depluralized = n.endsWith('s') ? n.slice(0, -1) : n + 's';
    if (byName.has(depluralized)) {
      matched.push({ tag: rawTag, via: 'name~plural', entry: byName.get(depluralized)!.meta.name });
      continue;
    }
    if (byAlias.has(depluralized)) {
      matched.push({ tag: rawTag, via: 'alias~plural', entry: byAlias.get(depluralized)!.meta.name });
      continue;
    }

    // 4. Tag-only match (ambiguous — the tag value matches a taxonomy meta.tags entry)
    if (byTag.has(n)) {
      const entries = byTag.get(n)!;
      tagOnlyMatch.push({ tag: rawTag, matchedTags: entries.slice(0, 3).map(e => e.meta.name) });
      continue;
    }

    // 5. No match
    unmatched.push({ tag: rawTag, diveCount: count });
  }

  console.log(`\n  Tag resolution:`);
  console.log(`    Matched (name):          ${matched.filter(m => m.via === 'name').length}`);
  console.log(`    Matched (alias):         ${matched.filter(m => m.via === 'alias').length}`);
  console.log(`    Matched (plural):        ${matched.filter(m => m.via.includes('plural')).length}`);
  console.log(`    Ambiguous (tag-only):     ${tagOnlyMatch.length}`);
  console.log(`    Unmatched:               ${unmatched.length}`);

  // Report ambiguous tag-only matches
  if (tagOnlyMatch.length > 0) {
    console.log('\n  ⚠️  AMBIGUOUS TAG-ONLY MATCHES (tag matches a taxonomy meta.tags, not name/alias):\n');
    for (const { tag, matchedTags } of tagOnlyMatch.slice(0, 20)) {
      const count = tagUsageCount.get(normalize(tag)) || 0;
      console.log(`    "${tag}" (${count} dives) → tag matches species: ${matchedTags.join(', ')}${matchedTags.length < 3 ? '' : '...'}`);
    }
    if (tagOnlyMatch.length > 20) console.log(`    ... and ${tagOnlyMatch.length - 20} more`);
  }

  // Report unmatched
  if (unmatched.length > 0) {
    console.log('\n  🚨 UNMATCHED MARINE LIFE TAGS (no match in taxonomy):\n');
    const sorted = unmatched.sort((a, b) => b.diveCount - a.diveCount);
    for (const { tag, diveCount } of sorted.slice(0, 50)) {
      // Try fuzzy match
      const suggestion = findClosestTaxonomy(tag, taxonomy);
      const hint = suggestion ? ` → closest: "${suggestion.meta.name}"` : '';
      console.log(`    "${tag}" — used in ${diveCount} dive(s)${hint}`);
    }
    if (sorted.length > 50) console.log(`    ... and ${sorted.length - 50} more`);
  }

  return unmatched.length;
}

function findClosestTaxonomy(tag: string, taxonomy: TaxonomyEntry[]): TaxonomyEntry | null {
  const target = normalize(tag);
  let best: TaxonomyEntry | null = null;
  let bestScore = Infinity;

  // Only check a subset for performance — names and aliases
  for (const entry of taxonomy) {
    const name = normalize(entry.meta.name);
    if (name.includes(target) || target.includes(name)) {
      const score = Math.abs(name.length - target.length);
      if (score < bestScore) { bestScore = score; best = entry; }
    }
    if (entry.meta.alias) {
      for (const alias of entry.meta.alias) {
        const a = normalize(alias);
        if (a.includes(target) || target.includes(a)) {
          const score = Math.abs(a.length - target.length);
          if (score < bestScore) { bestScore = score; best = entry; }
        }
      }
    }
  }

  // Only suggest if reasonably close
  if (best && bestScore <= 10) return best;
  return null;
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Dive Data Validator\n');

  // Load dive data
  console.log(`Loading dives from ${DIVES_PATH}...`);
  const dives: Dive[] = JSON.parse(readFileSync(DIVES_PATH, 'utf-8'));
  console.log(`  Loaded ${dives.length} dives`);

  // Load taxonomy
  console.log(`Loading taxonomy from ${TAXONOMY_PATH}...`);
  const taxonomy: TaxonomyEntry[] = JSON.parse(readFileSync(TAXONOMY_PATH, 'utf-8'));
  console.log(`  Loaded ${taxonomy.length} species`);

  // Connect to MongoDB for regions
  console.log('Connecting to MongoDB...');
  const db = await connect();
  const allRegions = await db.collection<Region>('regions').find({}).toArray();
  console.log(`  Found ${allRegions.length} formal regions`);

  // Run validations
  const idErrors = validateUniqueIds(dives);
  const regionErrors = validateRegions(dives, allRegions);
  const mlErrors = validateMarineLifeTags(dives, taxonomy);

  // Final summary
  banner('SUMMARY');
  console.log(`  ID issues:            ${idErrors === 0 ? '✅ none' : `🚨 ${idErrors} duplicate IDs`}`);
  console.log(`  Region issues:        ${regionErrors === 0 ? '✅ none' : `🚨 ${regionErrors} dives with region problems`}`);
  console.log(`  MarineLife tag issues: ${mlErrors === 0 ? '✅ none' : `⚠️  ${mlErrors} unmatched unique tags`}`);
  console.log('');

  await disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
