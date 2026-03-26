import React, { useState, useRef, useEffect } from "react";
import { Phone, PhoneOff, Globe, Loader2, AlertCircle, Zap, User, UserPlus, ArrowLeftRight, X } from "lucide-react";
import { LANGUAGES, UserProfile } from "../types";
import { connectCallTranslation, deductCredits } from "../services/geminiService";
import { cn, t } from "../utils";
import { ContactList } from "./ContactList";

interface CallTranslatorProps {
  profile: UserProfile;
}

export default function CallTranslator({ profile }: CallTranslatorProps) {
  const [isInCall, setIsInCall] = useState(false);
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("fr");
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [autoDetect, setAutoDetect] = useState(true);
  const [transcription, setTranscription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lang = profile.settings?.appLanguage || "en";
  const localKey = localStorage.getItem("calltranslate_gemini_key");
  const apiKey = localKey || process.env.GEMINI_API_KEY;
  const isMock = !apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcription]);

  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  const nextStartTimeRef = useRef(0);

  const handleSwapLanguages = () => {
    if (isInCall) return;
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  const startCall = async () => {
    if (profile.credits < 10) {
      setError("Insufficient credits to start a call session.");
      return;
    }

    try {
      setError(null);
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micErr) {
        console.error("Microphone access denied:", micErr);
        setError("Microphone access denied. Please allow microphone permissions in your browser settings.");
        return;
      }
      
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;
      nextStartTimeRef.current = audioContext.currentTime + 0.1;

      let session;
      try {
        session = await connectCallTranslation(
          LANGUAGES.find(l => l.code === sourceLang)?.name || "English",
          LANGUAGES.find(l => l.code === targetLang)?.name || "French",
          profile.settings?.voice || "Fenrir",
          (base64Audio) => playAudio(base64Audio),
          (text) => {
            const sName = LANGUAGES.find(l => l.code === sourceLang)?.name || "Source";
            const tName = LANGUAGES.find(l => l.code === targetLang)?.name || "Target";
            setTranscription(prev => prev + `\n(${sName}) ${text} (${tName})`);
          }
        );
      } catch (connErr) {
        console.error("Translation service connection failed:", connErr);
        setError("Could not connect to the translation service. Please check your internet connection or API key.");
        endCall();
        return;
      }
      
      sessionRef.current = session;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(512, 1, 1); // Further reduced buffer size for lower latency
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        
        session.sendRealtimeInput({
          audio: { data: base64Data, mimeType: "audio/pcm;rate=24000" }
        });
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsInCall(true);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Failed to start call:", err);
      const localKey = localStorage.getItem("calltranslate_gemini_key");
      const apiKey = localKey || process.env.GEMINI_API_KEY;
      const isMock = !apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "";
      
      if (isMock) {
        setError("Running in Mock Mode. Please set your Gemini API key in settings for real translations.");
      } else {
        setError("Could not connect to translation service. Check your API key and internet connection.");
      }
    }
  };

  const endCall = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (startTimeRef.current) {
      const duration = (Date.now() - startTimeRef.current) / 1000;
      await deductCredits("call", duration, sourceLang, targetLang);
    }

    setIsInCall(false);
    setCallDuration(0);
    startTimeRef.current = null;
    nextStartTimeRef.current = 0;
  };

  const playAudio = async (base64Audio: string) => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
    
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
    
    const currentTime = audioContextRef.current.currentTime;
    if (nextStartTimeRef.current < currentTime) {
      nextStartTimeRef.current = currentTime + 0.05; // Smaller buffer if we fall behind
    }
    
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectContact = (contact: any, action: 'call' | 'translate') => {
    if (isInCall) return;
    
    if (contact.preferredLanguage) {
      const langExists = LANGUAGES.some(l => l.code === contact.preferredLanguage);
      if (langExists) {
        setTargetLang(contact.preferredLanguage);
      }
    }
    
    setSelectedContact(contact);
    
    if (action === 'call') {
      startCall();
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-24 lg:pb-0">
      {isMock && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-3xl flex items-center justify-between gap-4 text-amber-500 shadow-2xl shadow-amber-500/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            </div>
            <p className="text-xs md:text-sm font-black tracking-tight">Running in <span className="text-amber-400">Mock Mode</span>. Real-time translation is disabled. Set your Gemini API key in <span className="underline decoration-amber-500/50 underline-offset-4">Settings</span> to enable real translations.</p>
          </div>
          <Zap className="w-4 h-4 animate-pulse text-amber-400" />
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-zinc-900/50 p-4 md:p-6 rounded-[2rem] border border-zinc-800/50 backdrop-blur-sm">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
            {t("calls", lang)}
          </h1>
          {selectedContact ? (
            <div className="flex items-center gap-2 text-primary animate-in fade-in slide-in-from-left-2 duration-300">
              <User className="w-3 h-3" />
              <span className="text-[10px] font-black uppercase tracking-widest">{selectedContact.name}</span>
              <button onClick={() => setSelectedContact(null)} className="text-zinc-500 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <p className="text-zinc-500 text-[10px] md:text-sm font-black uppercase tracking-widest">Call Engine</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="flex-1 md:flex-none flex items-center gap-2 bg-zinc-950 px-3 md:px-4 py-2 md:py-2.5 rounded-2xl border border-zinc-800 shadow-inner">
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{t("src", lang)}</span>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              disabled={isInCall || autoDetect}
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
            onClick={() => setAutoDetect(!autoDetect)}
            disabled={isInCall}
            className={cn(
              "flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-2xl border transition-all duration-300 font-black text-[10px] md:text-sm shadow-lg",
              autoDetect 
                ? "bg-primary border-primary/50 text-white shadow-primary-glow" 
                : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Zap className={cn("w-3 h-3 md:w-4 md:h-4", autoDetect && "fill-white")} />
            <span className="hidden xs:inline">{t("auto", lang)}</span>
          </button>

          <button
            onClick={handleSwapLanguages}
            disabled={isInCall}
            className="p-2 md:p-2.5 bg-zinc-950 border border-zinc-800 rounded-2xl text-zinc-500 hover:text-primary transition-all active:scale-95 disabled:opacity-50"
          >
            <ArrowLeftRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          <div className="flex-1 md:flex-none flex items-center gap-2 bg-zinc-950 px-3 md:px-4 py-2 md:py-2.5 rounded-2xl border border-zinc-800 shadow-inner">
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{t("dst", lang)}</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              disabled={isInCall}
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

      <div className="max-w-4xl mx-auto w-full">
        <div className="bg-zinc-900 rounded-[2.5rem] border border-zinc-800 p-6 md:p-8 flex flex-col items-center space-y-6 md:space-y-8 shadow-2xl relative overflow-hidden">
          {/* Call UI */}
          <div className="flex flex-col items-center space-y-3 md:space-y-4 relative z-10">
            <div className="relative">
              {isInCall && (
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping scale-150" />
              )}
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-zinc-800 flex items-center justify-center border-4 border-zinc-700 shadow-inner">
                <User className="w-10 h-10 md:w-12 md:h-12 text-zinc-600" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-lg md:text-xl font-bold">
                {isInCall ? t("active_call", lang) : t("ready_call", lang)}
              </h2>
              {isInCall && (
                <p className="text-primary font-mono text-base md:text-lg animate-pulse">
                  {formatTime(callDuration)}
                </p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 md:gap-6 relative z-10">
            <button className="p-2 md:p-3 bg-zinc-800 rounded-full text-zinc-400 hover:bg-zinc-700 transition-colors">
              <UserPlus className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button
              onClick={isInCall ? endCall : startCall}
              className={cn(
                "w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl",
                isInCall 
                  ? "bg-red-500 hover:bg-red-600 rotate-[135deg]" 
                  : "bg-primary hover:opacity-90 shadow-primary-glow"
              )}
            >
              <Phone className="w-5 h-5 md:w-8 md:h-8 text-white" />
            </button>
            <button className="p-2 md:p-3 bg-zinc-800 rounded-full text-zinc-400 hover:bg-zinc-700 transition-colors">
              <PhoneOff className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>

          {/* Transcript */}
          {isInCall && (
            <div 
              ref={scrollRef}
              className="w-full bg-zinc-950/50 rounded-3xl p-4 md:p-5 border border-zinc-800/50 h-48 md:h-64 overflow-y-auto custom-scrollbar relative z-10"
            >
              <p className="text-zinc-400 text-center text-[10px] md:text-xs italic whitespace-pre-line leading-relaxed">
                {transcription || t("waiting_speech", lang as any)}
              </p>
            </div>
          )}

          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10 w-32 h-32 bg-primary rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-32 h-32 bg-blue-500 rounded-full blur-3xl" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full">
        <ContactList onSelectContact={handleSelectContact} lang={lang} />
      </div>
    </div>
  );
}
