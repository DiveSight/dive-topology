// setupRegionBrowser.js
import { createMap, setMapTheme } from './map.js';
import { renderRegionToggles, setupRegionToggleEvents } from './controls.js';
import { setupSearch } from './search.js';
import { buildTree } from './tree.js';
import { getColor, getRadius, findMajorId } from './utils.js';
import { loadAllRegions } from './regions.js';
import { renderFoldableTree } from './renderFoldableTree.js';

export async function setupRegionBrowser() {
  const markersByMajor = {};
  const data = await loadAllRegions();
  // Map
  const { map, lightTiles, darkTiles } = createMap();
  // Controls
  const majors = Object.values(data).filter(r => r.type === 'major');
  const controlsDiv = document.getElementById('controls');
  controlsDiv.innerHTML = renderRegionToggles(majors);
  const regionTogglesDiv = document.getElementById('region-toggles');
  // Markers
  for (const region of Object.values(data)) {
    if (!region.coordinates) continue;
    const color = getColor(region.type);
    const radius = getRadius(region.type);
    const marker = L.circleMarker(region.coordinates, {
      color,
      fillColor: color,
      fillOpacity: 0.7,
      radius
    });
    marker.bindPopup(`<b>${region.name}</b><br>${region.description || ''}`);
    marker.bindTooltip(`<b>${region.name}</b><br>${region.description || ''}`, {sticky: true, direction: 'top', offset: [0, -radius]});
    const majorId = findMajorId(region, data);
    if (!markersByMajor[majorId]) markersByMajor[majorId] = [];
    markersByMajor[majorId].push(marker);
  }
  setupRegionToggleEvents(regionTogglesDiv, markersByMajor, data, findMajorId, map);
  // Theme toggle
  const darkBtn = document.getElementById('toggle-dark');
  function setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    setMapTheme(map, lightTiles, darkTiles, theme);
  }
  setTheme('light');
  darkBtn.addEventListener('click', () => {
    if (document.documentElement.classList.contains('dark')) {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  });
  // Search
  setupSearch(data, map, markersByMajor, findMajorId);
  // Region Tree Browser (foldable, in new tab)
  const tree = buildTree(data);
  const regionTreeBrowser = document.getElementById('region-tree-browser');
  if (regionTreeBrowser) {
    regionTreeBrowser.innerHTML = await renderFoldableTree(tree);
    // Folding logic
    regionTreeBrowser.addEventListener('click', e => {
      const btn = e.target.closest('.tree-fold');
      if (!btn) return;
      const key = btn.getAttribute('data-key');
      const childrenDiv = regionTreeBrowser.querySelector(`.tree-children[data-parent="${key}"]`);
      if (!childrenDiv) return;
      const isOpen = childrenDiv.style.display !== 'none';
      childrenDiv.style.display = isOpen ? 'none' : '';
      btn.innerHTML = isOpen ? '&#9654;' : '&#9660;';
    });
    // Hover popup logic for marine life
    regionTreeBrowser.addEventListener('mouseover', e => {
      const hover = e.target.closest('.ml-hover');
      if (hover) {
        const popup = hover.querySelector('.ml-popup');
        if (popup) popup.style.display = 'block';
      }
    });
    regionTreeBrowser.addEventListener('mouseout', e => {
      const hover = e.target.closest('.ml-hover');
      if (hover) {
        const popup = hover.querySelector('.ml-popup');
        if (popup) popup.style.display = 'none';
      }
    });
  }
}
