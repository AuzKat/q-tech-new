from fastapi import FastAPI, Depends, HTTPException, status, Header
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, get_db
import models
from auth import hash_password, verify_password, create_access_token, decode_token

# Создаём таблицы
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Q-tech API")

# CORS — чтобы фронтенд мог обращаться к API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # для разработки, потом можно сузить до http://localhost:5500
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------
# Временный эндпоинт для импорта товаров из products.js
# ------------------------------------------------------------
@app.post("/api/import-products")
def run_import_products():
    """Импортирует товары из import_products.py (запусти один раз)"""
    from import_products import import_products as do_import, products
    do_import()
    return {"message": f"Импортировано товаров: {len(products)}"}


# ------------------------------------------------------------
# Регистрация
# ------------------------------------------------------------
@app.post("/api/auth/register")
def register(user_data: dict, db: Session = Depends(get_db)):
    email = user_data.get("email")
    name = user_data.get("name")
    password = user_data.get("password")

    # Проверка, существует ли пользователь
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(password)
    new_user = models.User(name=name, email=email, password_hash=hashed)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": str(new_user.id), "email": new_user.email})
    return {"access_token": token, "token_type": "bearer",
            "user": {"id": new_user.id, "name": new_user.name, "email": new_user.email}}



# ------------------------------------------------------------
# Логин
# ------------------------------------------------------------
@app.post("/api/auth/login")
def login(user_data: dict, db: Session = Depends(get_db)):
    email = user_data.get("email")
    password = user_data.get("password")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user.id), "email": user.email})
    return {"access_token": token, "token_type": "bearer",
            "user": {"id": user.id, "name": user.name, "email": user.email}}


