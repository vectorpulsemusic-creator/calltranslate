export type AppLanguage = 'en' | 'sr' | 'hu' | 'de' | 'sl';
export type AppTheme = 'zinc' | 'emerald' | 'violet' | 'amber';
export type AppVoice = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  location?: string;
  credits: number;
  role: 'admin' | 'user';
  createdAt: any; // Firestore Timestamp
  settings?: {
    theme: AppTheme;
    appLanguage: AppLanguage;
    voice?: AppVoice;
  };
}

export const VOICES: { id: AppVoice; name: string; gender: string }[] = [
  { id: 'Puck', name: 'Puck', gender: 'Male' },
  { id: 'Charon', name: 'Charon', gender: 'Male' },
  { id: 'Kore', name: 'Kore', gender: 'Female' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Male' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'Female' },
];

export interface TranslationSession {
  id?: string;
  userId: string;
  type: 'voice' | 'text' | 'call';
  sourceLanguage?: string;
  targetLanguage?: string;
  sourceText?: string;
  translatedText?: string;
  cost: number;
  timestamp: any; // Firestore Timestamp
  duration?: number;
}

export interface CreditTransaction {
  id?: string;
  userId: string;
  amount: number;
  reason: string;
  adminId?: string;
  timestamp: any; // Firestore Timestamp
}

export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'sr', name: 'Serbian', flag: '🇷🇸' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'sl', name: 'Slovenian', flag: '🇸🇮' },
];

export const VOICE_COST_PER_MINUTE = 5;
export const TEXT_COST_PER_1000_CHARS = 1;
export const CALL_COST_PER_MINUTE = 8;
