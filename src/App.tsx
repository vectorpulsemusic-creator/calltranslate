import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  onSnapshot, 
  deleteDoc,
  updateDoc,
  increment
} from "firebase/firestore";
import { UserProfile, AppLanguage, CREDIT_PLANS, UserPlan } from "./types";
import Dashboard from "./components/Dashboard";
import UsersPanel from "./components/UsersPanel";
import PricingPanel from "./components/PricingPanel";
import VoiceTranslator from "./components/VoiceTranslator";
import TextTranslator from "./components/TextTranslator";
import CallTranslator from "./components/CallTranslator";
import HistoryPanel from "./components/HistoryPanel";
import SettingsPanel from "./components/SettingsPanel";
import AdminPanel from "./components/AdminPanel";
import Sidebar from "./components/Sidebar";
import SetupWizard from "./components/SetupWizard";
import { ContactList, Contact } from "./components/ContactList";
import { CallManager } from "./components/CallManager";
import { ChatWindow } from "./components/ChatWindow";
import { LogIn, Loader2, AlertTriangle, Languages, CreditCard, Plus, User, Lock, MapPin, Phone as PhoneIcon, Mail, Users as UsersIcon, Zap, Check, X, Menu as SidebarIcon } from "lucide-react";
import { cn, t } from "./utils";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = t("something_went_wrong");
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error && parsed.error.includes("insufficient permissions")) {
          displayMessage = t("no_permission");
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t("application_error")}</h2>
          <p className="text-zinc-400 max-w-md mb-6">{displayMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-white text-black px-6 py-2 rounded-xl font-semibold hover:bg-zinc-200 transition-colors"
          >
            {t("reload_application")}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSetup, setShowSetup] = useState(!localStorage.getItem("calltranslate_setup"));
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regLocation, setRegLocation] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [activeChat, setActiveChat] = useState<Contact | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setIsOffline(false);
        setUser(fbUser);
        const userRef = doc(db, "users", fbUser.uid);
        let userSnap;
        try {
          userSnap = await getDoc(userRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${fbUser.uid}`);
        }

        if (userSnap && !userSnap.exists()) {
          // Check if a profile was pre-created by email
          if (fbUser.email) {
            const emailRef = doc(db, "users", fbUser.email.toLowerCase());
            let emailSnap;
            try {
              emailSnap = await getDoc(emailRef);
            } catch (e) {
              // Ignore error for email-based fetch
            }
            
            if (emailSnap?.exists()) {
              // Migrate pre-created profile to UID
              const preData = emailSnap.data() as UserProfile;
              const newProfile: UserProfile = {
                ...preData,
                uid: fbUser.uid,
                photoURL: fbUser.photoURL || preData.photoURL || "",
                displayName: fbUser.displayName || preData.displayName || "User",
              };
              
              try {
                await setDoc(userRef, newProfile);
                // Delete the temporary email-based document
                await deleteDoc(emailRef);
                setProfile(newProfile);
              } catch (error) {
                handleFirestoreError(error, OperationType.CREATE, `users/${fbUser.uid}`);
              }
            } else {
              // Create brand new profile
              const newProfile: UserProfile = {
                uid: fbUser.uid,
                email: fbUser.email,
                displayName: fbUser.displayName || "User",
                photoURL: fbUser.photoURL || "",
                credits: 100,
                role: fbUser.email === "vectorpulsemusic@gmail.com" ? "admin" : "user",
                createdAt: serverTimestamp(),
                settings: {
                  theme: "zinc",
                  appLanguage: "en"
                }
              };
              try {
                await setDoc(userRef, newProfile);
                setProfile(newProfile);
              } catch (error) {
                handleFirestoreError(error, OperationType.CREATE, `users/${fbUser.uid}`);
              }
            }
          }
        } else if (userSnap) {
          onSnapshot(userRef, (doc) => {
            if (auth.currentUser) {
              setProfile(doc.data() as UserProfile);
            }
          }, (error) => {
            if (auth.currentUser) {
              handleFirestoreError(error, OperationType.GET, `users/${fbUser.uid}`);
            }
          });
        }
      } else {
        if (!isOffline) {
          setUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOffline]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // Use popup for Google login
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/popup-blocked') {
        alert("Please allow popups for this site to login with Google.");
      } else if (error.code === 'auth/unauthorized-domain') {
        alert(`UNAUTHORIZED DOMAIN: You must add "${window.location.hostname}" to your Firebase project's Authorized Domains in the Firebase Console (Authentication > Settings > Authorized domains).`);
      } else {
        alert(`Google login failed: ${error.message}. Try manual login if you are in a restricted environment.`);
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regPassword || !regName) {
      alert("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      const fbUser = userCredential.user;

      // Update auth profile
      await updateProfile(fbUser, {
        displayName: regName
      });

      const userRef = doc(db, "users", fbUser.uid);
      const newProfile: UserProfile = {
        uid: fbUser.uid,
        email: fbUser.email!,
        displayName: regName,
        phoneNumber: regPhone,
        location: regLocation,
        photoURL: "",
        credits: 100,
        role: fbUser.email === "vectorpulsemusic@gmail.com" ? "admin" : "user",
        createdAt: serverTimestamp(),
        settings: {
          theme: "zinc",
          appLanguage: "en"
        }
      };

      await setDoc(userRef, newProfile);
      setProfile(newProfile);
      setUser(fbUser);
      setIsRegistering(false);
    } catch (error: any) {
      console.error("Registration failed:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline) {
      handleOfflineLogin(e);
      return;
    }

    if (!username || !password) {
      alert("Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      // First try standard Firebase Auth
      try {
        await signInWithEmailAndPassword(auth, username, password);
      } catch (authError: any) {
        // If auth fails, check our custom "users" collection for manual passwords
        const userRef = doc(db, "users", username.toLowerCase());
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists() && userSnap.data().password === password) {
          // Manual password match! 
          // We'll try to sign in or create the auth account
          try {
            await signInWithEmailAndPassword(auth, username, password);
          } catch (signInError: any) {
            if (signInError.code === 'auth/user-not-found') {
              // Create the auth account on the fly
              await createUserWithEmailAndPassword(auth, username, password);
            } else {
              throw authError;
            }
          }
        } else {
          throw authError;
        }
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOfflineLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultAdmin = { email: "vectorpulsemusic@gmail.com", password: "pass123!!!" };
    const storedPassword = localStorage.getItem("calltranslate_offline_admin_password");
    const currentPassword = storedPassword || defaultAdmin.password;
    
    if (username === defaultAdmin.email && password === currentPassword) {
      const mockUser = { uid: "offline-admin", email: defaultAdmin.email, displayName: "System Admin" };
      setIsOffline(true);
      setUser(mockUser);
      setProfile({
        uid: "offline-admin",
        email: defaultAdmin.email,
        displayName: "System Admin",
        photoURL: "",
        credits: 9999,
        role: "admin",
        createdAt: new Date() as any,
        settings: {
          theme: "zinc",
          appLanguage: "en"
        }
      });
    } else {
      alert("Invalid credentials");
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setIsOffline(false);
    setUser(null);
    setProfile(null);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    const initialTheme = localStorage.getItem("calltranslate_initial_theme") || 'emerald';
    const initialLang = (localStorage.getItem("calltranslate_initial_lang") as AppLanguage) || 'en';

    return (
      <div 
        data-theme={initialTheme}
        className={cn(
          "h-screen w-full flex flex-col items-center justify-center text-white p-8 relative overflow-hidden transition-colors duration-700",
          initialTheme === 'emerald' && "bg-emerald-950/20",
          initialTheme === 'violet' && "bg-violet-950/20",
          initialTheme === 'amber' && "bg-amber-950/20",
          initialTheme === 'zinc' && "bg-zinc-950"
        )}
      >
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className={cn("absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px]", 
            initialTheme === 'emerald' && "bg-emerald-500",
            initialTheme === 'violet' && "bg-violet-500",
            initialTheme === 'amber' && "bg-amber-500",
            initialTheme === 'zinc' && "bg-zinc-500"
          )} />
          <div className={cn("absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[120px]",
            initialTheme === 'emerald' && "bg-blue-500",
            initialTheme === 'violet' && "bg-fuchsia-500",
            initialTheme === 'amber' && "bg-orange-500",
            initialTheme === 'zinc' && "bg-zinc-700"
          )} />
        </div>

        <div className="max-w-md w-full relative z-10 text-center space-y-8 md:space-y-12">
          <div className="space-y-4 md:space-y-6">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-zinc-900 rounded-2xl md:rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl border border-zinc-800 overflow-hidden relative group">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
              <Languages className="w-10 h-10 md:w-12 md:h-12 text-primary absolute" />
            </div>
            <div className="space-y-1 md:space-y-2">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter">CallTranslate</h1>
              <p className="text-zinc-500 md:text-zinc-400 text-sm md:text-lg font-medium">{t("breaking_barriers", initialLang as any)}</p>
            </div>
          </div>

          <div className="space-y-4">
            {!isRegistering ? (
              <>
                <button
                  onClick={handleLogin}
                  disabled={!isOnline}
                  className={cn(
                    "w-full group relative flex items-center justify-center gap-4 py-4 md:py-5 bg-primary text-white rounded-2xl md:rounded-[1.5rem] font-bold text-base md:text-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-primary-glow disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed",
                    !isOnline && "bg-zinc-800 shadow-none"
                  )}
                >
                  {isOnline ? (
                    <>
                      <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 md:w-6 md:h-6 bg-white rounded-full p-1" />
                      {t("continue_google", initialLang as any)}
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      {t("google_offline", initialLang as any)}
                    </>
                  )}
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-zinc-900"></span>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                    <span className="bg-[#050505] px-4 text-zinc-600">{t("or_email_login", initialLang as any)}</span>
                  </div>
                </div>

                <form onSubmit={handleEmailLogin} className="space-y-3 md:space-y-4">
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-zinc-600 group-focus-within:text-primary transition-colors" />
                    <input
                      type="email"
                      placeholder={t("email", initialLang as any)}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-xl md:rounded-2xl py-3.5 md:py-4 pl-11 md:pl-12 pr-4 text-sm md:text-base text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary/30 transition-all"
                    />
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-zinc-600 group-focus-within:text-primary transition-colors" />
                    <input
                      type="password"
                      placeholder={t("password", initialLang as any)}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-xl md:rounded-2xl py-3.5 md:py-4 pl-11 md:pl-12 pr-4 text-sm md:text-base text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary/30 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3.5 md:py-4 bg-primary/20 hover:bg-primary/30 text-primary rounded-xl md:rounded-2xl font-black text-sm md:text-base transition-all active:scale-[0.98] border border-primary/20"
                  >
                    {t("login", initialLang as any)}
                  </button>
                </form>

                <div className="pt-4">
                  <p className="text-zinc-500 text-sm font-medium">
                    {t("no_account", initialLang as any)}{" "}
                    <button 
                      onClick={() => setIsRegistering(true)}
                      className="text-primary font-black hover:underline"
                    >
                      {t("register_now", initialLang as any)}
                    </button>
                  </p>
                </div>
              </>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3 md:space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-widest text-zinc-600 ml-4">{t("full_name", initialLang as any)}</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-zinc-600 group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      placeholder={t("your_name", initialLang as any)}
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-xl md:rounded-2xl py-3.5 md:py-4 pl-11 md:pl-12 pr-4 text-sm md:text-base text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary/30 transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-widest text-zinc-600 ml-4">{t("email_address", initialLang as any)}</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-zinc-600 group-focus-within:text-primary transition-colors" />
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-xl md:rounded-2xl py-3.5 md:py-4 pl-11 md:pl-12 pr-4 text-sm md:text-base text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary/30 transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black tracking-widest text-zinc-600 ml-4">{t("phone", initialLang as any)}</label>
                    <div className="relative group">
                      <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                      <input
                        type="tel"
                        placeholder="+1..."
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary/30 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black tracking-widest text-zinc-600 ml-4">{t("location", initialLang as any)}</label>
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        placeholder="City, Country"
                        value={regLocation}
                        onChange={(e) => setRegLocation(e.target.value)}
                        className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary/30 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-widest text-zinc-600 ml-4">{t("password", initialLang as any)}</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-zinc-600 group-focus-within:text-primary transition-colors" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-zinc-900/30 border border-zinc-800/50 rounded-xl md:rounded-2xl py-3.5 md:py-4 pl-11 md:pl-12 pr-4 text-sm md:text-base text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary/30 transition-all"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <button
                    type="submit"
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-primary-glow"
                  >
                    {t("create_account", initialLang as any)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRegistering(false)}
                    className="w-full py-3 text-zinc-500 font-bold hover:text-zinc-300 transition-colors"
                  >
                    {t("back_to_login", initialLang as any)}
                  </button>
                </div>
              </form>
            )}
          </div>

          <p className="text-zinc-600 text-[10px] md:text-xs font-medium leading-relaxed px-4">
            {t("terms_privacy", initialLang as any)}
          </p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!profile) return null;
    switch (activeTab) {
      case "dashboard": return <Dashboard profile={profile} />;
      case "voice": return <VoiceTranslator profile={profile} />;
      case "text": return <TextTranslator profile={profile} />;
      case "calls": return <CallTranslator profile={profile} />;
      case "contacts": return (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-zinc-900/50 p-6 md:p-8 rounded-[2.5rem] border border-zinc-800/50 backdrop-blur-sm">
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter mb-2">{t("contacts", profile.settings?.appLanguage as any)}</h2>
            <p className="text-zinc-500 text-xs md:text-sm font-black uppercase tracking-widest">{t("manage_partners", profile.settings?.appLanguage as any)}</p>
          </div>
          <ContactList 
            onSelectContact={(contact, action) => {
              if (action === 'chat') {
                setActiveChat(contact);
              } else if (action === 'call' || action === 'translate') {
                if ((window as any).initiateCall) {
                  (window as any).initiateCall(contact);
                }
              }
            }} 
            lang={profile.settings?.appLanguage} 
          />
        </div>
      );
      case "users": return <UsersPanel profile={profile} />;
      case "plans": return <PricingPanel profile={profile} />;
      case "history": return <HistoryPanel profile={profile} />;
      case "settings": return <SettingsPanel profile={profile} />;
      case "admin": return profile.role === "admin" ? <AdminPanel profile={profile} /> : <Dashboard profile={profile} />;
      default: return <Dashboard profile={profile} />;
    }
  };

  const handleSetupComplete = (config: any) => {
    setShowSetup(false);
    if (profile) {
      setProfile({
        ...profile,
        settings: {
          ...profile.settings,
          theme: config.theme,
          appLanguage: config.language
        }
      });
    } else {
      // If not logged in yet, we'll use these settings for the login screen or next login
      localStorage.setItem("calltranslate_initial_theme", config.theme);
      localStorage.setItem("calltranslate_initial_lang", config.language);
    }
  };

  return (
    <ErrorBoundary>
      {showSetup && <SetupWizard onComplete={handleSetupComplete} />}
      <CallManager profile={profile} />
      <div 
        data-theme={profile?.settings?.theme || localStorage.getItem("calltranslate_initial_theme") || 'emerald'}
        className={cn(
          "flex h-screen bg-[#050505] text-zinc-100 overflow-hidden transition-colors duration-700",
          profile.settings?.theme === 'emerald' && "bg-emerald-950/20",
          profile.settings?.theme === 'violet' && "bg-violet-950/20",
          profile.settings?.theme === 'amber' && "bg-amber-950/20"
        )}
      >
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isAdmin={profile?.role === "admin"} 
          onLogout={handleLogout}
          profile={profile}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar */}
          <header className="h-14 md:h-20 border-b border-zinc-900/50 flex items-center justify-between px-4 md:px-12 bg-[#050505]/50 backdrop-blur-xl z-20">
            <div className="flex items-center gap-3 md:gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 hover:bg-zinc-900 rounded-lg transition-colors"
              >
                <SidebarIcon className="w-5 h-5 text-zinc-400" />
              </button>
              <div className="hidden xs:flex items-center gap-3 md:gap-4">
                <h2 className="text-[10px] md:text-sm font-black text-zinc-500 uppercase tracking-widest">
                  {t(activeTab, profile.settings?.appLanguage)}
                </h2>
              </div>
              {!isOnline && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">{t("offline", profile.settings?.appLanguage as any)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 md:gap-6">
              <div className="flex items-center gap-1.5 md:gap-3 px-2.5 md:px-4 py-1 md:py-2 bg-zinc-900/50 rounded-lg md:rounded-2xl border border-zinc-800/50 shadow-inner group">
                <div className="relative w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:scale-110">
                  <img 
                    src="https://img.icons8.com/fluency/48/coins.png" 
                    alt="Token" 
                    className="w-full h-full"
                  />
                </div>
                <span className="text-[10px] md:text-sm font-black font-mono text-primary">{profile.credits}</span>
              </div>
              
              <button
                onClick={() => setActiveTab("plans")}
                className="flex items-center gap-1.5 px-3 md:px-6 py-1.5 md:py-2.5 bg-primary hover:opacity-90 text-white rounded-lg md:rounded-2xl font-black text-[10px] md:text-sm transition-all shadow-lg shadow-primary-glow active:scale-95"
              >
                <Plus className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">{t("buy_credits", profile.settings?.appLanguage)}</span>
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-3 md:p-8 lg:p-12 scrollbar-hide pb-24 lg:pb-12">
            <div className="max-w-7xl mx-auto">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
      {activeChat && (
        <ChatWindow 
          contact={activeChat} 
          onClose={() => setActiveChat(null)} 
          userLanguage={profile?.settings?.appLanguage || 'en'}
          lang={profile?.settings?.appLanguage || 'en'}
        />
      )}
    </ErrorBoundary>
  );
}
