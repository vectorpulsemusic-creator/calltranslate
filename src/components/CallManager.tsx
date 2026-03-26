import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Languages, 
  X, 
  User, 
  ShieldAlert,
  Loader2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  getDoc,
  getDocs,
  arrayUnion
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, LANGUAGES } from '../types';
import { connectCallTranslation } from '../services/geminiService';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface Call {
  id: string;
  callerId: string;
  receiverId: string;
  status: 'ringing' | 'active' | 'ended' | 'rejected';
  callerLang: string;
  receiverLang: string;
  callerName: string;
  receiverName: string;
  timestamp: any;
}

interface CallManagerProps {
  profile: UserProfile;
}

export const CallManager: React.FC<CallManagerProps> = ({ profile }) => {
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<Call | null>(null);
  const [transcription, setTranscription] = useState('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const geminiSessionRef = useRef<any>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Listen for incoming calls
  useEffect(() => {
    if (!profile.uid) return;

    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', profile.uid),
      where('status', '==', 'ringing')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty && !activeCall && !incomingCall) {
        const callData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Call;
        setIncomingCall(callData);
        // Play ringtone (optional)
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'calls');
    });

    return () => unsubscribe();
  }, [profile.uid, activeCall, incomingCall]);

  // Listen for active call updates
  useEffect(() => {
    if (!activeCall?.id) return;

    const unsubscribe = onSnapshot(doc(db, 'calls', activeCall.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Call;
        if (data.status === 'ended' || data.status === 'rejected') {
          handleEndCallLocally();
        }
      } else {
        handleEndCallLocally();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `calls/${activeCall.id}`);
    });

    return () => unsubscribe();
  }, [activeCall?.id]);

  // Listen for outgoing call acceptance
  useEffect(() => {
    if (!outgoingCall?.id) return;

    const unsubscribe = onSnapshot(doc(db, 'calls', outgoingCall.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Call;
        if (data.status === 'active') {
          setActiveCall({ ...data, id: docSnap.id });
          setOutgoingCall(null);
          startCallSession(data);
        } else if (data.status === 'rejected' || data.status === 'ended') {
          setOutgoingCall(null);
          handleEndCallLocally();
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `calls/${outgoingCall.id}`);
    });

    return () => unsubscribe();
  }, [outgoingCall?.id]);

  const startCallSession = async (call: Call) => {
    // 1. Setup WebSocket for audio relay
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.VITE_WS_URL || window.location.host;
    const wsUrl = wsHost.startsWith('ws') ? wsHost : `${protocol}//${wsHost}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', callId: call.id, userId: profile.uid }));
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      alert("Voice call connection failed. This hosting provider may not support WebSockets (e.g. Netlify). Please use a different hosting provider or set VITE_WS_URL.");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'audio') {
        audioQueueRef.current.push(data.data);
        processAudioQueue();
      }
    };

    // 2. Setup Gemini for translation
    const isCaller = call.callerId === profile.uid;
    const sourceLang = isCaller ? call.callerLang : call.receiverLang;
    const targetLang = isCaller ? call.receiverLang : call.callerLang;

    try {
      const session = await connectCallTranslation(
        sourceLang,
        targetLang,
        profile.settings?.voice || 'Zephyr',
        (translatedAudio) => {
          // Send translated audio to the other participant
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'audio',
              callId: call.id,
              userId: profile.uid,
              data: translatedAudio
            }));
          }
        },
        (text) => setTranscription(text)
      );
      geminiSessionRef.current = session;

      // 3. Start Mic Capture
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMuted) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert to 16-bit PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        
        // Convert to base64
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        
        // Send to Gemini
        if (geminiSessionRef.current) {
          geminiSessionRef.current.then((s: any) => {
            s.sendRealtimeInput({
              audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
            });
          });
        }
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

    } catch (err) {
      console.error("Failed to start Gemini session or mic:", err);
    }
  };

  const processAudioQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    const base64 = audioQueueRef.current.shift()!;
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      
      // Assuming 24kHz PCM from Gemini
      const audioBuffer = audioContextRef.current.createBuffer(1, bytes.length / 2, 24000);
      const channelData = audioBuffer.getChannelData(0);
      const dataView = new DataView(bytes.buffer);
      
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = dataView.getInt16(i * 2, true) / 32768;
      }

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        isPlayingRef.current = false;
        processAudioQueue();
      };
      source.start();
    } catch (err) {
      console.error("Audio playback error:", err);
      isPlayingRef.current = false;
      processAudioQueue();
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'active' });
    setActiveCall(incomingCall);
    setIncomingCall(null);
    startCallSession(incomingCall);
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;
    await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'rejected' });
    setIncomingCall(null);
  };

  const handleEndCall = async () => {
    const callId = activeCall?.id || outgoingCall?.id || incomingCall?.id;
    if (callId) {
      await updateDoc(doc(db, 'calls', callId), { status: 'ended' });
    }
    handleEndCallLocally();
  };

  const handleEndCallLocally = () => {
    setActiveCall(null);
    setIncomingCall(null);
    setOutgoingCall(null);
    setTranscription('');
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (geminiSessionRef.current) {
      geminiSessionRef.current.then((s: any) => s.close());
      geminiSessionRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  };

  const handleBlockContact = async () => {
    if (!activeCall) return;
    const otherId = activeCall.callerId === profile.uid ? activeCall.receiverId : activeCall.callerId;
    await updateDoc(doc(db, 'users', profile.uid), {
      blockedUids: arrayUnion(otherId)
    });
    handleEndCall();
  };

  const handleChangeLanguage = async (newLang: string) => {
    if (!activeCall) return;
    const isCaller = activeCall.callerId === profile.uid;
    await updateDoc(doc(db, 'calls', activeCall.id), {
      [isCaller ? 'callerLang' : 'receiverLang']: newLang
    });
    // Gemini session will need to be restarted or updated if possible
    // For now, let's just update the local state and restart session
    if (geminiSessionRef.current) {
      geminiSessionRef.current.close();
      startCallSession({ ...activeCall, [isCaller ? 'callerLang' : 'receiverLang']: newLang });
    }
  };

  // Expose initiateCall to window for other components to use
  useEffect(() => {
    (window as any).initiateCall = async (contact: any) => {
      let receiverId = contact.contactUid;

      if (!receiverId && contact.email) {
        // Try to find user by email
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', contact.email.toLowerCase()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          receiverId = querySnapshot.docs[0].data().uid;
        }
      }

      if (!receiverId) {
        alert("This contact doesn't have the app installed or UID linked.");
        return;
      }

      const callData = {
        callerId: profile.uid,
        receiverId: receiverId,
        status: 'ringing',
        callerLang: profile.settings?.appLanguage || 'en',
        receiverLang: contact.preferredLanguage || 'en',
        callerName: profile.displayName || 'User',
        receiverName: contact.name,
        timestamp: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'calls'), callData);
      setOutgoingCall({ id: docRef.id, ...callData } as Call);
    };

    return () => { delete (window as any).initiateCall; };
  }, [profile]);

  if (!incomingCall && !outgoingCall && !activeCall) return null;

  return createPortal(
    <AnimatePresence>
      {/* Incoming Call Overlay */}
      {incomingCall && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-8 right-8 z-[200] w-full max-w-sm"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="relative">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                  <User className="w-12 h-12 text-primary" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-2 rounded-full border-4 border-zinc-900">
                  <Phone className="w-4 h-4 text-white animate-bounce" />
                </div>
              </div>
              
              <div>
                <h3 className="text-2xl font-black tracking-tight text-white">{incomingCall.callerName}</h3>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mt-1">Incoming Translated Call</p>
              </div>

              <div className="flex items-center gap-4 w-full">
                <button 
                  onClick={handleRejectCall}
                  className="flex-1 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
                >
                  <PhoneOff className="w-4 h-4" />
                  Decline
                </button>
                <button 
                  onClick={handleAcceptCall}
                  className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Phone className="w-4 h-4" />
                  Accept
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Outgoing Call Overlay */}
      {outgoingCall && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] w-full max-w-md p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary/20">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 30, ease: "linear" }}
              />
            </div>

            <div className="flex flex-col items-center text-center space-y-8">
              <div className="relative">
                <div className="w-32 h-32 bg-zinc-800 rounded-full flex items-center justify-center relative overflow-hidden">
                  <User className="w-16 h-16 text-zinc-600" />
                  <div className="absolute inset-0 border-4 border-primary rounded-full animate-ping opacity-20" />
                </div>
              </div>

              <div>
                <h3 className="text-3xl font-black tracking-tighter text-white">{outgoingCall.receiverName}</h3>
                <p className="text-sm font-black uppercase tracking-widest text-primary mt-2 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calling...
                </p>
              </div>

              <button 
                onClick={handleEndCall}
                className="w-20 h-20 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-xl shadow-red-500/20 active:scale-90"
              >
                <PhoneOff className="w-8 h-8" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Active Call UI */}
      {activeCall && (
        <motion.div 
          layout
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "fixed z-[250] transition-all duration-500 ease-in-out",
            isMinimized 
              ? "bottom-8 right-8 w-80" 
              : "inset-0 md:inset-8 flex items-center justify-center p-4"
          )}
        >
          <div className={cn(
            "bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col",
            isMinimized ? "rounded-3xl h-48" : "rounded-[3rem] w-full max-w-4xl h-[80vh]"
          )}>
            {/* Header */}
            <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-black text-white tracking-tight">
                    {activeCall.callerId === profile.uid ? activeCall.receiverName : activeCall.callerName}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Live Translated Call</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
                </button>
                {!isMinimized && (
                  <button 
                    onClick={handleBlockContact}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-500 transition-colors"
                    title="Block Contact"
                  >
                    <ShieldAlert className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            {!isMinimized && (
              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Your Language</label>
                    <select 
                      value={activeCall.callerId === profile.uid ? activeCall.callerLang : activeCall.receiverLang}
                      onChange={(e) => handleChangeLanguage(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-primary/50"
                    >
                      {LANGUAGES.map(l => (
                        <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Partner's Language</label>
                    <div className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 text-zinc-400 font-bold">
                      {LANGUAGES.find(l => l.code === (activeCall.callerId === profile.uid ? activeCall.receiverLang : activeCall.callerLang))?.name}
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2rem] p-8 h-[300px] flex flex-col">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-4 flex-shrink-0">Live Transcription</label>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <p className="text-xl font-medium text-zinc-300 leading-relaxed italic">
                      {transcription || "Listening for speech..."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className={cn(
              "p-6 border-t border-zinc-900 bg-zinc-900/50 flex items-center justify-center gap-6 md:gap-12",
              isMinimized && "flex-1 border-t-0"
            )}>
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className={cn(
                  "w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all",
                  isMuted ? "bg-red-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                )}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <button 
                onClick={handleEndCall}
                className="w-14 h-14 md:w-20 md:h-20 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-xl shadow-red-500/20 active:scale-90"
              >
                <PhoneOff className="w-8 h-8" />
              </button>

              <button 
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={cn(
                  "w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all",
                  !isSpeakerOn ? "bg-zinc-700 text-zinc-500" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                )}
              >
                {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
