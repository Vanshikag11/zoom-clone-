"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import MeetingCard from "@/components/MeetingCard";
import { createInstantMeeting, getUpcomingMeetings, getRecentMeetings } from "@/lib/api";

export default function Dashboard() {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingMeeting, setCreatingMeeting] = useState(false);

  useEffect(() => {
    async function load() {
      const [u, r] = await Promise.all([getUpcomingMeetings(), getRecentMeetings()]);
      setUpcoming(u);
      setRecent(r);
      setLoading(false);
    }
    load();
  }, []);

  async function handleNewMeeting() {
    setCreatingMeeting(true);
    try {
      const meeting = await createInstantMeeting("Default User");
      router.push(`/meeting/${meeting.meeting_code}`);
    } catch (err) {
      alert("Could not create meeting. Is the backend running?");
      setCreatingMeeting(false);
    }
  }

  function handleStartScheduled(code) {
    router.push(`/meeting/${code}`);
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Welcome back, Default User</h1>

        <div className="flex gap-4 mb-10">
          <button
            onClick={handleNewMeeting}
            disabled={creatingMeeting}
            className="bg-zoomblue text-white font-medium px-6 py-3 rounded-xl shadow-sm hover:bg-blue-600 transition-colors disabled:opacity-60"
          >
            {creatingMeeting ? "Starting..." : "+ New Meeting"}
          </button>
          <button
            onClick={() => router.push("/join")}
            className="bg-white border border-gray-300 text-gray-700 font-medium px-6 py-3 rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
          >
            Join Meeting
          </button>
          <button
            onClick={() => router.push("/schedule")}
            className="bg-white border border-gray-300 text-gray-700 font-medium px-6 py-3 rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
          >
            Schedule Meeting
          </button>
        </div>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Upcoming Meetings</h2>
          {loading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : upcoming.length === 0 ? (
            <p className="text-gray-400 text-sm">No upcoming meetings scheduled.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {upcoming.map((m) => (
                <MeetingCard key={m.id} meeting={m} onJoinClick={handleStartScheduled} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Recent Meetings</h2>
          {loading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : recent.length === 0 ? (
            <p className="text-gray-400 text-sm">No recent meetings yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recent.map((m) => (
                <MeetingCard key={m.id} meeting={m} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
