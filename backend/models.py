from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(100), unique=True, index=True)
    password_hash = Column(String(255))
    is_admin = Column(Boolean, default=False)  # ← добавь эту строку
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255))
    brand = Column(String(100))
    category = Column(String(50))
    price = Column(Integer)
    old_price = Column(Integer, nullable=True)
    rating = Column(Float)
    reviews = Column(Integer, default=0)
    badge = Column(String(20), nullable=True)
    in_stock = Column(Boolean, default=True)
    description = Column(String)
    specs = Column(JSON, nullable=True)
    images = Column(JSON, nullable=True)


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, default=1)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    order_number = Column(String(20), unique=True)
    status = Column(String(20), default="created")
    total_amount = Column(Integer)
    delivery_method = Column(String(50))
    delivery_price = Column(Integer, default=0)
    payment_method = Column(String(50))
    promo_discount = Column(Integer, default=0)
    address = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"))
    product_id = Column(Integer)
    title = Column(String(255))
    price = Column(Integer)
    quantity = Column(Integer)
    image = Column(String(255), nullable=True)