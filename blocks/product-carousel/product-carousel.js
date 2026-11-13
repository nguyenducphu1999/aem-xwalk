import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const COPY_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';

// nhãn trong tài liệu (không phân biệt hoa thường, bỏ dấu) -> trường dữ liệu
const FIELDS = {
  badge: 'badge',
  ma: 'model',
  model: 'model',
  sku: 'model',
  danhgia: 'rating',
  rating: 'rating',
  gia: 'price',
  giacu: 'old',
  giam: 'discount',
  thanhvien: 'member',
  tragop: 'installment',
};

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '');

const CURRENCY = /\d[\d.,]*\s*(đ|₫|vnd|vnđ)/i;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Đọc các đoạn văn trong ô nội dung thành các trường của thẻ sản phẩm */
function parseBody(cell) {
  const data = {};
  const links = [...cell.querySelectorAll('a')];

  [...cell.querySelectorAll('p')].forEach((p) => {
    if (p.querySelector('a') && !/[:：]/.test(p.textContent)) return; // đoạn chỉ chứa link
    const text = p.textContent.trim();
    if (!text) return;

    const match = text.match(/^([^:：]{1,20})[:：]\s*(.+)$/);
    const field = match && FIELDS[norm(match[1])];
    if (field) {
      data[field] = match[2].trim();
    } else if (!p.querySelector('a')) {
      if (!data.title) data.title = text;
      else if (!data.price && CURRENCY.test(text)) data.price = text; // tương thích cách viết cũ
      else if (!data.note) data.note = text;
    }
  });

  // nút "Mua ngay" = link in đậm (hoặc link cuối nếu có từ 2 link); link còn lại = "Tìm hiểu thêm"
  const buy = links.find((a) => a.closest('strong, b'))
    || (links.length > 1 ? links[links.length - 1] : null);
  const learn = links.find((a) => a !== buy);
  return { ...data, buy, learn };
}

function buildStars(value) {
  const rating = parseFloat(String(value).replace(',', '.'));
  if (Number.isNaN(rating)) return null;
  const stars = el('span', 'pc-stars', '★★★★★');
  stars.style.setProperty('--r', Math.min(5, Math.max(0, rating)));
  stars.setAttribute('aria-hidden', 'true');
  return { stars, rating };
}

