import React, { useState, useEffect } from "react";
import { UserProfile, TranslationSession } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { formatCredits, formatDate, cn } from "../utils";
import { Wallet, Activity, History, TrendingUp, Mic, Type } from "lucide-react";

interface DashboardProps {
  profile: UserProfile;
}

export default function Dashboard({ profile }: DashboardProps) {
  const [sessions, setSessions] = useState<TranslationSession[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "sessions"),
      where("userId", "==", profile.uid),
      orderBy("timestamp", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TranslationSession[];
      setSessions(sessionList);

      // Process data for chart (last 7 days)
      const dailyUsage: { [key: string]: number } = {};
      sessionList.forEach((s) => {
        const date = formatDate(s.timestamp).split(",")[0];
        dailyUsage[date] = (dailyUsage[date] || 0) + s.cost;
      });

      const data = Object.entries(dailyUsage)
        .map(([date, cost]) => ({ date, cost }))
        .reverse();
      setChartData(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "sessions");
    });

    return () => unsubscribe();
  }, [profile.uid]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 lg:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter">Welcome, {profile.displayName.split(' ')[0]}</h1>
          <p className="text-zinc-500 text-sm font-medium">Your translation hub is ready.</p>
        </div>
        <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-3xl border border-zinc-800/50 shadow-xl backdrop-blur-sm">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <img 
              src="https://img.icons8.com/fluency/48/coins.png" 
              alt="Token" 
              className="w-6 h-6"
            />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Credits</p>
            <p className="text-2xl font-black text-white tabular-nums">{formatCredits(profile.credits)}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-zinc-900/50 p-5 rounded-3xl border border-zinc-800/50 space-y-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-[8px] font-black text-blue-500 bg-blue-500/10 px-2 py-1 rounded-full uppercase tracking-widest">Live</span>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Sessions</p>
            <p className="text-xl font-black tabular-nums">{sessions.length}</p>
          </div>
        </div>
        <div className="bg-zinc-900/50 p-5 rounded-3xl border border-zinc-800/50 space-y-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </div>
            <span className="text-[8px] font-black text-purple-500 bg-purple-500/10 px-2 py-1 rounded-full uppercase tracking-widest">+12%</span>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Used (7d)</p>
            <p className="text-xl font-black tabular-nums">{formatCredits(chartData.reduce((acc, curr) => acc + curr.cost, 0))}</p>
          </div>
        </div>
        <div className="col-span-2 md:col-span-1 bg-zinc-900/50 p-5 rounded-3xl border border-zinc-800/50 space-y-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <History className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full uppercase tracking-widest">Recent</span>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Last Activity</p>
            <p className="text-xl font-black truncate">
              {sessions[0] ? `${sessions[0].type === 'voice' ? 'Voice' : 'Text'}` : 'None'}
            </p>
          </div>
        </div>
      </div>

      {/* Usage Chart */}
      <div className="bg-zinc-900/50 p-6 rounded-[2.5rem] border border-zinc-800/50 h-[300px] md:h-[400px] backdrop-blur-sm">
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500 mb-6">Usage Statistics</h3>
        <div className="h-full pb-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#71717a" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#71717a" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                itemStyle={{ color: 'var(--color-primary)' }}
              />
              <Area 
                type="monotone" 
                dataKey="cost" 
                stroke="var(--color-primary)" 
                fillOpacity={1} 
                fill="url(#colorCost)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          <button className="text-sm text-primary hover:underline">View all</button>
        </div>
        <div className="divide-y divide-zinc-800">
          {sessions.length > 0 ? (
            sessions.map((session) => (
              <div key={session.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-2 rounded-xl",
                    session.type === 'voice' ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"
                  )}>
                    {session.type === 'voice' ? <Mic className="w-5 h-5" /> : <Type className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium capitalize">{session.type} Translation</p>
                    <p className="text-xs text-zinc-500">{formatDate(session.timestamp)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-400">-{session.cost} credits</p>
                  <p className="text-xs text-zinc-500">{session.sourceLanguage} → {session.targetLanguage}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-zinc-500">
              No translation history found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
