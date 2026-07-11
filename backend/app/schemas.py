"""
schemas.py — Pydantic models for API request/response validation.
Kept separate from SQLAlchemy models (app/models.py) so the API's public
shape can evolve independently of the DB schema.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class ScheduleMeetingRequest(BaseModel):
    title: str
    description: Optional[str] = None
    host_name: str = "Default User"
    scheduled_time: datetime
    duration_minutes: int = 30


class JoinMeetingRequest(BaseModel):
    display_name: str


class ParticipantOut(BaseModel):
    id: int
    display_name: str
    joined_at: datetime

    class Config:
        from_attributes = True


class MeetingOut(BaseModel):
    id: int
    meeting_code: str
    title: str
    description: Optional[str]
    host_name: str
    meeting_type: str
    scheduled_time: Optional[datetime]
    duration_minutes: Optional[int]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
