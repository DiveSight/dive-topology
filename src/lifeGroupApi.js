// Normalize group JSONs to a tree structure for UI
export async function loadNormalizedGroups() {
  const groupsRaw = await loadAllGroups();
  // Each groupRaw: { group: {...}, entries: [...] }
  return groupsRaw.map(gr => {
    const group = gr.group;
    return {
      id: group["group-id"] || group.id || group.name.toLowerCase(),
      name: group.name,
      description: group.description,
      color: group.color,
      image: group.image,
      category: group.category,
      children: (gr.entries || []).map(e => ({
        ...e,
        id: e.id,
        name: e.name,
        description: e.description,
        image: e.image
      }))
    };
  });
}
// lifeGroupApi.js
// Helper to load and access life-taxonomy/groups/*.json data

const GROUP_FILES = [
  'coral.json',
  'kelp.json',
  'macro-invertebrates.json',
  'marine-mammals.json',
  'rays.json',
  'reef-fish.json',
  'sea-grass.json',
  'sea-turtles.json',
  'sharks.json'
];

const GROUPS_PATH = '/life-taxonomy/groups/';

// Loads all group JSON files and returns an array of group objects
export async function loadAllGroups() {
  const groups = [];
  for (const file of GROUP_FILES) {
    try {
      const res = await fetch(`${GROUPS_PATH}${file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      groups.push(json);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Could not load group', file, e);
    }
  }
  return groups;
}


// Loads a single group by name (filename without .json)
export async function loadGroupByName(name) {
  const file = `${name}.json`;
  try {
    const res = await fetch(`${GROUPS_PATH}${file}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Could not load group', file, e);
    return null;
  }
}

// Build a lookup object for all groups and their children/species by id, name, or commonNames
export async function buildLifeGroupLookup() {
  const groups = await loadAllGroups();
  const lookup = {};
  function walk(obj) {
    if (!obj) return;
    if (obj.id) lookup[obj.id.toLowerCase()] = obj;
    if (obj.name) lookup[obj.name.toLowerCase()] = obj;
    if (obj.commonNames && Array.isArray(obj.commonNames)) {
      for (const n of obj.commonNames) lookup[n.toLowerCase()] = obj;
    }
    if (obj.children) {
      for (const key in obj.children) walk(obj.children[key]);
    }
    if (obj.species && Array.isArray(obj.species)) {
      for (const s of obj.species) walk(s);
    }
  }
  for (const group of groups) walk(group);
  return lookup;
}
