/* ══════════════════════════════════════
   PRODUCT.JS — Q-tech страница товара
   ══════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  initProductPage();

});

function initProductPage() {

  const params = new URLSearchParams(window.location.search);
  const id     = params.get('id');
  const product = getProductById(id);

  if (!product) {
    renderNotFound();
    return;
  }

  renderProduct(product);
  renderRelated(product);
}

/* ── RENDER PRODUCT ── */

function renderProduct(p) {

  /* Title / meta */
  document.title = `${p.title} — Q-tech`;

  /* Breadcrumb */
  const bcCategory = document.getElementById('bc-category');
  const bcProduct  = document.getElementById('bc-product');
  if (bcCategory) {
    bcCategory.textContent = CATEGORY_LABELS[p.category] || 'Каталог';
    bcCategory.href = `catalog.html?category=${p.category}`;
  }
  if (bcProduct) bcProduct.textContent = p.title;

  /* Brand */
  setEl('product-brand', p.brand);

  /* Title */
  setEl('product-title', p.title);

  /* Rating */
  const ratingEl = document.getElementById('product-rating');
  if (ratingEl) ratingEl.innerHTML = `
    ${starsHTML(p.rating)}
    <span class="product-rating-val">${p.rating}</span>
    <span class="product-reviews-count">(${p.reviews} отзывов)</span>
  `;

  /* Price */
  setEl('product-price', `${formatPrice(p.price)} ₽`);
  const oldPriceEl = document.getElementById('product-price-old');
  if (oldPriceEl) {
    if (p.oldPrice) {
      oldPriceEl.textContent = `${formatPrice(p.oldPrice)} ₽`;
      oldPriceEl.style.display = '';
      const saveEl = document.getElementById('product-price-save');
      if (saveEl) {
        const save = p.oldPrice - p.price;
        saveEl.textContent = `Выгода: ${formatPrice(save)} ₽`;
      }
    } else {
      oldPriceEl.style.display = 'none';
    }
  }

  /* Availability */
  const availDot  = document.querySelector('.avail-dot');
  const availText = document.querySelector('.avail-text');
  if (availDot && availText) {
    if (p.inStock) {
      availText.textContent = 'В наличии';
    } else {
      availDot.classList.add('unavail');
      availText.textContent = 'Нет в наличии';
    }
  }

  /* Description */
  setEl('product-desc', p.description);

  /* Specs */
  const specsEl = document.getElementById('product-specs');
  if (specsEl && p.specs) {
    specsEl.innerHTML = Object.entries(p.specs).map(([k, v]) => `
      <div class="spec-row">
        <span class="spec-key">${k}</span>
        <span class="spec-val">${v}</span>
      </div>
    `).join('');
  }

  /* Gallery */
  renderGallery(p);

  /* Color & Storage variants */
  renderColorSelector(p);
  renderStorageSelector(p);
  /* Reviews */
  renderProductReviews(p);

  /* Cart button */
  initProductCartBtn(p);
}

/* ── STATE ── */
let _selectedColor   = null;
let _selectedStorage = null;

