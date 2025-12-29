
# DIVESIGHT - Diving regions, Marine Life and Phenomena Topology

**Live Demo:** [https://divesight.github.io/dive-topology/](https://divesight.github.io/dive-topology/)

![Dive Region Topology Viewer Screenshot](screenshot.png)

This project is licensed under the [MIT License](LICENSE). Use at your own risk. Please feel free to contribute by creating pull requests. You can also join our discord at: https://discord.gg/TFBHQsJVFC .

Also now is a good time for a shoutout to https://marinemegafauna.org/ for their incredible work.

# TODO

- unsplash images need work!

# SECTIONS

- Dives
- Dive Regions
- Marine Life
- Marine Phenomena

## DIVES

You may have your own collection of dives, or you may wish to build a collection of dives. There are several websites that do share and publish dive data. Today it is also fairly easy to ask Claude or ChatGPT to generate dives from latent understanding - these may not be entirely accurate and need to be verified - but it's a great way to get started. See sample-dives/dives.json for an example.

## DIVE REGIONS

Our goal here is to define dive regions of the world so that we can associate individual dives with a parent region. This is a bit more work. Vibe tools can usually recover this but we wanted a bit more confidence.

We want to be able to answer questions like "What dives are in Indonesia" or even "What dives are in Gili Air". Effectively we want to capture a topology from the top down - such as 'Southeast Asia' being a parent to 'Indonesia' being a parent to 'Bali'.

Divers have a colloqiual understanding of regions around the world. There doesn't yet seem to be a single canonical formal consensus on what the areas of the world are. Every dive site seems to have different ways of partitioning the world. We want to capture different partitioning schemes but be able to present a single representation on demand.

We feel the best way to deal with different ways of looking at the world is to try to break our scheme down into granular sub-units that can be composed into different types of larger collections. Regions are generated from personal experience and by asking llms for latent clusters - effectively vibe coding. Then we regression test regions against a separate collection of several thousand dives.

### DIVE REGION RANKING

We sort dive regions into four types - consistently organized as a hierarchy:

- **major**: The broadest regions, often spanning continents or ocean basins (e.g., "Southeast Asia", "Caribbean", "Indian Ocean").
- **country**: A nation or large territory within a major region (e.g., "Indonesia", "Egypt", "Australia").
- **area**: A well-known region within a country, often a province, island, or large marine area (e.g., "Bali", "Florida", "Red Sea").
- **subarea**: A specific dive destination, city, island, or site cluster within an area (e.g., "Tulamben", "Key Largo", "Blue Heron Bridge"). It's possible that there might be only one well known dive in a subarea.

### DIVE REGIONS MAJOR AREAS

Generally we want a fairly granular splitting of dive regions such that if different users / developers wanted to cluster in different arrangements they could do so. There is some argument this could be more granular. In any case this is our current partitioning:

```
* Africa
  - All of Africa
  - Also East Africa & WIO (Somalia→Mozambique, Madagascar/Comoros/Mayotte, Seychelles, Mascarenes)
* Arctic
* Antarctica
* Australia
* Caribbean
* East Asia (Japan/Okinawa, Taiwan, Korea, China coast)
* Europe
  - Europe – Atlantic & Northern Seas (Iceland, UK/IE, Biscay, North & Norwegian Seas, Baltic)
  - Macaronesia (Azores, Madeira, Canary Islands, Cape Verde)
  - Mediterranean
* Indian Ocean
* Middle East
  - Red Sea
  - Arabian/Persian Gulf
  - Bay of Bengal
* New Zealand
* North America
  - North America – Pacific (Alaska→Baja)
  - North America – Atlantic (Canada/US East)
  - Mexico
* South America
  - South America – Pacific (Peru/Chile)
  - South America – Atlantic (Venezuela→Argentina)
  - Tropical Eastern Pacific (Mexico→Colombia, Galápagos)
* South Pacific
  - Melanesia (Fiji, Vanuatu, New Caledonia, PNG/Solomons portions outside CT)
  - Polynesia (French Polynesia, Samoa/American Samoa, Tonga, Cook, Niue, Tokelau, Pitcairn, Hawaii, Easter)
  - Micronesia (Palau, FSM, Marshalls, Nauru, Guam/CMI, Kiribati Line/Phoenix as you prefer)
* Southeast Asia (non-CT: Thailand, Cambodia, Vietnam, Peninsular MY, Singapore)
  - Coral Triangle (ID/PH/MY-Borneo/TL/PNG/SI)
```

### DIVE REGION RECOVERY STRATEGIES

We probe our region data with a series of random latitude and longitude pairs - in our case we vibe a list of random dives and then probed the region data to see if there was a parent region for any random dive. This list of dives was just a test so it is not shared here. The overall goal was to exercise the region database to see if a parent region could always be found for any meaningful latitude and longitude. We tried several approaches to recover the region:

1) One way to find a region for any random dive lat,lon was to have shapefiles of every area on earth and try to find a point-in-polygon or point-near-polygon. We found a good collection of world country shapefiles from OpenStreetMaps. This turns out to produce poor results - since dives are typically off-shore and not "in" a country. Scripts and data here are still retained although we're not currently using this approach. See scripts/download-boundaries.js and scripts/shapefile-boundary-finder.js and countries-geojson.

