from sqlalchemy import Column, Integer, String, DateTime, LargeBinary, Float, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timezone
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String)
    last_login = Column(DateTime)
    access_token = Column(LargeBinary)  # stores encrypted access token
    refresh_token = Column(LargeBinary)  # stores encrypted refresh token

class GradedSubmission(Base):
    __tablename__ = "graded_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    student_name = Column(String)
    assignment_id = Column(String, index=True)
    assignment_name = Column(String)
    points_received = Column(Float)
    points_possible = Column(Float)
    rubric_breakdown = Column(Text)  # Consider storing as a JSON string if needed
    explanation = Column(Text)
    graded_at = Column(DateTime, default=datetime.now(timezone.utc))

    # Relationship: Each graded submission is linked to a user (student)
   