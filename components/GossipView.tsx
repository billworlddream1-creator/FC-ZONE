
import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { fetchCategoryIntel, smartSearch, smartZoneQuery, fetchLiveSportsData } from '../services/geminiService';
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
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResponse, setSearchResponse] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Smart Zone state
  const [smartZoneInput, setSmartZoneInput] = useState('');
  const [smartZoneResponse, setSmartZoneResponse] = useState<string | null>(null);
  const [isSmartZoneLoading, setIsSmartZoneLoading] = useState(false);

  // Sports Scores state
  const [liveScores, setLiveScores] = useState<string | null>(null);
  const [isScoresLoading, setIsScoresLoading] = useState(false);

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

  const handleRefreshScores = async () => {
    setIsScoresLoading(true);
    playUiSound('click');
    const data = await fetchLiveSportsData();
    setLiveScores(data);
    setIsScoresLoading(false);
  };

  useEffect(() => {
    loadIntel(activeCategory);
    if (activeCategory === 'sports' && !liveScores) {
        handleRefreshScores();
    }
  }, [activeCategory]);

  const handleCategoryChange = (cat: GossipCategory) => {
    setActiveCategory(cat);
    setSearchResponse(null);
    setSearchQuery('');
    playUiSound('click');
  };

  const handleSmartSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    playUiSound('click');
    const res = await smartSearch(searchQuery);
    setSearchResponse(res);
    setIsSearching(false);
  };

  const handleSmartZone = async () => {
    if (!smartZoneInput.trim()) return;
    setIsSmartZoneLoading(true);
    playUiSound('nitro');
    const res = await smartZoneQuery(smartZoneInput);
    setSmartZoneResponse(res);
    setIsSmartZoneLoading(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    playUiSound('click');
    alert("Encrypted data copied to clipboard.");
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
      <div className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-12 h-12 border-4 border-nitro-magenta border-t-transparent rounded-full animate-spin"></div>
            <p className="font-orbitron text-[10px] text-nitro-magenta animate-pulse uppercase font-black tracking-[0.3em]">Decrypting Uplink...</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300 space-y-8">
            
            {activeCategory === 'sports' && (
              <div className="p-6 bg-nitro-magenta/10 border-2 border-nitro-magenta/30 rounded-[40px] relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 bg-nitro-magenta rounded-full animate-ping"></div>
                     <span className="text-[10px] font-black text-nitro-magenta uppercase">LIVE PERFORMANCE ARENA</span>
                  </div>
                  <button 
                    onClick={handleRefreshScores}
                    disabled={isScoresLoading}
                    className="p-2 hover:bg-white/10 rounded-full transition-all text-nitro-magenta"
                  >
                    <ICONS.Shuffle className={`w-4 h-4 ${isScoresLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                
                <div className="bg-black/40 p-6 rounded-3xl border border-white/5 space-y-4">
                   {isScoresLoading ? (
                       <div className="space-y-2">
                           <div className="h-3 w-full bg-white/5 rounded animate-pulse"></div>
                           <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse"></div>
                       </div>
                   ) : liveScores ? (
                       <div className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">
                           {liveScores}
                       </div>
                   ) : (
                       <p className="text-xs text-gray-500 italic">No score data cached. Refresh uplink.</p>
                   )}
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

            {/* Smart Zone tool section */}
            <div className="bg-nitro-cyan/5 border border-nitro-cyan/30 p-8 rounded-[40px] space-y-6">
               <div className="flex items-center gap-3">
                  <ICONS.Nitro className="w-8 h-8 text-nitro-cyan" />
                  <h3 className="font-orbitron font-black text-white text-xl uppercase italic">Smart <span className="text-nitro-cyan">Zone Uplink</span></h3>
               </div>
               <p className="text-[10px] text-gray-500 uppercase tracking-widest">Logic Engine: Math / Riddles / Word Checks</p>
               
               <div className="relative">
                  <textarea 
                    value={smartZoneInput}
                    onChange={(e) => setSmartZoneInput(e.target.value)}
                    placeholder="Input math problem, riddle, or word to verify..."
                    className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-sm text-white h-24 resize-none focus:border-nitro-cyan focus:outline-none transition-all placeholder:text-gray-700"
                  />
                  <button 
                    onClick={handleSmartZone}
                    disabled={isSmartZoneLoading || !smartZoneInput.trim()}
                    className="absolute bottom-4 right-4 bg-nitro-cyan text-nitro-black px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
                  >
                    {isSmartZoneLoading ? 'Computing...' : 'Solve'}
                  </button>
               </div>

               {smartZoneResponse && (
                   <div className="bg-black/60 border border-nitro-cyan/20 rounded-2xl p-5 animate-in zoom-in-95 duration-200">
                       <div className="flex justify-between items-start mb-3">
                            <span className="text-[8px] font-orbitron font-black text-nitro-cyan uppercase tracking-widest">Uplink Result</span>
                            <button 
                                onClick={() => handleCopy(smartZoneResponse)}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-nitro-cyan"
                                title="Copy Solution"
                            >
                                <ICONS.Copy className="w-4 h-4" />
                            </button>
                       </div>
                       <div className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                           {smartZoneResponse}
                       </div>
                   </div>
               )}
            </div>

            {/* AI Search Box */}
            <div className="bg-black/40 border-2 border-dashed border-white/5 p-8 rounded-[40px] text-center space-y-6">
              <div className="w-16 h-16 bg-nitro-magenta/10 rounded-full flex items-center justify-center mx-auto">
                  <ICONS.Ai className={`w-8 h-8 text-nitro-magenta ${isSearching ? 'animate-spin' : 'animate-pulse'}`} />
              </div>
              <div className="space-y-2">
                  <h4 className="font-orbitron font-black text-white uppercase tracking-widest">Grid Search Scanner</h4>
                  <p className="text-[10px] text-gray-500 uppercase">Universal category query for deep-net insights.</p>
              </div>
              <div className="relative">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSmartSearch()}
                    placeholder={`Query the grid about ${activeCategory}...`} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-nitro-magenta transition-all" 
                  />
                  <button 
                    onClick={handleSmartSearch}
                    disabled={isSearching}
                    className="absolute right-3 top-2.5 p-1.5 bg-nitro-magenta text-white rounded-lg shadow-lg hover:scale-110 active:scale-95 transition-all"
                  >
                    <ICONS.Send className="w-4 h-4" />
                  </button>
              </div>

              {searchResponse && (
                  <div className="bg-nitro-magenta/5 border border-nitro-magenta/20 rounded-2xl p-6 text-left animate-in slide-in-from-top-4 duration-300">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[8px] font-orbitron font-black text-nitro-magenta uppercase tracking-widest italic">Intelligence Report</span>
                        <button onClick={() => handleCopy(searchResponse)} className="text-nitro-magenta hover:text-white p-1"><ICONS.Copy className="w-3 h-3" /></button>
                      </div>
                      <p className="text-xs text-gray-300 italic">"{searchResponse}"</p>
                  </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default GossipView;
