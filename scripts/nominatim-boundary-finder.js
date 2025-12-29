#!/usr/bin/env node

import https from 'https';

/**
 * Finds administrative boundaries for given coordinates using Nominatim API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} delay - Optional delay in milliseconds before making the request
 * @returns {Promise<Object>} Administrative boundary information
 */
async function findBoundaries(lat, lon, delay = 0) {
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
  
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'DiveSight Boundary Finder/1.0'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (result.error) {
            reject(new Error(result.error));
            return;
          }
          
          // Extract relevant boundary information
          const boundaries = {
            coordinates: [lat, lon],
            display_name: result.display_name,
            country: result.address?.country,
            country_code: result.address?.country_code?.toUpperCase(),
            state: result.address?.state,
            county: result.address?.county,
            city: result.address?.city || result.address?.town || result.address?.village,
            postcode: result.address?.postcode,
            // Additional maritime/coastal info if available
            water: result.address?.water,
            bay: result.address?.bay,
            strait: result.address?.strait,
            // Raw address object for additional details
            raw_address: result.address,
            // Bounding box of the result
            boundingbox: result.boundingbox
          };
          
          resolve(boundaries);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Main function to run from command line
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node boundary-finder.js <latitude> <longitude>');
    console.error('Example: node boundary-finder.js -8.3405 115.0920');
    process.exit(1);
  }
  
  const lat = parseFloat(args[0]);
  const lon = parseFloat(args[1]);
  
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
    console.log(`Finding boundaries for coordinates: ${lat}, ${lon}...`);
    const boundaries = await findBoundaries(lat, lon);
    console.log(JSON.stringify(boundaries, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Export for use as a module
export { findBoundaries };

// Run if called directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  main();
}