/* ── COLOR SELECTOR ── */
function renderColorSelector(p) {
  const selectorEl = document.getElementById('product-color-selector');
  const swatchesEl = document.getElementById('color-swatches');
  const nameEl     = document.getElementById('color-selected-name');

  if (!selectorEl || !swatchesEl || !p.colorVariants || !p.colorVariants.length) return;

  // Если новая структура (без id у варианта) — используем новую логику
  if (p.colorVariants[0].images) {
    selectorEl.style.display = '';
    _selectedColor = p.colorVariants[0];
    if (nameEl) nameEl.textContent = _selectedColor.colorName;

    function renderSwatches() {
      swatchesEl.innerHTML = p.colorVariants.map(v => `
        <div
          class="color-swatch ${v.colorCode === _selectedColor.colorCode ? 'active' : ''}"
          style="background:${v.hex};"
          title="${v.colorName}"
          data-code="${v.colorCode}"
          data-name="${v.colorName}"
        ></div>
      `).join('');

      swatchesEl.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
          _selectedColor = p.colorVariants.find(v => v.colorCode === swatch.dataset.code);
          if (nameEl) nameEl.textContent = _selectedColor.colorName;
          // Обновляем галерею
          const fakeProduct = { ...p, images: _selectedColor.images };
          renderGallery(fakeProduct);
          renderSwatches();
        });
        swatch.addEventListener('mouseenter', () => {
          if (nameEl) nameEl.textContent = swatch.dataset.name;
        });
        swatch.addEventListener('mouseleave', () => {
          if (nameEl) nameEl.textContent = _selectedColor.colorName;
        });
      });
    }

    renderSwatches();
    return;
  }

  // Старая логика (с id) — для ноутбуков и других
  if (p.colorVariants.length < 2) return;
  selectorEl.style.display = '';
  const currentVariant = p.colorVariants.find(v => v.id === p.id) || p.colorVariants[0];
  if (nameEl) nameEl.textContent = currentVariant.colorName;

  swatchesEl.innerHTML = p.colorVariants.map(v => `
    <div
      class="color-swatch ${v.id === p.id ? 'active' : ''}"
      style="background:${v.hex};"
      title="${v.colorName}"
      data-id="${v.id}"
      data-name="${v.colorName}"
    ></div>
  `).join('');

  swatchesEl.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      const targetId = Number(swatch.dataset.id);
      if (targetId === p.id) return;
      const newProduct = getProductById(targetId);
      if (newProduct) {
        window.history.pushState({}, '', `product.html?id=${targetId}`);
        renderProduct(newProduct);
        renderRelated(newProduct);
      }
    });
    swatch.addEventListener('mouseenter', () => {
      if (nameEl) nameEl.textContent = swatch.dataset.name;
    });
    swatch.addEventListener('mouseleave', () => {
      if (nameEl) nameEl.textContent = currentVariant.colorName;
    });
  });
}

/* ── STORAGE SELECTOR ── */
function renderStorageSelector(p) {
  if (!p.storageVariants || !p.storageVariants.length) return;

  // Ищем существующий блок или создаём новый
  let storageEl = document.getElementById('product-storage-selector');
  if (!storageEl) {
    storageEl = document.createElement('div');
    storageEl.id = 'product-storage-selector';
    // Вставляем после color selector
    const colorSel = document.getElementById('product-color-selector');
    if (colorSel) colorSel.after(storageEl);
    else document.getElementById('product-cart-action')?.before(storageEl);
  }

  _selectedStorage = p.storageVariants[0];

  function renderButtons() {
    storageEl.innerHTML = `
      <div style="margin-bottom:16px;">
        <div style="font-size:13px;color:#9795B5;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">
          Память
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${p.storageVariants.map(v => `
            <button
              class="storage-btn ${v.storage === _selectedStorage.storage ? 'active' : ''}"
              data-storage="${v.storage}"
              data-price="${v.price}"
              data-old="${v.oldPrice || ''}"
              style="
                padding: 8px 16px;
                border-radius: 10px;
                border: 1.5px solid ${v.storage === _selectedStorage.storage ? '#01C38D' : '#2a2f3f'};
                background: ${v.storage === _selectedStorage.storage ? 'rgba(1,195,141,0.1)' : 'transparent'};
                color: ${v.storage === _selectedStorage.storage ? '#01C38D' : '#9795B5'};
                font-family: 'DM Sans', sans-serif;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: 0.2s;
              "
            >${v.storage}</button>
          `).join('')}
        </div>
      </div>
    `;

    storageEl.querySelectorAll('.storage-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _selectedStorage = p.storageVariants.find(v => v.storage === btn.dataset.storage);

        // Обновляем цену
        const priceEl   = document.getElementById('product-price');
        const oldPriceEl = document.getElementById('product-price-old');
        const saveEl    = document.getElementById('product-price-save');
        if (priceEl) priceEl.textContent = `${formatPrice(_selectedStorage.price)} ₽`;
        if (oldPriceEl) {
          if (_selectedStorage.oldPrice) {
            oldPriceEl.textContent = `${formatPrice(_selectedStorage.oldPrice)} ₽`;
            oldPriceEl.style.display = '';
            if (saveEl) saveEl.textContent = `Выгода: ${formatPrice(_selectedStorage.oldPrice - _selectedStorage.price)} ₽`;
          } else {
            oldPriceEl.style.display = 'none';
            if (saveEl) saveEl.textContent = '';
          }
        }

        renderButtons();
      });
    });
  }

  renderButtons();

  // Устанавливаем начальную цену по первому варианту
  const priceEl = document.getElementById('product-price');
  if (priceEl) priceEl.textContent = `от ${formatPrice(_selectedStorage.price)} ₽`;
}

