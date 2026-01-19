
import React, { useState, useEffect, useRef } from 'react';
import { Chat, Message, User, ScheduledMessage, AlertReminder, VoiceProfile, ExpiryDuration, VoiceFilter } from '../types';
import { ICONS, CURRENT_USER } from '../constants';
import { generateSmartReplies, nitroAssistantQuery, translateMessage, analyzeDocument, searchGifs, searchEmojis, getContextIntelligence, summarizeChat, analyzeRacerMood } from '../services/geminiService';
import { speakText, playUiSound } from '../services/audioService';
import CallOverlay from './CallOverlay';

interface ChatWindowProps {
  chat: Chat;
  onSendMessage: (text: string, type?: 'text' | 'file' | 'image', fileData?: any) => void;
  onDeleteMessage: (chatId: string, messageId: string) => void;
  onTogglePinMessage: (chatId: string, messageId: string) => void;
  onUpdateExpiryDuration: (chatId: string, duration: ExpiryDuration) => void;
  onScheduleMessage: (text: string, deliveryTime: number) => void;
  onSetAlert: (topic: string, deliveryTime: number) => void;
  onCancelScheduledMessage: (chatId: string, messageId: string) => void;
  onUpdateWallpaper: (chatId: string, wallpaper: string) => void;
  customBgColor?: string;
  bubbleColor?: string;
  lowBandwidthMode?: boolean;
  voiceProfile: VoiceProfile;
  autoReadDocs: boolean;
  onToggleAutoRead: () => void;
  stealthMode: boolean;
  onToggleStealthMode: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onToggleVoice: () => void;
  onLinkDevice: () => void;
  onShareZone: () => void;
  onOpenSettings?: () => void;
  onOpenCockpit?: () => void;
  isTyping?: boolean;
  userVoiceFilter: VoiceFilter;
  onUpdateVoiceFilter: (f: VoiceFilter) => void;
}

