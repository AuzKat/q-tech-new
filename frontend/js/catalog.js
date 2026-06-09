/* ══════════════════════════════════════
   CATALOG.JS — Q-tech каталог
   ══════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  initCatalog();

});

/* ══════════════════════════════════════
   CATALOG CORE
   ══════════════════════════════════════ */

let activeCategory = 'all';
let activeFilters = {
  brands: [],
  priceMax: Infinity,
  priceMin: 0,
  inStock: false,
  sort: 'popular',
  search: '',
  minRating: 0,
  badges: [],
};

function initCatalog() {

  const params   = new URLSearchParams(window.location.search);
  activeCategory = params.get('category') || 'all';

  const searchQuery = params.get('search') || '';
if (searchQuery) {
  activeFilters.search = searchQuery;
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = searchQuery;
    document.querySelector('.search-box')?.classList.add('active');
  }
}

  /* Set heading */
  const label = CATEGORY_LABELS[activeCategory] || 'Каталог';
  const h1    = document.getElementById('catalog-title');
  const bc    = document.getElementById('breadcrumb-cat');
  if (h1) h1.innerHTML = label;
  if (bc) bc.textContent = label;

  /* Price range defaults */
  const allPrices = PRODUCTS.map(p => p.price);
  activeFilters.priceMin = Math.min(...allPrices);
  activeFilters.priceMax = Math.max(...allPrices);

  buildFilters();
  renderProducts();
  bindSort();
  bindMobileFilter();

  Cart.onChange(() => {
    document.querySelectorAll('[data-cart-btn]').forEach(btn => {
      refreshCartBtn(Number(btn.dataset.cartBtn));
    });
    document.querySelectorAll('[data-qty-inc]').forEach(btn => {
      refreshCartBtn(Number(btn.dataset.qtyInc));
    });
  });
}

/* ── RENDER PRODUCTS ── */

