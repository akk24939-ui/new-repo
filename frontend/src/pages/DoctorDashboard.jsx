import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';

// ── Header ────────────────────────────────────────────────
function Header({ doctor, today }) {
    const { logout } = useAuth();
    const navigate = useNavigate();
    return (
        <header className="glass-card border-b border-white/10 px-8 py-4 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-lg font-bold">
                    {doctor?.full_name?.[0] || 'D'}
                </div>
                <div>
                    <p className="text-white font-bold text-sm">{doctor?.full_name || doctor?.username}</p>
                    <p className="text-cyan-300/60 text-xs capitalize">{doctor?.role} · VitaSage AI</p>
                </div>
            </div>
            <div className="flex items-center gap-2 text-white/40 text-sm">
                <span>📅</span><span>{today}</span>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }}
                className="px-4 py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-sm transition-all">
                Logout
            </button>
        </header>
    );
}

// ── Emergency Banner ──────────────────────────────────────
function EmergencyBanner({ patientName }) {
    return (
        <div className="mx-8 mt-4 p-4 rounded-2xl border-2 border-red-500 bg-red-500/10 animate-pulse flex items-center gap-3">
            <span className="text-2xl">🔴</span>
            <div>
                <p className="text-red-400 font-bold text-lg">EMERGENCY PATIENT — HIGH RISK</p>
                <p className="text-red-300/70 text-sm">{patientName} requires immediate attention.</p>
            </div>
        </div>
    );
}