/* ── GALLERY ── */

function renderGallery(p) {
  const mainImg  = document.getElementById('main-product-img');
  const thumbsEl = document.getElementById('product-thumbs');

  if (!mainImg) return;

  const images = p.images && p.images.length ? p.images : ['img/placeholder.webp'];

  mainImg.src = images[0];
  mainImg.alt = p.title;

  if (!thumbsEl || images.length <= 1) return;

  thumbsEl.innerHTML = images.map((src, i) => `
    <div class="product-thumb ${i === 0 ? 'active' : ''}" data-img="${src}">
      <img src="${src}" alt="${p.title} фото ${i+1}" onerror="this.src='img/placeholder.webp'">
    </div>
  `).join('');

  thumbsEl.querySelectorAll('.product-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbsEl.querySelectorAll('.product-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      mainImg.style.opacity = '0';
      setTimeout(() => {
        mainImg.src = thumb.dataset.img;
        mainImg.style.opacity = '1';
      }, 150);
    });
  });
}

/* ── PRODUCT CART BUTTON ── */

function initProductCartBtn(p) {
  const btnWrap = document.getElementById('product-cart-action');
  if (!btnWrap) return;

  function render() {
    const qty = Cart.getQty(p.id);
    if (qty === 0) {
      btnWrap.innerHTML = `
        <button class="product-add-btn" id="product-add">В корзину</button>
      `;
      document.getElementById('product-add').addEventListener('click', () => {
        Cart.add(p);
        render();
      });
    } else {
      btnWrap.innerHTML = `
        <div class="product-qty">
          <button class="product-qty-btn" id="pqty-dec">−</button>
          <span class="product-qty-val">${qty}</span>
          <button class="product-qty-btn" id="pqty-inc">+</button>
        </div>
      `;
      document.getElementById('pqty-inc').addEventListener('click', () => { Cart.increment(p.id); render(); });
      document.getElementById('pqty-dec').addEventListener('click', () => { Cart.decrement(p.id); render(); });
    }
  }

  render();
}

/* ── RELATED PRODUCTS ── */

