import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import DrAIButton from '../components/DrAIButton';

const API = axios.create({ baseURL: 'http://localhost:8000' });

const TIPS = [
    'Drink at least 8 glasses of water daily.',
    'Walk 30 minutes every day to keep your heart healthy.',
    'Sleep 7–8 hours every night for optimal recovery.',
    'Eat fruits and vegetables — aim for 5 servings daily.',
    'Monitor your blood pressure regularly if you are above 40.',
    'Avoid processed food — cook at home more often.',
    'Regular check-ups can catch diseases early.',
];

// ── Helper Colors ─────────────────────────────────────────
const bpColor = bp => {
    if (!bp) return 'text-white/60';
    const sys = parseInt(bp.split('/')[0]);
    if (sys > 140) return 'text-red-400';
    if (sys > 120) return 'text-yellow-400';
    return 'text-emerald-400';
};
const sugarColor = s => {
    if (!s) return 'text-white/60';
    const val = parseInt(s);
    if (val > 200) return 'text-red-400';
    if (val > 140) return 'text-yellow-400';
    return 'text-emerald-400';
};

// ── Module 5: Medication Reminder & Adherence ─────────────
function MedicationReminder({ patientId, token }) {
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editTime, setEditTime] = useState({}); // { [id]: "HH:MM" }
    const [alerted, setAlerted] = useState({}); // prevent repeat alerts

    const load = () => {
        API.get(`/meds/reminders/registered/${patientId}`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => { setReminders(res.data); setLoading(false); })
            .catch(() => setLoading(false));
    };

    // ── Alarm engine: check every 30s ─────────────────────
    useEffect(() => {
        load();
        const interval = setInterval(() => {
            const now = new Date();
            const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            setReminders(prev => {
                prev.forEach(r => {
                    if (r.reminder_time && r.reminder_time === hhmm && !alerted[r.id]) {
                        // Toast alarm
                        toast(`⏰ Time to take ${r.medicine_name}!`, {
                            icon: '💊',
                            duration: 10000,
                            style: { background: '#5b21b6', color: '#fff', fontWeight: 'bold' }
                        });
                        // Browser notification
                        if (Notification.permission === 'granted') {
                            new Notification(`💊 VitaSage AI Reminder`, {
                                body: `Time to take ${r.medicine_name}`,
                                icon: '/favicon.ico',
                            });
                        } else if (Notification.permission !== 'denied') {
                            Notification.requestPermission().then(p => {
                                if (p === 'granted') new Notification(`💊 VitaSage AI`, { body: `Time to take ${r.medicine_name}` });
                            });
                        }
                        setAlerted(a => ({ ...a, [r.id]: hhmm }));
                    }
                });
                return prev;
            });
        }, 30000);
        return () => clearInterval(interval);
    }, [patientId, token]);

    const updateTime = async (id) => {
        const t = editTime[id];
        if (!t) return;
        try {
            await API.put(`/meds/reminder/${id}/time`, { reminder_time: t }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Alarm time updated 🔔');
            load();
        } catch { toast.error('Could not update time'); }
    };

    const markTaken = async (r) => {
        try {
            const res = await API.post(`/meds/taken/${r.id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(res.data.message, { icon: '✅', duration: 5000 });
            if (res.data.remaining_stock === 0) {
                toast.error('🚨 Out of Stock! Consult your doctor or pharmacy.', { duration: 8000 });
            } else if (res.data.remaining_stock <= 2) {
                toast(`⚠️ Low Stock: Only ${res.data.remaining_stock} tablet(s) left — refill soon!`, {
                    icon: '⚠️', duration: 8000, style: { background: '#92400e', color: '#fff' }
                });
            }
            load();
        } catch { toast.error('Could not mark as taken'); }
    };

    const stockColor = (rem, total) => {
        if (!total) return 'bg-white/20';
        const pct = rem / total;
        if (pct <= 0) return 'bg-red-500';
        if (pct <= 0.25) return 'bg-orange-500';
        if (pct <= 0.5) return 'bg-yellow-400';
        return 'bg-emerald-500';
    };

    if (loading) return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 md:col-span-2">
            <div className="text-white/30 text-sm text-center">Loading reminders...</div>
        </div>
    );

    return (
        <div className="backdrop-blur-xl bg-white/10 border border-indigo-500/20 rounded-3xl p-6 md:col-span-2">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                    ⏰ Medication Reminders & Stock
                    <span className="text-xs font-normal text-indigo-300/60 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">Smart Alarm</span>
                </h3>
                <span className="text-white/30 text-xs">{reminders.length} medicine{reminders.length !== 1 ? 's' : ''}</span>
            </div>

            {reminders.length === 0 ? (
                <div className="text-center py-8">
                    <div className="text-4xl mb-3">⏰</div>
                    <p className="text-white/30 text-sm">No reminders set.</p>
                    <p className="text-white/20 text-xs mt-1">Reminders are created by your doctor from your prescriptions.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reminders.map(r => {
                        const stockPct = r.total_stock ? Math.max(0, (r.remaining_stock / r.total_stock) * 100) : 0;
                        const isOut = r.remaining_stock === 0;
                        const isLow = r.remaining_stock > 0 && r.remaining_stock <= 2;
                        const takenToday = r.today_status === 'taken';
                        const totalDoses = (r.taken_count || 0) + (r.missed_count || 0);
                        const adherencePct = totalDoses > 0 ? Math.round((r.taken_count / totalDoses) * 100) : 0;

                        return (
                            <div key={r.id} className={`rounded-2xl p-4 border ${isOut ? 'bg-red-500/8 border-red-500/20' : isLow ? 'bg-orange-500/8 border-orange-500/20' : 'bg-indigo-500/5 border-indigo-500/15'}`}>
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <p className="text-white font-bold text-sm">{r.medicine_name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {takenToday
                                                ? <span className="text-xs text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/20">✅ Taken Today</span>
                                                : <span className="text-xs text-indigo-300/60 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/15">⏳ Pending Today</span>
                                            }
                                            {isOut && <span className="text-xs text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full border border-red-500/20">🚨 Out of Stock</span>}
                                            {isLow && <span className="text-xs text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded-full border border-orange-500/20">⚠️ Low Stock</span>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white/20 text-xs">Adherence</p>
                                        <p className={`text-sm font-black ${adherencePct >= 80 ? 'text-emerald-400' : adherencePct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {totalDoses > 0 ? `${adherencePct}%` : '—'}
                                        </p>
                                    </div>
                                </div>

                                {/* Stock progress bar */}
                                <div className="mb-3">
                                    <div className="flex justify-between text-xs text-white/30 mb-1">
                                        <span>Stock</span>
                                        <span>{r.remaining_stock} / {r.total_stock} tablets</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-500 ${stockColor(r.remaining_stock, r.total_stock)}`}
                                            style={{ width: `${stockPct}%` }} />
                                    </div>
                                </div>

                                {/* Alarm time setter */}
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-white/40 text-xs">🔔 Alarm</span>
                                    <input
                                        type="time"
                                        defaultValue={r.reminder_time || ''}
                                        onChange={e => setEditTime(t => ({ ...t, [r.id]: e.target.value }))}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-indigo-500/50"
                                    />
                                    <button onClick={() => updateTime(r.id)}
                                        className="px-3 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all">
                                        Set
                                    </button>
                                </div>

                                {/* Taken button */}
                                <button onClick={() => markTaken(r)} disabled={takenToday || isOut}
                                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${takenToday ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-default' :
                                        isOut ? 'bg-white/5 border border-white/10 text-white/20 cursor-not-allowed' :
                                            'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20'
                                        }`}>
                                    {takenToday ? '✅ Already Taken Today' : isOut ? '🚨 Out of Stock' : '✅ Mark as Taken'}
                                </button>

                                {/* Tiny stats */}
                                <div className="flex gap-3 mt-2 justify-center">
                                    <span className="text-white/20 text-xs">✅ {r.taken_count || 0} taken</span>
                                    <span className="text-white/20 text-xs">❌ {r.missed_count || 0} missed</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Advanced Prescription View (Module 4A) ───────────────
function AdvancedPrescriptionView({ patientId, token }) {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null); // open rx id

    useEffect(() => {
        API.get(`/rx/patient/registered/${patientId}`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => { setPrescriptions(res.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [patientId, token]);

    const printRx = (rx) => {
        const win = window.open('', '_blank');
        const meds = Array.isArray(rx.medicines) ? rx.medicines : [];
        win.document.write(`
            <html><head><title>Prescription ${rx.rx_number}</title>
            <style>
                body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:auto}
                h1{color:#1a1a2e;font-size:22px;border-bottom:2px solid #0d9488;padding-bottom:10px}
                .badge{background:#7c3aed;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold}
                table{width:100%;border-collapse:collapse;margin-top:16px}
                th{background:#f0f9ff;padding:8px;text-align:left;font-size:12px;color:#475569}
                td{padding:8px;border-bottom:1px solid #e2e8f0;font-size:13px}
                .section{margin-top:18px}
                .label{font-size:11px;color:#64748b;font-weight:bold;text-transform:uppercase}
                .sig{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:16px;font-size:12px;color:#64748b}
                @media print { .no-print{display:none} }
            </style></head><body>
            <h1>🏥 VitaSage AI — Prescription</h1>
            <p><span class='badge'>${rx.rx_number || 'N/A'}</span>
               &nbsp;<strong>Doctor:</strong> ${rx.digital_signature || rx.doctor_name || 'Doctor'}
               &nbsp;<strong>Date:</strong> ${new Date(rx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <div class='section'><p class='label'>Diagnosis</p><p>${rx.diagnosis}</p></div>
            <table>
                <tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr>
                ${meds.map(m => `<tr><td><b>${m.medicine_name}</b></td><td>${m.dosage}</td><td>${m.frequency}</td><td>${m.duration}</td><td>${m.instructions || '—'}</td></tr>`).join('')}
            </table>
            ${rx.advice ? `<div class='section'><p class='label'>Advice</p><p>${rx.advice}</p></div>` : ''}
            ${rx.follow_up_date ? `<div class='section'><p class='label'>Follow-up</p><p>${rx.follow_up_date}</p></div>` : ''}
            <div class='sig'>Digitally signed · ${rx.digital_signature || ''} · VitaSage AI EMR System</div>
            <script>window.onload=()=>window.print()<\/script>
            </body></html>`);
        win.document.close();
    };

    if (loading) return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 md:col-span-2">
            <div className="text-white/30 text-sm text-center">Loading prescriptions...</div>
        </div>
    );

    return (
        <div className="backdrop-blur-xl bg-white/10 border border-purple-500/20 rounded-3xl p-6 md:col-span-2">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                    💊 My Prescriptions
                    <span className="text-xs font-normal text-purple-300/60 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">View Only</span>
                </h3>
                <span className="text-white/30 text-xs">{prescriptions.length} prescription{prescriptions.length !== 1 ? 's' : ''}</span>
            </div>

            {prescriptions.length === 0 ? (
                <div className="text-center py-10">
                    <div className="text-4xl mb-3">💊</div>
                    <p className="text-white/30 text-sm">No prescriptions yet.</p>
                    <p className="text-white/20 text-xs mt-1">Prescriptions written by your doctor will appear here.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {prescriptions.map((rx) => {
                        const meds = Array.isArray(rx.medicines) ? rx.medicines : [];
                        const isOpen = expanded === rx.id;
                        return (
                            <div key={rx.id} className="bg-purple-500/5 border border-purple-500/15 rounded-2xl overflow-hidden">
                                {/* Collapsed header — click to expand */}
                                <button onClick={() => setExpanded(isOpen ? null : rx.id)}
                                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-purple-500/10 transition-all">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                                            {rx.rx_number || 'RX'}
                                        </span>
                                        <div className="text-left">
                                            <p className="text-white text-sm font-semibold">{rx.diagnosis}</p>
                                            <p className="text-white/30 text-xs">
                                                {rx.digital_signature || rx.doctor_name} · {new Date(rx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-white/30 text-xs">{meds.length} medicine{meds.length !== 1 ? 's' : ''}</span>
                                        <span className="text-white/30 text-sm">{isOpen ? '▲' : '▼'}</span>
                                    </div>
                                </button>

                                {/* Expanded detail */}
                                {isOpen && (
                                    <div className="px-5 pb-5 border-t border-purple-500/10">
                                        {/* Doctor badge */}
                                        <div className="flex items-center gap-2 mt-4 mb-4">
                                            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20 font-semibold">
                                                🩺 {rx.digital_signature || rx.doctor_name}
                                            </span>
                                            <span className="text-white/20 text-xs">
                                                {new Date(rx.created_at).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                            </span>
                                        </div>

                                        {/* Diagnosis */}
                                        <div className="mb-4 bg-white/5 rounded-xl px-4 py-3">
                                            <p className="text-purple-300/60 text-xs mb-0.5">📋 Diagnosis</p>
                                            <p className="text-white text-sm font-medium">{rx.diagnosis}</p>
                                        </div>

                                        {/* Medicines */}
                                        <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-2">💊 Medicines Prescribed</p>
                                        <div className="space-y-2 mb-4">
                                            {meds.map((m, idx) => (
                                                <div key={idx} className="bg-white/5 rounded-xl px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-1">
                                                    <div className="col-span-2 flex items-center gap-2 mb-1">
                                                        <span className="w-5 h-5 rounded-full bg-purple-500/30 text-purple-300 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                                                        <span className="text-white font-semibold text-sm">{m.medicine_name}</span>
                                                    </div>
                                                    <div><p className="text-white/30 text-xs">Dosage</p><p className="text-white/80 text-xs font-medium">{m.dosage}</p></div>
                                                    <div><p className="text-white/30 text-xs">Frequency</p><p className="text-white/80 text-xs font-medium">{m.frequency}</p></div>
                                                    <div><p className="text-white/30 text-xs">Duration</p><p className="text-white/80 text-xs font-medium">{m.duration}</p></div>
                                                    {m.instructions && <div><p className="text-white/30 text-xs">Instructions</p><p className="text-emerald-400/80 text-xs font-medium">{m.instructions}</p></div>}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Advice */}
                                        {rx.advice && (
                                            <div className="mb-3 bg-amber-500/10 border border-amber-500/15 rounded-xl px-4 py-3">
                                                <p className="text-amber-400/60 text-xs mb-0.5">🗒️ Doctor's Advice</p>
                                                <p className="text-white/80 text-sm">{rx.advice}</p>
                                            </div>
                                        )}

                                        {/* Follow-up */}
                                        {rx.follow_up_date && (
                                            <div className="mb-4 bg-teal-500/10 border border-teal-500/15 rounded-xl px-4 py-2.5 flex items-center gap-2">
                                                <span className="text-teal-400">📅</span>
                                                <div>
                                                    <p className="text-teal-400/60 text-xs">Follow-up Date</p>
                                                    <p className="text-white text-sm font-semibold">{rx.follow_up_date}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Download PDF */}
                                        <button onClick={() => printRx(rx)}
                                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2">
                                            📄 Download / Print Prescription PDF
                                        </button>

                                        {/* Lock notice */}
                                        <p className="text-center text-white/15 text-xs mt-2">🔒 Immutable · Digitally signed · Cannot be modified</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Medical History Timeline ──────────────────────────────
function MedicalTimeline({ patientId, token }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        API.get(`/medical-records/patient-records/registered/${patientId}`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => { setRecords(res.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [patientId, token]);

    const downloadFile = (id, fname) => {
        const url = `http://localhost:8000/medical-records/download/${id}`;
        const a = document.createElement('a');
        a.href = url; a.download = fname; a.click();
        toast.success(`Downloading ${fname}`);
    };

    if (loading) return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6">
            <div className="text-white/30 text-sm text-center">Loading medical history...</div>
        </div>
    );

    return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 md:col-span-2">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                    📅 Medical History Timeline
                </h3>
                <span className="text-white/30 text-xs">{records.length} records</span>
            </div>

            {records.length === 0 ? (
                <div className="text-center py-10">
                    <div className="text-4xl mb-3">🩺</div>
                    <p className="text-white/30 text-sm">No medical records yet.</p>
                    <p className="text-white/20 text-xs mt-1">Your doctor or nurse will upload records here after your visit.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {records.map((r, i) => (
                        <div key={r.id} className={`relative pl-6 ${i < records.length - 1 ? 'pb-4 border-l border-white/10' : ''}`}>
                            {/* Timeline dot */}
                            <div className={`absolute left-0 top-1.5 w-3 h-3 rounded-full -translate-x-1.5 border-2 ${r.uploaded_by_role === 'doctor' ? 'bg-blue-500 border-blue-400' : 'bg-emerald-500 border-emerald-400'}`} />

                            <div className={`rounded-2xl p-4 border ${r.uploaded_by_role === 'doctor' ? 'bg-blue-500/5 border-blue-500/15' : 'bg-emerald-500/5 border-emerald-500/15'}`}>
                                {/* Header row */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.uploaded_by_role === 'doctor' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                            {r.uploaded_by_role === 'doctor' ? '🩺 Doctor' : '👩‍⚕️ Staff'}
                                        </span>
                                        {r.uploader_name && (
                                            <span className="text-white/30 text-xs">{r.uploader_name}</span>
                                        )}
                                        {r.file_category && (
                                            <span className="text-white/20 text-xs px-2 py-0.5 bg-white/5 rounded-full">{r.file_category}</span>
                                        )}
                                    </div>
                                    <span className="text-white/25 text-xs">
                                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>

                                {/* Vitals row */}
                                {(r.sugar_level || r.blood_pressure) && (
                                    <div className="flex items-center gap-4 mb-3 bg-white/5 rounded-xl px-3 py-2">
                                        {r.sugar_level && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-white/40 text-xs">🩸 Sugar</span>
                                                <span className={`text-xs font-bold ${sugarColor(r.sugar_level)}`}>{r.sugar_level} mg/dL</span>
                                            </div>
                                        )}
                                        {r.blood_pressure && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-white/40 text-xs">💓 BP</span>
                                                <span className={`text-xs font-bold ${bpColor(r.blood_pressure)}`}>{r.blood_pressure}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Diagnosis + Suggestion (doctor only) */}
                                {r.diagnosis && (
                                    <div className="mb-2">
                                        <p className="text-blue-400/60 text-xs mb-0.5">Diagnosis</p>
                                        <p className="text-white text-sm">{r.diagnosis}</p>
                                    </div>
                                )}
                                {r.suggestion && (
                                    <div className="mb-2">
                                        <p className="text-indigo-400/60 text-xs mb-0.5">Doctor's Suggestion</p>
                                        <p className="text-white/80 text-sm">{r.suggestion}</p>
                                    </div>
                                )}

                                {/* File download */}
                                {r.file_name && (
                                    <button onClick={() => downloadFile(r.id, r.file_name)}
                                        className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group">
                                        <span>{r.file_name.endsWith('.pdf') ? '📄' : '🖼️'}</span>
                                        <span className="text-white/60 group-hover:text-white text-xs transition-colors truncate max-w-[180px]">{r.file_name}</span>
                                        <span className="text-white/20 group-hover:text-white/50 text-xs ml-auto transition-colors">⬇ Download</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

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
            <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">📋 Medical Information</h3>
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

// ── ABHA Card ────────────────────────────────────────────
function AbhaCard({ patient }) {
    return (
        <div className="backdrop-blur-xl bg-white/10 border border-blue-500/20 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">🆔 ABHA Digital Health Card</h3>
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
    const [token, setToken] = useState(null);
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    useEffect(() => {
        const t = localStorage.getItem('pt_token');
        const user = JSON.parse(localStorage.getItem('pt_user') || 'null');
        if (!t || !user) { navigate('/patient-login'); return; }
        setPatient(user);
        setToken(t);

        API.get(`/patient/profile/${user.id}`, {
            headers: { Authorization: `Bearer ${t}` }
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
                        <p className="text-emerald-400/50 text-xs">Patient Dashboard · VitaSage AI</p>
                    </div>
                </div>
                <p className="text-white/30 text-xs hidden md:block">{today}</p>
                <button onClick={logout}
                    className="px-4 py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-sm transition-all">
                    Logout
                </button>
            </header>

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

                {/* Profile + Medical info */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ProfileCard patient={displayData} />
                    <MedicalCard patient={displayData} />
                    <AbhaCard patient={displayData} />
                    <QuickLinks />

                    {/* ── UMAVS Medical History Timeline ─ */}
                    {token && <MedicalTimeline patientId={patient.id} token={token} />}

                    {/* ── Module 5: Medication Reminders ─ */}
                    {token && <MedicationReminder patientId={patient.id} token={token} />}

                    {/* ── Module 4A: Advanced Prescriptions ─ */}
                    {token && <AdvancedPrescriptionView patientId={patient.id} token={token} />}
                </div>

                <p className="text-center text-white/15 text-xs mt-10">
                    VitaSage AI Patient Portal · Records encrypted · ABHA-linked · NHA Compliant
                </p>
            </div>

            {/* ── Dr AI Floating Button ─ */}
            <DrAIButton />
        </div>
    );
}
