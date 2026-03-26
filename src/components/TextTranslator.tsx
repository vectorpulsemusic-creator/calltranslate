import React, { useState, useRef } from "react";
import { Type, Globe, Send, Loader2, Copy, Trash2, AlertCircle, Volume2, ArrowLeftRight } from "lucide-react";
import { LANGUAGES, UserProfile } from "../types";
import { translateText, generateTTS } from "../services/geminiService";
import { cn, t } from "../utils";

interface TextTranslatorProps {
  profile: UserProfile;
}

export default function TextTranslator({ profile }: TextTranslatorProps) {
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("es");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const lang = profile.settings?.appLanguage || "en";

  const handleSwapLanguages = () => {
    if (isTranslating) return;
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    if (profile.credits < 1) {
      setError("Insufficient credits to perform text translation.");
      return;
    }

    try {
      setIsTranslating(true);
      setError(null);
      const result = await translateText(
        inputText,
        LANGUAGES.find(l => l.code === sourceLang)?.name || "English",
        LANGUAGES.find(l => l.code === targetLang)?.name || "Spanish"
      );
      setTranslatedText(result);
    } catch (err) {
      console.error("Translation failed:", err);
      setError("Failed to translate text. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handlePlayAudio = async () => {
    if (!translatedText || isPlaying) return;

    try {
      setIsPlaying(true);
      const base64Audio = await generateTTS(translatedText);
      if (!base64Audio) throw new Error("No audio generated");

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = audioContextRef.current.createBuffer(1, bytes.length / 2, 24000);
      const channelData = audioBuffer.getChannelData(0);
      const int16Data = new Int16Array(bytes.buffer);
      for (let i = 0; i < int16Data.length; i++) {
        channelData[i] = int16Data[i] / 0x7FFF;
      }

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
    } catch (err) {
      console.error("TTS failed:", err);
      setIsPlaying(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
  };

  const handleClear = () => {
    setInputText("");
    setTranslatedText("");
    setError(null);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-24 lg:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-zinc-900/50 p-4 md:p-6 rounded-[2rem] border border-zinc-800/50 backdrop-blur-sm">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
            {t("text", lang)}
          </h1>
          <p className="text-zinc-500 text-[10px] md:text-sm font-black uppercase tracking-widest">Instant Text Engine</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex-1 md:flex-none flex items-center gap-2 bg-zinc-950 px-3 md:px-4 py-2 md:py-2.5 rounded-2xl border border-zinc-800 shadow-inner">
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{t("src", lang)}</span>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              disabled={isTranslating}
              className="bg-transparent text-xs md:text-sm font-black focus:outline-none cursor-pointer disabled:opacity-50"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-zinc-900">
                  {lang.flag} {lang.name.slice(0, 3)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSwapLanguages}
            disabled={isTranslating}
            className="p-2 md:p-2.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-zinc-500 hover:text-primary transition-all active:scale-95 disabled:opacity-50"
          >
            <ArrowLeftRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          <div className="flex-1 md:flex-none flex items-center gap-2 bg-zinc-950 px-3 md:px-4 py-2 md:py-2.5 rounded-2xl border border-zinc-800 shadow-inner">
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{t("dst", lang)}</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              disabled={isTranslating}
              className="bg-transparent text-xs md:text-sm font-black focus:outline-none cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-zinc-900">
                  {lang.flag} {lang.name.slice(0, 3)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8 flex flex-col space-y-6">
          <div className="flex items-center justify-end">
            <button 
              onClick={handleClear}
              className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type or paste text to translate..."
            className="flex-1 bg-transparent text-xl font-medium resize-none focus:outline-none placeholder:text-zinc-700 min-h-[300px]"
          />

          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">
              {inputText.length} characters
            </p>
            <button
              onClick={handleTranslate}
              disabled={isTranslating || !inputText.trim()}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg",
                isTranslating || !inputText.trim()
                  ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  : "bg-primary text-white hover:opacity-90 active:scale-95 shadow-primary-glow"
              )}
            >
              {isTranslating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {t("translate", lang)}
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8 flex flex-col space-y-6">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-2">
              {translatedText && (
                <>
                  <button 
                    onClick={handlePlayAudio}
                    disabled={isPlaying}
                    className={cn(
                      "p-2 transition-colors",
                      isPlaying ? "text-primary" : "text-zinc-500 hover:text-primary"
                    )}
                  >
                    {isPlaying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={handleCopy}
                    className="p-2 text-zinc-500 hover:text-primary transition-colors"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[300px]">
            {translatedText ? (
              <p className="text-xl font-medium text-primary leading-relaxed">
                {translatedText}
              </p>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2">
                <Type className="w-8 h-8 opacity-20" />
                <p className="text-sm">Translation will appear here...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
