"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { getMeeting, joinMeeting } from "@/lib/api";
import { useWebRTC } from "@/lib/webrtc";

function VideoTile({ stream, label, muted, isLocal }) {
  return (
    <div className="relative bg-zoompanel rounded-xl overflow-hidden aspect-video flex items-center justify-center">
      {stream ? (
        <video
          autoPlay
          playsInline
          muted={muted}
          ref={(el) => {
            if (el && el.srcObject !== stream) el.srcObject = stream;
          }}
          className={`w-full h-full object-cover ${isLocal ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-gray-500 flex items-center justify-center text-white text-xl font-semibold">
          {label?.[0]?.toUpperCase() || "?"}
        </div>
      )}
      <span className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        {label}
      </span>
    </div>
  );
}

function CallRoom({ meetingCode, displayName }) {
  const router = useRouter();
  const {
    localStream, remoteParticipants, micOn, cameraOn,
    connectionError, toggleMic, toggleCamera, leaveCall,
  } = useWebRTC(meetingCode, displayName);

  function handleLeave() {
    leaveCall();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-zoomdark flex flex-col">
      <div className="flex-1 p-4 grid gap-4" style={{
        gridTemplateColumns: `repeat(${Math.min(3, remoteParticipants.length + 1)}, minmax(0, 1fr))`,
      }}>
        <VideoTile stream={localStream} label={`${displayName} (You)`} muted isLocal />
        {remoteParticipants.map((p) => (
          <VideoTile key={p.peerId} stream={p.stream} label={p.displayName} />
        ))}
      </div>

      {connectionError && (
        <div className="bg-red-500/90 text-white text-sm text-center py-2">{connectionError}</div>
      )}

      <div className="bg-black/80 py-4 flex items-center justify-center gap-4">
        <button
          onClick={toggleMic}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm ${micOn ? "bg-gray-700 text-white" : "bg-red-600 text-white"}`}
        >
          {micOn ? "Mute" : "Unmute"}
        </button>
        <button
          onClick={toggleCamera}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm ${cameraOn ? "bg-gray-700 text-white" : "bg-red-600 text-white"}`}
        >
          {cameraOn ? "Stop Video" : "Start Video"}
        </button>
        <button
          onClick={handleLeave}
          className="px-5 py-2.5 rounded-lg font-medium text-sm bg-red-600 text-white hover:bg-red-700"
        >
          Leave Meeting
        </button>
      </div>
    </div>
  );
}

export default function MeetingRoom() {
  const params = useParams();
  const searchParams = useSearchParams();
  const meetingCode = params.code;

  const [meeting, setMeeting] = useState(undefined); // undefined = loading, null = not found
  const [displayName, setDisplayName] = useState(searchParams.get("name") || "");
  const [joined, setJoined] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function validate() {
      const m = await getMeeting(meetingCode);
      setMeeting(m);
    }
    validate();
  }, [meetingCode]);

  useEffect(() => {
    // If a name arrived via the Join page's query param, skip the prompt.
    if (displayName) setJoined(true);
  }, [displayName]);

  async function handleJoinSubmit(e) {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setJoining(true);
    try {
      await joinMeeting(meetingCode, nameInput.trim());
      setDisplayName(nameInput.trim());
      setJoined(true);
    } catch (err) {
      alert("Could not join meeting. Is the backend running?");
    } finally {
      setJoining(false);
    }
  }

  if (meeting === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Checking meeting...</div>;
  }

  if (meeting === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-xl font-bold text-gray-800 mb-2">Meeting Not Found</h1>
        <p className="text-gray-500 text-sm">The meeting ID "{meetingCode}" doesn't exist or has ended.</p>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <form onSubmit={handleJoinSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 w-full max-w-sm flex flex-col gap-4">
          <h1 className="text-lg font-bold text-gray-800">{meeting.title}</h1>
          <p className="text-sm text-gray-500">Enter your name to join this meeting.</p>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your display name"
            autoFocus
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zoomblue"
          />
          <button
            type="submit"
            disabled={joining}
            className="bg-zoomblue text-white font-medium py-2.5 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-60"
          >
            {joining ? "Joining..." : "Join Now"}
          </button>
        </form>
      </div>
    );
  }

  return <CallRoom meetingCode={meetingCode} displayName={displayName} />;
}
