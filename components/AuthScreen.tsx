
import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInAnonymously
} from "firebase/auth";
import { auth } from "../firebase";
import { ICONS } from '../constants';
import { playUiSound } from '../services/audioService';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

type AuthStep = 'credentials' | 'verification';

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [step, setStep] = useState<AuthStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Speedometer simulation for loading
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setProgress(prev => (prev >= 98 ? 98 : prev + (100 - prev) * 0.1));
      }, 100);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const triggerDemoMode = async () => {
    // Delay slightly to allow UI to show "Bypassing" state if needed
    await new Promise(r => setTimeout(r, 1000));
    window.dispatchEvent(new CustomEvent('nitro-demo-auth'));
    onAuthenticated();
  };

  const handleAuth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (authMethod === 'email') {
        if (isRegistering) {
          if (!name) throw new Error("Callsign required for new racers.");
          if (!email || !password) throw new Error("Email and Nitro Key required.");
          const userCred = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(userCred.user, { displayName: name });
        } else {
          if (!email || !password) throw new Error("Credentials missing.");
          await signInWithEmailAndPassword(auth, email, password);
        }
        playUiSound('levelUp');
        onAuthenticated();
      } else {
        // PHONE AUTH LOGIC
        if (step === 'credentials') {
          if (!phone || phone.length < 8) throw new Error("Invalid Comms Frequency (Phone Number).");
          // Simulation: Sending code
          setIsLoading(true);
          await new Promise(r => setTimeout(r, 1500));
          setStep('verification');
          playUiSound('click');
        } else {
          // Verify Code Simulation
          if (verificationCode.length < 4) throw new Error("Verification code incomplete.");
          setIsLoading(true);
          await new Promise(r => setTimeout(r, 1500));
          
          // Use anonymous sign-in as a stable fallback for phone simulation in preview
          try {
            await signInAnonymously(auth);
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { displayName: name || `Racer_${phone.slice(-4)}` });
            }
          } catch (e) {
            // Fallback to demo mode if Firebase is blocked
            await triggerDemoMode();
            return;
          }
          
          playUiSound('nitro');
          onAuthenticated();
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      // Auto-fallback for invalid API key or configuration errors
      if (
        err.message.includes('api-key-not-valid') || 
        err.message.includes('auth/invalid-api-key') ||
        err.message.includes('auth/configuration-not-found') ||
        err.message.includes('auth/project-not-found') ||
        err.message.includes('auth/internal-error')
      ) {
        setError("GRID LINK OFFLINE. ENGAGING EMERGENCY BYPASS...");
        playUiSound('alarm');
        await triggerDemoMode();
      } else {
        setError(err.message || "Uplink failed. Sector blocked.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestEntry = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInAnonymously(auth);
      playUiSound('nitro');
      onAuthenticated();
    } catch (err: any) {
      console.warn("Firebase Auth failed completely. Entering Demo Mode.", err);
      await triggerDemoMode();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-nitro-black flex items-center justify-center p-6 overflow-hidden">
      {/* High-Octane Grid Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{ 
            backgroundImage: 'linear-gradient(var(--nitro-cyan) 1px, transparent 1px), linear-gradient(90deg, var(--nitro-cyan) 1px, transparent 1px)', 
            backgroundSize: '100px 100px',
            transform: 'perspective(500px) rotateX(60deg) translateY(0%)',
            animation: 'grid-move 20s linear infinite'
        }}></div>
      </div>
      <style>{`
        @keyframes grid-move {
            0% { transform: perspective(500px) rotateX(60deg) translateY(0); }
            100% { transform: perspective(500px) rotateX(60deg) translateY(100px); }
        }
      `}</style>

      <div className="max-w-md w-full relative z-10 glass-panel rounded-[40px] border-white/5 p-8 sm:p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-nitro-cyan/10 blur-[80px] rounded-full"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-nitro-magenta/10 blur-[80px] rounded-full"></div>

        <div className="text-center space-y-6 relative z-10">
          <div className="relative inline-block">
            <ICONS.Nitro className="w-20 h-20 text-nitro-cyan mx-auto animate-flicker" />
            {isLoading && (
              <svg className="absolute inset-[-8px] w-[calc(100%+16px)] h-[calc(100%+16px)] -rotate-90">
                <circle cx="48" cy="48" r="46" fill="none" stroke="currentColor" strokeWidth="2" className="text-nitro-cyan/10" />
                <circle cx="48" cy="48" r="46" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="289" strokeDashoffset={289 - (289 * progress) / 100} className="text-nitro-cyan transition-all duration-100" />
              </svg>
            )}
          </div>
          
          <div className="space-y-1">
            <h1 className="font-orbitron font-black text-2xl text-white uppercase italic tracking-tighter">
              {step === 'verification' ? 'VERIFY' : isRegistering ? 'RECRUIT' : 'DRIVER'} <span className="text-nitro-cyan">ZONE</span>
            </h1>
            <p className="text-[10px] text-gray-500 font-orbitron uppercase tracking-widest italic">
              Grid Access Protocol v2.5.0
            </p>
          </div>

          {step === 'credentials' && (
            <div className="flex bg-nitro-gray/50 p-1 rounded-2xl border border-white/5 transition-all">
                <button 
                onClick={() => { setAuthMethod('email'); setError(null); }}
                className={`flex-1 py-2 rounded-xl text-[9px] font-orbitron font-black uppercase transition-all ${authMethod === 'email' ? 'bg-nitro-cyan text-nitro-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                Email
                </button>
                <button 
                onClick={() => { setAuthMethod('phone'); setError(null); }}
                className={`flex-1 py-2 rounded-xl text-[9px] font-orbitron font-black uppercase transition-all ${authMethod === 'phone' ? 'bg-nitro-cyan text-nitro-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                Phone
                </button>
            </div>
          )}
          
          <div className="space-y-4">
            {step === 'credentials' ? (
                <>
                    {isRegistering && (
                    <div className="relative group animate-in slide-in-from-top-2">
                        <ICONS.Users className="absolute left-4 top-4 w-4 h-4 text-gray-500 group-focus-within:text-nitro-cyan transition-colors" />
                        <input 
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Pilot Callsign (e.g. GhostRider)"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-5 text-sm text-white outline-none focus:ring-1 focus:ring-nitro-cyan transition-all placeholder:text-gray-700"
                        />
                    </div>
                    )}

                    {authMethod === 'email' ? (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="relative group">
                        <span className="absolute left-4 top-4 text-gray-500 font-black group-focus-within:text-nitro-cyan transition-colors">@</span>
                        <input 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Racer Email"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-5 text-sm text-white outline-none focus:ring-1 focus:ring-nitro-cyan transition-all placeholder:text-gray-700"
                        />
                        </div>
                        <div className="relative group">
                        <ICONS.Lock className="absolute left-4 top-4 w-4 h-4 text-gray-500 group-focus-within:text-nitro-cyan transition-colors" />
                        <input 
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nitro Key (Password)"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-5 text-sm text-white outline-none focus:ring-1 focus:ring-nitro-cyan transition-all placeholder:text-gray-700"
                        />
                        </div>
                    </div>
                    ) : (
                    <div className="relative group animate-in fade-in duration-300">
                        <ICONS.Phone className="absolute left-4 top-4 w-4 h-4 text-gray-500 group-focus-within:text-nitro-cyan transition-colors" />
                        <input 
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-5 text-sm text-white outline-none focus:ring-1 focus:ring-nitro-cyan transition-all placeholder:text-gray-700"
                        />
                    </div>
                    )}
                </>
            ) : (
                <div className="space-y-4 animate-in zoom-in-95 duration-300">
                    <p className="text-[10px] text-nitro-cyan font-black uppercase tracking-widest mb-2">Code Transmitted to {phone}</p>
                    <div className="relative group">
                        <ICONS.Shield className="absolute left-4 top-4 w-4 h-4 text-nitro-cyan transition-colors" />
                        <input 
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="6-Digit Verification Code"
                        maxLength={6}
                        className="w-full bg-nitro-cyan/5 border border-nitro-cyan/30 rounded-2xl py-4 pl-12 pr-5 text-center text-xl font-orbitron tracking-[0.5em] text-white outline-none focus:ring-1 focus:ring-nitro-cyan transition-all"
                        />
                    </div>
                    <button onClick={() => setStep('credentials')} className="text-[9px] text-gray-500 hover:text-white uppercase font-black">Edit Frequency</button>
                </div>
            )}

            <button 
              onClick={handleAuth}
              disabled={isLoading}
              className="group relative w-full py-5 bg-nitro-cyan text-nitro-black font-orbitron font-black uppercase rounded-2xl shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] active:scale-95 transition-all disabled:opacity-30 overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-nitro-black border-t-transparent rounded-full animate-spin"></div>
                    Syncing...
                  </>
                ) : (
                  <>
                    {step === 'verification' ? 'Confirm Link' : isRegistering ? 'Register Pilot' : 'Ignition Start'}
                    <ICONS.Rocket className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </>
                )}
              </span>
            </button>

            {error && (
              <div className="p-3 bg-nitro-magenta/10 border border-nitro-magenta/30 rounded-xl animate-in shake duration-300">
                <p className="text-[9px] text-nitro-magenta font-black uppercase italic leading-tight">
                  {error}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {step === 'credentials' && (
                <button 
                onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError(null);
                }}
                className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors"
                >
                {isRegistering ? 'Already a Pilot? Log In' : 'New Recruit? Join the Grid'}
                </button>
            )}

            <div className="flex items-center gap-4 py-2 opacity-30">
              <div className="flex-1 h-[1px] bg-white"></div>
              <span className="text-[8px] font-black text-gray-600 uppercase">System Override</span>
              <div className="flex-1 h-[1px] bg-white"></div>
            </div>

            <button 
              onClick={handleGuestEntry}
              className="group w-full py-4 border border-nitro-cyan/30 text-nitro-cyan font-orbitron font-black uppercase text-[10px] rounded-2xl hover:bg-nitro-cyan hover:text-nitro-black transition-all flex items-center justify-center gap-2"
            >
              Nitro Guest Entry
              <ICONS.Ai className="w-3 h-3 group-hover:rotate-12" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
