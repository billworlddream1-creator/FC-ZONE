
import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "./firebase";
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import Dashboard from './components/Dashboard';
import AuthScreen from './components/AuthScreen';
import ZoneView from './components/ZoneView';
import FamilyView from './components/FamilyView';
import GossipView from './components/GossipView';
import CallHistoryModal from './components/CallHistoryModal';
import SubscriptionModal from './components/SubscriptionModal';
import { INITIAL_CHATS, CURRENT_USER, ICONS } from './constants';
import { Chat, Message, ChatType, VoiceProfile, User, ExpiryDuration } from './types';
import { speakText, playUiSound, toggleEngineHum } from './services/audioService';
import { nitroAssistantQuery, generateOfflineReply, analyzeSentimentAndStyle, generateNitroBotResponse } from './services/geminiService';

const EXPIRY_MAP: Record<string, number> = {
  '24h': 1000 * 60 * 60 * 24,
  '1w': 1000 * 60 * 60 * 24 * 7,
  '1m': 1000 * 60 * 60 * 24 * 30,
};

export const App: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [trashMessages, setTrashMessages] = useState<Message[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chats' | 'family' | 'zone' | 'gossip' | 'settings' | 'tools'>('chats');
  const [isRacerProfileOpen, setIsRacerProfileOpen] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'stats' | 'engine' | 'settings' | 'voice' | 'vibe' | 'trash' | undefined>(undefined);
  const [isChatListOpen, setIsChatListOpen] = useState(false);
  const [isMoreToolsOpen, setIsMoreToolsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  // Profile Menu State
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  // Location Tracker State
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [trackingData, setTrackingData] = useState<{lat: string, lng: string, dist: string} | null>(null);

  // Analysis State
  const [analysisResult, setAnalysisResult] = useState<{mood: string, style: string, intent: string} | null>(null);
  
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile>('off');
  const [chatBgColor, setChatBgColor] = useState('#0a192f');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const lastActivityRef = useRef<number>(Date.now());
  const chatWindowRef = useRef<any>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const selectedChat = chats.find(c => c.id === selectedChatId);

  // Update background based on user preference
  useEffect(() => {
      if (currentUser?.themePreference) {
          setChatBgColor(currentUser.themePreference);
      }
  }, [currentUser?.themePreference]);

  // Click outside listener for profile menu
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
              setIsProfileMenuOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Location Tracker Effect
  useEffect(() => {
    let interval: any;
    if (isLocationTracking) {
      setTrackingData(null); // Reset to show scanning state
      playUiSound('click');
      let steps = 0;
      interval = setInterval(() => {
        steps++;
        if (steps > 5) {
           // Locked on
           setTrackingData({
               lat: (34.0522 + (Math.random() - 0.5) * 0.1).toFixed(4),
               lng: (-118.2437 + (Math.random() - 0.5) * 0.1).toFixed(4),
               dist: (Math.random() * 5 + 0.5).toFixed(1) + ' KM'
           });
           playUiSound('alarm'); // Lock sound
           clearInterval(interval);
        }
      }, 500);
    } else {
        setTrackingData(null);
    }
    return () => clearInterval(interval);
  }, [isLocationTracking]);

  const handleSelectChat = (id: string) => {
    setSelectedChatId(id);
    setIsChatListOpen(false);
    if (currentUser?.soundEnabled) playUiSound('click', currentUser.soundPack);
  };

  const handleUpdateUser = (updated: Partial<User>) => {
    setCurrentUser(prev => prev ? { ...prev, ...updated } : null);
  };

  const handleUpdateWallpaper = async (chatId: string, wallpaper: string) => {
    if (!currentUser) return;
    if (currentUser.id === 'demo-pilot') {
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, wallpaper } : c));
    } else {
        try {
            await updateDoc(doc(db, "chats", chatId), { wallpaper });
        } catch (e) {
            console.error("Failed to update wallpaper", e);
        }
    }
    if (currentUser.soundEnabled) playUiSound('click', currentUser.soundPack);
  };

  const handleUpdateExpiryDuration = async (chatId: string, duration: ExpiryDuration) => {
    if (!currentUser) return;
    if (currentUser.id === 'demo-pilot') {
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, expiryDuration: duration } : c));
    } else {
        try {
            await updateDoc(doc(db, "chats", chatId), { expiryDuration: duration });
        } catch (e) {
            console.error("Failed to update expiry", e);
        }
    }
    if (currentUser.soundEnabled) playUiSound('click', currentUser.soundPack);
  };

  const handleToggleBackgroundMusic = () => {
      if (!currentUser) return;
      const newState = !currentUser.backgroundMusic;
      handleUpdateUser({ backgroundMusic: newState });
      toggleEngineHum(newState);
      playUiSound(newState ? 'nitro' : 'click', currentUser.soundPack);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        setCurrentUser({
          ...CURRENT_USER,
          id: user.uid,
          name: user.displayName || 'Nitro Rider',
          email: user.email || '',
          avatar: user.photoURL || `https://picsum.photos/seed/${user.uid}/200`
        });
      } else {
        if (!isAuthenticated) {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      }
    });

    const handleDemoAuth = () => {
      setIsAuthenticated(true);
      setCurrentUser({
        ...CURRENT_USER,
        id: 'demo-pilot',
        name: 'Demo Pilot',
        status: 'online'
      });
      setChats(INITIAL_CHATS);
      setSelectedChatId(INITIAL_CHATS[0].id);
    };

    window.addEventListener('nitro-demo-auth', handleDemoAuth);
    return () => {
      unsubscribe();
      window.removeEventListener('nitro-demo-auth', handleDemoAuth);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || currentUser?.id === 'demo-pilot') return;
    const q = query(collection(db, "chats"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChats = snapshot.docs.map(doc => ({ id: doc.id, expiryDuration: 'off', ...doc.data(), messages: [] } as Chat));
      if (fetchedChats.length > 0) {
        setChats(fetchedChats);
        if (!selectedChatId) setSelectedChatId(fetchedChats[0].id);
      } else {
        setChats(INITIAL_CHATS);
      }
    });
    return () => unsubscribe();
  }, [isAuthenticated, currentUser?.id]);

  useEffect(() => {
    if (!selectedChatId || !isAuthenticated || currentUser?.id === 'demo-pilot') return;
    const q = query(collection(db, "chats", selectedChatId, "messages"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setChats(prev => prev.map(c => c.id === selectedChatId ? { ...c, messages: msgs } : c));
    });
    return () => unsubscribe();
  }, [selectedChatId, isAuthenticated, currentUser?.id]);

  const handleSendMessage = async (text: string, type: string = 'text', fileData?: any) => {
    if (!selectedChatId || !currentUser) return;
    lastActivityRef.current = Date.now();

    let expiryTimestamp: number | undefined;
    if (selectedChat?.expiryDuration && selectedChat.expiryDuration !== 'off') {
        expiryTimestamp = Date.now() + EXPIRY_MAP[selectedChat.expiryDuration];
    }

    const newMessage: Message = { 
        id: Date.now().toString(), 
        senderId: currentUser.id, 
        senderName: currentUser.name, 
        text, 
        timestamp: Date.now(), 
        type: type as any, 
        status: 'sent', 
        fileData,
        expiryTimestamp 
    };
    
    // Helper to add bot message
    const addBotMessage = async (botText: string) => {
        const botMsg: Message = { 
            id: (Date.now() + 100).toString(), 
            senderId: 'nitro-bot', 
            senderName: 'Nitro Bot', 
            text: botText, 
            timestamp: Date.now(), 
            type: 'text', 
            status: 'delivered', 
            isAi: true,
            expiryTimestamp: selectedChat?.expiryDuration !== 'off' ? Date.now() + EXPIRY_MAP[selectedChat!.expiryDuration!] : undefined
        };
        
        if (currentUser.id === 'demo-pilot') {
            setChats(prev => prev.map(c => c.id === selectedChatId ? { ...c, messages: [...(c.messages || []), botMsg], lastMessage: botText } : c));
        } else {
            await addDoc(collection(db, "chats", selectedChatId, "messages"), { ...botMsg, fileData: null }); 
        }
        if(currentUser.soundEnabled) playUiSound('receive', currentUser.soundPack);
        setIsTyping(false);
    };

    if (currentUser.id === 'demo-pilot') {
      setChats(prev => prev.map(c => c.id === selectedChatId ? { ...c, messages: [...(c.messages || []), newMessage], lastMessage: text } : c));
      if (currentUser.soundEnabled) playUiSound('send', currentUser.soundPack);
      
      const chat = chats.find(c => c.id === selectedChatId);
      const recipient = chat?.participants.find(p => p.id !== currentUser.id);

      if (currentUser.aiCoPilot) {
          setTimeout(() => setIsTyping(true), 800);
          setTimeout(async () => {
              const history = chat?.messages.slice(-5).map(m => m.text) || [];
              const reply = await generateNitroBotResponse(history, text);
              await addBotMessage(reply);
          }, 2000);
          return;
      }

      if (recipient && (recipient.status === 'offline' || recipient.id === 'dom')) {
          setTimeout(() => setIsTyping(true), 1500);
          setTimeout(async () => {
              const reply = await generateOfflineReply(currentUser.name, recipient.name, text);
              await addBotMessage(reply); 
          }, 3500);
      }
      return;
    }

    try {
      const msgCollection = collection(db, "chats", selectedChatId, "messages");
      await addDoc(msgCollection, { ...newMessage, fileData: fileData || null });
      await updateDoc(doc(db, "chats", selectedChatId), { lastMessage: text, timestamp: Date.now() });
      if (currentUser.soundEnabled) playUiSound('send', currentUser.soundPack);

      const chat = chats.find(c => c.id === selectedChatId);
      const recipient = chat?.participants.find(p => p.id !== currentUser.id);
      
      if (currentUser.aiCoPilot) {
          setTimeout(() => setIsTyping(true), 800);
          setTimeout(async () => {
              const history = chat?.messages.slice(-5).map(m => m.text) || [];
              const reply = await generateNitroBotResponse(history, text);
              await addBotMessage(reply);
          }, 2000);
          return;
      }

      if (recipient && (recipient.status === 'offline' || recipient.id === 'dom')) {
             setTimeout(() => setIsTyping(true), 1000);
             setTimeout(async () => {
                 const reply = await generateOfflineReply(currentUser.name, recipient.name, text);
                 await addBotMessage(reply);
             }, 3500);
      }

    } catch (err) {
      console.error("Message send failed:", err);
    }
  };

  const handleDeleteMessage = async (chatId: string, messageId: string) => {
    if (!currentUser) return;
    
    // Find the message to move to salvage
    const targetChat = chats.find(c => c.id === chatId);
    const targetMsg = targetChat?.messages.find(m => m.id === messageId);

    if (targetMsg) {
        const salvagedMsg = { 
            ...targetMsg, 
            originalChatId: chatId, 
            deletedAt: Date.now() 
        };
        setTrashMessages(prev => [salvagedMsg, ...prev]);
    }

    if (currentUser.id === 'demo-pilot') {
      setChats(prev => prev.map(c => {
        if (c.id === chatId) {
           return { ...c, messages: c.messages.filter(m => m.id !== messageId) };
        }
        return c;
      }));
      if (currentUser.soundEnabled) playUiSound('click', currentUser.soundPack);
      return;
    }

    try {
      await deleteDoc(doc(db, "chats", chatId, "messages", messageId));
      if (currentUser.soundEnabled) playUiSound('click', currentUser.soundPack);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleRestoreMessage = async (messageId: string) => {
    if (!currentUser) return;
    const msgToRestore = trashMessages.find(m => m.id === messageId);
    if (!msgToRestore || !msgToRestore.originalChatId) return;

    if (currentUser.id === 'demo-pilot') {
        setChats(prev => prev.map(c => {
            if (c.id === msgToRestore.originalChatId) {
                return { ...c, messages: [...c.messages, { ...msgToRestore, deletedAt: undefined, originalChatId: undefined }].sort((a,b) => a.timestamp - b.timestamp) };
            }
            return c;
        }));
        setTrashMessages(prev => prev.filter(m => m.id !== messageId));
        if (currentUser.soundEnabled) playUiSound('levelUp', currentUser.soundPack);
    } else {
        try {
            const { deletedAt, originalChatId, ...cleanMsg } = msgToRestore;
            await addDoc(collection(db, "chats", originalChatId, "messages"), { ...cleanMsg });
            setTrashMessages(prev => prev.filter(m => m.id !== messageId));
            if (currentUser.soundEnabled) playUiSound('levelUp', currentUser.soundPack);
        } catch (e) {
            console.error("Restore failed", e);
        }
    }
  };

  const handlePermanentDelete = (messageId: string) => {
    setTrashMessages(prev => prev.filter(m => m.id !== messageId));
    if (currentUser?.soundEnabled) playUiSound('click', currentUser.soundPack);
  };

  const handleEmptySalvage = () => {
      setTrashMessages([]);
      if (currentUser?.soundEnabled) playUiSound('alarm', currentUser.soundPack);
  };

  const handleReactToMessage = async (messageId: string, emoji: string) => {
    if (!selectedChatId || !currentUser) return;

    if (currentUser.id === 'demo-pilot') {
      setChats(prev => prev.map(c => {
        if (c.id === selectedChatId) {
          const updatedMessages = c.messages.map(m => {
            if (m.id === messageId) {
              const reactions = { ...(m.reactions || {}) };
              const currentUsers = reactions[emoji] || [];
              if (currentUsers.includes(currentUser.id)) {
                reactions[emoji] = currentUsers.filter(uid => uid !== currentUser.id);
                if (reactions[emoji].length === 0) delete reactions[emoji];
              } else {
                reactions[emoji] = [...currentUsers, currentUser.id];
              }
              return { ...m, reactions };
            }
            return m;
          });
          return { ...c, messages: updatedMessages };
        }
        return c;
      }));
      return;
    }

    try {
      const msgRef = doc(db, "chats", selectedChatId, "messages", messageId);
      const msgSnap = await getDoc(msgRef);
      if (msgSnap.exists()) {
        const data = msgSnap.data() as Message;
        const reactions = { ...(data.reactions || {}) };
        const currentUsers = reactions[emoji] || [];
        if (currentUsers.includes(currentUser.id)) {
          reactions[emoji] = currentUsers.filter(uid => uid !== currentUser.id);
          if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
          reactions[emoji] = [...currentUsers, currentUser.id];
        }
        await updateDoc(msgRef, { reactions });
      }
    } catch (err) {
      console.error("Reaction failed:", err);
    }
  };

  const handleTogglePinChat = async (chatId: string) => {
      if (!currentUser) return;
      if (currentUser.id === 'demo-pilot') {
          setChats(prev => prev.map(c => c.id === chatId ? { ...c, isPinned: !c.isPinned } : c));
          if (currentUser.soundEnabled) playUiSound('click', currentUser.soundPack);
          return;
      }
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, isPinned: !c.isPinned } : c));
      if (currentUser.soundEnabled) playUiSound('click', currentUser.soundPack);
  };

  const handleTogglePinMessage = async (chatId: string, messageId: string) => {
      if (!currentUser) return;
      
      if (currentUser.id === 'demo-pilot') {
          setChats(prev => prev.map(c => {
              if (c.id === chatId) {
                  return {
                      ...c,
                      messages: c.messages.map(m => m.id === messageId ? { ...m, isPinned: !m.isPinned } : m)
                  };
              }
              return c;
          }));
          if (currentUser.soundEnabled) playUiSound('click', currentUser.soundPack);
          return;
      }

      try {
          const msgRef = doc(db, "chats", chatId, "messages", messageId);
          const msgSnap = await getDoc(msgRef);
          if (msgSnap.exists()) {
              const currentPinned = msgSnap.data().isPinned || false;
              await updateDoc(msgRef, { isPinned: !currentPinned });
              if (currentUser.soundEnabled) playUiSound('click', currentUser.soundPack);
          }
      } catch (err) {
          console.error("Pinning failed:", err);
      }
  };

  const handleToolTrigger = async (tool: string, value?: any) => {
    if (currentUser?.soundEnabled) playUiSound('click', currentUser.soundPack);
    switch(tool) {
        case 'nitro': chatWindowRef.current?.handleNitroBoost(); break;
        case 'translate': chatWindowRef.current?.handleTranslate(); break;
        case 'analyzer': chatWindowRef.current?.handleContextAnalysis(); break;
        case 'timer': chatWindowRef.current?.setIsScheduling(true); break;
        case 'upload': chatWindowRef.current?.triggerFileUpload(); break;
        case 'cockpit': setIsRacerProfileOpen(true); setDashboardTab('stats'); break;
        case 'history': setIsHistoryOpen(true); break;
        case 'mood-scanner': {
            if (!selectedChat) {
                alert("Select a chat to scan mood.");
                break;
            }
            const lastMsg = selectedChat.messages.filter(m => m.senderId !== currentUser?.id).pop();
            if (lastMsg) {
                const result = await analyzeSentimentAndStyle(lastMsg.text);
                setAnalysisResult(result);
                playUiSound('levelUp', currentUser?.soundPack);
            } else {
                alert("No recent messages to analyze.");
            }
            break;
        }
        case 'ai-activation': handleSendMessage("Nitro AI: Core conscious state requested. Monitoring sector...", "text", { isAi: true }); break;
        case 'location': {
            navigator.geolocation.getCurrentPosition(pos => {
                onSendMessage(`[Grid Location Transmitted]: Lat ${pos.coords.latitude.toFixed(4)}, Lng ${pos.coords.longitude.toFixed(4)}`);
            });
            break;
        }
    }
    if (tool !== 'ai-copilot') setIsMoreToolsOpen(false);
  };

  const onSendMessage = (text: string) => handleSendMessage(text);

  if (!isAuthenticated) return <AuthScreen onAuthenticated={() => {}} />;
  if (!currentUser) return <div className="h-screen w-full bg-nitro-black flex items-center justify-center font-orbitron text-nitro-cyan animate-pulse">Initializing Nitro Core...</div>;

  const currentMessages = (selectedChat?.messages || []).filter(m => !m.expiryTimestamp || m.expiryTimestamp > Date.now());

  return (
    <div className={`flex flex-col h-screen w-full overflow-hidden font-inter bg-nitro-black`} style={{ backgroundColor: chatBgColor }}>
      <header className={`px-4 sm:px-6 py-3 flex items-center justify-between z-50 border-b-2 bg-nitro-cyan/10 border-nitro-cyan/40 shadow-lg backdrop-blur-xl`}>
        <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => setIsChatListOpen(true)} className="p-2 rounded-xl border bg-nitro-gray text-nitro-primary border-white/5">
                <ICONS.Menu className="w-5 h-5 sm:w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
                <ICONS.Nitro className="w-7 h-7 sm:w-8 h-8 neon-primary" />
                <h1 className="font-orbitron font-black text-sm sm:text-lg tracking-widest block text-white hidden sm:block">FC ZONE</h1>
            </div>
        </div>

        <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsLocationTracking(!isLocationTracking)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isLocationTracking ? 'bg-nitro-magenta/10 border-nitro-magenta text-nitro-magenta animate-pulse' : 'bg-white/5 border-white/10 text-gray-500'}`}
            >
                <ICONS.Target className="w-4 h-4" />
                {isLocationTracking && (
                    <span className="text-[9px] font-orbitron font-black uppercase whitespace-nowrap">
                        {trackingData ? `${trackingData.dist} // LOCKED` : 'SCANNING...'}
                    </span>
                )}
            </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => { setIsRacerProfileOpen(true); setDashboardTab('engine'); }} className="p-2 rounded-xl border bg-nitro-gray border-white/10 text-nitro-yellow hover:text-white hover:bg-nitro-yellow/20 transition-all shadow-lg" title="Open Garage">
                <ICONS.Garage className="w-5 h-5 sm:w-6 h-6" />
            </button>

             <div className="relative" ref={profileMenuRef}>
                 <button 
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-xl border bg-nitro-gray border-white/10 text-nitro-cyan shadow-lg hover:border-nitro-cyan transition-all relative ${currentUser.status === 'speeding' ? 'ring-2 ring-nitro-magenta ring-opacity-50' : ''}`}
                 >
                    <div className="relative">
                        <img 
                            src={currentUser.avatar} 
                            className="w-6 h-6 rounded-full cursor-pointer" 
                            onClick={(e) => { e.stopPropagation(); setZoomedImage(currentUser.avatar); }}
                        />
                        {currentUser.status === 'speeding' && (
                            <div className="absolute inset-[-2px] border-2 border-nitro-magenta rounded-full animate-ping pointer-events-none"></div>
                        )}
                    </div>
                    <span className="hidden md:block text-[8px] font-orbitron font-black uppercase">{currentUser.name}</span>
                 </button>

                 {isProfileMenuOpen && (
                     <div className="absolute right-0 top-full mt-2 w-48 glass-panel border border-white/10 rounded-2xl shadow-2xl p-2 z-[200] animate-in zoom-in-95 duration-200">
                         <button 
                            onClick={() => { setIsRacerProfileOpen(true); setDashboardTab('stats'); setIsProfileMenuOpen(false); }}
                            className="w-full text-left px-4 py-3 text-[10px] font-orbitron font-black text-gray-300 hover:text-white uppercase hover:bg-white/10 rounded-xl transition-all flex items-center gap-2"
                         >
                             <ICONS.Users className="w-4 h-4 text-nitro-cyan" />
                             My Cockpit
                         </button>
                         <div className="h-[1px] bg-white/5 my-1"></div>
                         
                         <div className="flex justify-between items-center px-4 py-2 hover:bg-white/5 rounded-xl">
                             <span className="text-[10px] font-orbitron font-black text-gray-400 uppercase flex items-center gap-2">
                                 <ICONS.Ghost className="w-4 h-4 text-nitro-magenta" />
                                 Stealth
                             </span>
                             <button 
                                onClick={() => handleUpdateUser({ stealthMode: !currentUser.stealthMode })}
                                className={`w-8 h-4 rounded-full transition-all relative ${currentUser.stealthMode ? 'bg-nitro-magenta' : 'bg-white/10'}`}
                             >
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${currentUser.stealthMode ? 'translate-x-4' : ''}`}></div>
                             </button>
                         </div>

                         <div className="flex justify-between items-center px-4 py-2 hover:bg-white/5 rounded-xl">
                             <span className="text-[10px] font-orbitron font-black text-gray-400 uppercase flex items-center gap-2">
                                 <ICONS.Music className="w-4 h-4 text-nitro-yellow" />
                                 Thrum
                             </span>
                             <button 
                                onClick={handleToggleBackgroundMusic}
                                className={`w-8 h-4 rounded-full transition-all relative ${currentUser.backgroundMusic ? 'bg-nitro-yellow' : 'bg-white/10'}`}
                             >
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${currentUser.backgroundMusic ? 'translate-x-4' : ''}`}></div>
                             </button>
                         </div>

                         <div className="flex justify-between items-center px-4 py-2 hover:bg-white/5 rounded-xl mt-1">
                             <span className="text-[10px] font-orbitron font-black text-gray-400 uppercase flex items-center gap-2">
                                 <ICONS.Nitro className="w-4 h-4 text-nitro-magenta" />
                                 Status
                             </span>
                             <button 
                                onClick={() => handleUpdateUser({ status: currentUser.status === 'speeding' ? 'online' : 'speeding' })}
                                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all ${currentUser.status === 'speeding' ? 'bg-nitro-magenta text-white' : 'bg-white/10 text-gray-500'}`}
                             >
                                {currentUser.status === 'speeding' ? 'SPEEDING' : 'CRUISING'}
                             </button>
                         </div>
                     </div>
                 )}
             </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 flex flex-row h-full overflow-hidden relative">
          {activeTab === 'chats' && selectedChat ? (
            <ChatWindow 
                ref={chatWindowRef}
                chat={{ ...selectedChat, messages: currentMessages }} 
                onSendMessage={handleSendMessage} 
                onReactToMessage={handleReactToMessage}
                onDeleteMessage={handleDeleteMessage} 
                onTogglePinMessage={handleTogglePinMessage}
                onUpdateExpiryDuration={handleUpdateExpiryDuration}
                onScheduleMessage={(txt, time) => {
                    handleSendMessage(`[Auto-Transmission Scheduled: ${new Date(time).toLocaleTimeString()}]`, 'text');
                    setTimeout(() => handleSendMessage(txt, 'text'), time - Date.now());
                }}
                onSetAlert={() => {}}
                onCancelScheduledMessage={() => {}} 
                onUpdateWallpaper={handleUpdateWallpaper}
                customBgColor={chatBgColor}
                bubbleColor={currentUser.bubbleColor} 
                voiceProfile={currentUser.voiceGender || 'male'} 
                autoReadDocs={currentUser.autoReadDocuments || false}
                onToggleAutoRead={() => handleUpdateUser({ autoReadDocuments: !currentUser.autoReadDocuments })}
                stealthMode={currentUser.stealthMode || false}
                onToggleStealthMode={() => handleUpdateUser({ stealthMode: !currentUser.stealthMode })}
                soundEnabled={currentUser.soundEnabled || false}
                onToggleSound={() => handleUpdateUser({ soundEnabled: !currentUser.soundEnabled })}
                onToggleVoice={() => {}}
                onLinkDevice={() => alert("Searching for available Grid Terminals...")}
                onShareZone={() => alert("Generating temporary Sector access link...")}
                onOpenSettings={() => { setIsRacerProfileOpen(true); setDashboardTab('settings'); }}
                userVoiceFilter={currentUser.voiceFilter}
                onUpdateVoiceFilter={(f) => handleUpdateUser({ voiceFilter: f })}
                onOpenCockpit={() => { setIsRacerProfileOpen(true); setDashboardTab('stats'); }}
                autoReadVoice={currentUser.autoReadVoice}
                autoReadText={currentUser.autoReadText}
                isTyping={isTyping}
                isChatbotActive={currentUser.aiCoPilot}
                onToggleChatbot={() => {
                    handleUpdateUser({ aiCoPilot: !currentUser.aiCoPilot });
                    if (currentUser.soundEnabled) playUiSound('click', currentUser.soundPack);
                }}
            />
          ) : activeTab === 'chats' ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 font-orbitron text-xs animate-pulse italic">
                Awaiting mission selection from roster...
            </div>
          ) : activeTab === 'family' ? ( <FamilyView /> ) : activeTab === 'zone' ? ( <ZoneView isLightMode={false} onJoinRoom={() => {}} onJoinChallenge={() => {}} /> ) : activeTab === 'gossip' ? ( <GossipView /> ) : null}
        
          {analysisResult && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-4 w-11/12 max-w-sm">
                  <div className="bg-nitro-black/90 backdrop-blur-xl border border-nitro-magenta/50 rounded-3xl p-5 shadow-[0_0_30px_rgba(255,0,60,0.3)]">
                      <div className="flex justify-between items-start mb-3">
                          <h4 className="font-orbitron font-black text-nitro-magenta uppercase tracking-widest text-xs flex items-center gap-2">
                              <ICONS.Activity className="w-4 h-4" /> Live Analysis
                          </h4>
                          <button onClick={() => setAnalysisResult(null)} className="text-gray-500 hover:text-white">✕</button>
                      </div>
                      <div className="space-y-2">
                          <div className="flex justify-between border-b border-white/10 pb-1">
                              <span className="text-[10px] text-gray-400 font-bold uppercase">Detected Mood</span>
                              <span className="text-[10px] text-white font-orbitron">{analysisResult.mood}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/10 pb-1">
                              <span className="text-[10px] text-gray-400 font-bold uppercase">Typing Style</span>
                              <span className="text-[10px] text-white font-orbitron">{analysisResult.style}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-[10px] text-gray-400 font-bold uppercase">Intent</span>
                              <span className="text-[10px] text-nitro-cyan font-orbitron">{analysisResult.intent}</span>
                          </div>
                      </div>
                  </div>
              </div>
          )}
        </main>

        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isChatListOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsChatListOpen(false)} />
        <div className={`fixed top-0 left-0 h-full w-full sm:w-80 border-r transition-transform duration-500 z-[101] flex flex-col shadow-2xl bg-nitro-black border-nitro-gray ${isChatListOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-nitro-primary/5">
             <h3 className="font-orbitron font-black text-nitro-cyan tracking-widest text-xs uppercase">Active Roster</h3>
             <button onClick={() => setIsChatListOpen(false)} className="p-2 text-white">✕</button>
          </div>
          <ChatList 
            chats={chats} 
            selectedChatId={selectedChatId} 
            onSelectChat={handleSelectChat} 
            onTogglePin={handleTogglePinChat}
            currentUser={currentUser}
            onViewImage={setZoomedImage}
          />
        </div>

        <Dashboard 
            user={currentUser} 
            isOpen={isRacerProfileOpen} 
            onClose={() => setIsRacerProfileOpen(false)} 
            isLightMode={false} 
            onUpdateUser={handleUpdateUser}
            onUpgrade={() => { setIsRacerProfileOpen(false); setIsSubscriptionOpen(true); }}
            activeTab={dashboardTab}
            salvagedMessages={trashMessages}
            onRestoreMessage={handleRestoreMessage}
            onPermanentDelete={handlePermanentDelete}
            onEmptySalvage={handleEmptySalvage}
        />

        {isHistoryOpen && <CallHistoryModal onClose={() => setIsHistoryOpen(false)} />}
        {isSubscriptionOpen && <SubscriptionModal onClose={() => setIsSubscriptionOpen(false)} />}
        
        {zoomedImage && (
            <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200" onClick={() => setZoomedImage(null)}>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <div className="absolute inset-0 bg-nitro-cyan/20 blur-xl rounded-full"></div>
                    <img 
                        src={zoomedImage} 
                        className="w-48 h-48 rounded-full border-4 border-nitro-cyan shadow-[0_0_50px_rgba(0,243,255,0.4)] object-cover relative z-10 animate-in zoom-in-50 duration-300" 
                    />
                    {currentUser?.status === 'speeding' && zoomedImage === currentUser.avatar && (
                        <div className="absolute inset-[-10px] border-4 border-nitro-magenta/50 rounded-full animate-ping z-0 pointer-events-none"></div>
                    )}
                </div>
                <button onClick={() => setZoomedImage(null)} className="absolute top-10 right-10 text-white hover:text-nitro-cyan p-4">✕</button>
            </div>
        )}

        {isMoreToolsOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-nitro-black/95 backdrop-blur-2xl animate-in zoom-in-95 duration-300">
                <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto hide-scrollbar bg-nitro-gray/50 border border-nitro-primary/20 rounded-[48px] p-8 shadow-2xl">
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-3">
                            <ICONS.Tuning className="w-8 h-8 text-nitro-cyan neon-primary" />
                            <h2 className="font-orbitron font-black text-2xl text-white uppercase italic tracking-tighter">Nitro <span className="text-nitro-cyan">Protocols</span></h2>
                        </div>
                        <button onClick={() => setIsMoreToolsOpen(false)} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-gray-500 hover:text-white transition-all">✕</button>
                    </div>

                    <div className="space-y-10">
                        <div className="bg-white/5 p-4 rounded-3xl border border-white/5 mb-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-nitro-magenta/20 rounded-full text-nitro-magenta"><ICONS.Ai className="w-5 h-5" /></div>
                                    <div>
                                        <h4 className="font-orbitron font-black text-white uppercase text-sm">Nitro AI Co-Pilot</h4>
                                        <p className="text-[10px] text-gray-500">Auto-reply & strategic race insights.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleToolTrigger('ai-copilot')} 
                                    className={`w-10 h-5 rounded-full transition-all relative ${currentUser.aiCoPilot ? 'bg-nitro-magenta' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${currentUser.aiCoPilot ? 'translate-x-5' : ''}`}></div>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {[
                                { id: 'nitro', label: 'Nitro Boost', icon: <ICONS.Nitro />, color: 'text-nitro-magenta', bg: 'hover:bg-nitro-magenta/10' },
                                { id: 'translate', label: 'Translator', icon: <ICONS.Translate />, color: 'text-nitro-cyan', bg: 'hover:bg-nitro-cyan/10' },
                                { id: 'analyzer', label: 'Context Intel', icon: <ICONS.Activity />, color: 'text-nitro-yellow', bg: 'hover:bg-nitro-yellow/10' },
                                { id: 'timer', label: 'Auto-Send', icon: <ICONS.Clock />, color: 'text-nitro-green', bg: 'hover:bg-nitro-green/10' },
                                { id: 'upload', label: 'Encrypted Upload', icon: <ICONS.File />, color: 'text-gray-300', bg: 'hover:bg-white/10' },
                                { id: 'cockpit', label: 'My Cockpit', icon: <ICONS.Users />, color: 'text-white', bg: 'hover:bg-white/5' },
                                { id: 'history', label: 'Comms Log', icon: <ICONS.History />, color: 'text-gray-400', bg: 'hover:bg-white/5' },
                                { id: 'mood-scanner', label: 'Vibe Scan', icon: <ICONS.Eye />, color: 'text-nitro-magenta', bg: 'hover:bg-nitro-magenta/10' },
                                { id: 'location', label: 'Ping Location', icon: <ICONS.Target />, color: 'text-nitro-cyan', bg: 'hover:bg-nitro-cyan/10' },
                                { id: 'ai-activation', label: 'Wake AI', icon: <ICONS.Ai />, color: 'text-white', bg: 'hover:bg-white/10' },
                            ].map(tool => (
                                <button 
                                    key={tool.id}
                                    onClick={() => handleToolTrigger(tool.id)}
                                    className={`flex flex-col items-center justify-center p-6 bg-white/5 border border-white/5 rounded-3xl transition-all ${tool.bg} hover:border-white/20 group`}
                                >
                                    <div className={`mb-3 ${tool.color} transition-transform group-hover:scale-110`}>
                                        {React.cloneElement(tool.icon as React.ReactElement, { className: "w-6 h-6" })}
                                    </div>
                                    <span className="text-[9px] font-orbitron font-black uppercase text-gray-300 group-hover:text-white tracking-wider">{tool.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>

      <nav className={`px-2 py-2 flex justify-around items-center border-t-2 z-50 bg-nitro-black border-nitro-gray`}>
        {[
          { id: 'chats', icon: ICONS.Send, label: 'Comms' },
          { id: 'family', icon: ICONS.Family, label: 'Crew' },
          { id: 'zone', icon: ICONS.Globe, label: 'Zone' },
          { id: 'gossip', icon: ICONS.Gossip, label: 'Intel' },
          { id: 'tools', icon: ICONS.Apps, label: 'Protocols' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { 
                if (tab.id === 'tools') {
                    setIsMoreToolsOpen(true);
                } else {
                    setActiveTab(tab.id as any); 
                }
                if (currentUser?.soundEnabled) playUiSound('click', currentUser.soundPack); 
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all w-16 ${activeTab === tab.id ? 'text-nitro-cyan bg-nitro-cyan/10' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <tab.icon className={`w-5 h-5 ${activeTab === tab.id || (tab.id === 'tools' && isMoreToolsOpen) ? 'animate-pulse' : ''}`} />
            <span className="text-[8px] font-orbitron font-black uppercase tracking-wider">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
