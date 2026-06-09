/* ══════════════════════════════════════
   CART.JS — Q-tech корзина
   ══════════════════════════════════════ */

const Cart = (() => {

  const KEY = 'qtech_cart';

  /* ── CORE ── */

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveAll(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    _emit();
  }

  function getItem(productId) {
    return getAll().find(i => i.id === Number(productId)) || null;
  }

  function getQty(productId) {
    const item = getItem(productId);
    return item ? item.qty : 0;
  }

  function add(product) {
    const items = getAll();
    const idx = items.findIndex(i => i.id === product.id);
    if (idx > -1) {
      items[idx].qty += 1;
    } else {
      items.push({
        id: product.id,
        title: product.title,
        price: product.price,
        image: (product.images && product.images[0]) || '',
        qty: 1,
      });
    }
    saveAll(items);
  }

  function remove(productId) {
    const items = getAll().filter(i => i.id !== Number(productId));
    saveAll(items);
  }

  function setQty(productId, qty) {
    const items = getAll();
    const idx = items.findIndex(i => i.id === Number(productId));
    if (idx > -1) {
      if (qty <= 0) {
        items.splice(idx, 1);
      } else {
        items[idx].qty = qty;
      }
      saveAll(items);
    }
  }

  function increment(productId) {
    setQty(productId, getQty(productId) + 1);
  }

  function decrement(productId) {
    setQty(productId, getQty(productId) - 1);
  }

  function total() {
    return getAll().reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  function count() {
    return getAll().reduce((sum, i) => sum + i.qty, 0);
  }

  /* ── EVENTS ── */

  const listeners = [];

  function onChange(fn) { listeners.push(fn); }

  function _emit() {
    listeners.forEach(fn => fn(getAll()));
  }

  return { getAll, getItem, getQty, add, remove, setQty, increment, decrement, total, count, onChange };

})();

/* ══════════════════════════════════════
   CART UI
   ══════════════════════════════════════ */

function initCartUI() {

  const toggle    = document.querySelector('.cart-toggle');
  const modal     = document.querySelector('.cart-modal');
  const badge     = document.querySelector('.cart-badge');

  if (!toggle || !modal) return;


  /* open / close */
  toggle.addEventListener('click', () => {
    modal.classList.toggle('active');
    if (modal.classList.contains('active')) {
      renderCartModal();
      if (window.innerWidth <= 600) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      document.body.style.overflow = '';
      const overlay = document.getElementById('cart-overlay');
      if (overlay) overlay.remove();
    }
  });

  document.addEventListener('click', e => {
    if (!modal.contains(e.target) && !toggle.contains(e.target)) {
      modal.classList.remove('active');
    }
  }, { capture: false });

  /* update badge */
  function updateBadge() {
    const n = Cart.count();
    if (badge) {
      badge.textContent = n;
      badge.classList.toggle('visible', n > 0);
    }
  }

  Cart.onChange(() => {
    updateBadge();
    if (modal.classList.contains('active')) renderCartModal();
  });

  updateBadge();
}

/* ── RENDER CART MODAL ── */

function renderCartModal() {
  const modal = document.querySelector('.cart-modal');
  if (!modal) return;

  // Добавить overlay на мобильном
if (window.innerWidth <= 600) {
  let overlay = document.getElementById('cart-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'cart-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;';
    overlay.addEventListener('click', () => {
      modal.classList.remove('active');
      overlay.remove();
    });
    document.body.appendChild(overlay);
  }
}

  const items = Cart.getAll();

  if (items.length === 0) {
    modal.innerHTML = `
      <h4>Корзина</h4>
      <p class="cart-empty">Корзина пуста</p>
    `;
    return;
  }

  const itemsHTML = items.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img src="${item.image}" alt="${item.title}" onerror="this.src='img/placeholder.webp'">
      <div class="cart-item-info">
        <div class="cart-item-title">${item.title}</div>
        <div class="cart-item-price">${formatPrice(item.price * item.qty)} ₽</div>
      </div>
      <button class="cart-item-remove" data-id="${item.id}" title="Удалить">×</button>
    </div>
  `).join('');

  modal.innerHTML = `
    <h4>Корзина</h4>
    <div class="cart-items">${itemsHTML}</div>
    <div class="cart-footer">
      <div class="cart-total">
        <span>Итого:</span>
        <strong>${formatPrice(Cart.total())} ₽</strong>
      </div>
      <button class="cart-checkout-btn" id="cart-checkout-go">Оформить заказ</button>
    </div>
  `;

  modal.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      Cart.remove(btn.dataset.id);
    });
  });

  const checkoutBtn = document.getElementById('cart-checkout-go');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      window.location.href = 'checkout.html';
    });
  }
}

/* ── FORMAT PRICE ── */

function formatPrice(n) {
  return Number(n).toLocaleString('ru-RU');
}

/* ── STARS HTML ── */

function starsHTML(rating) {
  let html = '<div class="stars">';
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) html += '<span class="star filled">★</span>';
    else if (rating >= i - 0.5) html += '<span class="star half">★</span>';
    else html += '<span class="star">★</span>';
  }
  html += '</div>';
  return html;
}

/* ── BADGE HTML ── */

function badgeHTML(badge) {
  if (!badge) return '';
  const labels = { new: 'Новинка', sale: 'Скидка', hit: 'Хит' };
  return `<span class="product-badge badge-${badge}">${labels[badge] || ''}</span>`;
}