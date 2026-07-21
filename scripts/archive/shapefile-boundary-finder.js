#!/usr/bin/env node

import { open } from 'shapefile';
import { point, polygon } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Loads and parses a shapefile
 * @param {string} shapefilePath - Path to the .shp file
 * @returns {Promise<Array>} Array of features with properties and geometry
 */
async function loadShapefile(shapefilePath) {
  const features = [];
  
  try {
    const source = await open(shapefilePath);
    let result = await source.read();
    
    while (!result.done) {
      features.push(result.value);
      result = await source.read();
    }
    
    return features;
  } catch (error) {
    throw new Error(`Failed to load shapefile: ${error.message}`);
  }
}

/**
 * Finds which region/country a coordinate point falls within
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {Array} features - Array of shapefile features
 * @returns {Object|null} Region information or null if not found
 */
function findRegionForPoint(lat, lon, features) {
  const testPoint = point([lon, lat]);
  
  for (const feature of features) {
    if (feature.geometry && feature.geometry.type === 'Polygon') {
      const poly = polygon(feature.geometry.coordinates);
      if (booleanPointInPolygon(testPoint, poly)) {
        return extractRegionInfo(feature);
      }
    } else if (feature.geometry && feature.geometry.type === 'MultiPolygon') {
      // Handle MultiPolygon geometries
      for (const coords of feature.geometry.coordinates) {
        const poly = polygon(coords);
        if (booleanPointInPolygon(testPoint, poly)) {
          return extractRegionInfo(feature);
        }
      }
    }
  }
  
  return null;
}

/**
 * Extracts relevant region information from a feature
 * @param {Object} feature - Shapefile feature
 * @returns {Object} Standardized region information
 */
function extractRegionInfo(feature) {
  const props = feature.properties || {};
  
  // Common field names in Natural Earth and other boundary datasets
  return {
    // Primary identifiers
    name: props.NAME || props.NAME_EN || props.ADMIN || props.name,
    name_long: props.NAME_LONG || props.NAME_EN_LONG || props.name_long,
    iso_a2: props.ISO_A2 || props.ISO2 || props.iso_a2,
    iso_a3: props.ISO_A3 || props.ISO3 || props.iso_a3,
    
    // Administrative info
    admin: props.ADMIN || props.admin,
    sovereign: props.SOVEREIGNT || props.sovereign,
    
    // Geographic/regional info
    continent: props.CONTINENT || props.continent,
    region_un: props.REGION_UN || props.region_un,
    subregion: props.SUBREGION || props.subregion,
    region_wb: props.REGION_WB || props.region_wb,
    
    // Additional metadata
    type: props.TYPE || props.type || props.FEATURECLA || 'Country',
    
    // Keep all original properties for reference
    raw_properties: props
  };
}

/**
 * Main function to run from command line
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('Usage: node shapefile-boundary-finder.js <shapefile.shp> <latitude> <longitude>');
    console.error('Example: node shapefile-boundary-finder.js data/ne_10m_admin_0_countries.shp -8.3405 115.0920');
    console.error('\nDownload shapefiles from:');
    console.error('- Natural Earth: https://www.naturalearthdata.com/downloads/');
    console.error('- GADM: https://gadm.org/');
    process.exit(1);
  }
  
  const shapefilePath = args[0];
  const lat = parseFloat(args[1]);
  const lon = parseFloat(args[2]);
  
  // Validate inputs
  if (!await fs.access(shapefilePath).then(() => true).catch(() => false)) {
    console.error(`Error: Shapefile not found at ${shapefilePath}`);
    process.exit(1);
  }
  
  if (isNaN(lat) || isNaN(lon)) {
    console.error('Error: Latitude and longitude must be valid numbers');
    process.exit(1);
  }
  
  if (lat < -90 || lat > 90) {
    console.error('Error: Latitude must be between -90 and 90');
    process.exit(1);
  }
  
  if (lon < -180 || lon > 180) {
    console.error('Error: Longitude must be between -180 and 180');
    process.exit(1);
  }
  
  try {
    console.log(`Loading shapefile: ${shapefilePath}...`);
    const features = await loadShapefile(shapefilePath);
    console.log(`Loaded ${features.length} features`);
    
    console.log(`Finding region for coordinates: ${lat}, ${lon}...`);
    const region = findRegionForPoint(lat, lon, features);
    
    if (region) {
      console.log('\nFound region:');
      console.log(JSON.stringify(region, null, 2));
    } else {
      console.log('\nNo region found for these coordinates');
      console.log('This might be in international waters or the shapefile may not cover this area');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Export functions for use as a module
export { loadShapefile, findRegionForPoint, extractRegionInfo };

// Run if called directly
if (process.argv[1] === __filename) {
  main();
}
