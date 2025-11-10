// tabSwitcher.js

export function setupTabSwitcher() {
  const tabRegion = document.getElementById('tab-region');
  const tabMarine = document.getElementById('tab-marine-life');
  const tabRegionTree = document.getElementById('tab-region-tree');
  const contentRegion = document.getElementById('tab-content-region');
  const contentMarine = document.getElementById('tab-content-marine-life');
  const contentRegionTree = document.getElementById('tab-content-region-tree');
  if (tabRegion && tabMarine && tabRegionTree && contentRegion && contentMarine && contentRegionTree) {
    function selectTab(tab) {
      tabRegion.classList.remove('selected');
      tabMarine.classList.remove('selected');
      tabRegionTree.classList.remove('selected');
      contentRegion.style.display = 'none';
      contentMarine.style.display = 'none';
      contentRegionTree.style.display = 'none';
      if (tab === 'region') {
        tabRegion.classList.add('selected');
        contentRegion.style.display = '';
      } else if (tab === 'marine') {
        tabMarine.classList.add('selected');
        contentMarine.style.display = '';
      } else if (tab === 'region-tree') {
        tabRegionTree.classList.add('selected');
        contentRegionTree.style.display = '';
      }
    }
    tabRegion.addEventListener('click', () => selectTab('region'));
    tabMarine.addEventListener('click', () => selectTab('marine'));
    tabRegionTree.addEventListener('click', () => selectTab('region-tree'));
  }
}
