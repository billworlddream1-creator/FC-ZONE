
import React from 'react';
import { ICONS, CURRENT_USER, INITIAL_CHATS } from '../constants';

const FamilyView: React.FC = () => {
  const familyMembers = [
    { id: 'dom', name: 'Dom Toretto', role: 'The Patriarch', avatar: 'https://picsum.photos/seed/dom/200', status: 'In Garage' },
    { id: 'letty', name: 'Letty Ortiz', role: 'Lead Mechanic', avatar: 'https://picsum.photos/seed/letty/200', status: 'Testing Nitrous' },
    { id: 'brian', name: 'Brian O\'Conner', role: 'Precision Driver', avatar: 'https://picsum.photos/seed/brian/200', status: 'Street Racing' },
    { id: 'tej', name: 'Tej Parker', role: 'Tech Specialist', avatar: 'https://picsum.photos/seed/tej/200', status: 'Monitoring Grid' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-nitro-black overflow-y-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="font-orbitron font-black text-3xl text-white italic tracking-tighter uppercase">Community <span className="text-nitro-cyan">Family</span></h2>
        <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em]">The core roster of the Nitro Grid.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {familyMembers.map((member) => (
          <div key={member.id} className="glass-panel p-6 rounded-[32px] border border-white/5 hover:border-nitro-cyan/30 transition-all group">
            <div className="flex items-center gap-4">
              <img src={member.avatar} className="w-16 h-16 rounded-2xl border-2 border-nitro-cyan/30 group-hover:border-nitro-cyan transition-all" />
              <div className="flex-1">
                <h3 className="font-orbitron font-black text-white uppercase text-sm">{member.name}</h3>
                <p className="text-nitro-cyan text-[8px] font-black uppercase tracking-widest">{member.role}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-1.5 h-1.5 bg-nitro-green rounded-full animate-pulse"></div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase">{member.status}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button className="flex-1 py-2 bg-white/5 rounded-xl text-[9px] font-black uppercase hover:bg-nitro-cyan hover:text-nitro-black transition-all">Garage Chat</button>
              <button className="p-2 bg-white/5 rounded-xl hover:bg-nitro-magenta/20 text-gray-400 hover:text-nitro-magenta transition-all"><ICONS.Video className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 bg-nitro-cyan/5 border border-nitro-cyan/20 rounded-[40px] text-center space-y-4">
        <ICONS.Users className="w-12 h-12 text-nitro-cyan mx-auto opacity-50" />
        <h4 className="font-orbitron font-black text-white uppercase tracking-widest">Expand the Crew</h4>
        <p className="text-xs text-gray-500 max-w-xs mx-auto">Invite more drivers to join the official FC family and earn team prestige points.</p>
        <button className="px-8 py-4 bg-nitro-cyan text-nitro-black font-orbitron font-black uppercase text-[10px] rounded-2xl shadow-[0_0_20px_rgba(0,243,255,0.2)]">Recruit Driver</button>
      </div>
    </div>
  );
};

export default FamilyView;
