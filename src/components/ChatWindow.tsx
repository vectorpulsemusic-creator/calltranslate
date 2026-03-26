import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  X, 
  Languages, 
  Loader2, 
  User,
  MessageSquare,
  Globe
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  limit,
  doc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { translateText } from '../services/geminiService';
import { t, cn } from '../utils';
import { Contact } from './ContactList';

interface Message {
  id: string;
  senderId: string;
  text: string;
  translatedText?: string;
  originalLanguage?: string;
  targetLanguage?: string;
  createdAt: any;
}

interface ChatWindowProps {
  contact: Contact;
  onClose: () => void;
  userLanguage: string;
  lang: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  contact, 
  onClose, 
  userLanguage,
  lang 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Chat ID is a combination of both UIDs sorted to ensure uniqueness
    // However, since we might not have the contact's UID (only email/phone),
    // we'll use a more flexible approach: messages where (sender=me AND receiver=contactEmail) OR (sender=contactEmail AND receiver=me)
    // For simplicity in this prototype, we'll use contact.email as the identifier if available, otherwise phone
    const contactIdentifier = contact.email || contact.phoneNumber || contact.id;
    
    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .filter(docSnap => {
          const participants = (docSnap.data() as any).participants || [];
          return participants.includes(contactIdentifier);
        })
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Message));
      
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [contact]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !auth.currentUser) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsTranslating(true);

    try {
      let translatedText = '';
      if (autoTranslate && contact.preferredLanguage && contact.preferredLanguage !== userLanguage) {
        translatedText = await translateText(textToSend, userLanguage, contact.preferredLanguage);
      }

      const contactIdentifier = contact.email || contact.phoneNumber || contact.id;

      await addDoc(collection(db, 'messages'), {
        senderId: auth.currentUser.uid,
        receiverId: contactIdentifier,
        participants: [auth.currentUser.uid, contactIdentifier],
        text: textToSend,
        translatedText: translatedText || null,
        originalLanguage: userLanguage,
        targetLanguage: contact.preferredLanguage || null,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="relative">
              {contact.photoURL ? (
                <img 
                  src={contact.photoURL} 
                  alt={contact.name} 
                  className="w-12 h-12 rounded-2xl object-cover border border-zinc-800"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700">
                  <User className="w-6 h-6 text-zinc-500" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white">{contact.name}</h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
                  {contact.preferredLanguage ? `Speaking ${contact.preferredLanguage.toUpperCase()}` : 'Online'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setAutoTranslate(!autoTranslate)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                autoTranslate 
                  ? "bg-primary/10 border-primary/20 text-primary" 
                  : "bg-zinc-800 border-zinc-700 text-zinc-500"
              )}
            >
              <Globe className="w-3 h-3" />
              {autoTranslate ? 'Auto-Translate ON' : 'Auto-Translate OFF'}
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-zinc-950/30"
        >
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
              <MessageSquare className="w-16 h-16 text-zinc-500" />
              <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">No messages yet</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === auth.currentUser?.uid;
              return (
                <div 
                  key={msg.id} 
                  className={cn(
                    "flex flex-col max-w-[80%]",
                    isMe ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "p-4 rounded-2xl shadow-sm space-y-2",
                    isMe 
                      ? "bg-primary text-white rounded-tr-none" 
                      : "bg-zinc-800 text-zinc-100 rounded-tl-none"
                  )}>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    {msg.translatedText && (
                      <div className={cn(
                        "pt-2 border-t flex items-start gap-2",
                        isMe ? "border-white/10" : "border-zinc-700"
                      )}>
                        <Languages className="w-3 h-3 mt-1 flex-shrink-0 opacity-50" />
                        <p className="text-xs italic opacity-80">{msg.translatedText}</p>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter mt-1 px-1">
                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="p-6 bg-zinc-900/50 border-t border-zinc-800">
          <form onSubmit={handleSendMessage} className="relative flex items-center gap-4">
            <div className="relative flex-1 group">
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t("type_message", lang as any)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-5 pr-12 text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary/50 transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {isTranslating && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
              </div>
            </div>
            <button 
              type="submit"
              disabled={!inputText.trim() || isTranslating}
              className="p-4 bg-primary hover:opacity-90 disabled:opacity-50 disabled:hover:opacity-50 text-white rounded-2xl transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="mt-3 text-[9px] text-zinc-600 font-black uppercase tracking-widest text-center">
            Messages are automatically translated using Gemini AI
          </p>
        </div>
      </div>
    </div>
  );
};
