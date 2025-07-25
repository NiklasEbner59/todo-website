from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import create_engine, Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
import datetime
from pydantic import BaseModel
import hashlib
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware

DATABASE_URL = "sqlite:////app/database.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Für Entwicklung: alle Domains erlauben
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# User model
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    todos = relationship("Todo", back_populates="owner")

# Todo model
class Todo(Base):
    __tablename__ = "todos"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, nullable=False)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="todos")

# Create tables
Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic model for registration
class RegisterRequest(BaseModel):
    username: str
    password: str

# Pydantic model for login
class LoginRequest(BaseModel):
    username: str
    password: str

# Simple password hashing (for demo; use passlib/bcrypt in production)
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@app.post("/register")
def register_user(request: RegisterRequest, db: Session = Depends(get_db)):
    # Check if username already exists
    if db.query(User).filter(User.username == request.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    # Create user
    user = User(
        username=request.username,
        password_hash=hash_password(request.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User registered successfully"}

@app.post("/login")
def login_user(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if user is None:
        raise HTTPException(status_code=400, detail="Invalid username or password")
    password_hash_value = getattr(user, "password_hash", None)
    if password_hash_value is None or not isinstance(password_hash_value, str):
        raise HTTPException(status_code=500, detail="User password_hash is not a string!")
    if password_hash_value != hash_password(request.password):
        raise HTTPException(status_code=400, detail="Invalid username or password")
    return {"message": "Login successful"}

# Pydantic Modell für Todo-Erstellung
class TodoCreateRequest(BaseModel):
    text: str
    username: str

@app.post("/todos")
def add_todo(request: TodoCreateRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    todo = Todo(text=request.text, owner=user)
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return {
        "id": todo.id,
        "text": todo.text,
        "completed": todo.completed,
        "created_at": todo.created_at.isoformat(),
        "username": user.username
    }

class TodoUpdateRequest(BaseModel):
    text: Optional[str] = None
    completed: Optional[bool] = None

@app.put("/todos/{todo_id}")
def update_todo(todo_id: int, request: TodoUpdateRequest, db: Session = Depends(get_db)):
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    if request.text is not None:
        todo.text = request.text  # type: ignore
    if request.completed is not None:
        todo.completed = request.completed  # type: ignore
    db.commit()
    db.refresh(todo)
    return {
        "id": todo.id,
        "text": todo.text,
        "completed": todo.completed,
        "created_at": todo.created_at.isoformat(),
        "username": todo.owner.username
    }

@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    db.delete(todo)
    db.commit()
    return {"message": f"Todo {todo_id} deleted successfully"}

@app.get("/todos")
def get_todos(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    todos = db.query(Todo).filter(Todo.owner == user).all()
    # List comprehension to create a list of dictionaries
    result = [
        {
            "id": todo.id,
            "text": todo.text,
            "completed": todo.completed,
            "created_at": todo.created_at.isoformat(),
            "username": user.username
        }
        for todo in todos
    ]
    return result