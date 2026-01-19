
import React, { useState, useEffect, useRef } from 'react';
import { ICONS } from '../constants';

interface CallOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

type ARFilter = 'none' | 'helmet' | 'visor' | 'neon';

const CallOverlay: React.FC<CallOverlayProps> = ({ isOpen, onClose, userName }) => {
  const [activeFilter, setActiveFilter] = useState<ARFilter>('none');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let currentStream: MediaStream | null = null;

    const startMedia = async () => {
      try {
        // Attempt to get both video and audio with reasonable constraints
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        currentStream = s;
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
        setMediaError(null);
      } catch (err: any) {
        console.warn("Primary media acquisition failed, trying audio fallback:", err);
        
        // Handle specific errors for user feedback
        if (err.name === 'NotAllowedError') {
          setMediaError("Camera/Mic access denied. Enable permissions in settings.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          // If both fail, try just audio as a last ditch
          try {
            const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
            currentStream = audioOnly;
            setStream(audioOnly);
            setMediaError("Camera hardware not found. Audio only connection active.");
          } catch (audioErr: any) {
            setMediaError("Hardware Error: No media devices detected.");
          }
        } else {
          setMediaError("Connection Error: Unable to sync media hardware.");
        }
      }
    };

    if (isOpen) {
      startMedia();
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setStream(null);
      setMediaError(null);
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center animate-in fade-in duration-500">
      {/* Video Stream / UI Feedback */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {stream && !mediaError?.includes("not found") ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover transition-all duration-500 ${activeFilter === 'neon' ? 'hue-rotate-90 brightness-125 saturate-150' : ''}`}
          />
        ) : (
          <div className="w-full h-full bg-nitro-gray flex flex-col items-center justify-center p-10 text-center">
            <div className="w-32 h-32 bg-nitro-black rounded-full flex items-center justify-center mb-6 border-2 border-nitro-primary/20 shadow-nitro-primary/10">
              <ICONS.Users className="w-16 h-16 text-nitro-primary/40" />
            </div>
            <p className="text-gray-500 font-orbitron uppercase tracking-widest text-sm mb-2 italic">Signal Fragmented</p>
            {mediaError && (
              <div className="bg-nitro-magenta/10 border border-nitro-magenta/30 px-4 py-2 rounded-xl">
                <p className="text-nitro-magenta font-bold text-[10px] uppercase tracking-tighter animate-pulse">{mediaError}</p>
              </div>
            )}
          </div>
        )}

        {/* AR FILTER OVERLAYS */}
        {stream && activeFilter === 'helmet' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full text-nitro-black opacity-90">
              <path fill="currentColor" d="M0 0h100v100H0zM15 25c0-10 10-15 35-15s35 5 35 15v30c0 10-10 15-35 15s-35-5-35-15V25z" fillRule="evenodd" clipRule="evenodd" />
              <rect x="20" y="30" width="60" height="20" rx="5" fill="none" stroke="rgba(0,243,255,0.3)" strokeWidth="0.5" />
            </svg>
            <div className="absolute top-[28%] left-1/2 -translate-x-1/2 text-[8px] font-orbitron text-nitro-cyan animate-pulse">VISOR LOCK ACTIVE</div>
          </div>
        )}

        {activeFilter === 'visor' && (
          <div className="absolute inset-0 pointer-events-none p-10 flex flex-col justify-between border-[20px] border-nitro-black/40">
            <div className="flex justify-between items-start">
              <div className="bg-nitro-magenta/20 p-2 rounded border border-nitro-magenta text-nitro-magenta font-orbitron text-[10px] italic">
                RPM: 8500
              </div>
              <div className="text-right">
                <div className="text-nitro-cyan font-orbitron text-[10px]">TEMP: OPTIMAL</div>
                <div className="text-nitro-green font-orbitron text-[12px] animate-pulse">NITRO: READY</div>
              </div>
            </div>
            <div className="flex justify-center items-end pb-20">
              <div className="relative w-40 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-nitro-cyan w-3/4 animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

        {activeFilter === 'neon' && (
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(255,0,60,0.5)] animate-pulse border-4 border-nitro-magenta/30"></div>
        )}

        {/* Call Info Overlay */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center z-20">
          <h2 className="text-white font-orbitron font-black text-xl tracking-widest drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] uppercase italic">{userName}</h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_var(--nitro-green)] ${mediaError ? 'bg-nitro-yellow' : 'bg-nitro-green'}`}></div>
            <span className={`${mediaError ? 'text-nitro-yellow' : 'text-nitro-green'} font-orbitron text-[10px] uppercase tracking-tighter`}>
              {mediaError ? 'Secondary Link Active' : 'Encrypted Connection'}
            </span>
          </div>
        </div>

        {/* Controls Container */}
        <div className="absolute bottom-12 flex items-center gap-6 z-30">
          <button 
            onClick={() => setActiveFilter(f => f === 'none' ? 'helmet' : f === 'helmet' ? 'visor' : f === 'visor' ? 'neon' : 'none')}
            disabled={!stream}
            className={`p-4 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-white transition-all group relative ${!stream ? 'opacity-20 cursor-not-allowed' : 'hover:bg-nitro-cyan hover:text-nitro-black shadow-nitro-primary/10'}`}
            title="Toggle AR Filters"
          >
            <ICONS.Nitro className={`w-6 h-6 ${stream ? 'group-hover:animate-spin' : ''}`} />
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-[8px] font-orbitron bg-nitro-black/80 px-2 py-1 rounded text-nitro-cyan whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">AR FILTERS</span>
          </button>

          <button 
            onClick={onClose}
            className="p-6 rounded-full bg-nitro-magenta text-white shadow-[0_0_30px_rgba(255,0,60,0.5)] hover:scale-110 active:scale-90 transition-all border-2 border-white/20"
            title="End Call"
          >
            <ICONS.Phone className="w-8 h-8 rotate-[135deg]" />
          </button>

          <button className="p-4 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-white hover:bg-white/20 transition-all">
            <ICONS.Mic className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallOverlay;
