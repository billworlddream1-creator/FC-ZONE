
import React, { useState, useEffect, useRef } from 'react';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import Dashboard from './components/Dashboard';
import AuthScreen from './components/AuthScreen';
import ZoneView from './components/ZoneView';
import FamilyView from './components/FamilyView';
import GossipView from './components/GossipView';
import { INITIAL_CHATS, CURRENT_USER, ICONS, MOCK_ROOMS, MOCK_CHALLENGES } from './constants';
import { Chat, Message, ChatType, ScheduledMessage, AlertReminder, VoiceProfile, User, Room, RaceChallenge, ExpiryDuration, VoiceFilter } from './types';
import { speakText, playUiSound } from './services/audioService';
import { nitroAssistantQuery } from './services/geminiService';

const EXPIRY_MAP: Record<string, number> = {
  '24h': 1000 * 60 * 60 * 24,
  '1w': 1000 * 60 * 60 * 24 * 7,
  '1m': 1000 * 60 * 60 * 24 * 30,
};

const App: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(INITIAL_CHATS[0].id);
  const [activeTab, setActiveTab] = useState<'chats' | 'family' | 'zone' | 'gossip' | 'settings'>('chats');
  const [isRedTheme, setIsRedTheme] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [isRacerProfileOpen, setIsRacerProfileOpen] = useState(false);
  const [isChatListOpen, setIsChatListOpen] = useState(false);
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile>('off');
  const [chatBgColor, setChatBgColor] = useState('#0a192f');
  const [currentUser, setCurrentUser] = useState<User>({
    ...CURRENT_USER,
    voiceFilter: { pitch: 1.0, echo: 0, reverb: 0 },
    voicePresets: { 'Default': { pitch: 1.0, echo: 0, reverb: 0 }, 'Nitro': { pitch: 1.5, echo: 0.2, reverb: 0.1 } }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [location, setLocation] = useState({ lat: 35.6895, lng: 139.6917, sector: 'SHIBUYA_DRIFT' });
  
  const [globalAlert, setGlobalAlert] = useState<{ topic: string, type: 'message' | 'reminder' } | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const selectedChat = chats.find(c => c.id === selectedChatId) || chats[0];

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    if (isRedTheme) body.classList.add('theme-red'); else body.classList.remove('theme-red');
    if (isLightMode) { html.classList.add('light'); html.classList.remove('dark'); } else { html.classList.remove('light'); html.classList.add('dark'); }
  }, [isRedTheme, isLightMode]);

  useEffect(() => {
    const interval = setInterval(() => {
        const now = Date.now();
        
        // Auto AI Response if silent for 45 seconds
        if (isAuthenticated && (now - lastActivityRef.current > 45000) && selectedChat) {
          lastActivityRef.current = now; // Reset timer
          handleSendMessage("Nitro AI Check: The sector is silent. Any race updates for the team?", 'text');
        }

        setChats(prevChats => prevChats.map(chat => {
            let updated = false;
            let messages = chat.messages;
            let scheduledMessages = chat.scheduledMessages || [];
            let alertReminders = chat.alertReminders || [];

            const validMessages = messages.filter(m => !m.expiryTimestamp || m.expiryTimestamp > now);
            if (validMessages.length !== messages.length) {
                messages = validMessages;
                updated = true;
            }

            const messagesToSend = scheduledMessages.filter(m => m.scheduledFor <= now);
            if (messagesToSend.length > 0) {
                const processed = messagesToSend.map(m => ({ 
                    ...m, 
                    status: 'sent' as const, 
                    timestamp: now, 
                    id: `sent-${m.id}-${now}`,
                    expiryTimestamp: chat.expiryDuration && chat.expiryDuration !== 'off' ? now + EXPIRY_MAP[chat.expiryDuration] : undefined
                }));
                messages = [...messages, ...processed];
                scheduledMessages = scheduledMessages.filter(m => m.scheduledFor > now);
                if (currentUser.soundEnabled) playUiSound('alarm');
                setGlobalAlert({ topic: "Injection Successful", type: 'message' });
                updated = true;
            }

            const activeAlerts = alertReminders.filter(a => a.scheduledFor <= now);
            if (activeAlerts.length > 0) {
                const lastAlert = activeAlerts[activeAlerts.length - 1];
                alertReminders = alertReminders.filter(a => a.scheduledFor > now);
                if (currentUser.soundEnabled) playUiSound('alarm');
                setGlobalAlert({ topic: lastAlert.topic, type: 'reminder' });
                updated = true;
            }

            if (updated) {
              return { ...chat, messages, scheduledMessages, alertReminders, timestamp: now };
            }
            return chat;
        }));

        // Mock movement
        setLocation(prev => ({ ...prev, lat: prev.lat + (Math.random() * 0.0001 - 0.00005), lng: prev.lng + (Math.random() * 0.0001 - 0.00005) }));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentUser.soundEnabled, isAuthenticated, selectedChatId]);

  const handleAuthenticated = (userData: Partial<User>) => {
    setCurrentUser(prev => ({
      ...prev,
      ...userData,
      id: 'me',
      points: 100,
      xp: 0,
      level: 1,
      badge: 'Rookie Racer',
      status: 'online',
      autoReadDocuments: false,
      stealthMode: false,
      soundEnabled: true,
      bubbleColor: '#1e3a8a',
      lowBandwidthMode: false,
      avatar: `https://picsum.photos/seed/${userData.name}/200`,
      voiceFilter: { pitch: 1.0, echo: 0, reverb: 0 },
      voicePresets: { 'Default': { pitch: 1.0, echo: 0, reverb: 0 } }
    }));
    setIsAuthenticated(true);
    if (voiceProfile !== 'off') speakText(`Welcome to the grid, ${userData.name}.`, voiceProfile, currentUser.voiceFilter);
  };

  const handleSendMessage = async (text: string, type: 'text' | 'file' | 'image' = 'text', fileData?: any) => {
    if (!selectedChatId) return;
    lastActivityRef.current = Date.now();

    const expiryTime = selectedChat.expiryDuration && selectedChat.expiryDuration !== 'off' ? Date.now() + EXPIRY_MAP[selectedChat.expiryDuration] : undefined;
    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: currentUser.id,
      senderName: currentUser.name,
      text,
      timestamp: Date.now(),
      type: type as any,
      status: 'sent',
      fileData: fileData,
      expiryTimestamp: expiryTime
    };

    setChats(prev => prev.map(chat => chat.id === selectedChatId ? { ...chat, messages: [...chat.messages, newMessage], lastMessage: text, timestamp: Date.now() } : chat));
    setCurrentUser(prev => ({ ...prev, xp: prev.xp + 5, points: prev.points + 5 }));

    if (type === 'text' && (selectedChat.participants.length <= 1 || selectedChat.participants.some(p => p.status === 'offline'))) {
        setTimeout(async () => {
            const aiResponseText = await nitroAssistantQuery(`User sent: "${text}". Give a quick, racing response.`);
            const aiMessage: Message = {
                id: Math.random().toString(36).substr(2, 9),
                senderId: 'nitro-ai',
                senderName: 'Nitro AI',
                text: aiResponseText,
                timestamp: Date.now(),
                type: 'text',
                status: 'sent',
                isAi: true,
                expiryTimestamp: expiryTime
            };
            setChats(prev => prev.map(chat => chat.id === selectedChatId ? { ...chat, messages: [...chat.messages, aiMessage], lastMessage: aiResponseText, timestamp: Date.now() } : chat));
        }, 1500);
    }
  };

  const handleDeleteMessage = (chatId: string, messageId: string) => {
    setChats(prev => prev.map(chat => chat.id === chatId ? { ...chat, messages: chat.messages.filter(m => m.id !== messageId) } : chat));
    if (currentUser.soundEnabled) playUiSound('click');
  };

  const handleTogglePinMessage = (chatId: string, messageId: string) => {
    setChats(prev => prev.map(chat => chat.id === chatId ? { ...chat, messages: chat.messages.map(m => m.id === messageId ? { ...m, isPinned: !m.isPinned } : m) } : chat));
    if (currentUser.soundEnabled) playUiSound('click');
  };

  const handleUpdateExpiryDuration = (chatId: string, duration: ExpiryDuration) => {
    setChats(prev => prev.map(chat => chat.id === chatId ? { ...chat, expiryDuration: duration } : chat));
    if (currentUser.soundEnabled) playUiSound('click');
  };

  const handleScheduleMessage = (text: string, deliveryTime: number) => {
    if (!selectedChatId) return;
    const newScheduledMessage: ScheduledMessage = { id: Math.random().toString(36).substr(2, 9), senderId: currentUser.id, senderName: currentUser.name, text, timestamp: Date.now(), type: 'text', status: 'sent', scheduledFor: deliveryTime };
    setChats(prev => prev.map(chat => chat.id === selectedChatId ? { ...chat, scheduledMessages: [...(chat.scheduledMessages || []), newScheduledMessage] } : chat));
    if (currentUser.soundEnabled) playUiSound('click');
  };

  const handleSetAlert = (topic: string, deliveryTime: number) => {
    if (!selectedChatId) return;
    const newAlert: AlertReminder = { id: Math.random().toString(36).substr(2, 9), chatId: selectedChatId, topic, scheduledFor: deliveryTime };
    setChats(prev => prev.map(chat => chat.id === selectedChatId ? { ...chat, alertReminders: [...(chat.alertReminders || []), newAlert] } : chat));
    if (currentUser.soundEnabled) playUiSound('click');
  };

  const handleCancelScheduledMessage = (chatId: string, messageId: string) => {
    setChats(prev => prev.map(chat => chat.id === chatId ? { ...chat, scheduledMessages: (chat.scheduledMessages || []).filter(m => m.id !== messageId), alertReminders: (chat.alertReminders || []).filter(a => a.id !== messageId) } : chat));
  };

  const handleUpdateWallpaper = (chatId: string, wallpaper: string) => {
    setChats(prev => prev.map(chat => (chat.id === chatId ? { ...chat, wallpaper } : chat)));
  };

  const handleSelectChat = (id: string) => {
    if (currentUser.soundEnabled) playUiSound('click');
    setSelectedChatId(id);
    setIsChatListOpen(false);
    setActiveTab('chats');
  };

  const handleJoinRoom = (room: Room) => {
    if (currentUser.soundEnabled) playUiSound('click');
    const newRoomChat: Chat = { id: room.id, name: room.name, type: ChatType.GROUP, lastMessage: `Joined the room: ${room.topic}`, timestamp: Date.now(), unreadCount: 0, avatar: `https://picsum.photos/seed/room-${room.id}/200`, participants: [currentUser], messages: [], scheduledMessages: [], alertReminders: [], isTyping: false };
    setChats(prev => [newRoomChat, ...prev]);
    setSelectedChatId(room.id);
    setActiveTab('chats');
  };

  const handleJoinChallenge = (challenge: RaceChallenge) => {
    if (currentUser.soundEnabled) playUiSound('levelUp');
    alert(`RACE INITIATED: ${challenge.title}.`);
  };

  const handleToggleVoice = () => {
    const profiles: VoiceProfile[] = ['off', 'male', 'female'];
    const currentIdx = profiles.indexOf(voiceProfile);
    const nextIdx = (currentIdx + 1) % profiles.length;
    setVoiceProfile(profiles[nextIdx]);
    if (currentUser.soundEnabled) playUiSound('click');
  };

  const handleToggleSound = () => {
    const next = !currentUser.soundEnabled;
    setCurrentUser(prev => ({ ...prev, soundEnabled: next }));
    if (next) playUiSound('click');
  };

  const handleLinkDevice = () => { if (currentUser.soundEnabled) playUiSound('click'); alert("Grid Sync established."); };
  const handleShareZone = () => { if (currentUser.soundEnabled) playUiSound('click'); alert("Sector link copied."); };

  if (!isAuthenticated) return <AuthScreen onAuthenticated={handleAuthenticated} />;

  return (
    <div className={`flex flex-col h-screen w-full overflow-hidden font-inter transition-colors duration-500 bg-nitro-black`}>
      <header className={`px-4 sm:px-6 py-3 flex items-center justify-between z-50 border-b-2 transition-all duration-500 backdrop-blur-xl ${isRedTheme ? 'bg-nitro-magenta/10 border-nitro-magenta/40' : 'bg-nitro-cyan/10 border-nitro-cyan/40'} shadow-lg`}>
        <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => { if (currentUser.soundEnabled) playUiSound('click'); setIsChatListOpen(true); }} className="p-2 rounded-xl border transition-all hover:scale-110 active:scale-95 bg-nitro-gray text-nitro-primary">
                <ICONS.Menu className="w-5 h-5 sm:w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
                <ICONS.Nitro className="w-7 h-7 sm:w-8 h-8 neon-primary" />
                <h1 className="font-orbitron font-black text-sm sm:text-lg tracking-widest block text-white">FC ZONE</h1>
            </div>
        </div>

        {/* Permanent Location Tracker */}
        <div className="hidden md:flex items-center gap-4 bg-nitro-gray/40 border border-white/5 px-4 py-1.5 rounded-2xl">
            <div className="flex flex-col items-center">
                <ICONS.Map className="w-4 h-4 text-nitro-cyan animate-pulse" />
            </div>
            <div className="flex flex-col">
                <span className="text-[7px] font-orbitron font-black text-nitro-cyan uppercase tracking-widest">{location.sector}</span>
                <span className="text-[8px] font-mono text-gray-500">{location.lat.toFixed(4)}°N, {location.lng.toFixed(4)}°E</span>
            </div>
        </div>

        <div className="flex items-center gap-4">
             <button onClick={() => { if (currentUser.soundEnabled) playUiSound('click'); setIsRacerProfileOpen(true); }} className="flex items-center gap-2 px-2 py-1.5 rounded-xl border bg-nitro-gray border-white/10 text-nitro-cyan shadow-lg hover:border-nitro-cyan/50 transition-all">
                <img src={currentUser.avatar} className="w-6 h-6 rounded-full" />
                <div className="hidden md:block text-left leading-none">
                    <span className="text-[8px] font-orbitron font-black uppercase">{currentUser.name}</span>
                </div>
             </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 flex flex-row h-full overflow-hidden">
          {activeTab === 'chats' ? (
            <ChatWindow 
                chat={selectedChat} 
                onSendMessage={handleSendMessage} 
                onDeleteMessage={handleDeleteMessage}
                onTogglePinMessage={handleTogglePinMessage}
                onUpdateExpiryDuration={handleUpdateExpiryDuration}
                onScheduleMessage={handleScheduleMessage}
                onSetAlert={handleSetAlert}
                onCancelScheduledMessage={handleCancelScheduledMessage} 
                onUpdateWallpaper={handleUpdateWallpaper}
                customBgColor={chatBgColor} 
                bubbleColor={currentUser.bubbleColor}
                voiceProfile={voiceProfile} 
                autoReadDocs={currentUser.autoReadDocuments || false}
                onToggleAutoRead={() => setCurrentUser(prev => ({...prev, autoReadDocuments: !prev.autoReadDocuments}))}
                stealthMode={currentUser.stealthMode || false}
                onToggleStealthMode={() => setCurrentUser(prev => ({...prev, stealthMode: !prev.stealthMode}))}
                soundEnabled={currentUser.soundEnabled || false}
                onToggleSound={handleToggleSound}
                onToggleVoice={handleToggleVoice}
                onLinkDevice={handleLinkDevice}
                onShareZone={handleShareZone}
                onOpenSettings={() => setActiveTab('settings')} 
                onOpenCockpit={() => setIsRacerProfileOpen(true)}
                isTyping={selectedChat.isTyping} 
                userVoiceFilter={currentUser.voiceFilter}
                onUpdateVoiceFilter={(f) => setCurrentUser(prev => ({ ...prev, voiceFilter: f }))}
            />
          ) : activeTab === 'family' ? ( <FamilyView /> ) : activeTab === 'zone' ? ( <ZoneView isLightMode={isLightMode} onJoinRoom={handleJoinRoom} onJoinChallenge={handleJoinChallenge} /> ) : activeTab === 'gossip' ? ( <GossipView /> ) : activeTab === 'settings' ? (
            <div className="flex-1 p-8 overflow-y-auto">
               <h2 className="font-orbitron text-3xl font-black neon-primary mb-8 uppercase italic">Garage Control</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="glass-panel p-6 rounded-3xl space-y-4 border border-white/5">
                        <h3 className="font-orbitron text-[10px] text-nitro-cyan uppercase font-black tracking-widest">Dashboard Skin</h3>
                        <input type="color" value={chatBgColor} onChange={(e) => setChatBgColor(e.target.value)} className="w-full h-12 rounded-lg bg-transparent cursor-pointer" />
                   </div>
                   <div className="glass-panel p-6 rounded-3xl space-y-4 border border-white/5">
                        <h3 className="font-orbitron text-[10px] text-nitro-cyan uppercase font-black tracking-widest">Voice Pilot</h3>
                        <div className="flex gap-2">
                            {['off', 'male', 'female'].map(p => (
                                <button key={p} onClick={() => setVoiceProfile(p as any)} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase ${voiceProfile === p ? 'bg-nitro-primary text-nitro-black' : 'bg-white/5 text-gray-500'}`}>{p}</button>
                            ))}
                        </div>
                   </div>
               </div>
            </div>
          ) : null}
        </main>

        <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isChatListOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsChatListOpen(false)} />
        <div className={`fixed top-0 left-0 h-full w-full sm:w-80 border-r transition-transform duration-500 z-[101] flex flex-col shadow-2xl bg-nitro-black border-nitro-gray ${isChatListOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-nitro-primary/5">
             <h3 className="font-orbitron font-black text-nitro-cyan tracking-widest text-xs uppercase">Active Roster</h3>
             <button onClick={() => setIsChatListOpen(false)} className="p-2 text-white">✕</button>
          </div>
          <ChatList chats={chats} selectedChatId={selectedChatId} onSelectChat={handleSelectChat} />
        </div>

        <Dashboard user={currentUser} isOpen={isRacerProfileOpen} onClose={() => setIsRacerProfileOpen(false)} isLightMode={isLightMode} onUpdateUser={(data) => setCurrentUser(prev => ({...prev, ...data}))} />
      </div>

      <nav className={`h-20 flex items-center justify-center gap-2 px-4 z-[70] backdrop-blur-2xl border-t-2 transition-all duration-500 ${isRedTheme ? 'bg-nitro-magenta/10 border-nitro-magenta/40' : 'bg-nitro-cyan/10 border-nitro-cyan/40'} shadow-lg`}>
        {[
          { id: 'chats', icon: <ICONS.Send className="w-5 h-5 sm:w-6 h-6" />, label: 'Chats' },
          { id: 'family', icon: <ICONS.Family className="w-5 h-5 sm:w-6 h-6" />, label: 'Family' },
          { id: 'zone', icon: <ICONS.Trophy className="w-5 h-5 sm:w-6 h-6" />, label: 'Zone' },
          { id: 'gossip', icon: <ICONS.Gossip className="w-5 h-5 sm:w-6 h-6" />, label: 'Gossip' },
          { id: 'settings', icon: <ICONS.Settings className="w-5 h-5 sm:w-6 h-6" />, label: 'Control' },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-1 p-2 min-w-[50px] transition-all ${activeTab === tab.id ? 'neon-primary scale-110' : 'text-gray-500 hover:text-gray-300'}`}>
            {tab.icon}
            <span className={`text-[8px] font-orbitron font-black uppercase transition-all duration-300 ${activeTab === tab.id ? 'opacity-100' : 'opacity-0'}`}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
