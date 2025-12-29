#!/usr/bin/env node

import https from 'https';
import { createWriteStream, promises as fs } from 'fs';
import { pipeline } from 'stream/promises';
import { Extract } from 'unzipper';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOUNDARY_SOURCES = {
  'natural-earth-countries': {
    name: 'Natural Earth Countries (10m)',
    url: 'https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/cultural/ne_10m_admin_0_countries.zip',
    description: 'Country boundaries at 1:10m scale'
  },
  'natural-earth-provinces': {
    name: 'Natural Earth Provinces/States (10m)',
    url: 'https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/cultural/ne_10m_admin_1_states_provinces.zip',
    description: 'State/Province boundaries at 1:10m scale'
  },
  'natural-earth-marine': {
    name: 'Natural Earth Marine Regions (10m)',
    url: 'https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/physical/ne_10m_geography_marine_polys.zip',
    description: 'Seas, bays, and other marine regions'
  }
};

/**
 * Downloads a file from a URL
 * @param {string} url - URL to download from
 * @param {string} destPath - Destination file path
 */
async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', reject);
  });
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const dataDir = path.join(__dirname, '..', 'data', 'boundaries');
  
  if (args.length === 0 || args[0] === '--help') {
    console.log('Usage: node download-boundaries.js [source-key|all]');
    console.log('\nAvailable sources:');
    for (const [key, info] of Object.entries(BOUNDARY_SOURCES)) {
      console.log(`  ${key}: ${info.name}`);
      console.log(`    ${info.description}`);
    }
    console.log('\nExample: node download-boundaries.js natural-earth-countries');
    console.log('         node download-boundaries.js all');
    process.exit(0);
  }
  
  // Create data directory if it doesn't exist
  await fs.mkdir(dataDir, { recursive: true });
  
  const sourcesToDownload = args[0] === 'all' 
    ? Object.keys(BOUNDARY_SOURCES)
    : [args[0]];
  
  for (const sourceKey of sourcesToDownload) {
    const source = BOUNDARY_SOURCES[sourceKey];
    if (!source) {
      console.error(`Unknown source: ${sourceKey}`);
      continue;
    }
    
    console.log(`\nDownloading ${source.name}...`);
    const zipPath = path.join(dataDir, `${sourceKey}.zip`);
    const extractPath = path.join(dataDir, sourceKey);
    
    try {
      // Download the zip file
      await downloadFile(source.url, zipPath);
      console.log(`Downloaded to ${zipPath}`);
      
      // Extract the zip file
      await fs.mkdir(extractPath, { recursive: true });
      await pipeline(
        fs.createReadStream(zipPath),
        Extract({ path: extractPath })
      );
      console.log(`Extracted to ${extractPath}`);
      
      // Clean up zip file
      await fs.unlink(zipPath);
      
      // List shapefile components
      const files = await fs.readdir(extractPath);
      const shpFile = files.find(f => f.endsWith('.shp'));
      if (shpFile) {
        console.log(`Shapefile: ${path.join(extractPath, shpFile)}`);
      }
    } catch (error) {
      console.error(`Failed to download ${source.name}:`, error.message);
    }
  }
  
  console.log('\nDone! You can now use the shapefiles with shapefile-boundary-finder.js');
}

if (process.argv[1] === __filename) {
  main();
}
