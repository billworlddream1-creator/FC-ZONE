
import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { fetchCategoryIntel } from '../services/geminiService';
import { playUiSound } from '../services/audioService';

type GossipCategory = 'all' | 'news' | 'tech' | 'celeb' | 'sports';

const GossipView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<GossipCategory>('all');
  const [intelData, setIntelData] = useState<Record<GossipCategory, string>>({
    all: '',
    news: '',
    tech: '',
    celeb: '',
    sports: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const categories = [
    { id: 'all', label: 'Sector Feed', icon: <ICONS.Flag className="w-4 h-4" /> },
    { id: 'news', label: 'Global News', icon: <ICONS.Map className="w-4 h-4" /> },
    { id: 'tech', label: 'Tech & Tuning', icon: <ICONS.Tuning className="w-4 h-4" /> },
    { id: 'celeb', label: 'VIP / Celeb', icon: <ICONS.Users className="w-4 h-4" /> },
    { id: 'sports', label: 'Live Arena', icon: <ICONS.Trophy className="w-4 h-4" /> },
  ];

  const loadIntel = async (cat: GossipCategory) => {
    setIsLoading(true);
    const data = await fetchCategoryIntel(cat);
    setIntelData(prev => ({ ...prev, [cat]: data }));
    setIsLoading(false);
  };

  useEffect(() => {
    loadIntel(activeCategory);
  }, [activeCategory]);

  const handleCategoryChange = (cat: GossipCategory) => {
    setActiveCategory(cat);
    playUiSound('click');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-nitro-black overflow-hidden animate-in slide-in-from-right-4 duration-500">
      {/* Category Header */}
      <div className="p-6 pb-2 space-y-2">
        <h2 className="font-orbitron font-black text-3xl text-white italic tracking-tighter uppercase">
          Nitro <span className="text-nitro-magenta">Gossip</span>
        </h2>
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em]">
          Classified Intel & Real-Time Performance Analytics.
        </p>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-white/5 bg-black/20 p-2 overflow-x-auto hide-scrollbar gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id as GossipCategory)}
            className={`flex items-center gap-2 py-3 px-5 rounded-xl font-orbitron font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap border ${
              activeCategory === cat.id
                ? 'bg-nitro-magenta border-nitro-magenta text-white shadow-nitro-magenta'
                : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10'
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Intel Feed Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-12 h-12 border-4 border-nitro-magenta border-t-transparent rounded-full animate-spin"></div>
            <p className="font-orbitron text-[10px] text-nitro-magenta animate-pulse uppercase font-black tracking-[0.3em]">Decrypting Uplink...</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            {activeCategory === 'sports' && (
              <div className="mb-8 p-6 bg-nitro-magenta/10 border-2 border-nitro-magenta/30 rounded-[40px] relative overflow-hidden">
                <div className="absolute top-4 right-6 flex items-center gap-2">
                   <div className="w-2 h-2 bg-nitro-magenta rounded-full animate-ping"></div>
                   <span className="text-[10px] font-black text-nitro-magenta uppercase">LIVE PERFORMANCE ANALYSIS</span>
                </div>
                <h3 className="font-orbitron font-black text-white text-lg uppercase mb-4 italic">Real-Time Grid Scores</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 p-4 rounded-3xl border border-white/5 text-center">
                    <p className="text-[9px] text-gray-500 uppercase font-black mb-1">Top Speed Leader</p>
                    <p className="text-nitro-cyan font-orbitron font-black text-xl">382 KM/H</p>
                    <p className="text-[8px] text-nitro-cyan/60 uppercase">D. Toretto</p>
                  </div>
                  <div className="bg-black/40 p-4 rounded-3xl border border-white/5 text-center">
                    <p className="text-[9px] text-gray-500 uppercase font-black mb-1">Drift Angle Peak</p>
                    <p className="text-nitro-yellow font-orbitron font-black text-xl">64.2°</p>
                    <p className="text-[8px] text-nitro-yellow/60 uppercase">Nitro Rider (You)</p>
                  </div>
                </div>
              </div>
            )}

            <div className="prose prose-invert max-w-none">
               <div className="bg-nitro-gray/30 rounded-[40px] p-8 border border-white/5 relative overflow-hidden">
                  <div className="absolute -top-10 -left-10 w-40 h-40 bg-nitro-magenta/5 blur-[80px] rounded-full"></div>
                  <div className="relative z-10 space-y-6">
                    {intelData[activeCategory] ? (
                      intelData[activeCategory].split('\n').map((line, idx) => (
                        <div key={idx} className="flex items-start gap-4 animate-in slide-in-from-left duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                          <div className="mt-1.5 w-2 h-2 bg-nitro-magenta rounded-full shadow-[0_0_8px_var(--nitro-magenta)] flex-shrink-0"></div>
                          <p className="text-sm text-gray-300 leading-relaxed font-medium">
                            {line.startsWith('*') || line.startsWith('-') ? line.substring(1).trim() : line}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-center italic text-gray-500 text-xs">Waiting for Intel Packet...</p>
                    )}
                  </div>
               </div>
            </div>

            {/* AI Whisper Box */}
            <div className="mt-8 bg-black/40 border-2 border-dashed border-white/5 p-8 rounded-[40px] text-center space-y-6">
              <div className="w-16 h-16 bg-nitro-magenta/10 rounded-full flex items-center justify-center mx-auto">
                  <ICONS.Ai className="w-8 h-8 text-nitro-magenta animate-pulse" />
              </div>
              <div className="space-y-2">
                  <h4 className="font-orbitron font-black text-white uppercase tracking-widest">Query Nitro Intelligence</h4>
                  <p className="text-[10px] text-gray-500 uppercase">Input encrypted intel for custom high-octane analysis.</p>
              </div>
              <div className="relative">
                  <input type="text" placeholder={`Ask about ${activeCategory} intel...`} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-nitro-magenta transition-all" />
                  <button className="absolute right-3 top-2.5 p-1.5 bg-nitro-magenta text-white rounded-lg shadow-lg hover:scale-110 active:scale-95 transition-all">
                    <ICONS.Send className="w-4 h-4" />
                  </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GossipView;
