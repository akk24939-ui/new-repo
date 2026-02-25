import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';

// ── Header ────────────────────────────────────────────────
function StaffHeader({ user, today }) {
    const { logout } = useAuth();
    const navigate = useNavigate();
    return (
        <header className="glass-card border-b border-white/10 px-8 py-4 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-lg font-bold">
                    {user?.full_name?.[0] || 'S'}
                </div>
                <div>
                    <p className="text-white font-bold text-sm">{user?.full_name || user?.username}</p>
                    <p className="text-emerald-300/60 text-xs">Staff Panel · VitaSage AI</p>
                </div>
            </div>
            <div className="flex items-center gap-2 text-white/40 text-sm"><span>📅</span><span>{today}</span></div>
            <button onClick={() => { logout(); navigate('/login'); }}
                className="px-4 py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-sm transition-all">
                Logout
            </button>
        </header>
    );
}

// ── Patient Summary Card ──────────────────────────────────
function PatientSummaryCard({ patient }) {
    const isReg = patient.source === 'registered';
    const fields = [
        { label: 'ABHA ID', value: patient.abha_id },
        { label: 'Blood Group', value: patient.blood_group || '—' },
        ...(isReg
            ? [{ label: 'Phone', value: patient.phone || '—' }, { label: 'Emergency', value: patient.emergency_contact || '—' }]
            : [{ label: 'Age', value: patient.age ? `${patient.age} yrs` : '—' }, { label: 'Emergency', value: patient.emergency_contact || '—' }]
        ),
    ];
    return (
        <div className="mx-8 mt-4 glass-card rounded-2xl p-6 border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-2xl font-bold text-emerald-300">
                    {patient.name[0]}
                </div>
                <div>
                    <h2 className="text-white text-xl font-bold">{patient.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="badge badge-active text-xs">✅ Patient Found</span>
                        <span className="text-xs text-orange-400/60 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                            View Only — No Diagnosis Access
                        </span>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {fields.map(f => (
                    <div key={f.label} className="bg-white/5 rounded-xl p-3">
                        <p className="text-white/40 text-xs mb-0.5">{f.label}</p>
                        <p className="text-white text-sm font-medium">{f.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── UMAVS Staff Upload Section (vitals + file → medical_records) ──
function StaffMedicalUpload({ patient }) {
    const CATS = ['Lab Report', 'Nursing Report', 'Daily Monitoring', 'Emergency Observation'];
    const [form, setForm] = useState({ sugar_level: '', blood_pressure: '', file_category: 'Lab Report' });
    const [file, setFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [savedCount, setSavedCount] = useState(0);

    const save = async () => {
        if (!form.sugar_level && !form.blood_pressure && !file)
            return toast.error('Enter at least Sugar, BP, or upload a file');
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('patient_id', patient.id);
            fd.append('patient_source', patient.source);
            fd.append('sugar_level', form.sugar_level || '');
            fd.append('blood_pressure', form.blood_pressure || '');
            fd.append('file_category', form.file_category);
            if (file) fd.append('file', file);

            await api.post('/medical-records/upload-record', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Record saved! Patient can now view this.');
            setForm({ sugar_level: '', blood_pressure: '', file_category: 'Lab Report' });
            setFile(null);
            setSavedCount(c => c + 1);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Save failed');
        } finally { setSaving(false); }
    };

    return (
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-4 md:col-span-2">
            <div className="flex items-center justify-between">
                <h3 className="text-white font-bold flex items-center gap-2">
                    📤 <span>Save Medical Record</span>
                </h3>
                {savedCount > 0 && (
                    <span className="text-emerald-400/70 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        ✅ {savedCount} saved this session
                    </span>
                )}
            </div>
            <p className="text-white/20 text-xs -mt-2">
                Patient will see this entry in their health timeline. Diagnosis and suggestions are doctor-only — automatically restricted.
            </p>

            {/* Vitals */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-white/40 text-xs mb-1.5 block">🩸 Sugar Level</label>
                    <div className="relative">
                        <input className="glass-input text-sm pr-14" placeholder="e.g. 95"
                            value={form.sugar_level} onChange={e => setForm({ ...form, sugar_level: e.target.value })} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">mg/dL</span>
                    </div>
                </div>
                <div>
                    <label className="text-white/40 text-xs mb-1.5 block">💓 Blood Pressure</label>
                    <div className="relative">
                        <input className="glass-input text-sm pr-14" placeholder="e.g. 120/80"
                            value={form.blood_pressure} onChange={e => setForm({ ...form, blood_pressure: e.target.value })} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">mmHg</span>
                    </div>
                </div>
            </div>

            {/* Category + File */}
            <div>
                <label className="text-white/40 text-xs mb-1.5 block">📁 File Category</label>
                <select className="glass-input text-sm" value={form.file_category}
                    onChange={e => setForm({ ...form, file_category: e.target.value })}>
                    {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
            </div>
            <label className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-emerald-500/40 transition-all">
                <input type="file" className="hidden" onChange={e => setFile(e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png" />
                {file
                    ? <p className="text-white text-sm">📎 {file.name}</p>
                    : <p className="text-white/30 text-sm">📎 Attach file (optional) — PDF or Image</p>
                }
            </label>

            {/* RBAC Notice */}
            <div className="flex items-center gap-2 bg-orange-500/5 rounded-xl px-4 py-2.5 border border-orange-500/10">
                <span className="text-orange-400/60 text-sm">🔒</span>
                <p className="text-orange-400/50 text-xs">Diagnosis & Suggestions automatically excluded (staff role)</p>
            </div>

            <button onClick={save} disabled={saving}
                className="py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm transition-all disabled:opacity-50">
                {saving ? '⏳ Saving...' : '💾 Save Record to Patient Timeline'}
            </button>
        </div>
    );
}

// ── Vitals legacy section ─────────────────────────────────
function VitalsSection({ patientId }) {
    const [form, setForm] = useState({ systolic: '', diastolic: '', sugar_fasting: '', sugar_random: '', temperature: '' });
    const [list, setList] = useState([]);
    const [saving, setSaving] = useState(false);

    const loadVitals = async () => {
        try { const res = await api.get(`/vitals/${patientId}`); setList(res.data); } catch { }
    };
    const save = async () => {
        const payload = {
            patient_id: patientId,
            systolic: form.systolic ? parseInt(form.systolic) : null,
            diastolic: form.diastolic ? parseInt(form.diastolic) : null,
            sugar_fasting: form.sugar_fasting ? parseFloat(form.sugar_fasting) : null,
            sugar_random: form.sugar_random ? parseFloat(form.sugar_random) : null,
            temperature: form.temperature ? parseFloat(form.temperature) : null,
        };
        if (!payload.systolic && !payload.sugar_fasting && !payload.sugar_random)
            return toast.error('Enter at least BP or Sugar');
        setSaving(true);
        try {
            const res = await api.post('/vitals/', payload);
            setList([res.data, ...list]);
            setForm({ systolic: '', diastolic: '', sugar_fasting: '', sugar_random: '', temperature: '' });
            toast.success('Vitals saved!');
        } catch { toast.error('Failed'); } finally { setSaving(false); }
    };
    useState(() => { loadVitals(); }, []);

    return (
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-white font-bold flex items-center gap-2">🩺 <span>Vitals Entry</span></h3>
            <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                    <input type="number" placeholder="Systolic" className="glass-input text-sm pr-14"
                        value={form.systolic} onChange={e => setForm({ ...form, systolic: e.target.value })} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">mmHg</span>
                </div>
                <div className="relative">
                    <input type="number" placeholder="Diastolic" className="glass-input text-sm pr-14"
                        value={form.diastolic} onChange={e => setForm({ ...form, diastolic: e.target.value })} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">mmHg</span>
                </div>
                <div className="relative">
                    <input type="number" placeholder="Fasting Sugar" className="glass-input text-sm pr-14"
                        value={form.sugar_fasting} onChange={e => setForm({ ...form, sugar_fasting: e.target.value })} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">mg/dL</span>
                </div>
                <div className="relative">
                    <input type="number" placeholder="Random Sugar" className="glass-input text-sm pr-14"
                        value={form.sugar_random} onChange={e => setForm({ ...form, sugar_random: e.target.value })} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">mg/dL</span>
                </div>
            </div>
            <div className="relative">
                <input type="number" step="0.1" placeholder="Temperature (optional)" className="glass-input text-sm pr-8"
                    value={form.temperature} onChange={e => setForm({ ...form, temperature: e.target.value })} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">°F</span>
            </div>
            <button onClick={save} disabled={saving}
                className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-bold text-sm transition-all disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Vitals'}
            </button>
            {list.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-white/70">
                        <thead><tr className="border-b border-white/10">
                            {['Date', 'BP', 'Fasting', 'Random', 'Temp'].map(h => <th key={h} className="text-left py-2 text-white/40">{h}</th>)}
                        </tr></thead>
                        <tbody>
                            {list.map(v => (
                                <tr key={v.id} className="border-b border-white/5">
                                    <td className="py-2">{new Date(v.created_at).toLocaleDateString('en-IN')}</td>
                                    <td className="py-2">{v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : '—'}</td>
                                    <td className="py-2">{v.sugar_fasting ? `${v.sugar_fasting}` : '—'}</td>
                                    <td className="py-2">{v.sugar_random ? `${v.sugar_random}` : '—'}</td>
                                    <td className="py-2">{v.temperature ? `${v.temperature}°F` : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── CMMS: Staff View - Collaborative Timeline (View Only) ──
function StaffCollaborativeTimeline({ patient }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const load = useCallback(async () => {
        if (!patient) return;
        setLoading(true);
        try {
            const res = await api.get(`/medical-records/patient-records/${patient.source}/${patient.id}`);
            setRecords(res.data);
        } catch { }
        finally { setLoading(false); }
    }, [patient]);

    useState(() => { load(); }, []);

    const filtered = filter === 'all' ? records : records.filter(r => r.uploaded_by_role === filter);

    const bpColor = bp => {
        if (!bp) return 'text-white/50';
        const s = parseInt(bp.split('/')[0]);
        return s > 140 ? 'text-red-400' : s > 120 ? 'text-yellow-400' : 'text-emerald-400';
    };
    const sugarColor = s => {
        if (!s) return 'text-white/50';
        const v = parseInt(s);
        return v > 200 ? 'text-red-400' : v > 140 ? 'text-yellow-400' : 'text-emerald-400';
    };
    const downloadFile = async (id, fname) => {
        try {
            const res = await api.get(`/medical-records/download/${id}`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a'); a.href = url; a.download = fname; a.click();
            URL.revokeObjectURL(url);
        } catch { toast.error('Download failed'); }
    };

    return (
        <div className="mx-8 mb-10">
            <div className="glass-card rounded-2xl p-6 border border-emerald-500/10">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div>
                        <h3 className="text-white font-bold text-base flex items-center gap-2">
                            📅 Full Medical Timeline
                            <span className="text-xs font-normal text-white/30 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400/60">View Only</span>
                        </h3>
                        <p className="text-white/30 text-xs mt-0.5">
                            All records from all doctors and staff — {records.length} total. You cannot edit doctor entries.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={load} className="text-white/30 hover:text-white/60 text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-all">🔄</button>
                        {['all', 'doctor', 'staff'].map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`text-xs px-3 py-1.5 rounded-xl transition-all capitalize font-medium ${filter === f
                                    ? f === 'doctor' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                        : f === 'staff' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                            : 'bg-white/15 text-white border border-white/20'
                                    : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'}`}>
                                {f === 'all' ? `All (${records.length})` : f === 'doctor' ? `🩺 Dr (${records.filter(r => r.uploaded_by_role === 'doctor').length})` : `👩‍⚕️ Staff (${records.filter(r => r.uploaded_by_role === 'staff').length})`}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="text-white/30 text-sm text-center py-8">Loading records...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="text-4xl mb-3">🗂️</div>
                        <p className="text-white/30 text-sm">No records yet. Upload one above!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((r, i) => {
                            const isDoc = r.uploaded_by_role === 'doctor' || r.uploaded_by_role === 'admin';
                            return (
                                <div key={r.id} className={`relative pl-5 ${i < filtered.length - 1 ? 'pb-4 border-l' : ''} ${isDoc ? 'border-blue-500/20' : 'border-emerald-500/20'}`}>
                                    <div className={`absolute left-0 top-2 w-3 h-3 rounded-full -translate-x-1.5 border-2 ${isDoc ? 'bg-blue-500 border-blue-400' : 'bg-emerald-500 border-emerald-400'}`} />
                                    <div className={`rounded-2xl p-4 border ${isDoc ? 'bg-blue-500/5 border-blue-500/15' : 'bg-emerald-500/5 border-emerald-500/15'}`}>
                                        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${isDoc ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                                    {isDoc ? '🩺 Doctor' : '👩‍⚕️ Staff'}
                                                </span>
                                                {r.uploader_name && <span className="text-white/50 text-xs font-medium">{r.uploader_name}</span>}
                                                {r.file_category && <span className="text-white/20 text-xs px-2 py-0.5 bg-white/5 rounded-full">{r.file_category}</span>}
                                            </div>
                                            <span className="text-white/25 text-xs">
                                                {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                        {(r.sugar_level || r.blood_pressure) && (
                                            <div className="flex items-center gap-4 mb-3 bg-white/5 rounded-xl px-3 py-2">
                                                {r.sugar_level && <div className="flex items-center gap-1.5"><span className="text-white/30 text-xs">🩸</span><span className={`text-xs font-bold ${sugarColor(r.sugar_level)}`}>{r.sugar_level} mg/dL</span></div>}
                                                {r.blood_pressure && <div className="flex items-center gap-1.5"><span className="text-white/30 text-xs">💓</span><span className={`text-xs font-bold ${bpColor(r.blood_pressure)}`}>{r.blood_pressure}</span></div>}
                                            </div>
                                        )}
                                        {r.diagnosis && (
                                            <div className="mb-2">
                                                <p className="text-blue-400/50 text-xs mb-0.5">📋 Doctor Diagnosis</p>
                                                <p className="text-white text-sm">{r.diagnosis}</p>
                                            </div>
                                        )}
                                        {r.suggestion && (
                                            <div className="mb-2">
                                                <p className="text-indigo-400/50 text-xs mb-0.5">💡 Doctor's Suggestion</p>
                                                <p className="text-white/80 text-sm">{r.suggestion}</p>
                                            </div>
                                        )}
                                        {r.file_name && (
                                            <button onClick={() => downloadFile(r.id, r.file_name)}
                                                className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 transition-all group text-left w-full">
                                                <span>{r.file_name?.endsWith?.('.pdf') ? '📄' : '🖼️'}</span>
                                                <span className="text-white/50 group-hover:text-white text-xs transition-colors truncate flex-1">{r.file_name}</span>
                                                <span className="text-white/20 group-hover:text-emerald-400 text-xs transition-colors">⬇ Download</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Staff Dashboard ──────────────────────────────────
export default function StaffDashboard() {
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [patient, setPatient] = useState(null);
    const [searching, setSearching] = useState(false);
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const searchPatient = async () => {
        if (query.length !== 12 || !/^\d{12}$/.test(query))
            return toast.error('Must be 12-digit ABHA ID or Aadhaar');
        setSearching(true);
        try {
            // Use unified cross-table search
            const res = await api.get(`/patient-records/search?query=${query}`);
            setPatient(res.data);
            toast.success(`Patient found: ${res.data.name}`);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Patient not found');
            setPatient(null);
        } finally { setSearching(false); }
    };

    const isMaster = patient?.source === 'master';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950">
            <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
            <StaffHeader user={user} today={today} />

            {/* Search */}
            <div className="mx-8 mt-6">
                <div className="glass-card rounded-2xl p-6">
                    <h2 className="text-white font-bold text-lg mb-1 flex items-center gap-2">🔎 Patient Search</h2>
                    <p className="text-white/30 text-xs mb-4">Searches hospital records and patient portal registrations</p>
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <input value={query}
                                onChange={e => setQuery(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                onKeyDown={e => e.key === 'Enter' && searchPatient()}
                                className="glass-input pr-16" placeholder="Enter 12-digit ABHA ID or Aadhaar" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 text-xs">{query.length}/12</span>
                        </div>
                        <button onClick={searchPatient} disabled={searching}
                            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50">
                            {searching ? '⏳' : '🔍 Fetch Patient'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Patient found */}
            {patient && (
                <>
                    <PatientSummaryCard patient={patient} />
                    <div className="mx-8 mt-6 mb-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* UMAVS unified record (always) */}
                        <StaffMedicalUpload patient={patient} />
                        {/* Legacy vitals for master patients */}
                        {isMaster && <VitalsSection patientId={patient.id} />}
                    </div>
                    {/* CMMS: Staff sees ALL records (doctor + other staff) in view-only timeline */}
                    <StaffCollaborativeTimeline patient={patient} />
                </>
            )}

            {!patient && (
                <div className="mx-8 mt-6 glass-card rounded-2xl p-12 text-center">
                    <div className="text-5xl mb-4">👩‍⚕️</div>
                    <h3 className="text-white font-bold text-xl mb-2">Staff Portal Ready</h3>
                    <p className="text-white/30 mb-6">Enter a patient ABHA ID to record vitals and upload reports.</p>
                    <div className="inline-flex flex-col gap-2 text-left bg-white/5 rounded-2xl p-5 border border-white/5">
                        <p className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-1">Your Permissions</p>
                        {[['✅', 'Search patient by ABHA ID'], ['✅', 'Record Sugar & BP'], ['✅', 'Upload lab reports'], ['✅', 'Patient sees your entry'], ['❌', 'Add diagnosis'], ['❌', 'Add suggestion'], ['❌', 'Prescribe medicines']].map(([i, t]) => (
                            <div key={t} className="flex items-center gap-2">
                                <span>{i}</span><span className={`text-xs ${i === '❌' ? 'text-red-400/50' : 'text-emerald-400/60'}`}>{t}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
