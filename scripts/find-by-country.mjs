// find-by-country.mjs
// Node.js ES6 script to check which dives are inside any country GeoJSON
import fs from 'fs/promises';
import path from 'path';



// Simple buffer: expand each polygon point by a small delta (in degrees, ~0.01 deg ~1km)
function bufferPolygon(polygon, delta) {
  // polygon: array of [lon, lat]
  // returns new polygon with each point moved outwards by delta
  // This is a naive approach, not a true geodesic buffer
  return polygon.map(([lon, lat]) => [lon + Math.sign(lon) * delta, lat + Math.sign(lat) * delta]);
}

function getBoundingBox(polygon) {
  // polygon: array of [lon, lat]
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of polygon) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLon, minLat, maxLon, maxLat];
}

function pointInBoundingBox(point, bbox) {
  // point: [lon, lat], bbox: [minLon, minLat, maxLon, maxLat]
  return point[0] >= bbox[0] && point[0] <= bbox[2] && point[1] >= bbox[1] && point[1] <= bbox[3];
}

function pointInPolygon(point, polygon) {
  // Ray-casting algorithm for detecting if point is in polygon
  let x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i][0], yi = polygon[i][1];
    let xj = polygon[j][0], yj = polygon[j][1];
    let intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}



// Precompute buffered polygons and bounding boxes for each country
function precomputeCountryShapes(geojson, bufferDelta = 0) {
  // Returns array of {polygon, bbox}
  const shapes = [];
  if (!geojson.geometry) return shapes;
  if (geojson.geometry.type === 'Polygon') {
    for (const ring of geojson.geometry.coordinates) {
      const testRing = bufferDelta ? bufferPolygon(ring, bufferDelta) : ring;
      shapes.push({ polygon: testRing, bbox: getBoundingBox(testRing) });
    }
  } else if (geojson.geometry.type === 'MultiPolygon') {
    for (const poly of geojson.geometry.coordinates) {
      for (const ring of poly) {
        const testRing = bufferDelta ? bufferPolygon(ring, bufferDelta) : ring;
        shapes.push({ polygon: testRing, bbox: getBoundingBox(testRing) });
      }
    }
  }
  return shapes;
}

async function main() {
  const [,, sourceFile, regionFile] = process.argv;
  if (!sourceFile) {
    console.error('Usage: node find-by-country.mjs <divesFile> [divesWithRegionFile]');
    process.exit(1);
  }
  const geoDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../countries-geojson');
  const geoFiles = await fs.readdir(geoDir);
  const countryShapes = {};
  let loaded = 0;
  const bufferDelta = 0; // no buffer, use original polygons
  for (const file of geoFiles) {
    if (!file.endsWith('.geojson')) continue;
    const geojson = JSON.parse(await fs.readFile(path.join(geoDir, file), 'utf8'));
    countryShapes[file.replace('.geojson','')] = precomputeCountryShapes(geojson, bufferDelta);
    loaded++;
    if (loaded % 10 === 0) console.log(`Loaded ${loaded} country shapes...`);
  }
  console.log(`Loaded ${loaded} country shapes in total.`);
  let dives = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
  if (regionFile) {
    const divesWithRegion = JSON.parse(await fs.readFile(regionFile, 'utf8'));
    const regionMap = new Map();
    for (const d of divesWithRegion) {
      if (d.id && d.region) regionMap.set(d.id, d.region);
    }
    // Copy region property over to main dives array
    for (const dive of dives) {
      if (dive.id && regionMap.has(dive.id)) {
        dive.region = regionMap.get(dive.id);
      }
    }
  }
  let matched = 0;
  let unmatched = 0;
  let multiCountry = 0;
  for (let i = 0; i < dives.length; i++) {
    const dive = dives[i];
    const [lat, lon] = dive.coordinates;
    let countries = [];
    let region = dive.region;
    // Prefer region.country if present and not empty
    if (region && region.country && region.country.trim() !== '') {
      // Normalize for file naming (lowercase, underscores)
      const normCountry = region.country.replace(/\s+/g, '_').toLowerCase();
      if (countryShapes[normCountry]) {
        countries.push(normCountry);
      } else {
        // fallback to polygon test if country not found
        for (const [country, shapes] of Object.entries(countryShapes)) {
          for (const { polygon, bbox } of shapes) {
            if (!pointInBoundingBox([lon, lat], bbox)) continue;
            if (pointInPolygon([lon, lat], polygon)) {
              countries.push(country);
              break;
            }
          }
        }
      }
    } else {
      for (const [country, shapes] of Object.entries(countryShapes)) {
        for (const { polygon, bbox } of shapes) {
          if (!pointInBoundingBox([lon, lat], bbox)) continue;
          if (pointInPolygon([lon, lat], polygon)) {
            countries.push(country);
            break;
          }
        }
      }
    }
    if (countries.length > 0) matched++;
    else unmatched++;
    if (countries.length > 1) multiCountry++;
    if ((i+1) % 500 === 0) console.log(`Checked ${i+1} dives...`);
  }
  console.log('--- Country GeoJSON Stats ---');
  console.log(`Total dives: ${dives.length}`);
  console.log(`Matched to country (with buffer): ${matched}`);
  console.log(`Unmatched: ${unmatched}`);
  console.log(`Dives in more than one country: ${multiCountry}`);
}

main();