function renderProducts() {

  const grid = document.getElementById('products-grid');
  if (!grid) return;

  let items = activeCategory === 'all'
    ? [...PRODUCTS]
    : PRODUCTS.filter(p => p.category === activeCategory);

  /* Filters */
  if (activeFilters.brands.length) {
    items = items.filter(p => activeFilters.brands.includes(p.brand));
  }

  items = items.filter(p =>
    p.price >= activeFilters.priceMin &&
    p.price <= activeFilters.priceMax
  );

  if (activeFilters.inStock) {
    items = items.filter(p => p.inStock);
  }

  if (activeFilters.minRating > 0) {
    items = items.filter(p => p.rating >= activeFilters.minRating);
  }

  if (activeFilters.badges.length) {
    items = items.filter(p => activeFilters.badges.includes(p.badge));
  }

  if (activeFilters.search) {
  const q = activeFilters.search.toLowerCase();
  items = items.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.brand.toLowerCase().includes(q)
  );
}

  /* Sort */
  if (activeFilters.sort === 'price-asc')  items.sort((a, b) => a.price - b.price);
  if (activeFilters.sort === 'price-desc') items.sort((a, b) => b.price - a.price);
  if (activeFilters.sort === 'rating')     items.sort((a, b) => b.rating - a.rating);
  if (activeFilters.sort === 'new')        items.sort((a, b) => (b.badge === 'new' ? 1 : 0) - (a.badge === 'new' ? 1 : 0));

  /* Count */
  const count = document.getElementById('products-count');
  if (count) count.innerHTML = `Найдено <strong>${items.length}</strong> товаров`;

  /* Empty */
  if (!items.length) {
    grid.innerHTML = `
      <div class="catalog-empty">
        <span class="catalog-empty-icon">🔍</span>
        <h3>Ничего не найдено</h3>
        <p>Попробуйте изменить параметры фильтрации</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map((p, i) => productCardHTML(p, i)).join('');

  /* Bind card events */
  grid.querySelectorAll('.product-card').forEach(card => {
    /* click → product page */
    card.addEventListener('click', e => {
      if (e.target.closest('.add-to-cart-btn, .qty-control')) return;
      window.location.href = `product.html?id=${card.dataset.id}`;
    });
  });

  /* Cart buttons */
  grid.querySelectorAll('[data-cart-btn]').forEach(btn => {
    const id = Number(btn.dataset.cartBtn);
    const product = PRODUCTS.find(p => p.id === id);
    refreshCartBtn(id);
    btn.addEventListener('click', () => handleAddToCart(id, product));
  });

  /* Qty controls */
  bindQtyControls(grid);
}

/* ── CARD HTML ── */

function productCardHTML(p, i) {
  const delay = Math.min(i * 60, 400);
  return `
    <div class="product-card" data-id="${p.id}" style="animation-delay:${delay}ms">
      <div class="product-card-img">
        ${badgeHTML(p.badge)}
        <img src="${p.images[0]}" alt="${p.title}" onerror="this.src='img/placeholder.webp'">
      </div>
      <div class="product-card-brand">${p.brand}</div>
      <div class="product-card-title">${p.title}</div>
      <div class="product-card-rating">
        ${starsHTML(p.rating)}
        <span class="count">(${p.reviews})</span>
      </div>
      <div class="product-card-footer">
        <div>
          <div class="product-card-price">${formatPrice(p.price)} ₽</div>
          ${p.oldPrice ? `<div class="product-card-price-old">${formatPrice(p.oldPrice)} ₽</div>` : ''}
        </div>
        <div class="cart-btn-wrap" id="cart-wrap-${p.id}">
          <button class="add-to-cart-btn" data-cart-btn="${p.id}">В корзину</button>
        </div>
      </div>
    </div>
  `;
}

/* ── CART BUTTON LOGIC ── */

function handleAddToCart(id, product) {
  if (!product) return;
  Cart.add(product);
  refreshCartBtn(id);
}

function refreshCartBtn(id) {
  const wrap = document.getElementById(`cart-wrap-${id}`);
  if (!wrap) return;
  const qty = Cart.getQty(id);

  if (qty === 0) {
    wrap.innerHTML = `<button class="add-to-cart-btn" data-cart-btn="${id}">В корзину</button>`;
    wrap.querySelector('[data-cart-btn]').addEventListener('click', () => {
      const product = PRODUCTS.find(p => p.id === id);
      handleAddToCart(id, product);
    });
  } else {
    wrap.innerHTML = `
      <div class="qty-control">
        <button class="qty-btn" data-qty-dec="${id}">−</button>
        <span class="qty-value" id="qty-val-${id}">${qty}</span>
        <button class="qty-btn" data-qty-inc="${id}">+</button>
      </div>
    `;
    bindQtyControls(wrap, id);
  }
}

function bindQtyControls(container, specificId) {
  container.querySelectorAll('[data-qty-inc]').forEach(btn => {
    btn.addEventListener('click', () => {
      Cart.increment(btn.dataset.qtyInc);
      refreshCartBtn(Number(btn.dataset.qtyInc));
    });
  });
  container.querySelectorAll('[data-qty-dec]').forEach(btn => {
    btn.addEventListener('click', () => {
      Cart.decrement(btn.dataset.qtyDec);
      refreshCartBtn(Number(btn.dataset.qtyDec));
    });
  });
}

/* ── BUILD FILTERS ── */

function buildFilters() {
  buildBrandFilters('.sidebar');
  buildBrandFilters('.filter-drawer');
  buildPriceFilter('.sidebar');
  buildPriceFilter('.filter-drawer');
  buildRatingFilter('.sidebar');
  buildRatingFilter('.filter-drawer');
  buildBadgeFilter('.sidebar');
  buildBadgeFilter('.filter-drawer');
  bindFilterActions();
}

function buildBrandFilters(parentSelector) {
  const container = document.querySelector(`${parentSelector} .brand-list`);
  if (!container) return;

  const pool = activeCategory === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === activeCategory);

  const brandCounts = {};
  pool.forEach(p => { brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1; });

  container.innerHTML = Object.entries(brandCounts).map(([brand, count]) => `
    <label class="filter-item">
      <input type="checkbox" value="${brand}" class="brand-check">
      <span>${brand}</span>
      <span class="filter-count">${count}</span>
    </label>
  `).join('');

  container.querySelectorAll('.brand-check').forEach(cb => {
    cb.addEventListener('change', () => {
      activeFilters.brands = [...document.querySelectorAll('.brand-check:checked')].map(c => c.value);
      renderProducts();
    });
  });
}

function buildPriceFilter(parentSelector) {
  const parent = document.querySelector(parentSelector);
  if (!parent) return;

  const slider  = parent.querySelector('.price-slider');
  const inputTo = parent.querySelector('.price-to');

  const allPrices = PRODUCTS.map(p => p.price);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);

  if (slider) {
    slider.min   = minP;
    slider.max   = maxP;
    slider.value = maxP;
    updateSliderTrack(slider);

    slider.addEventListener('input', () => {
      activeFilters.priceMax = Number(slider.value);
      if (inputTo) inputTo.value = formatPrice(slider.value);
      updateSliderTrack(slider);
      renderProducts();
    });
  }

  const inputFrom = parent.querySelector('.price-from');
  if (inputFrom) {
    inputFrom.value = formatPrice(minP);
    inputFrom.addEventListener('change', () => {
      activeFilters.priceMin = Number(inputFrom.value.replace(/\D/g,'')) || 0;
      renderProducts();
    });
  }

  if (inputTo) {
    inputTo.value = formatPrice(maxP);
    inputTo.addEventListener('change', () => {
      activeFilters.priceMax = Number(inputTo.value.replace(/\D/g,'')) || maxP;
      if (slider) { slider.value = activeFilters.priceMax; updateSliderTrack(slider); }
      renderProducts();
    });
  }

  const stockCb = parent.querySelector('.instock-check');
  if (stockCb) {
    stockCb.addEventListener('change', () => {
      activeFilters.inStock = stockCb.checked;
      renderProducts();
    });
  }
}

function updateSliderTrack(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.setProperty('--pct', pct + '%');
}

function bindFilterActions() {
  document.querySelectorAll('.filter-reset').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilters = { brands: [], priceMin: 0, priceMax: Infinity, inStock: false, sort: activeFilters.sort, search: activeFilters.search, minRating: 0, badges: [] };
      document.querySelectorAll('.brand-check').forEach(cb => cb.checked = false);
      document.querySelectorAll('.instock-check').forEach(cb => cb.checked = false);
      document.querySelectorAll('.rating-radio').forEach(r => r.checked = false);
      document.querySelectorAll('.rating-filter-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.badge-filter-btn').forEach(b => b.classList.remove('active'));
      renderProducts();
    });
  });
}

/* ── RATING FILTER ── */

function buildRatingFilter(parentSelector) {
  const parent = document.querySelector(parentSelector);
  if (!parent) return;

  const ratingSection = parent.querySelector('.rating-filter-section');
  if (!ratingSection) return;

  const container = ratingSection.querySelector('.rating-filter-list');
  if (!container) return;

  const ratings = [4, 3, 2];
  container.innerHTML = ratings.map(r => `
    <label class="rating-filter-item" data-rating="${r}">
      <input type="radio" name="rating-filter-${parentSelector.replace('.', '')}" class="rating-radio" value="${r}">
      <div class="rating-stars-sm">
        ${[1,2,3,4,5].map(i => `<span class="s${i <= r ? ' on' : ''}">★</span>`).join('')}
      </div>
      <span style="font-size:13px;color:#9795B5;">и выше</span>
    </label>
  `).join('');

  container.querySelectorAll('.rating-radio').forEach(radio => {
    radio.addEventListener('change', () => {
      activeFilters.minRating = Number(radio.value);
      container.querySelectorAll('.rating-filter-item').forEach(i => i.classList.remove('active'));
      radio.closest('.rating-filter-item').classList.add('active');
      renderProducts();
    });
  });
}

/* ── BADGE FILTER ── */

function buildBadgeFilter(parentSelector) {
  const parent = document.querySelector(parentSelector);
  if (!parent) return;

  const badgeSection = parent.querySelector('.badge-filter-section');
  if (!badgeSection) return;

  const container = badgeSection.querySelector('.badge-filter-list');
  if (!container) return;

  const pool = activeCategory === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === activeCategory);

  const badgeDefs = [
    { key: 'hit',  label: '🔥 Хиты' },
    { key: 'new',  label: '✨ Новинки' },
    { key: 'sale', label: '🏷️ Скидки' },
  ];

  const available = badgeDefs.filter(b => pool.some(p => p.badge === b.key));
  if (!available.length) {
    badgeSection.style.display = 'none';
    return;
  }

  container.innerHTML = available.map(b => `
    <button class="badge-filter-btn" data-badge="${b.key}">${b.label}</button>
  `).join('');

  container.querySelectorAll('.badge-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      activeFilters.badges = [...container.querySelectorAll('.badge-filter-btn.active')].map(b => b.dataset.badge);
      renderProducts();
    });
  });
}

/* ── SORT ── */

function bindSort() {
  document.querySelectorAll('.sort-select').forEach(sel => {
    sel.addEventListener('change', () => {
      activeFilters.sort = sel.value;
      renderProducts();
    });
  });
}

/* ── MOBILE FILTER DRAWER ── */

function bindMobileFilter() {
  const toggleBtn = document.querySelector('.filter-toggle-btn');
  const overlay   = document.querySelector('.filter-drawer-overlay');
  const drawer    = document.querySelector('.filter-drawer');
  const closeBtn  = document.querySelector('.filter-drawer-close');

  if (!toggleBtn) return;

  function openDrawer() {
    overlay.classList.add('active');
    drawer.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    overlay.classList.remove('active');
    drawer.classList.remove('active');
    document.body.style.overflow = '';
  }

  toggleBtn.addEventListener('click', openDrawer);
  if (closeBtn)  closeBtn.addEventListener('click', closeDrawer);
  if (overlay)   overlay.addEventListener('click', closeDrawer);
}