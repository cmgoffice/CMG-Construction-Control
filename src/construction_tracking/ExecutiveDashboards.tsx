import React, { useState, useMemo } from 'react';
import { useAuth } from './AuthRBACRouter';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Clock, ShieldCheck, Activity } from 'lucide-react';
import { col } from './firebase';
import { onSnapshot, query } from 'firebase/firestore';

const COLORS = ['#22c55e', '#eab308', '#ef4444'];

export default function ExecutiveDashboards() {
    const { user } = useAuth();
    const [timeframe, setTimeframe] = useState('Monthly');
    const [selectedProject, setSelectedProject] = useState('All');
    const [selectedSupervisor, setSelectedSupervisor] = useState('All');

    const [projects, setProjects] = useState<any[]>([]);
    const [supervisors, setSupervisors] = useState<any[]>([]);
    const [swos, setSwos] = useState<any[]>([]);
    const [dailyReports, setDailyReports] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    React.useEffect(() => {
        const unsubProjects = onSnapshot(query(col("projects")), (snapshot) => {
            setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const unsubSuperv = onSnapshot(query(col("project_supervisors")), (snapshot) => {
            setSupervisors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const unsubSwos = onSnapshot(query(col("site_work_orders")), (snapshot) => {
            setSwos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const unsubReports = onSnapshot(query(col("daily_reports")), (snapshot) => {
            setDailyReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const unsubUsers = onSnapshot(query(col("users")), (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => { unsubProjects(); unsubSuperv(); unsubSwos(); unsubReports(); unsubUsers(); };
    }, []);

    const isExecutive = ['Admin', 'MD', 'GM', 'CD'].includes(user?.role || '');

    const isAdminExec = user?.role === 'Admin' || user?.role === 'MD' || user?.role === 'GM' || user?.role === 'CD';

    const visibleProjects = projects.filter(p => {
        if (isAdminExec) return true;
        return user?.assigned_projects?.includes(p.id);
    });

    const visibleSupervisors = supervisors.filter(s =>
        visibleProjects.some(vp => vp.id === s.project_id)
    );

    // --- Project Progress Chart ---
    // Filter reports by selected project/supervisor, then group by date and compute cumulative actual %
    const progressChartData = useMemo(() => {
        const scopeProjectIds = selectedProject === 'All'
            ? visibleProjects.map(p => p.id)
            : visibleProjects.filter(p => p.no === selectedProject).map(p => p.id);

        const scopeSwos = swos.filter(s => scopeProjectIds.includes(s.project_id) &&
            (selectedSupervisor === 'All' || s.supervisor_name === selectedSupervisor));

        const scopeSwoIds = new Set(scopeSwos.map(s => s.id));

        // Approved reports only
        const approvedReports = dailyReports.filter(r =>
            r.status === 'Approved' && scopeSwoIds.has(r.swo_id)
        );

        // Group reports by date, compute avg actual % per date
        const byDate: Record<string, number[]> = {};
        approvedReports.forEach(r => {
            if (!r.date) return;
            const swo = swos.find(s => s.id === r.swo_id);
            if (!swo) return;
            const totalRequired = (swo.activities || []).reduce((s: number, a: any) => s + (Number(a.qty_total) || 0), 0);
            if (totalRequired === 0) return;
            const todayQty = (r.activities || []).reduce((s: number, a: any) => s + (Number(a.today) || 0), 0);
            if (!byDate[r.date]) byDate[r.date] = [];
            byDate[r.date].push(Math.min(100, (todayQty / totalRequired) * 100));
        });

        // Build sorted cumulative series
        const sortedDates = Object.keys(byDate).sort();
        let cumActual = 0;
        return sortedDates.slice(-12).map((date, i) => {
            const avg = byDate[date].reduce((s, v) => s + v, 0) / byDate[date].length;
            cumActual = Math.min(100, cumActual + avg);
            // Simple linear plan based on position in series
            const planPct = Math.min(100, ((i + 1) / Math.max(sortedDates.slice(-12).length, 1)) * 100);
            return { name: date.slice(5), plan: Math.round(planPct), actual: Math.round(cumActual) };
        });
    }, [swos, dailyReports, visibleProjects, selectedProject, selectedSupervisor]);

    // --- Supervisor SWO Success Rate ---
    const supervisorPieData = useMemo(() => {
        const scopeProjectIds = visibleProjects.map(p => p.id);
        const scopeSwos = swos.filter(s => scopeProjectIds.includes(s.project_id));
        const total = scopeSwos.length;
        if (total === 0) return [];

        const closed = scopeSwos.filter(s => s.closure_status === 'Closed' || s.status === 'Complete' || s.closure_status === 'Approved');
        const rejected = scopeSwos.filter(s => s.status === 'Rejected' || s.closure_status === 'Rejected');
        const active = scopeSwos.filter(s =>
            s.status === 'In Progress' || s.status === 'Assigned' || s.status === 'Acknowledged'
        );

        // Reports that were rejected (rework) among approved reports
        const reworkReports = dailyReports.filter(r =>
            r.status === 'Rejected' && scopeSwos.some(s => s.id === r.swo_id)
        );
        const reworkSwoIds = new Set(reworkReports.map(r => r.swo_id));

        const successCount = closed.length;
        const reworkCount = reworkSwoIds.size;
        const delayedCount = active.length;
        const otherCount = Math.max(0, total - successCount - reworkCount - delayedCount);

        const successPct = Math.round((successCount / total) * 100);
        const reworkPct = Math.round((reworkCount / total) * 100);
        const delayedPct = Math.round(((delayedCount + otherCount) / total) * 100);

        return [
            { name: `Success (On-time/Budget)`, value: successPct || 0 },
            { name: 'Delayed', value: delayedPct || 0 },
            { name: 'Rework Required', value: reworkPct || 0 },
        ].filter(d => d.value > 0);
    }, [swos, dailyReports, visibleProjects]);

    // --- CM/PM Approval SLA ---
    const slaChartData = useMemo(() => {
        const cmUsers = users.filter(u => u.role === 'CM' || u.role === 'PM');
        const scopeProjectIds = visibleProjects.map(p => p.id);
        const scopeReports = dailyReports.filter(r => scopeProjectIds.includes(r.project_id));

        return cmUsers.map(u => {
            const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || u.id;
            const label = `${fullName} (${u.role})`;

            let totalHours = 0;
            let count = 0;

            if (u.role === 'CM') {
                // CM SLA: time from created_at to cm_approved_at
                const cmApproved = scopeReports.filter(r =>
                    r.cm_approved_by && (
                        r.cm_approved_by === fullName ||
                        r.cm_approved_by === u.role
                    ) && r.created_at && r.cm_approved_at
                );
                cmApproved.forEach(r => {
                    const created = new Date(r.created_at).getTime();
                    const approved = new Date(r.cm_approved_at).getTime();
                    const hours = (approved - created) / (1000 * 60 * 60);
                    if (hours > 0 && hours < 720) { totalHours += hours; count++; }
                });
            } else {
                // PM SLA: time from cm_approved_at to pm_approved_at
                const pmApproved = scopeReports.filter(r =>
                    r.pm_approved_by && (
                        r.pm_approved_by === fullName ||
                        r.pm_approved_by === u.role
                    ) && r.cm_approved_at && r.pm_approved_at
                );
                pmApproved.forEach(r => {
                    const cmAt = new Date(r.cm_approved_at).getTime();
                    const pmAt = new Date(r.pm_approved_at).getTime();
                    const hours = (pmAt - cmAt) / (1000 * 60 * 60);
                    if (hours > 0 && hours < 720) { totalHours += hours; count++; }
                });
            }

            const avg = count > 0 ? parseFloat((totalHours / count).toFixed(1)) : null;
            return { name: label, avg_approval_hours: avg, count };
        }).filter(d => d.avg_approval_hours !== null && d.count > 0) as { name: string; avg_approval_hours: number; count: number }[];
    }, [users, dailyReports, visibleProjects]);

    return (
        <div className="space-y-8 pb-12">

            <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics & Dashboards</h1>
                <p className="text-gray-500">Track project progress and executive performance metrics.</p>
            </div>

            {/* Project Progress Dashboard */}
            <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                        Project Cumulative Progress (%)
                    </h2>
                    <div className="flex gap-3">
                        <select
                            className="border-gray-300 rounded-md text-sm p-2 outline-none focus:ring-2 focus:ring-blue-500 border"
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                        >
                            <option value="All">All Projects</option>
                            {visibleProjects.map(p => (
                                <option key={p.id} value={p.no}>{p.no} ({p.name})</option>
                            ))}
                        </select>
                        <select
                            className="border-gray-300 rounded-md text-sm p-2 outline-none focus:ring-2 focus:ring-blue-500 border"
                            value={selectedSupervisor}
                            onChange={(e) => setSelectedSupervisor(e.target.value)}
                        >
                            <option value="All">All Supervisors</option>
                            {visibleSupervisors.map(s => (
                                <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                        </select>
                        <select
                            className="border-gray-300 bg-blue-50 text-blue-800 font-medium rounded-md text-sm p-2 outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200"
                            value={timeframe}
                            onChange={(e) => setTimeframe(e.target.value)}
                        >
                            <option>Daily</option>
                            <option>Weekly</option>
                            <option>Monthly</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-6">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-1 rounded">Active Filters:</span>
                    {selectedProject !== 'All' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">{selectedProject}</span>}
                    {selectedSupervisor !== 'All' && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">{selectedSupervisor}</span>}
                    {selectedProject === 'All' && selectedSupervisor === 'All' && <span className="text-xs text-gray-500 italic">Showing combined overall data</span>}
                </div>

                <div className="h-80 w-full mb-4">
                    {progressChartData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">ยังไม่มีข้อมูลรายงานที่อนุมัติแล้ว</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={progressChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Line type="monotone" dataKey="plan" name="Planned %" stroke="#94a3b8" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                                <Line type="monotone" dataKey="actual" name="Actual %" stroke="#2563eb" strokeWidth={4} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </section>

            {/* Executive Performance Evaluation (STRICTLY Execs Only) */}
            {isExecutive ? (
                <section className="space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center mb-2">
                            <ShieldCheck className="w-6 h-6 mr-2 text-indigo-600" />
                            Executive Performance Evaluation
                        </h2>
                        <p className="text-sm text-gray-500">Strictly visible to CD, GM, and MD.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Supervisor Performance */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-md font-bold text-gray-800 mb-6 flex items-center">
                                <Users className="w-5 h-5 mr-2 text-green-600" />
                                Overall Supervisor SWO Success Rate
                            </h3>
                            <div className="h-64 flex items-center justify-center">
                                {supervisorPieData.length === 0 ? (
                                    <p className="text-gray-400 text-sm">ยังไม่มีข้อมูล SWO</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={supervisorPieData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                outerRadius={90}
                                                innerRadius={60}
                                                fill="#8884d8"
                                                dataKey="value"
                                                label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                            >
                                                {supervisorPieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* SLA Tracking */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-md font-bold text-gray-800 mb-6 flex items-center">
                                <Clock className="w-5 h-5 mr-2 text-orange-500" />
                                CM/PM Approval SLA (Avg Hours)
                            </h3>
                            <div className="h-64">
                                {slaChartData.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">ยังไม่มีข้อมูลการอนุมัติ (ต้องมี cm_approved_at / pm_approved_at)</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={slaChartData} layout="vertical" margin={{ top: 0, right: 30, left: 80, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 12 }} width={80} />
                                            <Tooltip cursor={{ fill: '#f3f4f6' }} formatter={(val: any) => [`${val} hrs`, 'Avg Approval Time']} />
                                            <Bar dataKey="avg_approval_hours" name="Avg Hours to Approve" radius={[0, 4, 4, 0]}>
                                                {slaChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.avg_approval_hours > 8 ? '#f87171' : '#60a5fa'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                            <p className="text-xs text-center text-gray-500 mt-4">* Red bars indicate SLA breach (&gt;8 hours avg)</p>
                        </div>

                    </div>
                </section>
            ) : (
                <div className="bg-gray-50 p-8 rounded-xl border border-gray-200 text-center shadow-inner">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-gray-600">Executive Insight Restricted</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mt-2">You do not have the required clearance (MD, GM, CD) to view Executive Performance Evaluations.</p>
                </div>
            )}

        </div>
    );
}
