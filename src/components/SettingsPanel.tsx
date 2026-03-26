import React, { useState } from "react";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { UserProfile, AppLanguage, AppTheme, AppVoice, VOICES } from "../types";
import { Settings, Globe, Palette, Check, AlertCircle, Loader2, Volume2, User, Camera } from "lucide-react";
import { cn, t } from "../utils";

interface SettingsPanelProps {
  profile: UserProfile;
}

export default function SettingsPanel({ profile }: SettingsPanelProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName || "");
  const [photoURL, setPhotoURL] = useState(profile.photoURL || "");
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem("calltranslate_gemini_key") || "");

  const lang = profile.settings?.appLanguage || "en";

  const languages: { code: AppLanguage; name: string; flag: string }[] = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "sr", name: "Serbian", flag: "🇷🇸" },
    { code: "hu", name: "Hungarian", flag: "🇭🇺" },
    { code: "de", name: "German", flag: "🇩🇪" },
    { code: "sl", name: "Slovenian", flag: "🇸🇮" },
  ];

  const themes: { id: AppTheme; name: string; color: string }[] = [
    { id: "zinc", name: "Classic Zinc", color: "bg-zinc-900" },
    { id: "emerald", name: "Emerald Forest", color: "bg-emerald-900" },
    { id: "violet", name: "Royal Violet", color: "bg-violet-900" },
    { id: "amber", name: "Sunset Amber", color: "bg-amber-900" },
  ];

  const updateSettings = async (newSettings: Partial<UserProfile["settings"]>) => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      const userRef = doc(db, "users", profile.uid);
      await updateDoc(userRef, {
        settings: {
          ...profile.settings,
          ...newSettings,
        },
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update settings:", err);
      setError(t("failed_save_settings", lang as any));
    } finally {
      setIsSaving(false);
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      // Save Gemini Key to localStorage
      if (geminiKey.trim()) {
        localStorage.setItem("calltranslate_gemini_key", geminiKey.trim());
      } else {
        localStorage.removeItem("calltranslate_gemini_key");
      }

      const userRef = doc(db, "users", profile.uid);
      await updateDoc(userRef, {
        displayName,
        photoURL,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError(t("failed_save_profile", lang as any));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 md:space-y-12 animate-in fade-in duration-500 pb-32 lg:pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 md:p-4 bg-zinc-900 rounded-2xl md:rounded-[2rem] border border-zinc-800 shadow-xl">
            <Settings className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter">{t("settings", lang as any)}</h1>
            <p className="text-zinc-500 text-xs md:text-sm font-medium">{t("personalize_experience", lang as any)}</p>
          </div>
        </div>
        {success && (
          <div className="flex items-center gap-2 text-primary bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 animate-in fade-in zoom-in w-fit">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">{t("settings_saved", lang as any)}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        {/* Profile Settings */}
        <div className="bg-zinc-900 rounded-3xl md:rounded-[2.5rem] border border-zinc-800 p-6 md:p-8 space-y-6 md:space-y-8 shadow-xl md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-xl">
                <User className="w-4 h-4 md:w-5 md:h-5 text-zinc-400" />
              </div>
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-zinc-400">{t("profile_settings", lang as any)}</h2>
            </div>

            <form onSubmit={updateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="flex flex-col items-center md:items-start gap-6">
                  <div className="relative group">
                    <img
                      src={photoURL || `https://ui-avatars.com/api/?name=${displayName}`}
                      alt="Profile"
                      className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-zinc-800 shadow-2xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="w-full space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t("profile_photo_url", lang as any)}</label>
                    <input
                      type="url"
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      placeholder="https://example.com/photo.jpg"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t("display_name", lang as any)}</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t("your_name", lang as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t("email_address", lang as any)}</label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm opacity-50 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    {t("gemini_api_key", lang as any)}
                    <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase">{t("required_real_translation", lang as any)}</span>
                  </label>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary transition-colors font-mono"
                  />
                  <p className="text-[9px] text-zinc-600 italic">{t("get_key_from", lang as any)} <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>. {t("key_stored_locally", lang as any)}</p>
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-primary text-white font-black py-4 rounded-2xl hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-primary-glow"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  {t("save_profile", lang as any)}
                </button>
              </div>
            </form>
        </div>

        {/* Language Settings */}
        <div className="bg-zinc-900 rounded-3xl md:rounded-[2.5rem] border border-zinc-800 p-6 md:p-8 space-y-6 md:space-y-8 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-800 rounded-xl">
              <Globe className="w-4 h-4 md:w-5 md:h-5 text-zinc-400" />
            </div>
            <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-zinc-400">{t("app_lang", lang as any)}</h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => updateSettings({ appLanguage: l.code })}
                disabled={isSaving}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 group",
                  profile.settings?.appLanguage === l.code
                    ? "bg-primary/10 border-primary/50 text-primary"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{l.flag}</span>
                  <span className="font-semibold">{l.name}</span>
                </div>
                {profile.settings?.appLanguage === l.code && (
                  <Check className="w-5 h-5" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Settings */}
        <div className="bg-zinc-900 rounded-3xl md:rounded-[2.5rem] border border-zinc-800 p-6 md:p-8 space-y-6 md:space-y-8 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-800 rounded-xl">
              <Palette className="w-4 h-4 md:w-5 md:h-5 text-zinc-400" />
            </div>
            <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-zinc-400">{t("color_scheme", lang as any)}</h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {themes.map((t_item) => (
              <button
                key={t_item.id}
                onClick={() => updateSettings({ theme: t_item.id })}
                disabled={isSaving}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 group",
                  profile.settings?.theme === t_item.id
                    ? "bg-primary/10 border-primary/50 text-primary"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-6 h-6 rounded-full border border-white/10", t_item.color)} />
                  <span className="font-semibold">{t_item.name}</span>
                </div>
                {profile.settings?.theme === t_item.id && (
                  <Check className="w-5 h-5" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Settings */}
        <div className="bg-zinc-900 rounded-3xl md:rounded-[2.5rem] border border-zinc-800 p-6 md:p-8 space-y-6 md:space-y-8 shadow-xl md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-800 rounded-xl">
              <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-zinc-400" />
            </div>
            <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-zinc-400">{t("voice_settings", lang as any)}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {VOICES.map((v) => (
              <button
                key={v.id}
                onClick={() => updateSettings({ voice: v.id })}
                disabled={isSaving}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 group",
                  (profile.settings?.voice || "Zephyr") === v.id
                    ? "bg-primary/10 border-primary/50 text-primary"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                    v.gender === "Male" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"
                  )}>
                    {v.name[0]}
                  </div>
                  <div>
                    <span className="font-semibold block">{v.name}</span>
                    <span className="text-[10px] uppercase tracking-widest text-zinc-500">{v.gender}</span>
                  </div>
                </div>
                {(profile.settings?.voice || "Zephyr") === v.id && (
                  <Check className="w-5 h-5" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isSaving && (
        <div className="flex items-center justify-center gap-2 text-zinc-500 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">{t("saving_changes", lang as any)}</span>
        </div>
      )}
    </div>
  );
}
