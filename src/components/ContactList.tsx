import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Trash2, 
  Phone, 
  Languages, 
  User, 
  X, 
  Search,
  Loader2,
  MoreVertical,
  MessageSquare,
  Mail,
  Lock
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { cn, t } from '../utils';
import { UserProfile, LANGUAGES } from '../types';

export interface Contact {
  id: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  password?: string;
  preferredLanguage?: string;
  photoURL?: string;
}

interface ContactListProps {
  onSelectContact: (contact: Contact, action: 'call' | 'translate' | 'chat') => void;
  className?: string;
  lang?: string;
}

export const ContactList: React.FC<ContactListProps> = ({ onSelectContact, className, lang = "en" }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New contact form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newLang, setNewLang] = useState('en');
  const [newPhoto, setNewPhoto] = useState('');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setContacts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const q = query(
        collection(db, 'contacts'),
        where('userId', '==', user.uid)
      );

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const contactData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Contact[];
        setContacts(contactData);
        setLoading(false);
      }, (error) => {
        if (auth.currentUser) {
          console.error("Error fetching contacts:", error);
          if (error.message.includes('permission')) {
            handleFirestoreError(error, OperationType.LIST, 'contacts');
          }
        }
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newName.trim()) return;

    try {
      const contactData = {
        userId: auth.currentUser.uid,
        name: newName.trim(),
        phoneNumber: newPhone.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword.trim(),
        preferredLanguage: newLang,
        photoURL: newPhoto.trim(),
        updatedAt: serverTimestamp()
      };

      if (editingContact) {
        await setDoc(doc(db, 'contacts', editingContact.id), contactData, { merge: true });
      } else {
        await addDoc(collection(db, 'contacts'), {
          ...contactData,
          createdAt: serverTimestamp()
        });
      }

      // If email and password are provided, create/update a user profile to allow "easy login"
      if (newEmail.trim() && newPassword.trim()) {
        const emailKey = newEmail.trim().toLowerCase();
        const userRef = doc(db, "users", emailKey);
        const existingUser = await getDoc(userRef);
        
        if (!existingUser.exists()) {
          await setDoc(userRef, {
            email: emailKey,
            password: newPassword.trim(), // Insecure but requested for "easy login" prototype
            displayName: newName.trim(),
            phoneNumber: newPhone.trim(),
            photoURL: newPhoto.trim(),
            credits: 100,
            role: "user",
            createdAt: serverTimestamp(),
            settings: {
              theme: "zinc",
              appLanguage: newLang
            }
          });
        }
      }
      
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewPassword('');
      setNewPhoto('');
      setNewLang('en');
      setShowAddModal(false);
      setEditingContact(null);
    } catch (error: any) {
      console.error("Error adding contact:", error);
      if (error.message.includes('permission')) {
        handleFirestoreError(error, OperationType.CREATE, 'contacts');
      }
    }
  };

  const handleEditContact = (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingContact(contact);
    setNewName(contact.name);
    setNewPhone(contact.phoneNumber || '');
    setNewEmail(contact.email || '');
    setNewPassword(contact.password || '');
    setNewLang(contact.preferredLanguage || 'en');
    setNewPhoto(contact.photoURL || '');
    setShowAddModal(true);
  };

  const handleDeleteContact = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this contact?")) return;
    
    try {
      await deleteDoc(doc(db, 'contacts', id));
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      if (error.message.includes('permission')) {
        handleFirestoreError(error, OperationType.DELETE, `contacts/${id}`);
      }
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phoneNumber?.includes(searchQuery)
  );

  return (
    <div className={cn("bg-zinc-900/50 rounded-[2rem] border border-zinc-800/50 backdrop-blur-sm overflow-hidden flex flex-col", className)}>
      <div className="p-6 border-bottom border-zinc-800/50 flex items-center justify-between bg-zinc-900/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white leading-none">{t("contacts", lang as any)}</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mt-1">{t("quick_access", lang as any)}</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all active:scale-95 border border-zinc-700/50"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 border-b border-zinc-800/50">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
          <input 
            type="text"
            placeholder={t("search_contacts", lang as any)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary/30 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[400px] custom-scrollbar">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-zinc-600 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
            <p className="text-[10px] font-black uppercase tracking-widest">Loading Contacts</p>
          </div>
        ) : filteredContacts.length > 0 ? (
          <div className="divide-y divide-zinc-800/30">
            {filteredContacts.map((contact) => (
              <div 
                key={contact.id}
                className="p-4 hover:bg-zinc-800/30 transition-colors group cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center relative shadow-inner">
                    {contact.photoURL ? (
                      <img src={contact.photoURL} alt={contact.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-zinc-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-white leading-none">{contact.name}</h3>
                      {contact.preferredLanguage && (
                        <span className="text-[10px]" title={`Preferred: ${LANGUAGES.find(l => l.code === contact.preferredLanguage)?.name}`}>
                          {LANGUAGES.find(l => l.code === contact.preferredLanguage)?.flag}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 font-medium">{contact.phoneNumber || 'No number'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onSelectContact(contact, 'chat')}
                    className="p-2 bg-zinc-800 hover:bg-blue-500/20 hover:text-blue-500 text-zinc-400 rounded-lg transition-all"
                    title={t("chat", lang as any)}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onSelectContact(contact, 'translate')}
                    className="p-2 bg-zinc-800 hover:bg-primary/20 hover:text-primary text-zinc-400 rounded-lg transition-all"
                    title={t("voice", lang as any)}
                  >
                    <Languages className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onSelectContact(contact, 'call')}
                    className="p-2 bg-zinc-800 hover:bg-emerald-500/20 hover:text-emerald-500 text-zinc-400 rounded-lg transition-all"
                    title={t("calls", lang as any)}
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => handleEditContact(contact, e)}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition-all"
                    title={t("edit_contact", lang as any)}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => handleDeleteContact(contact.id, e)}
                    className="p-2 bg-zinc-800 hover:bg-red-500/20 hover:text-red-500 text-zinc-400 rounded-lg transition-all"
                    title={t("clear", lang as any)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto border border-zinc-800">
              <User className="w-8 h-8 text-zinc-800" />
            </div>
            <div className="space-y-1">
              <p className="text-zinc-500 text-xs font-bold">{t("no_contacts", lang as any)}</p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline"
              >
                {t("add_first_contact", lang as any)}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Contact Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh]">
            <div className="p-6 md:p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-white">{editingContact ? t("edit_contact", lang as any) : t("new_contact", lang as any)}</h2>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">{editingContact ? t("update_details", lang as any) : t("add_manually", lang as any)}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingContact(null);
                  setNewName('');
                  setNewPhone('');
                  setNewEmail('');
                  setNewPassword('');
                  setNewPhoto('');
                  setNewLang('en');
                }}
                className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddContact} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">{t("full_name", lang as any)}</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                    <input 
                      required
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-5 text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary/50 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">{t("email_address", lang as any)}</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                      <input 
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-5 text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary/50 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">{t("password", lang as any)}</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                      <input 
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Manual Password"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-5 text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary/50 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">{t("phone_number", lang as any)}</label>
                  <input 
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+1 234 567 890"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-5 text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">{t("preferred_lang", lang as any)}</label>
                  <select 
                    value={newLang}
                    onChange={(e) => setNewLang(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-primary/50 transition-all appearance-none"
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.code} value={l.code} className="bg-zinc-900">
                        {l.flag} {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">{t("photo_url", lang as any)}</label>
                  <input 
                    type="url"
                    value={newPhoto}
                    onChange={(e) => setNewPhoto(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-5 text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-primary hover:opacity-90 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-primary/20 active:scale-[0.98] flex-shrink-0"
              >
                {t("save_contact", lang as any)}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
