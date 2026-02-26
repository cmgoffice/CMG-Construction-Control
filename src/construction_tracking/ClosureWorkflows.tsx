import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthRBACRouter';
import { Lock, FileCheck, CheckCircle2, ShieldAlert, X, Eye, FileText, Check, AlertCircle } from 'lucide-react';
import { db } from './firebase';
import { collection, onSnapshot, query, doc, updateDoc, where } from 'firebase/firestore';

// --- Part F: Propose Detail Site Work Completed Modal ---
const ProposeDetailModal = ({ isOpen, onClose, swoData, onPmSubmit, onCdSubmit, onGmSubmit, onMdSubmit }: any) => {
    const { user } = useAuth();
    const [pmNote, setPmNote] = useState('');
    const [pmQuality, setPmQuality] = useState('');
    const [pmOnTime, setPmOnTime] = useState<'Yes' | 'No' | null>(null);
    const [pmDelay, setPmDelay] = useState('');
    const [cdNote, setCdNote] = useState('');
    const [reports, setReports] = useState<any[]>([]);

    useEffect(() => {
        if (swoData) {
            setPmNote(swoData.pm_closure_note || '');
            setPmQuality(swoData.quality_score || '');
            setPmOnTime(swoData.on_time || null);
            setPmDelay(swoData.delay_reason || '');
            setCdNote(swoData.cd_closure_note || '');
        }
    }, [swoData]);

    useEffect(() => {
        if (isOpen && swoData?.id) {
            const q = query(collection(db, "daily_reports"), where("swo_id", "==", swoData.id));
            const unsub = onSnapshot(q, (snapshot) => {
                const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
                fetched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setReports(fetched);
            });
            return unsub;
        }
    }, [isOpen, swoData?.id]);

    if (!isOpen || !swoData) return null;

    let actualFinishDate = 'ยังไม่มีรายงาน';
    let delayDays = '0';
    let delayStatusText = 'อยู่ในระยะเวลาที่กำหนด';

    if (reports.length > 0) {
        actualFinishDate = reports[0].date;
        if (swoData.planFinish && actualFinishDate) {
            const plan = new Date(swoData.planFinish);
            const actual = new Date(actualFinishDate);
            const diffTime = actual.getTime() - plan.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays > 0) {
                delayDays = diffDays.toString();
                delayStatusText = `เกินกำหนด ${diffDays} วัน`;
            }
        }
    }

    const isPmReadonly = user?.role !== 'PM' && swoData.status !== 'PM Review';
    const isCdReadonly = user?.role !== 'CD' && swoData.status !== 'CD Review';

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-6 py-4 flex justify-between items-center text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileCheck className="w-6 h-6" /> Propose Detail Site Work Completed
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-8 flex-1 bg-gray-50/50">
                    {/* Data Table */}
                    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm bg-white">
                        <table className="w-full text-sm text-center text-nowrap">
                            <thead className="text-gray-900 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3.5 font-semibold bg-[#E2EFD9] border-r border-gray-200 text-[#385623]">Project No.</th>
                                    <th className="px-4 py-3.5 font-semibold bg-[#FCE4D6] border-r border-gray-200 text-[#C65911]">SWO no.</th>
                                    <th className="px-4 py-3.5 font-semibold bg-[#FCE4D6] border-r border-gray-200 text-[#C65911]">Work Name/Scope</th>
                                    <th className="px-4 py-3.5 font-semibold bg-[#FCE4D6] border-r border-gray-200 text-[#C65911]">Supervisor Name</th>
                                    <th className="px-4 py-3.5 font-semibold bg-gray-50 border-r border-gray-200 text-gray-700">Work Activities<br /><span className="text-xs font-normal">(Progress %)</span></th>
                                    <th className="px-4 py-3.5 font-semibold bg-gray-50 border-r border-gray-200 text-gray-700">Equipment<br /><span className="text-xs font-normal">(Usage)</span></th>
                                    <th className="px-4 py-3.5 font-semibold bg-gray-50 border-r border-gray-200 text-gray-700">Worker<br /><span className="text-xs font-normal">(Headcount)</span></th>
                                    <th className="px-4 py-3.5 font-semibold bg-[#DDEBF7] border-r border-gray-200 text-[#2F5496]">Plan Finish Date</th>
                                    <th className="px-4 py-3.5 font-semibold bg-[#DDEBF7] border-r border-gray-200 text-[#2F5496]">Actual Finish Date</th>
                                    <th className="px-4 py-3.5 font-semibold bg-[#FFF2CC] text-[#BF8F00]">Actual-Finish<br /><span className="text-xs font-normal">Status</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-white hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-4 border-r border-gray-200 font-medium text-[#385623]">{swoData.projectNo}</td>
                                    <td className="px-4 py-4 border-r border-gray-200 font-semibold text-[#C65911]">{swoData.swoNo}</td>
                                    <td className="px-4 py-4 border-r border-gray-200 text-left text-gray-800">{swoData.scope}</td>
                                    <td className="px-4 py-4 border-r border-gray-200 text-gray-700">{swoData.supervisor}</td>
                                    <td className="px-4 py-4 border-r border-gray-200 text-gray-700">{swoData.c1Prog}</td>
                                    <td className="px-4 py-4 border-r border-gray-200 text-gray-700">{swoData.c2Usage}</td>
                                    <td className="px-4 py-4 border-r border-gray-200 text-gray-700">{swoData.c3Workers}</td>
                                    <td className="px-4 py-4 border-r border-gray-200 text-[#2F5496]">{swoData.planFinish}</td>
                                    <td className="px-4 py-4 border-r border-gray-200 text-[#2F5496] font-medium">{actualFinishDate}</td>
                                    <td className="px-4 py-4 font-bold text-center">
                                        <span className={`px-2 py-1 rounded text-xs ${delayDays === '0' ? 'bg-[#E2EFD9] text-[#385623]' : 'bg-[#FCE4D6] text-[#C00000]'}`}>
                                            {delayStatusText}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column: PM Inputs */}
                        <div className="space-y-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">PM Evaluation Section</h3>
                            
                            {/* Note/Comment */}
                            <div className="space-y-2">
                                <label className="font-semibold text-gray-700 flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> PM Note/Comment:
                                </label>
                                <textarea
                                    rows={4}
                                    className={`w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow ${isPmReadonly ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-white border-gray-300'}`}
                                    placeholder={isPmReadonly ? "No comments from PM" : "Enter PM notes here..."}
                                    value={pmNote}
                                    onChange={(e) => setPmNote(e.target.value)}
                                    readOnly={isPmReadonly}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* Quality of Work */}
                                <div className="space-y-2">
                                    <label className="font-semibold text-gray-700">Quality of Work (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className={`w-full border rounded-lg p-2.5 pr-8 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isPmReadonly ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-white border-gray-300'}`}
                                            placeholder="0-100"
                                            value={pmQuality}
                                            onChange={(e) => setPmQuality(e.target.value)}
                                            readOnly={isPmReadonly}
                                            min="0" max="100"
                                        />
                                        <span className="absolute right-3 top-2.5 text-gray-500 font-medium">%</span>
                                    </div>
                                </div>

                                {/* Schedule on time */}
                                <div className="space-y-2">
                                    <label className="font-semibold text-gray-700">Schedule on time</label>
                                    <div className="flex items-center gap-4 mt-2">
                                        <label className={`flex items-center gap-2 ${isPmReadonly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                                            <input
                                                type="radio"
                                                name="onTime"
                                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                checked={pmOnTime === 'Yes'}
                                                onChange={() => setPmOnTime('Yes')}
                                                disabled={isPmReadonly}
                                            />
                                            <span className="text-sm font-medium">Yes</span>
                                        </label>
                                        <label className={`flex items-center gap-2 ${isPmReadonly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                                            <input
                                                type="radio"
                                                name="onTime"
                                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                checked={pmOnTime === 'No'}
                                                onChange={() => setPmOnTime('No')}
                                                disabled={isPmReadonly}
                                            />
                                            <span className="text-sm font-medium">No</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Delay Reason */}
                            {pmOnTime === 'No' && (
                                <div className="space-y-2 pt-2">
                                    <label className="font-semibold text-gray-700 text-sm">Delay Reason</label>
                                    <input
                                        type="text"
                                        className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${isPmReadonly ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-white border-gray-300'}`}
                                        placeholder="Explain delay..."
                                        value={pmDelay}
                                        onChange={(e) => setPmDelay(e.target.value)}
                                        readOnly={isPmReadonly}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Right Column: CD Review & Past Reports */}
                        <div className="space-y-6 flex flex-col">
                            {/* CD Note */}
                            {(swoData.status === 'CD Review' || swoData.status === 'GM_MD Review' || swoData.status === 'Closed SWO' || user?.role === 'CD') && (
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">CD Review Section</h3>
                                    <label className="font-semibold text-gray-700 flex items-center gap-2 mb-2">
                                        <FileText className="w-4 h-4" /> CD Note:
                                    </label>
                                    <textarea
                                        rows={3}
                                        className={`w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow ${isCdReadonly ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-white border-gray-300'}`}
                                        placeholder={isCdReadonly ? "No comments from CD" : "Enter CD notes here..."}
                                        value={cdNote}
                                        onChange={(e) => setCdNote(e.target.value)}
                                        readOnly={isCdReadonly}
                                    />
                                </div>
                            )}

                            {/* Past Reports List (For CD and above) */}
                            {reports.length > 0 && (user?.role === 'CD' || user?.role === 'MD' || user?.role === 'GM' || user?.role === 'Admin') && (
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col">
                                    <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 flex items-center justify-between">
                                        <span>Past Daily Reports</span>
                                        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{reports.length} Reports</span>
                                    </h3>
                                    <div className="overflow-y-auto max-h-[300px] pr-2 space-y-3">
                                        {reports.map((r, i) => (
                                            <div key={r.id} className="p-3 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center hover:bg-gray-100 transition-colors">
                                                <div>
                                                    <p className="font-semibold text-sm text-gray-800">Date: {r.date}</p>
                                                    <p className="text-xs text-gray-500">Status: {r.status}</p>
                                                </div>
                                                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                                                    <Eye className="w-4 h-4" /> View
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="p-6 border-t border-gray-200 bg-white flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors">
                        Close
                    </button>
                    
                    {user?.role === 'PM' && swoData.status === 'PM Review' && (
                        <button onClick={() => onPmSubmit(pmNote, pmQuality, pmOnTime, pmDelay)} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm transition-colors flex items-center gap-2">
                            <Check className="w-4 h-4" /> Submit to CD
                        </button>
                    )}
                    
                    {user?.role === 'CD' && swoData.status === 'CD Review' && (
                        <>
                            <button onClick={() => onCdSubmit(cdNote, 'Rejected')} className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-bold transition-colors">
                                Reject Request
                            </button>
                            <button onClick={() => onCdSubmit(cdNote, 'Verified')} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-sm transition-colors flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4" /> Verify (Inform MD)
                            </button>
                        </>
                    )}

                    {user?.role === 'GM' && swoData.status === 'GM_MD Review' && (
                        <>
                            <button onClick={() => onGmSubmit('Rejected')} className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-bold transition-colors">
                                Reject
                            </button>
                            <button onClick={() => onGmSubmit('Acknowledged')} className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-sm transition-colors flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> Acknowledge
                            </button>
                        </>
                    )}

                    {user?.role === 'MD' && swoData.status === 'GM_MD Review' && (
                        <>
                            <button onClick={() => onMdSubmit('Rejected')} className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-bold transition-colors">
                                Reject
                            </button>
                            <button onClick={() => onMdSubmit('Locked')} className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-sm transition-colors flex items-center gap-2">
                                <Lock className="w-4 h-4" /> MD Lock
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Part F: Close SWO ---
export const SWOCloseWorkflow = () => {
    const { user } = useAuth();
    const [swos, setSwos] = useState<any[]>([]);
    const [selectedSwoForModal, setSelectedSwoForModal] = useState<any | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    
    // Supervisor Request Modal
    const [isReqModalOpen, setIsReqModalOpen] = useState(false);
    const [selectedSwoToRequest, setSelectedSwoToRequest] = useState<string | null>(null);

    useEffect(() => {
        const q = query(collection(db, "site_work_orders"));
        const unsub = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

            const visibleSwos = fetched.filter((swo: any) => {
                if (!user) return false;
                if (user.role === 'Admin' || user.role === 'MD' || user.role === 'GM' || user.role === 'CD') return true;
                if (user.role === 'Supervisor') return swo.supervisor_id === user.uid;
                return user.assigned_projects?.includes(swo.project_id);
            });

            // Sort so that the ones needing action are at top
            visibleSwos.sort((a, b) => {
                const statusOrder: Record<string, number> = {
                    'PM Review': 1, 'CD Review': 2, 'GM_MD Review': 3, 'Active': 4, 'Closed SWO': 5
                };
                return (statusOrder[a.closure_status || 'Active'] || 99) - (statusOrder[b.closure_status || 'Active'] || 99);
            });

            setSwos(visibleSwos);
        });
        return unsub;
    }, [user]);

    const handleSupervisorSubmitRequest = async () => {
        if (!selectedSwoToRequest) return;
        try {
            await updateDoc(doc(db, "site_work_orders", selectedSwoToRequest), { closure_status: 'PM Review' });
            setIsReqModalOpen(false);
            setSelectedSwoToRequest(null);
            alert('Request sent to PM successfully.');
        } catch (e) { console.error(e); }
    };

    const handlePmSubmit = async (note: string, quality: string, onTime: string | null, delay: string) => {
        if (!selectedSwoForModal) return;
        try {
            await updateDoc(doc(db, "site_work_orders", selectedSwoForModal.id), {
                closure_status: 'CD Review',
                pm_closure_note: note,
                quality_score: quality,
                on_time: onTime,
                delay_reason: delay
            });
            setIsDetailModalOpen(false);
        } catch (e) { console.error(e); }
    };

    const handleCdSubmit = async (note: string, action: 'Verified' | 'Rejected') => {
        if (!selectedSwoForModal) return;
        try {
            await updateDoc(doc(db, "site_work_orders", selectedSwoForModal.id), {
                closure_status: action === 'Verified' ? 'GM_MD Review' : 'PM Review',
                cd_closure_note: note
            });
            setIsDetailModalOpen(false);
        } catch (e) { console.error(e); }
    };

    const handleGmSubmit = async (action: 'Acknowledged' | 'Rejected') => {
        if (!selectedSwoForModal) return;
        try {
            if (action === 'Rejected') {
                await updateDoc(doc(db, "site_work_orders", selectedSwoForModal.id), {
                    closure_status: 'CD Review',
                    gm_status: 'Rejected'
                });
            } else {
                await updateDoc(doc(db, "site_work_orders", selectedSwoForModal.id), {
                    gm_status: 'Acknowledged'
                });
                alert('Acknowledged successfully.');
            }
            setIsDetailModalOpen(false);
        } catch (e) { console.error(e); }
    };

    const handleMdSubmit = async (action: 'Locked' | 'Rejected') => {
        if (!selectedSwoForModal) return;
        try {
            if (action === 'Rejected') {
                await updateDoc(doc(db, "site_work_orders", selectedSwoForModal.id), {
                    closure_status: 'CD Review',
                    md_status: 'Rejected'
                });
            } else {
                await updateDoc(doc(db, "site_work_orders", selectedSwoForModal.id), {
                    closure_status: 'Closed SWO',
                    md_status: 'Locked'
                });
            }
            setIsDetailModalOpen(false);
        } catch (e) { console.error(e); }
    };

    const openDetailModal = (swo: any) => {
        // Mocking some relation data that would typically be joined
        setSelectedSwoForModal({
            id: swo.id,
            projectNo: `PRJ-2026-J-73`, // Formatted as requested
            swoNo: swo.swo_no,
            scope: swo.work_name,
            supervisor: swo.supervisor_id,
            c1Prog: '100%',
            c2Usage: `${(swo.equipmentList || []).length} Eqm`,
            c3Workers: `${(swo.teamList || []).length} Teams`,
            planFinish: swo.finish_date || '2026-02-28',
            status: swo.closure_status || 'Active',
            pm_closure_note: swo.pm_closure_note,
            quality_score: swo.quality_score,
            on_time: swo.on_time,
            delay_reason: swo.delay_reason,
            cd_closure_note: swo.cd_closure_note,
            gm_status: swo.gm_status,
            md_status: swo.md_status
        });
        setIsDetailModalOpen(true);
    };

    const activeSupervisorSwos = swos.filter(s => (s.closure_status || 'Active') === 'Active');

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50/50">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <FileCheck className="w-6 h-6 mr-2 text-blue-600" />
                        Part F: Close Site Work Order
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
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {swos.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No Site Work Orders found.</td>
                            </tr>
                        ) : (
                            swos.map(swo => {
                                const status = swo.closure_status || 'Active';
                                let statusBadge = 'bg-gray-100 text-gray-700';
                                if (status === 'PM Review') statusBadge = 'bg-blue-100 text-blue-700';
                                if (status === 'CD Review') statusBadge = 'bg-indigo-100 text-indigo-700';
                                if (status === 'GM_MD Review') statusBadge = 'bg-purple-100 text-purple-700';
                                if (status === 'Closed SWO') statusBadge = 'bg-green-100 text-green-700';

                                return (
                                    <tr key={swo.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{swo.swo_no}</td>
                                        <td className="px-6 py-4 text-gray-600">{swo.work_name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge}`}>
                                                {status}
                                            </span>
                                            {status === 'GM_MD Review' && swo.gm_status === 'Acknowledged' && (
                                                <span className="ml-2 text-xs text-green-600 font-medium">GM Ack.</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => openDetailModal(swo)}
                                                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium text-xs transition-colors flex items-center gap-1 ml-auto"
                                            >
                                                <Eye className="w-4 h-4" /> View Details
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Supervisor Request Modal */}
            {isReqModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900 text-lg">Select SWO to Close</h3>
                            <button onClick={() => setIsReqModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {activeSupervisorSwos.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No active SWOs available to close.</p>
                            ) : (
                                <div className="space-y-3">
                                    {activeSupervisorSwos.map(swo => (
                                        <label key={swo.id} className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${selectedSwoToRequest === swo.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                            <input 
                                                type="radio" 
                                                name="swo_request" 
                                                className="mt-1 w-4 h-4 text-blue-600"
                                                checked={selectedSwoToRequest === swo.id}
                                                onChange={() => setSelectedSwoToRequest(swo.id)}
                                            />
                                            <div>
                                                <p className="font-bold text-gray-900">{swo.swo_no}</p>
                                                <p className="text-sm text-gray-600 mt-1">{swo.work_name}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setIsReqModalOpen(false)} className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button 
                                onClick={handleSupervisorSubmitRequest}
                                disabled={!selectedSwoToRequest}
                                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
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
                onPmSubmit={handlePmSubmit}
                onCdSubmit={handleCdSubmit}
                onGmSubmit={handleGmSubmit}
                onMdSubmit={handleMdSubmit}
            />
        </div>
    );
};

// --- Part G: Close Project ---
export const ProjectCloseWorkflow = () => {
    const { user } = useAuth();
    const [projectStatus, setProjectStatus] = useState<'ACTIVE' | 'PENDING_CD' | 'LOCKED'>('ACTIVE');
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    React.useEffect(() => {
        const q = query(collection(db, "projects"));
        const unsub = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Filter projects by user assignment
            const visibleProjects = fetched.filter(p => {
                if (!user) return false;
                if (user.role === 'Admin' || user.role === 'MD' || user.role === 'GM' || user.role === 'CD') return true;
                return user.assigned_projects?.includes(p.id);
            });

            setProjects(visibleProjects);
            if (!selectedProjectId && visibleProjects.length > 0) {
                setSelectedProjectId(visibleProjects[0].id);
            }
        });
        return unsub;
    }, [selectedProjectId]);

    const activeProject = projects.find(p => p.id === selectedProjectId);

    React.useEffect(() => {
        if (activeProject?.locked) setProjectStatus('LOCKED');
        else if (activeProject?.pending_cd) setProjectStatus('PENDING_CD');
        else setProjectStatus('ACTIVE');
    }, [activeProject]);

    const triggerUpdate = async (updateData: any) => {
        if (!activeProject) return;
        try {
            await updateDoc(doc(db, "projects", activeProject.id), updateData);
        } catch (e) { console.error(e); }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border-2 border-red-100 overflow-hidden">

            <div className="bg-red-50 p-6 border-b border-red-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-red-900 flex items-center">
                        <ShieldAlert className="w-6 h-6 mr-2 text-red-600" />
                        Part G: Project Closure & Locking
                    </h2>
                    <p className="text-red-700/80 mt-1">Warning: Locking a project disables all edits and daily report submissions.</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    {projects.length > 0 && (
                        <select
                            className="bg-white border border-red-200 rounded p-1.5 text-sm font-medium outline-none text-red-900"
                            value={selectedProjectId || ''}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                        >
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.no} - {p.name}</option>
                            ))}
                        </select>
                    )}
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide border ${projectStatus === 'LOCKED' ? 'bg-red-600 text-white border-red-700' : 'bg-white text-red-600 border-red-200'
                        }`}>
                        {projectStatus}
                    </span>
                </div>
            </div>

            <div className="p-6">
                {projectStatus === 'LOCKED' ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-lg border border-gray-200">
                        <Lock className="w-16 h-16 text-gray-400 mb-4" />
                        <h3 className="text-xl font-bold text-gray-800">Project is Permanently Locked</h3>
                        <p className="text-gray-500 mt-2 max-w-md">No further modifications or daily reports can be submitted for this project. Only the Managing Director can re-open it.</p>

                        {(user?.role === 'MD' || user?.role === 'Admin') && (
                            <button onClick={() => triggerUpdate({ locked: false, pending_cd: false })} className="mt-6 px-6 py-2 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50">
                                MD Override: Re-Open Project
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">

                        {/* Step 1: PM Proposal */}
                        <div className="flex items-start gap-4 p-4 rounded-lg border border-blue-100 bg-blue-50/30">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0">1</div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900">PM Proposes Closure</h4>
                                <p className="text-sm text-gray-600 mb-3">Project Manager signs off that all SWOs are completed and hands over to CD.</p>
                                {(user?.role === 'PM' || user?.role === 'Admin') && projectStatus === 'ACTIVE' && (
                                    <button onClick={() => triggerUpdate({ pending_cd: true })} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700">
                                        Propose Closure to CD
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Step 2: CD Review */}
                        <div className={`flex items-start gap-4 p-4 rounded-lg border ${projectStatus === 'PENDING_CD' ? 'border-yellow-200 bg-yellow-50/50' : 'border-gray-100 bg-gray-50/50 opacity-50'}`}>
                            <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 font-bold flex items-center justify-center shrink-0">2</div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900">CD Verifies</h4>
                                <p className="text-sm text-gray-600 mb-3">Construction Director verifies physical handover and documentation.</p>
                                {(user?.role === 'CD' || user?.role === 'GM' || user?.role === 'Admin') && projectStatus === 'PENDING_CD' && (
                                    <div className="flex gap-3">
                                        <button onClick={() => alert('CD has verified. Awaiting MD Lock.')} className="px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded hover:bg-yellow-600">
                                            Verify (Inform MD)
                                        </button>
                                        <button onClick={() => triggerUpdate({ pending_cd: false })} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50">
                                            Reject (Return to PM)
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Step 3: MD Final Lock */}
                        <div className={`flex items-start gap-4 p-4 rounded-lg border ${projectStatus === 'PENDING_CD' ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-gray-50/50 opacity-50'}`}>
                            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold flex items-center justify-center shrink-0">3</div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900">MD Final Approval (LOCK)</h4>
                                <p className="text-sm text-gray-600 mb-3">Managing Director final signature. This action writes `status: 'LOCKED'` to the Database.</p>
                                {(user?.role === 'MD' || user?.role === 'Admin') && (
                                    <button onClick={() => triggerUpdate({ locked: true, pending_cd: false })} className="px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 flex items-center shadow-sm">
                                        <Lock className="w-4 h-4 mr-2" /> Approve & Lock Project
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};
