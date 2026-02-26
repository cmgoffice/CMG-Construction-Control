import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthRBACRouter';
import { FileCheck, CheckCircle2, X, Eye, Check, AlertCircle, XCircle, Clock, ChevronRight, ShieldAlert, Trash2 } from 'lucide-react';
import { db } from './firebase';
import { collection, onSnapshot, query, doc, updateDoc, where, deleteDoc } from 'firebase/firestore';
import { AlertModal, useAlert } from './AlertModal';

// --- Daily Report View Modal (Review Report style: C1/C2/C3/Attachments) ---
const DailyReportViewModal = ({ report, onClose }: { report: any; onClose: () => void }) => {
    if (!report) return null;
    const statusColor = report.status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200'
        : report.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200'
        : 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Review Report: {report.swo_no || report.swo || '-'}</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{report.date} | By {report.supervisor_name || report.supervisor || '-'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColor}`}>{report.status}</span>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="p-5 flex-1 overflow-y-auto space-y-5">
                    {/* Reject reason */}
                    {report.reject_reason && (
                        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-3 text-sm text-red-700">
                            <span className="font-bold">Reject Reason:</span> {report.reject_reason}
                        </div>
                    )}

                    {/* C1: Work Activities */}
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 font-semibold text-gray-800 text-sm">
                            Work Activities (C1)
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-600">
                                <thead className="bg-white text-gray-500 italic border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-2 font-medium">Description</th>
                                        <th className="px-4 py-2 font-medium">Qty Required</th>
                                        <th className="px-4 py-2 font-medium">Prev Total</th>
                                        <th className="px-4 py-2 font-medium text-blue-600 bg-blue-50/30">Today's Progress</th>
                                        <th className="px-4 py-2 font-medium text-right">Up to Date</th>
                                        <th className="px-4 py-2 font-medium text-right">% Complete</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(report.activities || []).map((a: any, i: number) => {
                                        const upToDate = (a.prev_total || 0) + (a.today || 0);
                                        const percent = a.total > 0 ? ((upToDate / a.total) * 100).toFixed(1) : '0.0';
                                        return (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-800">{a.desc || a.description || a.name || '-'}</td>
                                                <td className="px-4 py-3">{a.total ?? '-'} {a.unit}</td>
                                                <td className="px-4 py-3 text-gray-500">{a.prev_total || 0} {a.unit}</td>
                                                <td className="px-4 py-3 bg-blue-50/10">
                                                    <span className="w-20 inline-block text-right font-bold text-blue-700">{a.today || 0}</span>
                                                    <span className="text-xs text-gray-500 ml-1">{a.unit}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-gray-800">{upToDate} {a.unit}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${parseFloat(percent) >= 100 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                        {percent}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {!(report.activities || []).length && (
                                        <tr><td colSpan={6} className="px-4 py-4 text-center text-gray-400 italic">No activities recorded</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* C2: Equipment Usage */}
                    <div className="rounded-xl border border-orange-100 overflow-hidden">
                        <div className="px-4 py-3 bg-orange-50 border-b border-orange-100 font-semibold text-orange-800 text-sm">
                            Equipment Usage (C2)
                        </div>
                        <div className="p-4 grid gap-3">
                            {(report.equipments || []).map((e: any, i: number) => (
                                <div key={i} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                                    <div className="w-full md:w-1/4 font-medium text-gray-800">{e.name || e.equipment_id || '-'}</div>
                                    <span className="px-2 py-1 bg-white border border-gray-200 rounded text-gray-700 text-xs font-semibold">{e.status || 'Working'}</span>
                                    <div className="flex-1 text-gray-600">{e.work_detail || <span className="italic text-gray-400">No detail</span>}</div>
                                    <div className="text-gray-700 font-semibold">{e.hours || 0} <span className="text-xs font-normal text-gray-500">hrs</span></div>
                                </div>
                            ))}
                            {!(report.equipments || []).length && (
                                <p className="text-center text-gray-400 italic text-sm py-2">No equipment recorded</p>
                            )}
                        </div>
                    </div>

                    {/* C3: Worker Headcount */}
                    <div className="rounded-xl border border-indigo-100 overflow-hidden">
                        <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 font-semibold text-indigo-800 text-sm">
                            Worker Headcount (C3)
                        </div>
                        <div className="p-4 grid gap-3">
                            {(report.workers || []).map((w: any, i: number) => (
                                <div key={i} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                                    <div className="w-full md:w-1/3 font-medium text-gray-800">{w.name || w.team_id || '-'}</div>
                                    <div className="flex gap-6">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 mb-0.5">Total</p>
                                            <p className="font-bold text-gray-800">{w.actual_headcount || 0}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-blue-500 mb-0.5">Male</p>
                                            <p className="font-bold text-blue-700">{w.male || 0}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-pink-500 mb-0.5">Female</p>
                                            <p className="font-bold text-pink-700">{w.female || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {!(report.workers || []).length && (
                                <p className="text-center text-gray-400 italic text-sm py-2">No workers recorded</p>
                            )}
                        </div>
                    </div>

                    {/* Supervisor Notes */}
                    {(report.notes || report.remark) && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                            <p className="text-xs font-semibold text-yellow-700 mb-1 uppercase tracking-wide">Supervisor Notes</p>
                            <p className="text-sm text-yellow-900 whitespace-pre-wrap">{report.notes || report.remark}</p>
                        </div>
                    )}

                    {/* Site Photos & Attachments */}
                    {(report.attachments || []).length > 0 && (
                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 font-semibold text-gray-800 text-sm flex items-center gap-2">
                                📎 Site Photos & Attachments
                                <span className="ml-1 bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{report.attachments.length}</span>
                            </div>
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(report.attachments as any[]).map((att: any, i: number) => {
                                    const url = typeof att === 'string' ? att : att.url;
                                    const name = typeof att === 'string' ? `File ${i + 1}` : (att.name || `File ${i + 1}`);
                                    const isImage = typeof att === 'object' ? att.type?.startsWith('image/') : /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                                    return isImage ? (
                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-400 transition-colors group">
                                            <img src={url} alt={name} className="w-full h-40 object-cover group-hover:opacity-90 transition-opacity" />
                                            <p className="px-3 py-1.5 text-xs text-gray-500 truncate bg-white">{name}</p>
                                        </a>
                                    ) : (
                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                                            <span className="text-2xl">📄</span>
                                            <span className="text-sm text-indigo-700 font-medium truncate hover:underline">{name}</span>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <button onClick={onClose} className="px-5 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium text-sm">Close</button>
                </div>
            </div>
        </div>
    );
};

// --- Propose Detail Site Work Completed Modal ---
const ProposeDetailModal = ({ isOpen, onClose, swoData, onPmAccept, onPmReject, onCdAccept, onCdReject, onMdAccept, onMdReject }: any) => {
    const { user } = useAuth();
    const [pmNote, setPmNote] = useState('');
    const [pmQuality, setPmQuality] = useState('');
    const [pmOnTime, setPmOnTime] = useState<'Yes' | 'No' | null>(null);
    const [pmDelay, setPmDelay] = useState('');
    const [cdNote, setCdNote] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [rejectTarget, setRejectTarget] = useState<'PM' | 'CD' | 'MD' | null>(null);
    const [reports, setReports] = useState<any[]>([]);
    const [viewingReport, setViewingReport] = useState<any | null>(null);

    useEffect(() => {
        if (swoData) {
            setPmNote(swoData.pm_closure_note || '');
            setPmQuality(swoData.quality_score || '');
            setPmOnTime(swoData.on_time || null);
            setPmDelay(swoData.delay_reason || '');
            setCdNote(swoData.cd_closure_note || '');
            setRejectReason('');
            setShowRejectInput(false);
            setRejectTarget(null);
        }
    }, [swoData]);

    useEffect(() => {
        if (isOpen && swoData?.id) {
            const q = query(collection(db, "daily_reports"), where("swo_id", "==", swoData.id));
            const unsub = onSnapshot(q, (snapshot) => {
                const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));
                fetched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setReports(fetched);
            });
            return unsub;
        }
    }, [isOpen, swoData?.id]);

    if (!isOpen || !swoData) return null;

    const status = swoData.status;
    const isPmEditable = user?.role === 'PM' && status === 'PM Review';
    const isCdEditable = user?.role === 'CD' && status === 'CD Review';
    const isMdEditable = user?.role === 'MD' && status === 'MD Review';
    const isViewOnly = status === 'Closed SWO' || (!isPmEditable && !isCdEditable && !isMdEditable);

    let actualFinishDate = 'ยังไม่มีรายงาน';
    let delayDays = 0;
    if (reports.length > 0) {
        actualFinishDate = reports[0].date;
        if (swoData.planFinish && actualFinishDate !== 'ยังไม่มีรายงาน') {
            const diffTime = new Date(actualFinishDate).getTime() - new Date(swoData.planFinish).getTime();
            delayDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }
    }

    const handleRejectClick = (target: 'PM' | 'CD' | 'MD') => {
        setRejectTarget(target);
        setShowRejectInput(true);
    };

    const handleConfirmReject = () => {
        if (!rejectTarget) return;
        if (rejectTarget === 'PM') onPmReject(rejectReason);
        if (rejectTarget === 'CD') onCdReject(cdNote, rejectReason);
        if (rejectTarget === 'MD') onMdReject(rejectReason);
        setShowRejectInput(false);
        setRejectReason('');
    };

    // Flow status indicator
    const flowSteps = ['PM Review', 'CD Review', 'MD Review', 'Closed SWO'];
    const currentStepIdx = flowSteps.indexOf(status);

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            {viewingReport && <DailyReportViewModal report={viewingReport} onClose={() => setViewingReport(null)} />}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-6 py-4 flex justify-between items-center text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileCheck className="w-6 h-6" /> Propose Detail Site Work Completed
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
                </div>

                {/* Flow progress bar */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center gap-2 text-sm overflow-x-auto">
                    {flowSteps.map((step, i) => (
                        <React.Fragment key={step}>
                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold whitespace-nowrap
                                ${step === status ? 'bg-blue-600 text-white' :
                                  i < currentStepIdx ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {i < currentStepIdx ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                {step}
                            </span>
                            {i < flowSteps.length - 1 && <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                        </React.Fragment>
                    ))}
                </div>

                {/* Reject reason banners */}
                {swoData.cd_reject_reason && (status === 'PM Review') && (
                    <div className="mx-6 mt-4 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-red-700 text-sm">CD Rejected — เหตุผล:</p>
                            <p className="text-red-600 text-sm mt-0.5">{swoData.cd_reject_reason}</p>
                        </div>
                    </div>
                )}
                {swoData.md_reject_reason && (status === 'PM Review') && (
                    <div className="mx-6 mt-4 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-red-700 text-sm">MD Rejected — เหตุผล:</p>
                            <p className="text-red-600 text-sm mt-0.5">{swoData.md_reject_reason}</p>
                        </div>
                    </div>
                )}

                <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/50">
                    {/* Summary Table */}
                    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm bg-white">
                        <table className="w-full text-sm text-center text-nowrap">
                            <thead className="text-gray-900 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold bg-[#E2EFD9] border-r border-gray-200 text-[#385623]">Project No.</th>
                                    <th className="px-4 py-3 font-semibold bg-[#FCE4D6] border-r border-gray-200 text-[#C65911]">SWO No.</th>
                                    <th className="px-4 py-3 font-semibold bg-[#FCE4D6] border-r border-gray-200 text-[#C65911]">Work Name</th>
                                    <th className="px-4 py-3 font-semibold bg-[#FCE4D6] border-r border-gray-200 text-[#C65911]">Supervisor</th>
                                    <th className="px-4 py-3 font-semibold bg-gray-50 border-r border-gray-200 text-gray-700">C1 Progress</th>
                                    <th className="px-4 py-3 font-semibold bg-[#DDEBF7] border-r border-gray-200 text-[#2F5496]">Plan Finish</th>
                                    <th className="px-4 py-3 font-semibold bg-[#DDEBF7] border-r border-gray-200 text-[#2F5496]">Actual Finish</th>
                                    <th className="px-4 py-3 font-semibold bg-[#FFF2CC] text-[#BF8F00]">Delay Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-white">
                                    <td className="px-4 py-3 border-r border-gray-200 font-medium text-[#385623]">{swoData.projectNo}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 font-semibold text-[#C65911]">{swoData.swoNo}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 text-left text-gray-800">{swoData.scope}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 text-gray-700">{swoData.supervisor}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 text-gray-700">{swoData.c1Prog}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 text-[#2F5496]">{swoData.planFinish}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 text-[#2F5496] font-medium">{actualFinishDate}</td>
                                    <td className="px-4 py-3 font-bold">
                                        <span className={`px-2 py-1 rounded text-xs ${delayDays === 0 ? 'bg-[#E2EFD9] text-[#385623]' : 'bg-[#FCE4D6] text-[#C00000]'}`}>
                                            {delayDays === 0 ? 'อยู่ในระยะเวลา' : `เกินกำหนด ${delayDays} วัน`}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* PM Section */}
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                            <h3 className="text-base font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">PM</span>
                                PM Evaluation
                            </h3>
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-gray-700">PM Note/Comment</label>
                                <textarea rows={3} className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${!isPmEditable ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-white border-gray-300'}`}
                                    placeholder={!isPmEditable ? "No comment from PM" : "Enter PM notes..."}
                                    value={pmNote} onChange={(e) => setPmNote(e.target.value)} readOnly={!isPmEditable} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-gray-700">Quality of Work (%)</label>
                                    <div className="relative">
                                        <input type="number" min="0" max="100"
                                            className={`w-full border rounded-lg p-2.5 pr-7 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${!isPmEditable ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-white border-gray-300'}`}
                                            placeholder="0-100" value={pmQuality} onChange={(e) => setPmQuality(e.target.value)} readOnly={!isPmEditable} />
                                        <span className="absolute right-2.5 top-2.5 text-gray-400 text-xs">%</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-gray-700">Schedule on time</label>
                                    <div className="flex gap-3 mt-1.5">
                                        {(['Yes', 'No'] as const).map(v => (
                                            <label key={v} className={`flex items-center gap-1.5 cursor-pointer ${!isPmEditable ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                                <input type="radio" name="onTime" className="w-3.5 h-3.5 text-blue-600"
                                                    checked={pmOnTime === v} onChange={() => setPmOnTime(v)} disabled={!isPmEditable} />
                                                <span className="text-sm">{v}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {pmOnTime === 'No' && (
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-gray-700">Delay Reason</label>
                                    <input type="text" className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${!isPmEditable ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-white border-gray-300'}`}
                                        placeholder="Explain delay..." value={pmDelay} onChange={(e) => setPmDelay(e.target.value)} readOnly={!isPmEditable} />
                                </div>
                            )}
                        </div>

                        {/* CD + MD Section + Past Reports */}
                        <div className="space-y-4 flex flex-col">
                            {/* CD Note — visible when CD Review or beyond */}
                            {(status === 'CD Review' || status === 'MD Review' || status === 'Closed SWO' || isCdEditable) && (
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="text-base font-bold text-gray-900 border-b pb-2 mb-3 flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">CD</span>
                                        CD Review Section
                                    </h3>
                                    <textarea rows={3} className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${!isCdEditable ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-white border-gray-300'}`}
                                        placeholder={!isCdEditable ? "No comment from CD" : "Enter CD notes..."}
                                        value={cdNote} onChange={(e) => setCdNote(e.target.value)} readOnly={!isCdEditable} />
                                </div>
                            )}

                            {/* Past Daily Reports */}
                            {reports.length > 0 && (
                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col">
                                    <h3 className="text-base font-bold text-gray-900 border-b pb-2 mb-3 flex items-center justify-between">
                                        <span>Past Daily Reports</span>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{reports.length} Reports</span>
                                    </h3>
                                    <div className="overflow-y-auto max-h-[260px] space-y-2 pr-1">
                                        {reports.map((r) => (
                                            <div key={r.id} className="p-3 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center hover:bg-gray-100 transition-colors">
                                                <div>
                                                    <p className="font-semibold text-sm text-gray-800">{r.date}</p>
                                                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${r.status === 'Approved' ? 'bg-green-100 text-green-700' : r.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                        {r.status}
                                                    </span>
                                                </div>
                                                <button onClick={() => setViewingReport(r)} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded px-2.5 py-1 transition-colors">
                                                    <Eye className="w-3.5 h-3.5" /> View
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Reject reason input */}
                    {showRejectInput && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
                            <h4 className="font-bold text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> ระบุเหตุผลการ Reject</h4>
                            <textarea rows={3} className="w-full border border-red-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-400 outline-none bg-white"
                                placeholder="กรุณาระบุเหตุผล..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => { setShowRejectInput(false); setRejectReason(''); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                                <button onClick={handleConfirmReject} disabled={!rejectReason.trim()} className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                    <XCircle className="w-4 h-4" /> Confirm Reject
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-gray-200 bg-white flex flex-wrap justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Close</button>

                    {isPmEditable && !showRejectInput && (
                        <>
                            <button onClick={() => handleRejectClick('PM')} className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-bold flex items-center gap-2">
                                <XCircle className="w-4 h-4" /> Reject
                            </button>
                            <button onClick={() => onPmAccept(pmNote, pmQuality, pmOnTime, pmDelay)} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm flex items-center gap-2">
                                <Check className="w-4 h-4" /> Accept → CD
                            </button>
                        </>
                    )}

                    {isCdEditable && !showRejectInput && (
                        <>
                            <button onClick={() => handleRejectClick('CD')} className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-bold flex items-center gap-2">
                                <XCircle className="w-4 h-4" /> Reject → PM
                            </button>
                            <button onClick={() => onCdAccept(cdNote)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-sm flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4" /> Accept → MD
                            </button>
                        </>
                    )}

                    {isMdEditable && !showRejectInput && (
                        <>
                            <button onClick={() => handleRejectClick('MD')} className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-bold flex items-center gap-2">
                                <XCircle className="w-4 h-4" /> Reject → PM
                            </button>
                            <button onClick={() => onMdAccept()} className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-sm flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> Accept & Close SWO
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Close SWO ---
export const SWOCloseWorkflow = () => {
    const { user } = useAuth();
    const { showAlert, modalProps } = useAlert();
    const [swos, setSwos] = useState<any[]>([]);
    const [supervisorDocId, setSupervisorDocId] = useState<string | null>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedSwoForModal, setSelectedSwoForModal] = useState<any | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Supervisor Request Modal
    const [isReqModalOpen, setIsReqModalOpen] = useState(false);
    const [selectedSwoToRequest, setSelectedSwoToRequest] = useState<string | null>(null);

    // Admin delete confirm
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleteTargetNo, setDeleteTargetNo] = useState<string>('');

    // Resolve supervisor Firestore doc ID by email
    useEffect(() => {
        if (user?.role !== 'Supervisor') return;
        const unsub = onSnapshot(query(collection(db, "project_supervisors")), (snap) => {
            const found = snap.docs.find(d => d.data().email === user.email);
            setSupervisorDocId(found ? found.id : null);
        });
        return unsub;
    }, [user]);

    // Fetch projects for projectNo lookup
    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, "projects")), snap => {
            setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return unsub;
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, "site_work_orders")), (snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));

            const visible = fetched.filter((swo: any) => {
                if (!user) return false;
                // PM sees only SWOs that have been submitted for closure (not Active/null)
                if (user.role === 'PM') {
                    const cs = swo.closure_status;
                    return cs === 'PM Review' || cs === 'CD Review' || cs === 'MD Review' || cs === 'Closed SWO';
                }
                if (user.role === 'Admin' || user.role === 'MD' || user.role === 'GM' || user.role === 'CD') {
                    const cs = swo.closure_status;
                    return cs === 'PM Review' || cs === 'CD Review' || cs === 'MD Review' || cs === 'Closed SWO';
                }
                if (user.role === 'Supervisor') {
                    if (supervisorDocId) return swo.supervisor_id === supervisorDocId;
                    return swo.supervisor_name === user.name;
                }
                return user.assigned_projects?.includes(swo.project_id);
            });

            // Exclude drafts
            const nonDraft = visible.filter((swo: any) => swo.status !== 'Draft');

            // Sort by closure urgency
            const order: Record<string, number> = { 'PM Review': 1, 'CD Review': 2, 'MD Review': 3, 'Closed SWO': 4 };
            nonDraft.sort((a: any, b: any) =>
                (order[a.closure_status] || 99) - (order[b.closure_status] || 99)
            );

            setSwos(nonDraft);
        });
        return unsub;
    }, [user, supervisorDocId]);

    // --- Notify helpers: write closure_status then showAlert ---
    const notifyAndClose = (msg: string) => {
        setIsDetailModalOpen(false);
        showAlert('success', 'อัปเดตสำเร็จ', msg);
    };

    // PM Accept → CD Review
    const handlePmAccept = async (note: string, quality: string, onTime: string | null, delay: string) => {
        if (!selectedSwoForModal) return;
        try {
            await updateDoc(doc(db, "site_work_orders", selectedSwoForModal.id), {
                closure_status: 'CD Review',
                pm_closure_note: note,
                quality_score: quality,
                on_time: onTime,
                delay_reason: delay,
                cd_reject_reason: null,
                md_reject_reason: null,
            });
            notifyAndClose('ส่งต่อให้ CD เรียบร้อยแล้ว');
        } catch (e) { console.error(e); }
    };

    // PM Reject → closure_status = null (hidden from PM)
    const handlePmReject = async (reason: string) => {
        if (!selectedSwoForModal) return;
        try {
            await updateDoc(doc(db, "site_work_orders", selectedSwoForModal.id), {
                closure_status: null,
                pm_reject_reason: reason,
            });
            notifyAndClose('Reject แล้ว — SWO กลับไปยัง Supervisor');
        } catch (e) { console.error(e); }
    };

    // CD Accept → MD Review
    const handleCdAccept = async (note: string) => {
        if (!selectedSwoForModal) return;
        try {
            await updateDoc(doc(db, "site_work_orders", selectedSwoForModal.id), {
                closure_status: 'MD Review',
                cd_closure_note: note,
                md_reject_reason: null,
            });
            notifyAndClose('ส่งต่อให้ MD เรียบร้อยแล้ว');
        } catch (e) { console.error(e); }
    };

    // CD Reject → PM Review + reason
    const handleCdReject = async (note: string, reason: string) => {
        if (!selectedSwoForModal) return;
        try {
            await updateDoc(doc(db, "site_work_orders", selectedSwoForModal.id), {
                closure_status: 'PM Review',
                cd_closure_note: note,
                cd_reject_reason: reason,
            });
            notifyAndClose('Reject แล้ว — ส่งกลับ PM');
        } catch (e) { console.error(e); }
    };

    // MD Accept → Closed SWO
    const handleMdAccept = async () => {
        if (!selectedSwoForModal) return;
        try {
            await updateDoc(doc(db, "site_work_orders", selectedSwoForModal.id), {
                closure_status: 'Closed SWO',
            });
            notifyAndClose('SWO ปิดเรียบร้อยแล้ว');
        } catch (e) { console.error(e); }
    };

    // MD Reject → PM Review + reason
    const handleMdReject = async (reason: string) => {
        if (!selectedSwoForModal) return;
        try {
            await updateDoc(doc(db, "site_work_orders", selectedSwoForModal.id), {
                closure_status: 'PM Review',
                md_reject_reason: reason,
            });
            notifyAndClose('Reject แล้ว — ส่งกลับ PM');
        } catch (e) { console.error(e); }
    };

    // Supervisor: submit closure request
    const handleSupervisorSubmitRequest = async () => {
        if (!selectedSwoToRequest) return;
        try {
            await updateDoc(doc(db, "site_work_orders", selectedSwoToRequest), {
                closure_status: 'PM Review',
                pm_reject_reason: null,
                cd_reject_reason: null,
                md_reject_reason: null,
            });
            setIsReqModalOpen(false);
            setSelectedSwoToRequest(null);
            showAlert('success', 'ส่งคำขอสำเร็จ', 'ส่งคำขอปิด SWO ไปยัง PM เรียบร้อยแล้ว');
        } catch (e) { console.error(e); }
    };

    // Admin: delete SWO record
    const handleAdminDelete = async () => {
        if (!deleteTargetId) return;
        try {
            await deleteDoc(doc(db, "site_work_orders", deleteTargetId));
            setDeleteTargetId(null);
            showAlert('success', 'ลบแล้ว', `ลบ SWO ${deleteTargetNo} เรียบร้อยแล้ว`);
        } catch (e: any) {
            showAlert('error', 'ลบไม่สำเร็จ', e.message);
        }
    };

    // Supervisor: cancel closure request
    const handleCancelRequest = async (swoId: string) => {
        try {
            await updateDoc(doc(db, "site_work_orders", swoId), { closure_status: null });
            showAlert('info', 'ยกเลิกแล้ว', 'ยกเลิกคำขอปิด SWO เรียบร้อยแล้ว');
        } catch (e) { console.error(e); }
    };

    const openDetailModal = (swo: any) => {
        const proj = projects.find(p => p.id === swo.project_id);
        const projectNo = proj ? (proj.no || proj.id) : swo.project_id;
        setSelectedSwoForModal({
            id: swo.id,
            projectNo,
            swoNo: swo.swo_no,
            scope: swo.work_name,
            supervisor: swo.supervisor_name || swo.supervisor_id,
            c1Prog: swo.c1_prog || '-',
            planFinish: swo.finish_date || '-',
            status: swo.closure_status || 'Active',
            pm_closure_note: swo.pm_closure_note,
            quality_score: swo.quality_score,
            on_time: swo.on_time,
            delay_reason: swo.delay_reason,
            cd_closure_note: swo.cd_closure_note,
            cd_reject_reason: swo.cd_reject_reason,
            md_reject_reason: swo.md_reject_reason,
        });
        setIsDetailModalOpen(true);
    };

    // SWOs Supervisor can request to close (Active, not already in closure flow)
    const requestableSwos = swos.filter(s => !s.closure_status);

    const getStatusBadge = (status: string) => {
        if (status === 'PM Review') return 'bg-blue-100 text-blue-700';
        if (status === 'CD Review') return 'bg-indigo-100 text-indigo-700';
        if (status === 'MD Review') return 'bg-purple-100 text-purple-700';
        if (status === 'Closed SWO') return 'bg-green-100 text-green-700';
        return 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <AlertModal {...modalProps} />
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50/50">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <FileCheck className="w-6 h-6 mr-2 text-blue-600" />
                        Close Site Work Order
                    </h2>
                    <p className="text-gray-500 mt-1 text-sm">Finalize SWO and propose detail site work completed.</p>
                </div>
                {user?.role === 'Supervisor' && (
                    <button
                        onClick={() => setIsReqModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
                    >
                        <CheckCircle2 className="w-5 h-5" /> Request Closure
                    </button>
                )}
            </div>

            <div className="p-0">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold">SWO No.</th>
                            <th className="px-6 py-4 font-semibold">Work Name</th>
                            <th className="px-6 py-4 font-semibold">Closure Status</th>
                            <th className="px-6 py-4 font-semibold text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {swos.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No Site Work Orders found.</td>
                            </tr>
                        ) : swos.map(swo => {
                            const cs = swo.closure_status || 'Active';
                            const isClosed = cs === 'Closed SWO';
                            const canCancel = user?.role === 'Supervisor' && cs === 'PM Review';
                            return (
                                <tr
                                    key={swo.id}
                                    onClick={() => openDetailModal(swo)}
                                    className={`cursor-pointer hover:bg-blue-50/60 transition-colors ${isClosed ? 'bg-green-50/30' : ''}`}
                                >
                                    <td className="px-6 py-4 font-medium text-gray-900">{swo.swo_no}</td>
                                    <td className="px-6 py-4 text-gray-600">{swo.work_name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadge(cs)}`}>{cs}</span>
                                        {swo.cd_reject_reason && cs === 'PM Review' && (
                                            <span className="ml-2 text-xs text-red-600 font-medium">CD Rejected</span>
                                        )}
                                        {swo.md_reject_reason && cs === 'PM Review' && (
                                            <span className="ml-2 text-xs text-red-600 font-medium">MD Rejected</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                            {canCancel && (
                                                <button
                                                    onClick={() => handleCancelRequest(swo.id)}
                                                    className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded hover:bg-red-100 font-medium text-xs transition-colors flex items-center gap-1"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" /> Cancel Request
                                                </button>
                                            )}
                                            <button
                                                onClick={() => openDetailModal(swo)}
                                                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium text-xs transition-colors flex items-center gap-1"
                                            >
                                                <Eye className="w-3.5 h-3.5" /> View Details
                                            </button>
                                            {user?.role === 'Admin' && (
                                                <button
                                                    onClick={() => { setDeleteTargetId(swo.id); setDeleteTargetNo(swo.swo_no || swo.id); }}
                                                    className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 font-medium text-xs transition-colors flex items-center gap-1"
                                                    title="ลบ SWO นี้"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> ลบ
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Admin Delete Confirm Modal */}
            {deleteTargetId && (
                <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex items-center gap-3">
                            <Trash2 className="w-5 h-5 text-red-600" />
                            <h3 className="font-bold text-red-800 text-base">ยืนยันการลบ</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 text-sm">คุณต้องการลบ <span className="font-bold text-gray-900">{deleteTargetNo}</span> ออกจากระบบใช่หรือไม่?</p>
                            <p className="text-red-600 text-xs mt-2">⚠️ การลบนี้ไม่สามารถเรียกคืนได้</p>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setDeleteTargetId(null)} className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg text-sm">ยกเลิก</button>
                            <button onClick={handleAdminDelete} className="px-5 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 text-sm flex items-center gap-2">
                                <Trash2 className="w-4 h-4" /> ยืนยันลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Supervisor Request Closure Modal */}
            {isReqModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900 text-lg">Select SWO to Request Closure</h3>
                            <button onClick={() => setIsReqModalOpen(false)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {requestableSwos.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No active SWOs available to close.</p>
                            ) : (
                                <div className="space-y-3">
                                    {requestableSwos.map(swo => (
                                        <label key={swo.id} className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${selectedSwoToRequest === swo.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                            <input type="radio" name="swo_request" className="mt-1 w-4 h-4 text-blue-600"
                                                checked={selectedSwoToRequest === swo.id}
                                                onChange={() => setSelectedSwoToRequest(swo.id)} />
                                            <div>
                                                <p className="font-bold text-gray-900">{swo.swo_no}</p>
                                                <p className="text-sm text-gray-600 mt-0.5">{swo.work_name}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setIsReqModalOpen(false)} className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg text-sm">Cancel</button>
                            <button onClick={handleSupervisorSubmitRequest} disabled={!selectedSwoToRequest}
                                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                                Confirm Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ProposeDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                swoData={selectedSwoForModal}
                onPmAccept={handlePmAccept}
                onPmReject={handlePmReject}
                onCdAccept={handleCdAccept}
                onCdReject={handleCdReject}
                onMdAccept={handleMdAccept}
                onMdReject={handleMdReject}
            />
        </div>
    );
};
