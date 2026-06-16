import React, { useState, useMemo } from 'react';
import { useAuth } from './AuthRBACRouter';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, Clock, ShieldCheck, Activity, ClipboardCheck, Building2, CalendarCheck, CheckCircle2 } from 'lucide-react';
import { col, masterDb } from './firebase';
import { onSnapshot, query, collection } from 'firebase/firestore';
import { canAccessAllProjects, isExecutiveRole } from './roleUtils';

const COLORS = ['#22c55e', '#eab308', '#ef4444'];
const PASTEL_CHART = {
    pink: '#f472b6',
    coral: '#fb7185',
    peach: '#fb923c',
    mango: '#fbbf24',
    mint: '#34d399',
    teal: '#2dd4bf',
    sky: '#38bdf8',
    violet: '#a78bfa',
    lavender: '#c084fc',
    softGray: '#f1f5f9'
};
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type SwoDashboardRow = {
    name: string;
    fullName: string;
    total: number;
    closed: number;
    open: number;
    frequency: number;
    submittedDays: number;
    expectedDays: number;
};

type FrequencyTrendRow = {
    name: string;
    expected: number;
    submitted: number;
    frequency: number;
};

const pad2 = (value: number) => value < 10 ? `0${value}` : `${value}`;

const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseDateInput = (value: any): Date | null => {
    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : startOfLocalDay(value);
    }

    if (typeof value === 'object' && typeof value.toDate === 'function') {
        const date = value.toDate();
        return Number.isNaN(date.getTime()) ? null : startOfLocalDay(date);
    }

    if (typeof value === 'string') {
        const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateOnly) {
            return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
        }
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : startOfLocalDay(parsed);
};

const toDateKey = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

const daysBetweenInclusive = (start: Date, end: Date) => {
    if (end.getTime() < start.getTime()) return 0;
    return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
};

const isClosedSwo = (swo: any) =>
    swo.closure_status === 'Closed SWO' ||
    swo.closure_status === 'Closed' ||
    swo.closure_status === 'Approved' ||
    swo.status === 'Complete' ||
    swo.status === 'Closed SWO';

const getProjectNo = (project: any) => project?.no || project?.project_no || project?.projectNo || project?.id || 'Unknown';
const getProjectLabel = (project: any) => {
    const no = getProjectNo(project);
    return project?.name ? `${no} (${project.name})` : no;
};

const compactLabel = (value: string, limit = 16) => value.length > limit ? `${value.slice(0, limit - 1)}...` : value;