function buildCard(row) {
  const [imageCell, bodyCell] = row.children;
  const d = bodyCell ? parseBody(bodyCell) : {};
  const li = el('li', 'product-card');
  moveInstrumentation(row, li);

  // nhãn (Mới, Bán chạy...)
  const badgeRow = el('div', 'pc-badge-row');
  if (d.badge) badgeRow.append(el('span', 'pc-badge', d.badge));

  // tên sản phẩm
  const title = el('h3', 'pc-title', d.title || '');

  // mã sản phẩm + đánh giá
  const meta = el('div', 'pc-meta');
  if (d.model) {
    const model = el('span', 'pc-model');
    model.append(el('span', 'pc-model-text', d.model));
    const copy = el('button', 'pc-copy');
    copy.type = 'button';
    copy.setAttribute('aria-label', `Sao chép mã ${d.model}`);
    copy.title = 'Sao chép mã';
    copy.innerHTML = COPY_ICON;
    copy.addEventListener('click', async (e) => {
      e.stopPropagation();
      let done = false;
      try {
        await navigator.clipboard.writeText(d.model);
        done = true;
      } catch (err) {
        // clipboard API bị chặn (trang không https...): dùng cách dự phòng
        const area = document.createElement('textarea');
        area.value = d.model;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.append(area);
        area.select();
        try { done = document.execCommand('copy'); } catch (e) { done = false; }
        area.remove();
      }
      if (done) {
        copy.classList.add('copied');
        copy.title = 'Đã sao chép';
        setTimeout(() => { copy.classList.remove('copied'); copy.title = 'Sao chép mã'; }, 1400);
      }
    });
    model.append(copy);
    meta.append(model);
  }
  if (d.rating) {
    const parsed = buildStars(d.rating);
    if (parsed) {
      const count = (d.rating.match(/\((\d+)\)/) || [])[1];
      const wrap = el('span', 'pc-rating');
      wrap.setAttribute('role', 'img');
      wrap.setAttribute('aria-label', `${parsed.rating} trên 5 sao${count ? `, ${count} đánh giá` : ''}`);
      wrap.append(parsed.stars);
      if (count) wrap.append(el('span', 'pc-count', `(${count})`));
      meta.append(wrap);
    }
  }

  // ảnh
  const media = el('div', 'pc-media');
  const img = imageCell?.querySelector('img');
  if (img) {
    const picture = createOptimizedPicture(img.src, img.alt || d.title || '', false, [{ width: '700' }]);
    moveInstrumentation(img, picture.querySelector('img'));
    media.append(picture);
  }

  // khối giá
  const prices = el('div', 'pc-prices');
  prices.append(el('div', 'pc-discount', d.discount ? `Giảm ${d.discount}` : ''));
  const priceRow = el('div', 'pc-price-row');
  if (d.price) priceRow.append(el('span', 'pc-price', d.price));
  if (d.old) priceRow.append(el('s', 'pc-old', d.old));
  prices.append(priceRow);
  const member = el('div', 'pc-member');
  if (d.member) {
    member.append('Ưu đãi thành viên ');
    member.append(el('strong', '', d.member));
  }
  prices.append(member);
  prices.append(el('div', 'pc-installment', d.installment || ''));
  if (!d.price && d.note) prices.append(el('div', 'pc-note', d.note));

  // hành động
  const actions = el('div', 'pc-actions');
  let target = null;
  if (d.learn) {
    const learn = el('a', 'pc-learn', d.learn.textContent.trim());
    learn.href = d.learn.href;
    actions.append(learn);
    target = learn;
  }
  if (d.buy) {
    const buy = el('a', 'pc-buy', d.buy.textContent.trim());
    buy.href = d.buy.href;
    actions.append(buy);
    if (!target) target = buy;
  }

  li.append(badgeRow, title, meta, media, prices, actions);

  // cả thẻ bấm được (trừ nút và link bên trong)
  if (target) {
    li.classList.add('is-clickable');
    li.addEventListener('click', (e) => {
      if (!e.target.closest('a, button')) target.click();
    });
  }
  return li;
}

/**
 * Carousel sản phẩm kiểu LG. Mỗi dòng của bảng = 1 thẻ: [ảnh | nội dung]
 * Ô nội dung, mỗi dòng một đoạn văn:
 *   Tên sản phẩm                      (đoạn không nhãn đầu tiên)
 *   Badge: Mới                        (tùy chọn)
 *   Mã: GR-X257BG
 *   Đánh giá: 4.5 (145)
 *   Giảm: 15.500.000 ₫
 *   Giá: 40.490.000 ₫
 *   Giá cũ: 55.990.000 ₫
 *   Thành viên: 39.680.200 ₫
 *   Trả góp: Chỉ 3.374.167đ/tháng (12 tháng) với 0% lãi suất
 *   [Tìm hiểu thêm](link)  và  **[Mua ngay](link)**  (link in đậm = nút Mua ngay)
 * Trường nào không cần thì bỏ dòng đó.
 * @param {Element} block
 */
export default function decorate(block) {
  const track = el('ul', 'product-carousel-track');
  [...block.children].forEach((row) => track.append(buildCard(row)));

  // các trường có mặt ở ít nhất một thẻ -> CSS giữ chỗ để các thẻ thẳng hàng
  ['badge', 'discount', 'member', 'installment', 'meta'].forEach((name) => {
    const selector = {
      badge: '.pc-badge', discount: '.pc-discount:not(:empty)', member: '.pc-member:not(:empty)',
      installment: '.pc-installment:not(:empty)', meta: '.pc-meta > *',
    }[name];
    if (track.querySelector(selector)) block.classList.add(`has-${name}`);
  });

  const prev = el('button', 'product-carousel-prev');
  prev.type = 'button';
  prev.setAttribute('aria-label', 'Sản phẩm trước');
  const next = el('button', 'product-carousel-next');
  next.type = 'button';
  next.setAttribute('aria-label', 'Sản phẩm sau');

  const step = () => track.clientWidth * 0.8;
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));

  const updateButtons = () => {
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  };
  track.addEventListener('scroll', updateButtons, { passive: true });
  window.addEventListener('resize', updateButtons);

  block.replaceChildren(track, prev, next);
  updateButtons();
}
