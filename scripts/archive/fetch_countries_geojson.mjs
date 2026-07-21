// fetch_countries_geojson.mjs
// Node.js ES6 script to scan region files for countries and fetch their GeoJSON shapes
import fs from 'fs/promises';
import path from 'path';

async function loadCountryNames(regionDir) {
  const files = await fs.readdir(regionDir);
  const countryNames = new Set();
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const regionJson = JSON.parse(await fs.readFile(path.join(regionDir, file), 'utf8'));
    for (const key of Object.keys(regionJson)) {
      const region = regionJson[key];
      if (region.type === 'country' && region.name) {
        countryNames.add(region.name);
      }
    }
  }
  return Array.from(countryNames);
}

async function fetchGeoJSON(country) {
  // Use Nominatim OpenStreetMap API for GeoJSON boundary
  const url = `https://nominatim.openstreetmap.org/search?country=${encodeURIComponent(country)}&format=geojson&polygon_geojson=1&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': 'divesight-data-processing/1.0' } });
  if (!res.ok) throw new Error(`Failed to fetch for ${country}`);
  const data = await res.json();
  if (data.features && data.features.length > 0) {
    return data.features[0];
  }
  throw new Error(`No GeoJSON found for ${country}`);
}

async function main() {
  const regionDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../regions');
  const outDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../countries-geojson');
  const countries = await loadCountryNames(regionDir);
  for (const country of countries) {
    try {
      const geojson = await fetchGeoJSON(country);
      const outFile = path.join(outDir, `${country.replace(/\s+/g, '_').toLowerCase()}.geojson`);
      await fs.writeFile(outFile, JSON.stringify(geojson, null, 2));
      console.log(`Saved GeoJSON for ${country}`);
    } catch (e) {
      console.warn(`Could not fetch GeoJSON for ${country}: ${e.message}`);
    }
  }
}

main();
