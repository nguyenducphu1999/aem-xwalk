import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const AUTOPLAY_MS = 6000;

const SVG = 'viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"';
const ICONS = {
  prev: `<svg ${SVG} fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`,
  next: `<svg ${SVG} fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>`,
  pause: `<svg ${SVG} fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>`,
  play: `<svg ${SVG} fill="currentColor"><path d="M8 5.500v13a1 1 0 0 0 1.500.9l10-6.500a1 1 0 0 0 0-1.700l-10-6.500A1 1 0 0 0 8 5.500z"/></svg>`,
};

function button(className, label, html) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.setAttribute('aria-label', label);
  el.innerHTML = html;
  return el;
}

/**
 * Hero carousel kiểu LG: ảnh banner bo góc lớn, thanh tiến trình + cụm nút điều khiển.
 * Mỗi dòng của bảng = 1 slide: [ảnh | nội dung]
 *  - Ô ảnh: 1 ảnh (dùng cho mọi màn hình) hoặc 2 ảnh (ảnh 1 = desktop, ảnh 2 = mobile).
 *  - Ô nội dung: tiêu đề, mô tả, nút hiện trên ảnh trong thẻ kính mờ. Link đầu tiên cũng làm
 *    đích bấm của cả slide. Nếu ảnh banner đã có sẵn chữ, đặt tên block là "Carousel (image-only)"
 *    để ẩn thẻ chữ (chữ vẫn có cho trình đọc màn hình).
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const total = rows.length;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // trong Universal Editor: không tự chạy và không khóa slide để tác giả chọn được từng slide
  const editing = block.hasAttribute('data-aue-resource') || !!block.querySelector('[data-aue-resource]');

  const track = document.createElement('ul');
  track.className = 'carousel-track';

  rows.forEach((row, i) => {
    const slide = document.createElement('li');
    slide.className = 'carousel-slide';
    moveInstrumentation(row, slide);
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${i + 1} / ${total}`);

    const [imageCell, contentCell, mobileCell] = row.children;

    if (imageCell) {
      // ảnh thứ nhất = desktop, ảnh thứ hai (ô thứ ba của dòng, hoặc ảnh thứ hai trong ô ảnh) = mobile
      const pictures = [
        ...imageCell.querySelectorAll('picture'),
        ...(mobileCell ? mobileCell.querySelectorAll('picture') : []),
      ];
      const media = document.createElement('div');
      media.className = 'carousel-image';
      pictures.forEach((picture, p) => {
        const img = picture.querySelector('img');
        if (!img) return;
        const hasMobile = pictures.length > 1;
        const breakpoints = hasMobile && p === 1
          ? [{ width: '900' }]
          : [{ media: '(width >= 900px)', width: '2000' }, { width: '1200' }];
        const optimized = createOptimizedPicture(img.src, img.alt, i === 0, breakpoints);
        moveInstrumentation(img, optimized.querySelector('img'));
        if (hasMobile) optimized.classList.add(p === 0 ? 'is-desktop' : 'is-mobile');
        media.append(optimized);
        if (hasMobile) block.classList.add('has-mobile-image');
      });
      slide.append(media);
    }

    if (contentCell) {
      contentCell.className = 'carousel-content';
      const link = contentCell.querySelector('a');
      if (link) {
        // cả slide bấm được; link thật vẫn nằm trong nội dung cho bàn phím/trình đọc màn hình
        const overlay = document.createElement('a');
        overlay.className = 'carousel-slide-link';
        overlay.href = link.href;
        overlay.tabIndex = -1;
        overlay.setAttribute('aria-hidden', 'true');
        slide.append(overlay);
      }
      slide.append(contentCell);
    }
    track.append(slide);
  });

  block.textContent = '';
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');
  block.setAttribute('aria-label', 'Banner nổi bật');
  block.style.setProperty('--carousel-autoplay', `${AUTOPLAY_MS}ms`);
  block.append(track);

  if (total < 2) return;

  const slides = [...track.children];
  let current = -1;
  let paused = reduceMotion || editing;

  // thanh tiến trình (mỗi slide một đoạn, đoạn đang chọn chạy đầy trong AUTOPLAY_MS)
  const progress = document.createElement('div');
  progress.className = 'carousel-progress';
  const segments = slides.map((_, i) => {
    const seg = document.createElement('button');
    seg.type = 'button';
    seg.className = 'carousel-seg';
    seg.setAttribute('aria-label', `Đến slide ${i + 1}`);
    const fill = document.createElement('span');
    fill.className = 'carousel-seg-fill';
    seg.append(fill);
    seg.addEventListener('click', () => goTo(i)); // eslint-disable-line no-use-before-define
    progress.append(seg);
    return seg;
  });

  // cụm nút: trước / tạm dừng / sau
  const controls = document.createElement('div');
  controls.className = 'carousel-controls';
  const prev = button('carousel-prev', 'Slide trước', ICONS.prev);
  const toggle = button('carousel-toggle', 'Tạm dừng', ICONS.pause);
  const next = button('carousel-next', 'Slide sau', ICONS.next);
  controls.append(prev, toggle, next);

  block.append(progress, controls);

  function setActive(index) {
    if (index === current) return;
    current = index;
    slides.forEach((slide, i) => { slide.inert = !editing && i !== index; });
    segments.forEach((seg, i) => {
      if (i === index) seg.setAttribute('aria-current', 'true');
      else seg.removeAttribute('aria-current');
    });
  }

  function goTo(index) {
    const target = (index + total) % total;
    track.scrollTo({ left: target * track.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
    setActive(target);
  }

  function setPaused(value) {
    paused = value;
    block.classList.toggle('is-paused', paused);
    toggle.innerHTML = paused ? ICONS.play : ICONS.pause;
    toggle.setAttribute('aria-label', paused ? 'Phát' : 'Tạm dừng');
  }

  prev.addEventListener('click', () => goTo(current - 1));
  next.addEventListener('click', () => goTo(current + 1));
  toggle.addEventListener('click', () => setPaused(!paused));

  // hết thời gian của đoạn đang chạy -> sang slide kế
  progress.addEventListener('animationend', (e) => {
    if (e.target.classList.contains('carousel-seg-fill') && !paused) goTo(current + 1);
  });

  // dừng khi rê chuột hoặc focus vào carousel
  block.addEventListener('mouseenter', () => block.classList.add('is-hover'));
  block.addEventListener('mouseleave', () => block.classList.remove('is-hover'));
  block.addEventListener('focusin', () => block.classList.add('is-hover'));
  block.addEventListener('focusout', () => block.classList.remove('is-hover'));

  // cập nhật trạng thái khi người dùng vuốt/cuộn
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActive(slides.indexOf(entry.target));
    });
  }, { root: track, threshold: 0.6 });
  slides.forEach((slide) => observer.observe(slide));

  setPaused(paused);
  setActive(0);
}
