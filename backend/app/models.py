"""
models.py — Database schema.

Two tables with a one-to-many relationship:
  Meeting (1) -----> (many) Participant

Design rationale (good to have ready for the evaluation interview):
- meeting_code is separate from the primary key `id` because the PK is an
  internal auto-increment integer, while meeting_code is the public-facing
  identifier used in URLs and shared links — decoupling these means we could
  regenerate/rotate the public code without touching foreign keys elsewhere.
- Participant is its own table (not just a JSON list on Meeting) so we get
  a real "recent meetings" / attendance history per meeting, and it sets up
  cleanly for the "host controls / remove participant" bonus feature.
- meeting_type distinguishes instant vs scheduled since they have different
  required fields (scheduled_time/duration only make sense for 'scheduled').
"""
import enum
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship

from app.database import Base


class MeetingType(str, enum.Enum):
    instant = "instant"
    scheduled = "scheduled"


class MeetingStatus(str, enum.Enum):
    scheduled = "scheduled"
    active = "active"
    ended = "ended"


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    meeting_code = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, default="Instant Meeting")
    description = Column(Text, nullable=True)
    host_name = Column(String, default="Default User")

    meeting_type = Column(Enum(MeetingType), default=MeetingType.instant, nullable=False)
    scheduled_time = Column(DateTime, nullable=True)   # only set for scheduled meetings
    duration_minutes = Column(Integer, nullable=True)  # only set for scheduled meetings

    status = Column(Enum(MeetingStatus), default=MeetingStatus.active, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    participants = relationship("Participant", back_populates="meeting", cascade="all, delete-orphan")


class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    display_name = Column(String, nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    left_at = Column(DateTime, nullable=True)

    meeting = relationship("Meeting", back_populates="participants")
