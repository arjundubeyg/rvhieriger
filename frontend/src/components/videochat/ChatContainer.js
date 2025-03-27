// src/components/videochat/ChatContainer.js
import React, { useRef } from 'react';

const ChatContainer = ({ 
  onlineRef, 
  chatWrapperRef, 
  inputRef, 
  buttonRef, 
  handleSendMessage 
}) => {
  return (
    <div className="border-l-2 border-lightblue p-4 h-full relative flex flex-col">
      {/* Online Users */}
      <div ref={onlineRef} id="online" className="text-right mb-4">
        Online: 0
      </div>

      {/* Chat Messages */}
      <div ref={chatWrapperRef} className="wrapper flex-grow overflow-y-auto mb-4"></div>

      {/* Input Area */}
      <div className="flex gap-2 mt-auto">
        <input 
          ref={inputRef}
          type="text" 
          placeholder='Type your message here..' 
          className="flex-grow p-2 rounded-[15px] text-sm outline outline-2 outline-violet-500"
        />
        <button 
          ref={buttonRef}
          id="send"
          className="text-sm px-4 py-2 font-bold text-white bg-blueviolet rounded-[10px] outline outline-2 outline-violet-500"
          onClick={handleSendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatContainer;
