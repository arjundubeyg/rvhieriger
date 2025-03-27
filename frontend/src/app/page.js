// src/app/page.js
"use client"
import { useWebRTCManager } from '../components/videochat/WebRTCManager';
import VideoContainer from '../components/videochat/VideoContainer';
import ChatContainer from '../components/videochat/ChatContainer';
import ConnectionSpinner from '../components/videochat/ConnectionSpinner';

export default function VideoChatApp() {
  const {
    myVideoRef,
    strangerVideoRef,
    onlineRef,
    chatWrapperRef,
    inputRef,
    buttonRef,
    handleSendMessage
  } = useWebRTCManager();

  return (
    <div className="flex flex-col md:grid md:grid-cols-3 gap-4 h-screen overflow-hidden">
      <ConnectionSpinner />
      
      <VideoContainer 
        strangerVideoRef={strangerVideoRef} 
        myVideoRef={myVideoRef} 
      />
      
      <ChatContainer
        onlineRef={onlineRef}
        chatWrapperRef={chatWrapperRef}
        inputRef={inputRef}
        buttonRef={buttonRef}
        handleSendMessage={handleSendMessage}
      />
    </div>
  );
}
