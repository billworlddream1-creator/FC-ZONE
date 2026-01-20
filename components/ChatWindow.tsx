
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { Chat, Message, User, VoiceProfile, ExpiryDuration, VoiceFilter } from '../types';
import { ICONS, CURRENT_USER } from '../constants';
import { speakText, playUiSound } from '../services/audioService';
import { searchGifs, searchEmojis, getContextIntelligence, translateMessage, analyzeDocument, performWebSearch, refineDraftMessage, interpretUserCommand, summarizeChat, analyzeSentimentAndStyle, transcribeAudio } from '../services/geminiService';
import CallOverlay from './CallOverlay';

interface ChatWindowProps {
  chat: Chat;
  onSendMessage: (text: string, type?: string, fileData?: any) => void;
  onReactToMessage: (messageId: string, emoji: string) => void;
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
  autoReadVoice?: boolean;
  autoReadText?: boolean;
  isChatbotActive?: boolean;
  onToggleChatbot?: () => void;
}

const QUICK_REACTIONS = ['🔥', '❤️', '😂', '🏎️', '👍', '😮'];

const STOCK_WALLPAPERS = [
    { id: 'none', label: 'None', url: '' },
    { id: 'carbon', label: 'Carbon', url: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=800&q=80' },
    { id: 'cyber', label: 'Cyber', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80' },
    { id: 'nitro', label: 'Nitro', url: 'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&w=800&q=80' },
    { id: 'garage', label: 'Garage', url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80' },
];

const PLACEHOLDERS = [
    "Let's chat...",
    "Let's talk...",
    "What is on your mind?",
    "Let's speed...",
    "Let's race...",
    "Let's get onboard now...",
    "Transmit mission data...",
    "Full throttle thoughts...",
    "Ignition ready...",
    "Enter the zone..."
];

const ChatWindow = forwardRef<any, ChatWindowProps>(({ 
  chat, 
  onSendMessage, 
  onReactToMessage,
  onTogglePinMessage,
  onUpdateExpiryDuration,
  onUpdateWallpaper,
  customBgColor = '#0a192f', 
  bubbleColor,
  voiceProfile, 
  soundEnabled, 
  onToggleSound, 
  onToggleVoice, 
  userVoiceFilter, 
  onUpdateVoiceFilter,
  onLinkDevice,
  onShareZone,
  onOpenSettings,
  onScheduleMessage,
  stealthMode,
  onToggleStealthMode,
  autoReadVoice,
  autoReadText,
  isTyping,
  isChatbotActive,
  onToggleChatbot
}, ref) => {
  const [inputValue, setInputValue] = useState('');
  const [isNitroEffect, setIsNitroEffect] = useState(false);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callTargetName, setCallTargetName] = useState<string>('');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isWallpaperPickerOpen, setIsWallpaperPickerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [showAiTools, setShowAiTools] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [analyzingFileId, setAnalyzingFileId] = useState<string | null>(null);
  const [translatingMsgId, setTranslatingMsgId] = useState<string | null>(null);
  const [autoReadCountdown, setAutoReadCountdown] = useState<number | null>(null);
  const [placeholderText, setPlaceholderText] = useState(PLACEHOLDERS[0]);
  
  // Command Terminal State
  const [isCommandMode, setIsCommandMode] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);

  // Upload State
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [failedFile, setFailedFile] = useState<File | null>(null);
  const uploadTaskRef = useRef<any>(null);

  // Consolidated Input Menu State
  const [isInputMenuOpen, setIsInputMenuOpen] = useState(false);

  // Emoji & GIF search states
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('');
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [emojiResults, setEmojiResults] = useState<string[]>([]);
  const [gifResults, setGifResults] = useState<{url: string, title: string}[]>([]);
  const [isSearchingGifs, setIsSearchingGifs] = useState(false);
  const [isSearchingEmojis, setIsSearchingEmojis] = useState(false);
  
  // Reaction states
  const [reactionMenuMsgId, setReactionMenuMsgId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const reactionRef = useRef<HTMLDivElement>(null);
  const inputMenuRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<any>(null);
  const prevMsgCountRef = useRef(chat.messages.length);
  const recognitionRef = useRef<any>(null);

  const otherRacer = chat.participants.find(p => p.id !== CURRENT_USER.id);
  const racerStatus = otherRacer?.status || 'offline';

  useImperativeHandle(ref, () => ({
    handleNitroBoost: () => {
        setIsNitroEffect(true);
        if (soundEnabled) playUiSound('nitro');
        onSendMessage("🔥 NITRO BOOST ENGAGED: Combustion levels peaking!");
        setTimeout(() => setIsNitroEffect(false), 2500);
    },
    handleContextAnalysis: async () => {
        const history = chat.messages.map(m => m.text);
        const intel = await getContextIntelligence(history);
        onSendMessage(`[Grid Intel Analysis]: ${intel}`, 'text', { isAi: true });
    },
    handleTranslate: async () => {
        if (!inputValue) return;
        const translated = await translateMessage(inputValue);
        setInputValue(translated);
    },
    triggerFileUpload: () => fileInputRef.current?.click(),
    setIsScheduling: (val: boolean) => {
        if (val) {
            const time = prompt("Enter delay in seconds (e.g. 5):");
            if (time) {
                const text = prompt("Enter auto-transmission text:");
                if (text) onScheduleMessage(text, Date.now() + parseInt(time) * 1000);
            }
        }
    }
  }));

  useEffect(() => {
      setPlaceholderText(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
  }, []);

  useEffect(() => {
    if (chat.messages.length > prevMsgCountRef.current) {
        const lastMsg = chat.messages[chat.messages.length - 1];
        if (lastMsg.senderId !== CURRENT_USER.id) {
            if (lastMsg.fileData?.mimeType?.startsWith('audio/') && autoReadVoice) {
                setAutoReadCountdown(3);
                const timer = setInterval(() => {
                    setAutoReadCountdown(prev => {
                       if (prev === 1) {
                           clearInterval(timer);
                           handleReadVoice(lastMsg);
                           return null;
                       }
                       return prev ? prev - 1 : null;
                    });
                }, 1000);
            } 
            else if (lastMsg.type === 'text' && autoReadText) {
                setTimeout(() => {
                    speakText(`${lastMsg.senderName} says: ${lastMsg.text}`, voiceProfile);
                }, 1000);
            }
        }
    }
    prevMsgCountRef.current = chat.messages.length;
  }, [chat.messages, autoReadVoice, autoReadText, voiceProfile]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat.messages, isTyping]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
        setIsWallpaperPickerOpen(false);
      }
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsEmojiPickerOpen(false);
        setIsGifPickerOpen(false);
      }
      if (reactionRef.current && !reactionRef.current.contains(event.target as Node)) {
        setReactionMenuMsgId(null);
      }
      if (inputMenuRef.current && !inputMenuRef.current.contains(event.target as Node)) {
        setIsInputMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCommandSubmit = async () => {
    if (!inputValue.trim()) return;
    setIsProcessingCommand(true);
    setCommandFeedback(null);
    if(soundEnabled) playUiSound('click');

    const result = await interpretUserCommand(inputValue);
    
    switch(result.action) {
        case 'TOGGLE_SOUND':
            if (result.params?.state !== undefined) {
                 if (result.params.state !== soundEnabled) onToggleSound();
            } else {
                 onToggleSound();
            }
            break;
        case 'READ_LAST_MESSAGE':
            const lastMsg = chat.messages[chat.messages.length - 1];
            if (lastMsg) {
                speakText(`Latest transmission from ${lastMsg.senderName}: ${lastMsg.text}`, voiceProfile);
            } else {
                speakText("No messages to read.", voiceProfile);
            }
            break;
        case 'START_CALL':
            setCallTargetName(result.params?.targetName || chat.name);
            setIsCallOpen(true);
            break;
        case 'SET_ALARM':
            const timeStr = result.params?.time;
            onSendMessage(`[System]: Setting Alarm for ${timeStr}...`, 'text', { isAi: true });
            setTimeout(() => {
                if(soundEnabled) playUiSound('alarm');
                alert(`ALARM: ${timeStr} reached.`);
            }, 3000); 
            break;
        case 'TOGGLE_STEALTH':
            if (result.params?.state !== undefined) {
                if (result.params.state !== stealthMode) onToggleStealthMode();
            } else {
                onToggleStealthMode();
            }
            break;
    }

    setCommandFeedback(result.feedback);
    setIsProcessingCommand(false);
    setInputValue('');
    
    setTimeout(() => {
        setCommandFeedback(null);
        setIsCommandMode(false);
    }, 3000);
  };

  const handleSend = () => {
    if (isCommandMode) {
        handleCommandSubmit();
        return;
    }
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue('');
  };

  const handleReaction = (msgId: string, emoji: string) => {
    onReactToMessage(msgId, emoji);
    setReactionMenuMsgId(null);
    if (soundEnabled) playUiSound('click');
  };

  const startDictation = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Speech dictation not supported in this browser.");
        return;
    }
    
    if (isDictating) {
        recognitionRef.current?.stop();
        setIsDictating(false);
        return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        setIsDictating(true);
        if (soundEnabled) playUiSound('click');
    };

    recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        
        if (finalTranscript) {
             setInputValue(prev => {
                const trailingSpace = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
                return prev + trailingSpace + finalTranscript.trim();
            });
        }
    };

    recognition.onerror = (event: any) => {
        console.error("Dictation error", event.error);
        setIsDictating(false);
    };

    recognition.onend = () => {
        setIsDictating(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleRefineInput = async (intent: 'fix' | 'translate' | 'style') => {
      if (!inputValue.trim()) return;
      setIsRefining(true);
      const refined = await refineDraftMessage(inputValue, intent);
      setInputValue(refined);
      setIsRefining(false);
      setShowAiTools(false);
      if (soundEnabled) playUiSound('levelUp');
  };

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);
        setRecordingTime(0);
        
        recordingIntervalRef.current = setInterval(() => {
            setRecordingTime(prev => prev + 1);
        }, 1000);

        const chunks: BlobPart[] = [];
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const fileRef = storageRef(storage, `voice_comms/${Date.now()}.webm`);
            const uploadTask = uploadBytesResumable(fileRef, blob);
            
            uploadTask.on('state_changed', 
              (snapshot) => {
                 const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                 setUploadProgress(progress);
              },
              (error) => {
                 console.error("Voice upload failed", error);
                 setUploadProgress(0);
              },
              async () => {
                 const url = await getDownloadURL(uploadTask.snapshot.ref);
                 onSendMessage("[Voice Transmission Received]", 'file', {
                    name: "Voice_Comms.webm",
                    size: blob.size,
                    mimeType: 'audio/webm',
                    content: url,
                    voiceFilter: userVoiceFilter
                 });
                 setIsRecording(false);
                 setUploadProgress(0);
                 clearInterval(recordingIntervalRef.current);
              }
            );
        };
        mediaRecorder.start();
        if (soundEnabled) playUiSound('click');
    } catch (err) {
        alert("Mic access denied.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (soundEnabled) playUiSound('send');
  };

  const executeUpload = (file: File) => {
    setUploadError(null);
    setUploadProgress(0);
    setFailedFile(null);

    const fileRef = storageRef(storage, `shared_assets/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);
    uploadTaskRef.current = uploadTask;

    const isImage = file.type.startsWith('image/');
    const type = isImage ? 'image' : 'file';

    uploadTask.on('state_changed', 
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
        }, 
        (error) => {
            console.error("Firebase Storage Error:", error);
            setUploadError(`Transmission Failed: ${error.message}`);
            setFailedFile(file);
            setUploadProgress(0);
            playUiSound('alarm');
        }, 
        async () => {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            onSendMessage(`[Cloud Asset Transmitted: ${file.name}]`, type, {
                name: file.name,
                size: file.size,
                mimeType: file.type,
                content: downloadUrl 
            });
            if (soundEnabled) playUiSound('levelUp');
            setUploadProgress(0);
            uploadTaskRef.current = null;
        }
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    executeUpload(file);
  };

  const handleRetryUpload = () => {
      if (failedFile) {
          executeUpload(failedFile);
      }
  };

  const cancelUpload = () => {
      if (uploadTaskRef.current) {
          uploadTaskRef.current.cancel();
          setUploadProgress(0);
          setUploadError(null);
          setFailedFile(null);
      }
  };

  const selectEmoji = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    if (soundEnabled) playUiSound('click');
  };

  const selectGif = (gif: {url: string, title: string}) => {
    onSendMessage(`[Nitro GIF: ${gif.title}]`, 'image', {
        name: gif.title,
        size: 0,
        mimeType: 'image/gif',
        content: gif.url
    });
    setIsGifPickerOpen(false);
    if (soundEnabled) playUiSound('nitro');
  };

  const handleWebSearch = async () => {
      const query = inputValue.trim() ? inputValue : prompt("Search the Grid (Internet):");
      if(query) {
          if (soundEnabled) playUiSound('click');
          onSendMessage(`Scanning Grid for: "${query}"...`, 'text', { isAi: true });
          const result = await performWebSearch(query);
          onSendMessage(`[Web Intel]: ${result}`, 'text', { isAi: true });
          if (inputValue.trim()) setInputValue(''); 
      }
      setIsInputMenuOpen(false);
  };

  const handleDownloadFile = (msg: Message) => {
    if (msg.fileData?.content) {
      window.open(msg.fileData.content, '_blank');
      if (soundEnabled) playUiSound('click');
    }
  };

  const handleAnalyzeFile = async (msg: Message) => {
      if (!msg.fileData) return;
      setAnalyzingFileId(msg.id);
      
      try {
          let contentForAnalysis = "";
          if (msg.fileData.content) {
              const response = await fetch(msg.fileData.content);
              const blob = await response.blob();
              
              if (msg.fileData.mimeType.includes('pdf') || msg.fileData.mimeType.includes('image')) {
                  const reader = new FileReader();
                  reader.readAsDataURL(blob);
                  await new Promise<void>((resolve) => {
                      reader.onloadend = () => {
                          const base64data = (reader.result as string).split(',')[1];
                          contentForAnalysis = base64data;
                          resolve();
                      };
                  });
              } else {
                  contentForAnalysis = await blob.text();
              }
          } else {
              contentForAnalysis = `Metadata: ${msg.fileData.name} (${msg.fileData.size} bytes)`;
          }

          const analysis = await analyzeDocument(msg.fileData.name, contentForAnalysis, msg.fileData.mimeType);
          onSendMessage(`[Nitro File Analysis]: ${analysis}`, 'text', { isAi: true });
      } catch (e) {
          console.error("Analysis failed", e);
          onSendMessage(`[System Error]: Unable to extract data from ${msg.fileData.name}. Encryption too strong.`, 'text', { isAi: true });
      } finally {
          setAnalyzingFileId(null);
      }
  };

  const handleReadVoice = (msg: Message) => {
      speakText("Incoming Audio Transmission from " + msg.senderName, voiceProfile);
  };

  const handleAnalyzeVoice = async (msg: Message) => {
      if (!msg.fileData || !msg.fileData.content) return;
      setAnalyzingFileId(msg.id);
      if (soundEnabled) playUiSound('click');

      try {
          const response = await fetch(msg.fileData.content);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          
          await new Promise<void>((resolve) => {
              reader.onloadend = async () => {
                  const base64data = (reader.result as string).split(',')[1];
                  const transcript = await transcribeAudio(base64data, msg.fileData!.mimeType);
                  if (!transcript) {
                      onSendMessage(`[System Error]: Audio stream too weak for transcription.`, 'text', { isAi: true });
                      resolve();
                      return;
                  }
                  
                  const result = await analyzeSentimentAndStyle(transcript);
                  onSendMessage(`[Voice Intel]:\nTarget: ${msg.senderName}\nTranscript: "${transcript}"\nMood: ${result.mood}\nStyle: ${result.style}\nIntent: ${result.intent}`, 'text', { isAi: true });
                  resolve();
              };
          });
      } catch (e) {
          console.error("Voice Analysis Error", e);
          onSendMessage(`[System Error]: Voice decryption failed.`, 'text', { isAi: true });
      } finally {
          setAnalyzingFileId(null);
          if (soundEnabled) playUiSound('levelUp');
      }
  };

  const handleTranslateMessage = async (msg: Message) => {
      setTranslatingMsgId(msg.id);
      const translated = await translateMessage(msg.text);
      alert(`[Translation]: ${translated}`);
      setTranslatingMsgId(null);
  };

  const handleSummarizeChat = async () => {
      if (chat.messages.length === 0) return;
      if (soundEnabled) playUiSound('click');
      onSendMessage("Generating Pit Stop Report...", 'text', { isAi: true });
      
      const summary = await summarizeChat(chat.messages.map(m => `${m.senderName}: ${m.text}`));
      onSendMessage(`[Pit Stop Report]: ${summary}`, 'text', { isAi: true });
      if (soundEnabled) playUiSound('levelUp');
  };

  return (
    <div 
        className={`flex flex-col h-full relative overflow-hidden flex-1 transition-all duration-700 ${stealthMode ? 'grayscale brightness-[0.7] contrast-125' : ''}`} 
        style={{ backgroundColor: stealthMode ? '#000' : customBgColor }}
    >
      <CallOverlay isOpen={isCallOpen} onClose={() => setIsCallOpen(false)} userName={callTargetName || chat.name} />

      {isNitroEffect && (
        <div className="absolute inset-0 z-[100] pointer-events-none flex items-center justify-center bg-nitro-cyan/10 mix-blend-hard-light animate-in fade-in zoom-in duration-300">
            <div className="absolute inset-0 bg-gradient-to-t from-nitro-magenta/20 to-nitro-cyan/20 animate-pulse"></div>
            <h1 className="font-orbitron font-black text-6xl text-white italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,0,60,1)] animate-nitro-shake skew-x-12">
                NITRO BOOST!
            </h1>
        </div>
      )}

      {autoReadCountdown !== null && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[90] animate-in slide-in-from-top-4">
              <div className="bg-nitro-black/90 border border-nitro-green px-6 py-3 rounded-full shadow-[0_0_20px_rgba(57,255,20,0.4)] flex items-center gap-4">
                  <div className="w-3 h-3 bg-nitro-green rounded-full animate-ping"></div>
                  <span className="font-orbitron font-black text-white text-xs uppercase tracking-widest">
                      Auto-Reading Audio in {autoReadCountdown}s
                  </span>
                  <button onClick={() => setAutoReadCountdown(null)} className="text-[10px] text-gray-400 hover:text-white uppercase font-bold">Cancel</button>
              </div>
          </div>
      )}

      {commandFeedback && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[90] animate-in slide-in-from-bottom-4">
              <div className="bg-nitro-black/95 border border-nitro-green px-5 py-2 rounded-xl shadow-[0_0_15px_rgba(57,255,20,0.3)] flex items-center gap-2">
                  <ICONS.Check className="w-4 h-4 text-nitro-green" />
                  <span className="text-[10px] font-mono text-nitro-green uppercase">{commandFeedback}</span>
              </div>
          </div>
      )}

      <div className="glass-panel px-6 py-4 flex items-center justify-between z-10 border-b border-white/5 shadow-lg">
        <div className="flex items-center gap-3">
          <img src={chat.avatar} alt={chat.name} className="w-10 h-10 rounded-full border border-nitro-primary shadow-[0_0_10px_rgba(0,243,255,0.2)]" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
                <h2 className="font-orbitron font-bold text-sm text-white uppercase tracking-tight truncate">{chat.name}</h2>
                {chat.expiryDuration && chat.expiryDuration !== 'off' && (
                    <div className="flex items-center gap-1 bg-nitro-magenta/20 border border-nitro-magenta/40 px-1.5 py-0.5 rounded text-[7px] text-nitro-magenta font-black animate-pulse">
                        <ICONS.Ghost className="w-2.5 h-2.5" />
                        AUTO-PURGE: {chat.expiryDuration.toUpperCase()}
                    </div>
                )}
            </div>
            <p className={`text-[9px] uppercase tracking-widest font-black flex items-center gap-1 ${racerStatus === 'offline' ? 'text-gray-500' : 'text-nitro-green animate-pulse'}`}>
                <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor] ${racerStatus === 'offline' ? 'bg-gray-500' : 'bg-nitro-green'}`}></div>
                Racer {racerStatus === 'speeding' ? 'Online (Speeding)' : racerStatus.charAt(0).toUpperCase() + racerStatus.slice(1)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {onToggleChatbot && (
              <button 
                onClick={onToggleChatbot}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isChatbotActive ? 'bg-nitro-magenta/20 border-nitro-magenta text-nitro-magenta' : 'bg-white/5 border-white/10 text-gray-500'}`}
                title="Toggle Nitro Bot"
              >
                  <ICONS.Ai className="w-4 h-4" />
                  <span className="hidden sm:inline text-[9px] font-black uppercase">{isChatbotActive ? 'Bot: ON' : 'Bot: OFF'}</span>
              </button>
          )}

          <button onClick={() => { setCallTargetName(chat.name); setIsCallOpen(true); }} className="p-2 hover:bg-nitro-primary/10 rounded-xl transition-all text-gray-400 hover:text-nitro-primary">
            <ICONS.Phone className="w-5 h-5" />
          </button>
          
          <button onClick={() => { setCallTargetName(chat.name); setIsCallOpen(true); }} className="p-2 hover:bg-nitro-primary/10 rounded-xl transition-all text-gray-400 hover:text-nitro-primary">
            <ICONS.Video className="w-5 h-5" />
          </button>

          <button onClick={onToggleSound} className={`p-2 rounded-xl transition-all ${soundEnabled ? 'text-nitro-yellow' : 'text-gray-600'}`}>
            {soundEnabled ? <ICONS.Volume className="w-5 h-5" /> : <ICONS.VolumeX className="w-5 h-5" />}
          </button>

          <div className="relative" ref={menuRef}>
            <button onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)} className="p-2 hover:bg-white/10 rounded-xl transition-all text-gray-400">
                <ICONS.More className="w-5 h-5" />
            </button>
            {isMoreMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 glass-panel border border-white/10 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden">
                    <button onClick={handleSummarizeChat} className="w-full text-left px-4 py-3 text-[10px] font-orbitron font-black text-nitro-cyan hover:text-white uppercase transition-all flex items-center gap-2">
                        <ICONS.File className="w-4 h-4" /> Summarize Chat
                    </button>
                    
                    <div className="h-[1px] bg-white/5 mx-2 my-1"></div>
                    <button 
                        onClick={() => setIsWallpaperPickerOpen(!isWallpaperPickerOpen)}
                        className="w-full text-left px-4 py-3 text-[10px] font-orbitron font-black text-gray-400 hover:text-white uppercase transition-all flex items-center gap-2"
                    >
                        <ICONS.Image className="w-4 h-4" /> Chat Wallpaper
                    </button>
                    {isWallpaperPickerOpen && (
                        <div className="px-4 py-2 grid grid-cols-5 gap-1.5 animate-in slide-in-from-top-2">
                            {STOCK_WALLPAPERS.map(wp => (
                                <button 
                                    key={wp.id}
                                    onClick={() => onUpdateWallpaper(chat.id, wp.url)}
                                    className={`w-full aspect-square rounded-lg border-2 transition-all overflow-hidden ${chat.wallpaper === wp.url ? 'border-nitro-cyan scale-110 shadow-lg' : 'border-white/10 hover:border-white/30'}`}
                                    title={wp.label}
                                >
                                    {wp.url ? (
                                        <img src={wp.url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-nitro-black/50 flex items-center justify-center text-[7px] text-gray-500 font-black uppercase">Off</div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="h-[1px] bg-white/5 mx-2 my-1"></div>
                    <div className="px-4 py-2">
                        <p className="text-[8px] font-orbitron font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <ICONS.Ghost className="w-3 h-3 text-nitro-magenta" /> Self-Destruct protocol
                        </p>
                        <div className="grid grid-cols-4 gap-1">
                            {['off', '24h', '1w', '1m'].map(dur => (
                                <button 
                                    key={dur} 
                                    onClick={() => onUpdateExpiryDuration(chat.id, dur as ExpiryDuration)}
                                    className={`py-1.5 rounded text-[8px] font-black uppercase transition-all ${chat.expiryDuration === dur ? 'bg-nitro-magenta text-white shadow-[0_0_10px_rgba(255,0,60,0.3)]' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                                >
                                    {dur}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-[1px] bg-white/5 mx-2 my-1"></div>
                    <button onClick={onShareZone} className="w-full text-left px-4 py-3 text-[10px] font-orbitron font-black text-gray-400 hover:text-white uppercase transition-all">Share Internally</button>
                    <button onClick={onShareZone} className="w-full text-left px-4 py-3 text-[10px] font-orbitron font-black text-gray-400 hover:text-white uppercase transition-all">Share Externally</button>
                    <div className="h-[1px] bg-white/5 mx-2 my-1"></div>
                    <button onClick={onLinkDevice} className="w-full text-left px-4 py-3 text-[10px] font-orbitron font-black text-gray-400 hover:text-white uppercase transition-all">Link Device</button>
                    <button onClick={onOpenSettings} className="w-full text-left px-4 py-3 text-[10px] font-orbitron font-black text-gray-400 hover:text-white uppercase transition-all">Settings</button>
                </div>
            )}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar scroll-smooth relative">
        {/* WALLPAPER LAYER */}
        {chat.wallpaper && (
            <div 
                className="absolute inset-0 z-0 opacity-40 pointer-events-none bg-fixed bg-center bg-cover transition-all duration-700" 
                style={{ backgroundImage: `url(${chat.wallpaper})` }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-nitro-black/60 via-transparent to-nitro-black/60"></div>
            </div>
        )}

        <div className="relative z-10 space-y-6">
            {chat.messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.senderId === CURRENT_USER.id ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300 group/msg`}>
                <div 
                onClick={() => setReactionMenuMsgId(reactionMenuMsgId === msg.id ? null : msg.id)}
                style={
                    msg.senderId === CURRENT_USER.id && bubbleColor 
                        ? { backgroundColor: `${bubbleColor}20`, borderColor: `${bubbleColor}60`, color: '#fff' } 
                        : {}
                }
                className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 px-4 shadow-xl border cursor-pointer transition-all backdrop-blur-sm hover:scale-[1.01] active:scale-95 ${
                    msg.senderId === CURRENT_USER.id 
                        ? (!bubbleColor ? 'bg-nitro-primary/10 border-nitro-primary/20 text-white' : '') 
                        : 'bg-nitro-black/60 border-white/10 text-gray-200'
                }`}
                >
                {msg.isPinned && (
                    <div className="absolute -top-2 -right-2 z-20 bg-nitro-yellow text-nitro-black p-1 rounded-full shadow-[0_0_10px_rgba(251,255,0,0.5)] border border-nitro-black animate-in zoom-in duration-300">
                        <ICONS.Pin className="w-3 h-3" />
                    </div>
                )}

                {msg.expiryTimestamp && (
                    <div className="absolute -top-1.5 -left-1.5 z-20 bg-nitro-magenta/20 backdrop-blur-md text-nitro-magenta p-0.5 rounded-full border border-nitro-magenta/50 shadow-lg animate-pulse" title="Expiring message">
                        <ICONS.Clock className="w-2.5 h-2.5" />
                    </div>
                )}

                {msg.isAi && (
                    <div className="flex items-center gap-1 mb-1 opacity-70">
                        <ICONS.Ai className="w-3 h-3 text-nitro-magenta" />
                        <span className="text-[8px] font-orbitron font-black text-nitro-magenta uppercase">Auto-Pilot</span>
                    </div>
                )}

                {(msg.type === 'file' || msg.type === 'image') && (
                    <div className="flex flex-col gap-2 mb-2">
                    {msg.type === 'image' ? (
                        <div className="relative overflow-hidden rounded-xl border border-white/5 group/image">
                        <img src={msg.fileData?.content} className="max-w-full h-auto block transform group-hover/image:scale-105 transition-transform duration-700" alt={msg.fileData?.name} />
                        {msg.fileData?.mimeType === 'image/gif' && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-nitro-magenta/80 text-white text-[8px] font-black uppercase rounded shadow-lg backdrop-blur-sm animate-pulse">LIVE GIF</div>
                        )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/5 hover:border-nitro-cyan/30 transition-all">
                        <ICONS.File className="w-8 h-8 text-nitro-cyan" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-white truncate">{msg.fileData?.name}</p>
                            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">{msg.fileData?.mimeType.split('/')[1] || 'Asset'} ({Math.round(msg.fileData!.size / 1024)} KB)</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDownloadFile(msg); }} className="p-2 text-nitro-cyan hover:bg-nitro-cyan/10 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
                        </div>
                    )}

                    {msg.type === 'file' && msg.fileData?.mimeType !== 'audio/webm' && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleAnalyzeFile(msg); }}
                            disabled={analyzingFileId === msg.id}
                            className="w-full py-2 bg-nitro-magenta/10 border border-nitro-magenta/30 rounded-lg text-[9px] font-black text-nitro-magenta uppercase hover:bg-nitro-magenta/20 transition-all flex items-center justify-center gap-2"
                        >
                            {analyzingFileId === msg.id ? <div className="w-3 h-3 border-2 border-nitro-magenta border-t-transparent rounded-full animate-spin"></div> : <ICONS.Ai className="w-3 h-3" />}
                            {analyzingFileId === msg.id ? 'Scanning...' : 'Analyze File'}
                        </button>
                    )}

                    {msg.fileData?.mimeType === 'audio/webm' && (
                        <div className="flex gap-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleReadVoice(msg); }}
                                className="flex-1 py-2 bg-nitro-green/10 border border-nitro-green/30 rounded-lg text-[9px] font-black text-nitro-green uppercase hover:bg-nitro-green/20 transition-all flex items-center justify-center gap-2"
                            >
                                <ICONS.Volume className="w-3 h-3" />
                                Play
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleAnalyzeVoice(msg); }}
                                disabled={analyzingFileId === msg.id}
                                className="flex-1 py-2 bg-nitro-cyan/10 border border-nitro-cyan/30 rounded-lg text-[9px] font-black text-nitro-cyan uppercase hover:bg-nitro-cyan/20 transition-all flex items-center justify-center gap-2"
                            >
                                {analyzingFileId === msg.id ? <div className="w-3 h-3 border-2 border-nitro-cyan border-t-transparent rounded-full animate-spin"></div> : <ICONS.Ai className="w-3 h-3" />}
                                {analyzingFileId === msg.id ? 'Thinking...' : 'Analyze'}
                            </button>
                        </div>
                    )}
                    </div>
                )}
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                
                <div className="flex justify-between items-center mt-2">
                    {msg.senderId !== CURRENT_USER.id && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleTranslateMessage(msg); }}
                            disabled={translatingMsgId === msg.id}
                            className="text-[9px] text-nitro-cyan hover:text-white uppercase font-bold flex items-center gap-1"
                        >
                            <ICONS.Translate className={`w-3 h-3 ${translatingMsgId === msg.id ? 'animate-spin' : ''}`} />
                            Translate
                        </button>
                    )}
                    <div className="flex justify-end items-center gap-1.5 ml-auto">
                        <span className="text-[8px] text-gray-600 font-mono tracking-tighter">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {msg.senderId === CURRENT_USER.id && (
                        <div className={`w-2.5 h-1.5 border-b-2 border-r-2 rotate-45 transition-colors ${msg.status === 'read' ? 'border-nitro-cyan' : 'border-gray-600'}`}></div>
                        )}
                    </div>
                </div>

                {reactionMenuMsgId === msg.id && (
                    <div ref={reactionRef} className={`absolute -top-12 z-[100] bg-nitro-black/90 backdrop-blur-xl border border-white/10 rounded-full px-2 py-1.5 flex gap-1.5 shadow-2xl animate-in slide-in-from-bottom-2 duration-200 ${msg.senderId === CURRENT_USER.id ? 'right-0' : 'left-0'}`}>
                    {QUICK_REACTIONS.map(emoji => (
                        <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }} className="text-xl hover:scale-125 transition-transform px-1 p-0.5">
                        {emoji}
                        </button>
                    ))}
                    <div className="w-[1px] bg-white/20 mx-1"></div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onTogglePinMessage(chat.id, msg.id); setReactionMenuMsgId(null); }}
                        className={`p-1 hover:scale-125 transition-transform ${msg.isPinned ? 'text-nitro-yellow' : 'text-gray-400 hover:text-white'}`}
                        title={msg.isPinned ? "Unpin Message" : "Pin Message"}
                    >
                        <ICONS.Pin className="w-4 h-4" />
                    </button>
                    </div>
                )}
                </div>

                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className={`flex flex-wrap gap-1 mt-1.5 ${msg.senderId === CURRENT_USER.id ? 'justify-end' : 'justify-start'}`}>
                    {(Object.entries(msg.reactions) as [string, string[]][]).map(([emoji, users]) => (
                    <button 
                        key={emoji}
                        onClick={() => handleReaction(msg.id, emoji)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${users.includes(CURRENT_USER.id) ? 'bg-nitro-primary/20 border-nitro-primary/40 text-nitro-primary' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                        <span>{emoji}</span>
                        <span className="font-orbitron">{users.length}</span>
                    </button>
                    ))}
                </div>
                )}
            </div>
            ))}
            {isTyping && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex space-x-1 p-3 bg-nitro-gray/50 rounded-2xl rounded-bl-none border border-white/5 w-fit backdrop-blur-md">
                        <div className="w-1.5 h-1.5 bg-nitro-cyan/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-nitro-cyan/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-nitro-cyan/50 rounded-full animate-bounce"></div>
                    </div>
                    <span className="text-[9px] text-gray-500 font-orbitron uppercase animate-pulse">Typing...</span>
                </div>
            )}
        </div>
      </div>

      {(uploadProgress > 0 || uploadError) && (
          <div className="px-4 pb-2 relative z-20">
              <div className="bg-nitro-black/80 border border-white/10 rounded-xl p-3 flex items-center justify-between backdrop-blur-sm">
                  <div className="flex-1 mr-4">
                      {uploadError ? (
                          <p className="text-[10px] text-nitro-magenta font-black uppercase flex items-center gap-2">
                              <ICONS.Shield className="w-3 h-3" /> {uploadError}
                          </p>
                      ) : (
                          <div className="space-y-1">
                              <div className="flex justify-between text-[8px] text-nitro-cyan font-bold uppercase">
                                  <span>Uploading Asset...</span>
                                  <span>{Math.round(uploadProgress)}%</span>
                              </div>
                              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-nitro-cyan transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                              </div>
                          </div>
                      )}
                  </div>
                  <div className="flex gap-2">
                      {uploadError ? (
                          <button onClick={handleRetryUpload} className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[9px] font-black text-white uppercase">Retry</button>
                      ) : (
                          <div className="w-4 h-4 border-2 border-nitro-cyan border-t-transparent rounded-full animate-spin"></div>
                      )}
                      <button onClick={cancelUpload} className="px-2 py-1 text-gray-500 hover:text-white text-[10px]">✕</button>
                  </div>
              </div>
          </div>
      )}

      {isDictating && (
          <div className="px-4 pb-2 animate-in slide-in-from-bottom-2 relative z-20">
              <div className="bg-nitro-primary/10 border border-nitro-primary/30 rounded-xl p-2 flex items-center justify-center gap-2 backdrop-blur-md">
                  <div className="w-2 h-2 bg-nitro-primary rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black text-nitro-primary uppercase tracking-widest">Listening...</span>
                  <div className="flex gap-0.5 h-3 items-end">
                      {[1,2,3,4,5].map(i => (
                          <div key={i} className="w-1 bg-nitro-primary/50 animate-bounce" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}></div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      <div className="p-3 sm:p-4 border-t border-nitro-gray glass-panel relative z-20">
        {isRecording && (
          <div className="absolute inset-x-0 bottom-full mb-2 px-3 animate-in slide-in-from-bottom-2">
            <div className="bg-nitro-magenta/20 border border-nitro-magenta/50 rounded-2xl p-3 flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-nitro-magenta rounded-full animate-ping"></div>
                <div>
                    <span className="font-orbitron font-black text-white text-[10px] uppercase block">Recording: {recordingTime}s</span>
                    <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Voice Profile: {voiceProfile !== 'off' ? voiceProfile : 'Standard'} // Filter: Active</span>
                </div>
              </div>
              <button onClick={stopRecording} className="text-white bg-nitro-magenta px-4 py-1 rounded-full text-[10px] font-black uppercase shadow-[0_0_10px_var(--nitro-magenta)]">Stop Rec</button>
            </div>
          </div>
        )}

        {(isEmojiPickerOpen || isGifPickerOpen) && (
          <div ref={pickerRef} className="absolute bottom-full left-4 w-full max-w-sm mb-2 z-50 animate-in slide-in-from-bottom-4">
            <div className="w-full glass-panel border border-white/10 rounded-[32px] p-5 shadow-2xl max-h-80 overflow-y-auto bg-nitro-black/95">
              {isEmojiPickerOpen ? (
                <div className="space-y-4">
                  <div className="relative">
                    <input type="text" placeholder="Search Emojis..." className="w-full bg-nitro-black/50 border border-white/10 rounded-xl py-3 px-10 text-xs text-white" value={emojiSearchQuery} onChange={(e) => setEmojiSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (async () => {setIsSearchingEmojis(true); setEmojiResults(await searchEmojis(emojiSearchQuery)); setIsSearchingEmojis(false);})()} />
                    <ICONS.Emoji className="absolute left-3 top-3 w-4 h-4 text-nitro-primary" />
                    {isSearchingEmojis && <div className="absolute right-3 top-3 w-4 h-4 border-2 border-nitro-primary border-t-transparent rounded-full animate-spin"></div>}
                  </div>
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                    {emojiResults.length > 0 ? emojiResults.map((emoji, i) => <button key={i} onClick={() => selectEmoji(emoji)} className="text-2xl hover:bg-white/10 p-2 rounded-xl transition-all hover:scale-125">{emoji}</button>) : (
                      <p className="col-span-full text-center text-[10px] text-gray-500 uppercase font-black tracking-widest py-4">Enter query to unlock emojis</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <input type="text" placeholder="Search Live GIFs..." className="w-full bg-nitro-black/50 border border-white/10 rounded-xl py-3 px-10 text-xs text-white" value={gifSearchQuery} onChange={(e) => setGifSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (async () => {setIsSearchingGifs(true); setGifResults(await searchGifs(gifSearchQuery)); setIsSearchingGifs(false);})()} />
                    <ICONS.Gif className="absolute left-3 top-3 w-4 h-4 text-nitro-magenta" />
                    {isSearchingGifs && <div className="absolute right-3 top-3 w-4 h-4 border-2 border-nitro-magenta border-t-transparent rounded-full animate-spin"></div>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {gifResults.length > 0 ? gifResults.map((gif, i) => <button key={i} onClick={() => selectGif(gif)} className="group/gif relative overflow-hidden rounded-xl bg-black"><img src={gif.url} className="w-full h-24 object-cover transition-transform group-hover/gif:scale-110" alt={gif.title} /><div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover/gif:opacity-100 transition-opacity flex items-end p-2"><span className="text-[8px] text-white font-black uppercase truncate">{gif.title}</span></div></button>) : (
                      <p className="col-span-full text-center text-[10px] text-gray-500 uppercase font-black tracking-widest py-4">Search high-octane GIFs</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative" ref={inputMenuRef}>
             <button 
                onClick={() => setIsInputMenuOpen(!isInputMenuOpen)}
                className={`p-3 rounded-2xl border transition-all ${isInputMenuOpen ? 'bg-nitro-cyan text-nitro-black border-nitro-cyan' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}
                title="Tools & Assets"
             >
                <ICONS.Apps className="w-5 h-5" />
             </button>

             {isInputMenuOpen && (
                 <div className="absolute bottom-full left-0 mb-3 w-48 glass-panel border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 z-50 flex flex-col">
                     <button onClick={() => { setIsEmojiPickerOpen(true); setIsGifPickerOpen(false); setIsInputMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-all">
                        <ICONS.Emoji className="w-4 h-4 text-nitro-primary" />
                        <span className="text-[10px] font-black uppercase text-gray-300">Emoji</span>
                     </button>
                     <button onClick={() => { setIsGifPickerOpen(true); setIsEmojiPickerOpen(false); setIsInputMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-all">
                        <ICONS.Gif className="w-4 h-4 text-nitro-magenta" />
                        <span className="text-[10px] font-black uppercase text-gray-300">GIF Search</span>
                     </button>
                     <button onClick={() => { handleWebSearch(); }} className="flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-all">
                        <ICONS.Globe className="w-4 h-4 text-nitro-cyan" />
                        <span className="text-[10px] font-black uppercase text-gray-300">Internet Search</span>
                     </button>
                     <div className="h-[1px] bg-white/5 mx-2"></div>
                     <button onClick={() => { fileInputRef.current?.click(); setIsInputMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-all">
                        <ICONS.File className="w-4 h-4 text-nitro-green" />
                        <span className="text-[10px] font-black uppercase text-gray-300">Upload File</span>
                     </button>
                     <button onClick={() => { setIsCommandMode(!isCommandMode); setIsInputMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-all">
                        <ICONS.Target className="w-4 h-4 text-nitro-yellow" />
                        <span className="text-[10px] font-black uppercase text-gray-300">Crew Chief Terminal</span>
                     </button>
                 </div>
             )}
          </div>
          
          <div className="flex-1 relative">
            <input 
                type="text" 
                value={inputValue} 
                onChange={(e) => setInputValue(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
                placeholder={isCommandMode ? "ENTER CREW CHIEF COMMAND >_" : (isDictating ? "Listening..." : placeholderText)}
                className={`w-full border rounded-2xl py-3.5 pl-5 pr-20 text-sm focus:outline-none focus:ring-1 transition-all placeholder:text-gray-600 ${isCommandMode ? 'bg-black border-nitro-green text-nitro-green font-mono placeholder:text-nitro-green/50' : 'bg-nitro-black/50 border-white/10 text-white focus:ring-nitro-primary'}`}
            />
            
            <div className="absolute right-2 top-2 bottom-2 flex items-center gap-1">
                {inputValue && !isCommandMode && (
                    <div className="relative">
                        <button 
                            onClick={() => setShowAiTools(!showAiTools)}
                            className={`p-1.5 rounded-xl transition-all ${isRefining ? 'bg-nitro-magenta/20 text-nitro-magenta animate-spin' : 'hover:bg-white/10 text-gray-400 hover:text-nitro-magenta'}`}
                            title="AI Draft Assistant"
                        >
                            <ICONS.Tuning className="w-4 h-4" />
                        </button>
                        {showAiTools && (
                            <div className="absolute bottom-full right-0 mb-2 w-40 glass-panel border border-white/10 rounded-xl shadow-xl z-50 flex flex-col overflow-hidden">
                                <button onClick={() => handleRefineInput('fix')} className="px-3 py-2 text-[10px] text-left hover:bg-white/10 font-bold uppercase text-gray-300">Fix Grammar</button>
                                <button onClick={() => handleRefineInput('style')} className="px-3 py-2 text-[10px] text-left hover:bg-white/10 font-bold uppercase text-nitro-cyan">Racer Style</button>
                                <button onClick={() => handleRefineInput('translate')} className="px-3 py-2 text-[10px] text-left hover:bg-white/10 font-bold uppercase text-gray-300">Translate</button>
                            </div>
                        )}
                    </div>
                )}
                
                <button 
                    onClick={startDictation}
                    className={`p-1.5 rounded-xl transition-all ${isDictating ? 'bg-nitro-primary/20 text-nitro-primary animate-pulse shadow-[0_0_10px_var(--nitro-primary)]' : 'hover:bg-white/10 text-gray-400 hover:text-nitro-primary'}`}
                    title="Dictate Message"
                >
                    <ICONS.Mic className="w-4 h-4" />
                </button>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button onClick={isRecording ? stopRecording : startRecording} className={`p-3 rounded-2xl transition-all ${isRecording ? 'bg-nitro-magenta text-white animate-pulse' : 'bg-white/5 border border-white/10 text-gray-400 hover:text-nitro-magenta hover:bg-nitro-magenta/10'}`}>
                {isRecording ? <div className="w-5 h-5 bg-white rounded-sm animate-pulse"></div> : <ICONS.Mic className="w-5 h-5" />}
            </button>
            
            {isCommandMode ? (
                <button 
                    onClick={handleCommandSubmit} 
                    className={`p-3 rounded-2xl shadow-lg transition-all active:scale-90 ${inputValue.trim() && !isProcessingCommand ? 'bg-nitro-green text-nitro-black shadow-[0_0_15px_rgba(57,255,20,0.4)]' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                >
                    {isProcessingCommand ? <div className="w-5 h-5 border-2 border-nitro-black border-t-transparent rounded-full animate-spin"></div> : <ICONS.Target className="w-5 h-5" />}
                </button>
            ) : (
                <button onClick={handleSend} className={`p-3 rounded-2xl shadow-lg transition-all active:scale-90 ${inputValue.trim() ? 'bg-nitro-primary text-nitro-black shadow-[0_0_15px_rgba(0,243,255,0.4)]' : 'bg-nitro-gray text-gray-500 cursor-not-allowed'}`}>
                    <ICONS.Send className="w-5 h-5" />
                </button>
            )}
          </div>
        </div>
      </div>
      
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
    </div>
  );
});

export default ChatWindow;
