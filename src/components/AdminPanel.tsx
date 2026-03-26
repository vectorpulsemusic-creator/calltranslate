import React, { useState, useEffect } from "react";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment, addDoc, serverTimestamp, getDocs, setDoc } from "firebase/firestore";
import { UserProfile, TranslationSession, CreditTransaction, AppLanguage, LANGUAGES } from "../types";
import { formatCredits, formatDate, cn, t } from "../utils";
import { Users, CreditCard, BarChart3, Plus, Loader2, Search, ShieldCheck, TrendingUp, Mic, Type, AlertCircle, X } from "lucide-react";

interface AdminPanelProps {
  profile: UserProfile;
}

export default function AdminPanel({ profile }: AdminPanelProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [sessions, setSessions] = useState<TranslationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [creditAmount, setCreditAmount] = useState(100);
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    const usersUnsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const userList = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(userList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });

    const sessionsUnsubscribe = onSnapshot(collection(db, "sessions"), (snapshot) => {
      const sessionList = snapshot.docs.map(doc => doc.data() as TranslationSession);
      setSessions(sessionList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "sessions");
    });

    return () => {
      usersUnsubscribe();
      sessionsUnsubscribe();
    };
  }, []);

  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserDisplayName, setNewUserDisplayName] = useState("");
  const [newUserCredits, setNewUserCredits] = useState(100);
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  const [newUserLang, setNewUserLang] = useState<AppLanguage>('en');

  const lang = profile.settings?.appLanguage || "en";

  const handleAddUserManually = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || isUpdating) return;

    try {
      setIsUpdating(true);
      // We use the email as the temporary document ID
      const userRef = doc(db, "users", newUserEmail.toLowerCase());
      
      const newProfile: UserProfile = {
        uid: newUserEmail.toLowerCase(), // Temporary UID
        email: newUserEmail.toLowerCase(),
        displayName: newUserDisplayName || "New User",
        credits: newUserCredits,
        role: newUserRole,
        createdAt: serverTimestamp(),
        settings: {
          theme: "zinc",
          appLanguage: newUserLang
        }
      };

      await setDoc(userRef, newProfile);
      
      await addDoc(collection(db, "transactions"), {
        userId: newUserEmail.toLowerCase(),
        amount: newUserCredits,
        reason: "Manual user creation by admin",
        adminId: auth.currentUser?.uid,
        timestamp: serverTimestamp(),
      });

      setFeedback({ type: 'success', message: `User ${newUserEmail} created successfully!` });
      setIsAddingUser(false);
      setNewUserEmail("");
      setNewUserDisplayName("");
      setNewUserCredits(100);
      setNewUserRole('user');
    } catch (error: any) {
      console.error("Failed to add user:", error);
      setFeedback({ type: 'error', message: `Failed to create user: ${error.message}` });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddCredits = async () => {
    if (!selectedUser || isUpdating) return;

    try {
      setIsUpdating(true);
      const userRef = doc(db, "users", selectedUser.uid);
      await updateDoc(userRef, {
        credits: increment(creditAmount),
      });

      await addDoc(collection(db, "transactions"), {
        userId: selectedUser.uid,
        amount: creditAmount,
        reason: "Admin adjustment",
        adminId: auth.currentUser?.uid,
        timestamp: serverTimestamp(),
      });

      setSelectedUser(null);
      setCreditAmount(100);
    } catch (error) {
      console.error("Failed to add credits:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCredits = users.reduce((acc, u) => acc + u.credits, 0);
  const totalSessions = sessions.length;
  const voiceSessions = sessions.filter(s => s.type === 'voice').length;
  const textSessions = sessions.filter(s => s.type === 'text').length;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 lg:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter">{t("admin", lang)}</h1>
          <p className="text-zinc-500 text-xs md:text-sm font-medium">Manage users, credits, and monitor system usage.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button
            onClick={() => setIsAddingUser(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-black px-4 py-2 rounded-xl font-black text-xs md:text-sm hover:bg-zinc-200 transition-all"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            {t("add_user", lang)}
          </button>
          <div className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl border border-primary/20 text-xs md:text-sm">
            <ShieldCheck className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-black uppercase tracking-widest">{t("admin_mode", lang)}</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={cn(
          "p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300",
          feedback.type === 'success' ? "bg-primary/10 border-primary/20 text-primary" : "bg-red-500/10 border-red-500/20 text-red-400"
        )}>
          {feedback.type === 'success' ? <ShieldCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-medium">{feedback.message}</p>
        </div>
      )}

      {isAddingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 w-full max-w-md rounded-[2.5rem] border border-zinc-800 p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between sticky top-0 bg-zinc-900 z-10 pb-4">
              <h3 className="text-2xl font-bold">{t("add_user", lang)}</h3>
              <button onClick={() => setIsAddingUser(false)} className="text-zinc-500 hover:text-white">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleAddUserManually} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Display Name</label>
                <input
                  type="text"
                  value={newUserDisplayName}
                  onChange={(e) => setNewUserDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Initial Credits</label>
                  <input
                    type="number"
                    value={newUserCredits}
                    onChange={(e) => setNewUserCredits(parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-primary"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Preferred Language</label>
                <select
                  value={newUserLang}
                  onChange={(e) => setNewUserLang(e.target.value as AppLanguage)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 focus:outline-none focus:border-primary"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="w-full bg-primary text-white font-bold py-4 rounded-2xl hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-primary-glow"
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                {t("create_profile", lang)}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-zinc-900/50 p-4 md:p-6 rounded-3xl border border-zinc-800/50 space-y-2 backdrop-blur-sm">
          <div className="p-2 bg-blue-500/10 rounded-xl w-fit">
            <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
          </div>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{t("total_users", lang)}</p>
          <p className="text-xl md:text-2xl font-black tabular-nums">{users.length}</p>
        </div>
        <div className="bg-zinc-900/50 p-4 md:p-6 rounded-3xl border border-zinc-800/50 space-y-2 backdrop-blur-sm">
          <div className="p-2 bg-primary/10 rounded-xl w-fit">
            <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          </div>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{t("total_credits", lang)}</p>
          <p className="text-xl md:text-2xl font-black tabular-nums">{formatCredits(totalCredits)}</p>
        </div>
        <div className="bg-zinc-900/50 p-4 md:p-6 rounded-3xl border border-zinc-800/50 space-y-2 backdrop-blur-sm">
          <div className="p-2 bg-purple-500/10 rounded-xl w-fit">
            <Mic className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
          </div>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{t("voice_sessions", lang)}</p>
          <p className="text-xl md:text-2xl font-black tabular-nums">{voiceSessions}</p>
        </div>
        <div className="bg-zinc-900/50 p-4 md:p-6 rounded-3xl border border-zinc-800/50 space-y-2 backdrop-blur-sm">
          <div className="p-2 bg-amber-500/10 rounded-xl w-fit">
            <Type className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
          </div>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{t("text_sessions", lang)}</p>
          <p className="text-xl md:text-2xl font-black tabular-nums">{textSessions}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Management */}
        <div className="lg:col-span-2 bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden flex flex-col h-[600px]">
          <div className="p-6 border-b border-zinc-800 space-y-4">
            <h3 className="text-lg font-semibold">{t("user_management", lang)}</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder={t("search_placeholder", lang)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div 
                  key={user.uid} 
                  className={cn(
                    "p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors cursor-pointer",
                    selectedUser?.uid === user.uid && "bg-primary/5 border-l-4 border-primary"
                  )}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full border border-zinc-700"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="font-medium">{user.displayName}</p>
                      <p className="text-xs text-zinc-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatCredits(user.credits)} credits</p>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-600">{user.role}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Credit Adjustment */}
        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8 flex flex-col space-y-6 h-fit sticky top-8">
          <h3 className="text-lg font-semibold">{t("credit_adjustment", lang)}</h3>
          {selectedUser ? (
            <div className="space-y-6">
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex items-center gap-4">
                <img
                  src={selectedUser.photoURL || `https://ui-avatars.com/api/?name=${selectedUser.displayName}`}
                  alt="Selected"
                  className="w-12 h-12 rounded-full border border-zinc-700"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="font-medium">{selectedUser.displayName}</p>
                  <p className="text-xs text-zinc-500">Current: {formatCredits(selectedUser.credits)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{t("amount_to_add", lang)}</label>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setCreditAmount(prev => Math.max(1, prev - 100))}
                    className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                  >
                    -100
                  </button>
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl py-3 text-center text-xl font-bold focus:outline-none focus:border-primary"
                  />
                  <button 
                    onClick={() => setCreditAmount(prev => prev + 100)}
                    className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                  >
                    +100
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddCredits}
                disabled={isUpdating}
                className="w-full bg-primary text-white font-bold py-4 rounded-2xl hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-primary-glow"
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Add Credits
              </button>

              <button
                onClick={() => setSelectedUser(null)}
                className="w-full text-zinc-500 text-sm font-medium hover:text-zinc-300 transition-colors"
              >
                {t("cancel", lang)}
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
              <div className="p-4 bg-zinc-800 rounded-full">
                <Users className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-zinc-500 text-sm">Select a user from the list to adjust their credits.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
