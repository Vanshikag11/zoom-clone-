/**
 * api.js — Thin fetch wrapper around the FastAPI backend.
 *
 * NEXT_PUBLIC_API_URL is set via .env.local for local dev and via Vercel's
 * environment variable settings for production — never hardcode localhost,
 * or the deployed frontend won't be able to reach the deployed backend.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function createInstantMeeting(hostName = "Default User") {
  const res = await fetch(`${API_URL}/meetings/instant?host_name=${encodeURIComponent(hostName)}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to create meeting");
  return res.json();
}

export async function scheduleMeeting(payload) {
  const res = await fetch(`${API_URL}/meetings/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to schedule meeting");
  return res.json();
}

export async function getMeeting(code) {
  const res = await fetch(`${API_URL}/meetings/${code}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch meeting");
  return res.json();
}

export async function joinMeeting(code, displayName) {
  const res = await fetch(`${API_URL}/meetings/${code}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ display_name: displayName }),
  });
  if (!res.ok) throw new Error("Failed to join meeting");
  return res.json();
}

export async function getUpcomingMeetings() {
  const res = await fetch(`${API_URL}/meetings/upcoming`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function getRecentMeetings() {
  const res = await fetch(`${API_URL}/meetings/recent`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export function getWebSocketUrl(meetingCode, displayName) {
  const wsBase = API_URL.replace(/^http/, "ws");
  return `${wsBase}/ws/${meetingCode}?name=${encodeURIComponent(displayName)}`;
}
