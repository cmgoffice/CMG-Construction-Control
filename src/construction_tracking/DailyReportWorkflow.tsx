import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, Save, Send, AlertTriangle, MessageSquare, FileText, Edit3 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthRBACRouter';
import { col, docRef, storage, logActivity } from './firebase';
import { addDoc, onSnapshot, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import SWOCreationForm from './SWOCreationForm';
import { AlertModal, useAlert } from './AlertModal';

type ReportStatus = 'Pending CM' | 'Pending PM' | 'Approved' | 'Rejected';

const StatusBadge = ({ status, compact }: { status: ReportStatus; compact?: boolean }) => {
    const styles = {
        'Pending CM': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'Pending PM': 'bg-blue-100 text-blue-800 border-blue-200',
        'Approved': 'bg-green-100 text-green-800 border-green-200',
        'Rejected': 'bg-red-100 text-red-800 border-red-200'
    };

    const Icon = status === 'Approved' ? CheckCircle : status === 'Rejected' ? XCircle : Clock;

    if (compact) {
        return (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${styles[status]}`}>
                <Icon className="w-2.5 h-2.5 mr-0.5" />
                {status}
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
            <Icon className="w-3.5 h-3.5 mr-1.5" />
            {status}
        </span>
    );
};

export const DailyReportManager = () => {
    const { user } = useAuth();
    const { showAlert, showDelete, modalProps } = useAlert();
    const location = useLocation();
    const [selectedSwo, setSelectedSwo] = useState<any | null>(null);
    const [swos, setSwos] = useState<any[]>([]);
    const [supervisors, setSupervisors] = useState<any[]>([]);
    const [equipmentsList, setEquipmentsList] = useState<any[]>([]);
    const [allTeamsList, setAllTeamsList] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [dailyReports, setDailyReports] = useState<any[]>([]);

    React.useEffect(() => {
        const q1 = query(col("site_work_orders"));
        const unsub1 = onSnapshot(q1, (snapshot) => setSwos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

        const q2 = query(col("project_supervisors"));
        const unsub2 = onSnapshot(q2, (snapshot) => setSupervisors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

        const q3 = query(col("project_equipments"));
        const unsub3 = onSnapshot(q3, (snapshot) => setEquipmentsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

        const q4 = query(col("project_worker_teams"));
        const unsub4 = onSnapshot(q4, (snapshot) => setAllTeamsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

        const q5 = query(col("projects"));
        const unsub5 = onSnapshot(q5, (snapshot) => setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

        const q6 = query(col("daily_reports"));
        const unsub6 = onSnapshot(q6, (snapshot) => setDailyReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

        return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); };
    }, []);

    // Auto-select SWO from notification navigation state
    const navTargetId = (location.state as any)?.targetId;
    React.useEffect(() => {
        if (!navTargetId || swos.length === 0) return;
        const target = swos.find(s => s.id === navTargetId);
        if (target) {
            setSelectedSwo(target);
            // Clear state so back-navigation doesn't re-trigger
            window.history.replaceState({}, '');
        }
    }, [navTargetId, swos]);

    // Helper: resolve Project No from project_id (Firebase doc ID → human project_no)
    const getProjectNo = (projectId: string) => {
        const proj = projects.find(p => p.id === projectId);
        return proj?.no || projectId || 'Unknown';
    };

    // Date filter state (declared early because swoList computation depends on it)
    const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
    
    // Get unique dates from daily reports for the main date filter dropdown
    const availableDates = Array.from(new Set(dailyReports.map(r => r.date).filter(Boolean))).sort((a, b) => b.localeCompare(a)); // Sort dates descending (newest first)

    // Format SWO List Data for the table
    // When date filter is active, scope data to reports ON OR BEFORE that date
    const swoList = swos.map(swo => {
        const supData = supervisors.find(s => s.id === swo.supervisor_id);
        const supervisorName = supData ? supData.name : 'Unknown';
        const projectNo = getProjectNo(swo.project_id);

        // Get all daily reports for this SWO, scoped by date filter
        const allSwoReports = dailyReports
            .filter(r => r.swo_id === swo.id)
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        // If date filter is active: only consider reports on or before that date
        const scopedReports = selectedDateFilter
            ? allSwoReports.filter(r => r.date <= selectedDateFilter)
            : allSwoReports;

        // Task Status: from the latest report within scope
        const latestReport = scopedReports[0];
        const taskStatus = latestReport?.status || 'Draft';

        // Previous Report Date: latest report's date within scope
        const prevDate = latestReport?.date || '-';

        // C1 Progress: sum 'today' from ALL approved reports (cumulative total across all days)
        const allApprovedInScope = scopedReports.filter(r => r.status === 'Approved');
        let c1Prog = '0.0%';
        if (allApprovedInScope.length > 0) {
            // totalRequired: from SWO activities definition
            const totalRequired = (swo.activities || []).reduce((s: number, a: any) => s + (Number(a.qty_total) || 0), 0);
            // upToDate: sum of 'today' across all approved reports
            const cumulativeTotals: Record<string, number> = {};
            allApprovedInScope.forEach(r => {
                (r.activities || []).forEach((act: any) => {
                    cumulativeTotals[act.id] = (cumulativeTotals[act.id] || 0) + (Number(act.today) || 0);
                });
            });
            const upToDate = Object.values(cumulativeTotals).reduce((s: number, v) => s + v, 0);
            const pct = totalRequired > 0 ? Math.min(100, (upToDate / totalRequired) * 100) : 0;
            c1Prog = pct.toFixed(1) + '%';
        }

        return {
            id: swo.id,
            project_id_raw: swo.project_id,
            project_no: projectNo,
            status: swo.status || 'Active',
            closure_status: swo.closure_status || null,
            task_status: taskStatus,
            prev_date: prevDate,
            supervisor: supervisorName,
            swo_no: swo.swo_no,
            scope: swo.work_name,
            c1_prog: c1Prog,
            supervisor_name: supervisorName
        };
    });

    const filteredByUser = swoList.filter(swo => {
        if (!user) return false;
        // Exclude SWOs with Draft status from the table
        if (swo.status === 'Draft') return false;
        if (user.role === 'Admin' || user.role === 'MD' || user.role === 'GM' || user.role === 'CD') return true;
        if (user.role === 'Supervisor') return swo.supervisor_name === (user as any).name;
        return user.assigned_projects?.includes(swo.project_id_raw);
    });

    // Filter states
    const availableProjects = Array.from(new Set(filteredByUser.map(swo => swo.project_no)));
    const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('All');
    const availableSupervisors = Array.from(new Set(filteredByUser.map(swo => swo.supervisor).filter(Boolean)));
    const [selectedSupervisorFilter, setSelectedSupervisorFilter] = useState<string>('All');

    // Final filter: date checks ALL reports for this SWO, project and supervisor match directly
    const visibleSwoList = filteredByUser.filter(swo => {
        const matchProject = selectedProjectFilter === 'All' || swo.project_no === selectedProjectFilter;
        const matchSupervisor = selectedSupervisorFilter === 'All' || swo.supervisor === selectedSupervisorFilter;
        // Date filter: show SWOs that have ANY daily report on the selected date OR SWOs with no reports (Draft status)
        const hasReports = dailyReports.some(r => r.swo_id === swo.id);
        const matchDate = !selectedDateFilter || 
                         dailyReports.some(r => r.swo_id === swo.id && r.date === selectedDateFilter) ||
                         !hasReports; // Include SWOs with no reports (Draft status)
        return matchProject && matchSupervisor && matchDate;
    });

    const isReadOnly = user?.role !== 'Supervisor' && user?.role !== 'Admin';

    const handleDeleteSwo = (swoId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        showDelete('ลบ SWO?', 'การลบไม่สามารถย้อนกลับได้', async () => {
            try {
                await deleteDoc(docRef("site_work_orders", swoId));
                showAlert('success', 'ลบสำเร็จ', 'SWO ถูกลบเรียบร้อยแล้ว');
            } catch (error: any) {
                showAlert('error', 'ลบไม่สำเร็จ', error.message);
            }
        });
    };

    // Task status badge styling helper
    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'Draft': 'bg-gray-100 text-gray-600',
            'Pending CM': 'bg-yellow-100 text-yellow-700',
            'Pending PM': 'bg-blue-100 text-blue-700',
            'Approved': 'bg-green-100 text-green-700',
            'Rejected': 'bg-red-100 text-red-700',
        };
        return styles[status] || 'bg-gray-100 text-gray-600';
    };

    if (selectedSwo) {
        if (selectedSwo.status === 'Assigned' && user?.role === 'Supervisor' && !selectedSwo.pending_change_acceptance) {
            return <SwoAcceptanceView
                swo={selectedSwo}
                allEquipments={equipmentsList}
                allTeams={allTeamsList}
                onBack={() => setSelectedSwo(null)}
                onActionComplete={() => setSelectedSwo(null)}
            />;
        }

        // Non-Supervisor viewing an Assigned SWO: show view-only notice
        if (selectedSwo.status === 'Assigned' && user?.role !== 'Supervisor') {
            return (
                <div className="max-w-4xl mx-auto space-y-6 pb-12">
                    <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedSwo(null)} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Site Work Order</h1>
                                <p className="text-gray-500 mt-1">SWO: <span className="font-semibold text-gray-700">{selectedSwo.swo_no} - {selectedSwo.work_name}</span></p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
                        <div className="text-5xl mb-4">⏳</div>
                        <h2 className="text-xl font-bold text-blue-800 mb-2">รอ Supervisor รับงาน</h2>
                        <p className="text-blue-600 text-sm">SWO นี้ยังอยู่ในสถานะ <span className="font-bold bg-blue-100 px-2 py-0.5 rounded-full">Assigned</span></p>
                        <p className="text-blue-500 text-sm mt-1">ไม่สามารถดำเนินการใดได้จนกว่า Supervisor จะยืนยันรับงาน หรือขอแก้ไข</p>
                    </div>
                </div>
            );
        }

        if ((user?.role === 'Admin' || user?.role === 'PM') && selectedSwo.status === 'Request Change') {
            return <SWOCreationForm editSwo={selectedSwo} onCancelEdit={() => setSelectedSwo(null)} />;
        }

        return <DailyReportForm
            onBack={() => setSelectedSwo(null)}
            swo={selectedSwo}
            onSwoAccepted={() => setSelectedSwo((prev: any) => prev ? { ...prev, status: 'Accepted', pending_change_acceptance: false } : null)}
            allEquipments={equipmentsList}
            allTeams={allTeamsList}
            initialDate={selectedDateFilter || undefined}
        />;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <AlertModal {...modalProps} />
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 flex-wrap bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h1 className="text-lg font-bold text-gray-900">Site Work Order list (SWO)</h1>
                    <p className="text-gray-500 text-xs mt-0.5">Select an SWO below to complete your Daily Progress Report.</p>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 flex-wrap">
                    {/* Date Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">📅 Date:</label>
                        <select
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 outline-none font-medium"
                            value={selectedDateFilter}
                            onChange={(e) => setSelectedDateFilter(e.target.value)}
                        >
                            <option value="">All Dates</option>
                            {availableDates.map(date => (
                                <option key={date} value={date}>{date}</option>
                            ))}
                        </select>
                        {selectedDateFilter && (
                            <button
                                onClick={() => setSelectedDateFilter('')}
                                className="text-xs text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Project Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter by Project:</label>
                        <select
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none font-medium min-w-[150px]"
                            value={selectedProjectFilter}
                            onChange={(e) => setSelectedProjectFilter(e.target.value)}
                        >
                            <option value="All">All Projects</option>
                            {availableProjects.map(projNo => (
                                <option key={projNo} value={projNo}>{projNo}</option>
                            ))}
                        </select>
                    </div>

                    {/* Supervisor Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter by Supervisor:</label>
                        <select
                            className="bg-gray-50 border border-gray-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none font-medium min-w-[150px]"
                            value={selectedSupervisorFilter}
                            onChange={(e) => setSelectedSupervisorFilter(e.target.value)}
                        >
                            <option value="All">All Supervisors</option>
                            {availableSupervisors.map(sup => (
                                <option key={sup} value={sup}>{sup}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Group by project: one table per project; hide table if project has no items */}
            {(() => {
                const byProject = visibleSwoList.reduce((acc, item) => {
                    const p = item.project_no || 'Unknown';
                    if (!acc[p]) acc[p] = []; acc[p].push(item); return acc;
                }, {} as Record<string, typeof visibleSwoList>);
                const projectOrder = Object.keys(byProject).sort();
                if (projectOrder.length === 0) {
                    return (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="px-6 py-12 text-center text-gray-400 italic">No SWO found with current filters</div>
                        </div>
                    );
                }
                return (
                    <div className="space-y-8">
                        {projectOrder.map(projectNo => {
                            const rows = byProject[projectNo];
                            if (!rows || rows.length === 0) return null;
                            return (
                                <div key={projectNo} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="px-3 py-1.5 bg-[#CCE5FF] border-b border-gray-200 font-semibold text-gray-800 text-[10px] md:text-xs">
                                        โครงการ: {projectNo} <span className="text-gray-500 font-normal ml-2">({rows.length} รายการ)</span>
                                    </div>

                                    {/* Mobile: card list */}
                                    <div className="md:hidden divide-y divide-gray-100">
                                        {rows.map(item => (
                                            <div
                                                key={item.id}
                                                onClick={() => setSelectedSwo(swos.find(s => s.id === item.id))}
                                                className="p-3 active:bg-gray-50 transition-colors cursor-pointer"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[10px] text-gray-500">Project No. / SWO no.</p>
                                                        <p className="text-xs font-medium text-gray-900 truncate">{item.project_no} · {item.swo_no}</p>
                                                        <p className="text-[10px] text-gray-500 mt-1">Work Name/Scope</p>
                                                        <p className="text-xs text-gray-800 truncate">{item.scope}</p>
                                                    </div>
                                                    <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${parseFloat(item.c1_prog) >= 100 ? 'bg-green-100 text-green-700' : parseFloat(item.c1_prog) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {item.c1_prog}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${item.closure_status ? 'text-red-700 bg-red-50' : item.status === 'Accepted' ? 'text-green-600 bg-green-50' : item.status === 'Assigned' ? 'text-blue-600 bg-blue-50' : item.status === 'Request Change' ? 'text-orange-600 bg-orange-50' : item.status === 'Draft' ? 'text-purple-600 bg-purple-50' : 'text-gray-600 bg-gray-100'}`}>
                                                        {item.closure_status ? `Closed - ${item.closure_status}` : item.status}
                                                    </span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${getStatusBadge(item.task_status)}`}>{item.task_status}</span>
                                                </div>
                                                <div className="flex items-center justify-between mt-1.5 text-[10px] text-gray-500">
                                                    <span>รายงานล่าสุด: {item.prev_date}</span>
                                                    <span className="truncate max-w-[45%]" title={item.supervisor}>{item.supervisor}</span>
                                                </div>
                                                {(user?.role === 'Admin' || user?.role === 'PM') && (
                                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteSwo(item.id, e); }}
                                                            className="text-red-500 hover:text-red-700 text-[10px] font-semibold"
                                                        >
                                                            ลบ SWO
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Desktop: table */}
                                    <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-sm text-center table-fixed min-w-[700px]">
                                        <thead className="text-gray-800 border-b border-gray-300">
                                            <tr>
                                                <th className="px-3 py-1.5 text-xs font-semibold bg-[#CCE5FF] border-r border-gray-300 w-[10%]">Project No.</th>
                                                <th className="px-3 py-1.5 text-xs font-semibold bg-[#00FFFF] border-r border-gray-300 w-[9%]">SWO Status</th>
                                                <th className="px-3 py-1.5 text-xs font-semibold bg-[#E0E0FF] border-r border-gray-300 w-[9%]">Task Status</th>
                                                <th className="px-3 py-1.5 text-xs font-semibold bg-[#FFE6CC] border-r border-gray-300 w-[11%]">Previous Report Date</th>
                                                <th className="px-3 py-1.5 text-xs font-semibold bg-[#FFE6CC] border-r border-gray-300 w-[12%]">Supervisor Name</th>
                                                <th className="px-3 py-1.5 text-xs font-semibold bg-[#FFE6CC] border-r border-gray-300 w-[10%]">SWO no.</th>
                                                <th className="px-3 py-1.5 text-xs font-semibold bg-[#FFE6CC] border-r border-gray-300 w-[22%]">Work Name/Scope</th>
                                                <th className="px-3 py-1.5 text-xs font-semibold bg-[#FFE6CC] border-r border-gray-300 w-[9%]">C1 Progress %</th>
                                                {(user?.role === 'Admin' || user?.role === 'PM') && (
                                                    <th className="px-3 py-1.5 text-xs font-semibold bg-[#FFE6CC] w-[8%]">Actions</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {rows.map(item => (
                                                <tr key={item.id} onClick={() => setSelectedSwo(swos.find(s => s.id === item.id))} className="hover:bg-gray-100 transition-colors cursor-pointer group">
                                                    <td className="px-3 py-1.5 border-r border-gray-200 bg-[#E6F2FF] group-hover:bg-[#cce6ff] text-xs font-medium truncate" title={item.project_no}>{item.project_no}</td>
                                                    <td className="px-2 py-1 border-r border-gray-200 bg-[#E6FFFF] group-hover:bg-[#ccffff] align-top min-w-0">
                                                        <span className={`inline-block font-medium text-[10px] leading-tight px-1.5 py-0.5 rounded ${item.closure_status
                                                            ? 'text-red-700 bg-red-50'
                                                            : item.status === 'Accepted' ? 'text-green-600' :
                                                                item.status === 'Assigned' ? 'text-blue-600 bg-blue-50' :
                                                                    item.status === 'Request Change' ? 'text-orange-600 bg-orange-50' :
                                                                        'text-gray-600'
                                                            }`}>
                                                            {item.closure_status ? (
                                                                <>
                                                                    <span className="block font-bold">Closed</span>
                                                                    <span className="block truncate" title={item.closure_status}>{item.closure_status}</span>
                                                                </>
                                                            ) : item.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-1.5 border-r border-gray-200 bg-[#F0F0FF] group-hover:bg-[#e0e0ff] whitespace-nowrap">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusBadge(item.task_status)}`}>
                                                            {item.task_status}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-1.5 border-r border-gray-200 bg-[#FFF5EE] group-hover:bg-[#ffe8d6] text-xs whitespace-nowrap">{item.prev_date}</td>
                                                    <td className="px-3 py-1.5 border-r border-gray-200 bg-[#FFF5EE] group-hover:bg-[#ffe8d6] text-xs truncate" title={item.supervisor}>{item.supervisor}</td>
                                                    <td className="px-3 py-1.5 border-r border-gray-200 bg-[#FFF5EE] group-hover:bg-[#ffe8d6] text-xs font-medium whitespace-nowrap">{item.swo_no}</td>
                                                    <td className="px-3 py-1.5 border-r border-gray-200 bg-[#FFF5EE] group-hover:bg-[#ffe8d6] text-left text-xs truncate max-w-0" title={item.scope}>{item.scope}</td>
                                                    <td className="px-3 py-1.5 bg-[#FFF5EE] group-hover:bg-[#ffe8d6]">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${parseFloat(item.c1_prog) >= 100 ? 'bg-green-100 text-green-700' : parseFloat(item.c1_prog) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            {item.c1_prog}
                                                        </span>
                                                    </td>
                                                    {(user?.role === 'Admin' || user?.role === 'PM') && (
                                                        <td className="px-3 py-1.5 bg-[#FFF5EE] group-hover:bg-[#ffe8d6]">
                                                            <button
                                                                onClick={(e) => handleDeleteSwo(item.id, e)}
                                                                className="text-red-500 hover:text-red-700 bg-white border border-red-200 hover:bg-red-50 px-2 py-0.5 rounded-md transition-colors text-xs font-semibold"
                                                            >
                                                                Delete
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })()}
        </div>
    );
};

// --- Supervisor SWO Acceptance View ---
export const SwoAcceptanceView = ({ swo, allEquipments = [], allTeams = [], onBack, onActionComplete }: { swo: any, allEquipments?: any[], allTeams?: any[], onBack: () => void, onActionComplete: () => void }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [changeReason, setChangeReason] = useState("");
    const { showAlert, modalProps } = useAlert();

    const handleAccept = async () => {
        setIsSubmitting(true);
        try {
            await updateDoc(docRef("site_work_orders", swo.id), { status: 'Accepted' });
            showAlert('success', 'รับ SWO สำเร็จ', 'คุณสามารถเริ่มส่ง Daily Report ได้แล้ว');
            onActionComplete();
        } catch (e: any) {
            showAlert('error', 'เกิดข้อผิดพลาด', e.message);
        }
        setIsSubmitting(false);
    };

    const handleRequestChange = async () => {
        if (!changeReason.trim()) {
            showAlert('warning', 'กรุณาระบุเหตุผล', 'กรุณากรอกเหตุผลในการขอแก้ไขก่อนส่ง');
            return;
        }

        setIsSubmitting(true);
        try {
            await updateDoc(docRef("site_work_orders", swo.id), {
                status: 'Request Change',
                change_reason: changeReason
            });
            showAlert('success', 'ส่งคำขอแก้ไขแล้ว', 'คำขอแก้ไขถูกส่งไปยัง PM/CM แล้ว');
            onActionComplete();
        } catch (e: any) {
            showAlert('error', 'เกิดข้อผิดพลาด', e.message);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <AlertModal {...modalProps} />
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <button onClick={onBack} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors shrink-0">
                    <span className="sr-only">Back</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">New SWO Assignment</h1>
                    <p className="text-gray-500 mt-1">Please review the details below before accepting.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 flex gap-4 items-start">
                    <AlertTriangle className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-blue-900">SWO No: {swo.swo_no}</h3>
                        <p className="text-blue-800 mt-1"><strong>Scope:</strong> {swo.work_name}</p>
                        <div className="flex flex-col sm:flex-row gap-4 mt-3">
                            <div className="flex items-center gap-2 text-blue-700">
                                <span className="font-semibold">Start Date:</span>
                                <span className="bg-blue-100 px-2 py-1 rounded text-sm font-medium">
                                    {swo.start_date || 'Not specified'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-blue-700">
                                <span className="font-semibold">End Date:</span>
                                <span className="bg-blue-100 px-2 py-1 rounded text-sm font-medium">
                                    {swo.finish_date || 'Not specified'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <h4 className="font-bold text-gray-800 border-b-2 border-gray-100 pb-2 mb-4">Assigned Activities</h4>
                        <ul className="space-y-3 text-sm">
                            {swo.activities?.map((a: any, i: number) => (
                                <li key={i} className="flex flex-col sm:flex-row justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 gap-2">
                                    <span className="font-medium text-gray-700">{a.description || 'Unknown'}</span>
                                    <span className="font-bold text-gray-900 bg-white px-3 py-1 rounded shadow-sm border border-gray-200 break-keep whitespace-nowrap">{a.qty_total} {a.unit}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 border-b-2 border-gray-100 pb-2 mb-4">Assigned Equipment</h4>
                        <ul className="space-y-3 text-sm">
                            {swo.equipmentList?.map((e: any, i: number) => {
                                // Resolve EQM Name
                                const foundEqm = allEquipments.find(eq => eq.id === e.equipment_id);
                                const eqmName = foundEqm ? foundEqm.eqm_name : e.equipment_id || 'Unknown EQM';
                                return (
                                    <li key={i} className="bg-gray-50 p-3 rounded-lg border border-gray-100 font-medium text-gray-700 flex items-center gap-3">
                                        <div className="p-2 bg-orange-100 text-orange-600 rounded-md shrink-0">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </div>
                                        {eqmName}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>

                <div>
                    <h4 className="font-bold text-gray-800 border-b-2 border-gray-100 pb-2 mb-4">Assigned Worker Teams</h4>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-3 font-semibold text-gray-700">Team / Leader Name</th>
                                    <th className="p-3 font-semibold text-gray-700 text-center">Type</th>
                                    <th className="p-3 font-semibold text-gray-700 text-center">Total Workers</th>
                                    <th className="p-3 font-semibold text-gray-700 text-center">Male</th>
                                    <th className="p-3 font-semibold text-gray-700 text-center">Female</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {swo.teamList?.map((t: any, i: number) => {
                                    const foundTeam = allTeams.find(tm => tm.id === t.team_id);
                                    const teamName = foundTeam ? `${foundTeam.name} / ${foundTeam.leader_name}` : t.team_id || 'Unknown Team';
                                    const workerType = foundTeam ? foundTeam.type || '-' : '-';
                                    const totalWorkers = foundTeam ? foundTeam.total_workers || '-' : '-';
                                    const maleWorkers = foundTeam ? foundTeam.male_count || '-' : '-';
                                    const femaleWorkers = foundTeam ? foundTeam.female_count || '-' : '-';

                                    return (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="p-3 font-medium text-gray-800">{teamName}</td>
                                            <td className="p-3 text-center">{workerType}</td>
                                            <td className="p-3 text-center font-semibold bg-gray-50/50">{totalWorkers}</td>
                                            <td className="p-3 text-center text-blue-600 bg-blue-50/20">{maleWorkers}</td>
                                            <td className="p-3 text-center text-pink-600 bg-pink-50/20">{femaleWorkers}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {swo.additional_notes && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">
                        <h4 className="font-bold text-yellow-800 flex items-center mb-2">
                            <FileText className="w-5 h-5 mr-2" />
                            Additional Notes & Instructions
                        </h4>
                        <p className="text-yellow-900 whitespace-pre-wrap text-sm">{swo.additional_notes}</p>
                    </div>
                )}

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-5">
                    <h4 className="font-bold text-orange-800 flex items-center mb-2">
                        <MessageSquare className="w-5 h-5 mr-2" />
                        Supervisor Notes (Required for Request Change)
                    </h4>
                    <p className="text-sm text-orange-700 mb-2">If you need to request changes to this SWO, please detail the reasons below.</p>
                    <textarea
                        className="w-full p-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        rows={3}
                        placeholder="Type your notes or reasons for revision here..."
                        value={changeReason}
                        onChange={(e) => setChangeReason(e.target.value)}
                    />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
                    <button
                        onClick={handleRequestChange}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 border-2 border-orange-200 text-orange-700 hover:bg-orange-50 font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                        Request Change
                    </button>
                    <button
                        onClick={handleAccept}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center"
                    >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Acknowledge / Accept SWO
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Supervisor: Accept PM's quantity/scope change (after PM approved change request) ---
export const SwoChangeAcceptanceView = ({ swo, onBack, onActionComplete }: { swo: any, onBack: () => void, onActionComplete: () => void }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showAlert, modalProps } = useAlert();

    const handleAcceptChange = async () => {
        setIsSubmitting(true);
        try {
            await updateDoc(docRef("site_work_orders", swo.id), { status: 'Accepted', pending_change_acceptance: false });
            showAlert('success', 'ยอมรับการแก้ไขแล้ว', 'คุณสามารถส่ง Daily Report ได้ตามปกติ');
            onActionComplete();
        } catch (e: any) {
            showAlert('error', 'เกิดข้อผิดพลาด', e.message);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <AlertModal {...modalProps} />
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <button onClick={onBack} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors shrink-0">
                    <span className="sr-only">Back</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">ยอมรับการแก้ไขปริมาณงาน</h1>
                    <p className="text-gray-500 mt-1">SWO: <span className="font-semibold text-gray-700">{swo.swo_no} - {swo.work_name}</span></p>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex gap-4 items-start">
                    <Edit3 className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-amber-900">มีการแก้ไขปริมาณงาน (C1/C2/C3)</h3>
                        <p className="text-amber-800 mt-1">PM ได้อนุมัติคำขอแก้ไขและอัปเดตปริมาณงาน/ราคาแล้ว กรุณายอมรับการแก้ไขเพื่อส่ง Daily Report ได้ตามปกติ</p>
                    </div>
                </div>
                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleAcceptChange}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <CheckCircle className="w-5 h-5" />
                        ยอมรับการแก้ไข
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Supervisor's Daily Report Form ---
export const DailyReportForm = ({ onBack, swo, onSwoAccepted, allEquipments = [], allTeams = [], initialDate }: { onBack?: () => void, swo: any, onSwoAccepted?: () => void, allEquipments?: any[], allTeams?: any[], initialDate?: string }) => {
    const { user } = useAuth();
    const { showAlert, modalProps: formModalProps } = useAlert();

    // --- Date navigation ---
    // Helper: format date as YYYY-MM-DD using LOCAL timezone (not UTC)
    const toLocalDateStr = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const todayStr = toLocalDateStr(new Date());
    const yesterdayStr = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return toLocalDateStr(d);
    })();
    const [selectedDate, setSelectedDate] = useState(initialDate || todayStr);

    // Fetch all daily reports for this SWO to get available dates
    const [allSwoReports, setAllSwoReports] = useState<any[]>([]);
    React.useEffect(() => {
        const q = query(
            col("daily_reports"),
            where("swo_id", "==", swo.id)
        );
        const unsub = onSnapshot(q, (snapshot) => {
            const reports = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setAllSwoReports(reports);
        });
        return unsub;
    }, [swo.id]);

    // Get available dates with reports, sorted
    const availableReportDates = Array.from(new Set(allSwoReports.map(r => r.date).filter(Boolean))).sort();

    const goToPrevDay = () => {
        const currentIndex = availableReportDates.indexOf(selectedDate);
        if (currentIndex > 0) {
            setSelectedDate(availableReportDates[currentIndex - 1]);
        } else if (currentIndex === -1 && availableReportDates.length > 0) {
            // If current date is not in available dates, go to the latest available date before current
            const earlierDates = availableReportDates.filter(date => date < selectedDate);
            if (earlierDates.length > 0) {
                setSelectedDate(earlierDates[earlierDates.length - 1]);
            }
        }
    };

    const goToNextDay = () => {
        const currentIndex = availableReportDates.indexOf(selectedDate);
        if (currentIndex >= 0 && currentIndex < availableReportDates.length - 1) {
            setSelectedDate(availableReportDates[currentIndex + 1]);
        } else if (currentIndex === -1 && availableReportDates.length > 0) {
            // If current date is not in available dates, go to the earliest available date after current
            const laterDates = availableReportDates.filter(date => date > selectedDate && date <= todayStr);
            if (laterDates.length > 0) {
                setSelectedDate(laterDates[0]);
            }
        }
    };

    // Navigation constraints: only allow navigation to dates with actual reports
    const canGoPrevDay = (() => {
        const currentIndex = availableReportDates.indexOf(selectedDate);
        if (currentIndex > 0) return true;
        if (currentIndex === -1) {
            const earlierDates = availableReportDates.filter(date => date < selectedDate);
            return earlierDates.length > 0;
        }
        return false;
    })();

    const canGoNextDay = (() => {
        const currentIndex = availableReportDates.indexOf(selectedDate);
        if (currentIndex >= 0 && currentIndex < availableReportDates.length - 1) {
            const nextDate = availableReportDates[currentIndex + 1];
            return nextDate <= todayStr;
        }
        if (currentIndex === -1) {
            const laterDates = availableReportDates.filter(date => date > selectedDate && date <= todayStr);
            return laterDates.length > 0;
        }
        return false;
    })();

    // Rejected report: editable for 2 days from rejected_at (Supervisor only)
    const isRejectedWithinTwoDays = (report: any): boolean => {
        const at = report?.rejected_at;
        if (!at) return false;
        const rejectedDate = new Date(String(at).slice(0, 10) + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        rejectedDate.setHours(0, 0, 0, 0);
        const diffMs = today.getTime() - rejectedDate.getTime();
        const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        return diffDays >= 0 && diffDays <= 2;
    };

    // --- Projects query (to resolve project_no for report data) ---
    const [projects, setProjects] = useState<any[]>([]);
    React.useEffect(() => {
        const q = query(col("projects"));
        const unsub = onSnapshot(q, (snapshot) => setProjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
        return unsub;
    }, []);
    const getProjectNo = (projectId: string) => {
        const proj = projects.find(p => p.id === projectId);
        return proj?.no || projectId || 'Unknown';
    };

    // --- Existing report for selected date ---
    const [existingReport, setExistingReport] = useState<any>(null);
    const [prevApprovedReport, setPrevApprovedReport] = useState<any>(null);
    const [dataLoaded, setDataLoaded] = useState(false);

    // Query: Is there already a report for this SWO on selectedDate?
    React.useEffect(() => {
        setDataLoaded(false);
        const q = query(
            col("daily_reports"),
            where("swo_id", "==", swo.id),
            where("date", "==", selectedDate)
        );
        const unsub = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const d = snapshot.docs[0];
                setExistingReport({ id: d.id, ...d.data() });
            } else {
                setExistingReport(null);
            }
            setDataLoaded(true);
        });
        return unsub;
    }, [swo.id, selectedDate]);

    // Query: ALL Approved reports before selectedDate → for cumulative Prev Total
    // We store all of them so we can sum 'today' across all days (not trust stale prev_total in DB)
    const [allPrevApprovedReports, setAllPrevApprovedReports] = React.useState<any[]>([]);
    React.useEffect(() => {
        const q = query(
            col("daily_reports"),
            where("swo_id", "==", swo.id),
            where("status", "==", "Approved")
        );
        const unsub = onSnapshot(q, (snapshot) => {
            const approved = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                .filter(r => r.date < selectedDate)
                .sort((a, b) => a.date.localeCompare(b.date));
            setAllPrevApprovedReports(approved);
            // Keep prevApprovedReport as latest (for equipment/workers fallback)
            setPrevApprovedReport(approved.length > 0 ? approved[approved.length - 1] : null);
        });
        return unsub;
    }, [swo.id, selectedDate]);

    // Compute cumulative prev_total per activity by summing 'today' across ALL approved reports before selectedDate
    const computeCumulativePrevTotals = (): Record<string, number> => {
        const totals: Record<string, number> = {};
        allPrevApprovedReports.forEach(report => {
            (report.activities || []).forEach((act: any) => {
                totals[act.id] = (totals[act.id] || 0) + (Number(act.today) || 0);
            });
        });
        return totals;
    };

    // --- Form State: C1, C2, C3 ---
    const buildFreshActivities = () => {
        const cumulative = computeCumulativePrevTotals();
        return (swo?.activities || []).map((a: any) => ({
            ...a,
            desc: a.description || 'Unknown',
            total: Number(a.qty_total) || 1,
            prev_total: cumulative[a.id] || 0,
            today: ''
        }));
    };

    // Rebuild activities: always recalculate prev_total from cumulative sum of all approved reports
    // Keeps the saved today values so supervisor's input is preserved
    const buildExistingActivities = (savedActs: any[]) => {
        const cumulative = computeCumulativePrevTotals();
        return (swo?.activities || []).map((a: any) => {
            const savedAct = savedActs.find((sa: any) => sa.id === a.id);
            const today = savedAct ? String(savedAct.today ?? '') : '';
            return { ...a, desc: a.description || 'Unknown', total: Number(a.qty_total) || 1, prev_total: cumulative[a.id] || 0, today };
        });
    };

    const buildFreshEquipments = () =>
        (swo?.equipmentList || []).map((e: any) => {
            const foundEqm = allEquipments.find((eq: any) => eq.id === e.equipment_id);
            return { ...e, name: foundEqm ? foundEqm.eqm_name : (e.equipment_id || 'Unknown EQM'), status: 'Working', work_detail: '', qty_done: 0, hours: 0 };
        });

    const buildFreshWorkers = () =>
        (swo?.teamList || []).map((t: any) => {
            const foundTeam = allTeams.find((tm: any) => tm.id === t.team_id);
            const teamLabel = foundTeam ? `${foundTeam.name}${foundTeam.leader_name ? ' / ' + foundTeam.leader_name : ''}` : (t.team_id || 'Unknown Team');
            return { ...t, name: teamLabel, actual_headcount: 0, male: 0, female: 0 };
        });

    const [activities, setActivities] = useState<any[]>(buildFreshActivities());
    const [equipments, setEquipments] = useState<any[]>(buildFreshEquipments());
    const [workers, setWorkers] = useState<any[]>(buildFreshWorkers());
    const [notes, setNotes] = useState('');
    const [files, setFiles] = useState<FileList | null>(null);
    const [uploading, setUploading] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);
    const [pendingChangeRequest, setPendingChangeRequest] = useState<any | null>(null);
    const [requestingChange, setRequestingChange] = useState(false);
    const [requestChangeModalOpen, setRequestChangeModalOpen] = useState(false);
    const [requestChangeSelected, setRequestChangeSelected] = useState<{ c1: string[]; c2: string[]; c3: string[] }>({ c1: [], c2: [], c3: [] });
    const [requestChangeReason, setRequestChangeReason] = useState('');

    // Listen for pending change request on this SWO (Supervisor: hide "Request change" if one exists)
    React.useEffect(() => {
        if (user?.role !== 'Supervisor' || !swo?.id) return;
        const q = query(col("swo_change_requests"), where("swo_id", "==", swo.id));
        const unsub = onSnapshot(q, (snapshot) => {
            const pending = snapshot.docs.find(d => {
                const s = (d.data() as any).status;
                return s === 'Pending CM' || s === 'Pending PM';
            });
            setPendingChangeRequest(pending ? { id: pending.id, ...pending.data() } : null);
        });
        return unsub;
    }, [user?.role, swo?.id]);

    const openRequestChangeModal = () => {
        setRequestChangeSelected({ c1: [], c2: [], c3: [] });
        setRequestChangeReason('');
        setRequestChangeModalOpen(true);
    };

    const toggleRequestItem = (section: 'c1' | 'c2' | 'c3', id: string) => {
        setRequestChangeSelected(prev => {
            const arr = prev[section];
            const next = arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];
            return { ...prev, [section]: next };
        });
    };

    const handleRequestChange = async () => {
        const hasAny = requestChangeSelected.c1.length > 0 || requestChangeSelected.c2.length > 0 || requestChangeSelected.c3.length > 0;
        if (!swo || requestingChange) return;
        if (!hasAny) {
            showAlert('warning', 'กรุณาเลือกรายการ', 'กรุณาเลือกอย่างน้อย 1 รายการ (C1/C2/C3) ที่ต้องการขอแก้ไข');
            return;
        }
        setRequestingChange(true);
        try {
            const draftActivities = (swo.activities || []).map((a: any) => ({
                id: a.id,
                description: a.description,
                unit: a.unit,
                qty_total: a.qty_total,
                rate: a.rate ?? ''
            }));
            const draftEquipmentList = (swo.equipmentList || []).map((e: any) => ({ id: e.id, equipment_id: e.equipment_id }));
            const draftTeamList = (swo.teamList || []).map((t: any) => ({ id: t.id, team_id: t.team_id }));
            await addDoc(col("swo_change_requests"), {
                swo_id: swo.id,
                swo_no: swo.swo_no,
                project_id: swo.project_id,
                work_name: swo.work_name,
                requested_by_uid: user?.uid,
                requested_by_name: user?.name,
                requested_at: new Date().toISOString(),
                status: 'Pending CM',
                reason: requestChangeReason.trim(),
                requested_c1_ids: requestChangeSelected.c1,
                requested_c2_ids: requestChangeSelected.c2,
                requested_c3_ids: requestChangeSelected.c3,
                draft_activities: draftActivities,
                draft_equipmentList: draftEquipmentList,
                draft_teamList: draftTeamList,
                effective_date: null,
                approved_by_pm_at: null,
                approved_by_pm_name: null
            });
            if (user) {
                await logActivity({
                    uid: user.uid,
                    name: user.name,
                    role: user.role,
                    action: 'Request',
                    menu: 'Daily Report',
                    detail: `Request change C1/C2/C3 for SWO ${swo.swo_no}`
                });
            }
            setRequestChangeModalOpen(false);
            showAlert('success', 'ส่งคำขอแก้ไขแล้ว', 'คำขอแก้ไขถูกส่งไปยัง CM และ PM แล้ว');
        } catch (e: any) {
            showAlert('error', 'เกิดข้อผิดพลาด', e.message);
        }
        setRequestingChange(false);
    };

    const handleAcceptChange = async () => {
        if (!swo?.id) return;
        setRequestingChange(true);
        try {
            await updateDoc(docRef("site_work_orders", swo.id), { status: 'Accepted', pending_change_acceptance: false });
            showAlert('success', 'ยอมรับการแก้ไขแล้ว', 'คุณสามารถกรอกและส่งรายงานของวันนี้ได้');
            onSwoAccepted?.();
        } catch (e: any) {
            showAlert('error', 'เกิดข้อผิดพลาด', e.message);
        }
        setRequestingChange(false);
    };

    // Load data into form once queries settle
    React.useEffect(() => {
        if (!dataLoaded) return;
        if (existingReport) {
            // Always recalculate prev_total by summing all approved reports before selectedDate
            setActivities(buildExistingActivities(existingReport.activities || []));
            setEquipments(existingReport.equipments || buildFreshEquipments());
            setWorkers(existingReport.workers || buildFreshWorkers());
            setNotes(existingReport.notes || '');
        } else {
            // Fresh form — prev_total from cumulative sum of all approved reports
            setActivities(buildFreshActivities());
            setEquipments(buildFreshEquipments());
            setWorkers(buildFreshWorkers());
            setNotes('');
        }
    }, [existingReport, allPrevApprovedReports, dataLoaded]); // eslint-disable-line

    // --- Role + Status based read-only logic ---
    const reportStatus: string = existingReport?.status || 'none';
    const isLockedByStatus = reportStatus === 'Approved' || reportStatus === 'Pending CM' || reportStatus === 'Pending PM';

    // Admin: locked only when already Approved (cannot re-edit approved)
    // Supervisor: (1) Closed SWO → cannot edit; (2) Pending change acceptance → cannot submit until accept; (3) Rejected → within 2 days; (4) else → today/yesterday
    const supervisorEditable =
        (swo?.closure_status)
            ? false
            : (swo?.pending_change_acceptance)
                ? false
                : reportStatus === 'Rejected'
                    ? isRejectedWithinTwoDays(existingReport)
                    : (selectedDate === todayStr || selectedDate === yesterdayStr) && !isLockedByStatus;
    const isEditable =
        (swo?.closure_status) ? false
            : user?.role === 'Admin' ? !isLockedByStatus
                : user?.role === 'Supervisor' ? supervisorEditable
                    : false;
    const isReadOnly = !isEditable;

    // --- Handlers ---
    // Keep today as string while typing so "0.0", "0.03" don't disappear (parseFloat("0.") => 0 would clear the input)
    const handleActivityChange = (id: string, val: string) => {
        let sanitized = val.replace(/[^\d.]/g, '');
        const firstDot = sanitized.indexOf('.');
        if (firstDot >= 0) sanitized = sanitized.slice(0, firstDot + 1) + sanitized.slice(firstDot + 1).replace(/\./g, '');
        setActivities(activities.map((a: any) => a.id === id ? { ...a, today: sanitized } : a));
    };

    const handleSubmit = async () => {
        setUploading(true);
        let attachmentUrls: { name: string; url: string; type: string }[] = existingReport?.attachments || [];

        // Upload files to Firebase Storage
        if (files && files.length > 0) {
            try {
                const uploads = Array.from(files).map(async (file) => {
                    const path = `daily_reports/${swo.id}/${selectedDate}/${Date.now()}_${file.name}`;
                    const storageRef = ref(storage, path);
                    await uploadBytes(storageRef, file);
                    const url = await getDownloadURL(storageRef);
                    return { name: file.name, url, type: file.type };
                });
                const newUrls = await Promise.all(uploads);
                attachmentUrls = [...attachmentUrls, ...newUrls];
            } catch (uploadErr: any) {
                console.error('[Storage] Upload error:', uploadErr?.code, uploadErr?.message);
                setUploading(false);
                const isPermission = uploadErr?.code === 'storage/unauthorized' || uploadErr?.code === 'storage/unknown';
                showAlert('error',
                    'อัปโหลดไฟล์ไม่สำเร็จ',
                    isPermission
                        ? 'Firebase Storage ไม่อนุญาต (Rules) — กรุณาแจ้ง Admin ตรวจสอบ Storage Rules\n\nCode: ' + uploadErr?.code
                        : (uploadErr?.message || 'Unknown error')
                );
                return;
            }
        }

        // Save report to Firestore
        try {
            const reportData: any = {
                date: selectedDate,
                swo_id: swo.id,
                swo: swo.swo_no,
                project_id: swo.project_id || '',
                project_no: getProjectNo(swo.project_id),
                supervisor: user?.name || swo.supervisor_id,
                supervisor_name: user?.name || '',
                work_name: swo.work_name || '',
                status: 'Pending CM' as const,
                cm_notes: '',
                activities: activities.map((a: any) => ({ ...a, today: parseFloat(String(a.today)) || 0 })),
                equipments,
                workers,
                notes,
                attachments: attachmentUrls
            };
            if (existingReport?.status === 'Rejected') {
                reportData.rejected_at = null;
            }

            if (existingReport?.status === 'Rejected') {
                await updateDoc(docRef("daily_reports", existingReport.id), reportData);
            } else {
                await addDoc(col("daily_reports"), reportData);
            }
            if (user) {
                await logActivity({
                    uid: user.uid,
                    name: user.name,
                    role: user.role,
                    action: 'Create',
                    menu: 'Daily Report',
                    detail: existingReport?.status === 'Rejected'
                        ? `Create Daily Report SWO No. ${swo?.swo_no || ''} Date ${selectedDate} (Resubmit)`
                        : `Create Daily Report SWO No. ${swo?.swo_no || ''} Date ${selectedDate}`
                });
            }
            setFiles(null);
            setUploading(false);
            showAlert('success',
                existingReport?.status === 'Rejected' ? 'ส่งซ้ำเรียบร้อย' : 'ส่งรายงานสำเร็จ',
                'รายงานถูกส่งและอยู่ระหว่างรอการอนุมัติ',
                () => { if (onBack) onBack(); }
            );
        } catch (e: any) {
            console.error('[Firestore] Submit error:', e);
            setUploading(false);
            showAlert('error', 'เกิดข้อผิดพลาด', e.message);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <AlertModal {...formModalProps} />

            {/* Lightbox: click thumbnail to open full image */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80"
                    onClick={() => setLightboxImage(null)}
                >
                    <button type="button" className="absolute top-4 right-4 text-white hover:text-gray-200 text-2xl font-bold z-10" onClick={() => setLightboxImage(null)} aria-label="ปิด">×</button>
                    <img
                        src={lightboxImage.url}
                        alt={lightboxImage.name}
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded truncate max-w-[90vw]">{lightboxImage.name}</p>
                </div>
            )}
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors">
                            <span className="sr-only">Back</span>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Daily Progress Report</h1>
                        <p className="text-gray-500 mt-1">SWO: <span className="font-semibold text-gray-700">{swo?.swo_no} - {swo?.work_name}</span></p>
                        <p className={`mt-2 text-lg font-bold ${swo?.closure_status ? 'text-red-700 bg-red-50 px-3 py-1.5 rounded-lg inline-block' : 'text-gray-700'}`}>
                            SWO Status: {swo?.closure_status ? `Closed - ${swo.closure_status}` : (swo?.status || 'Active')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 mt-2">
                            <div className="flex items-center gap-2 text-gray-600">
                                <span className="font-medium">Start Date:</span>
                                <span className="bg-gray-100 px-2 py-1 rounded text-sm font-medium">
                                    {swo?.start_date || 'Not specified'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                                <span className="font-medium">End Date:</span>
                                <span className="bg-gray-100 px-2 py-1 rounded text-sm font-medium">
                                    {swo?.finish_date || 'Not specified'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm font-medium text-gray-500 mb-1">Date</p>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={goToPrevDay}
                            disabled={!canGoPrevDay}
                            title="Previous Day"
                            className={`p-1.5 rounded-lg transition-colors ${canGoPrevDay ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <p className="text-lg font-bold text-gray-800 min-w-[110px] text-center">{selectedDate}</p>
                        <button
                            onClick={goToNextDay}
                            disabled={!canGoNextDay}
                            title="Next Day"
                            className={`p-1.5 rounded-lg transition-colors ${canGoNextDay ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                    {/* Date-level status hint */}
                    {isLockedByStatus && reportStatus === 'Approved' && (
                        <p className="text-xs text-green-600 mt-1 font-medium">✅ Approved – ปิดสำหรับวันนี้</p>
                    )}
                    {isLockedByStatus && (reportStatus === 'Pending CM' || reportStatus === 'Pending PM') && (
                        <p className="text-xs text-yellow-600 mt-1 font-medium">⏳ รอการอนุมัติ</p>
                    )}
                    {reportStatus === 'Rejected' && isEditable && (
                        <p className="text-xs text-red-500 mt-1 font-medium">⚠️ ถูก Reject – แก้ไขและส่งใหม่ได้ภายใน 2 วัน</p>
                    )}
                    {reportStatus === 'Rejected' && !isEditable && existingReport?.rejected_at && (
                        <p className="text-xs text-red-600 mt-1 font-medium">⏱️ หมดเวลาการแก้ไข (2 วันนับจากวันถูก Reject)</p>
                    )}
                    {user?.role === 'Supervisor' && reportStatus === 'none' && selectedDate < yesterdayStr && (
                        <p className="text-xs text-orange-500 mt-1 font-medium">📅 ส่งรายงานได้เฉพาะวันนี้และเมื่อวาน</p>
                    )}
                    {user?.role === 'Supervisor' && reportStatus === 'none' && selectedDate === yesterdayStr && (
                        <p className="text-xs text-blue-600 mt-1 font-medium">📅 รายงานเมื่อวาน – สามารถส่งได้</p>
                    )}
                    {user?.role === 'Supervisor' && reportStatus === 'none' && selectedDate < yesterdayStr && (
                        <p className="text-xs text-gray-500 mt-1 font-medium">📅 ดูข้อมูลย้อนหลัง (ส่งรายงานได้เฉพาะวันนี้และเมื่อวาน)</p>
                    )}
                    {swo?.closure_status && (
                        <p className="text-xs text-red-600 mt-1 font-medium">🔒 SWO ปิดแล้ว – ดูได้อย่างเดียว (กรอกข้อมูลไม่ได้)</p>
                    )}
                    {user?.role !== 'Admin' && user?.role !== 'Supervisor' && !swo?.closure_status && (
                        <p className="text-xs text-red-500 mt-1 font-medium">🔒 View Only</p>
                    )}
                </div>
            </div>

            {/* Supervisor: PM แก้ไขแล้ว — แถบแบน: มีคำขอรอ = แสดงเฉพาะ badge รอ CM/PM (ซ่อนปุ่มขอแก้ไขอีกครั้งและปุ่มยอมรับ); ไม่มีคำขอรอ = แสดงปุ่มขอแก้ไขอีกครั้ง + ยอมรับ */}
            {user?.role === 'Supervisor' && swo?.pending_change_acceptance && (
                <div className="bg-amber-50/90 border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-amber-800 text-sm font-medium truncate">ขอแก้ไขปริมาณงาน (C1/C2/C3) คำขอจะส่งไปยัง CM – PM</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {pendingChangeRequest ? (
                            <span className="text-xs font-medium text-amber-700 bg-amber-100 border border-amber-200 px-2 py-1 rounded">รอ CM/PM ({pendingChangeRequest.status})</span>
                        ) : (
                            <>
                                <button type="button" onClick={openRequestChangeModal} disabled={requestingChange} className="px-3 py-1.5 text-amber-700 border border-amber-300 rounded-lg text-sm font-medium bg-white hover:bg-amber-100 cursor-pointer disabled:opacity-50">ขอแก้ไขอีกครั้ง</button>
                                <button type="button" onClick={handleAcceptChange} disabled={requestingChange} className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50">ยอมรับ</button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Supervisor: แถบเล็กแบน — ขอแก้ไขปริมาณงาน (เมื่อ SWO เป็น Accepted และยังไม่มีคำขอรอ) */}
            {user?.role === 'Supervisor' && swo?.status === 'Accepted' && !swo?.pending_change_acceptance && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-amber-800 text-sm font-medium truncate">ขอแก้ไขปริมาณงาน (C1/C2/C3)</span>
                        <span className="text-amber-600 text-xs hidden sm:inline">คำขอจะส่งไปยัง CM → PM</span>
                    </div>
                    {pendingChangeRequest ? (
                        <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded shrink-0">รอ CM/PM ({pendingChangeRequest.status})</span>
                    ) : (
                        <button type="button" onClick={openRequestChangeModal} disabled={requestingChange} className="shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg flex items-center gap-1">
                            <Edit3 className="w-3.5 h-3.5" /> ขอแก้ไข
                        </button>
                    )}
                </div>
            )}

            {/* Modal: เลือกรายการที่จะขอแก้ไข + เหตุผล */}
            {requestChangeModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white rounded-xl shadow-2xl border border-amber-200 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-4 py-3 border-b bg-amber-50 font-semibold text-amber-900 text-sm">เลือกรายการที่ต้องการขอแก้ไขปริมาณ + ใส่เหตุผล</div>
                        <div className="p-4 overflow-y-auto flex-1 space-y-4">
                            <div>
                                <p className="text-xs font-semibold text-gray-600 mb-2">C1 งาน (Work Activities)</p>
                                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                    {(swo?.activities || []).map((a: any) => (
                                        <label key={a.id} className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={requestChangeSelected.c1.includes(a.id)} onChange={() => toggleRequestItem('c1', a.id)} className="rounded border-amber-300" />
                                            <span className="text-sm text-gray-800">{a.description || '-'} ({a.qty_total} {a.unit})</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-600 mb-2">C2 เครื่องจักร (Equipment)</p>
                                <div className="space-y-1.5 max-h-24 overflow-y-auto">
                                    {(swo?.equipmentList || []).map((e: any) => {
                                        const name = allEquipments.find((eq: any) => eq.id === e.equipment_id)?.eqm_name || e.equipment_id || '-';
                                        return (
                                            <label key={e.id} className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={requestChangeSelected.c2.includes(e.id)} onChange={() => toggleRequestItem('c2', e.id)} className="rounded border-amber-300" />
                                                <span className="text-sm text-gray-800">{name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-600 mb-2">C3 ทีมงาน (Worker teams)</p>
                                <div className="space-y-1.5 max-h-24 overflow-y-auto">
                                    {(swo?.teamList || []).map((t: any) => {
                                        const team = allTeams.find((tm: any) => tm.id === t.team_id);
                                        const name = team ? `${team.name}${team.leader_name ? ' / ' + team.leader_name : ''}` : t.team_id || '-';
                                        return (
                                            <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={requestChangeSelected.c3.includes(t.id)} onChange={() => toggleRequestItem('c3', t.id)} className="rounded border-amber-300" />
                                                <span className="text-sm text-gray-800">{name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">เหตุผล (ถ้ามี)</label>
                                <textarea className="w-full p-2 border border-gray-300 rounded-lg text-sm resize-none" rows={3} placeholder="ระบุเหตุผลที่ขอแก้ไข..." value={requestChangeReason} onChange={e => setRequestChangeReason(e.target.value)} />
                            </div>
                        </div>
                        <div className="px-4 py-3 border-t flex justify-end gap-2">
                            <button type="button" onClick={() => setRequestChangeModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">ยกเลิก</button>
                            <button type="button" onClick={handleRequestChange} disabled={requestingChange} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">ส่งคำขอแก้ไข</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Banner */}
            {reportStatus === 'Approved' && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-3">
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                    <div>
                        <p className="font-semibold text-green-800">รายงานวันนี้ได้รับการอนุมัติแล้ว</p>
                        <p className="text-xs text-green-600">ไม่สามารถแก้ไขข้อมูลได้อีก กรุณารอวันถัดไปเพื่อส่งรายงานใหม่</p>
                    </div>
                </div>
            )}
            {(reportStatus === 'Pending CM' || reportStatus === 'Pending PM') && (
                <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-3">
                    <Clock className="w-5 h-5 text-yellow-600 shrink-0" />
                    <div>
                        <p className="font-semibold text-yellow-800">รายงานอยู่ระหว่างรอการอนุมัติ ({reportStatus})</p>
                        <p className="text-xs text-yellow-600">ไม่สามารถแก้ไขได้จนกว่า CM/PM จะพิจารณา</p>
                    </div>
                </div>
            )}
            {reportStatus === 'Rejected' && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
                    <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-red-800">รายงานถูก Reject</p>
                        {existingReport?.reject_reason ? (
                            <p className="text-sm text-red-700 mt-1 font-medium">เหตุผล: {existingReport.reject_reason}</p>
                        ) : null}
                        {isEditable ? (
                            <p className="text-xs text-red-600 mt-1">คุณมีเวลา 2 วัน (นับจากวันถูก Reject) ในการแก้ไขและกด Resubmit เพื่อส่งขออนุมัติอีกครั้ง</p>
                        ) : (
                            <p className="text-xs text-red-500 mt-1">หมดเวลาการแก้ไขแล้ว (เกิน 2 วันนับจากวันถูก Reject)</p>
                        )}
                    </div>
                </div>
            )}

            {/* Review Notes from CM/PM - Show when report has been reviewed */}
            {existingReport && (existingReport.cm_notes || existingReport.cm_approved_by || existingReport.pm_approved_by) && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-purple-100 border-b border-purple-200 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold text-purple-800 text-sm">Review Notes from CM/PM</span>
                    </div>
                    <div className="p-4 space-y-3">
                        {/* CM Review */}
                        {(existingReport.cm_approved_by || existingReport.cm_notes) && (
                            <div className="bg-white rounded-lg p-3 border border-purple-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">CM</span>
                                    {existingReport.cm_approved_by && (
                                        <span className="text-xs text-gray-500">Reviewed by: <span className="font-medium text-gray-700">{existingReport.cm_approved_by}</span></span>
                                    )}
                                </div>
                                {existingReport.cm_notes ? (
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{existingReport.cm_notes}</p>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">No notes added</p>
                                )}
                            </div>
                        )}

                        {/* PM Review */}
                        {existingReport.pm_approved_by && (
                            <div className="bg-white rounded-lg p-3 border border-purple-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">PM</span>
                                    <span className="text-xs text-gray-500">Final Approval by: <span className="font-medium text-gray-700">{existingReport.pm_approved_by}</span></span>
                                </div>
                                {existingReport.pm_notes ? (
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{existingReport.pm_notes}</p>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">No notes added</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* C1: Activities */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 font-semibold text-gray-800">
                    Work Activities (C1)
                </div>
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="bg-white text-gray-500 italic border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3 font-medium">Description</th>
                            <th className="px-6 py-3 font-medium">Qty Required</th>
                            <th className="px-6 py-3 font-medium">Prev Total</th>
                            <th className="px-6 py-3 font-medium text-blue-600 bg-blue-50/30">Today's Progress</th>
                            <th className="px-6 py-3 font-medium text-right">Up to Date</th>
                            <th className="px-6 py-3 font-medium text-right">% Complete</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {activities.map((a: any) => {
                            const todayNum = parseFloat(String(a.today)) || 0;
                            const upToDate = a.prev_total + todayNum;
                            const percent = ((upToDate / a.total) * 100).toFixed(1);

                            return (
                                <tr key={a.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-800">{a.desc}</td>
                                    <td className="px-6 py-4">{a.total} {a.unit}</td>
                                    <td className="px-6 py-4 text-gray-500">{a.prev_total} {a.unit}</td>
                                    <td className="px-6 py-4 bg-blue-50/10">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                className={`w-24 p-2 border border-blue-200 rounded outline-none text-right font-medium ${isReadOnly ? 'bg-gray-100/50 cursor-not-allowed text-gray-400' : 'focus:ring-2 focus:ring-blue-500 focus:border-transparent'}`}
                                                value={a.today ?? ''}
                                                onChange={(e) => handleActivityChange(a.id, e.target.value)}
                                                placeholder="0.0"
                                                disabled={isReadOnly}
                                            />
                                            <span className="text-xs text-gray-500">{a.unit}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-semibold text-gray-800">{upToDate} {a.unit}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${percent === 'Infinity' ? 'bg-yellow-100 text-yellow-700' : parseFloat(percent) >= 100 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {percent === 'NaN' || percent === 'Infinity' ? '0.0' : percent}%
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* C2: Equipment */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-orange-50 border-b border-orange-100 font-semibold text-orange-800">
                    Equipment Usage (C2)
                </div>
                <div className="p-6 grid gap-4">
                    {equipments.map((e: any) => (
                        <div key={e.id} className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <div className="w-full md:w-1/4 font-medium text-gray-800">{e.name}</div>
                            <select className={`w-full md:w-1/4 p-2 border border-gray-300 rounded outline-none ${isReadOnly ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'focus:ring-2 focus:ring-orange-500'}`} disabled={isReadOnly}>
                                <option>Working</option>
                                <option>Broken Down</option>
                                <option>Idle</option>
                            </select>
                            <input type="text" placeholder="Work detail (e.g. excavated 10 pits)" disabled={isReadOnly} value={e.work_detail} onChange={(evt) => setEquipments(equipments.map((eq: any) => eq.id === e.id ? { ...eq, work_detail: evt.target.value } : eq))} className={`w-full md:flex-1 p-2 border border-gray-300 rounded outline-none ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-2 focus:ring-orange-500'}`} />
                            <div className="w-full md:w-32 relative">
                                <input type="number" placeholder="Hours" disabled={isReadOnly} value={e.hours} onChange={(evt) => setEquipments(equipments.map((eq: any) => eq.id === e.id ? { ...eq, hours: Number(evt.target.value) } : eq))} className={`w-full p-2 pr-12 border border-gray-300 rounded outline-none ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-2 focus:ring-orange-500'}`} />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">hrs</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* C3: Workers */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 font-semibold text-indigo-800">
                    Worker Headcount (C3)
                </div>
                <div className="p-6 grid gap-4">
                    {workers.map((w: any) => (
                        <div key={w.id} className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <div className="w-full md:w-1/3 font-medium text-gray-800">{w.name}</div>
                            <div className="w-full md:flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Total Present</label>
                                    <input type="number" placeholder="0" disabled={isReadOnly} value={w.actual_headcount} onChange={(evt) => setWorkers(workers.map((wo: any) => wo.id === w.id ? { ...wo, actual_headcount: Number(evt.target.value) } : wo))} className={`w-full p-2 border border-gray-300 rounded outline-none ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-2 focus:ring-indigo-500'}`} />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Male</label>
                                    <input type="number" placeholder="0" disabled={isReadOnly} value={w.male} onChange={(evt) => setWorkers(workers.map((wo: any) => wo.id === w.id ? { ...wo, male: Number(evt.target.value) } : wo))} className={`w-full p-2 border border-gray-300 rounded outline-none ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-2 focus:ring-indigo-500'}`} />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Female</label>
                                    <input type="number" placeholder="0" disabled={isReadOnly} value={w.female} onChange={(evt) => setWorkers(workers.map((wo: any) => wo.id === w.id ? { ...wo, female: Number(evt.target.value) } : wo))} className={`w-full p-2 border border-gray-300 rounded outline-none ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-2 focus:ring-indigo-500'}`} />
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Note and File Upload */}
                    <div className="mt-4 space-y-4 pt-4 border-t border-gray-100">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Daily Report Notes & Remarks</label>
                            <textarea
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                disabled={isReadOnly}
                                placeholder={isReadOnly ? "No notes added by supervisor." : "Add detailed notes, issues, or observations here..."}
                                className={`w-full p-3 border border-gray-300 rounded-lg outline-none resize-y ${isReadOnly ? 'bg-gray-50 cursor-not-allowed text-gray-500' : 'focus:ring-2 focus:ring-indigo-500'}`}
                            ></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Site Photos & Attachments</label>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf,.doc,.docx"
                                    onChange={(e) => setFiles(e.target.files)}
                                    disabled={isReadOnly || uploading}
                                    className={`w-full md:w-1/2 text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold ${isReadOnly ? 'opacity-50 cursor-not-allowed file:bg-gray-200 file:text-gray-500' : 'file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer'} border border-gray-300 rounded-lg p-2 transition-colors`}
                                />
                                {files && files.length > 0 && (
                                    <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full text-nowrap">
                                        {files.length} file(s) ready to upload
                                    </span>
                                )}
                            </div>
                            {/* Existing attachments: Site Photos & Attachments grid with thumbnails */}
                            {(existingReport?.attachments || []).length > 0 && (
                                <div className="mt-4 rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 font-semibold text-gray-800 text-sm flex items-center gap-2">
                                        📎 Site Photos & Attachments
                                        <span className="ml-1 bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                            {(existingReport.attachments as { name: string; url: string; type: string }[]).length}
                                        </span>
                                    </div>
                                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[320px] overflow-y-auto">
                                        {(existingReport.attachments as { name: string; url: string; type: string }[]).map((att, i) =>
                                            att.type?.startsWith('image/') ? (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => setLightboxImage({ url: att.url, name: att.name })}
                                                    className="block w-full text-left rounded-lg overflow-hidden border border-gray-200 bg-white hover:border-indigo-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                                                >
                                                    <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                                                        <img
                                                            src={att.url}
                                                            alt={att.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <p className="px-3 py-1.5 text-xs text-gray-500 truncate bg-white border-t border-gray-100">{att.name}</p>
                                                </button>
                                            ) : (
                                                <a
                                                    key={i}
                                                    href={att.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
                                                >
                                                    <span className="text-2xl">📄</span>
                                                    <span className="text-sm text-indigo-700 font-medium truncate hover:underline">{att.name}</span>
                                                </a>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {!isReadOnly && (
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-4">
                    <button className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 bg-white rounded-xl hover:bg-gray-50 font-medium shadow-sm flex justify-center items-center" disabled={uploading}>
                        <Save className="w-4 h-4 mr-2" /> Save Draft
                    </button>
                    <button className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-sm flex justify-center items-center disabled:opacity-60 disabled:cursor-not-allowed" onClick={handleSubmit} disabled={uploading}>
                        {uploading ? (
                            <><svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Uploading...</>
                        ) : (
                            <><Send className="w-4 h-4 mr-2" />{existingReport?.status === 'Rejected' ? 'Resubmit for Approval' : 'Submit for Approval'}</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

// --- CM/PM Approval Dashboard ---
export const ApprovalDashboard = () => {
    const { user } = useAuth();
    const { showAlert, showDelete, modalProps: approvalModalProps } = useAlert();
    const location = useLocation();
    const [reports, setReports] = useState<any[]>([]);
    const [selectedReport, setSelectedReport] = useState<string | null>(null);
    const [cmNotes, setCmNotes] = useState('');
    const [rejectModal, setRejectModal] = useState<{ open: boolean; report: any | null }>({ open: false, report: null });
    const [rejectReason, setRejectReason] = useState('');

    // Tab state: "pending" or "approved"
    const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');

    // Inbox section: Daily Reports vs Change Requests (C1/C2/C3)
    const [inboxSection, setInboxSection] = useState<'reports' | 'changes'>('reports');
    const [changeRequests, setChangeRequests] = useState<any[]>([]);
    const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);
    const [changeEditModal, setChangeEditModal] = useState<{ open: boolean; req: any | null }>({ open: false, req: null });
    const [changeEditDraft, setChangeEditDraft] = useState<{ activities: any[]; equipmentList: any[]; teamList: any[] } | null>(null);

    React.useEffect(() => {
        const q = query(col("swo_change_requests"));
        const unsub = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const filtered = (user?.role === 'Admin' || user?.role === 'MD')
                ? fetched
                : fetched.filter((r: any) => (user as any)?.assigned_projects?.includes(r.project_id));
            setChangeRequests(filtered);
        });
        return unsub;
    }, [user?.role, user?.uid]);

    const pendingChangeRequests = changeRequests.filter((r: any) => r.status === 'Pending CM' || r.status === 'Pending PM');
    const selectedChangeRequest = changeRequests.find(r => r.id === selectedChangeId);

    React.useEffect(() => {
        if (inboxSection === 'changes' && pendingChangeRequests.length > 0 && !selectedChangeId) setSelectedChangeId(pendingChangeRequests[0].id);
        if (inboxSection === 'changes' && selectedChangeId && !pendingChangeRequests.some((r: any) => r.id === selectedChangeId)) setSelectedChangeId(pendingChangeRequests[0]?.id ?? null);
    }, [inboxSection, pendingChangeRequests, selectedChangeId]);

    // เมื่อคลิกจากการแจ้งเตือน (กระดิ่ง) คำขอแก้ไข C1/C2/C3 → เปิดแท็บ Change Requests และเลือกรายการ
    const navChangeRequestIdRef = React.useRef<string | null>((location.state as any)?.notifType === 'swo_change_request' ? (location.state as any)?.targetId ?? null : null);
    React.useEffect(() => {
        if (navChangeRequestIdRef.current && changeRequests.some((r: any) => r.id === navChangeRequestIdRef.current)) {
            setInboxSection('changes');
            setSelectedChangeId(navChangeRequestIdRef.current);
            navChangeRequestIdRef.current = null;
            window.history.replaceState({}, '');
        }
    }, [changeRequests]);

    // Filter states
    const [filterDate, setFilterDate] = useState('');
    const [filterSwo, setFilterSwo] = useState('All');
    const [filterSupervisor, setFilterSupervisor] = useState('All');
    const [filterProject, setFilterProject] = useState('All');

    React.useEffect(() => {
        const q = query(col("daily_reports"));
        const unsub = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // RBAC: Admin/MD see all reports; all other roles see only reports from their assigned projects
            const filtered = (user?.role === 'Admin' || user?.role === 'MD')
                ? fetched
                : fetched.filter(r => (user as any)?.assigned_projects?.includes((r as any).project_id));

            setReports(filtered);
        });
        return unsub;
    }, [user?.role, user?.uid]);

    // Derive unique filter options from reports
    const uniqueSupervisors = Array.from(new Set(reports.map(r => r.supervisor || r.supervisor_name).filter(Boolean)));
    const uniqueProjects = Array.from(new Set(reports.map(r => r.project_no).filter(Boolean)));
    const uniqueSwos = Array.from(new Set(reports.map(r => r.swo).filter(Boolean)));
    const uniqueDates = Array.from(new Set(reports.map(r => r.date).filter(Boolean))).sort((a, b) => b.localeCompare(a)); // Sort dates descending (newest first)

    // Debug: Count reports by status
    const reportsByStatus = reports.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    // Filter reports based on tab and filters
    const filteredReports = reports.filter(r => {
        // Tab filter
        const isPending = r.status === 'Pending CM' || r.status === 'Pending PM';
        const isApproved = r.status === 'Approved';
        if (activeTab === 'pending' && !isPending) return false;
        if (activeTab === 'approved' && !isApproved) return false;

        // Date filter
        if (filterDate && r.date !== filterDate) return false;

        // SWO filter
        if (filterSwo !== 'All' && r.swo !== filterSwo) return false;

        // Supervisor filter
        if (filterSupervisor !== 'All' && (r.supervisor !== filterSupervisor && r.supervisor_name !== filterSupervisor)) return false;

        // Project filter
        if (filterProject !== 'All' && r.project_no !== filterProject) return false;

        return true;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Auto-select: from notification nav state (once on mount), or default to first report
    const navTargetIdRef = React.useRef<string | null>((location.state as any)?.targetId || null);
    React.useEffect(() => {
        if (filteredReports.length === 0) {
            setSelectedReport(null);
            return;
        }
        if (navTargetIdRef.current && filteredReports.some(r => r.id === navTargetIdRef.current)) {
            setSelectedReport(navTargetIdRef.current);
            navTargetIdRef.current = null;
            window.history.replaceState({}, '');
        } else if (!selectedReport || !filteredReports.some(r => r.id === selectedReport)) {
            setSelectedReport(filteredReports[0].id);
        }
    }, [filteredReports]);

    // Clear notes when selecting a different report
    React.useEffect(() => {
        setCmNotes('');
    }, [selectedReport]);

    // Role-based action permissions
    // CM: can approve Pending CM → Pending PM, can reject Pending CM
    // PM: can hand-on CM step (Pending CM → Pending PM) AND final approve (Pending PM → Approved), can reject both
    // Admin: can do all actions on any status
    const canActOnReport = (report: any) => {
        if (user?.role === 'Admin') return true;
        if (user?.role === 'CM') return report.status === 'Pending CM';
        if (user?.role === 'PM') return report.status === 'Pending CM' || report.status === 'Pending PM';
        return false;
    };

    const getApproveLabel = (report: any) => {
        if (report.status === 'Pending CM') {
            if (user?.role === 'PM' || user?.role === 'Admin') return '⚡ Hand-on CM & Forward to PM';
            return '✅ Approve & Forward to PM';
        }
        return '✅ Final Approval (PM)';
    };

    const handleApprove = async (report: any) => {
        try {
            const nextStatus = report.status === 'Pending CM' ? 'Pending PM' : 'Approved';
            const updateData: any = { status: nextStatus };
            
            // Save notes based on approval stage
            if (report.status === 'Pending CM') {
                updateData.cm_notes = cmNotes;
                updateData.cm_approved_by = user?.name || user?.role;
            }
            if (nextStatus === 'Approved') {
                updateData.pm_notes = cmNotes;
                updateData.pm_approved_by = user?.name || user?.role;
            }
            
            await updateDoc(docRef("daily_reports", report.id), updateData);
            
            // Log daily report approval
            if (user) {
                await logActivity({
                    uid: user.uid,
                    name: user.name,
                    role: user.role,
                    action: 'Approve',
                    menu: 'Daily Report',
                    detail: `Approve Daily Report SWO No. ${report.swo_no || report.swo || ''} Date ${report.date} (Status: ${nextStatus})`
                });
            }
            
            showAlert('success', 'อนุมัติสำเร็จ', `สถานะรายงานอัปเดตเป็น: ${nextStatus}`);
        } catch (e: any) { showAlert('error', 'เกิดข้อผิดพลาด', e.message); }
    };

    const openRejectModal = (report: any) => {
        setRejectReason('');
        setRejectModal({ open: true, report });
    };

    const handleReject = async () => {
        const report = rejectModal.report;
        if (!report) return;
        if (!rejectReason.trim()) {
            showAlert('warning', 'กรุณาระบุเหตุผล', 'กรุณากรอกเหตุผลการ Reject ก่อนยืนยัน');
            return;
        }
        try {
            const rejectedAt = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
            await updateDoc(docRef("daily_reports", report.id), {
                status: 'Rejected',
                cm_notes: cmNotes,
                reject_reason: rejectReason.trim(),
                rejected_at: rejectedAt
            });
            
            // Log daily report rejection
            if (user) {
                await logActivity({
                    uid: user.uid,
                    name: user.name,
                    role: user.role,
                    action: 'Reject',
                    menu: 'Daily Report',
                    detail: `Reject Daily Report SWO No. ${report.swo_no || report.swo || ''} Date ${report.date} (Reason: ${rejectReason.trim()})`
                });
            }
            
            setRejectModal({ open: false, report: null });
            showAlert('warning', 'Reject สำเร็จ', 'รายงานถูก Reject แล้ว');
        } catch (e: any) { showAlert('error', 'เกิดข้อผิดพลาด', e.message); }
    };

    const handleDeleteReport = (reportId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        showDelete('ลบรายงาน?', 'การลบไม่สามารถย้อนกลับได้', async () => {
            try {
                await deleteDoc(docRef("daily_reports", reportId));
                if (selectedReport === reportId) setSelectedReport(null);
                showAlert('success', 'ลบสำเร็จ', 'ลบรายงานเรียบร้อยแล้ว');
            } catch (e: any) { showAlert('error', 'ลบไม่สำเร็จ', (e as any).message); }
        });
    };

    const canDelete = user?.role === 'Admin';

    // --- Change Request: CM Forward to PM ---
    const handleChangeRequestForward = async (req: any) => {
        try {
            await updateDoc(docRef("swo_change_requests", req.id), { status: 'Pending PM' });
            if (user) {
                await logActivity({ uid: user.uid, name: user.name, role: user.role, action: 'Forward', menu: 'Change Request', detail: `Forward change request SWO ${req.swo_no} to PM` });
            }
            showAlert('success', 'ส่งต่อ PM แล้ว', 'คำขอแก้ไขถูกส่งไปยัง PM แล้ว');
        } catch (e: any) { showAlert('error', 'เกิดข้อผิดพลาด', e.message); }
    };

    // --- Change Request: PM Open Edit Modal ---
    const openChangeEditModal = (req: any) => {
        setChangeEditModal({ open: true, req });
        setChangeEditDraft({
            activities: (req.draft_activities || []).map((a: any) => ({ ...a, qty_total: a.qty_total ?? '', rate: a.rate ?? '' })),
            equipmentList: req.draft_equipmentList || [],
            teamList: req.draft_teamList || []
        });
    };

    // --- Change Request: PM Submit (apply draft to SWO, set Assigned + pending_change_acceptance) ---
    const handleChangeRequestApply = async () => {
        const req = changeEditModal.req;
        if (!req || !changeEditDraft) return;
        try {
            const effectiveDate = new Date().toISOString().slice(0, 10);
            await updateDoc(docRef("site_work_orders", req.swo_id), {
                activities: changeEditDraft.activities.map((a: any) => ({
                    id: a.id,
                    description: a.description,
                    unit: a.unit,
                    qty_total: Number(a.qty_total) || 0,
                    rate: a.rate ?? ''
                })),
                equipmentList: changeEditDraft.equipmentList,
                teamList: changeEditDraft.teamList,
                status: 'Assigned',
                pending_change_acceptance: true,
                change_effective_date: effectiveDate,
                updated_at: new Date().toISOString()
            });
            await updateDoc(docRef("swo_change_requests", req.id), {
                status: 'Approved',
                effective_date: effectiveDate,
                approved_by_pm_at: new Date().toISOString(),
                approved_by_pm_name: user?.name || user?.role,
                draft_activities: changeEditDraft.activities,
                draft_equipmentList: changeEditDraft.equipmentList,
                draft_teamList: changeEditDraft.teamList
            });
            if (user) {
                await logActivity({ uid: user.uid, name: user.name, role: user.role, action: 'Approve', menu: 'Change Request', detail: `Apply change request SWO ${req.swo_no} (effective ${effectiveDate})` });
            }
            setChangeEditModal({ open: false, req: null });
            setChangeEditDraft(null);
            showAlert('success', 'อนุมัติและอัปเดต SWO แล้ว', 'Supervisor ต้องยอมรับการแก้ไขก่อนจึงส่งรายงานได้');
        } catch (e: any) { showAlert('error', 'เกิดข้อผิดพลาด', e.message); }
    };

    const canForwardChangeRequest = (req: any) => (user?.role === 'CM' || user?.role === 'Admin') && req?.status === 'Pending CM';
    const canApproveChangeRequest = (req: any) => (user?.role === 'PM' || user?.role === 'Admin') && req?.status === 'Pending PM';

    return (
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)] gap-4 lg:gap-6 pb-6 lg:pb-12">
            <AlertModal {...approvalModalProps} />

            {/* Reject Reason Modal */}
            {rejectModal.open && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl border border-red-200 w-full max-w-md mx-auto">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-full bg-red-50">
                                    <XCircle className="w-7 h-7 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-red-700">ระบุเหตุผลการ Reject</h3>
                                    <p className="text-xs text-gray-500">เหตุผลนี้จะแสดงให้ Supervisor เห็นเพื่อแก้ไข</p>
                                </div>
                            </div>
                            <textarea
                                className="w-full p-3 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent outline-none text-sm text-gray-800 resize-none"
                                rows={4}
                                placeholder="กรอกเหตุผลการ Reject เช่น ข้อมูลไม่ครบถ้วน, ปริมาณงานไม่ถูกต้อง..."
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                autoFocus
                            />
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => setRejectModal({ open: false, report: null })}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-xl font-semibold text-sm transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={handleReject}
                                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-colors"
                                >
                                    ยืนยัน Reject
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* List / Inbox: with tabs and filters */}
            <div className="w-full max-h-[55vh] lg:max-h-none lg:w-96 lg:flex-shrink-0 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                {/* Section: Daily Reports | Change Requests */}
                <div className="flex border-b border-gray-200 bg-gray-50 shrink-0">
                    <button
                        onClick={() => setInboxSection('reports')}
                        className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${inboxSection === 'reports' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        Daily Reports
                        {(() => {
                            const pendingCount = reports.filter(r => r.status === 'Pending CM' || r.status === 'Pending PM').length;
                            return pendingCount > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] h-4 flex items-center justify-center">
                                    {pendingCount}
                                </span>
                            );
                        })()}
                    </button>
                    <button
                        onClick={() => setInboxSection('changes')}
                        className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${inboxSection === 'changes' ? 'text-amber-600 border-b-2 border-amber-600 bg-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        Change Requests
                        {pendingChangeRequests.length > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] h-4 flex items-center justify-center">
                                {pendingChangeRequests.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Header with Tabs (only for Daily Reports) */}
                {inboxSection === 'reports' && (
                <div className="border-b border-gray-100 bg-gray-50 shrink-0">
                    <div className="px-2.5 py-1.5 font-semibold text-gray-800 text-xs">
                        Inbox: Daily Reports
                    </div>
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${activeTab === 'pending'
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            Pending
                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'pending' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                                {reports.filter(r => r.status === 'Pending CM' || r.status === 'Pending PM').length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('approved')}
                            className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${activeTab === 'approved'
                                ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            Approved
                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                {reports.filter(r => r.status === 'Approved').length}
                            </span>
                        </button>
                    </div>
                </div>
                )}

                {inboxSection === 'reports' && (
                <>
                {/* Filters */}
                <div className="p-2 border-b border-gray-100 bg-gray-50/50 space-y-1.5 shrink-0">
                    <div className="grid grid-cols-2 gap-1.5">
                        {/* Date Filter */}
                        <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Date</label>
                            <select
                                className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            >
                                <option value="">All Dates</option>
                                {uniqueDates.map(date => (
                                    <option key={date} value={date}>{date}</option>
                                ))}
                            </select>
                        </div>
                        {/* SWO Filter */}
                        <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">SWO No.</label>
                            <select
                                className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                value={filterSwo}
                                onChange={(e) => setFilterSwo(e.target.value)}
                            >
                                <option value="All">All SWO</option>
                                {uniqueSwos.map(swo => (
                                    <option key={swo} value={swo}>{swo}</option>
                                ))}
                            </select>
                        </div>
                        {/* Supervisor Filter */}
                        <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Supervisor</label>
                            <select
                                className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                value={filterSupervisor}
                                onChange={(e) => setFilterSupervisor(e.target.value)}
                            >
                                <option value="All">All Supervisors</option>
                                {uniqueSupervisors.map(sup => (
                                    <option key={sup} value={sup}>{sup}</option>
                                ))}
                            </select>
                        </div>
                        {/* Project Filter */}
                        <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Project</label>
                            <select
                                className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                value={filterProject}
                                onChange={(e) => setFilterProject(e.target.value)}
                            >
                                <option value="All">All Projects</option>
                                {uniqueProjects.map(proj => (
                                    <option key={proj} value={proj}>{proj}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {/* Clear Filters */}
                    {(filterDate || filterSwo !== 'All' || filterSupervisor !== 'All' || filterProject !== 'All') && (
                        <button
                            onClick={() => {
                                setFilterDate('');
                                setFilterSwo('All');
                                setFilterSupervisor('All');
                                setFilterProject('All');
                            }}
                            className="w-full text-xs text-red-500 hover:text-red-700 py-1 border border-red-200 rounded hover:bg-red-50 transition-colors"
                        >
                            Clear All Filters
                        </button>
                    )}
                </div>

                {/* Report List */}
                <div className="overflow-y-auto flex-1 min-h-0 p-1.5 space-y-1">
                    {filteredReports.length === 0 ? (
                        <div className="text-center text-gray-400 text-xs py-6 italic">
                            No reports found
                        </div>
                    ) : (
                        filteredReports.map(r => (
                            <div
                                key={r.id}
                                className={`w-full text-left rounded border transition-all flex items-stretch min-h-[2.75rem] ${selectedReport === r.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}
                            >
                                <button
                                    onClick={() => setSelectedReport(r.id)}
                                    className="flex-1 text-left px-2 py-1.5 min-w-0 flex flex-col justify-center gap-0.5"
                                >
                                    <div className="flex items-center justify-between gap-1.5">
                                        <span className="font-semibold text-gray-800 text-[11px] truncate">{r.swo}</span>
                                        <span className="shrink-0"><StatusBadge status={r.status} compact /></span>
                                    </div>
                                    <div className="text-[10px] text-gray-500 leading-tight">
                                        <span>{r.date}</span> · <span className="font-medium text-gray-600">{r.supervisor || r.supervisor_name}</span>
                                    </div>
                                    <div className="text-[9px] text-gray-400 truncate">
                                        {r.project_no}
                                    </div>
                                </button>
                                {canDelete && (
                                    <button
                                        onClick={(e) => handleDeleteReport(r.id, e)}
                                        title="Delete report"
                                        className="px-1.5 border-l border-gray-200 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors rounded-r flex items-center shrink-0"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
                </>
                )}

                {inboxSection === 'changes' && (
                <div className="overflow-y-auto flex-1 min-h-0 p-1.5 space-y-1">
                    <div className="px-2.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border-b border-amber-100">คำขอแก้ไข C1/C2/C3</div>
                    {pendingChangeRequests.length === 0 ? (
                        <div className="text-center text-gray-400 text-xs py-6 italic">ไม่มีคำขอแก้ไขรอดำเนินการ</div>
                    ) : (
                        pendingChangeRequests.map((req: any) => (
                            <div
                                key={req.id}
                                className={`w-full text-left rounded border transition-all flex items-stretch min-h-[2.75rem] ${selectedChangeId === req.id ? 'border-amber-500 bg-amber-50 shadow-sm' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}
                            >
                                <button
                                    onClick={() => setSelectedChangeId(req.id)}
                                    className="flex-1 text-left px-2 py-1.5 min-w-0 flex flex-col justify-center gap-0.5"
                                >
                                    <div className="flex items-center justify-between gap-1.5">
                                        <span className="font-semibold text-gray-800 text-[11px] truncate">{req.swo_no}</span>
                                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${req.status === 'Pending PM' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status}</span>
                                    </div>
                                    <div className="text-[10px] text-gray-500 leading-tight">{req.requested_by_name} · {req.work_name}</div>
                                </button>
                            </div>
                        ))
                    )}
                </div>
                )}
            </div>

            {/* Review Pane */}
            <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                {inboxSection === 'changes' ? (
                    selectedChangeRequest ? (
                        <>
                            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-amber-50">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Change Request: {selectedChangeRequest.swo_no}</h2>
                                    <p className="text-sm text-gray-500">ขอโดย {selectedChangeRequest.requested_by_name} · {selectedChangeRequest.work_name}</p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${selectedChangeRequest.status === 'Pending PM' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{selectedChangeRequest.status}</span>
                            </div>
                            <div className="p-6 flex-1 overflow-y-auto space-y-6">
                                <div className="rounded-xl border border-gray-200 overflow-hidden">
                                    <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-800 text-sm">C1 Draft (ปริมาณ/ราคา)</div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-white border-b"><tr><th className="px-4 py-2">Description</th><th className="px-4 py-2">Qty</th><th className="px-4 py-2">Unit</th><th className="px-4 py-2">Rate</th></tr></thead>
                                            <tbody className="divide-y">
                                                {(selectedChangeRequest.draft_activities || []).map((a: any, i: number) => (
                                                    <tr key={i}><td className="px-4 py-2 font-medium">{a.description}</td><td className="px-4 py-2">{a.qty_total}</td><td className="px-4 py-2">{a.unit}</td><td className="px-4 py-2">{a.rate ?? '-'}</td></tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-3 pt-4 border-t">
                                    {canForwardChangeRequest(selectedChangeRequest) && (
                                        <button onClick={() => handleChangeRequestForward(selectedChangeRequest)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">ส่งต่อ PM</button>
                                    )}
                                    {canApproveChangeRequest(selectedChangeRequest) && (
                                        <button onClick={() => openChangeEditModal(selectedChangeRequest)} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl">อนุมัติและแก้ไขปริมาณ/ราคา</button>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="p-12 text-center text-gray-400">เลือกคำขอแก้ไขจากรายการ</div>
                    )
                ) : (() => {
                    const report = reports.find(r => r.id === selectedReport);
                    if (!report) return <div className="p-12 text-center text-gray-400">เลือกรายงานจากรายการ</div>;

                    return (
                        <>
                            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Review Report: {report.swo}</h2>
                                    <p className="text-sm text-gray-500">{report.date} | By {report.supervisor}</p>
                                </div>
                                <StatusBadge status={report.status} />
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto space-y-6">
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
                                                            <td className="px-4 py-3 font-medium text-gray-800">{a.desc || a.description || '-'}</td>
                                                            <td className="px-4 py-3">{a.total} {a.unit}</td>
                                                            <td className="px-4 py-3 text-gray-500">{a.prev_total || 0} {a.unit}</td>
                                                            <td className="px-4 py-3 bg-blue-50/10">
                                                                <span className="w-24 inline-block text-right font-bold text-blue-700">{a.today || 0}</span>
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

                                {/* Notes */}
                                {report.notes && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-yellow-700 mb-1 uppercase tracking-wide">Supervisor Notes</p>
                                        <p className="text-sm text-yellow-900 whitespace-pre-wrap">{report.notes}</p>
                                    </div>
                                )}

                                {/* Attachments */}
                                {(report.attachments || []).length > 0 && (
                                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 font-semibold text-gray-800 text-sm flex items-center gap-2">
                                            📎 Site Photos & Attachments
                                            <span className="ml-1 bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{report.attachments.length}</span>
                                        </div>
                                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {(report.attachments as { name: string; url: string; type: string }[]).map((att, i) => (
                                                att.type?.startsWith('image/') ? (
                                                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-400 transition-colors group">
                                                        <img src={att.url} alt={att.name} className="w-full h-40 object-cover group-hover:opacity-90 transition-opacity" />
                                                        <p className="px-3 py-1.5 text-xs text-gray-500 truncate bg-white">{att.name}</p>
                                                    </a>
                                                ) : (
                                                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                                                        <span className="text-2xl">📄</span>
                                                        <span className="text-sm text-indigo-700 font-medium truncate hover:underline">{att.name}</span>
                                                    </a>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Show existing review notes from previous stages */}
                                {(report.cm_notes || report.cm_approved_by) && report.status !== 'Pending CM' && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">CM Review</span>
                                            {report.cm_approved_by && (
                                                <span className="text-xs text-gray-500">by <span className="font-medium">{report.cm_approved_by}</span></span>
                                            )}
                                        </div>
                                        {report.cm_notes ? (
                                            <p className="text-sm text-blue-900 whitespace-pre-wrap">{report.cm_notes}</p>
                                        ) : (
                                            <p className="text-xs text-blue-400 italic">No notes added</p>
                                        )}
                                    </div>
                                )}

                                {report.pm_notes && report.status === 'Approved' && (
                                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">PM Review</span>
                                            {report.pm_approved_by && (
                                                <span className="text-xs text-gray-500">by <span className="font-medium">{report.pm_approved_by}</span></span>
                                            )}
                                        </div>
                                        <p className="text-sm text-green-900 whitespace-pre-wrap">{report.pm_notes}</p>
                                    </div>
                                )}

                                {/* Review Notes input - only show when can act */}
                                {canActOnReport(report) && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                            <MessageSquare className="w-4 h-4 mr-1 text-gray-400" />
                                            {report.status === 'Pending CM' ? 'CM Review Notes' : 'PM Review Notes'}
                                        </label>
                                        <textarea
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            rows={4}
                                            placeholder={report.status === 'Pending CM' 
                                                ? "Add CM comments before approving/rejecting..." 
                                                : "Add PM comments before final approval/rejection..."}
                                            value={cmNotes}
                                            onChange={e => setCmNotes(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-3 mt-auto">
                                {/* Approval flow hint */}
                                <div className="text-xs text-gray-400">
                                    {report.status === 'Pending CM' && <span>⏳ รอ CM อนุมัติ → ส่งต่อ PM</span>}
                                    {report.status === 'Pending PM' && <span>⏳ รอ PM อนุมัติขั้นสุดท้าย</span>}
                                    {report.status === 'Approved' && <span className="text-green-600">✅ อนุมัติแล้ว</span>}
                                    {report.status === 'Rejected' && <span className="text-red-500">❌ ถูก Reject</span>}
                                </div>
                                {canActOnReport(report) ? (
                                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                        <button onClick={() => openRejectModal(report)} className="w-full sm:w-auto px-5 py-2.5 border-2 border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-xl font-bold transition-colors">
                                            ❌ Reject
                                        </button>
                                        <button onClick={() => handleApprove(report)} className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold shadow-sm transition-colors text-white ${report.status === 'Pending CM' && (user?.role === 'PM' || user?.role === 'Admin') ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}>
                                            {getApproveLabel(report)}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-xs text-gray-400 italic">
                                        {report.status === 'Approved' ? '' : 'ไม่มีสิทธิ์ดำเนินการในขั้นตอนนี้'}
                                    </div>
                                )}
                            </div>
                        </>
                    );
                })()}
            </div>

            {/* PM Edit Change Request Modal: edit qty/rate only */}
            {changeEditModal.open && changeEditModal.req && changeEditDraft && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b bg-amber-50 font-bold text-amber-900">แก้ไขปริมาณ/ราคา (C1) — ไม่สามารถเพิ่ม/ลบรายการ</div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b"><th className="text-left py-2">Description</th><th className="py-2">Qty</th><th className="py-2">Unit</th><th className="py-2">Rate</th></tr></thead>
                                <tbody className="divide-y">
                                    {changeEditDraft.activities.map((a: any, i: number) => (
                                        <tr key={i}>
                                            <td className="py-2 font-medium text-gray-800">{a.description}</td>
                                            <td className="py-2">
                                                <input type="text" inputMode="decimal" className="w-20 px-2 py-1 border rounded text-right" value={a.qty_total} onChange={e => setChangeEditDraft(prev => prev ? { ...prev, activities: prev.activities.map((x: any, j: number) => j === i ? { ...x, qty_total: e.target.value } : x) } : null)} />
                                            </td>
                                            <td className="py-2 text-gray-600">{a.unit}</td>
                                            <td className="py-2">
                                                <input type="text" className="w-24 px-2 py-1 border rounded text-right" value={a.rate} onChange={e => setChangeEditDraft(prev => prev ? { ...prev, activities: prev.activities.map((x: any, j: number) => j === i ? { ...x, rate: e.target.value } : x) } : null)} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="text-xs text-gray-500 mt-3">C2/C3 ไม่แก้ไขรายการ — ใช้ตามเดิม</p>
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end gap-3">
                            <button onClick={() => { setChangeEditModal({ open: false, req: null }); setChangeEditDraft(null); }} className="px-4 py-2 border rounded-xl font-semibold">ยกเลิก</button>
                            <button onClick={handleChangeRequestApply} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl">Submit และอัปเดต SWO</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
