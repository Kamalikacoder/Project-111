import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  BarChart3, 
  User, 
  LogOut,
  Send,
  Filter,
  ChevronRight,
  ShieldAlert,
  Lock,
  Mail,
  UserPlus,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  X,
  Inbox,
  Sparkles,
  Eye,
  EyeOff,
  Bell,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { translations, Language } from './translations';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line,
  Legend
} from 'recharts';
import { Languages } from 'lucide-react';

const LanguageContext = React.createContext<{
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: keyof typeof translations['en']) => string;
}>({
  lang: 'en',
  setLang: () => {},
  t: (key) => translations['en'][key]
});

type Role = 'Student' | 'Staff' | 'Admin';

interface User {
  id: number;
  name: string;
  email: string;
  register_number?: string;
  role: Role;
  department?: string;
}

interface Complaint {
  id: number;
  title: string;
  text: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Pending' | 'In Progress' | 'Resolved';
  sentiment?: string;
  original_text?: string;
  translation?: string;
  created_at: string;
  feedback_id?: number;
  student_name?: string;
  image?: string;
}

interface AuditLog {
  id: number;
  complaint_id: number;
  user_name: string;
  action: string;
  details: string;
  timestamp: string;
  hash: string;
}

interface Notification {
  id: number;
  user_id: number;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
}

