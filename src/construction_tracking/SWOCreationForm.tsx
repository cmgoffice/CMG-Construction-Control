import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Send, HardHat, FileText, Wrench, Users, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { db } from './firebase';
import { collection, onSnapshot, query, addDoc, doc, updateDoc, getDocs, where } from 'firebase/firestore';
import { useAuth } from './AuthRBACRouter';
import { AlertModal, useAlert } from './AlertModal';

export default function SWOCreationForm({ editSwo, onCancelEdit }: { editSwo?: any, onCancelEdit?: () => void }) {
    const { user } = useAuth();
    const { showAlert, showConfirm, modalProps } = useAlert();
    const [realProjects, setRealProjects] = useState<any[]>([]);
    const [realSupervisors, setRealSupervisors] = useState<any[]>([]);
    const [realEquipments, setRealEquipments] = useState<any[]>([]);
    const [realTeams, setRealTeams] = useState<any[]>([]);
    const [realSwos, setRealSwos] = useState<any[]>([]);

    useEffect(() => {
        const qProjects = query(collection(db, "projects"));
        const unsubProjects = onSnapshot(qProjects, (snapshot) => {
            setRealProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => console.error(err));

        const qSupervisors = query(collection(db, "project_supervisors"));
        const unsubSupervisors = onSnapshot(qSupervisors, (snapshot) => {
            setRealSupervisors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qEqm = query(collection(db, "project_equipments"));
        const unsubEqm = onSnapshot(qEqm, (snapshot) => {
            setRealEquipments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qTeams = query(collection(db, "project_worker_teams"));
        const unsubTeams = onSnapshot(qTeams, (snapshot) => {
            setRealTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qSwos = query(collection(db, "site_work_orders"));
        const unsubSwos = onSnapshot(qSwos, (snapshot) => {
            setRealSwos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => { unsubProjects(); unsubSupervisors(); unsubEqm(); unsubTeams(); unsubSwos(); };
    }, []);

    const activeProjects = realProjects.filter(p => {
        if (!user) return false;
        if (user.role === 'Admin' || user.role === 'MD' || user.role === 'GM' || user.role === 'CD') return true;
        return user.assigned_projects?.includes(p.id);
    });

    const [formData, setFormData] = useState({
        project_id: editSwo?.project_id || '',
        swo_no: editSwo?.swo_no || '',
        work_name: editSwo?.work_name || '',
        supervisor_id: editSwo?.supervisor_id || '',
        additional_notes: editSwo?.additional_notes || '',
        start_date: editSwo?.start_date || new Date().toISOString().split('T')[0],
        finish_date: editSwo?.finish_date || ''
    });

    // Populate data if edit mode
    useEffect(() => {
        if (editSwo) {
            setFormData({
                project_id: editSwo.project_id || '',
                swo_no: editSwo.swo_no || '',
                work_name: editSwo.work_name || '',
                supervisor_id: editSwo.supervisor_id || '',
                additional_notes: editSwo.additional_notes || '',
                start_date: editSwo.start_date || new Date().toISOString().split('T')[0],
                finish_date: editSwo.finish_date || ''
            });
            if (editSwo.activities) setActivities(editSwo.activities.map((a: any, i: number) => ({ ...a, id: a.id || Date.now() + i })));
            if (editSwo.equipmentList) setEquipmentList(editSwo.equipmentList.map((e: any, i: number) => ({ ...e, id: e.id || Date.now() + i })));
            if (editSwo.teamList) setTeamList(editSwo.teamList.map((t: any, i: number) => ({ ...t, id: t.id || Date.now() + i })));
        }
    }, [editSwo]);

    // Sub-lists filtered by project
    const projectSupervisors = realSupervisors.filter(s => s.project_id === formData.project_id);
    const projectEquipments = realEquipments.filter(e => e.project_id === formData.project_id);
    const projectTeams = realTeams.filter(t => t.project_id === formData.project_id);

    // Generate SWO No dynamically when project selection changes
    useEffect(() => {
        if (editSwo) return; // don't override swo_no down here if editing
        if (!formData.project_id && activeProjects.length > 0) {
            setFormData(prev => ({ ...prev, project_id: activeProjects[0].id }));
            return;
        }

        const proj = activeProjects.find(p => p.id === formData.project_id);
        if (proj && proj.no) {
            // E.g., PRJ-2026-J-01 -> parts[0]="PRJ", parts[1]="2026", parts[2]="J", parts[3]="01"
            const parts = proj.no.split('-');
            let suffix = proj.no;
            if (parts.length >= 3) {
                suffix = parts.slice(2).join('-');
            } else if (parts.length === 2) {
                suffix = parts[1];
            }

            // Find existing SWOs for this project
            const projectSwos = realSwos.filter(s => s.project_id === formData.project_id);
            let maxSeq = 0;
            projectSwos.forEach(swo => {
                const match = swo.swo_no?.match(/-SWO-(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxSeq) maxSeq = num;
                }
            });
            const nextSeq = maxSeq + 1;
            const seqStr = nextSeq.toString().padStart(3, '0');

            setFormData(prev => {
                const newSwoNo = `${suffix}-SWO-${seqStr}`;
                if (prev.swo_no === newSwoNo) return prev;
                return { ...prev, swo_no: newSwoNo };
            });
        }
    }, [formData.project_id, activeProjects, realSwos]);

    const [activities, setActivities] = useState([{ id: 1, description: '', unit: '', qty_total: '', rate: '' }]);
    const [equipmentList, setEquipmentList] = useState([{ id: 1, equipment_id: '' }]);
    const [teamList, setTeamList] = useState([{ id: 1, team_id: '' }]);

    // Handlers for dynamic tables
    const addActivity = () => setActivities([...activities, { id: Date.now(), description: '', unit: '', qty_total: '', rate: '' }]);
    const removeActivity = (id: number) => setActivities(activities.filter(a => a.id !== id));

    const addEquipment = () => setEquipmentList([...equipmentList, { id: Date.now(), equipment_id: '' }]);
    const removeEquipment = (id: number) => setEquipmentList(equipmentList.filter(e => e.id !== id));

    const addTeam = () => setTeamList([...teamList, { id: Date.now(), team_id: '' }]);
    const removeTeam = (id: number) => setTeamList(teamList.filter(t => t.id !== id));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.supervisor_id) {
            showAlert('warning', 'กรุณาเลือก Supervisor', 'กรุณาเลือก Supervisor ก่อนบันทึก');
            return;
        }
        try {
            let finalSwoNo = formData.swo_no;

            if (!editSwo) {
                // Anti-collision: Recalculate SWO No. right before saving
                const proj = activeProjects.find(p => p.id === formData.project_id);
                if (proj && proj.no) {
                    const parts = proj.no.split('-');
                    let suffix = proj.no;
                    if (parts.length >= 3) {
                        suffix = parts.slice(2).join('-');
                    } else if (parts.length === 2) {
                        suffix = parts[1];
                    }

                    const q = query(collection(db, "site_work_orders"), where("project_id", "==", formData.project_id));
                    const querySnapshot = await getDocs(q);
                    let maxSeq = 0;
                    querySnapshot.forEach(docSnap => {
                        const swoNo = docSnap.data().swo_no;
                        const match = swoNo?.match(/-SWO-(\d+)$/);
                        if (match) {
                            const num = parseInt(match[1], 10);
                            if (num > maxSeq) maxSeq = num;
                        }
                    });
                    const nextSeq = maxSeq + 1;
                    finalSwoNo = `${suffix}-SWO-${nextSeq.toString().padStart(3, '0')}`;
                }
            }

            const selectedSupervisor = realSupervisors.find(s => s.id === formData.supervisor_id);
            const payload = {
                project_id: formData.project_id,
                swo_no: finalSwoNo,
                work_name: formData.work_name,
                supervisor_id: formData.supervisor_id,
                supervisor_name: selectedSupervisor?.name || '',
                activities,
                equipmentList,
                teamList,
                additional_notes: formData.additional_notes,
                start_date: formData.start_date,
                finish_date: formData.finish_date,
                status: 'Assigned', // Back to assigned when created or resubmitted
                updated_at: new Date().toISOString()
            };

            if (editSwo) {
                await updateDoc(doc(db, "site_work_orders", editSwo.id), payload);
                showAlert('success', 'อัปเดตสำเร็จ', `SWO ${finalSwoNo} ได้รับการอัปเดตเรียบร้อยแล้ว`);
                if (onCancelEdit) onCancelEdit();
            } else {
                await addDoc(collection(db, "site_work_orders"), {
                    ...payload,
                    created_at: new Date().toISOString()
                });
                showAlert('success', 'สร้างสำเร็จ', `SWO ${finalSwoNo} ถูกสร้างและบันทึกเรียบร้อยแล้ว`);
                setFormData(prev => ({ ...prev, work_name: '', supervisor_id: '', additional_notes: '' }));
                setActivities([{ id: Date.now(), description: '', unit: '', qty_total: '', rate: '' }]);
                setEquipmentList([{ id: Date.now(), equipment_id: '' }]);
                setTeamList([{ id: Date.now(), team_id: '' }]);
            }
        } catch (err: any) {
            console.error("Error saving SWO:", err);
            showAlert('error', 'เกิดข้อผิดพลาด', err.message);
        }
    };

    const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
        const escape = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;
        const csvContent = [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n');
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadTemplate = () => {
        downloadCSV(
            'template_swo_activities.csv',
            ['description', 'unit', 'qty_total', 'rate'],
            [['งานขุดดิน', 'ลบ.ม.', '100', ''], ['งานคอนกรีต', 'ลบ.ม.', '50', '']]
        );
    };

    const handleExportExcel = () => {
        downloadCSV(
            `export_swo_activities_${formData.swo_no || 'draft'}.csv`,
            ['description', 'unit', 'qty_total', 'rate'],
            activities.map(a => [a.description, a.unit, String(a.qty_total), String((a as any).rate || '')])
        );
    };

    const handleImportTemplate = () => {
        showAlert('info', 'Import Template', 'กรุณา Download Template ก่อน แล้วกรอกข้อมูล จากนั้น Import ผ่านระบบ (Feature coming soon)');
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            <AlertModal {...modalProps} />
            {editSwo && (
                <div className="flex items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-orange-500"></div>
                    <button onClick={onCancelEdit} type="button" className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors shrink-0">
                        <span className="sr-only">Back</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900">Edit SWO (Change Requested)</h1>
                        {editSwo.change_reason && (
                            <div className="mt-2 text-sm text-red-600 font-medium">
                                <strong>Supervisor's Reason:</strong> {editSwo.change_reason}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className={`flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm ${editSwo ? 'hidden' : ''}`}>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Create Site Work Order (SWO)</h1>
                    <p className="text-gray-500 mt-1">Fill in the details below or import data from Excel.</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <button className="flex-1 md:flex-none justify-center px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 flex items-center font-medium shadow-sm transition-colors">
                        <Save className="w-4 h-4 mr-2" /> Save Draft
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 md:flex-none justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center font-medium shadow-sm transition-colors"
                    >
                        <Send className="w-4 h-4 mr-2" /> Assign SWO
                    </button>
                </div>
            </div>

            <form id="swo-form" onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* SWO Header (Part B) */}
                <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-blue-500" /> General Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                            <select
                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                value={formData.project_id}
                                onChange={e => setFormData({ ...formData, project_id: e.target.value })}
                            >
                                <option value="">-- Select Project --</option>
                                {activeProjects.length === 0 ? (
                                    <option value="" disabled>No projects available (Create in A1)</option>
                                ) : (
                                    activeProjects.map(p => <option key={p.id} value={p.id}>{p.no} {p.name}</option>)
                                )}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">SWO No.</label>
                            <input
                                type="text"
                                className="w-full border-gray-300 rounded-md shadow-sm bg-gray-50 p-2 border text-gray-600 cursor-not-allowed font-mono"
                                value={formData.swo_no}
                                disabled
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">📅 Start Date</label>
                            <input
                                type="date"
                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                value={formData.start_date}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">📅 Finish Date</label>
                            <input
                                type="date"
                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                value={formData.finish_date}
                                onChange={e => setFormData({ ...formData, finish_date: e.target.value })}
                            />
                        </div>
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Work Name / Scope Description</label>
                            <input
                                type="text"
                                placeholder="e.g. Ground Floor Column Pouring"
                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                value={formData.work_name}
                                onChange={e => setFormData({ ...formData, work_name: e.target.value })}
                            />
                        </div>
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assign Supervisor</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <HardHat className="h-5 w-5 text-gray-400" />
                                </div>
                                <select
                                    className="w-full pl-10 border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border appearance-none"
                                    value={formData.supervisor_id}
                                    onChange={e => setFormData({ ...formData, supervisor_id: e.target.value })}
                                >
                                    <option value="">-- Select Supervisor --</option>
                                    {projectSupervisors.length === 0 ? (
                                        <option value="" disabled>No supervisors assigned to this project (A2)</option>
                                    ) : (
                                        projectSupervisors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.scope_type})</option>)
                                    )}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dynamic Tables */}
                <div className="p-4 space-y-6">

                    {/* Activities (B1) */}
                    <section>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                            <h3 className="text-sm font-semibold text-gray-800 flex items-center shrink-0">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100 text-green-700 font-bold text-xs mr-2">B1</span>
                                Work Activities
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                <button onClick={handleDownloadTemplate} type="button" className="text-sm text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-md flex items-center font-medium transition-colors shadow-sm">
                                    <Download className="w-4 h-4 mr-1.5 shrink-0" /> <span className="hidden sm:inline">Template</span>
                                </button>
                                <button onClick={handleImportTemplate} type="button" className="text-sm text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-md flex items-center font-medium transition-colors">
                                    <Upload className="w-4 h-4 mr-1.5 shrink-0" /> <span className="hidden sm:inline">Import</span>
                                </button>
                                <button onClick={handleExportExcel} type="button" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-3 py-1.5 rounded-md flex items-center font-medium transition-colors">
                                    <FileSpreadsheet className="w-4 h-4 mr-1.5 shrink-0" /> <span className="hidden sm:inline">Export</span>
                                </button>
                                <div className="hidden lg:block w-px h-6 bg-gray-300 mx-1"></div>
                                <button onClick={addActivity} type="button" className="text-sm text-green-700 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-md flex items-center font-medium transition-colors shadow-sm shrink-0">
                                    <Plus className="w-4 h-4 mr-1 shrink-0" /> Add Row
                                </button>
                            </div>
                        </div>
                        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-700">
                                <thead className="bg-slate-100 border-b border-slate-200 text-gray-700">
                                    <tr>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200 w-10 text-center">#</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200 min-w-[200px]">Activity Description</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200 w-28">Unit</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200 w-32">Qty Total</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200 w-28">Rate</th>
                                        <th className="px-3 py-2 w-10 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {activities.map((row, idx) => (
                                        <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                            <td className="px-3 py-1 border-r border-slate-100 text-center text-gray-500 font-medium">{idx + 1}</td>
                                            <td className="px-3 py-1 border-r border-slate-100">
                                                <input type="text" className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none min-w-[180px]" placeholder="Activity details..." value={row.description} onChange={(e) => {
                                                    const newArr = [...activities]; newArr[idx].description = e.target.value; setActivities(newArr);
                                                }} />
                                            </td>
                                            <td className="px-3 py-1 border-r border-slate-100">
                                                <input type="text" className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none min-w-[80px]" placeholder="m³, m², ..." value={row.unit} onChange={(e) => {
                                                    const newArr = [...activities]; newArr[idx].unit = e.target.value; setActivities(newArr);
                                                }} />
                                            </td>
                                            <td className="px-3 py-1 border-r border-slate-100">
                                                <input type="number" className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none min-w-[80px]" placeholder="0.00" value={row.qty_total} onChange={(e) => {
                                                    const newArr = [...activities]; newArr[idx].qty_total = e.target.value; setActivities(newArr);
                                                }} />
                                            </td>
                                            <td className="px-3 py-1 border-r border-slate-100">
                                                <input type="text" className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none min-w-[80px]" placeholder="-" value={(row as any).rate || ''} onChange={(e) => {
                                                    const newArr = [...activities]; (newArr[idx] as any).rate = e.target.value; setActivities(newArr);
                                                }} />
                                            </td>
                                            <td className="px-2 py-1 text-center">
                                                <button onClick={() => removeActivity(row.id)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {activities.length === 0 && (
                                        <tr><td colSpan={6} className="px-4 py-4 text-center text-gray-400 bg-gray-50 text-xs">No activities added.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Equipment (B2) */}
                    <section>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-orange-100 text-orange-700 mr-2">
                                    <Wrench className="w-3.5 h-3.5" />
                                </span>
                                Equipment (B2)
                            </h3>
                            <button onClick={addEquipment} type="button" className="text-xs text-orange-600 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded flex items-center font-medium transition-colors">
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add Equipment
                            </button>
                        </div>
                        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-700">
                                <thead className="bg-slate-100 border-b border-slate-200 text-gray-700">
                                    <tr>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200 w-10 text-center">#</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200 min-w-[250px]">Select Equipment (from A3)</th>
                                        <th className="px-3 py-2 w-10 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {equipmentList.map((row, idx) => (
                                        <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                            <td className="px-3 py-1 border-r border-slate-100 text-center text-gray-500 font-medium">{idx + 1}</td>
                                            <td className="px-3 py-1 border-r border-slate-100">
                                                <select
                                                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none min-w-[200px]"
                                                    value={row.equipment_id}
                                                    onChange={(e) => {
                                                        const newArr = [...equipmentList]; newArr[idx].equipment_id = e.target.value; setEquipmentList(newArr);
                                                    }}
                                                >
                                                    <option value="">-- Choose Equipment --</option>
                                                    {projectEquipments.length === 0 ? (
                                                        <option value="" disabled>No equipment assigned to this project (A3)</option>
                                                    ) : (
                                                        projectEquipments.map(eq => <option key={eq.id} value={eq.equipment_id || eq.id}>{eq.eqm_name} ({eq.po_no})</option>)
                                                    )}
                                                </select>
                                            </td>
                                            <td className="px-2 py-1 text-center">
                                                <button onClick={() => removeEquipment(row.id)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {equipmentList.length === 0 && (
                                        <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-400 bg-gray-50 text-xs">No equipment assigned.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Worker Teams (B3) */}
                    <section>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-indigo-100 text-indigo-700 mr-2">
                                    <Users className="w-3.5 h-3.5" />
                                </span>
                                Worker Teams (B3)
                            </h3>
                            <button onClick={addTeam} type="button" className="text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded flex items-center font-medium transition-colors">
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add Team
                            </button>
                        </div>
                        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-700">
                                <thead className="bg-slate-100 border-b border-slate-200 text-gray-700">
                                    <tr>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200 w-10 text-center">#</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200 min-w-[250px]">Select Worker Team (from A4)</th>
                                        <th className="px-3 py-2 w-10 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {teamList.map((row, idx) => (
                                        <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                            <td className="px-3 py-1 border-r border-slate-100 text-center text-gray-500 font-medium">{idx + 1}</td>
                                            <td className="px-3 py-1 border-r border-slate-100">
                                                <select
                                                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none min-w-[200px]"
                                                    value={row.team_id}
                                                    onChange={(e) => {
                                                        const newArr = [...teamList]; newArr[idx].team_id = e.target.value; setTeamList(newArr);
                                                    }}
                                                >
                                                    <option value="">-- Choose Team --</option>
                                                    {projectTeams.length === 0 ? (
                                                        <option value="" disabled>No teams assigned to this project (A4)</option>
                                                    ) : (
                                                        projectTeams.map(tm => <option key={tm.id} value={tm.team_id || tm.id}>{tm.name} ({tm.team_code})</option>)
                                                    )}
                                                </select>
                                            </td>
                                            <td className="px-2 py-1 text-center">
                                                <button onClick={() => removeTeam(row.id)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {teamList.length === 0 && (
                                        <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-400 bg-gray-50 text-xs">No teams assigned.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Additional Notes (B4) */}
                    <section>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-yellow-100 text-yellow-700 mr-2">
                                    <FileText className="w-3.5 h-3.5" />
                                </span>
                                Additional Notes (B4)
                            </h3>
                        </div>
                        <div className="bg-white">
                            <textarea
                                rows={4}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y"
                                placeholder="Enter any additional instructions for the Supervisor here..."
                                value={formData.additional_notes}
                                onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                            />
                        </div>
                    </section>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-200 bg-gray-50 p-6 rounded-b-xl -mx-6 -mb-6 mt-6">
                    <div className="flex gap-3">
                        <button type="button" onClick={() => { if (onCancelEdit) onCancelEdit() }} className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                            {editSwo ? 'Cancel' : 'Save Draft'}
                        </button>
                        <button type="submit" form="swo-form" className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center shadow-sm">
                            <Send className="w-4 h-4 mr-2" /> {editSwo ? 'Update SWO' : 'Assign SWO'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
