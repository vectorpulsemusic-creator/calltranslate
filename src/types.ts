export type AppLanguage = 'en' | 'sr' | 'hu' | 'de' | 'sl';
export type AppTheme = 'zinc' | 'emerald' | 'violet' | 'amber';
export type AppVoice = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
export type UserPlan = 'free' | 'advanced' | 'pro' | 'business';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  location?: string;
  credits: number;
  role: 'admin' | 'user';
  plan?: UserPlan;
  createdAt: any; // Firestore Timestamp
  settings?: {
    theme: AppTheme;
    appLanguage: AppLanguage;
    voice?: AppVoice;
  };
}

export const CREDIT_PLANS: { id: UserPlan; name: string; credits: number; price: string; description: string; features: string[] }[] = [
  { 
    id: 'free', 
    name: 'Free', 
    credits: 20, 
    price: '$0',
    description: 'Perfect for trying out our translation services.',
    features: ['20 Credits included', 'Standard translation speed', 'Basic voice options', 'Community support']
  },
  { 
    id: 'advanced', 
    name: 'Advanced', 
    credits: 100, 
    price: '$19',
    description: 'Great for frequent travelers and casual users.',
    features: ['100 Credits included', 'Priority translation speed', 'All voice options', 'Email support', 'No ads']
  },
  { 
    id: 'pro', 
    name: 'Pro', 
    credits: 250, 
    price: '$39',
    description: 'Designed for professionals and power users.',
    features: ['250 Credits included', 'Ultra-fast translation', 'HD Voice quality', 'Priority support', 'Usage analytics']
  },
  { 
    id: 'business', 
    name: 'Business', 
    credits: 500, 
    price: '$69',
    description: 'The ultimate package for teams and businesses.',
    features: ['500 Credits included', 'Dedicated account manager', 'API Access', 'Custom voice profiles', 'Team management']
  },
];

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
