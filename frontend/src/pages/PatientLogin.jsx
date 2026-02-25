import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const API = axios.create({ baseURL: 'http://localhost:8000' });

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

// ── Shared input component ─────────────────────────────────
function Field({ label, icon, type = 'text', placeholder, value, onChange, maxLength, helper }) {
    return (
        <div>
            <label className="text-white/50 text-xs mb-1.5 flex items-center gap-1.5">
                <span>{icon}</span>{label}
            </label>
            <input type={type} placeholder={placeholder} maxLength={maxLength}
                value={value} onChange={onChange}
                className="glass-input text-sm w-full" />
            {helper && <p className="text-white/20 text-xs mt-1">{helper}</p>}
        </div>
    );
}

// ── LOGIN TAB ──────────────────────────────────────────────
function LoginTab({ onSuccess }) {
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!loginId.trim()) return toast.error('Enter your ABHA ID or Aadhaar number');
        if (!password) return toast.error('Enter your password');
        setLoading(true);
        try {
            const res = await API.post('/patient/login', { login_id: loginId, password });
            toast.success(`Welcome back, ${res.data.patient.name}!`);
            localStorage.setItem('pt_token', res.data.token);
            localStorage.setItem('pt_user', JSON.stringify(res.data.patient));
            onSuccess();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Login failed');
        } finally { setLoading(false); }
    };

    return (
        <div className="space-y-4">
            <Field label="ABHA ID or Aadhaar Number" icon="🪪"
                placeholder="Enter 12-digit ID"
                value={loginId} maxLength={12}
                onChange={e => setLoginId(e.target.value.replace(/\D/g, ''))} />
            <Field label="Password" icon="🔑" type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)} />
            <button onClick={handleLogin} disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm transition-all hover:scale-[1.02] disabled:opacity-50 shadow-lg shadow-emerald-500/20 mt-2">
                {loading ? 'Signing in...' : '🔐 Sign In to Patient Portal'}
            </button>
            <div className="text-center">
                <a href="https://abha.abdm.gov.in/abha/v3/register" target="_blank" rel="noreferrer"
                    className="text-blue-400/60 hover:text-blue-400 text-xs transition-colors">
                    🔗 Don't have an ABHA ID? Register on ABDM →
                </a>
            </div>
        </div>
    );
}

// ── REGISTER TAB ───────────────────────────────────────────
function RegisterTab({ onSuccess }) {
    const [form, setForm] = useState({
        abha_id: '', aadhaar_id: '', name: '', phone: '',
        blood_group: 'A+', allergies: '', medical_notes: '', emergency_contact: '', password: ''
    });
    const [loading, setLoading] = useState(false);
    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const validate = () => {
        if (form.abha_id.length !== 12 || !/^\d+$/.test(form.abha_id)) { toast.error('ABHA ID must be exactly 12 digits'); return false; }
        if (form.aadhaar_id.length !== 12 || !/^\d+$/.test(form.aadhaar_id)) { toast.error('Aadhaar ID must be exactly 12 digits'); return false; }
        if (!form.name.trim()) { toast.error('Enter your full name'); return false; }
        if (form.phone.length !== 10 || !/^\d+$/.test(form.phone)) { toast.error('Phone must be 10 digits'); return false; }
        if (form.password.length < 5) { toast.error('Password must be at least 5 characters'); return false; }
        return true;
    };

    const handleRegister = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            await API.post('/patient/register', form);
            toast.success('Registered! Please login now.');
            onSuccess(); // switch to login tab
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Registration failed');
        } finally { setLoading(false); }
    };

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-white/50 text-xs mb-1.5 block">🪪 ABHA ID *</label>
                    <input className="glass-input text-sm w-full" placeholder="12-digit ABHA ID"
                        maxLength={12} value={form.abha_id}
                        onChange={e => setForm({ ...form, abha_id: e.target.value.replace(/\D/g, '') })} />
                </div>
                <div>
                    <label className="text-white/50 text-xs mb-1.5 block">🪪 Aadhaar ID *</label>
                    <input className="glass-input text-sm w-full" placeholder="12-digit Aadhaar"
                        maxLength={12} value={form.aadhaar_id}
                        onChange={e => setForm({ ...form, aadhaar_id: e.target.value.replace(/\D/g, '') })} />
                </div>
            </div>

            <Field label="Full Name *" icon="👤" placeholder="As per Aadhaar"
                value={form.name} onChange={set('name')} />

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-white/50 text-xs mb-1.5 block">📞 Phone *</label>
                    <input className="glass-input text-sm w-full" placeholder="10-digit mobile"
                        maxLength={10} value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} />
                </div>
                <div>
                    <label className="text-white/50 text-xs mb-1.5 block">🩸 Blood Group</label>
                    <select className="glass-input text-sm w-full" value={form.blood_group}
                        onChange={set('blood_group')}>
                        {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
                    </select>
                </div>
            </div>

            <Field label="Allergies" icon="⚠️" placeholder="e.g. Penicillin, Dust"
                value={form.allergies} onChange={set('allergies')} />
            <Field label="Medical Notes" icon="📋" placeholder="e.g. Diabetic, Hypertension"
                value={form.medical_notes} onChange={set('medical_notes')} />
            <Field label="Emergency Contact" icon="🚨" placeholder="10-digit number"
                value={form.emergency_contact}
                onChange={e => setForm({ ...form, emergency_contact: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
            <Field label="Password *" icon="🔑" type="password" placeholder="Min 5 characters"
                value={form.password} onChange={set('password')} />

            <button onClick={handleRegister} disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all hover:scale-[1.02] disabled:opacity-50 shadow-lg shadow-blue-500/20 mt-2">
                {loading ? 'Registering...' : '✅ Create Patient Account'}
            </button>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────
export default function PatientLogin() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('login');

    const goToDashboard = () => navigate('/patient-dashboard');
    const switchToLogin = () => setTab('login');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950 flex items-center justify-center p-4">
            <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />

            {/* Glow orbs */}
            <div className="fixed top-[-200px] left-[-200px] w-[500px] h-[500px] rounded-full bg-emerald-600/15 blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-200px] right-[-200px] w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-lg">

                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-3xl mx-auto mb-4 shadow-xl shadow-emerald-500/30">
                        🧑
                    </div>
                    <h1 className="text-3xl font-extrabold text-white">Patient Portal</h1>
                    <p className="text-white/40 text-sm mt-1">VitaSage AI · ABHA-Linked Health Records</p>
                </div>

                {/* Card */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl overflow-hidden">

                    {/* Tab Bar */}
                    <div className="flex border-b border-white/10">
                        {[['login', '🔐 Sign In'], ['register', '📝 Register']].map(([key, label]) => (
                            <button key={key} onClick={() => setTab(key)}
                                className={`flex-1 py-4 text-sm font-bold transition-all ${tab === key ? 'bg-white/10 text-white border-b-2 border-emerald-500' : 'text-white/40 hover:text-white/70'}`}>
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-7 max-h-[65vh] overflow-y-auto">
                        {tab === 'login'
                            ? <LoginTab onSuccess={goToDashboard} />
                            : <RegisterTab onSuccess={switchToLogin} />
                        }
                    </div>
                </div>

                {/* Footer nav */}
                <div className="flex items-center justify-center gap-4 mt-5 text-xs text-white/20">
                    <button onClick={() => navigate('/')} className="hover:text-white/50 transition-colors">← Back to Home</button>
                    <span>·</span>
                    <button onClick={() => navigate('/login')} className="hover:text-white/50 transition-colors">Hospital Staff Login →</button>
                </div>
            </div>
        </div>
    );
}
