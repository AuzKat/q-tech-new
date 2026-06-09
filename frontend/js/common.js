/* ══════════════════════════════════════
   COMMON.JS — Q-tech общие функции хедера
   Подключается на всех страницах
   ══════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initSearch();
  initIconHovers();
  initCartUI();
  initBurgerMenu();
});

/* ── SEARCH ── */

function initSearch() {
  const searchBox    = document.querySelector('.search-box');
  const searchToggle = document.querySelector('.search-toggle');
  const searchInput  = document.getElementById('searchInput');

  if (!searchBox || !searchToggle || !searchInput) return;

  searchToggle.addEventListener('click', () => {
  if (window.innerWidth <= 900) {
    // На мобилке сразу показываем дропдаун снизу
    const v = searchInput.value.trim();
    dropdown.style.display = 'block';
    dropdown.innerHTML = `
      <div style="padding:16px;">
        <input id="mobile-search-input" placeholder="Поиск товаров..." style="
          width:100%; background:#1e2433; border:1px solid #2a2f3f;
          border-radius:12px; padding:12px 16px; color:white;
          font-family:'DM Sans',sans-serif; font-size:15px; outline:none;
        ">
      </div>
      <div id="mobile-search-results"></div>
    `;
    const mobileInput = document.getElementById('mobile-search-input');
    mobileInput.focus();
    mobileInput.addEventListener('input', () => {
      const q = mobileInput.value.trim();
      if (q.length < 2) {
        document.getElementById('mobile-search-results').innerHTML = '';
        return;
      }
      showSuggestions(q, document.getElementById('mobile-search-results'));
    });
    mobileInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && mobileInput.value.trim()) {
        window.location.href = `catalog.html?search=${encodeURIComponent(mobileInput.value.trim())}`;
      }
    });
  } else {
    searchBox.classList.toggle('active');
    if (searchBox.classList.contains('active')) {
      setTimeout(() => searchInput.focus(), 200);
    }
  }
});

  document.addEventListener('click', e => {
  const mobileDropdown = document.getElementById('search-dropdown');
  if (
    !searchBox.contains(e.target) &&
    !(mobileDropdown && mobileDropdown.contains(e.target))
  ) {
    searchBox.classList.remove('active');
    hideSuggestions();
  }
});

  // Живой поиск при вводе
  searchInput.addEventListener('input', () => {
    if (window.innerWidth <= 900) return;
    const v = searchInput.value.trim();
    if (v.length < 2) { hideSuggestions(); return; }
    showSuggestions(v);
  });

  // Enter — переход в каталог с фильтром
  searchInput.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const v = searchInput.value.trim();
    if (!v) return;
    window.location.href = `catalog.html?search=${encodeURIComponent(v)}`;
  });

  // Создаём дропдаун один раз
const dropdown = document.createElement('div');
dropdown.id = 'search-dropdown';

const isMobile = () => window.innerWidth <= 900;

function positionDropdown() {
  if (isMobile()) {
    dropdown.style.cssText = `
      position: fixed;
      bottom: 0; left: 0; right: 0;
      background: #11182B;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px 20px 0 0;
      overflow: hidden;
      z-index: 9999;
      box-shadow: 0 -8px 40px rgba(0,0,0,0.5);
      display: none;
      max-height: 70vh;
      overflow-y: auto;
    `;
    document.body.appendChild(dropdown);
  } else {
    dropdown.style.cssText = `
      position: absolute;
      top: calc(100% + 8px);
      left: 0; right: 0;
      background: #11182B;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      overflow: hidden;
      z-index: 999;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
      display: none;
    `;
    searchBox.style.position = 'relative';
    searchBox.appendChild(dropdown);
  }
}

