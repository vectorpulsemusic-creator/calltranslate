import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Edit2, 
  Trash2, 
  Shield, 
  User as UserIcon,
  CreditCard,
  Save,
  X,
  Loader2,
  Check,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, CREDIT_PLANS, UserPlan } from '../types';
import { cn, t } from '../utils';

interface UsersPanelProps {
  profile: UserProfile;
}

export default function UsersPanel({ profile }: UsersPanelProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id
      })) as UserProfile[];
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    try {
      const userRef = doc(db, 'users', editingUser.uid);
      await updateDoc(userRef, {
        displayName: editingUser.displayName || '',
        email: editingUser.email || '',
        phoneNumber: editingUser.phoneNumber || '',
        location: editingUser.location || '',
        credits: Number(editingUser.credits) || 0,
        role: editingUser.role,
        plan: editingUser.plan || 'free'
      });
      setEditingUser(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${editingUser.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.uid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-zinc-900/50 p-6 md:p-8 rounded-[2.5rem] border border-zinc-800/50 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter mb-2">User Management</h2>
          <p className="text-zinc-500 text-xs md:text-sm font-black uppercase tracking-widest">Manage all registered users and their permissions</p>
        </div>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-full py-3 pl-12 pr-6 text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all w-full md:w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredUsers.map((u) => (
          <div 
            key={u.uid}
            className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-6 hover:bg-zinc-900/50 transition-all group"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                  {u.role === 'admin' ? <Shield className="w-6 h-6" /> : <UserIcon className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    {u.displayName || 'Unnamed User'}
                    {u.role === 'admin' && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-widest font-black">Admin</span>}
                    {u.plan && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full uppercase tracking-widest font-black">{u.plan}</span>}
                  </h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-zinc-500">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</span>
                    {u.phoneNumber && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {u.phoneNumber}</span>}
                    <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> {u.credits} Credits</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingUser(u)}
                  className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-colors"
                  title="Edit User"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteUser(u.uid)}
                  className="p-3 bg-zinc-800 hover:bg-red-500/20 hover:text-red-500 rounded-2xl transition-colors"
                  title="Delete User"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div>
                <h2 className="text-2xl font-black tracking-tighter">Edit User</h2>
                <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mt-1">UID: {editingUser.uid}</p>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-4">Display Name</label>
                  <input
                    type="text"
                    value={editingUser.displayName || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-4">Email Address</label>
                  <input
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-4">Phone Number</label>
                  <input
                    type="text"
                    value={editingUser.phoneNumber || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phoneNumber: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-4">Location</label>
                  <input
                    type="text"
                    value={editingUser.location || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, location: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-4">Credits</label>
                  <input
                    type="number"
                    value={editingUser.credits}
                    onChange={(e) => setEditingUser({ ...editingUser, credits: Number(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-4">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as 'admin' | 'user' })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 focus:outline-none focus:border-primary/50 transition-all appearance-none"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-4">Plan</label>
                  <select
                    value={editingUser.plan || 'free'}
                    onChange={(e) => {
                      const newPlan = e.target.value as UserPlan;
                      const planCredits = CREDIT_PLANS.find(p => p.id === newPlan)?.credits || 0;
                      setEditingUser({ 
                        ...editingUser, 
                        plan: newPlan,
                        credits: planCredits // Automatically assign credits when plan changes
                      });
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 focus:outline-none focus:border-primary/50 transition-all appearance-none"
                  >
                    {CREDIT_PLANS.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.credits} Credits)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-primary text-black font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-zinc-800 text-white font-black py-4 rounded-2xl hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
