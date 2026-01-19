
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { User, VoiceFilter } from '../types';
import { ICONS } from '../constants';
import { playUiSound } from '../services/audioService';
import { analyzeRacerMood } from '../services/geminiService';

interface DashboardProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  isLightMode: boolean;
  onUpgrade?: (plan: string) => void;
  onUpdateUser?: (updated: Partial<User>) => void;
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

const Dashboard: React.FC<DashboardProps> = ({ user, isOpen, onClose, isLightMode, onUpgrade, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'engine' | 'privacy' | 'voice' | 'vibe'>('stats');
  const [bio, setBio] = useState(user.bio || '');
  const [isScanningMood, setIsScanningMood] = useState(false);
  const [moodResult, setMoodResult] = useState<{mood: string, color: string, analysis: string} | null>(null);
  const [newPresetName, setNewPresetName] = useState('');
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

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
      onUpdateUser?.({ avatar: croppedImage });
      setImageToCrop(null);
    }
  };

  const handleSaveVoicePreset = () => {
    if (!newPresetName.trim()) return;
    const updatedPresets = { ...user.voicePresets, [newPresetName]: { ...user.voiceFilter } };
    onUpdateUser?.({ voicePresets: updatedPresets });
    setNewPresetName('');
    if (user.soundEnabled) playUiSound('levelUp');
  };

  const handleLoadPreset = (preset: VoiceFilter) => {
    onUpdateUser?.({ voiceFilter: { ...preset } });
    if (user.soundEnabled) playUiSound('click');
  };

  const handleScanMood = async () => {
    setIsScanningMood(true);
    await new Promise(r => setTimeout(r, 2000));
    const result = await analyzeRacerMood(bio, "Scanning biometrics.");
    setMoodResult(result);
    onUpdateUser?.({ mood: result.mood });
    setIsScanningMood(false);
  };

  return (
    <>
      <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 border-l transition-transform duration-500 z-[101] flex flex-col shadow-2xl bg-nitro-black border-nitro-gray ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex border-b border-white/5 bg-nitro-black/30 overflow-x-auto hide-scrollbar">
            {['stats', 'engine', 'voice', 'vibe', 'privacy'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-4 px-2 text-[8px] font-orbitron font-black uppercase tracking-widest ${activeTab === tab ? 'text-nitro-primary border-b-2 border-nitro-primary' : 'text-gray-500'}`}>
                    {tab}
                </button>
            ))}
            <button onClick={onClose} className="px-4 text-gray-400">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar p-6 space-y-8">
            {activeTab === 'stats' && (
                <div className="animate-in slide-in-from-right-4">
                    <div className="flex flex-col items-center p-6 bg-nitro-gray/10 rounded-[40px] border border-white/5 shadow-inner">
                        <div className="relative mb-4 group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                            <img src={user.avatar} className="w-28 h-28 rounded-full border-4 border-nitro-cyan shadow-xl object-cover" />
                            <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                        </div>
                        <h4 className="font-bold text-2xl text-white">{user.name}</h4>
                        <span className="text-[9px] bg-nitro-cyan/20 text-nitro-cyan px-3 py-1 rounded-full font-black uppercase mt-2">{user.badge}</span>
                        <p className="mt-4 text-xs text-gray-400 italic text-center">"{user.bio}"</p>
                    </div>
                </div>
            )}

            {activeTab === 'voice' && (
              <div className="animate-in slide-in-from-right-4 space-y-6">
                <h3 className="font-orbitron font-black text-nitro-cyan text-sm uppercase italic tracking-widest">Voice Control Hub</h3>
                <div className="glass-panel p-4 rounded-3xl border border-white/5 space-y-4">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Preset Name" 
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl p-2 text-xs text-white"
                    />
                    <button onClick={handleSaveVoicePreset} className="bg-nitro-cyan text-nitro-black p-2 rounded-xl text-[10px] font-black uppercase">Save</button>
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
        </div>
      </div>

      {imageToCrop && (
        <div className="fixed inset-0 z-[1000] bg-nitro-black flex flex-col">
          <div className="flex-1 relative"><Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={1} cropShape="round" onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} /></div>
          <div className="p-8 glass-panel flex flex-col items-center gap-4">
            <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-nitro-cyan" />
            <div className="w-full grid grid-cols-2 gap-4">
              <button onClick={() => setImageToCrop(null)} className="py-4 border border-white/10 text-gray-500 font-orbitron font-black uppercase text-[10px] rounded-2xl">Abort</button>
              <button onClick={applyCrop} className="py-4 bg-nitro-cyan text-nitro-black font-orbitron font-black uppercase text-[10px] rounded-2xl">Apply</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
