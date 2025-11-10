// Marine Life Browser logic extracted from init.js
import { loadNormalizedGroups } from './lifeGroupApi.js';

export async function setupMarineLifeBrowser() {
  // Render marine life groups with images
  const container = document.getElementById('marine-life-browser');
  if (!container) return;
  const groups = await loadNormalizedGroups();
  function renderGroup(group, level = 0, parentKey = '') {
    const key = (parentKey ? parentKey + '-' : '') + group.id;
    const hasChildren = group.children && group.children.length > 0;
    let html = `<div class="ml-cat" data-key="${key}" style="margin-left:${level * 1.5}em; margin-bottom:1.2em;">
      <div style="display:flex;align-items:center;gap:1em;">
        ${hasChildren ? `<button class="ml-fold" data-key="${key}" aria-label="Toggle fold" style="width:1.7em;height:1.7em;font-size:1.2em;border:none;background:none;cursor:pointer;">&#9654;</button>` : '<span style="display:inline-block;width:1.7em;"></span>'}
        ${group.image ? `<img src="${group.image}" alt="${group.name}" style="width:70px;height:55px;object-fit:cover;border-radius:0.5em;box-shadow:0 2px 8px #0002;">` : ''}
        <div>
          <div style="font-size:1.2em;font-weight:bold;">${group.name}</div>
          <div style="font-size:0.98em;color:#666;">${group.description || ''}</div>
        </div>
      </div>`;
    if (hasChildren) {
      html += `<div class="ml-children" data-parent="${key}" style="margin-top:0.5em;display:none;">`;
      for (const child of group.children) {
        html += renderGroup(child, level + 1, key);
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  }
  let html = '';
  for (const group of groups) {
    html += renderGroup(group, 0);
  }
  container.innerHTML = html;

  // Folding logic
  container.addEventListener('click', e => {
    const btn = e.target.closest('.ml-fold');
    if (!btn) return;
    const key = btn.getAttribute('data-key');
    const childrenDiv = container.querySelector(`.ml-children[data-parent="${key}"]`);
    if (!childrenDiv) return;
    const isOpen = childrenDiv.style.display !== 'none';
    childrenDiv.style.display = isOpen ? 'none' : '';
    btn.innerHTML = isOpen ? '&#9654;' : '&#9660;';
  });
}