export default function ExecutiveDashboards() {
    const { user } = useAuth();
    const [selectedProject, setSelectedProject] = useState('All');
    const [selectedSupervisor, setSelectedSupervisor] = useState('All');

    const [realProjects, setRealProjects] = useState<any[]>([]);
    const [masterProjects, setMasterProjects] = useState<any[]>([]);
    const [supervisors, setSupervisors] = useState<any[]>([]);
    const [swos, setSwos] = useState<any[]>([]);
    const [dailyReports, setDailyReports] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    React.useEffect(() => {
        const unsubProjects = onSnapshot(query(col("projects")), (snapshot) => {
            setRealProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const masterQ = query(collection(masterDb, "artifacts", "cmg-budget-control-default", "public", "data", "projects"));
        const unsubMaster = onSnapshot(masterQ, (snapshot) => {
            setMasterProjects(snapshot.docs.map(doc => {
                const data = doc.data();
                return { id: doc.id, ...data, no: data.jobNo || data.no || '-', isMaster: true };
            }));
        }, (err) => console.error(err));
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
        return () => { unsubProjects(); unsubMaster(); unsubSuperv(); unsubSwos(); unsubReports(); unsubUsers(); };
    }, []);

    const combinedProjectsMap = new Map();
    masterProjects.forEach(p => combinedProjectsMap.set(p.id, { ...p, status: 'ACTIVE' }));
    realProjects.forEach(p => {
        if (p.isMasterOverride && combinedProjectsMap.has(p.id)) {
            combinedProjectsMap.set(p.id, { ...combinedProjectsMap.get(p.id), status: p.status, isMaster: true });
        } else {
            combinedProjectsMap.set(p.id, p);
        }
    });
    const projects = Array.from(combinedProjectsMap.values()).filter((p: any) => p.status !== 'COMPLETE');

    const isExecutive = isExecutiveRole(user?.role);

    const isAdminExec = canAccessAllProjects(user?.role);

    const visibleProjects = projects.filter(p => {
        if (isAdminExec) return true;
        return user?.assigned_projects?.includes(p.id);
    });

    const visibleSupervisors = supervisors.filter(s =>
        visibleProjects.some(vp => vp.id === s.project_id)
    );

    // --- Supervisor SWO Success Rate ---
    const supervisorPieData = useMemo(() => {
        const scopeProjectIds = visibleProjects.map(p => p.id);
        const scopeSwos = swos.filter(s => scopeProjectIds.includes(s.project_id));
        const total = scopeSwos.length;
        if (total === 0) return [];

        const closed = scopeSwos.filter(isClosedSwo);
        const rejected = scopeSwos.filter(s => s.status === 'Rejected' || s.closure_status === 'Rejected');
        const active = scopeSwos.filter(s =>
            s.status === 'In Progress' || s.status === 'Assigned' || s.status === 'Acknowledged' || s.status === 'Accepted'
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

    // --- SWO ownership, closure, and daily report frequency ---
    const swoSummaryAnalytics = useMemo(() => {
        const today = startOfLocalDay(new Date());
        const scopeProjectIds = new Set(
            (selectedProject === 'All'
                ? visibleProjects
                : visibleProjects.filter(p => getProjectNo(p) === selectedProject)
            ).map(p => p.id)
        );

        const projectById = new Map<string, any>();
        visibleProjects.forEach(project => projectById.set(project.id, project));

        const supervisorNameByKey = new Map<string, string>();
        supervisors.forEach(supervisor => {
            const name = supervisor.name || supervisor.supervisor_name || supervisor.email || supervisor.id;
            if (supervisor.id) supervisorNameByKey.set(supervisor.id, name);
            if (supervisor.supervisor_id) supervisorNameByKey.set(supervisor.supervisor_id, name);
            if (supervisor.supervisor_uid) supervisorNameByKey.set(supervisor.supervisor_uid, name);
        });

        users.forEach(appUser => {
            const fullName = appUser.name || `${appUser.firstName || ''} ${appUser.lastName || ''}`.trim() || appUser.email || appUser.id;
            if (appUser.id) supervisorNameByKey.set(appUser.id, fullName);
            if (appUser.uid) supervisorNameByKey.set(appUser.uid, fullName);
        });

        const resolveSupervisorName = (swo: any) => {
            return swo.supervisor_name ||
                swo.supervisor ||
                supervisorNameByKey.get(swo.supervisor_id) ||
                supervisorNameByKey.get(swo.supervisor_uid) ||
                'Unassigned';
        };

        const scopeSwos = swos.filter(swo => {
            if (!scopeProjectIds.has(swo.project_id)) return false;
            if (swo.status === 'Draft') return false;
            return selectedSupervisor === 'All' || resolveSupervisorName(swo) === selectedSupervisor;
        });

        const scopeSwoIds = new Set(scopeSwos.map(swo => swo.id));
        const reportDatesBySwoId = new Map<string, Set<string>>();

        dailyReports.forEach(report => {
            if (!scopeSwoIds.has(report.swo_id)) return;
            const reportDate = parseDateInput(report.date);
            if (!reportDate) return;
            const key = toDateKey(reportDate);
            const current = reportDatesBySwoId.get(report.swo_id) || new Set<string>();
            current.add(key);
            reportDatesBySwoId.set(report.swo_id, current);
        });

        const buildEmptyRow = (name: string, fullName: string): SwoDashboardRow => ({
            name,
            fullName,
            total: 0,
            closed: 0,
            open: 0,
            frequency: 0,
            submittedDays: 0,
            expectedDays: 0
        });

        const getReportingWindow = (swo: any) => {
            const start = parseDateInput(swo.start_date || swo.startDate || swo.planStart);
            if (!start) return null;
            const finish = parseDateInput(swo.finish_date || swo.end_date || swo.finishDate || swo.planFinish) || today;
            const end = finish.getTime() < today.getTime() ? finish : today;
            if (end.getTime() < start.getTime()) return null;
            return { start, end, expectedDays: daysBetweenInclusive(start, end) };
        };

        const getSubmittedDays = (swoId: string, start: Date, end: Date, expectedDays: number) => {
            const reportDates = reportDatesBySwoId.get(swoId);
            if (!reportDates) return 0;

            let submitted = 0;
            reportDates.forEach(dateKey => {
                const reportDate = parseDateInput(dateKey);
                if (reportDate && reportDate.getTime() >= start.getTime() && reportDate.getTime() <= end.getTime()) {
                    submitted += 1;
                }
            });

            return Math.min(submitted, expectedDays);
        };

        const supervisorRowsByName = new Map<string, SwoDashboardRow>();
        const projectRowsByName = new Map<string, SwoDashboardRow>();
        let totalExpectedDays = 0;
        let totalSubmittedDays = 0;
        let closedSwos = 0;

        scopeSwos.forEach(swo => {
            const supervisorName = resolveSupervisorName(swo);
            const supervisorKey = supervisorName || 'Unassigned';
            const project = projectById.get(swo.project_id);
            const projectFullName = project ? getProjectLabel(project) : (swo.project_no || swo.project_id || 'Unknown Project');
            const projectKey = project ? getProjectNo(project) : compactLabel(projectFullName, 18);
            const closed = isClosedSwo(swo);
            const window = getReportingWindow(swo);
            const expectedDays = window ? window.expectedDays : 0;
            const submittedDays = window ? getSubmittedDays(swo.id, window.start, window.end, window.expectedDays) : 0;

            totalExpectedDays += expectedDays;
            totalSubmittedDays += submittedDays;
            if (closed) closedSwos += 1;

            const supervisorRow = supervisorRowsByName.get(supervisorKey) || buildEmptyRow(compactLabel(supervisorKey), supervisorKey);
            supervisorRow.total += 1;
            supervisorRow.closed += closed ? 1 : 0;
            supervisorRow.submittedDays += submittedDays;
            supervisorRow.expectedDays += expectedDays;
            supervisorRowsByName.set(supervisorKey, supervisorRow);

            const projectRow = projectRowsByName.get(projectFullName) || buildEmptyRow(compactLabel(projectKey), projectFullName);
            projectRow.total += 1;
            projectRow.closed += closed ? 1 : 0;
            projectRow.submittedDays += submittedDays;
            projectRow.expectedDays += expectedDays;
            projectRowsByName.set(projectFullName, projectRow);
        });

        const finalizeRows = (rows: SwoDashboardRow[]) => rows.map(row => ({
            ...row,
            open: Math.max(0, row.total - row.closed),
            frequency: row.expectedDays > 0 ? Math.round((row.submittedDays / row.expectedDays) * 100) : 0
        }));

        const supervisorRows = finalizeRows(Array.from(supervisorRowsByName.values()))
            .sort((a, b) => b.total - a.total || b.closed - a.closed)
            .slice(0, 8);

        const projectRows = finalizeRows(Array.from(projectRowsByName.values()))
            .sort((a, b) => b.total - a.total || b.closed - a.closed)
            .slice(0, 8);

        const frequencyRows = finalizeRows(Array.from(supervisorRowsByName.values()))
            .filter(row => row.expectedDays > 0)
            .sort((a, b) => b.expectedDays - a.expectedDays || b.frequency - a.frequency)
            .slice(0, 6);

        const trendRows: FrequencyTrendRow[] = [];
        for (let offset = 9; offset >= 0; offset -= 1) {
            const day = addDays(today, -offset);
            const key = toDateKey(day);
            let expected = 0;
            let submitted = 0;

            scopeSwos.forEach(swo => {
                const start = parseDateInput(swo.start_date || swo.startDate || swo.planStart);
                if (!start || start.getTime() > day.getTime()) return;
                const finish = parseDateInput(swo.finish_date || swo.end_date || swo.finishDate || swo.planFinish) || today;
                if (finish.getTime() < day.getTime()) return;

                expected += 1;
                if (reportDatesBySwoId.get(swo.id)?.has(key)) {
                    submitted += 1;
                }
            });

            trendRows.push({
                name: key.slice(5),
                expected,
                submitted,
                frequency: expected > 0 ? Math.round((submitted / expected) * 100) : 0
            });
        }

        const overallFrequency = totalExpectedDays > 0 ? Math.round((totalSubmittedDays / totalExpectedDays) * 100) : 0;

        return {
            totalSwos: scopeSwos.length,
            closedSwos,
            openSwos: Math.max(0, scopeSwos.length - closedSwos),
            overallFrequency,
            totalExpectedDays,
            totalSubmittedDays,
            supervisorRows,
            projectRows,
            frequencyRows,
            trendRows,
            gaugeData: [
                { name: 'Submitted', value: overallFrequency },
                { name: 'Missing', value: Math.max(0, 100 - overallFrequency) }
            ]
        };
    }, [selectedProject, selectedSupervisor, visibleProjects, swos, dailyReports, supervisors, users]);

    return (
        <div className="space-y-8 pb-12">

            <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics & Dashboards</h1>
                <p className="text-gray-500">Track project progress and executive performance metrics.</p>
            </div>

            {/* SWO Summary & Reporting Frequency */}
            <section className="space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center">
                            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-300 via-amber-200 to-sky-300 text-white flex items-center justify-center mr-3 shadow-sm">
                                <ClipboardCheck className="w-5 h-5" />
                            </span>
                            <span className="bg-gradient-to-r from-pink-600 via-orange-500 to-sky-600 bg-clip-text text-transparent">
                                SWO Summary & Daily Report Frequency
                            </span>
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">สรุปจำนวน SWO, งานที่ปิดแล้ว และความสม่ำเสมอของการส่ง Daily Report ตามช่วง Start - End Date</p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                        <div className="flex flex-col">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-sky-500 mb-1">Project</label>
                            <select
                                className="min-w-[190px] border-sky-200 bg-sky-50 text-sky-800 font-medium rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-sky-300 border"
                                value={selectedProject}
                                onChange={(e) => {
                                    setSelectedProject(e.target.value);
                                    setSelectedSupervisor('All');
                                }}
                            >
                                <option value="All">All Projects</option>
                                {visibleProjects.map(p => (
                                    <option key={p.id} value={getProjectNo(p)}>{getProjectLabel(p)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-pink-500 mb-1">Supervisor</label>
                            <select
                                className="min-w-[190px] border-pink-200 bg-pink-50 text-pink-800 font-medium rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-pink-300 border"
                                value={selectedSupervisor}
                                onChange={(e) => setSelectedSupervisor(e.target.value)}
                            >
                                <option value="All">All Supervisors</option>
                                {visibleSupervisors
                                    .filter(s => selectedProject === 'All' || visibleProjects.some(p => p.id === s.project_id && getProjectNo(p) === selectedProject))
                                    .map(s => (
                                        <option key={s.id} value={s.name}>{s.name}</option>
                                    ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-500 bg-violet-50 border border-violet-200 px-2 py-1 rounded-full">Report Scope</span>
                    {selectedProject !== 'All' && <span className="text-xs bg-sky-100 text-sky-700 border border-sky-200 px-2 py-1 rounded-full font-medium">{selectedProject}</span>}
                    {selectedSupervisor !== 'All' && <span className="text-xs bg-pink-100 text-pink-700 border border-pink-200 px-2 py-1 rounded-full font-medium">{selectedSupervisor}</span>}
                    {selectedProject === 'All' && selectedSupervisor === 'All' && (
                        <span className="text-xs text-violet-700 bg-white border border-violet-200 px-2 py-1 rounded-full font-medium">
                            {isAdminExec ? 'All visible projects' : 'My assigned projects only'}
                        </span>
                    )}
                    {!isAdminExec && <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full font-medium">PM/CM scoped to own projects</span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-pink-50 via-orange-50 to-amber-50 p-5 rounded-xl border border-pink-200 shadow-sm shadow-pink-100">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-pink-500">Total SWO</p>
                                <p className="text-3xl font-bold text-pink-700 mt-1">{swoSummaryAnalytics.totalSwos}</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-white/80 text-orange-500 flex items-center justify-center border border-orange-100 shadow-sm">
                                <ClipboardCheck className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-4 h-2.5 rounded-full bg-white/80 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-pink-400 to-orange-400 rounded-full" style={{ width: swoSummaryAnalytics.totalSwos > 0 ? '100%' : '0%' }} />
                        </div>
                        <p className="text-xs text-pink-700/80 mt-2">Active scope after project and supervisor filters</p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 via-lime-50 to-cyan-50 p-5 rounded-xl border border-emerald-200 shadow-sm shadow-emerald-100">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">Closed SWO</p>
                                <p className="text-3xl font-bold text-emerald-700 mt-1">{swoSummaryAnalytics.closedSwos}</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-white/80 text-emerald-500 flex items-center justify-center border border-emerald-100 shadow-sm">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-4 h-2.5 rounded-full bg-white/80 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-lime-400 to-emerald-400 rounded-full"
                                style={{ width: `${swoSummaryAnalytics.totalSwos > 0 ? Math.round((swoSummaryAnalytics.closedSwos / swoSummaryAnalytics.totalSwos) * 100) : 0}%` }}
                            />
                        </div>
                        <p className="text-xs text-emerald-700/80 mt-2">{swoSummaryAnalytics.openSwos} SWO still open</p>
                    </div>

                    <div className="bg-gradient-to-br from-cyan-50 via-sky-50 to-violet-50 p-5 rounded-xl border border-sky-200 shadow-sm shadow-sky-100">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-sky-500">Report Frequency</p>
                                <p className="text-3xl font-bold text-sky-700 mt-1">{swoSummaryAnalytics.overallFrequency}%</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-white/80 text-violet-500 flex items-center justify-center border border-violet-100 shadow-sm">
                                <CalendarCheck className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-4 h-2.5 rounded-full bg-white/80 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-sky-400 to-violet-400 rounded-full" style={{ width: `${swoSummaryAnalytics.overallFrequency}%` }} />
                        </div>
                        <p className="text-xs text-sky-700/80 mt-2">{swoSummaryAnalytics.totalSubmittedDays}/{swoSummaryAnalytics.totalExpectedDays} submitted days</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    <div className="xl:col-span-2 bg-gradient-to-br from-white via-sky-50 to-pink-50 p-6 rounded-xl border border-sky-200 shadow-sm shadow-sky-100">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
                            <h3 className="text-md font-bold text-sky-900 flex items-center">
                                <Users className="w-5 h-5 mr-2 text-pink-500" />
                                SWO by Supervisor
                            </h3>
                            <div className="flex items-center gap-4 text-xs text-slate-600">
                                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: PASTEL_CHART.mint }} /> Closed</span>
                                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400" /> Open</span>
                            </div>
                        </div>
                        <div className="h-80">
                            {swoSummaryAnalytics.supervisorRows.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm">ยังไม่มีข้อมูล SWO ตาม Supervisor</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={swoSummaryAnalytics.supervisorRows} layout="vertical" margin={{ top: 8, right: 24, left: 16, bottom: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#dbeafe" />
                                        <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                        <YAxis dataKey="name" type="category" width={110} axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 12 }} />
                                        <Tooltip
                                            cursor={{ fill: '#fdf2f8' }}
                                            contentStyle={{ borderRadius: '10px', border: '1px solid #f9a8d4', boxShadow: '0 12px 24px -18px rgb(236 72 153 / 0.45)' }}
                                            formatter={(value: any, name: any) => [value, name]}
                                            labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.fullName || ''}
                                        />
                                        <Bar dataKey="closed" name="Closed SWO" stackId="swo" fill={PASTEL_CHART.mint} radius={[4, 0, 0, 4]} />
                                        <Bar dataKey="open" name="Open SWO" stackId="swo" fill={PASTEL_CHART.pink} radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-6 rounded-xl border border-violet-200 shadow-sm shadow-violet-100">
                        <h3 className="text-md font-bold text-violet-900 mb-4 flex items-center">
                            <CalendarCheck className="w-5 h-5 mr-2 text-cyan-500" />
                            Report Frequency
                        </h3>
                        <div className="relative h-44">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={swoSummaryAnalytics.gaugeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={54}
                                        outerRadius={76}
                                        startAngle={90}
                                        endAngle={-270}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        <Cell fill={PASTEL_CHART.sky} />
                                        <Cell fill="#fde68a" />
                                    </Pie>
                                    <Tooltip formatter={(value: any, name: any) => [`${value}%`, name]} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold text-violet-700">{swoSummaryAnalytics.overallFrequency}%</span>
                                <span className="text-xs text-sky-600">Submitted daily</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-violet-100">
                            <div>
                                <p className="text-xs text-violet-500">Expected</p>
                                <p className="text-xl font-bold text-violet-700">{swoSummaryAnalytics.totalExpectedDays}</p>
                            </div>
                            <div>
                                <p className="text-xs text-cyan-600">Submitted</p>
                                <p className="text-xl font-bold text-cyan-700">{swoSummaryAnalytics.totalSubmittedDays}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    <div className="bg-gradient-to-br from-amber-50 via-white to-fuchsia-50 p-6 rounded-xl border border-amber-200 shadow-sm shadow-amber-100">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
                            <h3 className="text-md font-bold text-amber-900 flex items-center">
                                <Building2 className="w-5 h-5 mr-2 text-fuchsia-500" />
                                SWO by Project
                            </h3>
                            <span className="text-xs text-amber-700 bg-amber-100 border border-amber-200 px-2 py-1 rounded-full">Total vs Closed</span>
                        </div>
                        <div className="h-72">
                            {swoSummaryAnalytics.projectRows.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm">ยังไม่มีข้อมูล SWO ตามโครงการ</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={swoSummaryAnalytics.projectRows} margin={{ top: 10, right: 18, left: 0, bottom: 12 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fde68a" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} interval={0} />
                                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                        <Tooltip
                                            cursor={{ fill: '#fffbeb' }}
                                            contentStyle={{ borderRadius: '10px', border: '1px solid #fbbf24', boxShadow: '0 12px 24px -18px rgb(245 158 11 / 0.45)' }}
                                            formatter={(value: any, name: any) => [value, name]}
                                            labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.fullName || ''}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: 12 }} />
                                        <Bar dataKey="total" name="Total SWO" fill={PASTEL_CHART.lavender} radius={[6, 6, 0, 0]} barSize={18} />
                                        <Bar dataKey="closed" name="Closed SWO" fill={PASTEL_CHART.mango} radius={[6, 6, 0, 0]} barSize={18} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-rose-50 via-white to-emerald-50 p-6 rounded-xl border border-rose-200 shadow-sm shadow-rose-100">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
                            <h3 className="text-md font-bold text-rose-900 flex items-center">
                                <CalendarCheck className="w-5 h-5 mr-2 text-emerald-500" />
                                Frequency by Supervisor
                            </h3>
                            <span className="text-xs text-rose-700 bg-rose-100 border border-rose-200 px-2 py-1 rounded-full">Submitted / expected report days</span>
                        </div>
                        <div className="h-72">
                            {swoSummaryAnalytics.frequencyRows.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm">ยังไม่มีข้อมูลช่วงวันสำหรับคำนวณความถี่</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={swoSummaryAnalytics.frequencyRows} layout="vertical" margin={{ top: 8, right: 28, left: 16, bottom: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#fecdd3" />
                                        <XAxis type="number" domain={[0, 100]} tickFormatter={(value: any) => `${value}%`} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                        <YAxis dataKey="name" type="category" width={110} axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 12 }} />
                                        <Tooltip
                                            cursor={{ fill: '#fff1f2' }}
                                            contentStyle={{ borderRadius: '10px', border: '1px solid #fda4af', boxShadow: '0 12px 24px -18px rgb(244 63 94 / 0.45)' }}
                                            formatter={(value: any) => [`${value}%`, 'Report Frequency']}
                                            labelFormatter={(_: any, payload: any) => {
                                                const row = payload?.[0]?.payload;
                                                return row ? `${row.fullName}: ${row.submittedDays}/${row.expectedDays} days` : '';
                                            }}
                                        />
                                        <Bar dataKey="frequency" name="Report Frequency" radius={[0, 6, 6, 0]} barSize={18}>
                                            {swoSummaryAnalytics.frequencyRows.map(row => (
                                                <Cell key={row.fullName} fill={row.frequency >= 90 ? PASTEL_CHART.mint : row.frequency >= 75 ? PASTEL_CHART.mango : PASTEL_CHART.coral} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-cyan-50 via-white to-orange-50 p-6 rounded-xl border border-cyan-200 shadow-sm shadow-cyan-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
                        <h3 className="text-md font-bold text-cyan-900 flex items-center">
                            <TrendingUp className="w-5 h-5 mr-2 text-orange-500" />
                            10-Day Report Frequency Trend
                        </h3>
                        <span className="text-xs text-cyan-700 bg-cyan-100 border border-cyan-200 px-2 py-1 rounded-full">Daily submitted SWO reports against expected report days</span>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={swoSummaryAnalytics.trendRows} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="reportFrequencyFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={PASTEL_CHART.peach} stopOpacity={0.38} />
                                        <stop offset="95%" stopColor={PASTEL_CHART.sky} stopOpacity={0.04} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#bae6fd" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                <YAxis domain={[0, 100]} tickFormatter={(value: any) => `${value}%`} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '10px', border: '1px solid #67e8f9', boxShadow: '0 12px 24px -18px rgb(6 182 212 / 0.45)' }}
                                    formatter={(value: any, name: any, props: any) => {
                                        if (name === 'frequency') return [`${value}%`, 'Frequency'];
                                        return [value, name];
                                    }}
                                    labelFormatter={(label: any, payload: any) => {
                                        const row = payload?.[0]?.payload;
                                        return row ? `${label} • ${row.submitted}/${row.expected} submitted` : label;
                                    }}
                                />
                                <Area type="monotone" dataKey="frequency" name="frequency" stroke={PASTEL_CHART.peach} strokeWidth={3} fill="url(#reportFrequencyFill)" dot={{ r: 3, fill: PASTEL_CHART.pink }} activeDot={{ r: 6, fill: PASTEL_CHART.peach }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
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
