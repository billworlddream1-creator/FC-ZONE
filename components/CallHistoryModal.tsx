
import React from 'react';
import { ICONS } from '../constants';

interface CallHistoryModalProps {
  onClose: () => void;
}

const MOCK_CALLS = [
  { id: 1, name: 'Dom Toretto', type: 'incoming', time: '10 mins ago', duration: '5:42', status: 'missed' },
  { id: 2, name: 'Letty', type: 'outgoing', time: '2 hours ago', duration: '12:30', status: 'completed' },
  { id: 3, name: 'Tej', type: 'incoming', time: 'Yesterday', duration: '2:15', status: 'completed' },
];

const CallHistoryModal: React.FC<CallHistoryModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-nitro-black border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
            <h2 className="font-orbitron font-black text-xl text-white uppercase italic">Comms <span className="text-nitro-cyan">Log</span></h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>
        
        <div className="space-y-4">
            {MOCK_CALLS.map(call => (
                <div key={call.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${call.type === 'incoming' ? 'bg-nitro-cyan/10 text-nitro-cyan' : 'bg-nitro-magenta/10 text-nitro-magenta'}`}>
                            <ICONS.Phone className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-orbitron font-bold text-white text-sm uppercase">{call.name}</h4>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
                                <span>{call.type}</span>
                                <span>•</span>
                                <span>{call.time}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                         <div className={`text-[10px] font-black uppercase ${call.status === 'missed' ? 'text-nitro-magenta' : 'text-nitro-green'}`}>{call.status}</div>
                         <div className="text-[9px] text-gray-500">{call.duration}</div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default CallHistoryModal;