# ------------------------------------------------------------
# Получить текущего пользователя по токену
# ------------------------------------------------------------
def get_current_user(token: str, db: Session):
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = int(payload.get("sub"))
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@app.get("/api/users/me")
def get_me(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.replace("Bearer ", "")
    user = get_current_user(token, db)
    return {"id": user.id, "name": user.name, "email": user.email, "created_at": user.created_at, "is_admin": user.is_admin}


# ------------------------------------------------------------
# КОРЗИНА
# ------------------------------------------------------------

@app.get("/api/cart")
def get_cart(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Получить корзину текущего пользователя"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.replace("Bearer ", "")
    user = get_current_user(token, db)

    items = db.query(models.CartItem).filter(models.CartItem.user_id == user.id).all()

    result = []
    for item in items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            result.append({
                "id": item.id,
                "product_id": product.id,
                "title": product.title,
                "price": product.price,
                "quantity": item.quantity,
                "image": product.images[0] if product.images else None
            })
    return result


@app.post("/api/cart")
def add_to_cart(item_data: dict, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Добавить товар в корзину"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.replace("Bearer ", "")
    user = get_current_user(token, db)

    product_id = item_data.get("product_id")
    quantity = item_data.get("quantity", 1)

    existing = db.query(models.CartItem).filter(
        models.CartItem.user_id == user.id,
        models.CartItem.product_id == product_id
    ).first()

    if existing:
        existing.quantity += quantity
    else:
        new_item = models.CartItem(user_id=user.id, product_id=product_id, quantity=quantity)
        db.add(new_item)

    db.commit()
    return {"message": "Товар добавлен в корзину"}


@app.put("/api/cart/{product_id}")
def update_cart_quantity(product_id: int, data: dict, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Изменить количество товара в корзине"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.replace("Bearer ", "")
    user = get_current_user(token, db)

    quantity = data.get("quantity", 0)

    item = db.query(models.CartItem).filter(
        models.CartItem.user_id == user.id,
        models.CartItem.product_id == product_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Товар не найден в корзине")

    if quantity <= 0:
        db.delete(item)
    else:
        item.quantity = quantity

    db.commit()
    return {"message": "Корзина обновлена"}


@app.delete("/api/cart/{product_id}")
def remove_from_cart(product_id: int, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Удалить товар из корзины"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.replace("Bearer ", "")
    user = get_current_user(token, db)

    item = db.query(models.CartItem).filter(
        models.CartItem.user_id == user.id,
        models.CartItem.product_id == product_id
    ).first()

    if item:
        db.delete(item)
        db.commit()

    return {"message": "Товар удалён"}


# ------------------------------------------------------------
# ТОВАРЫ
# ------------------------------------------------------------

@app.get("/api/products")
def get_products(category: str = None, db: Session = Depends(get_db)):
    """Получить список товаров (с фильтром по категории)"""
    query = db.query(models.Product)
    if category and category != "all":
        query = query.filter(models.Product.category == category)
    products = query.all()

    return [
        {
            "id": p.id,
            "title": p.title,
            "brand": p.brand,
            "category": p.category,
            "price": p.price,
            "old_price": p.old_price,
            "rating": p.rating,
            "reviews": p.reviews,
            "badge": p.badge,
            "in_stock": p.in_stock,
            "description": p.description,
            "specs": p.specs,
            "images": p.images
        }
        for p in products
    ]


@app.get("/api/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Получить один товар по id"""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return {
        "id": product.id,
        "title": product.title,
        "brand": product.brand,
        "category": product.category,
        "price": product.price,
        "old_price": product.old_price,
        "rating": product.rating,
        "reviews": product.reviews,
        "badge": product.badge,
        "in_stock": product.in_stock,
        "description": product.description,
        "specs": product.specs,
        "images": product.images
    }


# ------------------------------------------------------------
# ЗАКАЗЫ
# ------------------------------------------------------------

import random
import string


def generate_order_number():
    return "#QT-" + str(random.randint(1000, 9999)) + "-" + ''.join(random.choices(string.digits, k=4))


@app.post("/api/orders")
def create_order(order_data: dict, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Оформить заказ"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.replace("Bearer ", "")
    user = get_current_user(token, db)

    # Получаем корзину пользователя
    cart_items = db.query(models.CartItem).filter(models.CartItem.user_id == user.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Суммируем итого
    total = 0
    order_items_data = []
    for item in cart_items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            item_total = product.price * item.quantity
            total += item_total
            order_items_data.append({
                "product_id": product.id,
                "title": product.title,
                "price": product.price,
                "quantity": item.quantity,
                "image": product.images[0] if product.images else None
            })

    # Применяем скидку по промокоду
    promo_discount = order_data.get("promo_discount", 0)
    delivery_price = order_data.get("delivery_price", 0)

    final_total = total + delivery_price - promo_discount

    # Создаём заказ
    order_number = generate_order_number()
    new_order = models.Order(
        user_id=user.id,
        order_number=order_number,
        status="created",
        total_amount=final_total,
        delivery_method=order_data.get("delivery_method", "Самовывоз"),
        delivery_price=delivery_price,
        payment_method=order_data.get("payment_method", "card"),
        promo_discount=promo_discount,
        address=order_data.get("address")
    )
    db.add(new_order)
    db.flush()

    # Добавляем товары в заказ
    for item_data in order_items_data:
        order_item = models.OrderItem(
            order_id=new_order.id,
            product_id=item_data["product_id"],
            title=item_data["title"],
            price=item_data["price"],
            quantity=item_data["quantity"],
            image=item_data["image"]
        )
        db.add(order_item)

    # Очищаем корзину
    db.query(models.CartItem).filter(models.CartItem.user_id == user.id).delete()

    db.commit()

    return {"order_id": new_order.id, "order_number": order_number, "status": "created", "total": final_total}


@app.get("/api/orders")
def get_orders(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Получить историю заказов пользователя"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.replace("Bearer ", "")
    user = get_current_user(token, db)

    orders = db.query(models.Order).filter(models.Order.user_id == user.id).order_by(
        models.Order.created_at.desc()).all()

    result = []
    for order in orders:
        items = db.query(models.OrderItem).filter(models.OrderItem.order_id == order.id).all()
        result.append({
            "id": order.id,
            "order_number": order.order_number,
            "status": order.status,
            "total_amount": order.total_amount,
            "delivery_method": order.delivery_method,
            "payment_method": order.payment_method,
            "created_at": order.created_at.isoformat(),
            "items": [
                {
                    "product_id": i.product_id,
                    "title": i.title,
                    "price": i.price,
                    "quantity": i.quantity,
                    "image": i.image
                }
                for i in items
            ]
        })

    return result


@app.post("/api/orders/{order_id}/cancel")
def cancel_order(order_id: int, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Отменить заказ (только если статус 'created' или 'delivery')"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.replace("Bearer ", "")
    user = get_current_user(token, db)

    order = db.query(models.Order).filter(models.Order.id == order_id, models.Order.user_id == user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status not in ["created", "delivery"]:
        raise HTTPException(status_code=400, detail="Cannot cancel this order")

    order.status = "cancelled"
    db.commit()

    return {"message": "Заказ отменён", "order_id": order_id, "status": "cancelled"}



# ------------------------------------------------------------
# АДМИН — вспомогательная функция
# ------------------------------------------------------------

def get_admin_user(authorization: Optional[str], db: Session):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.replace("Bearer ", "")
    user = get_current_user(token, db)
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Not an admin")
    return user


# ------------------------------------------------------------
# АДМИН — ТОВАРЫ
# ------------------------------------------------------------

@app.get("/api/admin/products")
def admin_get_products(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    get_admin_user(authorization, db)
    products = db.query(models.Product).all()
    return products

@app.post("/api/admin/products")
def admin_create_product(data: dict, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    get_admin_user(authorization, db)
    product = models.Product(**data)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@app.put("/api/admin/products/{product_id}")
def admin_update_product(product_id: int, data: dict, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    get_admin_user(authorization, db)
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for key, value in data.items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product

@app.delete("/api/admin/products/{product_id}")
def admin_delete_product(product_id: int, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    get_admin_user(authorization, db)
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"message": "Товар удалён"}


# ------------------------------------------------------------
# АДМИН — ЗАКАЗЫ
# ------------------------------------------------------------

@app.get("/api/admin/orders")
def admin_get_orders(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    get_admin_user(authorization, db)
    orders = db.query(models.Order).order_by(models.Order.created_at.desc()).all()
    result = []
    for order in orders:
        user = db.query(models.User).filter(models.User.id == order.user_id).first()
        items = db.query(models.OrderItem).filter(models.OrderItem.order_id == order.id).all()
        result.append({
            "id": order.id,
            "order_number": order.order_number,
            "status": order.status,
            "total_amount": order.total_amount,
            "delivery_method": order.delivery_method,
            "payment_method": order.payment_method,
            "created_at": order.created_at.isoformat(),
            "user": {"id": user.id, "name": user.name, "email": user.email} if user else None,
            "items": [{"title": i.title, "price": i.price, "quantity": i.quantity, "image": i.image} for i in items]
        })
    return result

@app.put("/api/admin/orders/{order_id}")
def admin_update_order(order_id: int, data: dict, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    get_admin_user(authorization, db)
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = data.get("status", order.status)
    db.commit()
    return {"message": "Статус обновлён", "status": order.status}


# ------------------------------------------------------------
# АДМИН — ПОЛЬЗОВАТЕЛИ
# ------------------------------------------------------------

@app.get("/api/admin/users")
def admin_get_users(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    get_admin_user(authorization, db)
    users = db.query(models.User).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "is_admin": u.is_admin, "created_at": u.created_at} for u in users]


# ------------------------------------------------------------
# АДМИН — СТАТИСТИКА
# ------------------------------------------------------------

@app.get("/api/admin/stats")
def admin_get_stats(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    get_admin_user(authorization, db)

    from sqlalchemy import func as sqlfunc

    total_orders = db.query(models.Order).count()
    total_revenue = db.query(sqlfunc.sum(models.Order.total_amount)).scalar() or 0
    total_users = db.query(models.User).count()
    total_products = db.query(models.Product).count()

    # Топ 5 товаров по количеству заказов
    top_products = (
        db.query(models.OrderItem.title, sqlfunc.sum(models.OrderItem.quantity).label("total_qty"))
        .group_by(models.OrderItem.title)
        .order_by(sqlfunc.sum(models.OrderItem.quantity).desc())
        .limit(5)
        .all()
    )

    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "total_users": total_users,
        "total_products": total_products,
        "top_products": [{"title": t, "qty": q} for t, q in top_products]
    }
# ------------------------------------------------------------
# Запуск
# ------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)