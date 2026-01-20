
import React, { useState, useEffect } from 'react';

interface LocationScannerProps {
  active: boolean;
  data: { lat: string; lng: string; dist: string } | null;
}

const LocationScanner: React.FC<LocationScannerProps> = ({ active, data }) => {
  const [scannedPoints, setScannedPoints] = useState<{ x: number; y: number; id: number }[]>([]);

  useEffect(() => {
    if (active && !data) {
      const interval = setInterval(() => {
        setScannedPoints((prev) => [
          ...prev.slice(-4),
          { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10, id: Date.now() },
        ]);
      }, 700);
      return () => clearInterval(interval);
    } else if (!active) {
      setScannedPoints([]);
    }
  }, [active, data]);

  if (!active) return null;

  return (
    <div className="absolute inset-0 z-[45] pointer-events-none overflow-hidden flex items-center justify-center bg-nitro-black/30 backdrop-blur-sm animate-in fade-in duration-500">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-20" style={{ 
        backgroundImage: 'linear-gradient(var(--nitro-cyan) 1px, transparent 1px), linear-gradient(90deg, var(--nitro-cyan) 1px, transparent 1px)', 
        backgroundSize: '60px 60px' 
      }}></div>

      {/* Radar Container */}
      <div className="relative w-[70vh] h-[70vh] max-w-[90vw] max-h-[90vw] border-2 border-nitro-cyan/20 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(0,243,255,0.1)]">
        {/* Concentric Circles */}
        <div className="absolute inset-0 border border-nitro-cyan/10 rounded-full scale-[0.75]"></div>
        <div className="absolute inset-0 border border-nitro-cyan/10 rounded-full scale-[0.5]"></div>
        <div className="absolute inset-0 border border-nitro-cyan/10 rounded-full scale-[0.25]"></div>
        
        {/* Axis Lines */}
        <div className="absolute w-full h-[1px] bg-nitro-cyan/10"></div>
        <div className="absolute h-full w-[1px] bg-nitro-cyan/10"></div>

        {/* Sweep Line Visual */}
        {!data && (
            <div className="absolute w-1/2 h-[100px] bg-gradient-to-t from-nitro-cyan/40 to-transparent origin-bottom animate-[radar-spin_4s_linear_infinite] bottom-1/2 left-1/2" 
                 style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}></div>
        )}

        {/* Floating Blips */}
        {scannedPoints.map((p) => (
          <div 
            key={p.id}
            className="absolute w-2 h-2 bg-nitro-cyan rounded-full animate-ping shadow-[0_0_10px_var(--nitro-cyan)]"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          ></div>
        ))}

        {/* Target Locked Asset */}
        {data && (
          <div className="absolute flex flex-col items-center gap-3 animate-in zoom-in duration-500 ease-out" style={{ left: '55%', top: '35%' }}>
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-2 border-nitro-magenta animate-[spin_2s_linear_infinite]"></div>
                <div className="absolute inset-[-4px] border-t-2 border-nitro-magenta/50"></div>
                <div className="absolute inset-[-4px] border-b-2 border-nitro-magenta/50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-nitro-magenta rounded-full shadow-[0_0_15px_var(--nitro-magenta)] animate-pulse"></div>
                </div>
            </div>
            <div className="bg-nitro-magenta/90 border border-white/20 px-4 py-2 rounded-xl backdrop-blur-xl shadow-[0_0_30px_rgba(255,0,60,0.5)]">
                <p className="text-[10px] font-orbitron font-black text-white uppercase tracking-widest text-center">SIGNAL LOCKED</p>
                <div className="h-[1px] bg-white/20 my-1"></div>
                <p className="text-[8px] font-mono text-white/80 text-center">{data.lat} N, {data.lng} W</p>
                <p className="text-[8px] font-mono text-nitro-yellow mt-1 text-center font-bold italic">REACH: {data.dist}</p>
            </div>
          </div>
        )}
      </div>

      {/* Floating HUD Elements */}
      <div className="absolute top-24 left-12 max-w-[180px] space-y-4">
        <div className="space-y-1">
            <div className="flex justify-between items-end">
                <span className="text-[7px] text-nitro-cyan font-black uppercase">Buffer Status</span>
                <span className="text-[7px] text-white/40 font-mono">142 kbps</span>
            </div>
            <div className="h-1 w-full bg-nitro-cyan/20 rounded-full overflow-hidden">
                <div className="h-full bg-nitro-cyan animate-[loading_2s_ease-in-out_infinite]"></div>
            </div>
        </div>
        <div className="text-[7px] font-mono text-nitro-cyan/60 space-y-1 uppercase bg-nitro-cyan/5 p-3 rounded-lg border border-nitro-cyan/10">
            <p className="flex justify-between"><span>SECTOR_ID:</span> <span>GRID_9</span></p>
            <p className="flex justify-between"><span>LATENCY:</span> <span>8ms</span></p>
            <p className="flex justify-between"><span>FREQ:</span> <span>5.4GHz</span></p>
            <p className="flex justify-between"><span>STATUS:</span> <span className="text-nitro-green">SYNCED</span></p>
        </div>
      </div>

      <div className="absolute bottom-32 right-12 text-right space-y-4">
        <div className="space-y-1">
            <p className="text-[8px] font-orbitron text-nitro-magenta font-black uppercase italic">Scanning Sector Ops</p>
            <div className="h-1 w-40 bg-nitro-magenta/20 rounded-full overflow-hidden ml-auto">
                <div className="h-full bg-nitro-magenta animate-[loading_3s_ease-in-out_infinite_reverse]"></div>
            </div>
        </div>
        <div className="text-[7px] font-mono text-white/30 tracking-[0.2em] uppercase leading-tight">
            DECRYPTING DATA PACKETS...<br/>
            BYPASSING ENCRYPTION GRID...<br/>
            UPLINK_NODE: 0x2A991
        </div>
      </div>

      <style>{`
        @keyframes radar-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default LocationScanner;
