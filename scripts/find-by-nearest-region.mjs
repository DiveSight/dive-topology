// regionalize.mjs
// Node.js ES6 script to associate dives with closest region subarea/area and split by major region
import fs from 'fs/promises';
import path from 'path';

// Haversine formula for distance in km between two lat/lon points
function haversine([lat1, lon1], [lat2, lon2]) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function loadRegions(regionDir) {
  const files = await fs.readdir(regionDir);
  const regionData = {};
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const regionJson = JSON.parse(await fs.readFile(path.join(regionDir, file), 'utf8'));
    for (const key of Object.keys(regionJson)) {
      regionData[regionJson[key].id] = regionJson[key];
    }
  }
  return regionData;
}

function flattenAreas(regionData) {
  // Returns array of {id, name, type, parent, coordinates, majorRegion}
  const all = [];
  for (const region of Object.values(regionData)) {
    if (region.type === 'major') continue;
    let major = region;
    let parent = region.parent;
    while (parent && regionData[parent]) {
      if (regionData[parent].type === 'major') {
        major = regionData[parent];
        break;
      }
      parent = regionData[parent].parent;
    }
    all.push({
      id: region.id,
      name: region.name,
      type: region.type,
      parent: region.parent,
      coordinates: region.coordinates,
      majorRegion: major.id
    });
  }
  return all;
}

async function main() {
  const [,, sourceFile, destDir] = process.argv;
  if (!sourceFile || !destDir) {
    console.error('Usage: node ....mjs <sourceFile> <destDir>');
    process.exit(1);
  }
  const regionDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../regions');
  const regionData = await loadRegions(regionDir);
  const areas = flattenAreas(regionData);
  const dives = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
  const output = {};
  const unassigned = [];

  for (const dive of dives) {
    let closest = null;
    let minDist = Infinity;
    for (const area of areas) {
      if (!area.coordinates) continue;
      const dist = haversine(dive.coordinates, area.coordinates);
      if (dist < minDist) {
        minDist = dist;
        closest = area;
      }
    }
    let assigned = false;
    if (closest && minDist <= 100) {
      if (!output[closest.majorRegion]) output[closest.majorRegion] = [];
      output[closest.majorRegion].push({ ...dive, region: closest.id, regionType: closest.type, regionName: closest.name, regionDistanceKm: minDist });
      assigned = true;
    } else if (closest && minDist <= 1000) {
      // Check for region name in location or description (case-insensitive)
      const regionName = closest.name.toLowerCase();
      const loc = (dive.location || '').toLowerCase();
      const desc = (dive.description || '').toLowerCase();
      if (loc.includes(regionName) || desc.includes(regionName)) {
        if (!output[closest.majorRegion]) output[closest.majorRegion] = [];
        output[closest.majorRegion].push({ ...dive, region: closest.id, regionType: closest.type, regionName: closest.name, regionDistanceKm: minDist, regionNameMatch: true });
        assigned = true;
      }
    }
    if (!assigned) {
      unassigned.push({ ...dive, closestRegion: closest ? closest.id : null, closestDistanceKm: minDist });
      console.warn(`WARNING: No region within 100/1000km for dive ${dive.id} (${dive.name})`);
    }
  }

  await fs.mkdir(destDir, { recursive: true });
  for (const region of Object.keys(output)) {
    const outFile = path.join(destDir, `dives_${region}.json`);
    await fs.writeFile(outFile, JSON.stringify(output[region], null, 2));
  }
  if (unassigned.length) {
    const outFile = path.join(destDir, 'dives_unassigned.json');
    await fs.writeFile(outFile, JSON.stringify(unassigned, null, 2));
  }

  // Log stats
  const total = dives.length;
  const assigned = total - unassigned.length;
  console.log('--- Regionalization Stats ---');
  console.log(`Total dives: ${total}`);
  console.log(`Assigned to region: ${assigned}`);
  console.log(`Unassigned: ${unassigned.length}`);
  for (const region of Object.keys(output)) {
    console.log(`  ${region}: ${output[region].length} dives`);
  }
}

main();
