"""
crud.py — Database helper functions, kept separate from route handlers
so main.py stays focused on HTTP/WebSocket concerns only.
"""
import random
import string
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models import Meeting, Participant, MeetingType, MeetingStatus


def generate_meeting_code() -> str:
    """Zoom-style numeric meeting ID, e.g. 847 2913 6650 -> stored without spaces."""
    return "".join(random.choices(string.digits, k=10))


def create_instant_meeting(db: Session, host_name: str = "Default User") -> Meeting:
    meeting = Meeting(
        meeting_code=generate_meeting_code(),
        title="Instant Meeting",
        host_name=host_name,
        meeting_type=MeetingType.instant,
        status=MeetingStatus.active,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


def create_scheduled_meeting(db: Session, title: str, description: str, host_name: str,
                              scheduled_time: datetime, duration_minutes: int) -> Meeting:
    meeting = Meeting(
        meeting_code=generate_meeting_code(),
        title=title,
        description=description,
        host_name=host_name,
        meeting_type=MeetingType.scheduled,
        scheduled_time=scheduled_time,
        duration_minutes=duration_minutes,
        status=MeetingStatus.scheduled,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


def get_meeting_by_code(db: Session, meeting_code: str) -> Meeting | None:
    return db.query(Meeting).filter(Meeting.meeting_code == meeting_code).first()


def list_upcoming_meetings(db: Session):
    return (
        db.query(Meeting)
        .filter(Meeting.meeting_type == MeetingType.scheduled)
        .filter(Meeting.scheduled_time >= datetime.utcnow())
        .order_by(Meeting.scheduled_time.asc())
        .all()
    )


def list_recent_meetings(db: Session):
    return (
        db.query(Meeting)
        .filter(
            (Meeting.status == MeetingStatus.ended)
            | ((Meeting.meeting_type == MeetingType.scheduled) & (Meeting.scheduled_time < datetime.utcnow()))
        )
        .order_by(Meeting.created_at.desc())
        .limit(20)
        .all()
    )


def add_participant(db: Session, meeting_id: int, display_name: str) -> Participant:
    participant = Participant(meeting_id=meeting_id, display_name=display_name)
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


def seed_sample_data(db: Session):
    """Populate the DB with sample meetings on first run so the dashboard
    isn't empty when demoed/evaluated."""
    if db.query(Meeting).count() > 0:
        return  # already seeded

    now = datetime.utcnow()

    # Upcoming scheduled meetings
    upcoming_samples = [
        ("Sprint Planning", "Weekly sprint planning with the eng team", now + timedelta(days=1, hours=2), 45),
        ("Design Review", "Review new dashboard mockups", now + timedelta(days=2, hours=5), 30),
        ("1:1 with Manager", "Monthly check-in", now + timedelta(days=3, hours=1), 20),
    ]
    for title, desc, sched_time, duration in upcoming_samples:
        db.add(Meeting(
            meeting_code=generate_meeting_code(),
            title=title, description=desc, host_name="Default User",
            meeting_type=MeetingType.scheduled, scheduled_time=sched_time,
            duration_minutes=duration, status=MeetingStatus.scheduled,
        ))

    # Recent/ended meetings
    recent_samples = [
        ("Daily Standup", now - timedelta(days=1, hours=3)),
        ("Client Onboarding Call", now - timedelta(days=2, hours=6)),
    ]
    for title, past_time in recent_samples:
        db.add(Meeting(
            meeting_code=generate_meeting_code(),
            title=title, host_name="Default User",
            meeting_type=MeetingType.instant,
            status=MeetingStatus.ended,
            created_at=past_time,
        ))

    db.commit()