function Auth({ onLogin }: { onLogin: (user: User) => void }) {
  const { t, lang, setLang } = React.useContext(LanguageContext);
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState<Role>('Student');
  const [formData, setFormData] = useState({ name: '', email: '', register_number: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('scms_last_email');
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegister ? '/api/register' : '/api/login';
    const payload = isRegister 
      ? { ...formData, role } 
      : { email: formData.email, password: formData.password, role };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        if (isRegister) {
          setIsRegister(false);
          setError('Registration successful! Please login.');
        } else {
          localStorage.setItem('scms_last_email', formData.email);
          onLogin(data);
        }
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden"
      >
        <div className="p-8 pb-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-indigo-600">
              <ShieldAlert className="w-10 h-10" />
              <span className="font-bold text-3xl tracking-tight">{t('appName')}</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-all flex items-center gap-1 text-xs font-bold"
              >
                <Languages className="w-4 h-4" />
                {lang === 'en' ? 'தமிழ்' : 'English'}
              </button>
            </div>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
            <button 
              onClick={() => { setIsRegister(false); setError(''); setFormData({ name: '', email: '', register_number: '', password: '' }); }}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${!isRegister ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              {t('login')}
            </button>
            <button 
              onClick={() => { setIsRegister(true); setError(''); setFormData({ name: '', email: '', register_number: '', password: '' }); }}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${isRegister ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              {t('register')}
            </button>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {isRegister ? `${role} ${t('register')}` : `${role} ${t('login')}`}
          </h2>
          <p className="text-slate-500 text-sm mb-8">
            {isRegister ? `Create your ${role.toLowerCase()} account to start.` : 'Enter your credentials to access your dashboard.'}
          </p>

          <div className="flex gap-2 mb-6">
            {(['Student', 'Staff', 'Admin'] as Role[]).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${role === r ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-400'}`}
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text"
                    name="full_name"
                    autoComplete="name"
                    placeholder={t('fullName')}
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text"
                    name="register_number"
                    autoComplete="username"
                    placeholder={t('regNumber')}
                    required
                    value={formData.register_number}
                    onChange={e => setFormData({...formData, register_number: e.target.value})}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text"
                name="email"
                autoComplete="username"
                placeholder={isRegister ? t('emailPlaceholder') : t('emailPlaceholder')}
                required
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder={t('passwordPlaceholder')}
                required
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && <p className={`text-sm font-medium ${error.includes('successful') ? 'text-emerald-600' : 'text-red-500'}`}>{error}</p>}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? t('processing') : isRegister ? <><UserPlus className="w-5 h-5" /> {t('register')}</> : <><LogOut className="w-5 h-5 rotate-180" /> {t('login')}</>}
            </button>
          </form>
        </div>
        
        <div className="p-8 pt-4 text-center">
          <p className="text-xs text-slate-400 font-medium">
            {t('appName')} - {t('aiEnabled')}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('scms_lang');
    return (saved as Language) || 'en';
  });

  const t = (key: keyof typeof translations['en']) => {
    return translations[lang][key] || translations['en'][key];
  };

  useEffect(() => {
    localStorage.setItem('scms_lang', lang);
  }, [lang]);

  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'submit' | 'analytics' | 'complaint-box' | 'profile'>('dashboard');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [newComplaint, setNewComplaint] = useState({ title: '', text: '', category: 'Auto', image: null as string | null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showHelp, setShowHelp] = useState(false);
  const [selectedComplaintForFeedback, setSelectedComplaintForFeedback] = useState<Complaint | null>(null);
  const [feedbackData, setFeedbackData] = useState({ rating: 5, comment: '' });
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [rootCauseAlerts, setRootCauseAlerts] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any>(null);
  const [selectedComplaintAudit, setSelectedComplaintAudit] = useState<AuditLog[]>([]);
  const [aiDraftReply, setAiDraftReply] = useState<string>('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchComplaints(view === 'complaint-box');
      if (user.role === 'Admin' || user.role === 'Staff') {
        fetchStats();
        fetchRootCauses();
        if (user.role === 'Admin') fetchForecast();
      }
      fetchNotifications();

      // WebSocket setup
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}`);

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'NOTIFICATION') {
          setNotifications(prev => [message.data, ...prev]);
        }
      };

      return () => ws.close();
    }
  }, [user, view]);

  const exportToCSV = () => {
    if (complaints.length === 0) return;
    const headers = ['ID', 'Student', 'Title', 'Category', 'Priority', 'Status', 'Sentiment', 'Created At'];
    const rows = complaints.map(c => [
      c.id,
      c.student_name || 'N/A',
      c.title,
      c.category,
      c.priority,
      c.status,
      c.sentiment || 'N/A',
      new Date(c.created_at).toLocaleString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(field => `"${field}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `scms_complaints_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } finally {
      setAuthChecked(true);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
    setView('dashboard');
  };

  const fetchComplaints = async (viewAll = false) => {
    if (!user) return;
    const res = await fetch(`/api/complaints?viewAll=${viewAll}`);
    const data = await res.json();
    setComplaints(data);
  };

  const fetchStats = async () => {
    const res = await fetch('/api/stats');
    const data = await res.json();
    setStats(data);
  };

  const fetchNotifications = async () => {
    const res = await fetch('/api/notifications');
    if (res.ok) {
      const data = await res.json();
      setNotifications(data);
    }
  };

  const fetchRootCauses = async () => {
    const res = await fetch('/api/ai/root-causes');
    if (res.ok) {
      const data = await res.json();
      setRootCauseAlerts(data.alerts);
    }
  };

  const fetchForecast = async () => {
    const res = await fetch('/api/ai/forecast');
    if (res.ok) {
      const data = await res.json();
      setForecastData(data);
    }
  };

  const fetchAuditTrail = async (complaintId: number) => {
    const res = await fetch(`/api/complaints/${complaintId}/audit`);
    if (res.ok) {
      const data = await res.json();
      setSelectedComplaintAudit(data);
    }
  };

  const updateProfile = async (name: string, department: string) => {
    const res = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, department })
    });
    if (res.ok) {
      const updatedUser = await res.json();
      setUser(updatedUser);
      alert(t('profileUpdated'));
    } else {
      alert(t('updateError'));
    }
  };

  const generateDraftReply = async (complaintId: number) => {
    setIsGeneratingDraft(true);
    setAiDraftReply('');
    try {
      const res = await fetch('/api/ai/draft-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaint_id: complaintId })
      });
      if (res.ok) {
        const data = await res.json();
        setAiDraftReply(data.draft);
      }
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const markNotificationAsRead = async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!newComplaint.title.trim() || !newComplaint.text.trim()) {
      alert("Please provide both a title and a detailed description.");
      return;
    }

    setIsSubmitting(true);
    try {
      // AI Classification, Sentiment, and Safety Check
      const ai = new GoogleGenAI({ apiKey: (process.env as any).GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this student complaint.
        Title: "${newComplaint.title}"
        Description: "${newComplaint.text}"`,
        config: {
          systemInstruction: `You are an expert at classifying student complaints. 
          1. Check for foul/abusive language. If found, set 'isSafe' to false.
          2. Categorize into: Admin Issue, Hostel Issue, Transport Problems, Infrastructure Issues, Faculty Complaint, Administration Problem, Other.
          3. Assign priority: Low, Medium, High, Critical.
          4. Detect sentiment: Frustrated, Neutral, Urgent, Satisfied.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              priority: { type: Type.STRING },
              sentiment: { type: Type.STRING },
              isSafe: { type: Type.BOOLEAN, description: "True if no abusive language" },
              safetyReason: { type: Type.STRING, description: "Reason if not safe" }
            },
            required: ["category", "priority", "sentiment", "isSafe"]
          }
        }
      });

      let aiResult = { category: 'General', priority: 'Medium', sentiment: 'Neutral', isSafe: true, safetyReason: '' };
      try {
        if (response.text) {
          aiResult = JSON.parse(response.text);
        }
      } catch (e) {
        console.error("AI Parsing Error:", e);
      }

      if (!aiResult.isSafe) {
        alert(`Submission Blocked: ${aiResult.safetyReason || "Your complaint contains inappropriate language. Please maintain a professional tone."}`);
        setIsSubmitting(false);
        return;
      }

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          student_id: user.id, 
          title: newComplaint.title,
          text: newComplaint.text,
          category: newComplaint.category === 'Auto' ? aiResult.category : newComplaint.category,
          priority: aiResult.priority,
          sentiment: aiResult.sentiment,
          image: newComplaint.image
        }),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit complaint');
      }

      setNewComplaint({ title: '', text: '', category: 'Auto', image: null });
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setView('dashboard');
      }, 2000);
      fetchComplaints();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/complaints/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchComplaints();
  };

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaintForFeedback) return;

    setIsSubmittingFeedback(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint_id: selectedComplaintForFeedback.id,
          rating: feedbackData.rating,
          comment: feedbackData.comment
        }),
      });
      setSelectedComplaintForFeedback(null);
      setFeedbackData({ rating: 5, comment: '' });
      fetchComplaints();
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'Critical': return 'text-red-600 bg-red-50 border-red-100';
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'Medium': return 'text-blue-600 bg-blue-50 border-blue-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-slate-50 text-slate-300';
    if (count < 3) return 'bg-orange-100 text-orange-700';
    if (count < 7) return 'bg-orange-300 text-orange-900';
    if (count < 15) return 'bg-red-400 text-white';
    return 'bg-red-600 text-white';
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'Resolved': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'In Progress': return <Clock className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4 text-amber-500" />;
    }
  };

  if (!authChecked) return <div className="flex items-center justify-center h-screen font-sans">Initializing {t('appName')}...</div>;
  
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {!user ? <Auth onLogin={setUser} /> : (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 z-50">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <ShieldAlert className="w-6 h-6" />
            <span className="font-bold text-xl tracking-tight">{t('appName')}</span>
          </div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{t('aiEnabled')}</p>
        </div>

        <nav className="p-4 space-y-2">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            {t('dashboard')}
          </button>
          <button 
            onClick={() => setView('complaint-box')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'complaint-box' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Inbox className="w-5 h-5" />
            {t('complaintBox')}
          </button>
          <button 
            onClick={() => setView('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'profile' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <User className="w-5 h-5" />
            {t('profile')}
          </button>
          {(user.role === 'Student') && (
            <button 
              onClick={() => setView('submit')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'submit' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <PlusCircle className="w-5 h-5" />
              {t('newComplaint')}
            </button>
          )}
          {user.role === 'Admin' && (
            <button 
              onClick={() => setView('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'analytics' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <BarChart3 className="w-5 h-5" />
              {t('analytics')}
            </button>
          )}
          <button 
            onClick={() => setShowHelp(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 transition-all"
          >
            <HelpCircle className="w-5 h-5" />
            {t('helpCenter')}
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all mt-8"
          >
            <LogOut className="w-5 h-5" />
            {t('logout')}
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
              {user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {view === 'dashboard' ? t('overview') : view === 'submit' ? t('submitGrievance') : view === 'complaint-box' ? t('complaintBox') : view === 'profile' ? t('profile') : t('systemAnalytics')}
            </h1>
            <p className="text-slate-500">{t('welcome')}, {user.name.split(' ')[0]}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              <Languages className="w-4 h-4" />
              {lang === 'en' ? 'தமிழ்' : 'English'}
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 bg-white border border-slate-200 rounded-full text-slate-600 hover:bg-slate-50 transition-all relative"
              >
                <Bell className="w-5 h-5" />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setShowNotifications(false)}></div>
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[70] overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-sm text-slate-900">{t('notifications')}</h3>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {notifications.filter(n => !n.is_read).length} {t('new')}
                        </span>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400">{t('noNotifications')}</p>
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div 
                              key={n.id} 
                              onClick={() => markNotificationAsRead(n.id)}
                              className={`p-4 border-b border-slate-50 last:border-0 cursor-pointer transition-colors ${!n.is_read ? 'bg-indigo-50/30 hover:bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                            >
                              <div className="flex gap-3">
                                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.is_read ? 'bg-indigo-500' : 'bg-slate-200'}`}></div>
                                <div>
                                  <p className={`text-xs leading-relaxed ${!n.is_read ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                                    {n.message}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-1">
                                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600">
              <Clock className="w-4 h-4" />
              {new Date().toLocaleDateString()}
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-100 text-red-600 rounded-full text-sm font-bold hover:bg-red-50 transition-all shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              {t('logout')}
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {(view === 'dashboard' || view === 'complaint-box') && (
            <motion.div 
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* AI Root Cause Alerts (Staff/Admin) */}
              {(user.role === 'Admin' || user.role === 'Staff') && rootCauseAlerts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-amber-900">{t('aiRootCause')}</h3>
                      <p className="text-xs text-amber-700 font-medium">Recurring issues detected in the last 30 days</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rootCauseAlerts.map((alert, i) => (
                      <div key={i} className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm">
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block">
                          {alert.department}
                        </span>
                        <p className="text-sm font-bold text-slate-900 mb-1">{alert.issue}</p>
                        <p className="text-xs text-slate-500 leading-relaxed mb-3">{alert.recommendation}</p>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600">
                          <Sparkles className="w-3 h-3" />
                          {t('aiRecommended')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">{t('totalComplaints')}</p>
                  <h3 className="text-3xl font-bold mt-1">{complaints.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">{t('pendingResolution')}</p>
                  <h3 className="text-3xl font-bold mt-1">{complaints.filter(c => c.status !== 'Resolved').length}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">{t('resolvedCases')}</p>
                  <h3 className="text-3xl font-bold mt-1">{complaints.filter(c => c.status === 'Resolved').length}</h3>
                </div>
              </div>

              {/* Complaints Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h2 className="font-bold text-lg">
                    {view === 'complaint-box' ? t('publicComplaintBox') : t('recentComplaints')}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        placeholder={t('searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all w-64"
                      />
                    </div>
                    {user.role === 'Admin' && (
                      <button 
                        onClick={exportToCSV}
                        className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                      >
                        <ArrowDown className="w-4 h-4" />
                        {t('exportCSV')}
                      </button>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('status')}:</span>
                      <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      >
                        <option value="All">{t('allStatus')}</option>
                        <option value="Pending">{t('pending')}</option>
                        <option value="In Progress">{t('inProgress')}</option>
                        <option value="Resolved">{t('resolved')}</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('priority')}:</span>
                      <select 
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      >
                        <option value="All">{t('allPriority')}</option>
                        <option value="Low">{t('low')}</option>
                        <option value="Medium">{t('medium')}</option>
                        <option value="High">{t('high')}</option>
                        <option value="Critical">{t('critical')}</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('sort')}:</span>
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      >
                        <option value="date">{t('date')}</option>
                        <option value="priority">{t('priority')}</option>
                      </select>
                      <button 
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors border border-slate-200 bg-white"
                        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                      >
                        {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                      </button>
                    </div>
                    <button 
                      onClick={() => { setStatusFilter('All'); setPriorityFilter('All'); setSortBy('date'); setSortOrder('desc'); }}
                      className="p-2 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors"
                      title="Reset Filters"
                    >
                      <Filter className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Complaint ID</th>
                        {view === 'complaint-box' && (
                          <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Student</th>
                        )}
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const priorityWeight: Record<string, number> = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
                        
                        const filtered = complaints
                          .filter(c => statusFilter === 'All' || c.status === statusFilter)
                          .filter(c => priorityFilter === 'All' || c.priority === priorityFilter)
                          .filter(c => {
                            if (!searchTerm) return true;
                            const search = searchTerm.toLowerCase();
                            return c.title.toLowerCase().includes(search) || 
                                   c.text.toLowerCase().includes(search) ||
                                   (c.student_name && c.student_name.toLowerCase().includes(search));
                          })
                          .sort((a, b) => {
                            if (sortBy === 'date') {
                              const dateA = new Date(a.created_at).getTime();
                              const dateB = new Date(b.created_at).getTime();
                              return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                            } else {
                              const weightA = priorityWeight[a.priority] || 0;
                              const weightB = priorityWeight[b.priority] || 0;
                              return sortOrder === 'asc' ? weightA - weightB : weightB - weightA;
                            }
                          });
                        
                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="p-12 text-center">
                                <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                  <MessageSquare className="w-8 h-8 text-slate-300" />
                                </div>
                                <p className="text-slate-500 font-medium">No complaints match your filters</p>
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-mono text-sm text-slate-500">#SCMS-{c.id}</td>
                            {view === 'complaint-box' && (
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                    {(c as any).student_name?.[0] || 'S'}
                                  </div>
                                  <span className="text-sm font-medium text-slate-700">{(c as any).student_name}</span>
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-slate-900 line-clamp-1">{c.title}</p>
                              <p className="text-xs text-slate-500 line-clamp-1">{c.text}</p>
                              {c.translation && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Sparkles className="w-3 h-3 text-indigo-500" />
                                  <span className="text-[10px] font-bold text-indigo-600 uppercase">AI Translated</span>
                                </div>
                              )}
                              <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-semibold">{new Date(c.created_at).toLocaleDateString()}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                                {c.category}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getPriorityColor(c.priority)}`}>
                                {c.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                {getStatusIcon(c.status)}
                                {c.status}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => { setSelectedComplaint(c); fetchAuditTrail(c.id); }}
                                  className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {user.role !== 'Student' && c.status !== 'Resolved' && (
                                  <>
                                    <button 
                                      onClick={() => updateStatus(c.id, 'In Progress')}
                                      className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                      title="Mark as In Progress"
                                    >
                                      <Clock className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => updateStatus(c.id, 'Resolved')}
                                      className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors"
                                      title="Mark as Resolved"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {user.role === 'Student' && c.status === 'Resolved' && !c.feedback_id && (
                                  <button 
                                    onClick={() => setSelectedComplaintForFeedback(c)}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-2"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Feedback
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'submit' && (
            <motion.div 
              key="submit"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-900">{t('newComplaint')}</h2>
                  <p className="text-slate-500">Describe your issue clearly. Our AI supports multi-lingual input (e.g., Tamil) and will automatically translate, categorize, and route it.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">{t('subjectTitle')}</label>
                      <input 
                        type="text"
                        value={newComplaint.title}
                        onChange={(e) => setNewComplaint({...newComplaint, title: e.target.value})}
                        placeholder="Short summary of issue"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">{t('category')}</label>
                      <select 
                        value={newComplaint.category}
                        onChange={(e) => setNewComplaint({...newComplaint, category: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none"
                        required
                      >
                        <option value="Auto">Auto-detect (AI)</option>
                        <option value="Admin Issue">{t('catAdmin')}</option>
                        <option value="Hostel Issue">{t('catHostel')}</option>
                        <option value="Transport Problems">{t('catTransport')}</option>
                        <option value="Infrastructure Issues">{t('catInfrastructure')}</option>
                        <option value="Faculty Complaint">{t('catFaculty')}</option>
                        <option value="Administration Problem">{t('catAdministration')}</option>
                        <option value="Other">{t('catOther')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">{t('detailedDescription')}</label>
                    <textarea 
                      value={newComplaint.text}
                      onChange={(e) => setNewComplaint({...newComplaint, text: e.target.value})}
                      placeholder="Describe your grievance in detail..."
                      className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Attach Evidence (Optional)</label>
                    <div className="flex items-center gap-4">
                      <label className="flex-1 flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-slate-50 transition-all cursor-pointer group">
                        {newComplaint.image ? (
                          <div className="relative w-full h-full p-2">
                            <img src={newComplaint.image} alt="Preview" className="w-full h-full object-contain rounded-xl" referrerPolicy="no-referrer" />
                            <button 
                              type="button"
                              onClick={(e) => { e.preventDefault(); setNewComplaint({...newComplaint, image: null}); }}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Camera className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 mb-2" />
                            <span className="text-sm font-medium text-slate-500 group-hover:text-indigo-600">Click to upload photo</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">PNG, JPG up to 5MB</span>
                          </>
                        )}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setNewComplaint({...newComplaint, image: reader.result as string});
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting || submitSuccess}
                    className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 ${submitSuccess ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'}`}
                  >
                    {isSubmitting ? (
                      <>
                        <Sparkles className="w-5 h-5 animate-pulse" />
                        {t('submitting')}
                      </>
                    ) : submitSuccess ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        {t('successSubmit')}
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        {t('submitButton')}
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {view === 'analytics' && stats && (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              {/* Summary Cards */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{t('totalComplaints')}</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{t('resolved')}</p>
                  <p className="text-3xl font-bold text-emerald-600">{stats.resolved}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Resolution Rate</p>
                  <p className="text-3xl font-bold text-indigo-600">
                    {Math.round((stats.resolved / stats.total) * 100) || 0}%
                  </p>
                </div>
              </div>

              {/* Governance Intelligence Cards */}
              {stats.governance && (
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl text-white">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('trustScore')}</p>
                      <ShieldAlert className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="flex items-end gap-2">
                      <p className="text-4xl font-black">{Math.round(stats.governance.trustScore)}</p>
                      <p className="text-slate-500 text-sm font-bold mb-1">/ 100</p>
                    </div>
                    <div className="mt-4 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${stats.governance.trustScore}%` }}></div>
                    </div>
                  </div>
                  <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl text-white">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('slaBreach')}</p>
                      <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex items-end gap-2">
                      <p className="text-4xl font-black text-amber-400">{Math.round(stats.governance.slaBreachProb)}%</p>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium">Based on pending High/Critical cases</p>
                  </div>
                  <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl text-white">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('policyEffectiveness')}</p>
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex items-end gap-2">
                      <p className="text-4xl font-black text-emerald-400">{Math.round(stats.governance.policyEffectiveness)}%</p>
                    </div>
                    <div className="mt-4 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${stats.governance.policyEffectiveness}%` }}></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Trends Chart */}
              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm lg:col-span-2">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" />
                  {t('trends')}
                </h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.overTime}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                      />
                      <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={{r: 4, fill: '#6366f1'}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Distribution */}
              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg mb-6">{t('byCategory')}</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.byCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.byCategory.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Priority Distribution */}
              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg mb-6">{t('byPriority')}</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.byPriority}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                      <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                        {stats.byPriority.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={
                            entry.name === 'Critical' ? '#ef4444' :
                            entry.name === 'High' ? '#f59e0b' :
                            entry.name === 'Medium' ? '#6366f1' : '#94a3b8'
                          } />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Forecasting (Admin Only) */}
              {user.role === 'Admin' && forecastData && (
                <div className="bg-indigo-900 p-8 rounded-[2rem] border border-indigo-800 shadow-xl lg:col-span-2 text-white">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-indigo-300" />
                        <h3 className="font-bold text-xl">{t('aiForecast')}</h3>
                      </div>
                      <p className="text-indigo-200 text-sm">7-Day Complaint Volume Prediction & Surge Analysis</p>
                    </div>
                    <div className="bg-indigo-800/50 px-4 py-2 rounded-2xl border border-indigo-700/50">
                      <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">{t('predictedSurge')}</p>
                      <p className="text-lg font-black text-amber-400 uppercase">{forecastData.surge_department}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={forecastData.forecast}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#818cf8', fontSize: 10}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#818cf8', fontSize: 10}} />
                          <Tooltip 
                            contentStyle={{backgroundColor: '#1e1b4b', borderRadius: '1rem', border: '1px solid #312e81', color: '#fff'}}
                          />
                          <Line type="monotone" dataKey="predicted_count" stroke="#fbbf24" strokeWidth={3} dot={{r: 4, fill: '#fbbf24'}} strokeDasharray="5 5" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-indigo-800/30 p-6 rounded-3xl border border-indigo-700/30">
                      <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        {t('forecastingLogic')}
                      </h4>
                      <p className="text-xs text-indigo-100 leading-relaxed italic">
                        "{forecastData.reason}"
                      </p>
                      <div className="mt-6 pt-6 border-t border-indigo-700/30">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">{t('recommendedAction')}</p>
                        <p className="text-xs text-indigo-200">Pre-allocate staff to {forecastData.surge_department} for the upcoming week to maintain SLA compliance.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Institutional Risk Heatmap */}
              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm lg:col-span-2">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    {t('riskHeatmap')}
                  </h3>
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-50 rounded-sm"></div> Zero</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-100 rounded-sm"></div> Low</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-300 rounded-sm"></div> Med</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-400 rounded-sm"></div> High</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-600 rounded-sm"></div> Extreme</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    <div className="grid grid-cols-5 gap-2 mb-2">
                      <div className=""></div>
                      {['Low', 'Medium', 'High', 'Critical'].map(p => (
                        <div key={p} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2">
                          {p}
                        </div>
                      ))}
                    </div>

                    {['Admin Issue', 'Hostel Issue', 'Transport Problems', 'Infrastructure Issues', 'Faculty Complaint', 'Administration Problem', 'Other'].map(cat => (
                      <div key={cat} className="grid grid-cols-5 gap-2 mb-2">
                        <div className="flex items-center text-sm font-bold text-slate-700 pr-4">
                          {cat}
                        </div>
                        {['Low', 'Medium', 'High', 'Critical'].map(p => {
                          const cell = stats.riskHeatmap?.find((h: any) => h.category === cat && h.priority === p);
                          const count = cell ? cell.count : 0;
                          return (
                            <div 
                              key={p} 
                              className={`h-16 rounded-xl flex flex-col items-center justify-center transition-all hover:scale-[1.02] cursor-default ${getHeatmapColor(count)}`}
                            >
                              <span className="text-xl font-black">{count}</span>
                              <span className="text-[10px] font-bold uppercase opacity-60">Cases</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <span className="font-bold text-slate-700">Governance Insight:</span> This heatmap correlates grievance volume with severity across departments. 
                    Red zones indicate high-priority clusters requiring immediate administrative attention or policy review.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl">
                <div className="mb-8 flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-indigo-100">
                    {user.name[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{t('editProfile')}</h2>
                    <p className="text-slate-500">{user.email}</p>
                  </div>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    updateProfile(formData.get('name') as string, formData.get('department') as string);
                  }} 
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">{t('fullName')}</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="text"
                        name="name"
                        defaultValue={user.name}
                        required
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">{t('department')}</label>
                    <div className="relative">
                      <LayoutDashboard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="text"
                        name="department"
                        defaultValue={user.department || ''}
                        placeholder={t('deptPlaceholder')}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      {t('saveChanges')}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback Modal */}
        <AnimatePresence>
          {selectedComplaintForFeedback && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden"
              >
                <div className="p-8">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{t('provideFeedback')}</h3>
                  <p className="text-slate-500 text-sm mb-6">
                    How satisfied are you with the resolution of complaint <span className="font-mono text-indigo-600">#SCMS-{selectedComplaintForFeedback.id}</span>?
                  </p>

                  <form onSubmit={submitFeedback} className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t('rating')}</label>
                      <div className="flex justify-between gap-2">
                        {[1, 2, 3, 4, 5].map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setFeedbackData({...feedbackData, rating: num})}
                            className={`flex-1 py-3 rounded-2xl text-lg font-bold transition-all border ${feedbackData.rating === num ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-200'}`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('comments')}</label>
                      <textarea 
                        value={feedbackData.comment}
                        onChange={(e) => setFeedbackData({...feedbackData, comment: e.target.value})}
                        placeholder="Tell us more about your experience..."
                        className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button 
                        type="button"
                        onClick={() => setSelectedComplaintForFeedback(null)}
                        className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all"
                      >
                        {t('cancel')}
                      </button>
                      <button 
                        type="submit"
                        disabled={isSubmittingFeedback}
                        className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                      >
                        {isSubmittingFeedback ? t('processing') : t('submitFeedback')}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Help Modal */}
        <AnimatePresence>
          {selectedComplaint && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{selectedComplaint.title}</h2>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Complaint ID: #SCMS-{selectedComplaint.id}</p>
                    </div>
                  </div>
                  <button onClick={() => { setSelectedComplaint(null); setAiDraftReply(''); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <section>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t('description')}</h3>
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedComplaint.text}</p>
                        
                        {selectedComplaint.image && (
                          <div className="mt-4">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Attached Evidence</p>
                            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                              <img 
                                src={selectedComplaint.image} 
                                alt="Evidence" 
                                className="max-w-full h-auto max-h-[400px] mx-auto"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        )}

                        {selectedComplaint.original_text && selectedComplaint.original_text !== selectedComplaint.text && (
                          <div className="mt-6 pt-6 border-t border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">{t('originalInput')} (Tamil/Other)</p>
                            <p className="text-sm text-slate-500 italic">{selectedComplaint.original_text}</p>
                          </div>
                        )}
                      </div>
                    </section>

                    {user.role !== 'Student' && (
                      <section className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            {t('aiAssistant')}
                          </h3>
                          <button 
                            onClick={() => generateDraftReply(selectedComplaint.id)}
                            disabled={isGeneratingDraft}
                            className="text-[10px] font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-full hover:bg-indigo-700 transition-all disabled:opacity-50"
                          >
                            {isGeneratingDraft ? t('processing') : t('generateDraft')}
                          </button>
                        </div>
                        {aiDraftReply ? (
                          <div className="space-y-4">
                            <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm">
                              <p className="text-sm text-slate-700 leading-relaxed">{aiDraftReply}</p>
                            </div>
                            <p className="text-[10px] text-indigo-400 font-medium italic">* This is an AI-generated draft. Please review before sending.</p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Need help responding? Let AI draft a professional reply based on university SOPs.</p>
                        )}
                      </section>
                    )}
                  </div>

                  <div className="space-y-8">
                    <section>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Status & Meta</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-xs font-bold text-slate-500">Status</span>
                          <span className="text-sm font-bold text-indigo-600">{selectedComplaint.status}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-xs font-bold text-slate-500">Priority</span>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getPriorityColor(selectedComplaint.priority)}`}>{selectedComplaint.priority}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-xs font-bold text-slate-500">Sentiment</span>
                          <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1 rounded-full border border-slate-200">{selectedComplaint.sentiment || 'Neutral'}</span>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Lock className="w-3 h-3" />
                        {t('auditTrail')}
                      </h3>
                      <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                        {selectedComplaintAudit.map((log, i) => (
                          <div key={log.id} className="relative pl-4 border-l-2 border-slate-100 pb-4 last:pb-0">
                            <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-indigo-500"></div>
                            <p className="text-[10px] font-bold text-slate-900 uppercase">{log.action}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{log.details}</p>
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-[8px] text-slate-400 font-mono truncate max-w-[100px]">Hash: {log.hash}</p>
                              <p className="text-[8px] text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Help Modal */}
        <AnimatePresence>
          {showHelp && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden"
              >
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-8 h-8" />
                    <div>
                      <h2 className="text-2xl font-bold">{t('helpCenter')}</h2>
                      <p className="text-indigo-100 text-sm">How to use {t('appName')}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowHelp(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="p-8 max-h-[70vh] overflow-y-auto space-y-8">
                  <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <PlusCircle className="w-5 h-5 text-indigo-600" />
                      For Students
                    </h3>
                    <ul className="space-y-3 text-slate-600 text-sm">
                      <li className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                        <p><strong>Submit Grievances:</strong> Use the "New Complaint" tab to report issues. Our AI will automatically categorize and prioritize them for you.</p>
                      </li>
                      <li className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
                        <p><strong>Track Progress:</strong> View your dashboard to see real-time updates on your complaints (Pending, In Progress, Resolved).</p>
                      </li>
                      <li className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
                        <p><strong>Provide Feedback:</strong> Once a complaint is resolved, you can rate the resolution to help us improve.</p>
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-600" />
                      For Staff & Admins
                    </h3>
                    <ul className="space-y-3 text-slate-600 text-sm">
                      <li className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                        <p><strong>Manage Tasks:</strong> Staff members see complaints assigned to their department. Update status to keep students informed.</p>
                      </li>
                      <li className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
                        <p><strong>AI Insights:</strong> Admins can access the Analytics dashboard to see system-wide trends and performance metrics.</p>
                      </li>
                    </ul>
                  </section>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs text-slate-500 leading-relaxed italic">
                      {t('appName')} uses advanced Gemini AI to ensure your grievances are handled by the right department with the appropriate urgency.
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <button 
                    onClick={() => setShowHelp(false)}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-100"
                  >
                    Got it!
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        </main>
      </div>
    )}
  </LanguageContext.Provider>
);
}
