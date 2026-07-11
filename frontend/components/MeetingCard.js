"use client";

function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function MeetingCard({ meeting, onJoinClick }) {
  const isScheduled = meeting.meeting_type === "scheduled";

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex justify-between items-center">
      <div>
        <h3 className="font-semibold text-gray-800">{meeting.title}</h3>
        {meeting.description && (
          <p className="text-sm text-gray-500 mt-0.5">{meeting.description}</p>
        )}
        <div className="flex gap-3 mt-1 text-xs text-gray-400">
          {isScheduled && meeting.scheduled_time && (
            <span>{formatDateTime(meeting.scheduled_time)}</span>
          )}
          {isScheduled && meeting.duration_minutes && (
            <span>{meeting.duration_minutes} min</span>
          )}
          <span>ID: {meeting.meeting_code}</span>
        </div>
      </div>
      {onJoinClick && (
        <button
          onClick={() => onJoinClick(meeting.meeting_code)}
          className="bg-zoomblue text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Start
        </button>
      )}
    </div>
  );
}
