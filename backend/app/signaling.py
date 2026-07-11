"""
signaling.py — WebSocket-based signaling relay for WebRTC.

Important: this server NEVER sees or handles actual video/audio — that
travels peer-to-peer directly between browsers once connected. This
WebSocket's only job is to relay small JSON handshake messages (offers,
answers, ICE candidates) so browsers can find each other and negotiate
a direct connection. This is why it's cheap to run even at scale, and why
it's a separate concern from the REST API in main.py.

Mesh topology: every participant connects to every other participant
directly (peer-to-peer, no server relay of media). This is simple to
implement and fine for small meetings (2-6 people), but each participant's
upload bandwidth scales with the number of other participants — which is
exactly why real Zoom/Meet use a media server (SFU) instead at scale.
That tradeoff is worth stating explicitly if asked in the interview.
"""
import json
import uuid
from typing import Dict
from fastapi import WebSocket, WebSocketDisconnect


class SignalingManager:
    def __init__(self):
        # meeting_code -> {peer_id: (WebSocket, display_name)}
        self.rooms: Dict[str, Dict[str, tuple]] = {}

    async def connect(self, websocket: WebSocket, meeting_code: str, display_name: str) -> str:
        await websocket.accept()
        peer_id = str(uuid.uuid4())[:8]

        if meeting_code not in self.rooms:
            self.rooms[meeting_code] = {}

        existing_peers = [
            {"peerId": pid, "displayName": name}
            for pid, (_, name) in self.rooms[meeting_code].items()
        ]

        self.rooms[meeting_code][peer_id] = (websocket, display_name)

        # Tell the new client who's already in the room, and their own id
        await websocket.send_json({
            "type": "welcome",
            "yourPeerId": peer_id,
            "existingPeers": existing_peers,
        })

        # Tell everyone else a new peer joined
        await self._broadcast(meeting_code, {
            "type": "peer-joined",
            "peerId": peer_id,
            "displayName": display_name,
        }, exclude=peer_id)

        return peer_id

    def disconnect(self, meeting_code: str, peer_id: str):
        if meeting_code in self.rooms and peer_id in self.rooms[meeting_code]:
            del self.rooms[meeting_code][peer_id]
            if not self.rooms[meeting_code]:
                del self.rooms[meeting_code]

    async def _broadcast(self, meeting_code: str, message: dict, exclude: str = None):
        if meeting_code not in self.rooms:
            return
        for pid, (ws, _) in list(self.rooms[meeting_code].items()):
            if pid != exclude:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass  # peer likely disconnected mid-broadcast; cleanup happens on their own disconnect

    async def relay_to_peer(self, meeting_code: str, target_peer_id: str, message: dict):
        """Targeted relay — used for offer/answer/ICE candidates, which are
        meant for one specific peer, not the whole room."""
        if meeting_code in self.rooms and target_peer_id in self.rooms[meeting_code]:
            ws, _ = self.rooms[meeting_code][target_peer_id]
            await ws.send_json(message)

    async def broadcast_peer_left(self, meeting_code: str, peer_id: str):
        await self._broadcast(meeting_code, {"type": "peer-left", "peerId": peer_id})


manager = SignalingManager()


async def handle_signaling_connection(websocket: WebSocket, meeting_code: str, display_name: str):
    peer_id = await manager.connect(websocket, meeting_code, display_name)
    try:
        while True:
            raw = await websocket.receive_text()
            message = json.loads(raw)
            message["from"] = peer_id  # server stamps the true sender, don't trust client-provided "from"

            target = message.get("to")
            if target:
                await manager.relay_to_peer(meeting_code, target, message)
    except WebSocketDisconnect:
        manager.disconnect(meeting_code, peer_id)
        await manager.broadcast_peer_left(meeting_code, peer_id)
