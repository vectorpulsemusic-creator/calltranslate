import React, { useState } from 'react';
import { 
  Zap, 
  Check, 
  Loader2, 
  Shield, 
  Star, 
  Rocket, 
  Crown,
  CreditCard,
  Info,
  ArrowRight
} from 'lucide-react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, CREDIT_PLANS, UserPlan } from '../types';
import { cn } from '../utils';

interface PricingPanelProps {
  profile: UserProfile;
}

export default function PricingPanel({ profile }: PricingPanelProps) {
  const [buyingPlan, setBuyingPlan] = useState<UserPlan | null>(null);

  const handleBuyCredits = async (planId: UserPlan) => {
    const plan = CREDIT_PLANS.find(p => p.id === planId);
    if (!plan) return;

    setBuyingPlan(planId);
    try {
      const userRef = doc(db, "users", profile.uid);
      await updateDoc(userRef, {
        credits: increment(plan.credits),
        plan: planId
      });
      alert(`Successfully purchased ${plan.name} plan! ${plan.credits} credits added.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setBuyingPlan(null);
    }
  };

  const getPlanIcon = (id: UserPlan) => {
    switch (id) {
      case 'free': return <Star className="w-8 h-8 text-zinc-500" />;
      case 'advanced': return <Rocket className="w-8 h-8 text-emerald-500" />;
      case 'pro': return <Zap className="w-8 h-8 text-violet-500" />;
      case 'business': return <Crown className="w-8 h-8 text-amber-500" />;
      default: return <Star className="w-8 h-8 text-zinc-500" />;
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Limited Time Offer</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white">Choose Your Plan</h1>
        <p className="text-zinc-500 text-sm md:text-base font-medium leading-relaxed">
          Unlock the full potential of CallTranslate with our flexible credit packages. 
          Each plan is designed to suit different translation needs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {CREDIT_PLANS.map((plan) => (
          <div 
            key={plan.id}
            className={cn(
              "group relative flex flex-col p-8 rounded-[2.5rem] border transition-all duration-500 overflow-hidden",
              profile.plan === plan.id 
                ? "bg-zinc-900 border-primary/50 shadow-2xl shadow-primary/10" 
                : "bg-zinc-900/30 border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-900/50"
            )}
          >
            {profile.plan === plan.id && (
              <div className="absolute top-6 right-6">
                <div className="bg-primary text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Active
                </div>
              </div>
            )}

            <div className="mb-8 p-4 bg-zinc-950 rounded-3xl w-fit border border-zinc-800 transition-transform group-hover:scale-110 duration-500">
              {getPlanIcon(plan.id)}
            </div>

            <div className="space-y-2 mb-6">
              <h3 className="text-2xl font-black tracking-tight text-white">{plan.name}</h3>
              <p className="text-zinc-500 text-xs font-medium leading-relaxed min-h-[3rem]">
                {plan.description}
              </p>
            </div>

            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-black text-white">{plan.price}</span>
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">/ one-time</span>
            </div>

            <div className="space-y-4 mb-10 flex-1">
              <div className="flex items-center gap-3 p-3 bg-zinc-950/50 rounded-2xl border border-zinc-800/30">
                <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">{plan.credits} Credits</p>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Instant Access</p>
                </div>
              </div>
              
              <div className="space-y-3 px-2">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-primary transition-colors" />
                    <span className="text-zinc-400 group-hover:text-zinc-300 transition-colors">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleBuyCredits(plan.id)}
              disabled={buyingPlan !== null}
              className={cn(
                "w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 group/btn",
                profile.plan === plan.id
                  ? "bg-zinc-800 text-zinc-400 cursor-default"
                  : "bg-primary text-black hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
              )}
            >
              {buyingPlan === plan.id ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {profile.plan === plan.id ? "Current Plan" : "Get Started"}
                  {profile.plan !== plan.id && <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />}
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900/50 p-8 md:p-12 rounded-[3rem] border border-zinc-800/50 backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-4 max-w-xl">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Secure & Reliable</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white">Need a custom solution for your enterprise?</h2>
          <p className="text-zinc-500 text-sm font-medium">
            Contact our sales team for custom credit packages, API access, and dedicated support tailored to your business needs.
          </p>
        </div>
        <button className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-2xl transition-all whitespace-nowrap">
          Contact Sales
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800">
            <Info className="w-6 h-6 text-zinc-500" />
          </div>
          <h4 className="font-bold text-white">No Expiration</h4>
          <p className="text-xs text-zinc-500">Your credits never expire. Use them whenever you need translation services.</p>
        </div>
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800">
            <CreditCard className="w-6 h-6 text-zinc-500" />
          </div>
          <h4 className="font-bold text-white">Refund Policy</h4>
          <p className="text-xs text-zinc-500">Unused credits can be refunded within 30 days of purchase. No questions asked.</p>
        </div>
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800">
            <Shield className="w-6 h-6 text-zinc-500" />
          </div>
          <h4 className="font-bold text-white">Secure Payments</h4>
          <p className="text-xs text-zinc-500">All transactions are encrypted and processed through industry-standard gateways.</p>
        </div>
      </div>
    </div>
  );
}
