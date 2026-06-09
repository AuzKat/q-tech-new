/* ══════════════════════════════════════
   ACCOUNT.JS — Q-tech личный кабинет
   ══════════════════════════════════════ */

/* ── SESSIONS STORAGE ── */

const SESSIONS_KEY = 'qtech_sessions';
const LOGGED_IN_KEY = 'qtech_logged_in';
const NOTIF_KEY = 'qtech_notifications';

function getDefaultSessions() {
  return [
    { id: 'session-current', device: 'MacBook Pro — Chrome', meta: 'Москва, Россия · Сейчас активна', isCurrent: true },
    { id: 'session-mobile',  device: 'iPhone 16 Pro — Safari', meta: 'Москва, Россия · 2 часа назад', isCurrent: false },
  ];
}

function getSessions() {
  try {
    const stored = localStorage.getItem(SESSIONS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  const def = getDefaultSessions();
  saveSessions(def);
  return def;
}

function saveSessions(sessions) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function endSession(id) {
  saveSessions(getSessions().filter(s => s.id !== id));
}

/* ── NOTIFICATIONS STATE ── */

function getNotifState() {
  try {
    const stored = localStorage.getItem(NOTIF_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { 'notif-order': true, 'notif-promo': true, 'notif-news': false, 'notif-review': true };
}

function saveNotifState(state) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(state));
}

/* ── AUTH ── */

function logout() {
  // Используем api.js logout если доступен, иначе делаем сами
  if (window.logout && window.logout !== logout) {
    window.logout();
  } else {
    localStorage.removeItem('access_token');
    window.location.href = 'login.html';
  }
}

/* ── INIT ── */

document.addEventListener('DOMContentLoaded', () => {
  initAccountTabs();
  initOrderFilters();
  initSaveToast();
  initSessionsPanel();
  initLogoutBtn();
  initNotifications();
});

/* ── TABS ── */

function initAccountTabs() {
  const menuItems = document.querySelectorAll('.acc-menu-item');
  const tabs = document.querySelectorAll('.acc-tab');

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.dataset.tab;
      menuItems.forEach(i => i.classList.remove('active'));
      tabs.forEach(t => t.classList.remove('active'));
      item.classList.add('active');
      const tab = document.getElementById('tab-' + tabId);
      if (tab) tab.classList.add('active');
      if (tabId === 'security') renderSessions();
    });
  });
}

/* ── ORDER FILTERS ── */

const STATUS_MAP = {
  'В доставке': 'status-delivery',
  'Доставлены': 'status-done',
  'Отменены':   'status-cancelled',
};

function initOrderFilters() {
  const filterBtns = document.querySelectorAll('.order-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const label = btn.textContent.trim();
      const cards = document.querySelectorAll('#tab-orders .order-card');
      if (label === 'Все') {
        cards.forEach(c => c.style.display = '');
        return;
      }
      const targetClass = STATUS_MAP[label];
      cards.forEach(card => {
        const statusEl = card.querySelector('.order-status');
        card.style.display = (statusEl && statusEl.classList.contains(targetClass)) ? '' : 'none';
      });
    });
  });
}

/* ── SESSIONS ── */

function initSessionsPanel() {
  renderSessions();
}

function renderSessions() {
  const list = document.querySelector('.sessions-list');
  if (!list) return;
  const sessions = getSessions();
  if (!sessions.length) {
    list.innerHTML = '<p style="color:#5f6675;font-size:14px;">Нет активных сессий</p>';
    return;
  }
  list.innerHTML = sessions.map(s => `
    <div class="session-item ${s.isCurrent ? 'current-session' : ''}" data-session-id="${s.id}">
      <div class="session-icon ${s.isCurrent ? 'session-icon-desktop' : 'session-icon-mobile'}"></div>
      <div class="session-info">
        <div class="session-device">${s.device}</div>
        <div class="session-meta">${s.meta}</div>
      </div>
      ${s.isCurrent
        ? '<div class="session-current-badge">Текущая</div>'
        : `<button class="session-end-btn" data-id="${s.id}">Завершить</button>`
      }
    </div>
  `).join('');
  list.querySelectorAll('.session-end-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      endSession(btn.dataset.id);
      showToast('Сессия завершена');
      renderSessions();
    });
  });
}

/* ── LOGOUT ── */

function initLogoutBtn() {
  // Основная кнопка в сайдбаре
  const btn = document.querySelector('.acc-logout-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      localStorage.removeItem('access_token');
      window.location.href = 'login.html';
    });
  }

  // Кнопка в мобильном меню
  const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
  if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener('click', () => {
      localStorage.removeItem('access_token');
      window.location.href = 'login.html';
    });
  }
}

/* ── NOTIFICATIONS ── */

function initNotifications() {
  const state = getNotifState();

  // Восстанавливаем состояние всех тумблеров
  Object.entries(state).forEach(([id, checked]) => {
    const input = document.getElementById(id);
    if (input) {
      input.checked = checked;
    }
  });

  // Навешиваем обработчики на все toggle-input
  document.querySelectorAll('.toggle-input').forEach(toggle => {
    toggle.addEventListener('change', () => {
      const currentState = getNotifState();
      currentState[toggle.id] = toggle.checked;
      saveNotifState(currentState);
    });
  });

  // Кнопка сохранения уведомлений
  const saveNotifBtn = document.getElementById('save-notif-btn');
  if (saveNotifBtn) {
    saveNotifBtn.addEventListener('click', () => {
      const currentState = {};
      document.querySelectorAll('.toggle-input').forEach(toggle => {
        currentState[toggle.id] = toggle.checked;
      });
      saveNotifState(currentState);
      showToast('Настройки уведомлений сохранены');
    });
  }
}

/* ── SAVE TOAST ── */

function initSaveToast() {
  document.querySelectorAll('.acc-save-btn').forEach(btn => {
    // Исключаем кнопку уведомлений — у неё свой обработчик
    if (btn.id === 'save-notif-btn') return;
    btn.addEventListener('click', () => showToast('Изменения сохранены'));
  });
}

function showToast(msg) {
  const existing = document.querySelector('.acc-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'acc-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position:fixed;bottom:32px;left:50%;
    transform:translateX(-50%) translateY(20px);
    background:#01C38D;color:#191C29;font-weight:700;font-size:14px;
    padding:13px 24px;border-radius:14px;
    box-shadow:0 8px 32px rgba(1,195,141,0.4);
    z-index:9999;transition:transform 0.3s ease,opacity 0.3s ease;
    opacity:0;font-family:'DM Sans',sans-serif;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}