positionDropdown();
window.addEventListener('resize', positionDropdown);

  function showSuggestions(query) {
    if (typeof PRODUCTS === 'undefined') return;
    const q = query.toLowerCase();
    const results = PRODUCTS.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    ).slice(0, 6);

    if (!results.length) { hideSuggestions(); return; }

    dropdown.innerHTML = results.map(p => `
      <div onclick="window.location.href='product.html?id=${p.id}'" style="
        display: flex; align-items: center; gap: 12px;
        padding: 10px 16px; cursor: pointer;
        transition: background 0.15s;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      " onmouseover="this.style.background='rgba(1,195,141,0.08)'"
         onmouseout="this.style.background='transparent'">
        <img src="${p.images[0]}" style="width:36px;height:36px;object-fit:contain;border-radius:6px;flex-shrink:0;" onerror="this.src='img/placeholder.webp'">
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.title}</div>
          <div style="font-size:12px;color:#5f6675;">${p.brand}</div>
        </div>
        <div style="font-size:13px;font-weight:700;color:#01C38D;white-space:nowrap;">${formatPrice(p.price)} ₽</div>
      </div>
    `).join('') + `
      <div onclick="window.location.href='catalog.html?search=${encodeURIComponent(query)}'" style="
        padding: 12px 16px; text-align: center;
        font-size: 13px; color: #01C38D; cursor: pointer;
        transition: background 0.15s;
      " onmouseover="this.style.background='rgba(1,195,141,0.08)'"
         onmouseout="this.style.background='transparent'">
        Смотреть все результаты →
      </div>
    `;
    dropdown.style.display = 'block';
  }

  function hideSuggestions() {
    dropdown.style.display = 'none';
  }
}

/* ── BURGER MENU ── */

function initBurgerMenu() {
  const burger     = document.querySelector('.burger-btn');
  const mobileMenu = document.querySelector('.mobile-menu');
  const closeBtn   = document.querySelector('.mobile-menu-close');

  if (!burger || !mobileMenu) return;

  function openMenu() {
    burger.classList.add('open');
    mobileMenu.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    burger.classList.remove('open');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  }

  burger.addEventListener('click', () => {
    burger.classList.contains('open') ? closeMenu() : openMenu();
  });

  if (closeBtn) closeBtn.addEventListener('click', closeMenu);

  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('#')) {
        closeMenu();
        const target = document.querySelector(href);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      } else {
        closeMenu();
      }
    });
  });
}

/* ── ICON HOVER (data-hover) ── */

function initIconHovers() {
  document.querySelectorAll('[data-hover]').forEach(img => {
    const orig  = img.src;
    const hover = img.dataset.hover;
    img.addEventListener('mouseenter', () => { img.src = hover; });
    img.addEventListener('mouseleave', () => { img.src = orig; });
  });
}
/* ── ACCOUNT LINK ROUTING ── */

function initAccountLink() {
  const accountLinks = document.querySelectorAll('a[href="account.html"]');
  const loggedIn = localStorage.getItem('qtech_logged_in') !== 'false';
  accountLinks.forEach(link => {
    if (!loggedIn) {
      link.href = 'login.html';
    }
  });
}

document.addEventListener('DOMContentLoaded', initAccountLink);


/* ── ADMIN LINK ── */

async function initAdminLink() {
  const token = localStorage.getItem('access_token');
  if (!token) return;

  try {
    const res = await fetch('https://q-tech-new-production.up.railway.app/api/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const user = await res.json();
    if (!user.is_admin) return;

    // Добавляем ссылку в десктопное меню
    const menu = document.querySelector('.menu');
    if (menu) {
      const link = document.createElement('a');
      link.href = 'admin.html';
      link.textContent = 'Админ-панель';
      link.style.color = '#01C38D';
      menu.appendChild(link);
    }

    // Добавляем в мобильное меню
    const mobileMenu = document.querySelector('.mobile-menu');
    if (mobileMenu) {
      const link = document.createElement('a');
      link.href = 'admin.html';
      link.textContent = 'Админ-панель';
      link.style.color = '#01C38D';
      mobileMenu.appendChild(link);
    }
  } catch(e) {}
}

document.addEventListener('DOMContentLoaded', initAdminLink);