function renderRelated(p) {
  const grid = document.getElementById('related-grid');
  if (!grid) return;

  const related = PRODUCTS
    .filter(r => r.category === p.category && r.id !== p.id)
    .slice(0, 4);

  if (!related.length) {
    const section = document.querySelector('.related-section');
    if (section) section.style.display = 'none';
    return;
  }

  grid.innerHTML = related.map((r, i) => `
    <div class="product-card" data-id="${r.id}" style="animation-delay:${i*80}ms; cursor:pointer;">
      <div class="product-card-img">
        ${badgeHTML(r.badge)}
        <img src="${r.images[0]}" alt="${r.title}" onerror="this.src='img/placeholder.webp'">
      </div>
      <div class="product-card-brand">${r.brand}</div>
      <div class="product-card-title">${r.title}</div>
      <div class="product-card-rating">
        ${starsHTML(r.rating)}
        <span class="count">(${r.reviews})</span>
      </div>
      <div class="product-card-footer">
        <div class="product-card-price">${formatPrice(r.price)} ₽</div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `product.html?id=${card.dataset.id}`;
    });
  });
}

/* ── NOT FOUND ── */

function renderNotFound() {
  const main = document.querySelector('.product-layout');
  if (main) main.innerHTML = `
    <div style="text-align:center; padding:80px 20px; grid-column:1/-1;">
      <div style="font-size:56px; margin-bottom:20px;">😔</div>
      <h2 style="font-size:28px; margin-bottom:12px;">Товар не найден</h2>
      <p style="color:#5f6675; margin-bottom:28px;">Возможно, он был удалён или ссылка неверна</p>
      <a href="catalog.html" style="color:#01C38D; text-decoration:none; font-size:16px;">← Вернуться в каталог</a>
    </div>
  `;
}

/* ── HELPERS ── */

function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ── REVIEWS ── */

const REVIEWS_POOL = [
  { name: 'Александр И.', initials: 'АИ', rating: 5, text: 'Отличный товар! Доставили быстро, всё в идеальном состоянии. Очень доволен покупкой, рекомендую.' },
  { name: 'Мария С.',      initials: 'МС', rating: 5, text: 'Брала в подарок — получателю очень понравилось. Качество на высоте, цена выгоднее чем в официальных магазинах.' },
  { name: 'Дмитрий К.',    initials: 'ДК', rating: 4, text: 'Хороший товар, небольшая задержка с доставкой, но в целом всё отлично. Заказывал уже не первый раз.' },
  { name: 'Елена В.',      initials: 'ЕВ', rating: 5, text: 'Супер! Всё пришло запакованное, оригинал, работает отлично. Поддержка быстро ответила на вопросы.' },
  { name: 'Роман П.',      initials: 'РП', rating: 4, text: 'Товар соответствует описанию. Упаковка целая, комплект полный. Доволен покупкой.' },
  { name: 'Ирина Т.',      initials: 'ИТ', rating: 5, text: 'Заказала второй раз — снова всё на уровне. Быстро, аккуратно, качественно.' },
  { name: 'Андрей М.',     initials: 'АМ', rating: 4, text: 'Пользуюсь уже месяц — всё работает отлично. Соотношение цена/качество отличное.' },
  { name: 'Наталья Ж.',   initials: 'НЖ', rating: 5, text: 'Очень довольна! Товар пришёл даже раньше срока, всё в порядке.' },
];

/* ── REVIEWS STATE ── */
let _currentProduct = null;
let _visibleReviews = 5;
let _userReviews = [];
let _selectedRating = 0;

function renderProductReviews(p) {
  _currentProduct = p;
  const section = document.getElementById('product-reviews-section');
  const list    = document.getElementById('product-reviews-list');
  if (!section || !list || !p.reviews || p.reviews === 0) return;

  section.style.display = '';

  // Show total count label
  const totalLabel = document.getElementById('reviews-total-label');
  if (totalLabel) totalLabel.textContent = p.reviews + ' отзывов';

  initStarPicker();
  renderReviewsList();
}

function reviewCardHTML(r, i) {
  const COLORS = [
    'linear-gradient(135deg,#01C38D,#0097e6)',
    'linear-gradient(135deg,#a855f7,#ec4899)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#10b981,#3b82f6)',
  ];
  const stars = '★'.repeat(r.rating) + '<span style="opacity:0.25">' + '★'.repeat(5 - r.rating) + '</span>';
  return `
    <div style="
      background:rgba(17,24,43,0.7);
      border:1px solid rgba(255,255,255,0.07);
      border-radius:20px;padding:24px 28px;
      display:flex;gap:16px;align-items:flex-start;
    ">
      <div style="
        width:44px;height:44px;border-radius:50%;flex-shrink:0;
        background:${COLORS[i % COLORS.length]};
        display:flex;align-items:center;justify-content:center;
        font-size:13px;font-weight:700;color:#191C29;
      ">${r.initials}</div>
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;flex-wrap:wrap;">
          <span style="font-size:15px;font-weight:700;color:white;">${r.name}</span>
          <span style="color:#f5c518;font-size:14px;">${stars}</span>
          ${r.isNew ? '<span style="font-size:11px;background:rgba(1,195,141,0.12);color:#01C38D;border-radius:6px;padding:2px 8px;font-weight:600;">Новый</span>' : ''}
        </div>
        <p style="font-size:14px;color:#9795B5;line-height:1.6;margin:0;">${r.text}</p>
      </div>
    </div>
  `;
}

function renderReviewsList() {
  if (!_currentProduct) return;
  const list = document.getElementById('product-reviews-list');
  if (!list) return;

  // Combine user reviews + pool reviews up to p.reviews total
  const poolCount = Math.max(0, Math.min(_currentProduct.reviews, 40) - _userReviews.length);
  const poolReviews = Array.from({ length: poolCount }, (_, i) => REVIEWS_POOL[i % REVIEWS_POOL.length]);
  const allReviews = [..._userReviews, ...poolReviews];

  const visible = allReviews.slice(0, _visibleReviews);
  list.innerHTML = visible.map((r, i) => reviewCardHTML(r, i)).join('');

  // Show-more button
  const moreWrap = document.getElementById('reviews-show-more-wrap');
  const moreBtn  = document.getElementById('reviews-show-more-btn');
  if (moreWrap && moreBtn) {
    const remaining = allReviews.length - _visibleReviews;
    if (remaining > 0) {
      moreWrap.style.display = '';
      moreBtn.textContent = `Показать ещё ${Math.min(remaining, 5)} из ${_currentProduct.reviews} отзывов`;
    } else {
      moreWrap.style.display = 'none';
    }
  }
}

function showMoreReviews() {
  _visibleReviews += 5;
  renderReviewsList();
}

/* ── STAR PICKER ── */
function initStarPicker() {
  const stars = document.querySelectorAll('.rev-star');
  stars.forEach(star => {
    star.addEventListener('mouseenter', () => {
      const val = Number(star.dataset.val);
      stars.forEach(s => {
        s.style.color = Number(s.dataset.val) <= val ? '#f5c518' : '#2a2f3f';
      });
    });
    star.addEventListener('mouseleave', () => {
      stars.forEach(s => {
        s.style.color = Number(s.dataset.val) <= _selectedRating ? '#f5c518' : '#2a2f3f';
      });
    });
    star.addEventListener('click', () => {
      _selectedRating = Number(star.dataset.val);
      stars.forEach(s => {
        s.style.color = Number(s.dataset.val) <= _selectedRating ? '#f5c518' : '#2a2f3f';
      });
    });
  });
}

/* ── SUBMIT REVIEW ── */
function submitReview() {
  const name = (document.getElementById('review-name').value || '').trim();
  const text = (document.getElementById('review-text').value || '').trim();

  if (!_selectedRating) { alert('Пожалуйста, выберите оценку'); return; }
  if (!name)            { alert('Пожалуйста, введите ваше имя'); return; }
  if (text.length < 10) { alert('Напишите отзыв подробнее (минимум 10 символов)'); return; }

  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const newReview = { name, initials, rating: _selectedRating, text, isNew: true };
  _userReviews.unshift(newReview);
  _visibleReviews = Math.max(_visibleReviews, _userReviews.length);

  // Update total label
  if (_currentProduct) {
    _currentProduct.reviews++;
    const totalLabel = document.getElementById('reviews-total-label');
    if (totalLabel) totalLabel.textContent = _currentProduct.reviews + ' отзывов';
  }

  // Reset form
  document.getElementById('review-name').value = '';
  document.getElementById('review-text').value = '';
  _selectedRating = 0;
  document.querySelectorAll('.rev-star').forEach(s => s.style.color = '#2a2f3f');

  // Re-render
  renderReviewsList();

  // Scroll to list
  document.getElementById('product-reviews-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

