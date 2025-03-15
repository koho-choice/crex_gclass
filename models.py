from sqlalchemy import Column, Integer, String, DateTime, LargeBinary
from database import Base
from datetime import datetime
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String)
    last_login = Column(DateTime)
    access_token = Column(LargeBinary)  # stores encrypted access token
    refresh_token = Column(LargeBinary)  # stores encrypted refresh token