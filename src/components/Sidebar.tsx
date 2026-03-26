import React from "react";
import { LayoutDashboard, Mic, Type, History, Settings, LogOut, Shield, Phone, Languages, Users } from "lucide-react";
import { cn, t } from "../utils";
import { UserProfile } from "../types";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  onLogout: () => void;
  profile: UserProfile | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, isAdmin, onLogout, profile, isOpen, onClose }: SidebarProps) {
  const lang = profile?.settings?.appLanguage || "en";

  const menuItems = [
    { id: "dashboard", label: t("dashboard", lang), icon: LayoutDashboard, short: "Dash" },
    { id: "voice", label: t("voice", lang), icon: Mic, short: "Voice" },
    { id: "text", label: t("text", lang), icon: Type, short: "Text" },
    { id: "calls", label: t("calls", lang), icon: Phone, short: "Calls" },
    { id: "contacts", label: t("contacts", lang), icon: Users, short: "Users" },
    { id: "history", label: t("history", lang), icon: History, short: "Hist" },
    { id: "settings", label: t("settings", lang), icon: Settings, short: "Set" },
  ];

  if (isAdmin) {
    menuItems.push({ id: "users", label: "Users", icon: Users, short: "Users" });
    menuItems.push({ id: "admin", label: t("admin_mode", lang), icon: Shield, short: "Admin" });
  }

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full p-4 space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center overflow-hidden border border-zinc-800 shadow-lg relative">
            <Languages className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-white">CallTranslate</h1>
            <p className="text-[7px] uppercase tracking-[0.2em] font-black text-zinc-600">Pro Edition</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2 hover:bg-zinc-900 rounded-lg">
            <LogOut className="w-5 h-5 text-zinc-500 rotate-180" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-0.5">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group relative",
              activeTab === item.id
                ? "bg-zinc-900 text-primary shadow-lg shadow-black/20"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
            )}
          >
            {activeTab === item.id && (
              <div className="absolute left-0 w-1 h-5 bg-primary rounded-r-full" />
            )}
            <item.icon className={cn(
              "w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-110",
              activeTab === item.id ? "text-primary" : "text-zinc-600"
            )} />
            <span className="font-bold text-sm tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="pt-4 border-t border-zinc-900 space-y-3">
        {profile && (
          <div className="flex items-center gap-3 px-3 py-2.5 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
            <div className="relative">
              <img
                src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`}
                alt="Profile"
                className="w-9 h-9 rounded-xl border border-zinc-800 shadow-lg"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-zinc-950 rounded-full flex items-center justify-center border border-zinc-800">
                <img 
                  src="https://img.icons8.com/fluency/48/coins.png" 
                  alt="Token" 
                  className="w-3 h-3"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black truncate text-white">{profile.displayName}</p>
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-primary font-mono font-black">{profile.credits}</span>
                <span className="text-[7px] text-zinc-600 uppercase font-black tracking-widest">{t("credits", lang)}</span>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300 group"
        >
          <LogOut className="w-4.5 h-4.5 transition-transform group-hover:-translate-x-1" />
          <span className="font-bold text-sm tracking-tight">{t("logout", lang)}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col h-full hidden lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile Overlay Sidebar */}
      <div className={cn(
        "fixed inset-0 z-[60] lg:hidden transition-opacity duration-300",
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <aside className={cn(
          "absolute left-0 top-0 bottom-0 w-72 bg-zinc-950 border-r border-zinc-900 transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {sidebarContent}
        </aside>
      </div>

    {/* Mobile Navigation */}
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-2xl border-t border-zinc-900 px-2 py-3 flex items-center justify-around z-50 safe-area-bottom">
      {menuItems.map((item: any) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={cn(
            "flex flex-col items-center gap-1.5 px-3 py-1 rounded-xl transition-all duration-300",
            activeTab === item.id 
              ? "text-primary scale-110" 
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <item.icon className={cn("w-5 h-5", activeTab === item.id && "fill-primary/20")} />
          <span className="text-[9px] font-black uppercase tracking-widest">{item.short}</span>
          {activeTab === item.id && (
            <div className="w-1 h-1 bg-primary rounded-full absolute -bottom-1" />
          )}
        </button>
      ))}
    </nav>
  </>
);
}
