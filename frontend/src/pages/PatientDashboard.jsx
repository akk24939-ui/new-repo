import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const API = axios.create({ baseURL: 'http://localhost:8000' });

// ── Health tip of the day ────────────────────────────────
const TIPS = [
    'Drink at least 8 glasses of water daily.',
    'Walk 30 minutes every day to keep your heart healthy.',
    'Sleep 7–8 hours every night for optimal recovery.',
    'Eat fruits and vegetables — aim for 5 servings daily.',
    'Monitor your blood pressure regularly if you are above 40.',
    'Avoid processed food — cook at home more often.',
    'Regular check-ups can catch diseases early.',
];

// ── Profile Card ─────────────────────────────────────────
function ProfileCard({ patient }) {
    const fields = [
        { label: 'ABHA ID', value: patient.abha_id, icon: '🪪' },
        { label: 'Blood Group', value: patient.blood_group || '—', icon: '🩸' },
        { label: 'Phone', value: patient.phone, icon: '📞' },
        { label: 'Emergency Contact', value: patient.emergency_contact || '—', icon: '🚨' },
    ];
    return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-emerald-500/30">
                    {patient.name?.[0] || 'P'}
                </div>
                <div>
                    <h2 className="text-white text-2xl font-extrabold">{patient.name}</h2>
                    <span className="text-emerald-400/70 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        🟢 Active Patient
                    </span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {fields.map(f => (
                    <div key={f.label} className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <p className="text-white/30 text-xs mb-0.5">{f.icon} {f.label}</p>
                        <p className="text-white font-semibold text-sm">{f.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Medical Info Card ────────────────────────────────────
function MedicalCard({ patient }) {
    return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
                📋 Medical Information
            </h3>
            <div className="space-y-3">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                    <p className="text-orange-400/70 text-xs mb-1">⚠️ Known Allergies</p>
                    <p className="text-white text-sm">{patient.allergies || 'None reported'}</p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <p className="text-blue-400/70 text-xs mb-1">📝 Medical Notes</p>
                    <p className="text-white text-sm">{patient.medical_notes || 'No notes on file'}</p>
                </div>
            </div>
        </div>
    );
}

// ── ABHA Info Card ───────────────────────────────────────
function AbhaCard({ patient }) {
    return (
        <div className="backdrop-blur-xl bg-white/10 border border-blue-500/20 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
                🆔 Your ABHA Digital Health Card
            </h3>
            <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 rounded-2xl p-5 border border-blue-500/20">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-white/30 text-xs">Ayushman Bharat Health Account</p>
                        <p className="text-white font-extrabold text-lg tracking-widest">{patient.abha_id}</p>
                    </div>
                    <div className="text-3xl">🇮🇳</div>
                </div>
                <div className="border-t border-white/10 pt-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                        {patient.name?.[0]}
                    </div>
                    <div>
                        <p className="text-white text-sm font-semibold">{patient.name}</p>
                        <p className="text-white/30 text-xs">Blood: {patient.blood_group || '—'}</p>
                    </div>
                </div>
            </div>
            <a href="https://abha.abdm.gov.in/abha/v3/register" target="_blank" rel="noreferrer"
                className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-blue-500/20 text-blue-400/70 hover:text-blue-400 hover:border-blue-500/40 text-xs transition-all">
                🔗 Manage ABHA on ABDM Portal ↗
            </a>
        </div>
    );
}

// ── Health Tip ───────────────────────────────────────────
function HealthTip() {
    const tip = TIPS[new Date().getDay() % TIPS.length];
    return (
        <div className="backdrop-blur-xl bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-5 flex items-start gap-4">
            <div className="text-2xl">💡</div>
            <div>
                <p className="text-emerald-400/70 text-xs mb-1 font-semibold uppercase tracking-wide">Today's Health Tip</p>
                <p className="text-white text-sm">{tip}</p>
            </div>
        </div>
    );
}

// ── Quick Links ──────────────────────────────────────────
function QuickLinks() {
    return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6">
            <h3 className="text-white font-bold text-base mb-4">🔗 Quick Links</h3>
            <div className="space-y-2">
                {[
                    { icon: '📋', label: 'ABHA Registration', href: 'https://abha.abdm.gov.in/abha/v3/register' },
                    { icon: '🏥', label: 'Find ABDM Hospitals', href: 'https://facility.ndhm.gov.in/' },
                    { icon: '💊', label: 'Health Locker', href: 'https://healthlocker.abdm.gov.in/' },
                    { icon: '📞', label: 'Health Helpline: 104', href: 'tel:104' },
                ].map(l => (
                    <a key={l.label} href={l.href} target="_blank" rel="noreferrer"
                        className="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-2.5 transition-all group">
                        <span>{l.icon}</span>
                        <span className="text-white/60 group-hover:text-white text-sm transition-colors">{l.label}</span>
                        <span className="ml-auto text-white/20 text-xs">↗</span>
                    </a>
                ))}
            </div>
        </div>
    );
}

// ── Main Dashboard ───────────────────────────────────────
export default function PatientDashboard() {
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [fullProfile, setFullProfile] = useState(null);
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    useEffect(() => {
        const token = localStorage.getItem('pt_token');
        const user = JSON.parse(localStorage.getItem('pt_user') || 'null');
        if (!token || !user) { navigate('/patient-login'); return; }
        setPatient(user);

        // Fetch full profile
        API.get(`/patient/profile/${user.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => setFullProfile(res.data)).catch(() => { });
    }, [navigate]);

    const logout = () => {
        localStorage.removeItem('pt_token');
        localStorage.removeItem('pt_user');
        navigate('/');
        toast.success('Logged out');
    };

    if (!patient) return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950 flex items-center justify-center">
            <div className="text-white text-xl">Loading...</div>
        </div>
    );

    const displayData = fullProfile || patient;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950">
            <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />

            {/* Glow orbs */}
            <div className="fixed top-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

            {/* Header */}
            <header className="relative z-20 backdrop-blur-xl bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-lg font-black">
                        {patient.name?.[0]}
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm">{patient.name}</p>
                        <p className="text-emerald-400/50 text-xs">Patient Dashboard</p>
                    </div>
                </div>
                <p className="text-white/30 text-xs hidden md:block">{today}</p>
                <button onClick={logout}
                    className="px-4 py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-sm transition-all">
                    Logout
                </button>
            </header>

            {/* Main content */}
            <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">

                {/* Welcome banner */}
                <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/20 flex items-center gap-4">
                    <div className="text-3xl">👋</div>
                    <div>
                        <p className="text-white font-bold text-lg">Welcome back, {patient.name?.split(' ')[0]}!</p>
                        <p className="text-white/40 text-sm">Your health records are secure and ABHA-linked.</p>
                    </div>
                    <div className="ml-auto text-right hidden md:block">
                        <p className="text-white/20 text-xs">ABHA ID</p>
                        <p className="text-emerald-400 font-mono text-sm font-bold">{patient.abha_id}</p>
                    </div>
                </div>

                <HealthTip />

                {/* 2-column grid */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ProfileCard patient={displayData} />
                    <MedicalCard patient={displayData} />
                    <AbhaCard patient={displayData} />
                    <QuickLinks />
                </div>

                {/* Footer note */}
                <p className="text-center text-white/15 text-xs mt-10">
                    VitaSage AI Patient Portal · Records encrypted · ABHA-linked · NHA Compliant
                </p>
            </div>
        </div>
    );
}
