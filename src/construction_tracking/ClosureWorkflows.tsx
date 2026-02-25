import React, { useState } from 'react';
import { useAuth } from './AuthRBACRouter';
import { Lock, FileCheck, CheckCircle2, AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { db } from './firebase';
import { collection, onSnapshot, query, doc, updateDoc } from 'firebase/firestore';

// --- Part F: Propose Detail Site Work Completed Modal ---
const ProposeDetailModal = ({ isOpen, onClose, swoData, onCmSubmit, onPmSubmit }: any) => {
    const { user } = useAuth();
    const [cmNote, setCmNote] = useState(swoData?.cm_closure_note || '');
    const [cmQuality, setCmQuality] = useState(swoData?.quality_score || '');
    const [cmOnTime, setCmOnTime] = useState<'Yes' | 'No' | null>(swoData?.on_time || null);
    const [cmDelay, setCmDelay] = useState(swoData?.delay_reason || '');
    const [pmNote, setPmNote] = useState(swoData?.pm_closure_note || '');

    React.useEffect(() => {
        if (swoData) {
            setCmNote(swoData.cm_closure_note || '');
            setCmQuality(swoData.quality_score || '');
            setCmOnTime(swoData.on_time || null);
            setCmDelay(swoData.delay_reason || '');
            setPmNote(swoData.pm_closure_note || '');
        }
    }, [swoData]);

    if (!isOpen || !swoData) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Propose Detail Site Work Completed</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-8">
                    {/* Data Table */}
                    <div className="overflow-x-auto border border-gray-300 rounded-lg">
                        <table className="w-full text-sm text-center text-nowrap">
                            <thead className="text-gray-900 border-b border-gray-300">
                                <tr>
                                    <th className="px-4 py-3 font-semibold bg-[#C6E0B4] border-r border-gray-300">Project No.</th>
                                    <th className="px-4 py-3 font-semibold bg-[#C00000] text-white border-r border-gray-300">SWO no.</th>
                                    <th className="px-4 py-3 font-semibold bg-[#C00000] text-white border-r border-gray-300">Work Name/Scope</th>
                                    <th className="px-4 py-3 font-semibold bg-[#C00000] text-white border-r border-gray-300">Supervisor Name</th>
                                    <th className="px-4 py-3 font-semibold bg-[#FFFFFF] border-r border-gray-300">Work Activities (C1)<br />Progress %</th>
                                    <th className="px-4 py-3 font-semibold bg-[#C00000] text-white border-r border-gray-300">Equipment<br />Usage (C2)</th>
                                    <th className="px-4 py-3 font-semibold bg-[#C00000] text-white border-r border-gray-300">Worker Headcount<br />(C3)</th>
                                    <th className="px-4 py-3 font-semibold bg-[#C00000] text-white border-r border-gray-300">Plan Finish<br />Date</th>
                                    <th className="px-4 py-3 font-semibold bg-[#C00000] text-white border-r border-gray-300">Actual Finish<br />Date</th>
                                    <th className="px-4 py-3 font-semibold bg-[#00FFFF]">Actual-Finish<br />Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-white">
                                    <td className="px-4 py-3 border-r border-gray-200 bg-[#C6E0B4]">{swoData.projectNo}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 bg-[#C00000] text-white">{swoData.swoNo}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 bg-[#C00000] text-white text-left">{swoData.scope}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 bg-[#C00000] text-white">{swoData.supervisor}</td>
                                    <td className="px-4 py-3 border-r border-gray-200">{swoData.c1Prog}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 bg-[#C00000] text-white">{swoData.c2Usage}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 bg-[#C00000] text-white">{swoData.c3Workers}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 bg-[#C00000] text-white">{swoData.planFinish}</td>
                                    <td className="px-4 py-3 border-r border-gray-200 bg-[#C00000] text-white">{swoData.actualFinish}</td>
                                    <td className="px-4 py-3 bg-[#00FFFF] font-bold">{swoData.delayDays} Days</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Inputs Area */}
                    <div className="max-w-4xl space-y-6">
                        {/* Note/Comment row */}
                        <div className="flex gap-4 items-start">
                            <div className="w-48 font-medium text-gray-700 pt-2 shrink-0">Note/Comment:</div>
                            <div className="flex-1 space-y-3">
                                {/* CM Note */}
                                <div className="bg-[#FFF2CC] p-1 border border-[#F6C243]">
                                    <textarea
                                        rows={4}
                                        className="w-full bg-transparent outline-none resize-none p-2 text-sm"
                                        placeholder="CM Note..."
                                        value={cmNote}
                                        onChange={(e) => setCmNote(e.target.value)}
                                        readOnly={user?.role !== 'CM' && swoData.status !== 'CM Review'}
                                    />
                                </div>
                                {/* PM Note (Only shows if CM already submitted or User is PM/CD/GM/MD) */}
                                {(swoData.status === 'PM Review' || swoData.status === 'Complete') && (
                                    <div className="bg-[#E2F0D9] p-1 border border-[#A9D18E]">
                                        <textarea
                                            rows={3}
                                            className="w-full bg-transparent outline-none resize-none p-2 text-sm"
                                            placeholder="PM Note..."
                                            value={pmNote}
                                            onChange={(e) => setPmNote(e.target.value)}
                                            readOnly={user?.role !== 'PM'}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quality of Work */}
                        <div className="flex gap-4 items-center">
                            <div className="w-48 font-medium text-gray-700 shrink-0">Quality of Work %</div>
                            <div className="w-32 bg-[#C6E0B4] p-1 border border-[#A9D18E]">
                                <input
                                    type="number"
                                    className="w-full bg-transparent outline-none p-1 text-center"
                                    value={cmQuality}
                                    onChange={(e) => setCmQuality(e.target.value)}
                                    readOnly={user?.role !== 'CM' && swoData.status !== 'CM Review'}
                                />
                            </div>
                        </div>

                        {/* Schedule on time */}
                        <div className="flex gap-4 items-center">
                            <div className="w-48 font-medium text-gray-700 shrink-0">Schdule on time</div>
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-[#00FFFF]"
                                        checked={cmOnTime === 'Yes'}
                                        onChange={() => setCmOnTime('Yes')}
                                        disabled={user?.role !== 'CM' && swoData.status !== 'CM Review'}
                                    /> Yes
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-[#00FFFF]"
                                        checked={cmOnTime === 'No'}
                                        onChange={() => setCmOnTime('No')}
                                        disabled={user?.role !== 'CM' && swoData.status !== 'CM Review'}
                                    /> No
                                </label>
                                {cmOnTime === 'No' && (
                                    <div className="flex items-center gap-2 ml-4">
                                        <span className="text-gray-600">Dalay</span>
                                        <div className="w-48 bg-[#00FFFF] border border-gray-300 p-1">
                                            <input
                                                type="text"
                                                className="w-full bg-transparent outline-none px-2"
                                                value={cmDelay}
                                                onChange={(e) => setCmDelay(e.target.value)}
                                                readOnly={user?.role !== 'CM' && swoData.status !== 'CM Review'}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-4 rounded-b-xl">
                    <button onClick={onClose} className="px-6 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-100 font-medium">
                        Close
                    </button>
                    {(user?.role === 'CM' || user?.role === 'Admin') && swoData.status === 'CM Review' && (
                        <button onClick={() => onCmSubmit(cmNote, cmQuality, cmOnTime, cmDelay)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm">
                            Submit to PM
                        </button>
                    )}
                    {(user?.role === 'PM' || user?.role === 'Admin') && swoData.status === 'PM Review' && (
                        <button onClick={() => onPmSubmit(pmNote)} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-sm">
                            Approve & Forward to CD, GM, MD
                        </button>
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
    const [selectedSwoId, setSelectedSwoId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    React.useEffect(() => {
        const q = query(collection(db, "site_work_orders"));
        const unsub = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

            // Filter SWOs by user assigned projects
            const visibleSwos = fetched.filter((swo: any) => {
                if (!user) return false;
                if (user.role === 'Admin' || user.role === 'MD' || user.role === 'GM' || user.role === 'CD') return true;
                if (user.role === 'Supervisor') return swo.supervisor_id === user.uid;
                return user.assigned_projects?.includes(swo.project_id);
            });

            setSwos(visibleSwos);
            if (!selectedSwoId && visibleSwos.length > 0) {
                setSelectedSwoId(visibleSwos[0].id);
            }
        });
        return unsub;
    }, [selectedSwoId]);

    const activeSwo = swos.find(s => s.id === selectedSwoId);
    const swoStatus = activeSwo?.closure_status || 'Active'; // Output: Active, CM Review, PM Review, Complete

    // Format Data representing the parsed SWO for the Modal
    const swoData = activeSwo ? {
        id: activeSwo.id,
        projectNo: activeSwo.project_id || 'Unknown',
        swoNo: activeSwo.swo_no,
        scope: activeSwo.work_name,
        supervisor: activeSwo.supervisor_id,
        c1Prog: '100%', // Derived from reports in real logic
        c2Usage: `${(activeSwo.equipmentList || []).length} Eqm`,
        c3Workers: `${(activeSwo.teamList || []).length} Teams`,
        planFinish: '2026-02-20',
        actualFinish: '2026-02-21',
        delayDays: '1',
        status: swoStatus,
        cm_closure_note: activeSwo.cm_closure_note || '',
        quality_score: activeSwo.quality_score || '',
        on_time: activeSwo.on_time || null,
        delay_reason: activeSwo.delay_reason || '',
        pm_closure_note: activeSwo.pm_closure_note || ''
    } : null;

    const handleSupervisorRequest = async () => {
        if (!activeSwo) return;
        try {
            await updateDoc(doc(db, "site_work_orders", activeSwo.id), { closure_status: 'CM Review' });
        } catch (e) { console.error(e); }
    };

    // Triggered inside the modal by CM
    const handleCMSubmit = async (note: string, quality: string, onTime: string | null, delay: string) => {
        if (!activeSwo) return;
        try {
            await updateDoc(doc(db, "site_work_orders", activeSwo.id), {
                closure_status: 'PM Review',
                cm_closure_note: note,
                quality_score: quality,
                on_time: onTime,
                delay_reason: delay
            });
            setIsModalOpen(false);
        } catch (e) { console.error(e); }
    };

    // Triggered inside the modal by PM
    const handlePMSubmit = async (pmNote: string) => {
        if (!activeSwo) return;
        try {
            await updateDoc(doc(db, "site_work_orders", activeSwo.id), {
                closure_status: 'Complete',
                pm_closure_note: pmNote
            });
            setIsModalOpen(false);
        } catch (e) { console.error(e); }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <FileCheck className="w-6 h-6 mr-2 text-blue-600" />
                        Part F: Close Site Work Order
                    </h2>
                    <p className="text-gray-500 mt-1">Finalize SWO once all daily reports are approved.</p>
                </div>
                {swos.length > 0 && (
                    <select
                        className="bg-gray-50 border border-gray-300 rounded p-2 text-sm outline-none"
                        value={selectedSwoId || ''}
                        onChange={(e) => setSelectedSwoId(e.target.value)}
                    >
                        {swos.map(s => (
                            <option key={s.id} value={s.id}>{s.swo_no} - {s.work_name}</option>
                        ))}
                    </select>
                )}
            </div>

            {swos.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                    No active Site Work Orders found.
                </div>
            ) : (
                <>
                    <div className="flex justify-end mb-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${swoStatus === 'Complete' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                            Status: {swoStatus}
                        </span>
                    </div>

                    <div className="flex gap-4 items-center p-4 bg-gray-50 rounded-lg border border-gray-100">

                        {/* Supervisor Request */}
                        <div className="flex-1 text-center">
                            <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${swoStatus !== 'Active' ? 'bg-blue-100 text-blue-600' : 'bg-white border-2 border-gray-200 text-gray-400'
                                }`}>
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-semibold">1. Supervisor Requests</p>
                            {(user?.role === 'Supervisor' || user?.role === 'Admin') && swoStatus === 'Active' && (
                                <button onClick={handleSupervisorRequest} className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">Request Closure</button>
                            )}
                        </div>

                        <div className="w-16 h-1 bg-gray-200 rounded">
                            <div className={`h-full rounded transition-all ${swoStatus !== 'Active' ? 'bg-blue-500 w-full' : 'w-0'}`} />
                        </div>

                        {/* CM/PM Approval */}
                        <div className="flex-1 text-center">
                            <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${swoStatus === 'Complete' ? 'bg-green-100 text-green-600' : 'bg-white border-2 border-gray-200 text-gray-400'
                                }`}>
                                <Lock className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-semibold">2. CM/PM Final Approval</p>

                            {/* View SWO Button to open the Modal. Visible to all once requested. */}
                            {swoStatus !== 'Active' && (
                                <button onClick={() => setIsModalOpen(true)} className="mt-2 px-4 py-1.5 bg-blue-50 text-blue-700 font-medium border border-blue-200 text-xs rounded hover:bg-blue-100">
                                    View SWO
                                </button>
                            )}
                        </div>

                    </div>

                    <ProposeDetailModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        swoData={swoData}
                        onCmSubmit={handleCMSubmit}
                        onPmSubmit={handlePMSubmit}
                    />
                </>
            )}
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