const PLACEHOLDERS = ["What is on your mind?", "Let's race!", "Engage Nitro Comms...", "Ready to drift?"];

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  chat, onSendMessage, onDeleteMessage, onTogglePinMessage, onUpdateExpiryDuration, onScheduleMessage, onSetAlert, onCancelScheduledMessage, onUpdateWallpaper,
  customBgColor = '#0a192f', bubbleColor = '#1e3a8a', lowBandwidthMode = false, voiceProfile, autoReadDocs, onToggleAutoRead, stealthMode, onToggleStealthMode,
  soundEnabled, onToggleSound, onToggleVoice, onLinkDevice, onShareZone, onOpenSettings, onOpenCockpit, isTyping = false, userVoiceFilter, onUpdateVoiceFilter
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [injectionType, setInjectionType] = useState<'message' | 'alert'>('message');
  const [scheduleTime, setScheduleTime] = useState('');
  const [alertTopic, setAlertTopic] = useState('');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isHubMenuOpen, setIsHubMenuOpen] = useState(false);
  const [isVoiceTuningOpen, setIsVoiceTuningOpen] = useState(false);
  const [isNitroEffect, setIsNitroEffect] = useState(false);
  const [activeAnimation, setActiveAnimation] = useState<'none' | 'drift' | 'nitro'>('none');
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [intelReport, setIntelReport] = useState<{ title: string, content: string } | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRacerOnline = chat.participants.some(p => p.id !== CURRENT_USER.id && p.status === 'online');

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.command-hub-container') || target.closest('.tuning-hub-container') || target.closest('.voice-tuning-menu')) return;
      setIsMoreMenuOpen(false);
      setIsHubMenuOpen(false);
      setIsVoiceTuningOpen(false);
      if (!target.closest('.message-bubble')) setSelectedMessageId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat.messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    if (soundEnabled) playUiSound('send');
    setInputValue('');
  };

  const handleDownloadFile = (msg: Message) => {
    if (msg.fileData) {
      const blob = new Blob([msg.fileData.content || ''], { type: msg.fileData.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = msg.fileData.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (soundEnabled) playUiSound('click');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        onSendMessage(`[Voice Packet: ${recordingTime}s]`, 'file', { name: `VOICE_${Date.now()}.webm`, size: blob.size, mimeType: blob.type });
        setRecordingTime(0);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setIsRecording(true);
      recordingIntervalRef.current = window.setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) { alert("Mic access denied."); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  return (
    <div className={`flex flex-col h-full relative overflow-hidden flex-1 transition-all duration-700 ${isNitroEffect ? 'animate-nitro-shake ring-4 ring-nitro-magenta ring-inset' : ''}`} style={{ backgroundColor: customBgColor }}>
      <CallOverlay isOpen={isCallOpen} onClose={() => setIsCallOpen(false)} userName={chat.name} />

      {/* HEADER */}
      <div className="glass-panel px-6 py-4 flex items-center justify-between z-10 border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src={chat.avatar} alt={chat.name} className="w-10 h-10 rounded-full border border-nitro-primary" />
          <div>
            <h2 className="font-orbitron font-bold text-sm text-white">{chat.name}</h2>
            <p className={`text-[10px] font-medium uppercase tracking-widest ${isRacerOnline ? 'text-nitro-green animate-pulse' : 'text-gray-500'}`}>
              {isRacerOnline ? 'Racer Online' : 'Racer Offline'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-gray-400 relative">
          <div className="relative">
            <button onClick={() => { onToggleVoice(); setIsVoiceTuningOpen(!isVoiceTuningOpen); }} className={`p-2 rounded-xl transition-all ${voiceProfile !== 'off' ? 'text-nitro-cyan bg-nitro-cyan/10 shadow-[0_0_10px_rgba(0,243,255,0.3)]' : 'hover:text-white'}`}>
              <ICONS.Mic className="w-5 h-5" />
            </button>
            {isVoiceTuningOpen && voiceProfile !== 'off' && (
              <div className="voice-tuning-menu absolute top-full mt-4 right-0 w-64 glass-panel border border-nitro-cyan/30 rounded-[32px] p-6 shadow-2xl z-[200] animate-in slide-in-from-top-2">
                <h4 className="font-orbitron text-[9px] font-black text-nitro-cyan uppercase tracking-widest mb-4 italic">Audio Fine Tuning</h4>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-[8px] text-gray-400 uppercase font-black">Pitch</span><span className="text-[8px] text-nitro-cyan font-mono">{userVoiceFilter.pitch}x</span></div>
                    <input type="range" min="0.5" max="2.0" step="0.1" value={userVoiceFilter.pitch} onChange={(e) => onUpdateVoiceFilter({ ...userVoiceFilter, pitch: parseFloat(e.target.value) })} className="w-full accent-nitro-cyan h-1" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-[8px] text-gray-400 uppercase font-black">Echo Depth</span><span className="text-[8px] text-nitro-cyan font-mono">{Math.round(userVoiceFilter.echo * 100)}%</span></div>
                    <input type="range" min="0" max="1" step="0.1" value={userVoiceFilter.echo} onChange={(e) => onUpdateVoiceFilter({ ...userVoiceFilter, echo: parseFloat(e.target.value) })} className="w-full accent-nitro-cyan h-1" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-[8px] text-gray-400 uppercase font-black">Reverb</span><span className="text-[8px] text-nitro-cyan font-mono">{Math.round(userVoiceFilter.reverb * 100)}%</span></div>
                    <input type="range" min="0" max="1" step="0.1" value={userVoiceFilter.reverb} onChange={(e) => onUpdateVoiceFilter({ ...userVoiceFilter, reverb: parseFloat(e.target.value) })} className="w-full accent-nitro-cyan h-1" />
                  </div>
                </div>
              </div>
            )}
          </div>
          <button onClick={onToggleSound} className={`p-2 rounded-xl transition-all ${soundEnabled ? 'text-nitro-yellow' : 'text-gray-600'}`}>
            {soundEnabled ? <ICONS.Volume className="w-5 h-5" /> : <ICONS.VolumeX className="w-5 h-5" />}
          </button>
          <button onClick={() => setIsCallOpen(true)} className="hover:neon-primary p-2 transition-colors"><ICONS.Phone className="w-5 h-5" /></button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMoreMenuOpen(!isMoreMenuOpen); }} 
            className={`more-trigger-btn p-2 rounded-xl transition-all ${isMoreMenuOpen ? 'bg-nitro-primary text-nitro-black' : 'hover:neon-primary'}`}
          >
            <ICONS.More className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar scroll-smooth relative">
        {chat.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderId === CURRENT_USER.id ? 'justify-end' : 'justify-start'}`}>
            <div 
              onClick={() => setSelectedMessageId(msg.id)}
              className={`message-bubble max-w-[75%] rounded-2xl p-3 px-4 shadow-xl relative overflow-hidden transition-all duration-300 ${msg.senderId === CURRENT_USER.id ? 'bg-nitro-primary/10 text-white rounded-br-none border border-nitro-primary/20' : 'bg-nitro-black/60 backdrop-blur-lg border border-white/10 text-gray-200 rounded-bl-none'}`}
            >
              {msg.type === 'file' && (
                <div className="flex items-center gap-3 p-2 bg-black/30 rounded-xl mb-1">
                  <ICONS.File className="w-6 h-6 text-nitro-cyan" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-white truncate">{msg.fileData?.name}</p>
                    <p className="text-[8px] text-gray-500">{(msg.fileData?.size || 0 / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={() => handleDownloadFile(msg)} className="p-2 bg-nitro-cyan/10 text-nitro-cyan rounded-lg hover:bg-nitro-cyan hover:text-nitro-black transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </button>
                </div>
              )}
              <p className="text-sm leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* INPUT AREA */}
      <div className="p-3 border-t border-nitro-gray glass-panel relative z-20">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setIsHubMenuOpen(!isHubMenuOpen); }} className={`p-3 rounded-2xl border transition-all ${isHubMenuOpen ? 'bg-nitro-primary text-nitro-black' : 'bg-nitro-gray text-gray-400 border-white/10'}`}>
              <ICONS.More className="w-5 h-5 rotate-90" />
            </button>
            {isHubMenuOpen && (
              <div className="tuning-hub-container absolute bottom-full left-0 mb-4 w-72 glass-panel border border-nitro-primary/30 rounded-[32px] p-5 shadow-2xl animate-in slide-in-from-bottom-2">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-2xl hover:bg-nitro-cyan/10 border border-transparent hover:border-nitro-cyan/30 transition-all">
                    <ICONS.File className="w-5 h-5 text-nitro-cyan" />
                    <span className="text-[8px] font-black uppercase text-gray-400">Share Data</span>
                  </button>
                  <button onClick={() => setIsScheduling(true)} className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-2xl hover:bg-nitro-yellow/10 border border-transparent hover:border-nitro-yellow/30 transition-all">
                    <ICONS.Clock className="w-5 h-5 text-nitro-yellow" />
                    <span className="text-[8px] font-black uppercase text-gray-400">Timer</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 relative flex items-center">
            <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Sector status update..." className="w-full bg-nitro-black/50 border border-white/10 rounded-2xl py-3 px-10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-nitro-primary transition-all" />
            <button className="absolute left-3 text-gray-500 hover:text-nitro-primary transition-colors"><ICONS.Emoji className="w-5 h-5" /></button>
          </div>
          <div className="flex items-center gap-2">
            <button onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={stopRecording} className={`p-3 rounded-2xl transition-all relative ${isRecording ? 'bg-nitro-magenta text-white animate-pulse' : 'bg-nitro-gray text-gray-500'}`}>
              <ICONS.Mic className="w-5 h-5" />
            </button>
            <button onClick={handleSend} className={`p-3 rounded-2xl ${inputValue.trim() ? 'bg-nitro-primary text-nitro-black' : 'bg-nitro-gray text-gray-500'}`}>
              <ICONS.Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => onSendMessage(`Shared: ${file.name}`, 'file', { name: file.name, size: file.size, mimeType: file.type, content: reader.result as string });
          reader.readAsText(file);
        }
      }} />
    </div>
  );
};

export default ChatWindow;
