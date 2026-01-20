
export enum ChatType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  BROADCAST = 'BROADCAST'
}

export type VoiceProfile = 'off' | 'male' | 'female';
export type ExpiryDuration = 'off' | '24h' | '1w' | '1m';
export type SoundPack = 'standard' | 'retro' | 'clean';

export interface VoiceFilter {
  pitch: number;    // 0.5 to 2.0
  echo: number;     // 0 to 1
  reverb: number;   // 0 to 1
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  type: 'text' | 'image' | 'video' | 'file';
  status: 'sent' | 'delivered' | 'read';
  isAi?: boolean;
  isPinned?: boolean;
  expiryTimestamp?: number;
  reactions?: Record<string, string[]>; // emoji -> userIds[]
  fileData?: {
    name: string;
    size: number;
    mimeType: string;
    content?: string;
  };
  // Trash bin metadata
  originalChatId?: string;
  deletedAt?: number;
}

export interface ScheduledMessage extends Message {
  scheduledFor: number;
}

export interface AlertReminder {
  id: string;
  chatId: string;
  topic: string;
  scheduledFor: number;
}

export interface EngineSpecs {
  topSpeed: string;
  acceleration: string;
  nitrous: string;
  handling: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'speeding';
  mood?: string;
  points: number;
  badge: string;
  xp: number;
  level: number;
  isNitroBoosted?: boolean;
  engineSpecs?: EngineSpecs;
  phone?: string;
  email?: string;
  password?: string;
  isVerified?: boolean;
  stealthMode?: boolean;
  backgroundMusic?: boolean;
  soundPack?: SoundPack;
  bio?: string;
  autoReadDocuments?: boolean;
  autoReadVoice?: boolean;
  autoReadText?: boolean;
  voiceGender?: 'male' | 'female';
  appVersion?: string; 
  soundEnabled?: boolean;
  bubbleColor?: string;
  lowBandwidthMode?: boolean;
  voiceFilter: VoiceFilter;
  voicePresets: Record<string, VoiceFilter>;
  aiCoPilot?: boolean;
  customInviteCode?: string;
  themePreference?: string;
}

export interface Chat {
  id: string;
  name: string;
  type: ChatType;
  lastMessage?: string;
  timestamp: number;
  unreadCount: number;
  avatar: string;
  participants: User[];
  messages: Message[];
  scheduledMessages: ScheduledMessage[];
  alertReminders: AlertReminder[];
  isTyping?: boolean;
  wallpaper?: string;
  expiryDuration?: ExpiryDuration;
  isPinned?: boolean;
}

export interface Room {
  id: string;
  name: string;
  topic: string;
  memberCount: number;
  isPrivate: boolean;
  type: 'voice' | 'text';
  category: 'drag' | 'drift' | 'technical' | 'social';
}

export interface RaceChallenge {
  id: string;
  title: string;
  description: string;
  rewardPoints: number;
  participants: string[];
  status: 'active' | 'completed';
  leaderboard: { userId: string; name: string; score: number }[];
}

export interface AppState {
  activeTab: 'chats' | 'family' | 'zone' | 'gossip' | 'settings' | 'profile';
  selectedChatId: string | null;
  user: User;
  voiceProfile: VoiceProfile;
  isAuthenticated: boolean;
}
