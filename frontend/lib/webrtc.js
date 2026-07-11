"use client";
/**
 * webrtc.js — Mesh WebRTC connection management.
 *
 * How it avoids "glare" (both sides creating offers simultaneously, which
 * WebRTC handles badly): only the newly-joining peer initiates offers to
 * everyone already in the room (learned from the "welcome" message).
 * Existing peers stay passive and simply answer when an offer arrives.
 * This gives a clean, deterministic handshake direction for every pair.
 *
 * Mesh means every participant holds a direct RTCPeerConnection to every
 * other participant — no media ever touches this app's server. That's why
 * it's simple and cheap to run, but why it doesn't scale much past
 * ~4-6 participants (each participant's upload bandwidth multiplies with
 * room size). Real Zoom/Meet solve this with a media server (SFU) instead.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { getWebSocketUrl } from "./api";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

export function useWebRTC(meetingCode, displayName) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteParticipants, setRemoteParticipants] = useState([]); // [{peerId, displayName, stream}]
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [connectionError, setConnectionError] = useState(null);

  const wsRef = useRef(null);
  const peerConnectionsRef = useRef({}); // peerId -> RTCPeerConnection
  const localStreamRef = useRef(null);
  const displayNamesRef = useRef({}); // peerId -> displayName

  const upsertRemoteParticipant = useCallback((peerId, patch) => {
    setRemoteParticipants((prev) => {
      const idx = prev.findIndex((p) => p.peerId === peerId);
      if (idx === -1) return [...prev, { peerId, displayName: displayNamesRef.current[peerId] || "Guest", ...patch }];
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  }, []);

  const removeRemoteParticipant = useCallback((peerId) => {
    setRemoteParticipants((prev) => prev.filter((p) => p.peerId !== peerId));
  }, []);

  const createPeerConnection = useCallback((peerId, ws) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = (event) => {
      upsertRemoteParticipant(peerId, { stream: event.streams[0] });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        ws.send(JSON.stringify({ type: "ice-candidate", to: peerId, candidate: event.candidate }));
      }
    };

    peerConnectionsRef.current[peerId] = pc;
    return pc;
  }, [upsertRemoteParticipant]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
      } catch (err) {
        setConnectionError("Could not access camera/microphone. Please grant permission and reload.");
        return;
      }

      const ws = new WebSocket(getWebSocketUrl(meetingCode, displayName));
      wsRef.current = ws;

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case "welcome": {
            // We just joined. Initiate connections to everyone already here.
            for (const peer of message.existingPeers) {
              displayNamesRef.current[peer.peerId] = peer.displayName;
              const pc = createPeerConnection(peer.peerId, ws);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              ws.send(JSON.stringify({ type: "offer", to: peer.peerId, sdp: offer }));
            }
            break;
          }

          case "peer-joined": {
            // A new peer joined — just remember their name. They will send
            // us an offer shortly (see module docstring for why direction
            // is one-way).
            displayNamesRef.current[message.peerId] = message.displayName;
            break;
          }

          case "offer": {
            const pc = createPeerConnection(message.from, ws);
            await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: "answer", to: message.from, sdp: answer }));
            break;
          }

          case "answer": {
            const pc = peerConnectionsRef.current[message.from];
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
            break;
          }

          case "ice-candidate": {
            const pc = peerConnectionsRef.current[message.from];
            if (pc && message.candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
              } catch (e) {
                // benign if it arrives before remote description is set in rare races
              }
            }
            break;
          }

          case "peer-left": {
            const pc = peerConnectionsRef.current[message.peerId];
            if (pc) {
              pc.close();
              delete peerConnectionsRef.current[message.peerId];
            }
            removeRemoteParticipant(message.peerId);
            break;
          }

          default:
            break;
        }
      };

      ws.onerror = () => {
        setConnectionError("Signaling connection error — check that the backend is running.");
      };
    }

    init();

    return () => {
      cancelled = true;
      if (wsRef.current) wsRef.current.close();
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      peerConnectionsRef.current = {};
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingCode, displayName]);

  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    });
  }, []);

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setCameraOn(track.enabled);
    });
  }, []);

  const leaveCall = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
  }, []);

  return {
    localStream,
    remoteParticipants,
    micOn,
    cameraOn,
    connectionError,
    toggleMic,
    toggleCamera,
    leaveCall,
  };
}
