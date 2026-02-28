import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthRBACRouter';
import { db, logActivity } from './firebase';
import { collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Plus, Search, Building2, Users, Wrench, HardHat, ShieldCheck, X, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { AlertModal, useAlert } from './AlertModal';

// --- Components ---

const CardStats = ({ title, value, icon: Icon, colorClass }: any) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center">
        <div className={`p-4 rounded-lg mr-4 ${colorClass}`}>
            <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
    </div>
);

const SectionHeader = ({ title, onAdd, canAdd, icon: Icon, rightArea }: any) => (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto">
            {rightArea}
            {canAdd && (
                <button
                    onClick={onAdd}
                    className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-sm font-medium transition-colors"
                >
                    <Plus className="w-4 h-4 mr-1" /> Add New
                </button>
            )}
        </div>
    </div>
);

export default function ProjectDashboard() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'A1' | 'A2' | 'A3' | 'A4'>('A1');
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState(false);
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { showAlert, showConfirm, showDelete, modalProps } = useAlert();
    const [realProjects, setRealProjects] = useState<any[]>([]);
    const [realSupervisors, setRealSupervisors] = useState<any[]>([]);
    const [realEquipments, setRealEquipments] = useState<any[]>([]);
    const [realWorkerTeams, setRealWorkerTeams] = useState<any[]>([]);
    const [usersList, setUsersList] = useState<any[]>([]);

    // A2 form state
    const [isA2ModalOpen, setIsA2ModalOpen] = useState(false);
    const [a2ViewMode, setA2ViewMode] = useState(false);
    const [editingA2Id, setEditingA2Id] = useState<string | null>(null);
    const [a2FormData, setA2FormData] = useState({
        project_id: '', name: '', scope_type: 'Civil&Building',
        start_date: '', finish_date: '', format: 'OT', note: ''
    });

    // A3 form state
    const [isA3ModalOpen, setIsA3ModalOpen] = useState(false);
    const [a3ViewMode, setA3ViewMode] = useState(false);
    const [editingA3Id, setEditingA3Id] = useState<string | null>(null);
    const [a3FormData, setA3FormData] = useState({
        project_id: '', eqm_name: '', po_no: '', total_po: 0,
        type: 'CMG EQM', fuel_condition: 'รวมน้ำมัน',
        start_date: '', finish_date: ''
    });

    // A4 form state
    const [isA4ModalOpen, setIsA4ModalOpen] = useState(false);
    const [a4ViewMode, setA4ViewMode] = useState(false);
    const [editingA4Id, setEditingA4Id] = useState<string | null>(null);
    const [a4FormData, setA4FormData] = useState({
        project_id: '', team_code: '', name: '', leader_name: '',
        type: 'DC CMG', total_workers: 0, male_count: 0, female_count: 0
    });

    useEffect(() => {
        const q1 = query(collection(db, "projects"));
        const unsub1 = onSnapshot(q1, (snapshot) => {
            setRealProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => console.error(err));

        const q2 = query(collection(db, "project_supervisors"));
        const unsub2 = onSnapshot(q2, (snapshot) => {
            setRealSupervisors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => console.error(err));

        const q3 = query(collection(db, "project_equipments"));
        const unsub3 = onSnapshot(q3, (snapshot) => {
            setRealEquipments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => console.error(err));

        const q4 = query(collection(db, "project_worker_teams"));
        const unsub4 = onSnapshot(q4, (snapshot) => {
            setRealWorkerTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => console.error(err));

        const q5 = query(collection(db, "users"));
        const unsub5 = onSnapshot(q5, (snapshot) => {
            setUsersList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => console.error(err));

        return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
    }, []);

    // Dynamic Year calculation for default Project No
    const currentYear = new Date().getFullYear();
    const defaultProjectNo = `PRJ-${currentYear}-J-xx`;

    // Form State
    const [formData, setFormData] = useState({
        no: defaultProjectNo, name: '', location: '', pm_id: '', cm_id: '',
        start_date: '', finish_date: '', main_contractor: '',
        sub_contractor: '', client_name: '', project_note: ''
    });

    const closeModal = () => {
        setIsCreateModalOpen(false);
        setViewMode(false);
        setEditingProjectId(null);
        setFormData({
            no: defaultProjectNo, name: '', location: '', pm_id: '', cm_id: '',
            start_date: '', finish_date: '', main_contractor: '',
            sub_contractor: '', client_name: '', project_note: ''
        });
    };

    const handleSaveProject = async () => {
        setIsSaving(true);
        try {
            if (editingProjectId) {
                await updateDoc(doc(db, "projects", editingProjectId), {
                    ...formData,
                });
                // Log project update
                await logActivity({
                    uid: user?.uid || '',
                    name: user?.name || '',
                    role: user?.role || '',
                    action: 'Update',
                    menu: 'Projects',
                    detail: `Update Project No. ${formData.no || '-'} - ${formData.name}`
                });
                showAlert('success', 'อัปเดตสำเร็จ', 'Project ได้รับการอัปเดตเรียบร้อยแล้ว');
            } else {
                await addDoc(collection(db, "projects"), {
                    ...formData,
                    status: 'ACTIVE',
                    created_at: new Date()
                });
                // Log project creation
                await logActivity({
                    uid: user?.uid || '',
                    name: user?.name || '',
                    role: user?.role || '',
                    action: 'Create',
                    menu: 'Projects',
                    detail: `Create Project No. ${formData.no || '-'} - ${formData.name}`
                });
                showAlert('success', 'สร้างสำเร็จ', 'Project ถูกสร้างเรียบร้อยแล้ว');
            }
            closeModal();
        } catch (error: any) {
            console.error("Error saving document: ", error);
            showAlert('error', 'Firebase Error', error.message);
        }
        setIsSaving(false);
    };

    const handleView = (project: any) => {
        setFormData({ ...project });
        setViewMode(true);
        setEditingProjectId(null);
        setIsCreateModalOpen(true);
    };

    const handleEdit = (project: any) => {
        setFormData({ ...project });
        setViewMode(false);
        setEditingProjectId(project.id);
        setIsCreateModalOpen(true);
    };

    const handleDelete = (project: any) => {
        showDelete(`ลบ Project: ${project.name}?`, 'การลบไม่สามารถย้อนกลับได้', async () => {
            try {
                await deleteDoc(doc(db, "projects", project.id));
                showAlert('success', 'ลบสำเร็จ', 'Project ถูกลบเรียบร้อยแล้ว');
            } catch (e: any) {
                showAlert('error', 'ลบไม่สำเร็จ', e.message);
            }
        });
    };

    // --- A2 Supervisor Form Handlers ---
    const closeA2Modal = () => {
        setIsA2ModalOpen(false);
        setA2ViewMode(false);
        setEditingA2Id(null);
        setA2FormData({
            project_id: currentProject?.id || '', name: '', scope_type: 'Civil&Building',
            start_date: '', finish_date: '', format: 'OT', note: ''
        });
    };

    const handleSaveA2 = async () => {
        setIsSaving(true);
        try {
            if (editingA2Id) {
                await updateDoc(doc(db, "project_supervisors", editingA2Id), { ...a2FormData });
                showAlert('success', 'อัปเดตสำเร็จ', 'ข้อมูล Supervisor ได้รับการอัปเดตแล้ว');
            } else {
                await addDoc(collection(db, "project_supervisors"), {
                    ...a2FormData, created_at: new Date()
                });
                showAlert('success', 'เพิ่มสำเร็จ', 'เพิ่ม Supervisor เรียบร้อยแล้ว');
            }
            closeA2Modal();
        } catch (error: any) {
            showAlert('error', 'Firebase Error', error.message);
        }
        setIsSaving(false);
    };

    const handleViewA2 = (sup: any) => {
        setA2FormData({ ...sup }); setA2ViewMode(true); setEditingA2Id(null); setIsA2ModalOpen(true);
    };

    const handleEditA2 = (sup: any) => {
        setA2FormData({ ...sup }); setA2ViewMode(false); setEditingA2Id(sup.id); setIsA2ModalOpen(true);
    };

    const handleDeleteA2 = (sup: any) => {
        showDelete(`ลบ Supervisor: ${sup.name}?`, 'การลบไม่สามารถย้อนกลับได้', async () => {
            try { await deleteDoc(doc(db, "project_supervisors", sup.id)); }
            catch (e: any) { showAlert('error', 'ลบไม่สำเร็จ', e.message); }
        });
    };

    // --- A3 Equipment Form Handlers ---
    const closeA3Modal = () => {
        setIsA3ModalOpen(false);
        setA3ViewMode(false);
        setEditingA3Id(null);
        setA3FormData({
            project_id: currentProject?.id || '', eqm_name: '', po_no: '', total_po: 0,
            type: 'CMG EQM', fuel_condition: 'รวมน้ำมัน',
            start_date: '', finish_date: ''
        });
    };

    const handleSaveA3 = async () => {
        setIsSaving(true);
        try {
            if (editingA3Id) {
                await updateDoc(doc(db, "project_equipments", editingA3Id), { ...a3FormData });
                showAlert('success', 'อัปเดตสำเร็จ', 'ข้อมูล Equipment ได้รับการอัปเดตแล้ว');
            } else {
                await addDoc(collection(db, "project_equipments"), {
                    ...a3FormData, created_at: new Date()
                });
                showAlert('success', 'เพิ่มสำเร็จ', 'เพิ่ม Equipment เรียบร้อยแล้ว');
            }
            closeA3Modal();
        } catch (error: any) {
            showAlert('error', 'Firebase Error', error.message);
        }
        setIsSaving(false);
    };

    const handleViewA3 = (eqm: any) => {
        setA3FormData({ ...eqm }); setA3ViewMode(true); setEditingA3Id(null); setIsA3ModalOpen(true);
    };

    const handleEditA3 = (eqm: any) => {
        setA3FormData({ ...eqm }); setA3ViewMode(false); setEditingA3Id(eqm.id); setIsA3ModalOpen(true);
    };

    const handleDeleteA3 = (eqm: any) => {
        showDelete(`ลบ Equipment: ${eqm.eqm_name}?`, 'การลบไม่สามารถย้อนกลับได้', async () => {
            try { await deleteDoc(doc(db, "project_equipments", eqm.id)); }
            catch (e: any) { showAlert('error', 'ลบไม่สำเร็จ', e.message); }
        });
    };

    // --- A4 Worker Teams Form Handlers ---
    const closeA4Modal = () => {
        setIsA4ModalOpen(false);
        setA4ViewMode(false);
        setEditingA4Id(null);
        setA4FormData({
            project_id: currentProject?.id || '', team_code: '', name: '', leader_name: '',
            type: 'DC CMG', total_workers: 0, male_count: 0, female_count: 0
        });
    };

    const handleSaveA4 = async () => {
        setIsSaving(true);
        try {
            if (editingA4Id) {
                const finalData = { ...a4FormData, total_workers: Number(a4FormData.male_count) + Number(a4FormData.female_count) };
                await updateDoc(doc(db, "project_worker_teams", editingA4Id), finalData);
                showAlert('success', 'อัปเดตสำเร็จ', 'ข้อมูล Worker Team ได้รับการอัปเดตแล้ว');
            } else {
                const finalData = { ...a4FormData, total_workers: Number(a4FormData.male_count) + Number(a4FormData.female_count) };
                await addDoc(collection(db, "project_worker_teams"), {
                    ...finalData, created_at: new Date()
                });
                showAlert('success', 'เพิ่มสำเร็จ', 'เพิ่ม Worker Team เรียบร้อยแล้ว');
            }
            closeA4Modal();
        } catch (error: any) {
            showAlert('error', 'Firebase Error', error.message);
        }
        setIsSaving(false);
    };

    const handleViewA4 = (team: any) => {
        setA4FormData({ ...team }); setA4ViewMode(true); setEditingA4Id(null); setIsA4ModalOpen(true);
    };

    const handleEditA4 = (team: any) => {
        setA4FormData({ ...team }); setA4ViewMode(false); setEditingA4Id(team.id); setIsA4ModalOpen(true);
    };

    const handleDeleteA4 = (team: any) => {
        showDelete(`ลบ Worker Team: ${team.name}?`, 'การลบไม่สามารถย้อนกลับได้', async () => {
            try { await deleteDoc(doc(db, "project_worker_teams", team.id)); }
            catch (e: any) { showAlert('error', 'ลบไม่สำเร็จ', e.message); }
        });
    };

    // RBAC Filtering Logic
    // Live Firebase Projects
    const combinedProjects = [...realProjects];
    const visibleProjects = combinedProjects.filter(p => {
        if (user?.role === 'Admin' || user?.role === 'MD' || user?.role === 'GM' || user?.role === 'CD') return true;
        return user?.assigned_projects?.includes(p.id);
    });

    // Global Filter for A2, A3, A4
    const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('All');

    // Retrieve the readable Project No for display
    const getProjectNo = (projectId: string) => {
        const p = visibleProjects.find(vp => vp.id === projectId);
        return p ? p.no : 'Unknown';
    };

    // Filter based on selected project tab visually (Simplified for mock: taking first visible project info)
    const currentProject = visibleProjects[0];

    // Merge logic
    const combinedSupervisors = [...realSupervisors];
    const visibleSupervisors = combinedSupervisors.filter(s => visibleProjects.some(vp => vp.id === s.project_id));
    const filteredSupervisors = visibleSupervisors.filter(s => selectedProjectFilter === 'All' ? true : s.project_id === selectedProjectFilter);

    const combinedEquipments = [...realEquipments];
    const visibleEquipments = combinedEquipments.filter(e => visibleProjects.some(vp => vp.id === e.project_id));
    const filteredEquipments = visibleEquipments.filter(e => selectedProjectFilter === 'All' ? true : e.project_id === selectedProjectFilter);

    const combinedWorkerTeams = [...realWorkerTeams];
    const visibleWorkerTeams = combinedWorkerTeams.filter(t => visibleProjects.some(vp => vp.id === t.project_id));
    const filteredWorkerTeams = visibleWorkerTeams.filter(t => selectedProjectFilter === 'All' ? true : t.project_id === selectedProjectFilter);

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

    const getTabTemplateDef = () => {
        if (activeTab === 'A1') return {
            filename: 'template_projects.csv',
            headers: ['no', 'name', 'location', 'pm_id', 'cm_id', 'start_date', 'finish_date', 'main_contractor', 'sub_contractor', 'client_name', 'project_note'],
            example: [`PRJ-${currentYear}-J-01`, 'Project Name', 'Bangkok', 'PM User ID', 'CM User ID', '2026-01-01', '2026-12-31', 'Main Co.', 'Sub Co.', 'Client Name', 'Notes']
        };
        if (activeTab === 'A2') return {
            filename: 'template_supervisors.csv',
            headers: ['project_id', 'name', 'scope_type', 'start_date', 'finish_date', 'format', 'note'],
            example: ['Project ID', 'Supervisor Name', 'Civil&Building', '2026-01-01', '2026-12-31', 'OT', 'Notes']
        };
        if (activeTab === 'A3') return {
            filename: 'template_equipments.csv',
            headers: ['project_id', 'eqm_name', 'po_no', 'total_po', 'type', 'fuel_condition', 'start_date', 'finish_date'],
            example: ['Project ID', 'Equipment Name', 'PO-001', '100000', 'CMG EQM', 'รวมน้ำมัน', '2026-01-01', '2026-12-31']
        };
        return {
            filename: 'template_worker_teams.csv',
            headers: ['project_id', 'team_code', 'name', 'leader_name', 'type', 'male_count', 'female_count'],
            example: ['Project ID', 'T-001', 'Team Name', 'Leader Name', 'DC CMG', '5', '3']
        };
    };

    const handleDownloadTemplate = () => {
        const { filename, headers, example } = getTabTemplateDef();
        downloadCSV(filename, headers, [example]);
    };

    const getTabExportDef = () => {
        if (activeTab === 'A1') return {
            filename: 'export_projects.csv',
            headers: ['no', 'name', 'location', 'start_date', 'finish_date', 'main_contractor', 'sub_contractor', 'client_name', 'status', 'project_note'],
            rows: visibleProjects.map(p => [p.no, p.name, p.location, p.start_date, p.finish_date, p.main_contractor, p.sub_contractor, p.client_name, p.status, p.project_note])
        };
        if (activeTab === 'A2') return {
            filename: 'export_supervisors.csv',
            headers: ['project_no', 'name', 'scope_type', 'start_date', 'finish_date', 'format', 'note'],
            rows: filteredSupervisors.map(s => [getProjectNo(s.project_id), s.name, s.scope_type, s.start_date, s.finish_date, s.format, s.note])
        };
        if (activeTab === 'A3') return {
            filename: 'export_equipments.csv',
            headers: ['project_no', 'eqm_name', 'po_no', 'total_po', 'type', 'fuel_condition', 'start_date', 'finish_date'],
            rows: filteredEquipments.map(e => [getProjectNo(e.project_id), e.eqm_name, e.po_no, String(e.total_po), e.type, e.fuel_condition, e.start_date, e.finish_date])
        };
        return {
            filename: 'export_worker_teams.csv',
            headers: ['project_no', 'team_code', 'name', 'leader_name', 'type', 'total_workers', 'male_count', 'female_count'],
            rows: filteredWorkerTeams.map(t => [getProjectNo(t.project_id), t.team_code, t.name, t.leader_name, t.type, String(t.total_workers), String(t.male_count), String(t.female_count)])
        };
    };

    const handleExportExcel = () => {
        const { filename, headers, rows } = getTabExportDef();
        downloadCSV(filename, headers, rows);
    };

    const handleImportTemplate = () => { showAlert('info', 'Import Template', 'กรุณา Download Template ก่อน แล้วกรอกข้อมูล จากนั้น Import ผ่านระบบ (Feature coming soon)'); };

    const renderProjectFilterDropdown = () => (
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
            <button onClick={handleDownloadTemplate} type="button" className="text-sm text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-md flex items-center font-medium transition-colors shadow-sm">
                <Download className="w-4 h-4 mr-1.5" /> Template
            </button>
            <button onClick={handleImportTemplate} type="button" className="text-sm text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-md flex items-center font-medium transition-colors">
                <Upload className="w-4 h-4 mr-1.5" /> Import
            </button>
            <button onClick={handleExportExcel} type="button" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-3 py-1.5 rounded-md flex items-center font-medium transition-colors">
                <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Export to Excel
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            <label className="text-sm font-medium text-gray-700">Filter by Project:</label>
            <select
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none font-medium"
                value={selectedProjectFilter}
                onChange={(e) => setSelectedProjectFilter(e.target.value)}
            >
                <option value="All">All Projects</option>
                {visibleProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.no}</option>
                ))}
            </select>
        </div>
    );

    const canAddProject = user?.role === 'Admin' || user?.role === 'MD';
    const canAddResource = user?.role === 'Admin' || user?.role === 'PM' || user?.role === 'CM';

    return (
        <div className="space-y-6">
            <AlertModal {...modalProps} />
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Project Workspace</h1>
                <p className="text-gray-500">Manage projects, supervisors, equipment, and worker teams.</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <CardStats title="Active Projects" value={visibleProjects.length} icon={Building2} colorClass="bg-blue-500" />
                <CardStats title="Supervisors" value={visibleSupervisors.length} icon={ShieldCheck} colorClass="bg-indigo-500" />
                <CardStats title="Equipment" value={visibleEquipments.length} icon={Wrench} colorClass="bg-orange-500" />
                <CardStats title="Worker Teams" value={visibleWorkerTeams.length} icon={Users} colorClass="bg-green-500" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-100 bg-gray-50/50 overflow-x-auto scrollbar-hide w-full">
                    {[
                        { id: 'A1', label: 'Projects', icon: Building2 },
                        { id: 'A2', label: 'Supervisors', icon: ShieldCheck },
                        { id: 'A3', label: 'Equipment', icon: Wrench },
                        { id: 'A4', label: 'Worker Teams', icon: Users },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors
                ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600 bg-white'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}
              `}
                        >
                            <tab.icon className="w-4 h-4 mr-2" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="relative w-full md:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {activeTab === 'A1' && canAddProject && (
                        <button
                            onClick={() => { closeModal(); setIsCreateModalOpen(true); }}
                            className="flex items-center justify-center w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                            <Plus className="w-4 h-4 mr-2" /> Create Project
                        </button>
                    )}
                </div>

                {/* Data Tables */}
                <div className="p-0 overflow-x-auto">
                    {activeTab === 'A1' && (
                        <table className="w-full text-left text-sm text-gray-600 text-nowrap">
                            <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3">Project No</th>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Location</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {visibleProjects.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{p.no}</td>
                                        <td className="px-6 py-4">{p.name}</td>
                                        <td className="px-6 py-4">{p.location}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => handleView(p)} className="text-blue-600 hover:text-blue-800 font-medium">View</button>
                                            {canAddProject && (
                                                <>
                                                    <span className="text-gray-300">|</span>
                                                    <button onClick={() => handleEdit(p)} className="text-orange-600 hover:text-orange-800 font-medium">Edit</button>
                                                    <span className="text-gray-300">|</span>
                                                    <button onClick={() => handleDelete(p)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {visibleProjects.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No projects found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'A2' && (
                        <div className="p-0 overflow-x-auto">
                            <div className="p-6 pb-2">
                                <SectionHeader
                                    title="A2. รายการ Supervisor"
                                    canAdd={canAddResource}
                                    icon={ShieldCheck}
                                    rightArea={renderProjectFilterDropdown()}
                                    onAdd={() => {
                                        setA2FormData(prev => ({ ...prev, project_id: currentProject?.id || '' }));
                                        setIsA2ModalOpen(true);
                                    }}
                                />
                            </div>
                            <table className="w-full text-left text-xs text-gray-700 text-nowrap">
                                <thead className="bg-slate-100 text-gray-700 border-b border-slate-200">
                                    <tr>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200 text-center w-10">#</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200">Project No.</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200">Supervisor Name</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200">Scope Type</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200">Start Work</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200">Finish Work</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200">รูปแบบการทำงาน</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200">Note</th>
                                        <th className="px-3 py-2 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredSupervisors.map((s, index) => (
                                        <tr key={s.id} className={`transition-colors hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                            <td className="px-3 py-1.5 border-r border-slate-100 text-center text-gray-500 font-medium">{index + 1}</td>
                                            <td className="px-3 py-1.5 border-r border-slate-100 font-semibold text-blue-700">{getProjectNo(s.project_id)}</td>
                                            <td className="px-3 py-1.5 border-r border-slate-100 text-gray-800">{s.name}</td>
                                            <td className="px-3 py-1.5 border-r border-slate-100">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">{s.scope_type}</span>
                                            </td>
                                            <td className="px-3 py-1.5 border-r border-slate-100 text-gray-600">{s.start_date || '-'}</td>
                                            <td className="px-3 py-1.5 border-r border-slate-100 text-gray-600">{s.finish_date || '-'}</td>
                                            <td className="px-3 py-1.5 border-r border-slate-100">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">{s.format}</span>
                                            </td>
                                            <td className="px-3 py-1.5 border-r border-slate-100 text-gray-500">{s.note || '-'}</td>
                                            <td className="px-3 py-1.5 text-right space-x-1">
                                                <button onClick={() => handleViewA2(s)} className="text-blue-600 hover:text-blue-800 font-medium">View</button>
                                                {canAddResource && (
                                                    <>
                                                        <span className="text-gray-300">|</span>
                                                        <button onClick={() => handleEditA2(s)} className="text-orange-600 hover:text-orange-800 font-medium">Edit</button>
                                                        <span className="text-gray-300">|</span>
                                                        <button onClick={() => handleDeleteA2(s)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {visibleSupervisors.length === 0 && (
                                        <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-400 bg-white">No supervisors found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'A3' && (
                        <div className="p-0 overflow-x-auto">
                            <div className="p-6 pb-2">
                                <SectionHeader
                                    title="A3. รายการเครื่องจักร"
                                    canAdd={canAddResource}
                                    icon={Wrench}
                                    rightArea={renderProjectFilterDropdown()}
                                    onAdd={() => {
                                        setA3FormData(prev => ({ ...prev, project_id: currentProject?.id || '' }));
                                        setIsA3ModalOpen(true);
                                    }}
                                />
                            </div>
                            <table className="w-full text-left text-xs text-gray-700 text-nowrap">
                                <thead className="bg-slate-100 text-gray-700 border-b border-slate-200">
                                    <tr>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200 text-center w-10">#</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200">Project No.</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200">EQM Name</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200">PO No.</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200 text-right">ยอดรวม PO</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200">Type</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200">การดูแลน้ำมัน</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200">Start Work</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200">Finish Work</th>
                                        <th className="px-3 py-2 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredEquipments.map((e, index) => (
                                        <tr key={e.id} className={`transition-colors hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                            <td className="px-3 py-1.5 border-r border-slate-100 text-center text-gray-500 font-medium">{index + 1}</td>
                                            <td className="px-3 py-1.5 border-r border-slate-100 font-semibold text-blue-700">{getProjectNo(e.project_id)}</td>
                                            <td className="px-3 py-1.5 border-r border-slate-100 text-gray-800 font-medium">{e.eqm_name}</td>
                                            <td className="px-3 py-1.5 border-r border-slate-100 text-gray-600">{e.po_no}</td>
                                            <td className="px-3 py-1.5 border-r border-slate-100 text-right font-semibold text-gray-800">{Number(e.total_po).toLocaleString()}</td>
                                            <td className="px-3 py-1.5 border-r border-slate-100">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${e.type === 'CMG EQM' ? 'bg-orange-100 text-orange-700' : 'bg-violet-100 text-violet-700'}`}>{e.type}</span>
                                            </td>
                                            <td className="px-3 py-1.5 border-r border-slate-100">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-700">{e.fuel_condition}</span>
                                            </td>
                                            <td className="px-3 py-1.5 border-r border-slate-100 text-gray-600">{e.start_date || '-'}</td>
                                            <td className="px-3 py-1.5 border-r border-slate-100 text-gray-600">{e.finish_date || '-'}</td>
                                            <td className="px-3 py-1.5 text-right space-x-1">
                                                <button onClick={() => handleViewA3(e)} className="text-blue-600 hover:text-blue-800 font-medium">View</button>
                                                {canAddResource && (
                                                    <>
                                                        <span className="text-gray-300">|</span>
                                                        <button onClick={() => handleEditA3(e)} className="text-orange-600 hover:text-orange-800 font-medium">Edit</button>
                                                        <span className="text-gray-300">|</span>
                                                        <button onClick={() => handleDeleteA3(e)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {visibleEquipments.length === 0 && (
                                        <tr><td colSpan={10} className="px-6 py-8 text-center text-gray-400 bg-white">No equipment found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'A4' && (
                        <div className="p-0 overflow-x-auto">
                            <div className="p-6 pb-2">
                                <SectionHeader
                                    title="A4: ตารางรายการ Worker team ของแต่ละโครงการ (Project Worker Team list)"
                                    canAdd={canAddResource}
                                    icon={Users}
                                    rightArea={renderProjectFilterDropdown()}
                                    onAdd={() => {
                                        setA4FormData(prev => ({ ...prev, project_id: currentProject?.id || '' }));
                                        setIsA4ModalOpen(true);
                                    }}
                                />
                            </div>
                            <table className="w-full text-left text-xs text-gray-700 text-nowrap">
                                <thead className="bg-slate-100 text-gray-700 border-b border-slate-200">
                                    <tr>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200 text-center w-10">#</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200">Project No.</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200">Team Code</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200">Worker Team Name</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200">หัวหน้าชุด</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200">Worker Type</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200 text-center">รวม</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200 text-center">ชาย</th>
                                        <th className="px-3 py-2 font-semibold border-r border-slate-200 text-center">หญิง</th>
                                        <th className="px-3 py-2 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredWorkerTeams.map((t, index) => (
                                        <tr key={t.id} className={`transition-colors hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                            <td className="px-3 py-1.5 border-r border-slate-100 text-center text-gray-500 font-medium">{index + 1}</td>
                                            <td className="px-3 py-1.5 border-r border-slate-100 font-semibold text-blue-700">{getProjectNo(t.project_id)}</td>
                                            <td className="px-3 py-1.5 border-r border-slate-100 font-medium text-gray-600">{t.team_code}</td>
                                            <td className="px-3 py-1.5 border-r border-slate-100 text-gray-800">{t.name}</td>
                                            <td className="px-3 py-1.5 border-r border-slate-100 text-gray-700">{t.leader_name}</td>
                                            <td className="px-3 py-1.5 border-r border-slate-100">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.type === 'DC CMG' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'}`}>
                                                    {t.type}
                                                </span>
                                            </td>
                                            <td className="px-3 py-1.5 border-r border-slate-100 text-center font-bold text-gray-800">{t.total_workers}</td>
                                            <td className="px-3 py-1.5 border-r border-slate-100 text-center text-blue-600">{t.male_count}</td>
                                            <td className="px-3 py-1.5 border-r border-slate-100 text-center text-pink-600">{t.female_count}</td>
                                            <td className="px-3 py-1.5 text-right space-x-1">
                                                <button onClick={() => handleViewA4(t)} className="text-blue-600 hover:text-blue-800 font-medium">View</button>
                                                {canAddResource && (
                                                    <>
                                                        <span className="text-gray-300">|</span>
                                                        <button onClick={() => handleEditA4(t)} className="text-orange-600 hover:text-orange-800 font-medium">Edit</button>
                                                        <span className="text-gray-300">|</span>
                                                        <button onClick={() => handleDeleteA4(t)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {visibleWorkerTeams.length === 0 && (
                                        <tr><td colSpan={10} className="px-6 py-8 text-center text-gray-400 bg-white">No worker teams found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* A4 Worker Teams Modal */}
            {isA4ModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">
                                {a4ViewMode ? "View Worker Team" : editingA4Id ? "Edit Worker Team" : "A4 เพิ่มข้อมูลผู้ดูแลทีมช่าง (Add Worker Team)"}
                            </h3>
                            <button onClick={closeA4Modal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Assignment</label>
                                    <select
                                        disabled={a4ViewMode}
                                        value={a4FormData.project_id}
                                        onChange={(e) => setA4FormData({ ...a4FormData, project_id: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-yellow-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    >
                                        <option value="">-- Select Project --</option>
                                        {visibleProjects.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.no} - {p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">WorkTeamCode</label>
                                    <input
                                        type="text"
                                        disabled={a4ViewMode}
                                        value={a4FormData.team_code}
                                        onChange={(e) => setA4FormData({ ...a4FormData, team_code: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-green-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Worker Team Name</label>
                                    <input
                                        type="text"
                                        disabled={a4ViewMode}
                                        value={a4FormData.name}
                                        onChange={(e) => setA4FormData({ ...a4FormData, name: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-green-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อหัวหน้าชุด (Leader Name)</label>
                                    <input
                                        type="text"
                                        disabled={a4ViewMode}
                                        value={a4FormData.leader_name}
                                        onChange={(e) => setA4FormData({ ...a4FormData, leader_name: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-green-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Worker Type</label>
                                    <select
                                        disabled={a4ViewMode}
                                        value={a4FormData.type}
                                        onChange={(e) => setA4FormData({ ...a4FormData, type: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-green-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    >
                                        <option value="DC CMG">DC CMG</option>
                                        <option value="Sub-Contractor">Sub-Contractor</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ผู้ชายกี่คน (Male Count)</label>
                                    <input
                                        type="number"
                                        disabled={a4ViewMode}
                                        value={a4FormData.male_count}
                                        onChange={(e) => setA4FormData({ ...a4FormData, male_count: Number(e.target.value) })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-green-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ผู้หญิงกี่คน (Female Count)</label>
                                    <input
                                        type="number"
                                        disabled={a4ViewMode}
                                        value={a4FormData.female_count}
                                        onChange={(e) => setA4FormData({ ...a4FormData, female_count: Number(e.target.value) })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-green-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>

                                <div className="md:col-span-2 bg-blue-50 p-3 rounded border border-blue-100 flex justify-between items-center text-blue-800">
                                    <span className="font-semibold">จำนวนคนงานทั้งหมด (Total Computed Workers):</span>
                                    <span className="font-bold text-xl">{Number(a4FormData.male_count) + Number(a4FormData.female_count)}</span>
                                </div>

                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                            <button onClick={closeA4Modal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                {a4ViewMode ? "Close" : "Cancel"}
                            </button>
                            {!a4ViewMode && (
                                <button
                                    onClick={handleSaveA4}
                                    disabled={isSaving}
                                    className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                    {isSaving ? 'Saving...' : editingA4Id ? 'Update' : 'Save'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Project Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">
                                {viewMode ? "View Project Information" : editingProjectId ? "Edit Project Information" : "A1 ข้อมูลโครงการ (Create Project)"}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Project No.</label>
                                    <input
                                        type="text"
                                        disabled={viewMode}
                                        value={formData.no}
                                        onChange={(e) => setFormData({ ...formData, no: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-yellow-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                                    <input
                                        type="text"
                                        disabled={viewMode}
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-yellow-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                    <input
                                        type="text"
                                        disabled={viewMode}
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="w-1/2 p-2 border border-gray-300 rounded-md bg-yellow-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Manager (PM)</label>
                                    <input
                                        type="text"
                                        disabled={viewMode}
                                        value={formData.pm_id}
                                        onChange={(e) => setFormData({ ...formData, pm_id: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-yellow-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Construction Manager (CM)</label>
                                    <input
                                        type="text"
                                        disabled={viewMode}
                                        value={formData.cm_id}
                                        onChange={(e) => setFormData({ ...formData, cm_id: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-yellow-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Start</label>
                                    <input
                                        type="date"
                                        disabled={viewMode}
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-yellow-50 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700 disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Finish</label>
                                    <input
                                        type="date"
                                        disabled={viewMode}
                                        value={formData.finish_date}
                                        onChange={(e) => setFormData({ ...formData, finish_date: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-yellow-50 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700 disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Main Contractor</label>
                                    <input
                                        type="text"
                                        disabled={viewMode}
                                        value={formData.main_contractor}
                                        onChange={(e) => setFormData({ ...formData, main_contractor: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-yellow-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Contractor</label>
                                    <input
                                        type="text"
                                        disabled={viewMode}
                                        value={formData.sub_contractor}
                                        onChange={(e) => setFormData({ ...formData, sub_contractor: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-yellow-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Client name</label>
                                    <input
                                        type="text"
                                        disabled={viewMode}
                                        value={formData.client_name}
                                        onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                        className="w-1/2 p-2 border border-gray-300 rounded-md bg-yellow-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Note</label>
                                    <textarea
                                        rows={4}
                                        disabled={viewMode}
                                        value={formData.project_note}
                                        onChange={(e) => setFormData({ ...formData, project_note: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-yellow-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                            <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                {viewMode ? "Close" : "Cancel"}
                            </button>
                            {!viewMode && (
                                <button
                                    onClick={handleSaveProject}
                                    disabled={isSaving}
                                    className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                    {isSaving ? 'Saving...' : editingProjectId ? 'Update Project' : 'Save Project'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* A2 Supervisor Modal */}
            {isA2ModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">
                                {a2ViewMode ? "View Supervisor" : editingA2Id ? "Edit Supervisor" : "A2 เพิ่มรายการ Supervisor (Add Supervisor)"}
                            </h3>
                            <button onClick={closeA2Modal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Assignment</label>
                                    <select
                                        disabled={a2ViewMode}
                                        value={a2FormData.project_id}
                                        onChange={(e) => setA2FormData({ ...a2FormData, project_id: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-yellow-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    >
                                        <option value="">-- Select Project --</option>
                                        {visibleProjects.length === 0 ? (
                                            <option value="" disabled>No projects available (Create in A1)</option>
                                        ) : (
                                            visibleProjects.map((p: any) => (
                                                <option key={p.id} value={p.id}>{p.no} - {p.name}</option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor Name</label>
                                    <select
                                        disabled={a2ViewMode || !a2FormData.project_id}
                                        value={a2FormData.name}
                                        onChange={(e) => setA2FormData({ ...a2FormData, name: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-cyan-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    >
                                        <option value="">-- Select Supervisor --</option>
                                        {usersList
                                            .filter(u => u.role === 'Supervisor')
                                            .filter(u => !a2FormData.project_id || (u.assigned_projects && u.assigned_projects.includes(a2FormData.project_id)))
                                            .map(u => (
                                                <option key={u.id} value={`${u.firstName} ${u.lastName}`}>{u.firstName} {u.lastName}</option>
                                            ))}
                                    </select>
                                    {!a2FormData.project_id && <p className="text-xs text-orange-500 mt-1">Please select a project first.</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Scope type</label>
                                    <select
                                        disabled={a2ViewMode}
                                        value={a2FormData.scope_type}
                                        onChange={(e) => setA2FormData({ ...a2FormData, scope_type: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-cyan-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    >
                                        <option value="Civil&Building">Civil&Building</option>
                                        <option value="Electrical">Electrical</option>
                                        <option value="HVAC">HVAC</option>
                                        <option value="Survey">Survey</option>
                                        <option value="Scaffolding">Scaffolding</option>
                                        <option value="other">other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start work</label>
                                    <input
                                        type="date"
                                        disabled={a2ViewMode}
                                        value={a2FormData.start_date}
                                        onChange={(e) => setA2FormData({ ...a2FormData, start_date: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-cyan-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500 text-gray-700"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Finish Work</label>
                                    <input
                                        type="date"
                                        disabled={a2ViewMode}
                                        value={a2FormData.finish_date}
                                        onChange={(e) => setA2FormData({ ...a2FormData, finish_date: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-cyan-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500 text-gray-700"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">รูปแบบการทำงาน (Work Format)</label>
                                    <select
                                        disabled={a2ViewMode}
                                        value={a2FormData.format}
                                        onChange={(e) => setA2FormData({ ...a2FormData, format: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-cyan-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    >
                                        <option value="OT">OT</option>
                                        <option value="Non-OT">Non-OT</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                                    <textarea
                                        rows={3}
                                        disabled={a2ViewMode}
                                        value={a2FormData.note}
                                        onChange={(e) => setA2FormData({ ...a2FormData, note: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-cyan-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                            <button onClick={closeA2Modal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                {a2ViewMode ? "Close" : "Cancel"}
                            </button>
                            {!a2ViewMode && (
                                <button
                                    onClick={handleSaveA2}
                                    disabled={isSaving}
                                    className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                    {isSaving ? 'Saving...' : editingA2Id ? 'Update' : 'Save'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* A3 Equipment Modal */}
            {isA3ModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">
                                {a3ViewMode ? "View Equipment" : editingA3Id ? "Edit Equipment" : "A3 เพิ่มรายการเครื่องจักร (Add Equipment)"}
                            </h3>
                            <button onClick={closeA3Modal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Assignment</label>
                                    <select
                                        disabled={a3ViewMode}
                                        value={a3FormData.project_id}
                                        onChange={(e) => setA3FormData({ ...a3FormData, project_id: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-yellow-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    >
                                        <option value="">-- Select Project --</option>
                                        {visibleProjects.length === 0 ? (
                                            <option value="" disabled>No projects available (Create in A1)</option>
                                        ) : (
                                            visibleProjects.map((p: any) => (
                                                <option key={p.id} value={p.id}>{p.no} - {p.name}</option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">EQM name</label>
                                    <input
                                        type="text"
                                        disabled={a3ViewMode}
                                        value={a3FormData.eqm_name}
                                        onChange={(e) => setA3FormData({ ...a3FormData, eqm_name: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-cyan-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">PO no.</label>
                                    <input
                                        type="text"
                                        disabled={a3ViewMode}
                                        value={a3FormData.po_no}
                                        onChange={(e) => setA3FormData({ ...a3FormData, po_no: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-cyan-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ยอดรวมของ PO (Total PO Amount)</label>
                                    <input
                                        type="number"
                                        disabled={a3ViewMode}
                                        value={a3FormData.total_po}
                                        onChange={(e) => setA3FormData({ ...a3FormData, total_po: Number(e.target.value) })}
                                        className="w-1/2 p-2 border border-gray-300 rounded-md bg-cyan-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select
                                        disabled={a3ViewMode}
                                        value={a3FormData.type}
                                        onChange={(e) => setA3FormData({ ...a3FormData, type: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-cyan-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    >
                                        <option value="CMG EQM">CMG EQM</option>
                                        <option value="Rental EQM">Rental EQM</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">การดูแลเรื่องน้ำมัน (Fuel condition)</label>
                                    <select
                                        disabled={a3ViewMode}
                                        value={a3FormData.fuel_condition}
                                        onChange={(e) => setA3FormData({ ...a3FormData, fuel_condition: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-cyan-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                    >
                                        <option value="รวมน้ำมัน">รวมน้ำมัน</option>
                                        <option value="CMGดูแลน้ำมัน">CMGดูแลน้ำมัน</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start work</label>
                                    <input
                                        type="date"
                                        disabled={a3ViewMode}
                                        value={a3FormData.start_date}
                                        onChange={(e) => setA3FormData({ ...a3FormData, start_date: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-cyan-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500 text-gray-700"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Finish Work</label>
                                    <input
                                        type="date"
                                        disabled={a3ViewMode}
                                        value={a3FormData.finish_date}
                                        onChange={(e) => setA3FormData({ ...a3FormData, finish_date: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-md bg-cyan-50 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500 text-gray-700"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                            <button onClick={closeA3Modal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                {a3ViewMode ? "Close" : "Cancel"}
                            </button>
                            {!a3ViewMode && (
                                <button
                                    onClick={handleSaveA3}
                                    disabled={isSaving}
                                    className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                    {isSaving ? 'Saving...' : editingA3Id ? 'Update' : 'Save'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
