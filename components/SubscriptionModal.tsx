
import React, { useState } from 'react';
import { ICONS } from '../constants';

interface SubscriptionModalProps {
  onClose: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ onClose }) => {
  const [processing, setProcessing] = useState(false);
  
  const handlePurchase = (plan: string) => {
    setProcessing(true);
    setTimeout(() => {
        setProcessing(false);
        alert(`Successfully subscribed to ${plan} Plan! Welcome to Pro.`);
        onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6" onClick={e => e.stopPropagation()}>
            {[
                { name: 'Rookie', price: '$2', period: '/week', color: 'border-white/10', btn: 'bg-gray-700' },
                { name: 'Pro Racer', price: '$5', period: '/month', color: 'border-nitro-cyan shadow-[0_0_30px_rgba(0,243,255,0.2)]', btn: 'bg-nitro-cyan text-nitro-black', popular: true },
                { name: 'Legend', price: '$50', period: '/year', color: 'border-nitro-yellow', btn: 'bg-nitro-yellow text-nitro-black' }
            ].map((plan) => (
                <div key={plan.name} className={`relative bg-nitro-gray/80 p-8 rounded-[40px] border-2 ${plan.color} flex flex-col items-center text-center space-y-6 transform hover:scale-105 transition-all duration-300`}>
                    {plan.popular && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-nitro-cyan text-nitro-black px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                            Most Popular
                        </div>
                    )}
                    <h3 className="font-orbitron font-black text-2xl text-white uppercase italic">{plan.name}</h3>
                    <div className="flex items-baseline justify-center">
                        <span className="text-4xl font-black text-white">{plan.price}</span>
                        <span className="text-gray-500 text-sm font-bold uppercase">{plan.period}</span>
                    </div>
                    <ul className="text-left space-y-3 w-full">
                        <li className="text-[10px] text-gray-300 font-bold uppercase flex items-center gap-2"><ICONS.Check className="w-4 h-4 text-nitro-green" /> Unlimited Nitro Boosts</li>
                        <li className="text-[10px] text-gray-300 font-bold uppercase flex items-center gap-2"><ICONS.Check className="w-4 h-4 text-nitro-green" /> Custom Voice Filters</li>
                        <li className="text-[10px] text-gray-300 font-bold uppercase flex items-center gap-2"><ICONS.Check className="w-4 h-4 text-nitro-green" /> Stealth Mode Access</li>
                    </ul>
                    <button 
                        onClick={() => handlePurchase(plan.name)}
                        disabled={processing}
                        className={`w-full py-4 rounded-2xl font-orbitron font-black uppercase text-xs tracking-widest hover:brightness-110 transition-all ${plan.btn}`}
                    >
                        {processing ? 'Processing...' : 'Subscribe Now'}
                    </button>
                    
                    <div className="flex gap-4 pt-4 opacity-50">
                        <span className="text-[9px] uppercase font-bold text-gray-500">Stripe</span>
                        <span className="text-[9px] uppercase font-bold text-gray-500">Apple Pay</span>
                        <span className="text-[9px] uppercase font-bold text-gray-500">Crypto</span>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default SubscriptionModal;
