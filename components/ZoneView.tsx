
import React, { useState } from 'react';
import { ICONS, MOCK_ROOMS, MOCK_CHALLENGES } from '../constants';
import { Room, RaceChallenge } from '../types';

interface ZoneViewProps {
  isLightMode: boolean;
  onJoinRoom: (room: Room) => void;
  onJoinChallenge: (challenge: RaceChallenge) => void;
}

const ZoneView: React.FC<ZoneViewProps> = ({ isLightMode, onJoinRoom, onJoinChallenge }) => {
  const [activeSubTab, setActiveSubTab] = useState<'rooms' | 'challenges' | 'missions'>('rooms');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredRooms = selectedCategory === 'all' 
    ? MOCK_ROOMS 
    : MOCK_ROOMS.filter(r => r.category === selectedCategory);

  const dailyMissions = [
    { id: 1, title: 'Speed Demon', goal: 'Send 20 Nitro messages', reward: '50 XP', progress: 12, target: 20 },
    { id: 2, title: 'Social Climber', goal: 'Join 2 Community Rooms', reward: '30 XP', progress: 1, target: 2 },
    { id: 3, title: 'Night Owl', goal: 'Chat after midnight', reward: '100 XP', progress: 0, target: 1 },
  ];

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden ${isLightMode ? 'bg-gray-50' : 'bg-nitro-black'}`}>
      {/* Sub-Navigation */}
      <div className="flex border-b border-white/5 bg-black/20 p-2 overflow-x-auto hide-scrollbar">
        <button 
          onClick={() => setActiveSubTab('rooms')}
          className={`flex-1 py-3 px-4 rounded-xl font-orbitron font-black text-[10px] uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeSubTab === 'rooms' ? 'bg-nitro-primary text-nitro-black shadow-nitro-primary' : 'text-gray-500 hover:text-white'}`}
        >
          Community Rooms
        </button>
        <button 
          onClick={() => setActiveSubTab('challenges')}
          className={`flex-1 py-3 px-4 rounded-xl font-orbitron font-black text-[10px] uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeSubTab === 'challenges' ? 'bg-nitro-magenta text-white shadow-nitro-magenta' : 'text-gray-500 hover:text-white'}`}
        >
          Race Challenges
        </button>
        <button 
          onClick={() => setActiveSubTab('missions')}
          className={`flex-1 py-3 px-4 rounded-xl font-orbitron font-black text-[10px] uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeSubTab === 'missions' ? 'bg-nitro-yellow text-nitro-black shadow-nitro-yellow' : 'text-gray-500 hover:text-white'}`}
        >
          Daily Missions
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 hide-scrollbar">
        {activeSubTab === 'rooms' ? (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
              {['all', 'drag', 'drift', 'technical', 'social'].map(cat => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full font-orbitron text-[8px] font-black uppercase border transition-all ${selectedCategory === cat ? 'border-nitro-cyan text-nitro-cyan bg-nitro-cyan/10' : 'border-white/10 text-gray-500'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRooms.map(room => (
                <div key={room.id} className="glass-panel p-5 rounded-3xl border border-white/5 hover:border-nitro-primary/30 transition-all group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl ${room.type === 'voice' ? 'bg-nitro-cyan/10 text-nitro-cyan' : 'bg-nitro-yellow/10 text-nitro-yellow'}`}>
                        {room.type === 'voice' ? <ICONS.Mic className="w-5 h-5" /> : <ICONS.Send className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-orbitron font-black text-sm text-white group-hover:text-nitro-primary transition-colors uppercase truncate max-w-[150px]">{room.name}</h4>
                        <p className="text-[9px] text-gray-500 uppercase font-black">{room.topic}</p>
                      </div>
                    </div>
                    {room.isPrivate && <ICONS.Lock className="w-4 h-4 text-nitro-magenta" />}
                  </div>
                  
                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {[1,2,3].map(i => (
                          <img key={i} src={`https://picsum.photos/seed/room-${room.id}-${i}/40`} className="w-6 h-6 rounded-full border-2 border-nitro-black" />
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold">+{room.memberCount} Online</span>
                    </div>
                    <button 
                      onClick={() => onJoinRoom(room)}
                      className="px-5 py-2 bg-white/5 border border-white/10 rounded-xl font-orbitron text-[9px] font-black uppercase text-white hover:bg-nitro-primary hover:text-nitro-black transition-all"
                    >
                      Enter Room
                    </button>
                  </div>

                  {room.type === 'voice' && (
                    <div className="absolute bottom-0 left-0 w-full h-1 flex gap-1 px-4">
                        {[1,2,3,4,5,6,7,8].map(i => (
                            <div key={i} className="flex-1 bg-nitro-cyan/30 animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}></div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : activeSubTab === 'challenges' ? (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 gap-6">
              {MOCK_CHALLENGES.map(challenge => (
                <div key={challenge.id} className="glass-panel p-6 rounded-[40px] border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4">
                    <div className="bg-nitro-magenta text-white text-[9px] font-black px-3 py-1 rounded-full animate-bounce shadow-nitro-magenta uppercase">
                      Reward: {challenge.rewardPoints} XP
                    </div>
                  </div>

                  <div className="flex items-start gap-5">
                    <div className="w-16 h-16 rounded-3xl bg-nitro-magenta/10 flex items-center justify-center text-nitro-magenta border border-nitro-magenta/20">
                        <ICONS.Trophy className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-orbitron font-black text-xl text-white italic uppercase">{challenge.title}</h4>
                        <p className="text-xs text-gray-500 mt-1">{challenge.description}</p>
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-black/40 rounded-3xl p-5 border border-white/5">
                        <h5 className="font-orbitron text-[10px] font-black text-nitro-cyan uppercase tracking-widest mb-4 flex items-center gap-2">
                            <ICONS.Flag className="w-4 h-4" /> Live Leaderboard
                        </h5>
                        <div className="space-y-3">
                            {challenge.leaderboard.map((entry, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className={`font-orbitron font-black text-xs ${idx === 0 ? 'text-nitro-yellow' : 'text-gray-500'}`}>#{idx + 1}</span>
                                        <span className="text-xs font-bold text-white uppercase tracking-tighter">{entry.name}</span>
                                    </div>
                                    <span className="text-xs font-orbitron font-black text-nitro-cyan">{entry.score} pts</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex flex-col justify-end gap-3">
                        <div className="text-center mb-4">
                            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Participants</div>
                            <div className="flex justify-center -space-x-3">
                                {[1,2,3,4].map(i => (
                                    <img key={i} src={`https://picsum.photos/seed/user-${i}/50`} className="w-8 h-8 rounded-full border-2 border-nitro-black shadow-lg" />
                                ))}
                                <div className="w-8 h-8 rounded-full bg-nitro-gray border-2 border-nitro-black flex items-center justify-center text-[10px] font-black text-white">+8</div>
                            </div>
                        </div>
                        <button 
                          onClick={() => onJoinChallenge(challenge)}
                          className="w-full py-4 bg-nitro-magenta text-white font-orbitron font-black uppercase rounded-2xl shadow-[0_0_25px_rgba(255,0,60,0.4)] hover:scale-105 active:scale-95 transition-all"
                        >
                          Engage Race
                        </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in zoom-in-95 duration-300">
             <div className="grid grid-cols-1 gap-4">
                 {dailyMissions.map(mission => (
                     <div key={mission.id} className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
                         <div className="flex justify-between items-start">
                             <div>
                                 <h4 className="font-orbitron font-black text-nitro-yellow text-sm uppercase italic tracking-wider">{mission.title}</h4>
                                 <p className="text-[10px] text-gray-400 mt-1">{mission.goal}</p>
                             </div>
                             <div className="bg-nitro-yellow/10 text-nitro-yellow text-[8px] font-black px-2 py-1 rounded border border-nitro-yellow/30 uppercase">
                                 +{mission.reward}
                             </div>
                         </div>
                         <div className="space-y-2">
                             <div className="flex justify-between items-end">
                                 <span className="text-[9px] text-gray-500 font-bold">{Math.round((mission.progress / mission.target) * 100)}%</span>
                                 <span className="text-[9px] text-gray-500 font-bold">{mission.progress} / {mission.target}</span>
                             </div>
                             <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                 <div 
                                    className="h-full bg-nitro-yellow transition-all duration-500" 
                                    style={{ width: `${(mission.progress / mission.target) * 100}%` }}
                                 ></div>
                             </div>
                         </div>
                     </div>
                 ))}
             </div>
             <div className="bg-nitro-yellow/5 border border-nitro-yellow/20 p-6 rounded-[32px] text-center">
                 <p className="text-[10px] text-nitro-yellow font-black uppercase tracking-widest mb-2">Weekly Grand Prize</p>
                 <h3 className="font-orbitron font-black text-white text-xl uppercase mb-4">NITRO BOOST ACTIVATION</h3>
                 <div className="flex justify-center gap-2">
                     {[1,2,3,4,5,6,7].map(i => (
                         <div key={i} className={`w-3 h-3 rounded-full border ${i <= 4 ? 'bg-nitro-yellow border-nitro-yellow shadow-[0_0_8px_var(--nitro-yellow)]' : 'border-white/20'}`}></div>
                     ))}
                 </div>
                 <p className="text-[9px] text-gray-500 mt-4 uppercase">Complete 7 days of missions to claim.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZoneView;
