import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const desktop = window.matchMedia('(width >= 900px)');

function closeDrops(nav, except = null) {
  nav.querySelectorAll('.nav-drop[aria-expanded="true"]').forEach((li) => {
    if (li !== except) li.setAttribute('aria-expanded', 'false');
  });
}

function toggleMenu(nav, button, force) {
  const expanded = force !== undefined ? force : nav.getAttribute('aria-expanded') !== 'true';
  nav.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  button.setAttribute('aria-label', expanded ? 'Đóng menu' : 'Mở menu');
  document.body.style.overflowY = expanded && !desktop.matches ? 'hidden' : '';
  if (!expanded) closeDrops(nav);
}

const SVG_ATTR = 'viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const ICONS = {
  search: `<svg ${SVG_ATTR}><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2"/></svg>`,
  cart: `<svg ${SVG_ATTR}><path d="M3 4h2.5l2.2 10.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/></svg>`,
  user: `<svg ${SVG_ATTR}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>`,
};

/** Link công cụ có tên quen thuộc (tìm kiếm, giỏ hàng, tài khoản) -> hiển thị icon, chữ chỉ để đọc màn hình */
function decorateTools(nav) {
  nav.querySelectorAll('.nav-tools a').forEach((a) => {
    const text = a.textContent.trim();
    const key = `${a.getAttribute('href') || ''} ${text}`
      .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
    let icon = null;
    if (/tim.?kiem|search/.test(key)) icon = ICONS.search;
    else if (/gio.?hang|cart|basket/.test(key)) icon = ICONS.cart;
    else if (/dang.?nhap|tai.?khoan|account|login|user/.test(key)) icon = ICONS.user;
    if (!icon) return;
    a.classList.add('nav-tool-icon');
    a.setAttribute('aria-label', text);
    a.title = text;
    a.innerHTML = `${icon}<span class="nav-tool-label">${text}</span>`;
  });
}

/**
 * Nhận diện 3 phần của header theo THỨ TỰ NỘI DUNG, không phụ thuộc vào đường kẻ ngang
 * (section break) trong document /nav:
 *   - brand   : mọi thứ đứng trước danh sách đầu tiên (logo)
 *   - sections: danh sách đầu tiên (menu 3 cấp)
 *   - tools   : danh sách thứ hai (Tìm kiếm, Giỏ hàng, Đăng nhập...)
 * Document /nav có chia section hay không đều cho cùng một kết quả.
 * @param {Element} fragment
 * @returns {Element[]} các section đã dựng lại
 */
function buildSections(fragment) {
  const items = [...fragment.querySelectorAll('.default-content-wrapper')]
    .flatMap((wrapper) => [...wrapper.children]);
  const lists = items.filter((el) => el.matches('ul, ol'));
  const firstList = lists[0];
  const brandItems = firstList ? items.slice(0, items.indexOf(firstList)) : items;

  const make = (name, els) => {
    if (!els.length) return null;
    const section = document.createElement('div');
    section.className = `section nav-${name}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'default-content-wrapper';
    wrapper.append(...els);
    section.append(wrapper);
    return section;
  };

  return [
    make('brand', brandItems),
    make('sections', lists[0] ? [lists[0]] : []),
    make('tools', lists[1] ? [lists[1]] : []),
  ].filter(Boolean);
}

/**
 * Google Docs có thể bọc nội dung mỗi mục menu trong <p>, <strong>, <span>...
 * Gỡ các lớp bọc đó để link luôn là con trực tiếp của <li> (CSS và JS bên dưới dựa vào điều này).
 */
function unwrapMenuItems(nav) {
  nav.querySelectorAll('.nav-sections li').forEach((item) => {
    let wrapper = [...item.children].find((el) => !el.matches('a, ul, ol, br'));
    while (wrapper) {
      wrapper.replaceWith(...wrapper.childNodes);
      wrapper = [...item.children].find((el) => !el.matches('a, ul, ol, br'));
    }
  });
}

/**
 * Cấu trúc document /nav (chỉ cần đúng thứ tự):
 *  1. Logo (ảnh có link về trang chủ)
 *  2. Danh sách 3 cấp: cấp 1 = link danh mục, cấp 2 = tiêu đề cột, cấp 3 = link trong cột
 *  3. Danh sách link công cụ (Tìm kiếm, Giỏ hàng, Đăng nhập...)
 * @param {Element} block
 */
export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.append(...buildSections(fragment));

  // logo: bỏ style button mà decorateButtons có thể thêm vào
  const brandLink = nav.querySelector('.nav-brand a');
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-container')?.classList.remove('button-container');
  }

  unwrapMenuItems(nav);
  decorateTools(nav);

  // hamburger (mobile)
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Mở menu">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  const hamburgerButton = hamburger.querySelector('button');
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');

  // mega menu
  const drops = nav.querySelectorAll('.nav-sections .default-content-wrapper > ul > li');
  drops.forEach((li) => {
    if (!li.querySelector('ul')) return;
    li.classList.add('nav-drop');
    li.setAttribute('aria-expanded', 'false');

    const link = li.querySelector(':scope > a');

    li.addEventListener('mouseenter', () => {
      if (!desktop.matches) return;
      closeDrops(nav, li);
      li.setAttribute('aria-expanded', 'true');
    });
    li.addEventListener('mouseleave', () => {
      if (desktop.matches) li.setAttribute('aria-expanded', 'false');
    });
    li.addEventListener('focusin', () => {
      if (!desktop.matches) return;
      closeDrops(nav, li);
      li.setAttribute('aria-expanded', 'true');
    });

    // mobile: bấm để mở/đóng accordion thay vì chuyển trang
    link?.addEventListener('click', (e) => {
      if (desktop.matches) return;
      e.preventDefault();
      const open = li.getAttribute('aria-expanded') === 'true';
      closeDrops(nav);
      li.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  });

  hamburgerButton.addEventListener('click', () => toggleMenu(nav, hamburgerButton));

  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    closeDrops(nav);
    if (nav.getAttribute('aria-expanded') === 'true') toggleMenu(nav, hamburgerButton, false);
  });

  // bấm ra ngoài thì đóng mega menu (desktop)
  document.addEventListener('click', (e) => {
    if (desktop.matches && !nav.contains(e.target)) closeDrops(nav);
  });

  desktop.addEventListener('change', () => toggleMenu(nav, hamburgerButton, false));

  const wrapper = document.createElement('div');
  wrapper.className = 'nav-wrapper';
  wrapper.append(nav);
  block.append(wrapper);
}
