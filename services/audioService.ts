
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceProfile, VoiceFilter } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

let currentAudioSource: AudioBufferSourceNode | null = null;

export const speakText = async (text: string, profile: VoiceProfile, filter?: VoiceFilter) => {
  if (profile === 'off' || !text) return;

  try {
    if (currentAudioSource) {
      currentAudioSource.stop();
      currentAudioSource = null;
    }

    const voiceName = profile === 'male' ? 'Puck' : 'Kore';
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return;

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      audioCtx,
      24000,
      1
    );

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;

    // Pitch Handling (via playbackRate)
    if (filter?.pitch) {
      source.playbackRate.value = filter.pitch;
    }

    let lastNode: AudioNode = source;

    // Echo Handling
    if (filter?.echo && filter.echo > 0) {
      const delay = audioCtx.createDelay();
      delay.delayTime.value = 0.3;
      const feedback = audioCtx.createGain();
      feedback.gain.value = filter.echo * 0.5;

      lastNode.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(audioCtx.destination);
    }

    // Reverb Handling (Simple approximation via secondary short delay + high gain)
    if (filter?.reverb && filter.reverb > 0) {
      const reverbDelay = audioCtx.createDelay();
      reverbDelay.delayTime.value = 0.05;
      const reverbGain = audioCtx.createGain();
      reverbGain.gain.value = filter.reverb * 0.4;
      
      lastNode.connect(reverbDelay);
      reverbDelay.connect(reverbGain);
      reverbGain.connect(audioCtx.destination);
    }

    source.connect(audioCtx.destination);
    source.start();
    currentAudioSource = source;
  } catch (error) {
    console.error("Nitro TTS Error:", error);
  }
};

export const playUiSound = (type: 'send' | 'receive' | 'levelUp' | 'click' | 'nitro' | 'alarm') => {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'send') {
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, now);
    oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.1);
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    oscillator.start(now);
    oscillator.stop(now + 0.1);
  } else if (type === 'receive') {
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, now);
    oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    oscillator.start(now);
    oscillator.stop(now + 0.1);
  } else if (type === 'levelUp') {
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(523.25, now);
    oscillator.frequency.setValueAtTime(659.25, now + 0.1);
    oscillator.frequency.setValueAtTime(783.99, now + 0.2);
    oscillator.frequency.setValueAtTime(1046.50, now + 0.3);
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    oscillator.start(now);
    oscillator.stop(now + 0.5);
  } else if (type === 'nitro') {
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(100, now);
    oscillator.frequency.exponentialRampToValueAtTime(1000, now + 0.5);
    oscillator.frequency.exponentialRampToValueAtTime(200, now + 1.0);
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
    oscillator.start(now);
    oscillator.stop(now + 1.0);
  } else if (type === 'alarm') {
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.linearRampToValueAtTime(1760, now + 0.1);
    oscillator.frequency.linearRampToValueAtTime(880, now + 0.2);
    oscillator.frequency.linearRampToValueAtTime(1760, now + 0.3);
    oscillator.frequency.linearRampToValueAtTime(880, now + 0.4);
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.2);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.3);
    gainNode.gain.linearRampToValueAtTime(0.01, now + 0.8);
    oscillator.start(now);
    oscillator.stop(now + 0.8);
  } else {
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1200, now);
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    oscillator.start(now);
    oscillator.stop(now + 0.05);
  }
};
