
import React, { useState, useEffect } from 'react';
import { Chat } from '../types';
import { ICONS } from '../constants';
import { smartSearch } from '../services/geminiService';

interface ChatListProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({ chats, selectedChatId, onSelectChat }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isSearchingAi, setIsSearchingAi] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Filter chats based on search query
  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAiSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingAi(true);
    setAiResponse(null);
    
    const response = await smartSearch(searchQuery);
    setAiResponse(response);
    setIsSearchingAi(false);
  };

  const handleInvite = (platform: string) => {
    // Generate mock invite link
    const inviteLink = `https://fczone.app/invite?id=${Math.random().toString(36).substr(2, 9)}`;
    const message = `Join me in the FAST & FURIOUS CHAT ZONE! 🏎️💨 ${inviteLink}`;
    
    if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    } else if (platform === 'clipboard') {
        navigator.clipboard.writeText(message);
        alert("Invite code copied to dash! Broadcast it to your crew.");
    }
    setShowInviteModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-nitro-black w-full flex-1">
      <div className="px-4 py-4 space-y-3">
        <div className="relative group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
            placeholder="Search racers or ask AI..."
            className="w-full bg-gray-100 dark:bg-nitro-gray/50 text-sm rounded-xl py-3 pl-10 pr-12 focus:outline-none focus:ring-2 focus:ring-nitro-primary/50 border border-gray-200 dark:border-white/5 dark:text-white text-gray-900 transition-all"
          />
          <div className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-nitro-primary transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button 
            onClick={handleAiSearch}
            disabled={!searchQuery.trim() || isSearchingAi}
            className={`absolute right-2 top-2 p-1.5 rounded-lg transition-all ${
              searchQuery.trim() ? 'text-nitro-magenta hover:bg-nitro-magenta/10' : 'text-gray-500 opacity-30'
            }`}
            title="Nitro AI Search"
          >
            <ICONS.Ai className={`w-5 h-5 ${isSearchingAi ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* AI Response Panel */}
        {(aiResponse || isSearchingAi) && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            <div className="p-3 rounded-xl border border-nitro-magenta/30 bg-nitro-magenta/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1">
                <div className="w-1.5 h-1.5 bg-nitro-magenta rounded-full animate-pulse shadow-[0_0_5px_var(--nitro-magenta)]"></div>
              </div>
              <div className="flex items-start gap-2">
                <ICONS.Ai className="w-4 h-4 text-nitro-magenta mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-orbitron font-black text-nitro-magenta uppercase tracking-widest mb-1">Nitro Insight</p>
                  {isSearchingAi ? (
                    <div className="space-y-1">
                      <div className="h-2 w-full bg-nitro-magenta/10 rounded animate-pulse"></div>
                      <div className="h-2 w-2/3 bg-nitro-magenta/10 rounded animate-pulse"></div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug italic">"{aiResponse}"</p>
                  )}
                </div>
                {!isSearchingAi && (
                  <button onClick={() => setAiResponse(null)} className="text-gray-500 hover:text-gray-300 text-[10px]">✕</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-2">
        <h4 className="text-[10px] font-orbitron font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em]">Active Roster</h4>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="relative mb-4">
                <ICONS.Nitro className="w-12 h-12 opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-[1px] bg-nitro-magenta/30 rotate-45"></div>
                </div>
            </div>
            <p className="text-xs font-orbitron uppercase tracking-widest opacity-40 mb-6 italic">No Signal Detected in this Sector</p>
            <button 
                onClick={() => setShowInviteModal(true)}
                className="px-6 py-3 bg-nitro-cyan text-nitro-black font-orbitron font-black text-[10px] uppercase rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
                Invite to Zone
            </button>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`flex items-center gap-3 p-4 cursor-pointer border-b border-gray-100 dark:border-nitro-gray/30 hover:bg-gray-50 dark:hover:bg-nitro-gray/20 transition-all group ${
                selectedChatId === chat.id ? 'bg-gray-100 dark:bg-nitro-gray/40 border-l-4 border-l-nitro-primary' : ''
              }`}
            >
              <div className="relative">
                <img src={chat.avatar} alt={chat.name} className={`w-12 h-12 rounded-full object-cover border-2 transition-all duration-300 ${selectedChatId === chat.id ? 'border-nitro-primary shadow-lg shadow-nitro-primary/20' : 'border-gray-200 dark:border-nitro-gray'}`} />
                {/* Status Dot with Glow */}
                <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-nitro-black rounded-full ${
                  chat.name === 'Dom Toretto' ? 'bg-nitro-green status-glow-online' : 'bg-gray-500'
                }`}></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className={`font-bold truncate text-sm transition-colors ${selectedChatId === chat.id ? 'neon-primary' : 'text-gray-900 dark:text-gray-100 group-hover:neon-primary'}`}>{chat.name}</h3>
                  <span className="text-[9px] text-gray-400 font-medium">
                    {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                  {(chat.unreadCount > 0 || (chat.scheduledMessages && chat.scheduledMessages.length > 0)) && (
                    <span className={`${chat.unreadCount > 0 ? 'bg-nitro-primary' : 'bg-nitro-yellow'} text-nitro-black px-1 py-0.5 rounded-[4px] text-[7px] font-black uppercase`}>
                      {chat.unreadCount > 0 ? 'Nitro' : 'Timed'}
                    </span>
                  )}
                  {chat.lastMessage}
                </p>
              </div>
              {chat.unreadCount > 0 && (
                <div className="w-5 h-5 bg-nitro-primary rounded-full flex items-center justify-center text-[9px] font-black text-nitro-black shadow-[0_0_10px_var(--nitro-primary)]">
                  {chat.unreadCount}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showInviteModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-nitro-black/90 backdrop-blur-md">
            <div className="max-w-xs w-full glass-panel border-nitro-cyan p-8 rounded-[40px] text-center space-y-6 animate-in zoom-in-95 duration-200">
                <div className="w-20 h-20 bg-nitro-cyan/20 rounded-full flex items-center justify-center mx-auto">
                    <ICONS.Rocket className="w-10 h-10 text-nitro-cyan animate-bounce" />
                </div>
                <div className="space-y-2">
                    <h3 className="font-orbitron font-black text-white text-xl uppercase tracking-tighter">INVITE CREW</h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Recruit new racers to your sector.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleInvite('clipboard')} className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-nitro-cyan/50 hover:bg-nitro-cyan/10 transition-all group">
                        <ICONS.Link className="w-6 h-6 text-nitro-cyan group-hover:scale-125 transition-transform" />
                        <span className="text-[8px] font-black uppercase text-gray-400 group-hover:text-white">Copy Link</span>
                    </button>
                    <button onClick={() => handleInvite('whatsapp')} className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-nitro-green/50 hover:bg-nitro-green/10 transition-all group">
                        <ICONS.Whatsapp className="w-6 h-6 text-nitro-green group-hover:scale-125 transition-transform" />
                        <span className="text-[8px] font-black uppercase text-gray-400 group-hover:text-white">WhatsApp</span>
                    </button>
                </div>

                <button onClick={() => setShowInviteModal(false)} className="w-full py-2 text-[9px] font-black uppercase text-gray-500 hover:text-white tracking-widest">Abort Mission</button>
            </div>
          </div>
      )}
    </div>
  );
};

export default ChatList;
