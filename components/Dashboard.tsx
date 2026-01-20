
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { User, VoiceFilter, SoundPack, Message } from '../types';
import { ICONS } from '../constants';
import { playUiSound } from '../services/audioService';
import { analyzeRacerMood } from '../services/geminiService';

interface DashboardProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  isLightMode: boolean;
  onUpgrade?: () => void;
  onUpdateUser: (updated: Partial<User>) => void;
  activeTab?: 'stats' | 'engine' | 'settings' | 'voice' | 'vibe' | 'trash';
  salvagedMessages?: Message[];
  onRestoreMessage?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  onEmptySalvage?: () => void;
}

const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<string> => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return canvas.toDataURL('image/jpeg');
};

const Dashboard: React.FC<DashboardProps> = ({ 
    user, 
    isOpen, 
    onClose, 
    isLightMode, 
    onUpgrade, 
    onUpdateUser, 
    activeTab: initialActiveTab,
    salvagedMessages = [],
    onRestoreMessage,
    onPermanentDelete,
    onEmptySalvage
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'engine' | 'settings' | 'voice' | 'vibe' | 'trash'>('stats');
  const [bio, setBio] = useState(user.bio || '');
  const [name, setName] = useState(user.name || '');
  const [isScanningMood, setIsScanningMood] = useState(false);
  const [moodResult, setMoodResult] = useState<{mood: string, color: string, analysis: string} | null>(null);
  const [newPresetName, setNewPresetName] = useState('');
  const [customInviteCode, setCustomInviteCode] = useState(user.customInviteCode || user.id);
  
  const [isScanningUpdate, setIsScanningUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'latest'>('idle');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Live Telemetry State
  const [rpm, setRpm] = useState(1000);
  const [engineTemp, setEngineTemp] = useState(90);
  const [boostPressure, setBoostPressure] = useState(0);

  const THEMES = [
      { name: 'Midnight', color: '#0a192f', hex: '#0a192f' },
      { name: 'Pitch Black', color: '#000000', hex: '#000000' },
      { name: 'Nitro Red', color: '#1a0505', hex: '#1a0505' },
      { name: 'Deep Space', color: '#050b1a', hex: '#050b1a' },
      { name: 'Xenon Purple', color: '#12051a', hex: '#12051a' },
  ];

  const BUBBLE_COLORS = [
      { name: 'Cyan', hex: '#00f3ff' },
      { name: 'Magenta', hex: '#ff003c' },
      { name: 'Lime', hex: '#39ff14' },
      { name: 'Yellow', hex: '#fbff00' },
      { name: 'White', hex: '#ffffff' },
      { name: 'Purple', hex: '#a855f7' },
  ];

  const SOUND_PACKS: {id: SoundPack, label: string}[] = [
      { id: 'standard', label: 'Standard' },
      { id: 'retro', label: '8-Bit Retro' },
      { id: 'clean', label: 'Future Clean' },
  ];

  useEffect(() => {
    if (isOpen && initialActiveTab) setActiveTab(initialActiveTab);
  }, [isOpen, initialActiveTab]);

  useEffect(() => {
    if (activeTab !== 'engine' || !isOpen) return;
    
    const interval = setInterval(() => {
        setRpm(prev => {
            const noise = Math.random() * 50 - 25;
            let next = prev + noise;
            if (Math.random() > 0.98) next = 4000 + Math.random() * 3000;
            if (prev > 1200 && Math.random() > 0.1) next = prev * 0.9;
            return Math.max(800, Math.min(9000, next));
        });
        setEngineTemp(prev => 90 + Math.random() * 2 - 1);
        setBoostPressure(prev => {
             const target = rpm > 3500 ? (rpm - 3500) / 2000 : 0;
             return Math.max(0, prev + (target - prev) * 0.1);
        });
    }, 100);
    return () => clearInterval(interval);
  }, [activeTab, isOpen, rpm]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageToCrop(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const applyCrop = async () => {
    if (imageToCrop && croppedAreaPixels) {
      const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
      onUpdateUser({ avatar: croppedImage });
      setImageToCrop(null);
      if (user.soundEnabled) playUiSound('levelUp');
    }
  };

  const handleSaveProfile = () => {
    onUpdateUser({ name, bio });
    if (user.soundEnabled) playUiSound('levelUp');
    alert("Driver Profile Updated.");
  };

  const handleSaveVoicePreset = () => {
    if (!newPresetName.trim()) return;
    const updatedPresets = { ...user.voicePresets, [newPresetName]: { ...user.voiceFilter } };
    onUpdateUser({ voicePresets: updatedPresets });
    setNewPresetName('');
    if (user.soundEnabled) playUiSound('levelUp');
  };

  const handleLoadPreset = (preset: VoiceFilter) => {
    onUpdateUser({ voiceFilter: { ...preset } });
    if (user.soundEnabled) playUiSound('click');
  };

  const handleScanMood = async () => {
    setIsScanningMood(true);
    await new Promise(r => setTimeout(r, 2000));
    const result = await analyzeRacerMood(bio, "Scanning biometrics.");
    setMoodResult(result);
    onUpdateUser({ mood: result.mood });
    setIsScanningMood(false);
  };

  const handleCheckUpdate = () => {
    setUpdateStatus('checking');
    setIsScanningUpdate(true);
    setTimeout(() => {
        setIsScanningUpdate(false);
        const hasUpdate = Math.random() > 0.7;
        if (hasUpdate) setUpdateStatus('available');
        else setUpdateStatus('latest');
    }, 2000);
  };

  const handleApplyUpdate = () => {
    onUpdateUser({ appVersion: '2.6.0-turbo' });
    setUpdateStatus('latest');
    alert("System Upgraded to v2.6.0-turbo. Rebooting simulation...");
  };

  const handleSaveInviteCode = () => {
      if (customInviteCode.length < 3) return alert("Code too short.");
      onUpdateUser({ customInviteCode });
      playUiSound('levelUp');
  };

  const handleCopyLink = () => {
      const link = `fczone.app/join/${customInviteCode}`;
      navigator.clipboard.writeText(link);
      alert("Invite Link Copied: " + link);
      playUiSound('click');
  };

  const getSpecValue = (val: string) => {
    if (!val) return 0;
    const num = parseFloat(val.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  return (
    <>
      <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 border-l transition-transform duration-500 z-[101] flex flex-col shadow-2xl bg-nitro-black border-nitro-gray ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex border-b border-white/5 bg-nitro-black/30 overflow-x-auto hide-scrollbar">
            {['stats', 'engine', 'voice', 'vibe', 'trash', 'settings'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-4 px-2 text-[8px] font-orbitron font-black uppercase tracking-widest ${activeTab === tab ? 'text-nitro-primary border-b-2 border-nitro-primary' : 'text-gray-500 hover:text-white'}`}>
                    {tab === 'trash' ? 'Salvage' : tab}
                </button>
            ))}
            <button onClick={onClose} className="px-4 text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-8">
            {activeTab === 'stats' && (
                <div className="animate-in slide-in-from-right-4">
                    <div className="flex flex-col items-center p-6 bg-nitro-gray/10 rounded-[40px] border border-white/5 shadow-inner relative group">
                        <div className="relative mb-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => avatarInputRef.current?.click()}>
                            <img src={user.avatar} className="w-28 h-28 rounded-full border-4 border-nitro-cyan shadow-xl object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-full transition-opacity">
                                <ICONS.Plus className="w-8 h-8 text-white" />
                            </div>
                            <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                        </div>
                        <span className="text-[9px] bg-nitro-cyan/20 text-nitro-cyan px-3 py-1 rounded-full font-black uppercase mb-4">{user.badge}</span>
                        
                        <div className="w-full space-y-4">
                            <div className="space-y-1">
                                <label className="text-[8px] font-orbitron font-black uppercase text-gray-500">Callsign</label>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)} 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-nitro-cyan focus:outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-orbitron font-black uppercase text-gray-500">Bio / Mantra</label>
                                <textarea 
                                    value={bio} 
                                    onChange={(e) => setBio(e.target.value)} 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white h-20 resize-none focus:border-nitro-cyan focus:outline-none"
                                />
                            </div>
                            <button onClick={handleSaveProfile} className="w-full py-3 bg-nitro-cyan text-nitro-black font-orbitron font-black uppercase text-[10px] rounded-xl hover:scale-105 active:scale-95 transition-all">Save Profile</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'engine' && (
                <div className="animate-in slide-in-from-right-4 space-y-6">
                    <div className="flex items-center gap-3">
                        <ICONS.Garage className="w-8 h-8 text-nitro-yellow neon-primary" />
                        <h3 className="font-orbitron font-black text-white text-xl uppercase italic">Garage <span className="text-nitro-yellow">Specs</span></h3>
                    </div>
                    
                    <div className="bg-nitro-black/50 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-50">
                            <ICONS.Activity className="w-24 h-24 text-white/5" />
                        </div>
                        <h4 className="font-orbitron font-black text-nitro-cyan uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                             <div className="w-2 h-2 bg-nitro-cyan rounded-full animate-pulse"></div>
                             Live Dyno Telemetry
                        </h4>
                        
                        <div className="grid grid-cols-3 gap-4 text-center">
                             <div className="flex flex-col items-center">
                                 <div className="relative w-20 h-20 rounded-full border-4 border-white/10 flex items-center justify-center bg-black/20">
                                     <svg className="absolute inset-0 w-full h-full -rotate-90">
                                         <circle cx="50%" cy="50%" r="32" stroke="currentColor" strokeWidth="4" fill="none" className="text-white/5" />
                                         <circle cx="50%" cy="50%" r="32" stroke="currentColor" strokeWidth="4" fill="none" 
                                            strokeDasharray="200" 
                                            strokeDashoffset={200 - (200 * (rpm / 9000))} 
                                            strokeLinecap="round"
                                            className={`transition-all duration-100 ${rpm > 7000 ? 'text-nitro-magenta' : 'text-nitro-yellow'}`} 
                                         />
                                     </svg>
                                     <div className="text-center z-10">
                                         <span className="font-orbitron font-bold text-white text-xs block">{Math.round(rpm)}</span>
                                         <span className="text-[8px] text-gray-500 font-black">RPM</span>
                                     </div>
                                 </div>
                             </div>
                             
                             <div className="flex flex-col items-center justify-center bg-black/20 rounded-2xl p-2 border border-white/5">
                                 <span className="font-orbitron font-black text-2xl text-white">{boostPressure.toFixed(1)}</span>
                                 <span className="text-[8px] text-nitro-cyan font-black uppercase tracking-widest">BAR</span>
                                 <div className="w-full h-1.5 bg-white/10 mt-2 rounded-full overflow-hidden">
                                     <div className="h-full bg-nitro-cyan transition-all duration-100" style={{ width: `${(boostPressure / 2.5) * 100}%` }}></div>
                                 </div>
                             </div>

                             <div className="flex flex-col items-center justify-center bg-black/20 rounded-2xl p-2 border border-white/5">
                                 <span className="font-orbitron font-black text-xl text-white">{engineTemp.toFixed(0)}°C</span>
                                 <span className="text-[8px] text-nitro-magenta font-black uppercase tracking-widest">Oil Temp</span>
                             </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                             <div className="flex justify-between items-end mb-2">
                                 <span className="text-[9px] font-black uppercase text-gray-500">Top Speed</span>
                                 <span className="font-orbitron font-black text-white text-lg">{user.engineSpecs?.topSpeed || 'N/A'}</span>
                             </div>
                             <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/5">
                                  <div className="h-full bg-gradient-to-r from-nitro-cyan to-blue-600 shadow-[0_0_10px_var(--nitro-cyan)]" style={{ width: `${Math.min(100, (getSpecValue(user.engineSpecs?.topSpeed || '0') / 400) * 100)}%` }}></div>
                             </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                             <div className="flex justify-between items-end mb-2">
                                 <span className="text-[9px] font-black uppercase text-gray-500">0-100 KM/H</span>
                                 <span className="font-orbitron font-black text-white text-lg">{user.engineSpecs?.acceleration || 'N/A'}</span>
                             </div>
                             <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/5">
                                  <div className="h-full bg-gradient-to-r from-nitro-yellow to-orange-600 shadow-[0_0_10px_var(--nitro-yellow)]" style={{ width: `${Math.max(10, 100 - (getSpecValue(user.engineSpecs?.acceleration || '10') * 8))}%` }}></div>
                             </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                             <div className="flex justify-between items-end mb-2">
                                 <span className="text-[9px] font-black uppercase text-gray-500">N2O Capacity</span>
                                 <span className="font-orbitron font-black text-white text-lg">{user.engineSpecs?.nitrous || 'N/A'}</span>
                             </div>
                             <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/5">
                                  <div className="h-full bg-gradient-to-r from-nitro-green to-emerald-500 animate-pulse shadow-[0_0_10px_var(--nitro-green)]" style={{ width: user.engineSpecs?.nitrous || '0%' }}></div>
                             </div>
                        </div>
                    </div>

                    <div className="bg-nitro-yellow/5 border border-nitro-yellow/20 p-6 rounded-[32px] text-center space-y-4">
                        <ICONS.Tuning className="w-10 h-10 text-nitro-yellow mx-auto" />
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Tuning Bay locked.</p>
                        <p className="text-[9px] text-gray-500 italic">Win 3 more races to unlock custom tuning.</p>
                    </div>
                </div>
            )}

            {activeTab === 'voice' && (
              <div className="animate-in slide-in-from-right-4 space-y-6">
                <h3 className="font-orbitron font-black text-nitro-cyan text-sm uppercase italic tracking-widest">Voice Control Hub</h3>
                
                <div className="glass-panel p-4 rounded-3xl border border-white/5 space-y-4">
                   <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase text-gray-400">System Voice</span>
                        <div className="flex bg-white/5 rounded-lg p-1">
                            <button 
                                onClick={() => onUpdateUser({ voiceGender: 'male' })}
                                className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all ${user.voiceGender === 'male' ? 'bg-nitro-cyan text-nitro-black' : 'text-gray-500'}`}
                            >
                                Male
                            </button>
                            <button 
                                onClick={() => onUpdateUser({ voiceGender: 'female' })}
                                className={`px-3 py-1 rounded text-[9px] font-bold uppercase transition-all ${user.voiceGender === 'female' ? 'bg-nitro-magenta text-white' : 'text-gray-500'}`}
                            >
                                Female
                            </button>
                        </div>
                   </div>
                   <div className="h-[1px] bg-white/5"></div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Preset Name" 
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-nitro-cyan"
                    />
                    <button onClick={handleSaveVoicePreset} className="bg-nitro-cyan text-nitro-black p-2 rounded-xl text-[10px] font-black uppercase hover:bg-white hover:text-black transition-all">Save</button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em]">Stored Presets</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(user.voicePresets || {}).map(name => (
                        <button key={name} onClick={() => handleLoadPreset(user.voicePresets[name])} className="bg-white/5 border border-white/10 p-2 rounded-xl text-[10px] font-bold text-white hover:border-nitro-cyan transition-all">
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'vibe' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 flex flex-col items-center">
                    <h3 className="font-orbitron font-black text-nitro-magenta text-sm uppercase italic tracking-widest self-start">Biometric Vibe Sensor</h3>
                    <div className="w-full bg-nitro-gray/10 border-2 border-dashed border-white/10 rounded-[40px] p-8 flex flex-col items-center justify-center">
                        {isScanningMood ? (
                            <div className="py-10 flex flex-col items-center gap-6">
                                <div className="w-16 h-16 border-t-4 border-nitro-magenta rounded-full animate-spin"></div>
                                <p className="font-orbitron font-black text-[10px] text-nitro-magenta animate-pulse uppercase">Scanning...</p>
                            </div>
                        ) : moodResult ? (
                            <div className="text-center space-y-4">
                                <h4 className="font-orbitron font-black text-2xl uppercase" style={{ color: moodResult.color }}>{moodResult.mood}</h4>
                                <p className="text-xs text-gray-300 italic">"{moodResult.analysis}"</p>
                                <button onClick={handleScanMood} className="text-[9px] font-black text-nitro-magenta uppercase">Recalibrate</button>
                            </div>
                        ) : (
                            <button onClick={handleScanMood} className="px-10 py-4 bg-nitro-magenta text-white font-orbitron font-black uppercase text-xs rounded-2xl">Initiate Scan</button>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'trash' && (
                <div className="animate-in slide-in-from-right-4 space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <ICONS.Trash className="w-8 h-8 text-nitro-magenta neon-primary" />
                            <h3 className="font-orbitron font-black text-white text-sm uppercase italic tracking-widest">Nitro <span className="text-nitro-magenta">Salvage yard</span></h3>
                        </div>
                        {salvagedMessages.length > 0 && (
                            <button 
                                onClick={onEmptySalvage}
                                className="text-[9px] font-black uppercase text-nitro-magenta hover:underline transition-all"
                            >
                                Empty All
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {salvagedMessages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                                <ICONS.Ghost className="w-12 h-12 mb-4" />
                                <p className="font-orbitron text-[10px] uppercase font-black tracking-widest">No Scrap Metal Detected</p>
                            </div>
                        ) : (
                            salvagedMessages.map((msg) => (
                                <div key={msg.id} className="bg-nitro-gray/30 border border-white/5 rounded-2xl p-4 space-y-3 group hover:border-white/20 transition-all">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[8px] font-black uppercase text-nitro-cyan">{msg.senderName}</span>
                                            <p className="text-xs text-gray-300 line-clamp-2 mt-1">{msg.text}</p>
                                            <span className="text-[7px] text-gray-600 font-mono mt-2 block">DELETED: {new Date(msg.deletedAt!).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button 
                                            onClick={() => onRestoreMessage?.(msg.id)}
                                            className="flex-1 py-1.5 bg-nitro-cyan/10 border border-nitro-cyan/30 rounded-lg text-[8px] font-black text-nitro-cyan uppercase hover:bg-nitro-cyan hover:text-nitro-black transition-all flex items-center justify-center gap-1"
                                        >
                                            <ICONS.Nitro className="w-3 h-3" /> Restore
                                        </button>
                                        <button 
                                            onClick={() => onPermanentDelete?.(msg.id)}
                                            className="flex-1 py-1.5 bg-nitro-magenta/10 border border-nitro-magenta/30 rounded-lg text-[8px] font-black text-nitro-magenta uppercase hover:bg-nitro-magenta hover:text-white transition-all flex items-center justify-center gap-1"
                                        >
                                            <ICONS.Trash className="w-3 h-3" /> Incinerate
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    <div className="bg-white/5 rounded-3xl p-4 border border-white/5">
                        <p className="text-[8px] text-gray-500 uppercase italic">SYSTEM NOTE: Salvaged items are kept in memory cache for 24h before automatic grid purging.</p>
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                    <h3 className="font-orbitron font-black text-gray-400 text-sm uppercase italic tracking-widest">System Protocol</h3>
                    
                    <div className="glass-panel p-5 rounded-3xl border border-white/5 space-y-6">
                         <div>
                             <p className="text-[10px] font-black uppercase text-white mb-3">Cockpit Ambience</p>
                             <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                                 {THEMES.map(theme => (
                                     <button 
                                        key={theme.name}
                                        onClick={() => {
                                            onUpdateUser({ themePreference: theme.hex });
                                            playUiSound('click');
                                        }}
                                        className={`flex flex-col items-center gap-2 group min-w-[60px]`}
                                     >
                                         <div className={`w-10 h-10 rounded-full border-2 transition-all ${user.themePreference === theme.hex ? 'border-nitro-cyan scale-110 shadow-[0_0_15px_rgba(0,243,255,0.4)]' : 'border-white/10 group-hover:border-white/50'}`} style={{ backgroundColor: theme.color }}></div>
                                         <span className={`text-[7px] font-black uppercase whitespace-nowrap ${user.themePreference === theme.hex ? 'text-nitro-cyan' : 'text-gray-500'}`}>{theme.name}</span>
                                     </button>
                                 ))}
                             </div>
                         </div>
                         <div>
                             <p className="text-[10px] font-black uppercase text-white mb-3">HUD Color Integration</p>
                             <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                                 {BUBBLE_COLORS.map(color => (
                                     <button 
                                        key={color.name}
                                        onClick={() => {
                                            onUpdateUser({ bubbleColor: color.hex });
                                            playUiSound('click');
                                        }}
                                        className={`flex flex-col items-center gap-2 group min-w-[50px]`}
                                     >
                                         <div className={`w-8 h-8 rounded-full border-2 transition-all ${user.bubbleColor === color.hex ? 'border-white scale-110' : 'border-white/10 group-hover:border-white/50'}`} style={{ backgroundColor: color.hex }}></div>
                                         <span className="text-[7px] font-black uppercase text-gray-500">{color.name}</span>
                                     </button>
                                 ))}
                             </div>
                         </div>
                         <div>
                             <p className="text-[10px] font-black uppercase text-white mb-3">Sound Profile</p>
                             <div className="grid grid-cols-3 gap-2">
                                 {SOUND_PACKS.map(pack => (
                                     <button 
                                        key={pack.id}
                                        onClick={() => {
                                            onUpdateUser({ soundPack: pack.id });
                                            playUiSound('click', pack.id);
                                        }}
                                        className={`py-2 px-1 rounded-xl text-[9px] font-black uppercase border transition-all ${user.soundPack === pack.id ? 'bg-nitro-cyan/20 border-nitro-cyan text-nitro-cyan' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}
                                     >
                                         {pack.label}
                                     </button>
                                 ))}
                             </div>
                         </div>
                         <div className="h-[1px] bg-white/5"></div>
                         <div>
                             <p className="text-[10px] font-black uppercase text-white mb-2">Custom Invite Uplink</p>
                             <div className="flex gap-2">
                                 <div className="flex-1 bg-white/5 border border-white/10 rounded-xl flex items-center px-3">
                                     <span className="text-[9px] text-gray-500 font-mono">fczone.app/join/</span>
                                     <input 
                                        type="text" 
                                        value={customInviteCode}
                                        onChange={(e) => setCustomInviteCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                                        className="bg-transparent text-white text-[10px] font-bold w-full focus:outline-none py-3"
                                        placeholder="CODE"
                                     />
                                 </div>
                                 <button onClick={handleSaveInviteCode} className="px-3 bg-nitro-cyan text-nitro-black rounded-xl font-black text-[9px] uppercase hover:brightness-110 transition-all">Save</button>
                                 <button onClick={handleCopyLink} className="px-3 bg-white/10 text-white border border-white/20 rounded-xl hover:bg-white/20 transition-all" title="Copy Link"><ICONS.Link className="w-4 h-4" /></button>
                             </div>
                         </div>
                         <div className="h-[1px] bg-white/5"></div>
                         <div className="flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black uppercase text-white">Stealth Mode</p>
                                <p className="text-[8px] text-gray-500">Enable low-profile interface for night ops.</p>
                            </div>
                            <button 
                                onClick={() => onUpdateUser({ stealthMode: !user.stealthMode })}
                                className={`w-10 h-5 rounded-full transition-all relative ${user.stealthMode ? 'bg-nitro-magenta' : 'bg-white/10'}`}
                            >
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${user.stealthMode ? 'translate-x-5' : ''}`}></div>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-white">Auto-Transcribe Voice</p>
                                    <p className="text-[8px] text-gray-500">Automatically read incoming voice comms.</p>
                                </div>
                                <button 
                                    onClick={() => onUpdateUser({ autoReadVoice: !user.autoReadVoice })}
                                    className={`w-10 h-5 rounded-full transition-all relative ${user.autoReadVoice ? 'bg-nitro-cyan' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${user.autoReadVoice ? 'translate-x-5' : ''}`}></div>
                                </button>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-white">Auto-Read Text Messages</p>
                                    <p className="text-[8px] text-gray-500">Enable TTS for all incoming text messages.</p>
                                </div>
                                <button 
                                    onClick={() => onUpdateUser({ autoReadText: !user.autoReadText })}
                                    className={`w-10 h-5 rounded-full transition-all relative ${user.autoReadText ? 'bg-nitro-cyan' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${user.autoReadText ? 'translate-x-5' : ''}`}></div>
                                </button>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-white">Auto-Analyze Docs</p>
                                    <p className="text-[8px] text-gray-500">Use Nitro AI to scan file uploads instantly.</p>
                                </div>
                                <button 
                                    onClick={() => onUpdateUser({ autoReadDocuments: !user.autoReadDocuments })}
                                    className={`w-10 h-5 rounded-full transition-all relative ${user.autoReadDocuments ? 'bg-nitro-cyan' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${user.autoReadDocuments ? 'translate-x-5' : ''}`}></div>
                                </button>
                            </div>
                        </div>
                        <div className="h-[1px] bg-white/5"></div>
                        <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[9px] font-black uppercase text-gray-400">Current Version</span>
                                <span className="font-orbitron font-bold text-nitro-cyan text-xs">{user.appVersion || '2.5.0'}</span>
                            </div>
                            {updateStatus === 'idle' && (
                                <button onClick={handleCheckUpdate} className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase text-gray-300 transition-all">
                                    Scan Grid for Updates
                                </button>
                            )}
                            {updateStatus === 'checking' && (
                                <div className="w-full py-3 flex items-center justify-center gap-2 text-nitro-cyan">
                                    <div className="w-3 h-3 border-2 border-nitro-cyan border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-[9px] font-black uppercase">Scanning Network...</span>
                                </div>
                            )}
                            {updateStatus === 'available' && (
                                <button onClick={handleApplyUpdate} className="w-full py-3 bg-nitro-green text-nitro-black rounded-xl text-[9px] font-black uppercase shadow-[0_0_15px_rgba(57,255,20,0.3)] animate-pulse">
                                    Install Patch v2.6.0
                                </button>
                            )}
                            {updateStatus === 'latest' && (
                                <div className="w-full py-3 text-center bg-nitro-cyan/10 rounded-xl border border-nitro-cyan/30">
                                    <span className="text-[9px] font-black uppercase text-nitro-cyan">System Optimized</span>
                                </div>
                            )}
                        </div>
                        {onUpgrade && (
                            <button onClick={onUpgrade} className="w-full py-4 mt-2 bg-gradient-to-r from-nitro-magenta to-purple-600 text-white font-orbitron font-black uppercase rounded-2xl shadow-lg hover:brightness-110 transition-all">
                                Upgrade to Marketer Pro
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>

      {imageToCrop && (
        <div className="fixed inset-0 z-[1000] bg-nitro-black flex flex-col animate-in fade-in duration-300">
          <div className="flex-1 relative bg-black/50">
            <Cropper 
                image={imageToCrop} 
                crop={crop} 
                zoom={zoom} 
                aspect={1} 
                cropShape="round" 
                showGrid={true}
                onCropChange={setCrop} 
                onZoomChange={setZoom} 
                onCropComplete={onCropComplete} 
            />
          </div>
          <div className="p-8 glass-panel flex flex-col items-center gap-6 border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <h3 className="font-orbitron font-black text-white text-lg uppercase tracking-widest">Adjust Avatar</h3>
            <div className="w-full px-4">
                <input 
                    type="range" 
                    min={1} 
                    max={3} 
                    step={0.1} 
                    value={zoom} 
                    onChange={(e) => setZoom(Number(e.target.value))} 
                    className="w-full accent-nitro-cyan h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" 
                />
            </div>
            <div className="w-full grid grid-cols-2 gap-4">
              <button onClick={() => setImageToCrop(null)} className="py-4 border border-white/10 text-gray-400 font-orbitron font-black uppercase text-[10px] rounded-2xl hover:text-white hover:bg-white/5 transition-all">Abort</button>
              <button onClick={applyCrop} className="py-4 bg-nitro-cyan text-nitro-black font-orbitron font-black uppercase text-[10px] rounded-2xl shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:scale-105 active:scale-95 transition-all">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
