# Archived scripts

Superseded tooling kept for reference — none of these are runnable or safe as-is:

- `validate-dives.ts` — broken: imports `db/`/`seed-data/` paths that don't exist
  in this repo and calls `dotenv.config()` without importing dotenv. Superseded
  by `scripts/validate-regions.mjs` (`npm run validate:regions`).
- `nominatim-boundary-finder.js`, `fetch_countries_geojson.mjs` — hit Nominatim
  with no rate limiting; Nominatim is banned as a data source for this project.
  The static `countries-geojson/` files are the current approach.
- `shapefile-boundary-finder.js`, `download-boundaries.js` — earlier-generation
  boundary tooling; writes to a `data/boundaries/` dir that no longer exists.
