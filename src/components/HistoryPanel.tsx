import React, { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { UserProfile, TranslationSession, CreditTransaction } from "../types";
import { formatDate, formatCredits, cn, t } from "../utils";
import { History, Mic, Type, Phone, Wallet, Activity, Search, Calendar } from "lucide-react";

interface HistoryPanelProps {
  profile: UserProfile;
}

export default function HistoryPanel({ profile }: HistoryPanelProps) {
  const [sessions, setSessions] = useState<TranslationSession[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"all" | "voice" | "text" | "call" | "usage">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const lang = profile.settings?.appLanguage || "en";

  useEffect(() => {
    const sQuery = query(
      collection(db, "sessions"),
      where("userId", "==", profile.uid),
      orderBy("timestamp", "desc")
    );

    const tQuery = query(
      collection(db, "transactions"),
      where("userId", "==", profile.uid),
      orderBy("timestamp", "desc")
    );

    const sUnsubscribe = onSnapshot(sQuery, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TranslationSession)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "sessions");
    });

    const tUnsubscribe = onSnapshot(tQuery, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditTransaction)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "transactions");
    });

    return () => {
      sUnsubscribe();
      tUnsubscribe();
    };
  }, [profile.uid]);

  const filteredSessions = sessions.filter(s => {
    const matchesType = activeSubTab === "all" || s.type === activeSubTab;
    const matchesSearch = 
      s.sourceText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.translatedText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.sourceLanguage?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.targetLanguage?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const subTabs = [
    { id: "all", label: t("all", lang as any), icon: History },
    { id: "voice", label: t("voice", lang as any), icon: Mic },
    { id: "text", label: t("text", lang as any), icon: Type },
    { id: "call", label: t("calls", lang as any), icon: Phone },
    { id: "usage", label: t("usage", lang as any), icon: Wallet },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("history", lang as any)}</h1>
          <p className="text-zinc-400">{t("review_history", lang as any)}</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder={t("search_history", lang as any)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-2xl border border-zinc-800 w-fit">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 text-sm font-medium",
              activeSubTab === tab.id
                ? "bg-zinc-800 text-primary shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden">
        <div className="divide-y divide-zinc-800">
          {activeSubTab === "usage" ? (
            transactions.length > 0 ? (
              transactions.map((txn) => (
                <div key={txn.id} className="p-6 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold">{txn.reason}</p>
                      <p className="text-xs text-zinc-500">{formatDate(txn.timestamp)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-lg font-bold", txn.amount > 0 ? "text-primary" : "text-red-500")}>
                      {txn.amount > 0 ? "+" : ""}{txn.amount} {t("credits", lang as any)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-20 text-center text-zinc-500">{t("no_transactions", lang as any)}</div>
            )
          ) : (
            filteredSessions.length > 0 ? (
              filteredSessions.map((s) => (
                <div key={s.id} className="p-6 flex flex-col space-y-4 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-xl",
                        s.type === 'voice' ? "bg-blue-500/10 text-blue-500" : 
                        s.type === 'text' ? "bg-purple-500/10 text-purple-500" : 
                        "bg-primary/10 text-primary"
                      )}>
                        {s.type === 'voice' ? <Mic className="w-5 h-5" /> : 
                         s.type === 'text' ? <Type className="w-5 h-5" /> : 
                         <Phone className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-semibold capitalize">{t(`${s.type}_session`, lang as any)}</p>
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(s.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-400">-{s.cost} {t("credits", lang as any)}</p>
                      <p className="text-xs text-zinc-500">{s.sourceLanguage} → {s.targetLanguage}</p>
                    </div>
                  </div>
                  
                  {(s.sourceText || s.translatedText) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-600 mb-1">{t("source", lang as any)}</p>
                        <p className="text-sm text-zinc-400 italic">{s.sourceText || t("audio_input", lang as any)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-600 mb-1">{t("translation", lang as any)}</p>
                        <p className="text-sm text-primary font-medium">{s.translatedText || t("audio_output", lang as any)}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-20 text-center text-zinc-500">{t("no_history_category", lang as any)}</div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
