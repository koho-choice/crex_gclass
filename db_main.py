#%%
# main.py
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from models import User

# Create the database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.post("/users/")
def create_user(email: str, name: str = None, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    # Create a new user
    user = User(email=email, name=name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@app.get("/users/")
def read_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users

# %%
