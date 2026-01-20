
import React, { useState, useEffect, useRef } from 'react';
import { Chat, User } from '../types';
import { ICONS } from '../constants';
import { smartSearch } from '../services/geminiService';
import { playUiSound } from '../services/audioService';

interface ChatListProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
  onTogglePin: (id: string) => void;
  currentUser: User | null;
  onViewImage: (url: string) => void;
}

type SortOption = 'time' | 'unread' | 'alpha';

const ChatList: React.FC<ChatListProps> = ({ chats, selectedChatId, onSelectChat, onTogglePin, currentUser, onViewImage }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isSearchingAi, setIsSearchingAi] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('time');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isVoiceSearchActive, setIsVoiceSearchActive] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Filter chats based on search query
  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sorting Logic: Pinned first, then by sortOption
  const sortedChats = [...filteredChats].sort((a, b) => {
    // Pinned priority
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // Secondary Sort
    switch (sortOption) {
        case 'unread':
            return b.unreadCount - a.unreadCount;
        case 'alpha':
            return a.name.localeCompare(b.name);
        case 'time':
        default:
            return b.timestamp - a.timestamp;
    }
  });

  const handleAiSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingAi(true);
    setAiResponse(null);
    
    const response = await smartSearch(searchQuery);
    setAiResponse(response);
    setIsSearchingAi(false);
  };

  const handleInvite = (platform: string) => {
    const code = currentUser?.customInviteCode || currentUser?.id || 'RACE';
    const inviteLink = `https://fczone.app/join/${code}`;
    const message = `Join me in the FAST & FURIOUS CHAT ZONE! 🏎️💨 ${inviteLink}`;
    
    if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    } else if (platform === 'twitter') {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`, '_blank');
    } else if (platform === 'instagram') {
        navigator.clipboard.writeText(inviteLink);
        alert("Link copied! Paste it in your Instagram Bio or Stories.");
    } else if (platform === 'clipboard') {
        navigator.clipboard.writeText(inviteLink);
        alert("Invite uplink copied to clipboard.");
    }
    
    if (platform !== 'clipboard' && platform !== 'instagram') setShowInviteModal(false);
  };

  const handleContactFab = async () => {
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel'];
        const opts = { multiple: true };
        const contacts = await (navigator as any).contacts.select(props, opts);
        console.log("Contacts selected:", contacts);
        alert(`Successfully synced ${contacts.length} contacts to Grid.`);
        playUiSound('levelUp');
      } catch (ex) {
        // Fallback or cancelled
        setShowInviteModal(true);
      }
    } else {
        setShowInviteModal(true);
    }
  };

  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Voice search not supported.");
        return;
    }
    
    if (isVoiceSearchActive) {
        recognitionRef.current?.stop();
        setIsVoiceSearchActive(false);
        return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        setIsVoiceSearchActive(true);
        playUiSound('click');
    };

    recognition.onresult = (event: any) => {
        const speechResult = event.results[0][0].transcript;
        setSearchQuery(speechResult);
        setTimeout(() => handleAiSearch(), 500);
        setIsVoiceSearchActive(false);
    };

    recognition.onerror = () => {
        setIsVoiceSearchActive(false);
    };

    recognition.onend = () => {
        setIsVoiceSearchActive(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-nitro-black w-full flex-1 relative">
      <div className="px-4 py-4 space-y-3">
        <div className="relative group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
            placeholder={isVoiceSearchActive ? "Listening..." : "Search racers or ask AI..."}
            className={`w-full bg-gray-100 dark:bg-nitro-gray/50 text-sm rounded-xl py-3 pl-10 pr-20 focus:outline-none focus:ring-2 focus:ring-nitro-primary/50 border border-gray-200 dark:border-white/5 dark:text-white text-gray-900 transition-all ${isVoiceSearchActive ? 'border-nitro-cyan ring-1 ring-nitro-cyan' : ''}`}
          />
          <div className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-nitro-primary transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <div className="absolute right-2 top-2 flex items-center gap-1">
             <button
                onClick={startVoiceSearch}
                className={`p-1.5 rounded-lg transition-all ${isVoiceSearchActive ? 'text-nitro-cyan animate-pulse bg-nitro-cyan/10' : 'text-gray-500 hover:text-white'}`}
             >
                 <ICONS.Mic className="w-4 h-4" />
             </button>
             <button 
                onClick={handleAiSearch}
                disabled={!searchQuery.trim() || isSearchingAi}
                className={`p-1.5 rounded-lg transition-all ${
                searchQuery.trim() ? 'text-nitro-magenta hover:bg-nitro-magenta/10' : 'text-gray-500 opacity-30'
                }`}
                title="Nitro AI Search"
             >
                <ICONS.Ai className={`w-5 h-5 ${isSearchingAi ? 'animate-spin' : ''}`} />
             </button>
          </div>
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

      <div className="px-4 pb-2 flex justify-between items-center">
        <h4 className="text-[10px] font-orbitron font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em]">Active Roster</h4>
        <div className="relative">
            <button onClick={() => setIsSortMenuOpen(!isSortMenuOpen)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
                <ICONS.Sort className="w-4 h-4" />
            </button>
            {isSortMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-32 bg-nitro-black border border-white/10 rounded-xl shadow-xl z-50 py-1">
                    {[
                        { id: 'time', label: 'Recent' },
                        { id: 'unread', label: 'Unread' },
                        { id: 'alpha', label: 'A-Z' },
                    ].map(opt => (
                        <button 
                            key={opt.id} 
                            onClick={() => { setSortOption(opt.id as SortOption); setIsSortMenuOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase hover:bg-white/5 ${sortOption === opt.id ? 'text-nitro-cyan' : 'text-gray-400'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-20">
        {sortedChats.length === 0 ? (
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
          sortedChats.map((chat) => {
             // Determine speeding status for visual indicator
             const isSpeeding = chat.participants.some(p => p.id !== currentUser?.id && p.status === 'speeding');

             return (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`relative flex items-center gap-3 p-4 cursor-pointer border-b border-gray-100 dark:border-nitro-gray/30 hover:bg-gray-50 dark:hover:bg-nitro-gray/20 transition-all group ${
                selectedChatId === chat.id ? 'bg-gray-100 dark:bg-nitro-gray/40 border-l-4 border-l-nitro-primary' : ''
              }`}
            >
              <div 
                className="relative cursor-pointer group/avatar"
                onClick={(e) => { e.stopPropagation(); onViewImage(chat.avatar); }}
              >
                <img src={chat.avatar} alt={chat.name} className={`w-12 h-12 rounded-full object-cover border-2 transition-all duration-300 ${selectedChatId === chat.id ? 'border-nitro-primary shadow-lg shadow-nitro-primary/20' : 'border-gray-200 dark:border-nitro-gray'}`} />
                
                {/* Speeding Visual Indicator */}
                {isSpeeding && (
                     <div className="absolute inset-[-4px] border-2 border-nitro-magenta rounded-full animate-ping opacity-75"></div>
                )}

                {/* Status Dot with Glow */}
                <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-nitro-black rounded-full ${
                  isSpeeding ? 'bg-nitro-magenta animate-pulse' : (chat.name === 'Dom Toretto' ? 'bg-nitro-green status-glow-online' : 'bg-gray-500')
                }`}></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold truncate text-sm transition-colors ${selectedChatId === chat.id ? 'neon-primary' : 'text-gray-900 dark:text-gray-100 group-hover:neon-primary'}`}>{chat.name}</h3>
                    {chat.isPinned && <ICONS.Tuning className="w-3 h-3 text-nitro-yellow rotate-45" />}
                  </div>
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
              
              <button 
                onClick={(e) => { e.stopPropagation(); onTogglePin(chat.id); }}
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-nitro-black/80 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 text-white z-10`}
                title={chat.isPinned ? "Unpin Chat" : "Pin Chat"}
              >
                  <ICONS.Tuning className={`w-3 h-3 ${chat.isPinned ? 'text-nitro-yellow rotate-45' : 'text-gray-400'}`} />
              </button>

              {chat.unreadCount > 0 && (
                <div className="w-5 h-5 bg-nitro-primary rounded-full flex items-center justify-center text-[9px] font-black text-nitro-black shadow-[0_0_10px_var(--nitro-primary)] ml-2">
                  {chat.unreadCount}
                </div>
              )}
            </div>
          )})
        )}
      </div>

      {/* Floating Action Button for Contacts/Invite */}
      <button 
        onClick={handleContactFab}
        className="absolute bottom-6 right-6 w-14 h-14 bg-nitro-cyan text-nitro-black rounded-full shadow-[0_0_20px_rgba(0,243,255,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-20 group"
        title="Add Contact / Invite"
      >
          <ICONS.Plus className="w-8 h-8 group-hover:rotate-90 transition-transform" />
      </button>

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
                
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-2 flex items-center justify-between">
                    <div className="text-[10px] text-nitro-cyan font-mono truncate mr-2">
                        fczone.app/join/{currentUser?.customInviteCode || currentUser?.id || '...' }
                    </div>
                    <button onClick={() => handleInvite('clipboard')} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white">
                        <ICONS.Link className="w-4 h-4" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleInvite('whatsapp')} className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-nitro-green/50 hover:bg-nitro-green/10 transition-all group">
                        <ICONS.Whatsapp className="w-6 h-6 text-nitro-green group-hover:scale-125 transition-transform" />
                        <span className="text-[8px] font-black uppercase text-gray-400 group-hover:text-white">WhatsApp</span>
                    </button>
                    <button onClick={() => handleInvite('twitter')} className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-nitro-cyan/50 hover:bg-nitro-cyan/10 transition-all group">
                        <ICONS.Twitter className="w-6 h-6 text-nitro-cyan group-hover:scale-125 transition-transform" />
                        <span className="text-[8px] font-black uppercase text-gray-400 group-hover:text-white">Twitter</span>
                    </button>
                    <button onClick={() => handleInvite('instagram')} className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-nitro-magenta/50 hover:bg-nitro-magenta/10 transition-all group">
                        <ICONS.Instagram className="w-6 h-6 text-nitro-magenta group-hover:scale-125 transition-transform" />
                        <span className="text-[8px] font-black uppercase text-gray-400 group-hover:text-white">Stories</span>
                    </button>
                    <button onClick={() => handleInvite('clipboard')} className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all group">
                        <ICONS.Link className="w-6 h-6 text-white group-hover:scale-125 transition-transform" />
                        <span className="text-[8px] font-black uppercase text-gray-400 group-hover:text-white">Copy</span>
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
