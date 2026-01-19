
import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { User } from '../types';

interface AuthScreenProps {
  onAuthenticated: (user: Partial<User>) => void;
}

type AuthStep = 'landing' | 'input' | 'validating' | 'verify' | 'profile';

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [step, setStep] = useState<AuthStep>('landing');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [name, setName] = useState('');
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleStart = () => setStep('input');

  const validateInputs = () => {
    // Basic regex for phone (at least 10 digits) and email
    const phoneRegex = /^\d{10,}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
      setErrorMessage('Protocol Error: Invalid Mobile Frequency (10 digits min)');
      setIsError(true);
      return false;
    }
    if (!emailRegex.test(email)) {
      setErrorMessage('Protocol Error: Corrupt Digital Signature (Invalid Email)');
      setIsError(true);
      return false;
    }
    return true;
  };

  const handleVerifyRequest = () => {
    if (!validateInputs()) return;

    setStep('validating');
    setIsError(false);

    // Simulate a high-speed "Global Network Grid" check
    setTimeout(() => {
      // Mock: Reject specific patterns to simulate "not in use"
      // Realistically, you'd call an API here.
      // For demo purposes: if phone starts with 000 or email has "dummy", consider it "not found"
      const isPhoneInUse = !phone.startsWith('000');
      const isEmailInUse = !email.toLowerCase().includes('dummy');

      if (!isPhoneInUse || !isEmailInUse) {
        setErrorMessage('Network Error: Credentials Not Found on Global Grid. Access Denied.');
        setIsError(true);
        setStep('input');
      } else {
        setStep('verify');
      }
    }, 2000);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      
      if (value && index < 3) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const handleVerifyCode = () => {
    // Mock successful verification
    if (otp.join('').length === 4) {
      setStep('profile');
    }
  };

  const handleComplete = () => {
    if (name.trim()) {
      onAuthenticated({
        name,
        phone,
        email,
        isVerified: true
      });
    }
  };

  const handleInvite = () => {
    const inviteLink = `https://fczone.app/invite?id=${Math.random().toString(36).substr(2, 9)}`;
    const message = `Join me in the FAST & FURIOUS CHAT ZONE! 🏎️💨 ${inviteLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[300] bg-nitro-black flex items-center justify-center p-6 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-nitro-cyan rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-nitro-magenta rounded-full blur-[150px] animate-pulse [animation-delay:1s]"></div>
      </div>

      <div className="max-w-md w-full relative z-10 glass-panel rounded-[40px] border-white/5 p-10 shadow-2xl animate-in zoom-in-95 duration-500">
        
        {step === 'landing' && (
          <div className="text-center space-y-10 py-6">
            <div className="flex justify-center flex-col items-center">
              <div className="relative mb-4">
                <ICONS.Nitro className="w-24 h-24 text-nitro-cyan animate-nitro-shake shadow-nitro-primary" />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-nitro-cyan font-orbitron font-black text-[10px] tracking-widest">FC</div>
              </div>
            </div>
            <div className="space-y-4">
              <h1 className="font-orbitron font-black text-4xl text-white italic tracking-tighter leading-none uppercase">
                FAST & FURIOUS <br/> <span className="text-nitro-magenta">CHAT ZONE</span>
              </h1>
              <p className="text-gray-400 text-xs font-medium uppercase tracking-[0.3em] leading-relaxed">
                Connect at the Speed of Life. <br/> Join the Global Roster.
              </p>
            </div>
            <button 
              onClick={handleStart}
              className="w-full py-5 bg-nitro-cyan text-nitro-black font-orbitron font-black uppercase rounded-2xl shadow-[0_0_30px_rgba(0,243,255,0.4)] hover:scale-105 active:scale-95 transition-all"
            >
              IGNITION START
            </button>
          </div>
        )}

        {step === 'input' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div className="text-center flex flex-col items-center">
              <div className="mb-6 flex items-center justify-center">
                <div className="w-16 h-16 bg-nitro-cyan/10 rounded-2xl border border-nitro-cyan flex items-center justify-center shadow-[0_0_20px_rgba(0,243,255,0.3)]">
                  <span className="font-orbitron font-black text-2xl text-nitro-cyan">FC</span>
                </div>
              </div>
              <h2 className="font-orbitron font-black text-white text-xl uppercase tracking-widest mb-2">DRIVER REGISTRATION</h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Verify your credentials to enter the grid.</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-orbitron font-bold text-nitro-cyan uppercase tracking-widest ml-2">Phone Number</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">+</div>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="1 234 567 890"
                    className={`w-full bg-white/5 border rounded-2xl py-4 pl-8 pr-4 text-white focus:ring-2 focus:ring-nitro-cyan outline-none transition-all font-bold ${isError ? 'border-nitro-magenta' : 'border-white/10'}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-orbitron font-bold text-nitro-cyan uppercase tracking-widest ml-2">Email Address</label>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="racer@nitro.com"
                  className={`w-full bg-white/5 border rounded-2xl py-4 px-5 text-white focus:ring-2 focus:ring-nitro-cyan outline-none transition-all font-bold ${isError ? 'border-nitro-magenta' : 'border-white/10'}`}
                />
              </div>

              {isError && (
                <div className="space-y-3">
                  <p className="text-nitro-magenta text-[9px] font-black uppercase text-center animate-pulse">{errorMessage}</p>
                  <button 
                    onClick={handleInvite}
                    className="w-full py-2 bg-nitro-cyan/10 text-nitro-cyan text-[8px] font-black uppercase rounded-lg border border-nitro-cyan/20 hover:bg-nitro-cyan hover:text-nitro-black transition-all"
                  >
                    Invite to Zone via WhatsApp
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={handleVerifyRequest}
              className="w-full py-5 bg-nitro-magenta text-white font-orbitron font-black uppercase rounded-2xl shadow-[0_0_30px_rgba(255,0,60,0.3)] hover:scale-105 transition-all"
            >
              SEND IGNITION CODE
            </button>
          </div>
        )}

        {step === 'validating' && (
            <div className="py-20 flex flex-col items-center justify-center space-y-6">
                <div className="relative w-24 h-24">
                    <div className="absolute inset-0 border-4 border-nitro-cyan/20 rounded-full"></div>
                    <div className="absolute inset-0 border-t-4 border-nitro-cyan rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="font-orbitron font-black text-xl text-nitro-cyan animate-pulse tracking-tighter">FC</div>
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h3 className="font-orbitron font-black text-white text-lg uppercase tracking-tighter">Pinging Grid...</h3>
                    <p className="text-[8px] text-gray-500 uppercase tracking-widest animate-pulse">Checking Global Contact Database</p>
                </div>
            </div>
        )}

        {step === 'verify' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <h2 className="font-orbitron font-black text-nitro-magenta text-xl uppercase tracking-widest mb-2">CODE VERIFICATION</h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Sent to {phone || email}</p>
            </div>

            <div className="flex justify-between gap-3 px-4">
              {otp.map((digit, idx) => (
                <input 
                  key={idx}
                  id={`otp-${idx}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  className="w-14 h-20 bg-white/5 border-2 border-white/10 rounded-2xl text-center text-3xl font-orbitron font-black text-nitro-cyan focus:border-nitro-cyan focus:ring-4 focus:ring-nitro-cyan/20 outline-none transition-all"
                />
              ))}
            </div>

            <div className="text-center">
              <button className="text-[9px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Resend Code in 30s</button>
            </div>

            <button 
              onClick={handleVerifyCode}
              disabled={otp.join('').length < 4}
              className="w-full py-5 bg-white text-nitro-black font-orbitron font-black uppercase rounded-2xl disabled:opacity-30 transition-all hover:bg-nitro-cyan"
            >
              ENGAGE SYSTEM
            </button>
          </div>
        )}

        {step === 'profile' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <h2 className="font-orbitron font-black text-white text-xl uppercase tracking-widest mb-2">CHOOSE YOUR CALLSIGN</h2>
              <p className="text-[10px] text-nitro-cyan uppercase tracking-widest">Finalizing secure connection...</p>
            </div>

            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full border-4 border-dashed border-nitro-cyan/30 flex items-center justify-center relative cursor-pointer group">
                  <ICONS.Image className="w-8 h-8 text-gray-600 group-hover:text-nitro-cyan transition-colors" />
                  <div className="absolute inset-0 rounded-full border-4 border-nitro-cyan animate-pulse opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-orbitron font-bold text-gray-500 uppercase tracking-widest ml-2">Display Name</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nitro_Racer_99"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white focus:ring-2 focus:ring-nitro-cyan outline-none transition-all font-bold text-center"
                />
              </div>
            </div>

            <button 
              onClick={handleComplete}
              disabled={!name.trim()}
              className="w-full py-5 bg-nitro-cyan text-nitro-black font-orbitron font-black uppercase rounded-2xl shadow-[0_0_30px_rgba(0,243,255,0.4)] hover:scale-105 transition-all disabled:opacity-30"
            >
              ENTER THE GRID
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthScreen;
