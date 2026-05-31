/* ══════════════════════════════════════
   API.JS — работа с бэкендом Q-tech
   ══════════════════════════════════════ */

const API_BASE = "https://q-tech-new-production.up.railway.app/api";

// Хранение токена
let authToken = localStorage.getItem("access_token");

// Сохранить токен
function setToken(token) {
    authToken = token;
    if (token) {
        localStorage.setItem("access_token", token);
    } else {
        localStorage.removeItem("access_token");
    }
}

// Получить токен
function getToken() {
    return authToken || localStorage.getItem("access_token");
}

// Проверка авторизации
function isLoggedIn() {
    return !!getToken();
}

// Выход
function logout() {
    setToken(null);
    window.location.href = "login.html";
}

// Универсальный fetch с авторизацией
async function apiFetch(endpoint, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...options.headers
    };
    
    const token = getToken();
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });
    
    if (!response.ok) {
        let errorMsg = `Ошибка ${response.status}`;
        try {
            const error = await response.json();
            errorMsg = error.detail || errorMsg;
        } catch(e) {}
        throw new Error(errorMsg);
    }
    
    return response.json();
}

// --- АВТОРИЗАЦИЯ (глобальные функции) ---

window.apiRegister = async function(name, email, password) {
    const data = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
    });
    if (data.access_token) {
        setToken(data.access_token);
    }
    return data;
};

window.apiLogin = async function(email, password) {
    const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });
    if (data.access_token) {
        setToken(data.access_token);
    }
    return data;
};

window.getCurrentUser = async function() {
    return apiFetch("/users/me");
};

window.logout = logout;
window.isLoggedIn = isLoggedIn;

// --- ТОВАРЫ ---

window.getProducts = async function(category = null) {
    let url = "/products";
    if (category && category !== "all") {
        url += `?category=${category}`;
    }
    return apiFetch(url);
};

window.getProduct = async function(id) {
    return apiFetch(`/products/${id}`);
};

// --- КОРЗИНА ---

window.getCart = async function() {
    return apiFetch("/cart");
};

window.addToCart = async function(productId, quantity = 1) {
    return apiFetch("/cart", {
        method: "POST",
        body: JSON.stringify({ product_id: productId, quantity })
    });
};

window.updateCartItem = async function(productId, quantity) {
    return apiFetch(`/cart/${productId}`, {
        method: "PUT",
        body: JSON.stringify({ quantity })
    });
};

window.removeFromCart = async function(productId) {
    return apiFetch(`/cart/${productId}`, {
        method: "DELETE"
    });
};

// --- ЗАКАЗЫ ---

window.createOrder = async function(orderData) {
    return apiFetch("/orders", {
        method: "POST",
        body: JSON.stringify(orderData)
    });
};

window.getOrders = async function() {
    return apiFetch("/orders");
};

window.cancelOrder = async function(orderId) {
    return apiFetch(`/orders/${orderId}/cancel`, {
        method: "POST"
    });
};

window.isLoggedIn = function() {
    return !!getToken();
};