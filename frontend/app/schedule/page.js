"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { scheduleMeeting } from "@/lib/api";

export default function ScheduleMeeting() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successLink, setSuccessLink] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!title.trim() || !date || !time) {
      setError("Please fill in the title, date, and time.");
      return;
    }

    const scheduledTime = new Date(`${date}T${time}`);
    if (isNaN(scheduledTime.getTime())) {
      setError("Invalid date/time.");
      return;
    }

    setSubmitting(true);
    try {
      const meeting = await scheduleMeeting({
        title: title.trim(),
        description: description.trim(),
        host_name: "Default User",
        scheduled_time: scheduledTime.toISOString(),
        duration_minutes: Number(duration),
      });
      setSuccessLink(`${window.location.origin}/meeting/${meeting.meeting_code}`);
    } catch (err) {
      setError("Could not schedule meeting. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  }

  if (successLink) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-md mx-auto px-6 py-16 text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-3">Meeting Scheduled ✅</h1>
          <p className="text-gray-500 text-sm mb-4">Share this link with participants:</p>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-zoomblue break-all mb-6">
            {successLink}
          </div>
          <button
            onClick={() => router.push("/")}
            className="bg-zoomblue text-white font-medium px-6 py-2.5 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-md mx-auto px-6 py-16">
        <h1 className="text-xl font-bold text-gray-800 mb-6">Schedule a Meeting</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Sync"
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zoomblue"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              rows={2}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zoomblue"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-600">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zoomblue"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-600">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zoomblue"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Duration (minutes)</label>
            <input
              type="number"
              min="5"
              step="5"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zoomblue"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-zoomblue text-white font-medium py-2.5 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-60"
          >
            {submitting ? "Scheduling..." : "Schedule Meeting"}
          </button>
        </form>
      </main>
    </div>
  );
}
