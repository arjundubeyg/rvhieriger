// src/components/videochat/WebRTCManager.js
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const useWebRTCManager = () => {
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const remoteSocketRef = useRef(null);
  const typeRef = useRef(null);
  const roomidRef = useRef(null);

  const myVideoRef = useRef(null);
  const strangerVideoRef = useRef(null);
  const buttonRef = useRef(null);
  const onlineRef = useRef(null);
  const chatWrapperRef = useRef(null);
  const inputRef = useRef(null);

  const [onlineUsers, setOnlineUsers] = useState(0);

  // Low-quality video constraints
  const LOW_QUALITY_CONSTRAINTS = {
    audio: true,
    video: {
      width: { ideal: 240 },
      height: { ideal: 240 },
      frameRate: { max: 10 },
      aspectRatio: 1,
      facingMode: 'user',
      resizeMode: 'crop-and-scale'
    }
  };

  // Media capture function
  const startMediaCapture = () => {
    navigator.mediaDevices.getUserMedia(LOW_QUALITY_CONSTRAINTS)
      .then(stream => {
        if (peerRef.current) {
          const videoTracks = stream.getVideoTracks();
          videoTracks.forEach(track => {
            track.applyConstraints({
              advanced: [{
                width: 240,
                height: 240,
                frameRate: 10,
                bitrate: 10000
              }]
            });
          });

          if (myVideoRef.current) {
            myVideoRef.current.srcObject = stream;
          }
          stream.getTracks().forEach(track => peerRef.current.addTrack(track, stream));

          peerRef.current.ontrack = e => {
            if (strangerVideoRef.current) {
              strangerVideoRef.current.srcObject = e.streams[0];
              strangerVideoRef.current.play();
            }
          }
        }
      })
      .catch(ex => {
        console.error('Media capture error:', ex);
      });
  };

  // WebRTC offer creation
  const createWebRTCOffer = async () => {
    if (typeRef.current === 'p1') {
      try {
        const offer = await peerRef.current.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        
        // Modify SDP to reduce video quality
        const modifiedSdp = offer.sdp?.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:100\r\n');
        if (modifiedSdp) offer.sdp = modifiedSdp;

        await peerRef.current.setLocalDescription(offer);
        socketRef.current.emit('sdp:send', { sdp: peerRef.current.localDescription });
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    }
  };

  // Handle message sending
  const handleSendMessage = () => {
    if (inputRef.current && chatWrapperRef.current) {
      const input = inputRef.current.value.trim();
      if (input) {
        socketRef.current.emit('send-message', input, typeRef.current, roomidRef.current);

        const msghtml = `
        <div class="msg">
        <b>You: </b> <span id='msg'>${input}</span>
        </div>
        `;
        chatWrapperRef.current.innerHTML += msghtml;
        chatWrapperRef.current.scrollTop = chatWrapperRef.current.scrollHeight;

        inputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    // Initialize Socket.IO connection
    socketRef.current = io('https://rvhieriger-1.onrender.com', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Disconnection handler
    socketRef.current.on('disconnected', () => {
      window.location.href = `/?disconnect`;
    });

    // Start connection
    socketRef.current.emit('start', (person) => {
      typeRef.current = person;
    });

    // Remote socket connection handler
    socketRef.current.on('remote-socket', (id) => {
      remoteSocketRef.current = id;

      // Hide the spinner
      const modal = document.querySelector('.modal');
      if (modal) modal.classList.add('hidden');

      // Create peer connection
      const rtcConfig = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ],
        sdpSemantics: 'unified-plan',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      };

      peerRef.current = new RTCPeerConnection(rtcConfig);

      // Negotiation needed handler
      peerRef.current.onnegotiationneeded = async () => {
        await createWebRTCOffer();
      };

      // ICE candidate handler
      peerRef.current.onicecandidate = e => {
        socketRef.current.emit('ice:send', { candidate: e.candidate, to: remoteSocketRef.current });
      };

      // Start media capture
      startMediaCapture();
    });

    // SDP reply handler
    socketRef.current.on('sdp:reply', async ({ sdp, from }) => {
      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(sdp));

        if (typeRef.current === 'p2') {
          const ans = await peerRef.current.createAnswer();
          
          // Modify SDP to reduce video quality
          const modifiedSdp = ans.sdp?.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:100\r\n');
          if (modifiedSdp) ans.sdp = modifiedSdp;

          await peerRef.current.setLocalDescription(ans);
          socketRef.current.emit('sdp:send', { sdp: peerRef.current.localDescription });
        }
      } catch (error) {
        console.error('Error handling SDP reply:', error);
      }
    });

    // ICE candidate handler
    socketRef.current.on('ice:reply', async ({ candidate, from }) => {
      try {
        if (candidate) {
          await peerRef.current.addIceCandidate(candidate);
        }
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    });

    // Room ID handler
    socketRef.current.on('roomid', (id) => {
      roomidRef.current = id;
    });

    // Message receive handler
    socketRef.current.on('get-message', (input, type) => {
      if (chatWrapperRef.current) {
        const msghtml = `
        <div class="msg">
        <b>Stranger: </b> <span id='msg'>${input}</span>
        </div>
        `;
        chatWrapperRef.current.innerHTML += msghtml;
        chatWrapperRef.current.scrollTop = chatWrapperRef.current.scrollHeight;
      }
    });

    // Online users handler
    socketRef.current.on('online-users', (count) => {
      setOnlineUsers(count);
      if (onlineRef.current) {
        onlineRef.current.textContent = `Online: ${count}`;
      }
    });

    // Cleanup function
    return () => {
      // Disconnect socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      // Close peer connection
      if (peerRef.current) {
        peerRef.current.close();
      }

      // Stop media tracks
      if (myVideoRef.current && myVideoRef.current.srcObject) {
        const tracks = myVideoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  return {
    socketRef,
    peerRef,
    remoteSocketRef,
    typeRef,
    roomidRef,
    myVideoRef,
    strangerVideoRef,
    buttonRef,
    onlineRef,
    chatWrapperRef,
    inputRef,
    onlineUsers,
    handleSendMessage
  };
};
