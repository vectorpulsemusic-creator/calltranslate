import React, { useState } from "react";
import { Shield, Key, Languages, Palette, Check, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "../utils";
import { AppTheme, AppLanguage } from "../types";

interface SetupWizardProps {
  onComplete: (config: any) => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    adminUsername: "admin",
    adminPassword: "pass123",
    geminiKey: "",
    theme: "emerald" as AppTheme,
    language: "en" as AppLanguage,
  });

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
    else {
      localStorage.setItem("calltranslate_setup", "true");
      localStorage.setItem("calltranslate_offline_admin", JSON.stringify({
        username: config.adminUsername,
        password: config.adminPassword
      }));
      if (config.geminiKey) {
        localStorage.setItem("calltranslate_gemini_key", config.geminiKey);
      }
      onComplete(config);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Admin Credentials</h2>
              <p className="text-zinc-400">Set your offline administrator account.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-500">Username</label>
                <input
                  type="text"
                  value={config.adminUsername}
                  onChange={(e) => setConfig({ ...config, adminUsername: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-500">Password</label>
                <input
                  type="password"
                  value={config.adminPassword}
                  onChange={(e) => setConfig({ ...config, adminPassword: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto">
              <Key className="w-8 h-8 text-blue-500" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Gemini API Key</h2>
              <p className="text-zinc-400">Optional: Provide your Google AI API key for translation services.</p>
            </div>
            <div className="space-y-4">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={config.geminiKey}
                onChange={(e) => setConfig({ ...config, geminiKey: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-primary/50 transition-all"
              />
              <p className="text-xs text-zinc-500 text-center">
                If left blank, the app will run in "Mock Mode" for translations.
              </p>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
              <Languages className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">App Language</h2>
              <p className="text-zinc-400">Select your preferred interface language.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { code: "en", name: "English", flag: "🇺🇸" },
                { code: "sr", name: "Serbian", flag: "🇷🇸" },
                { code: "hu", name: "Hungarian", flag: "🇭🇺" },
                { code: "de", name: "German", flag: "🇩🇪" },
                { code: "sl", name: "Slovenian", flag: "🇸🇮" },
              ].map((l) => (
                <button
                  key={l.code}
                  onClick={() => setConfig({ ...config, language: l.code as AppLanguage })}
                  className={cn(
                    "p-3 rounded-xl border-2 transition-all text-left flex items-center gap-2",
                    config.language === l.code ? "border-primary bg-primary/5" : "border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <span className="text-xl">{l.flag}</span>
                  <span className="text-sm font-semibold">{l.name}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto">
              <Palette className="w-8 h-8 text-amber-500" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Appearance</h2>
              <p className="text-zinc-400">Choose your favorite style.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(['zinc', 'emerald', 'violet', 'amber'] as AppTheme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setConfig({ ...config, theme: t })}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-left capitalize",
                    config.theme === t ? "border-primary bg-primary/5" : "border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className={cn("w-4 h-4 rounded-full mb-2", 
                    t === 'zinc' && "bg-zinc-500",
                    t === 'emerald' && "bg-emerald-500",
                    t === 'violet' && "bg-violet-500",
                    t === 'amber' && "bg-amber-500"
                  )} />
                  {t}
                </button>
              ))}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">All Set!</h2>
              <p className="text-zinc-400">Your configuration is ready. Click finish to start.</p>
            </div>
            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Admin:</span>
                <span className="font-mono">{config.adminUsername}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">API Key:</span>
                <span className="font-mono">{config.geminiKey ? "••••••••" : "Mock Mode"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Language:</span>
                <span className="capitalize">{config.language}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Theme:</span>
                <span className="capitalize">{config.theme}</span>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-zinc-900">
          <div 
            className="h-full bg-primary transition-all duration-500" 
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {renderStep()}
        </div>

        <div className="mt-8 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="text-zinc-500 hover:text-white disabled:opacity-0 transition-all font-medium"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all active:scale-95"
          >
            {step === 5 ? "Finish" : "Continue"}
            {step !== 5 && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
