import React, { useState } from 'react';
import { useAuth } from './AuthRBACRouter';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Clock, ShieldCheck, Activity } from 'lucide-react';
import { db } from './firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

// --- Mock Data ---

// Progress Data (Part D)
const progressData = [
    { name: 'Mon', plan: 15, actual: 12 },
    { name: 'Tue', plan: 30, actual: 28 },
    { name: 'Wed', plan: 45, actual: 45 },
    { name: 'Thu', plan: 60, actual: 58 },
    { name: 'Fri', plan: 75, actual: 80 },
    { name: 'Sat', plan: 90, actual: 95 },
    { name: 'Sun', plan: 100, actual: 100 },
];

// Supervisor Success Rate (Part H)
const supervisorData = [
    { name: 'Success (On-time/Budget)', value: 85 },
    { name: 'Delayed', value: 10 },
    { name: 'Rework Required', value: 5 },
];
const COLORS = ['#22c55e', '#eab308', '#ef4444'];

// PM/CM SLA Tracking (Part H)
const slaData = [
    { name: 'Frank (PM)', avg_approval_hours: 4.5 },
    { name: 'Grace (PM)', avg_approval_hours: 12.0 },
    { name: 'John (CM)', avg_approval_hours: 2.1 },
    { name: 'Eve (CM)', avg_approval_hours: 8.5 },
];

export default function ExecutiveDashboards() {
    const { user } = useAuth();
    const [timeframe, setTimeframe] = useState('Monthly');
    const [selectedProject, setSelectedProject] = useState('All');
    const [selectedSupervisor, setSelectedSupervisor] = useState('All');

    const [projects, setProjects] = useState<any[]>([]);
    const [supervisors, setSupervisors] = useState<any[]>([]);

    React.useEffect(() => {
        const qProjects = query(collection(db, "projects"));
        const unsubProjects = onSnapshot(qProjects, (snapshot) => {
            setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qSuperv = query(collection(db, "project_supervisors"));
        const unsubSuperv = onSnapshot(qSuperv, (snapshot) => {
            setSupervisors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => { unsubProjects(); unsubSuperv(); };
    }, []);

    const isExecutive = ['Admin', 'MD', 'GM', 'CD'].includes(user?.role || '');

    const visibleProjects = projects.filter(p => {
        if (user?.role === 'Admin' || user?.role === 'MD' || user?.role === 'GM' || user?.role === 'CD') return true;
        return user?.assigned_projects?.includes(p.id);
    });

    const visibleSupervisors = supervisors.filter(s =>
        visibleProjects.some(vp => vp.id === s.project_id)
    );

    return (
        <div className="space-y-8 pb-12">

            <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics & Dashboards</h1>
                <p className="text-gray-500">Track project progress and executive performance metrics.</p>
            </div>

            {/* Part D: Project Progress Dashboard (Visible to PMs and Execs) */}
            <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                        Part D: Project Cumulative Progress (%)
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
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={progressData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Line type="monotone" dataKey="plan" name="Planned %" stroke="#94a3b8" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                            <Line type="monotone" dataKey="actual" name="Actual %" stroke="#2563eb" strokeWidth={4} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* Part H: Executive Performance Evaluation (STRICTLY Execs Only) */}
            {isExecutive ? (
                <section className="space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center mb-2">
                            <ShieldCheck className="w-6 h-6 mr-2 text-indigo-600" />
                            Part H: Executive Performance Evaluation
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
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={supervisorData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={90}
                                            innerRadius={60}
                                            fill="#8884d8"
                                            dataKey="value"
                                            label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                        >
                                            {supervisorData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* SLA Tracking */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-md font-bold text-gray-800 mb-6 flex items-center">
                                <Clock className="w-5 h-5 mr-2 text-orange-500" />
                                CM/PM Approval SLA (Avg Hours)
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={slaData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 12 }} />
                                        <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                        <Bar dataKey="avg_approval_hours" name="Avg Hours to Approve" radius={[0, 4, 4, 0]}>
                                            {slaData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.avg_approval_hours > 8 ? '#f87171' : '#60a5fa'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-xs text-center text-gray-500 mt-4">* Red bars indicate SLA breach (&gt;8 hours avg)</p>
                        </div>

                    </div>
                </section>
            ) : (
                <div className="bg-gray-50 p-8 rounded-xl border border-gray-200 text-center shadow-inner">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-gray-600">Executive Insight Restricted</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mt-2">You do not have the required clearance (MD, GM, CD) to view Part H performance evaluations.</p>
                </div>
            )}

        </div>
    );
}
