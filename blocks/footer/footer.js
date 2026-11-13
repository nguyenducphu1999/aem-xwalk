import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const SOCIAL_ATTR = 'viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"';
const SOCIAL_ICONS = {
  facebook: `<svg ${SOCIAL_ATTR}><path d="M13.5 21v-7.5H16l.5-3h-3V8.7c0-.9.3-1.5 1.6-1.5h1.5V4.5c-.3 0-1.2-.1-2.2-.1-2.3 0-3.9 1.4-3.9 4v2.1H8v3h2.5V21z"/></svg>`,
  youtube: `<svg ${SOCIAL_ATTR}><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.200 0-7.800.4A2.500 2.500 0 0 0 2.400 7.200C2 8.800 2 12 2 12s0 3.200.4 4.800a2.500 2.500 0 0 0 1.800 1.800C5.800 19 12 19 12 19s6.200 0 7.800-.4a2.500 2.500 0 0 0 1.800-1.800c.4-1.600.4-4.800.4-4.800s0-3.200-.4-4.800zM10 15V9l5.200 3z"/></svg>`,
  instagram: `<svg ${SOCIAL_ATTR}><path d="M12 7.600A4.400 4.400 0 1 0 12 16.400 4.400 4.400 0 0 0 12 7.600zm0 7.200a2.800 2.800 0 1 1 0-5.600 2.800 2.800 0 0 1 0 5.600zM16.800 6.400a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM12 3c-2.400 0-2.700 0-3.700.1-1 0-1.600.2-2.200.4-.7.300-1.200.6-1.700 1.100s-.8 1-1.100 1.700c-.2.600-.4 1.200-.4 2.200C2.800 9.500 2.800 9.800 2.800 12s0 2.600.1 3.700c0 1 .2 1.600.4 2.200.3.700.6 1.200 1.100 1.700s1 .8 1.700 1.100c.6.200 1.200.4 2.200.4 1 .1 1.300.1 3.700.1s2.700 0 3.700-.1c1 0 1.600-.2 2.200-.4.700-.3 1.200-.6 1.700-1.100s.8-1 1.100-1.700c.2-.6.400-1.200.4-2.200.1-1 .1-1.300.1-3.700s0-2.700-.1-3.700c0-1-.2-1.600-.4-2.200-.3-.7-.6-1.200-1.100-1.700s-1-.8-1.700-1.100c-.6-.2-1.200-.4-2.200-.4C14.700 3 14.400 3 12 3zm0 1.600c2.400 0 2.700 0 3.600.1.900 0 1.400.2 1.700.3.400.2.700.4 1 .7s.5.600.7 1c.1.300.3.800.3 1.700.1.900.1 1.200.1 3.600s0 2.700-.1 3.600c0 .9-.2 1.400-.3 1.700-.2.400-.4.700-.7 1s-.6.500-1 .7c-.3.100-.8.300-1.700.3-.9.100-1.200.1-3.600.1s-2.700 0-3.600-.1c-.9 0-1.400-.2-1.700-.3-.4-.2-.7-.4-1-.7s-.5-.6-.7-1c-.1-.3-.3-.8-.3-1.700-.1-.9-.1-1.200-.1-3.600s0-2.700.1-3.600c0-.9.2-1.400.3-1.700.2-.4.4-.7.7-1s.6-.5 1-.7c.3-.1.800-.3 1.700-.3.900-.1 1.200-.1 3.600-.1z"/></svg>`,
};

/** Link mạng xã hội -> nút tròn có icon (nhận diện theo tên hoặc đường dẫn); không nhận diện được thì lấy chữ cái đầu */
function decorateSocial(footer) {
  footer.querySelectorAll('.footer-legal ul').forEach((ul) => {
    const links = [...ul.querySelectorAll(':scope > li > a')];
    if (!links.length) return;
    ul.classList.add('footer-social');
    links.forEach((a) => {
      const text = a.textContent.trim();
      const key = `${a.getAttribute('href') || ''} ${text}`.toLowerCase();
      const name = Object.keys(SOCIAL_ICONS).find((k) => key.includes(k));
      a.className = 'footer-social-link';
      a.setAttribute('aria-label', text);
      a.title = text;
      a.innerHTML = name
        ? SOCIAL_ICONS[name]
        : `<span class="footer-social-letter" aria-hidden="true">${text.charAt(0).toUpperCase()}</span>`;
    });
  });
}

/**
 * Nhận diện 2 phần của footer theo NỘI DUNG, không phụ thuộc vào đường kẻ ngang
 * (section break) trong document /footer:
 *   - footer-links: danh sách có lồng nhau (tiêu đề cột -> các link)
 *   - footer-legal: mọi thứ còn lại (mạng xã hội, bản quyền, điều khoản)
 * @param {Element} fragment
 * @returns {Element[]} các section đã dựng lại
 */
function buildSections(fragment) {
  const items = [...fragment.querySelectorAll('.default-content-wrapper')]
    .flatMap((wrapper) => [...wrapper.children]);
  const columns = items.find((el) => el.matches('ul, ol') && el.querySelector('ul, ol'));
  const rest = items.filter((el) => el !== columns);

  const make = (name, els) => {
    if (!els.length) return null;
    const section = document.createElement('div');
    section.className = `section ${name}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'default-content-wrapper';
    wrapper.append(...els);
    section.append(wrapper);
    return section;
  };

  return [
    make('footer-links', columns ? [columns] : []),
    make('footer-legal', rest),
  ].filter(Boolean);
}

/**
 * Cấu trúc document /footer (chỉ cần đúng thứ tự):
 *  1. Danh sách 2 cấp: cấp 1 = tiêu đề cột, cấp 2 = các link
 *  2. Mạng xã hội (danh sách link), bản quyền, điều khoản
 * @param {Element} block
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  block.textContent = '';
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  const footer = document.createElement('div');
  footer.append(...buildSections(fragment));

  decorateSocial(footer);

  // tiêu đề cột -> button (accordion trên mobile, tiêu đề tĩnh trên desktop)
  footer.querySelectorAll('.footer-links .default-content-wrapper > ul > li').forEach((li) => {
    const sub = li.querySelector(':scope > ul');
    if (!sub) return;

    const labelNodes = [...li.childNodes].filter((node) => node !== sub);
    const label = labelNodes.map((node) => node.textContent).join('').trim();
    labelNodes.forEach((node) => node.remove());

    const title = document.createElement('button');
    title.type = 'button';
    title.className = 'footer-col-title';
    title.textContent = label;
    title.setAttribute('aria-expanded', 'false');
    title.addEventListener('click', () => {
      const open = title.getAttribute('aria-expanded') === 'true';
      title.setAttribute('aria-expanded', String(!open));
      li.classList.toggle('open', !open);
    });
    li.prepend(title);
  });

  block.append(footer);
}
