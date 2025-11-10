// renderFoldableTree.js

import { buildLifeGroupLookup } from './lifeGroupApi.js';

export async function renderFoldableTree(nodes, level = 0, parentKey = '') {
  const marineLife = await buildLifeGroupLookup();
  function render(nodes, level = 0, parentKey = '') {
    let html = '<ul style="margin-left:' + (level * 1.2) + 'em">';
    for (const node of nodes) {
      const key = (parentKey ? parentKey + '-' : '') + node.id;
      const hasChildren = node.children && node.children.length > 0;
      let floraFaunaStr = '';
      if (node.floraFauna && Array.isArray(node.floraFauna) && node.floraFauna.length) {
        floraFaunaStr = ' <span style="color:#888;font-size:0.95em;">[';
        floraFaunaStr += node.floraFauna.map(item => {
          let match = marineLife[item.toLowerCase()];
          if (!match) {
            // Try fuzzy: singular/plural, remove spaces, dashes, etc.
            const norm = item.toLowerCase().replace(/\s|\-/g, '');
            match = Object.values(marineLife).find(m => m.id && m.id.replace(/\s|\-/g, '') === norm || m.name && m.name.replace(/\s|\-/g, '').toLowerCase() === norm);
          }
          if (match) {
            const img = match.image ? `<img src="${match.image}" alt="${match.name}" style="width:32px;height:24px;object-fit:cover;border-radius:0.3em;margin-right:0.3em;vertical-align:middle;">` : '';
            return `<span class="ml-hover" style="cursor:pointer;position:relative;">
              ${img}<span style="text-decoration:underline dotted;">${match.name}</span>
              <span class="ml-popup" style="display:none;position:absolute;z-index:10;left:0;top:1.5em;background:#fff;color:#222;padding:0.7em 1em;border-radius:0.5em;box-shadow:0 2px 12px #0003;min-width:220px;max-width:320px;">
                <b>${match.name}</b><br>${match.description || ''}
                ${match.image ? `<div style=\"margin-top:0.5em;text-align:center;\"><img src=\"${match.image}\" alt=\"${match.name}\" style=\"width:120px;height:90px;object-fit:cover;border-radius:0.5em;box-shadow:0 2px 8px #0002;\"></div>` : ''}
              </span>
            </span>`;
          } else {
            return `<span style="text-decoration:underline dotted;">${item}</span>`;
          }
        }).join(', ') + ']</span>';
      }
      html += `<li class="${node.type}" data-key="${key}">`;
      html += hasChildren
        ? `<button class="tree-fold" data-key="${key}" aria-label="Toggle fold" style="width:1.5em;height:1.5em;font-size:1.1em;border:none;background:none;cursor:pointer;">&#9654;</button>`
        : '<span style="display:inline-block;width:1.5em;"></span>';
      html += `<span>${node.name}${floraFaunaStr}</span>`;
      if (hasChildren) {
        html += `<div class="tree-children" data-parent="${key}" style="display:none;">`;
        html += render(node.children, level + 1, key);
        html += '</div>';
      }
      html += '</li>';
    }
    html += '</ul>';
    return html;
  }
  return render(nodes, level, parentKey);
}
