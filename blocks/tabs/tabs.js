import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Tabs. Mỗi dòng = 1 tab: [tên tab | nội dung]
 * @param {Element} block
 */
export default function decorate(block) {
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  const uid = `tabs-${Math.random().toString(36).slice(2, 8)}`;
  const tabs = [];
  const panels = [];

  [...block.children].forEach((row, i) => {
    const [labelCell, contentCell] = row.children;
    const label = labelCell?.textContent.trim() || `Tab ${i + 1}`;

    const panel = contentCell || document.createElement('div');
    panel.className = 'tabs-panel';
    panel.id = `${uid}-panel-${i}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `${uid}-tab-${i}`);
    panel.hidden = i !== 0;

    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'tabs-tab';
    tab.id = `${uid}-tab-${i}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panel.id);
    tab.setAttribute('aria-selected', String(i === 0));
    tab.tabIndex = i === 0 ? 0 : -1;
    tab.textContent = label;
    moveInstrumentation(row, tab); // bấm tab = chọn mục tab trong Universal Editor

    tabs.push(tab);
    panels.push(panel);
    row.remove();
  });

  function select(index) {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
    });
    tabs[index].focus();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') select((i + 1) % tabs.length);
      else if (e.key === 'ArrowLeft') select((i - 1 + tabs.length) % tabs.length);
      else if (e.key === 'Home') select(0);
      else if (e.key === 'End') select(tabs.length - 1);
      else return;
      e.preventDefault();
    });
  });

  tablist.append(...tabs);
  block.append(tablist, ...panels);
}