// ── Patient Summary Card ──────────────────────────────────
function PatientCard({ patient }) {
    const isRegistered = patient.source === 'registered';
    const fields = [
        { label: 'ABHA ID', value: patient.abha_id },
        { label: 'Blood Group', value: patient.blood_group || '—' },
        ...(isRegistered ? [
            { label: 'Phone', value: patient.phone || '—' },
            { label: 'Emergency Contact', value: patient.emergency_contact || '—' },
            { label: 'Allergies', value: patient.allergies || 'None' },
            { label: 'Medical Notes', value: patient.medical_notes || 'None' },
        ] : [
            { label: 'Age', value: patient.age ? `${patient.age} yrs` : '—' },
            { label: 'Gender', value: patient.gender || '—' },
            { label: 'Allergies', value: patient.allergies || 'None' },
            { label: 'Chronic Conditions', value: patient.medical_notes || patient.chronic_conditions || 'None' },
            { label: 'Emergency Contact', value: patient.emergency_contact || '—' },
        ]),
    ];

    return (
        <div className="mx-8 mt-4 glass-card rounded-2xl p-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-cyan-500/20">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-2xl font-bold text-cyan-300">
                    {patient.name[0]}
                </div>
                <div>
                    <h2 className="text-white text-xl font-bold">{patient.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        {isRegistered ? (
                            <span className="badge badge-active text-xs">🧑 Portal Patient</span>
                        ) : (
                            <span className={`badge text-xs ${patient.risk_level === 'High' ? 'badge-inactive' : patient.risk_level === 'Medium' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 'badge-active'}`}>
                                {patient.risk_level} Risk
                            </span>
                        )}
                        <span className="text-white/20 text-xs px-2 py-0.5 rounded-full bg-white/5">
                            {isRegistered ? 'Self-registered via Patient Portal' : 'Doctor-managed Patient'}
                        </span>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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

// ── Diagnosis Report Section (works for both sources) ─────
function DiagnosisSection({ patient }) {
    const [form, setForm] = useState({ sugar_level: '', blood_pressure: '', diagnosis: '', notes: '' });
    const [history, setHistory] = useState([]);
    const [saving, setSaving] = useState(false);

    const loadHistory = useCallback(async () => {
        try {
            const res = await api.get(`/patient-records/diagnosis/${patient.source}/${patient.id}`);
            setHistory(res.data);
        } catch { }
    }, [patient.id, patient.source]);

    useState(() => { loadHistory(); }, []);

    const save = async () => {
        if (!form.diagnosis.trim()) return toast.error('Diagnosis text is required');
        setSaving(true);
        try {
            await api.post('/patient-records/diagnosis', {
                patient_id: patient.id,
                patient_source: patient.source,
                sugar_level: form.sugar_level || null,
                blood_pressure: form.blood_pressure || null,
                diagnosis: form.diagnosis,
                notes: form.notes || null,
            });
            toast.success('Diagnosis report saved!');
            setForm({ sugar_level: '', blood_pressure: '', diagnosis: '', notes: '' });
            loadHistory();
        } catch { toast.error('Failed to save report'); }
        finally { setSaving(false); }
    };

    const bpColor = (bp) => {
        if (!bp) return '';
        const sys = parseInt(bp.split('/')[0]);
        if (sys > 140) return 'text-red-400';
        if (sys > 120) return 'text-yellow-400';
        return 'text-emerald-400';
    };

    const sugarColor = (sugar) => {
        if (!sugar) return '';
        const val = parseInt(sugar);
        if (val > 200) return 'text-red-400';
        if (val > 140) return 'text-yellow-400';
        return 'text-emerald-400';
    };

    return (
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-4 md:col-span-2">
            <h3 className="text-white font-bold flex items-center gap-2">
                🩺 <span>Add Diagnosis Report</span>
                <span className="text-xs font-normal text-white/30 ml-auto">for {patient.name}</span>
            </h3>

            {/* Vitals row */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-white/40 text-xs mb-1.5 block">🩸 Sugar Level</label>
                    <div className="relative">
                        <input className="glass-input text-sm pr-14" placeholder="e.g. 95"
                            value={form.sugar_level}
                            onChange={e => setForm({ ...form, sugar_level: e.target.value })} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">mg/dL</span>
                    </div>
                </div>
                <div>
                    <label className="text-white/40 text-xs mb-1.5 block">💓 Blood Pressure</label>
                    <div className="relative">
                        <input className="glass-input text-sm pr-12" placeholder="e.g. 120/80"
                            value={form.blood_pressure}
                            onChange={e => setForm({ ...form, blood_pressure: e.target.value })} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">mmHg</span>
                    </div>
                </div>
            </div>

            {/* Diagnosis */}
            <div>
                <label className="text-white/40 text-xs mb-1.5 block">📋 Diagnosis *</label>
                <textarea value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })}
                    className="glass-input resize-none h-24 text-sm w-full"
                    placeholder="Enter clinical diagnosis, observations, and treatment plan..." />
            </div>

            {/* Notes */}
            <div>
                <label className="text-white/40 text-xs mb-1.5 block">📝 Additional Notes</label>
                <input className="glass-input text-sm" placeholder="Follow-up instructions, referrals, etc."
                    value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>

            <button onClick={save} disabled={saving}
                className="py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? '⏳ Saving...' : '💾 Save Diagnosis Report'}
            </button>

            {/* Report History */}
            {history.length > 0 && (
                <div>
                    <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-3">Report History</p>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {history.map(r => (
                            <div key={r.id} className="bg-white/5 rounded-xl p-4 border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        {r.blood_pressure && (
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/5 ${bpColor(r.blood_pressure)}`}>
                                                💓 {r.blood_pressure}
                                            </span>
                                        )}
                                        {r.sugar_level && (
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/5 ${sugarColor(r.sugar_level)}`}>
                                                🩸 {r.sugar_level} mg/dL
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-white/20 text-xs">{new Date(r.created_at).toLocaleDateString('en-IN')}</span>
                                </div>
                                <p className="text-white text-sm">{r.diagnosis}</p>
                                {r.notes && <p className="text-white/40 text-xs mt-1">{r.notes}</p>}
                                {r.doctor_name && <p className="text-cyan-400/50 text-xs mt-1.5">Dr. {r.doctor_name}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Suggestion Section (master patients only) ─────────────
function SuggestionSection({ patientId }) {
    const [notes, setNotes] = useState('');
    const [risk, setRisk] = useState('Low');
    const [followup, setFollowup] = useState('');
    const [list, setList] = useState([]);

    const load = async () => {
        try { const res = await api.get(`/suggestions/${patientId}`); setList(res.data); } catch { }
    };
    const save = async () => {
        if (!notes.trim()) return toast.error('Enter diagnosis notes');
        try {
            const res = await api.post('/suggestions/', { patient_id: patientId, notes, risk_level: risk, followup_date: followup || null });
            setList([res.data, ...list]); setNotes(''); setFollowup('');
            toast.success('Suggestion saved');
        } catch { toast.error('Failed to save'); }
    };
    useState(() => { load(); }, []);

    return (
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-white font-bold flex items-center gap-2">📝 <span>Doctor Suggestion</span></h3>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
                className="glass-input resize-none h-24 text-sm" placeholder="Clinical notes..." />
            <div className="flex gap-3">
                <select value={risk} onChange={e => setRisk(e.target.value)} className="glass-input text-sm flex-1">
                    <option>Low</option><option>Medium</option><option>High</option>
                </select>
                <input type="date" value={followup} onChange={e => setFollowup(e.target.value)} className="glass-input text-sm flex-1" />
            </div>
            <button onClick={save} className="btn-primary py-2.5 text-sm">Save Suggestion</button>
            <div className="space-y-2 max-h-40 overflow-y-auto">
                {list.map(s => (
                    <div key={s.id} className="bg-white/5 rounded-xl p-3 text-sm">
                        <div className="flex justify-between mb-1">
                            <span className={`badge text-xs ${s.risk_level === 'High' ? 'badge-inactive' : s.risk_level === 'Medium' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 'badge-active'}`}>{s.risk_level}</span>
                            <span className="text-white/30 text-xs">{new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-white/80">{s.notes}</p>
                        {s.followup_date && <p className="text-cyan-400/60 text-xs mt-1">Follow-up: {s.followup_date}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Prescription Section (master patients only) ───────────
function PrescriptionSection({ patientId }) {
    const [form, setForm] = useState({ medicine_name: '', dosage: '', frequency: '', duration: '' });
    const [list, setList] = useState([]);

    const load = async () => {
        try { const res = await api.get(`/prescriptions/${patientId}`); setList(res.data); } catch { }
    };
    const add = async () => {
        if (!form.medicine_name) return toast.error('Enter medicine name');
        try {
            const res = await api.post('/prescriptions/', { patient_id: patientId, ...form });
            setList([res.data, ...list]);
            setForm({ medicine_name: '', dosage: '', frequency: '', duration: '' });
            toast.success('Prescription added');
        } catch { toast.error('Failed to add prescription'); }
    };
    useState(() => { load(); }, []);

    return (
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-white font-bold flex items-center gap-2">💊 <span>Prescribed Medicines</span></h3>
            <input className="glass-input text-sm" placeholder="Medicine Name *" value={form.medicine_name}
                onChange={e => setForm({ ...form, medicine_name: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
                {[['dosage', 'Dosage'], ['frequency', 'Frequency'], ['duration', 'Duration']].map(([k, p]) => (
                    <input key={k} className="glass-input text-xs" placeholder={p}
                        value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} />
                ))}
            </div>
            <button onClick={add} className="btn-primary py-2.5 text-sm">Add Medicine</button>
            <div className="space-y-2 max-h-40 overflow-y-auto">
                {list.map(rx => (
                    <div key={rx.id} className="bg-white/5 rounded-xl px-4 py-2.5 flex justify-between text-sm">
                        <span className="text-white font-medium">{rx.medicine_name}
                            <span className="text-white/40 ml-2">{rx.dosage} · {rx.frequency} · {rx.duration}</span>
                        </span>
                        <span className="text-white/30 text-xs">{new Date(rx.created_at).toLocaleDateString()}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Report Upload + Folders (master patients only) ────────
function ReportSection({ patientId }) {
    const CATS = ['Lab Report', 'Radiology', 'Prescription', 'Emergency'];
    const ICONS = { 'Lab Report': '🧪', 'Radiology': '🩻', 'Prescription': '📋', 'Emergency': '🚨' };
    const [category, setCategory] = useState('Lab Report');
    const [file, setFile] = useState(null);
    const [reports, setReports] = useState([]);
    const [activeFolder, setActiveFolder] = useState(null);

    const load = async () => {
        try { const res = await api.get(`/reports/patient/${patientId}`); setReports(res.data); } catch { }
    };
    const upload = async () => {
        if (!file) return toast.error('Select a file first');
        const fd = new FormData();
        fd.append('patient_id', patientId); fd.append('category', category); fd.append('file', file);
        try {
            await api.post('/reports/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Report uploaded'); setFile(null); load();
        } catch { toast.error('Upload failed'); }
    };
    useState(() => { load(); }, []);
    const grouped = CATS.reduce((a, c) => { a[c] = reports.filter(r => r.category === c); return a; }, {});

    return (
        <>
            <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
                <h3 className="text-white font-bold flex items-center gap-2">📄 <span>Upload Report</span></h3>
                <select value={category} onChange={e => setCategory(e.target.value)} className="glass-input text-sm">
                    {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
                <label className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-blue-500/40 transition-all">
                    <input type="file" className="hidden" onChange={e => setFile(e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png" />
                    {file ? <p className="text-white text-sm">{file.name}</p> : <p className="text-white/30 text-sm">Click to select PDF or Image</p>}
                </label>
                <button onClick={upload} className="btn-primary py-2.5 text-sm">Upload</button>
            </div>
            <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
                <h3 className="text-white font-bold flex items-center gap-2">📂 <span>Report Folders</span></h3>
                <div className="grid grid-cols-2 gap-3">
                    {CATS.map(cat => (
                        <button key={cat} onClick={() => setActiveFolder(activeFolder === cat ? null : cat)}
                            className={`p-3 rounded-xl border text-left transition-all ${activeFolder === cat ? 'border-blue-500/40 bg-blue-500/10' : 'border-white/5 bg-white/5 hover:border-blue-500/20'}`}>
                            <div className="text-xl mb-1">{ICONS[cat]}</div>
                            <p className="text-white text-sm font-medium">{cat}</p>
                            <p className="text-white/30 text-xs">{grouped[cat]?.length || 0} files</p>
                        </button>
                    ))}
                </div>
                {activeFolder && grouped[activeFolder].length === 0 && (
                    <p className="text-white/30 text-sm text-center py-2">No files in {activeFolder}</p>
                )}
                {activeFolder && grouped[activeFolder].map(r => (
                    <a key={r.id} href={`http://localhost:8000/uploads/${r.file_path}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-2.5 transition-all">
                        <span>{r.file_name.endsWith('.pdf') ? '📄' : '🖼️'}</span>
                        <span className="text-white text-sm flex-1 truncate">{r.file_name}</span>
                        <span className="text-white/30 text-xs">{new Date(r.upload_date).toLocaleDateString()}</span>
                    </a>
                ))}
            </div>
        </>
    );
}

// ── CMMS: Collaborative Medical Timeline ─────────────────
// Shows ALL records (from all doctors + staff) for the patient.
// Used by both Doctor Dashboard and Staff Dashboard.
function CollaborativeTimeline({ patient, readOnly = false }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all | doctor | staff
    const [refreshKey, setRefreshKey] = useState(0);

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

    // Allow external refresh trigger
    const refresh = () => setRefreshKey(k => k + 1);
    useState(() => { load(); }, [refreshKey]);

    const filtered = filter === 'all' ? records
        : records.filter(r => r.uploaded_by_role === filter);

    // Mini health trend: last 6 sugar readings
    const sugarTrend = records
        .filter(r => r.sugar_level && !isNaN(parseInt(r.sugar_level)))
        .slice(0, 6).reverse();
    const maxSugar = Math.max(...sugarTrend.map(r => parseInt(r.sugar_level)), 200);

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
            <div className="glass-card rounded-2xl p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div>
                        <h3 className="text-white font-bold text-base flex items-center gap-2">
                            📅 Collaborative Medical Timeline
                            {readOnly && <span className="text-xs text-white/30 font-normal">(View Only)</span>}
                        </h3>
                        <p className="text-white/30 text-xs mt-0.5">
                            All records from all doctors and staff — {records.length} total
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={load} className="text-white/30 hover:text-white/60 text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                            🔄 Refresh
                        </button>
                        {['all', 'doctor', 'staff'].map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`text-xs px-3 py-1.5 rounded-xl transition-all capitalize font-medium ${filter === f
                                    ? f === 'doctor' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                        : f === 'staff' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                            : 'bg-white/15 text-white border border-white/20'
                                    : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'}`}>
                                {f === 'all' ? `All (${records.length})` : f === 'doctor' ? `🩺 Doctor (${records.filter(r => r.uploaded_by_role === 'doctor' || r.uploaded_by_role === 'admin').length})` : `👩‍⚕️ Staff (${records.filter(r => r.uploaded_by_role === 'staff').length})`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Health Trend Mini Chart */}
                {sugarTrend.length > 1 && (
                    <div className="mb-5 bg-white/5 rounded-xl p-4 border border-white/5">
                        <p className="text-white/40 text-xs mb-3 font-semibold uppercase tracking-wide">🩸 Sugar Level Trend</p>
                        <div className="flex items-end gap-1.5 h-16">
                            {sugarTrend.map((r, i) => {
                                const val = parseInt(r.sugar_level);
                                const pct = (val / maxSugar) * 100;
                                const col = val > 200 ? 'bg-red-500' : val > 140 ? 'bg-yellow-400' : 'bg-emerald-500';
                                return (
                                    <div key={r.id} className="flex flex-col items-center gap-1 flex-1">
                                        <span className="text-white/30 text-xs">{val}</span>
                                        <div className={`w-full rounded-t-md ${col} opacity-80 transition-all`} style={{ height: `${pct}%`, minHeight: '4px' }} />
                                        <span className="text-white/20 text-xs truncate w-full text-center">
                                            {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Timeline */}
                {loading ? (
                    <div className="text-white/30 text-sm text-center py-8">Loading records...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="text-4xl mb-3">🗂️</div>
                        <p className="text-white/30 text-sm">No {filter !== 'all' ? filter + ' ' : ''}records found for this patient.</p>
                        <p className="text-white/20 text-xs mt-1">Records uploaded by doctors and staff will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((r, i) => {
                            const isDoc = r.uploaded_by_role === 'doctor' || r.uploaded_by_role === 'admin';
                            return (
                                <div key={r.id} className={`relative pl-5 ${i < filtered.length - 1 ? 'pb-4 border-l' : ''} ${isDoc ? 'border-blue-500/20' : 'border-emerald-500/20'}`}>
                                    {/* Dot */}
                                    <div className={`absolute left-0 top-2 w-3 h-3 rounded-full -translate-x-1.5 border-2 ${isDoc ? 'bg-blue-500 border-blue-400' : 'bg-emerald-500 border-emerald-400'}`} />

                                    <div className={`rounded-2xl p-4 border ${isDoc ? 'bg-blue-500/5 border-blue-500/15' : 'bg-emerald-500/5 border-emerald-500/15'}`}>
                                        {/* Row 1: Role badge + uploader + date */}
                                        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${isDoc ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                                    {isDoc ? '🩺 Doctor' : '👩‍⚕️ Staff'}
                                                </span>
                                                {r.uploader_name && (
                                                    <span className="text-white/50 text-xs font-medium">{r.uploader_name}</span>
                                                )}
                                                {r.file_category && (
                                                    <span className="text-white/20 text-xs px-2 py-0.5 bg-white/5 rounded-full border border-white/5">{r.file_category}</span>
                                                )}
                                            </div>
                                            <span className="text-white/25 text-xs">
                                                {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        {/* Vitals */}
                                        {(r.sugar_level || r.blood_pressure) && (
                                            <div className="flex items-center gap-4 mb-3 bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                                                {r.sugar_level && (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-white/30 text-xs">🩸 Sugar</span>
                                                        <span className={`text-xs font-bold ${sugarColor(r.sugar_level)}`}>{r.sugar_level} mg/dL</span>
                                                    </div>
                                                )}
                                                {r.blood_pressure && (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-white/30 text-xs">💓 BP</span>
                                                        <span className={`text-xs font-bold ${bpColor(r.blood_pressure)}`}>{r.blood_pressure} mmHg</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Diagnosis */}
                                        {r.diagnosis && (
                                            <div className="mb-2">
                                                <p className="text-blue-400/60 text-xs mb-0.5">📋 Diagnosis</p>
                                                <p className="text-white text-sm">{r.diagnosis}</p>
                                            </div>
                                        )}

                                        {/* Suggestion */}
                                        {r.suggestion && (
                                            <div className="mb-2">
                                                <p className="text-indigo-400/60 text-xs mb-0.5">💡 Suggestion</p>
                                                <p className="text-white/80 text-sm">{r.suggestion}</p>
                                            </div>
                                        )}

                                        {/* File download */}
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

// ── UMAVS Doctor Medical Record ──────────────────────────
function DoctorMedicalRecord({ patient }) {
    const CATS = ['Lab Report', 'Prescription', 'Radiology', 'Emergency'];
    const [form, setForm] = useState({ sugar_level: '', blood_pressure: '', diagnosis: '', suggestion: '', file_category: 'Prescription' });
    const [file, setFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [savedCount, setSavedCount] = useState(0);

    const save = async () => {
        if (!form.sugar_level && !form.blood_pressure && !form.diagnosis && !file)
            return toast.error('Enter at least one field or attach a file');
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('patient_id', patient.id);
            fd.append('patient_source', patient.source);
            fd.append('sugar_level', form.sugar_level || '');
            fd.append('blood_pressure', form.blood_pressure || '');
            fd.append('diagnosis', form.diagnosis || '');
            fd.append('suggestion', form.suggestion || '');
            fd.append('file_category', form.file_category);
            if (file) fd.append('file', file);
            await api.post('/medical-records/upload-record', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('✅ Record saved — patient can now view this in their timeline');
            setForm({ sugar_level: '', blood_pressure: '', diagnosis: '', suggestion: '', file_category: 'Prescription' });
            setFile(null);
            setSavedCount(c => c + 1);
        } catch (err) { toast.error(err.response?.data?.detail || 'Save failed'); }
        finally { setSaving(false); }
    };

    return (
        <div className="glass-card rounded-2xl p-5 flex flex-col gap-4 md:col-span-2 border border-indigo-500/20 bg-indigo-500/5">
            <div className="flex items-center justify-between">
                <h3 className="text-white font-bold flex items-center gap-2">
                    📋 <span>Save Full Medical Record</span>
                    <span className="text-xs font-normal text-indigo-300/40 ml-1">(appears in Patient Timeline)</span>
                </h3>
                {savedCount > 0 && <span className="text-indigo-300/60 text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">✅ {savedCount} saved</span>}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-white/40 text-xs mb-1.5 block">🩸 Sugar Level</label>
                    <div className="relative">
                        <input className="glass-input text-sm pr-14" placeholder="e.g. 110"
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

            <div>
                <label className="text-white/40 text-xs mb-1.5 block">📋 Diagnosis</label>
                <textarea value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })}
                    className="glass-input resize-none h-20 text-sm w-full" placeholder="Clinical diagnosis, observations..." />
            </div>

            <div>
                <label className="text-white/40 text-xs mb-1.5 block">💡 Suggestion / Treatment Plan</label>
                <textarea value={form.suggestion} onChange={e => setForm({ ...form, suggestion: e.target.value })}
                    className="glass-input resize-none h-16 text-sm w-full" placeholder="Prescriptions, lifestyle advice, follow-up..." />
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                    <label className="text-white/40 text-xs mb-1.5 block">📁 File Category</label>
                    <select className="glass-input text-sm" value={form.file_category}
                        onChange={e => setForm({ ...form, file_category: e.target.value })}>
                        {CATS.map(c => <option key={c}>{c}</option>)}
                    </select>
                </div>
                <label className="border-2 border-dashed border-white/10 rounded-xl p-3 text-center cursor-pointer hover:border-indigo-500/40 transition-all">
                    <input type="file" className="hidden" onChange={e => setFile(e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png" />
                    {file ? <p className="text-white text-xs">📎 {file.name}</p> : <p className="text-white/30 text-xs">📎 Attach prescription/report</p>}
                </label>
            </div>

            <button onClick={save} disabled={saving}
                className="py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? '⏳ Saving...' : '💾 Save to Patient Timeline'}
            </button>
        </div>
    );
}

// ── Main Doctor Dashboard ─────────────────────────────────
export default function DoctorDashboard() {
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [patient, setPatient] = useState(null);
    const [searching, setSearching] = useState(false);
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const searchPatient = async () => {
        if (query.length !== 12 || !/^\d{12}$/.test(query))
            return toast.error('Must be a 12-digit ABHA ID or Aadhaar number');
        setSearching(true);
        try {
            // Unified search: checks registered_patients + patient_master
            const res = await api.get(`/patient-records/search?query=${query}`);
            setPatient(res.data);
            toast.success(`Patient found: ${res.data.name}`);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Patient not found in any record');
            setPatient(null);
        } finally { setSearching(false); }
    };

    const isMaster = patient?.source === 'master';
    const isRegistered = patient?.source === 'registered';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
            <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />

            <Header doctor={user} today={today} />

            {/* Search */}
            <div className="mx-8 mt-6">
                <div className="glass-card rounded-2xl p-6">
                    <h2 className="text-white font-bold text-lg mb-1 flex items-center gap-2">🔎 Patient Search</h2>
                    <p className="text-white/30 text-xs mb-4">
                        Searches both <span className="text-cyan-400/60">Doctor-managed records</span> and <span className="text-emerald-400/60">Patient Portal registrations</span>
                    </p>
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <input value={query}
                                onChange={e => setQuery(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                onKeyDown={e => e.key === 'Enter' && searchPatient()}
                                className="glass-input pr-16"
                                placeholder="Enter 12-digit ABHA ID or Aadhaar number" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 text-xs">{query.length}/12</span>
                        </div>
                        <button onClick={searchPatient} disabled={searching}
                            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50">
                            {searching ? '⏳' : '🔍 Fetch Patient'}
                        </button>
                    </div>
                    <p className="text-white/15 text-xs mt-2">Demo ABHA ID: 123456789000 (doctor-managed) · any registered patient ABHA</p>
                </div>
            </div>

            {/* Patient found */}
            {patient && (
                <>
                    {isMaster && patient.risk_level === 'High' && <EmergencyBanner patientName={patient.name} />}
                    <PatientCard patient={patient} />

                    <div className="mx-8 mt-6 mb-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* ── UMAVS Unified Record (all patients, all fields for doctor) */}
                        <DoctorMedicalRecord patient={patient} />

                        {/* ── Diagnosis Report (always shown) */}
                        <DiagnosisSection patient={patient} />

                        {/* ── Extended sections only for doctor-managed patients */}
                        {isMaster && (
                            <>
                                <SuggestionSection patientId={patient.id} />
                                <PrescriptionSection patientId={patient.id} />
                                <ReportSection patientId={patient.id} />
                            </>
                        )}

                        {/* ── Portal patient — RBAC notice */}
                        {isRegistered && (
                            <div className="glass-card rounded-2xl p-5 flex flex-col items-center justify-center gap-3 border-dashed border-white/10">
                                <div className="text-3xl">🔒</div>
                                <p className="text-white font-semibold text-sm text-center">Suggestions & Prescriptions</p>
                                <p className="text-white/30 text-xs text-center">These modules are available for patients in the hospital management system. Diagnosis reports are available above for all patients.</p>
                            </div>
                        )}
                    </div>

                    {/* ── CMMS Collaborative Timeline (full width, below grid) ── */}
                    <CollaborativeTimeline patient={patient} />
                </>
            )}

            {!patient && (
                <div className="mx-8 mt-6 glass-card rounded-2xl p-12 text-center">
                    <div className="text-5xl mb-4">🩺</div>
                    <h3 className="text-white font-bold text-xl mb-2">Doctor Portal Ready</h3>
                    <p className="text-white/30 mb-6">Search any patient by ABHA ID or Aadhaar — from hospital records or patient portal.</p>
                    <div className="inline-flex flex-col gap-2 text-left text-xs bg-white/5 rounded-2xl p-5 border border-white/5">
                        <p className="text-white/40 font-semibold uppercase tracking-wide mb-1">What you can do</p>
                        {[
                            ['🔍', 'Search patient portal registrations by ABHA / Aadhaar'],
                            ['🩺', 'Add diagnosis report with sugar level & blood pressure'],
                            ['📝', 'Write clinical suggestions (hospital patients)'],
                            ['💊', 'Prescribe medicines (hospital patients)'],
                            ['📄', 'Upload & manage medical reports'],
                        ].map(([i, t]) => (
                            <div key={t} className="flex items-center gap-2">
                                <span>{i}</span><span className="text-white/40">{t}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
