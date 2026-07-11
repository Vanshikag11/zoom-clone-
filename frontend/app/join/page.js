"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getMeeting } from "@/lib/api";

function extractMeetingCode(input) {
  // Accept either a raw meeting code or a full shareable link like
  // http://localhost:3000/meeting/1234567890
  const trimmed = input.trim();
  const match = trimmed.match(/\/meeting\/([a-zA-Z0-9]+)/);
  return match ? match[1] : trimmed;
}

export default function JoinMeeting() {
  const router = useRouter();
  const [meetingInput, setMeetingInput] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function handleJoin(e) {
    e.preventDefault();
    setError("");

    if (!meetingInput.trim() || !displayName.trim()) {
      setError("Please enter both a Meeting ID (or link) and your name.");
      return;
    }

    const code = extractMeetingCode(meetingInput);
    setChecking(true);

    try {
      const meeting = await getMeeting(code);
      if (!meeting) {
        setError("No meeting found with that ID or link. Please check and try again.");
        setChecking(false);
        return;
      }
      router.push(`/meeting/${code}?name=${encodeURIComponent(displayName.trim())}`);
    } catch (err) {
      setError("Could not reach the server. Is the backend running?");
      setChecking(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-md mx-auto px-6 py-16">
        <h1 className="text-xl font-bold text-gray-800 mb-6">Join a Meeting</h1>
        <form onSubmit={handleJoin} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Meeting ID or Invite Link</label>
            <input
              type="text"
              value={meetingInput}
              onChange={(e) => setMeetingInput(e.target.value)}
              placeholder="e.g. 1234567890"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zoomblue"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Your Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zoomblue"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={checking}
            className="bg-zoomblue text-white font-medium py-2.5 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-60"
          >
            {checking ? "Checking..." : "Join"}
          </button>
        </form>
      </main>
    </div>
  );
}
