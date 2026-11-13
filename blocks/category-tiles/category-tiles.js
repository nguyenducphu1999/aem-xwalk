import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Lưới icon danh mục. Mỗi dòng = 1 ô: [ảnh | tên danh mục có link]
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const [imageCell, textCell] = row.children;
    const link = textCell?.querySelector('a');
    const label = textCell?.textContent.trim() || '';

    const tile = document.createElement(link ? 'a' : 'div');
    tile.className = 'category-tile';
    if (link) tile.href = link.href;

    const img = imageCell?.querySelector('img');
    if (img) {
      const media = document.createElement('div');
      media.className = 'category-tile-media';
      const picture = createOptimizedPicture(img.src, img.alt || label, false, [{ width: '240' }]);
      moveInstrumentation(img, picture.querySelector('img'));
      media.append(picture);
      tile.append(media);
    }

    const name = document.createElement('span');
    name.className = 'category-tile-label';
    name.textContent = label;
    tile.append(name);

    const li = document.createElement('li');
    moveInstrumentation(row, li);
    li.append(tile);
    ul.append(li);
  });

  block.replaceChildren(ul);
}
