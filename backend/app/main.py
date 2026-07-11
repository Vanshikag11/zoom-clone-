"""
main.py — FastAPI application entrypoint.

Run locally: uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI, Depends, HTTPException, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app import crud, schemas
from app.signaling import handle_signaling_connection

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Zoom Clone API")

# Allow the Next.js frontend (local dev + deployed) to call this API.
# In production, replace "*" with your actual Vercel domain for tighter security.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def seed_on_startup():
    db = next(get_db())
    crud.seed_sample_data(db)


@app.get("/")
def root():
    return {"status": "ok", "service": "zoom-clone-api"}


@app.post("/meetings/instant", response_model=schemas.MeetingOut)
def create_instant_meeting(host_name: str = "Default User", db: Session = Depends(get_db)):
    meeting = crud.create_instant_meeting(db, host_name=host_name)
    return meeting


@app.post("/meetings/schedule", response_model=schemas.MeetingOut)
def schedule_meeting(payload: schemas.ScheduleMeetingRequest, db: Session = Depends(get_db)):
    meeting = crud.create_scheduled_meeting(
        db,
        title=payload.title,
        description=payload.description or "",
        host_name=payload.host_name,
        scheduled_time=payload.scheduled_time,
        duration_minutes=payload.duration_minutes,
    )
    return meeting


@app.get("/meetings/upcoming", response_model=list[schemas.MeetingOut])
def upcoming_meetings(db: Session = Depends(get_db)):
    return crud.list_upcoming_meetings(db)


@app.get("/meetings/recent", response_model=list[schemas.MeetingOut])
def recent_meetings(db: Session = Depends(get_db)):
    return crud.list_recent_meetings(db)


@app.get("/meetings/{meeting_code}", response_model=schemas.MeetingOut)
def get_meeting(meeting_code: str, db: Session = Depends(get_db)):
    meeting = crud.get_meeting_by_code(db, meeting_code)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@app.post("/meetings/{meeting_code}/join")
def join_meeting(meeting_code: str, payload: schemas.JoinMeetingRequest, db: Session = Depends(get_db)):
    meeting = crud.get_meeting_by_code(db, meeting_code)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    participant = crud.add_participant(db, meeting.id, payload.display_name)
    return {"status": "joined", "participant_id": participant.id, "meeting_code": meeting_code}


@app.websocket("/ws/{meeting_code}")
async def websocket_endpoint(websocket: WebSocket, meeting_code: str, name: str = Query(default="Guest")):
    await handle_signaling_connection(websocket, meeting_code, name)