2) We ended up using a third party service to find the parent country of a given longitude and latitude of any given dive. Projects such as Nominatim from Open Street Maps have a formal hierarchical region named boundary system (see https://nominatim.org/). Here is an example of the USAT Liberty Tulamben dive region query result:

```
    "region": {
      "country": "Indonesia",
      "country_code": "ID",
      "state": "Bali",
      "county": "Karangasem",
      "display_name": "Karangasem, Bali, Nusa Tenggara, Indonesia"
    }
```

The benefit is that Nominatim is able to produce a region code for most latitude and longitudes supplied to it - even if a point is not _in_ a country - but merely _near_ a country. They almost certainly have a country controlled region concept that we are missing. There are some inconveniences in that the data is not always english, and the region properties are not always fully fleshed out. See scripts/nominatim-boundary-finder.js

3) A third approach we didn't try was to look at the text or prose of given dives and see if the country could be semantically extracted. This may be a good fallback.

4) A fourth approach is to simply let claude or chatgpt try recover the region. This is also a good strategy - we did use that a bit for initial region file generation.

## MARINE LIFE

How do we organize marine life into groups for discovery?

Categorizing marine life is also challenging. It does mean dealing with both **scientific taxonomy** and **experiential perception**. Traditional biological classification (domain, kingdom, phylum, class, order, family, genus, species) captures the evolutionary relationships among organisms and allows for precision, but it’s not always intuitive. Divers tend to think in terms of *encounter categories*: sharks, macro life, reef fish, corals, pelagics. We in general tend colloquially use voluntary or folk classification rather than formal directed acyclic graphs (Lakoff). These colloquial groupings cut across scientific boundaries, mixing taxa that share ecological roles, behaviors, or visual appeal. Convergent evolution functional roles in ecosystem or trophic niches can belie genetic ancestry. Effectively genetic history is in some ways a 'less useful' mapping than ecosystem niche (see https://www.amazon.com/Origin-Nature-Life-Earth-Emergence/dp/1009633775 ). To address this we defined **functional groups** that map better to colloquial understanding. A diver doesn’t need to know that manta rays and hammerhead sharks are both in *Chondrichthyes* - what matters is that they’re both large, charismatic, pelagic animals likely to be seen in blue water. A nudibranch and a cuttlefish may share a habitat and may pose for the camera, but they come from entirely different phyla (*Mollusca* and *Cephalopoda* respectively).

### TYPICAL ANIMALS

Our technical approach was to start with 2000 typical diver facing marine animals, and using Claude we recover the formal taxonomic naming. We then build the taxonomic tree up to the root using WORMS (https://www.marinespecies.org/). We also manually tag each entry into cross-cutting collections or functional groups (tagging is a form of prototype based categorization or folk classification). See life/critters.json

### FUNCTIONAL GROUPS

The functional groups we chose so far are declared in life/groups/.json. We don't actually really use the content of these files at all anymore since we now have taxonomy data - so the actual content is legacy - but declaring the groups is important. These are the functional groups we chose:

- corals
- kelp
- macro-invertebrates
- marine-mammals
- rays
- reef-fish
- sea-grass
- sea-turtles
- sharks

Later functional groups may include some other cross-cutting tags such as:

- pelagic
- charismatic
- intelligent
- megafauna

# Taxonomy

See 20251110-master-taxonomy.json . This is a marine-focused taxonomy tree (domain → kingdom → phylum → class → genus → species). Entries are decorated with tags to indicate the functional group.

All IDs use `kebab-case` and are generally singular:
- `group-id`: e.g. `shark`, `reef-fish`
- `taxon-id`: e.g. `chondrichthyes`, `rhincodon-typus`
- `entry.id`: e.g. `hammerhead`, `whale-shark`

Extensive synonym / alias support is includes for pluralization and colloquial references.

TODO - tidy up and include various scripts:

  - script for recovering the taxonomy for any given animal
  - script for making sure the taxonomic hierarchy is valid
  - script for making sure that region and dive associated animals are in taxonomy
  - example of how to check for colloquial names

  - note that lots of animals are not in any functional groups; so this needs work!

## MARINE PHENOMENA: What are the other phenomena? TBD

Formally define interesting phenomena; drift diving, blackwater, wrecks... [TBD]

### Data resources in general

- geojson land boundaries (not useful but neat - github has leaflet built in!)

https://github.com/AshKyd/geojson-regions/blob/main/public/countries/50m/all.geojson

- UN boundaries

https://geoportal.un.org/arcgis/home/item.html?id=fa74ef8499094e41bf0d025006e37fc9

- Natural Earth "Admin 0" (Countries) -> https://www.naturalearthdata.com/downloads/10m-cultural-vectors/ (1:110m scale - very small and light)

- GADM - Database of Global Administrative Areas -> https://gadm.org/download_world.html                                    
https://gadm.org/data.html

- World Bank -> https://datacatalog.worldbank.org/dataset/world-bank-official-boundaries        

- The UNM49 regions and subregions dataset

- MEOW (Marine ecoregions of the world) coastal/shelf bioregions (12 realms, 62 provinces and 232 ecoregions) -> The province tier is a sweet spot for “named coastal areas” without being 

- Large Marine Ecosystems (LMEs): ~66 named coastal systems (e.g., “Caribbean Sea LME”, “Coral Sea LME”). Very manageable count and intuitive for marine users.

- ComlMaps

- MarineRegions + EEZ may be a good pairing. For offshore/oceanic coverage or legal waters, add EEZ polygons from MarineRegions, optionally intersected with IHO sea areas. (MarineRegions also publishes a “union of country boundaries + EEZs”.)

https://www.marineregions.org/downloads.php#unioneezcountry:~:text=Maritime-,Boundaries,-(latest%20version)

- geoboundaries https://www.geoboundaries.org/simplifiedDownloads.html

- mapbox does server side boundary tile generation https://www.mapbox.com/boundaries
