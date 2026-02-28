import React, { useEffect, useState } from 'react';

import { db, logActivity } from './firebase';

import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';

import { useAuthContext, AppUser, Role, Status } from './AuthContext';

import { Users, CheckCircle, Shield, XCircle, Edit3, Save, X, Trash2, Activity, LogIn, LogOut, Navigation } from 'lucide-react';

import { AlertModal, useAlert } from './AlertModal';



const isAdmin = (role: string | undefined) => role === 'Admin' || role === 'Administrator';



export const AdminDashboard = () => {

    const { appUser } = useAuthContext();

    const { showAlert, showConfirm, showDelete, modalProps } = useAlert();

    const [users, setUsers] = useState<AppUser[]>([]);

    const [editingUser, setEditingUser] = useState<string | null>(null);

    const [editForm, setEditForm] = useState<{ firstName: string; lastName: string; position: string; assigned_projects: string[] }>({ firstName: '', lastName: '', position: '', assigned_projects: [] });

    const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [logFilterUser, setLogFilterUser] = useState('');
    const [logFilterAction, setLogFilterAction] = useState('All');
    const [logFilterDate, setLogFilterDate] = useState('');

    const [projects, setProjects] = useState<any[]>([]);
    const [userSearchQuery, setUserSearchQuery] = useState('');



    useEffect(() => {

        if (!isAdmin(appUser?.role)) return;



        const qUsers = query(collection(db, 'users'));

        const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {

            const usersData: AppUser[] = [];

            snapshot.forEach((docSnap) => {

                usersData.push({ uid: docSnap.id, ...docSnap.data() } as AppUser);

            });

            setUsers(usersData);

        });



        const qProjects = query(collection(db, 'projects'));

        const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {

            const projectsData: any[] = [];

            snapshot.forEach((docSnap) => {

                projectsData.push({ id: docSnap.id, ...docSnap.data() });

            });

            setProjects(projectsData);

        });



        return () => {

            unsubscribeUsers();

            unsubscribeProjects();

        };

    }, [appUser]);



    if (!isAdmin(appUser?.role)) {

        return (

            <div className="p-8 text-center text-red-500 font-semibold bg-red-50 rounded-xl mt-8 mx-auto max-w-lg shadow-sm border border-red-100">

                <Shield className="w-12 h-12 mx-auto text-red-400 mb-4" />

                Access Denied: You must be an Admin to view this page.

            </div>

        );

    }



    const handleApprove = async (userId: string) => {

        try {
            const userToApprove = users.find(u => u.uid === userId);

            await updateDoc(doc(db, 'users', userId), { status: 'Approved' });

            // Log user approval
            if (appUser && userToApprove) {
                await logActivity({
                    uid: appUser.uid,
                    name: `${appUser.firstName} ${appUser.lastName}`,
                    role: appUser.role,
                    action: 'Approve',
                    menu: 'Admin Panel',
                    detail: `Approved user: ${userToApprove.firstName} ${userToApprove.lastName} (${userToApprove.email})`
                });
            }

            showAlert('success', 'อนุมัติสำเร็จ', 'อนุมัติผู้ใช้งานเรียบร้อยแล้ว');

        } catch (error) {

            console.error("Error approving user:", error);

            showAlert('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถอนุมัติผู้ใช้งานได้');

        }

    };



    const handleReject = (userId: string) => {

        showConfirm('ยืนยันการปฏิเสธ?', 'คุณแน่ใจว่าต้องการปฏิเสธผู้ใช้งานนี้ใช่หรือไม่?', async () => {

            try {
                const userToReject = users.find(u => u.uid === userId);

                await updateDoc(doc(db, 'users', userId), { status: 'Rejected' });

                // Log user rejection
                if (appUser && userToReject) {
                    await logActivity({
                        uid: appUser.uid,
                        name: `${appUser.firstName} ${appUser.lastName}`,
                        role: appUser.role,
                        action: 'Reject',
                        menu: 'Admin Panel',
                        detail: `Rejected user: ${userToReject.firstName} ${userToReject.lastName} (${userToReject.email})`
                    });
                }

            } catch (error) {

                console.error("Error rejecting user:", error);

                showAlert('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถปฏิเสธผู้ใช้งานได้');

            }

        }, 'ปฏิเสธ', 'ยกเลิก');

    };



    const handleRoleChange = async (userId: string, newRole: Role) => {

        try {

            await updateDoc(doc(db, 'users', userId), { role: newRole });

        } catch (error) {

            console.error("Error updating role:", error);

            showAlert('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดต Role ได้');

        }

    };



    const handleStatusChange = async (userId: string, newStatus: Status) => {

        try {

            await updateDoc(doc(db, 'users', userId), { status: newStatus });

        } catch (error) {

            console.error("Error updating status:", error);

            showAlert('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดตสถานะได้');

        }

    };



    const startEdit = (u: AppUser) => {

        setEditingUser(u.uid);

        setEditForm({ firstName: u.firstName, lastName: u.lastName, position: u.position || '', assigned_projects: u.assigned_projects || [] });

    };



    const cancelEdit = () => {

        setEditingUser(null);

        setEditForm({ firstName: '', lastName: '', position: '', assigned_projects: [] });

    };



    const saveEdit = async (userId: string) => {

        try {

            await updateDoc(doc(db, 'users', userId), {

                firstName: editForm.firstName,

                lastName: editForm.lastName,

                position: editForm.position,

                assigned_projects: editForm.assigned_projects

            });

            setEditingUser(null);

            showAlert('success', 'อัปเดตสำเร็จ', 'ข้อมูลผู้ใช้งานได้รับการอัปเดตแล้ว');

        } catch (error) {

            console.error("Error updating user:", error);

            showAlert('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดตข้อมูลได้');

        }

    };



    const handleDeleteUser = (userId: string, name: string) => {

        if (userId === appUser?.uid) {

            showAlert('warning', 'ไม่สามารถลบได้', 'ไม่สามารถลบบัญชีของตัวเองได้');

            return;

        }

        showDelete(`ลบผู้ใช้ "${name}"?`, 'การลบจะไม่สามารถย้อนกลับได้ ข้อมูลของผู้ใช้นี้จะหายไปถาวร', async () => {

            try {

                await deleteDoc(doc(db, 'users', userId));

                showAlert('success', 'ลบสำเร็จ', `ลบผู้ใช้ "${name}" เรียบร้อยแล้ว`);

            } catch (error) {

                console.error('Error deleting user:', error);

                showAlert('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถลบผู้ใช้งานได้');

            }

        });

    };



    const rolesList: Role[] = ['Admin', 'MD', 'GM', 'CD', 'PCM', 'HRM', 'PM', 'CM', 'Supervisor', 'Staff', 'HR', 'Procurement', 'Site Admin'];

    const statusList: Status[] = ['Pending', 'Approved', 'Rejected'];



    const toggleProjectAssignment = (projectId: string) => {

        setEditForm(prev => {

            const current = new Set(prev.assigned_projects);

            if (current.has(projectId)) {

                current.delete(projectId);

            } else {

                current.add(projectId);

            }

            return { ...prev, assigned_projects: Array.from(current) };

        });

    };



    // Filter users based on search query
    const filteredUsers = users.filter(user => {
        if (!userSearchQuery.trim()) return true;
        const query = userSearchQuery.toLowerCase();
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        const position = (user.position || '').toLowerCase();
        const role = (user.role || '').toLowerCase();
        
        return fullName.includes(query) || 
               email.includes(query) || 
               position.includes(query) ||
               role.includes(query);
    });

    const pendingUsers = filteredUsers.filter(u => u.status === 'Pending');
    const otherUsers = filteredUsers.filter(u => u.status !== 'Pending');
    const sortedUsers = [...pendingUsers, ...otherUsers];



    // Fetch activity logs
    useEffect(() => {
        if (activeTab !== 'logs') return;
        const q = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(500));
        const unsub = onSnapshot(q, (snap) => {
            setActivityLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return unsub;
    }, [activeTab]);

    const filteredLogs = activityLogs.filter(log => {
        const matchUser = !logFilterUser || (log.name || '').toLowerCase().includes(logFilterUser.toLowerCase());
        const matchAction = logFilterAction === 'All' || log.action === logFilterAction;
        const matchDate = !logFilterDate || (log.date || '').startsWith(logFilterDate);
        return matchUser && matchAction && matchDate;
    });

    const getActionIcon = (action: string) => {
        if (action === 'Login') return <LogIn className="w-3.5 h-3.5 text-green-500" />;
        if (action === 'Logout') return <LogOut className="w-3.5 h-3.5 text-red-500" />;
        if (action === 'Navigate') return <Navigation className="w-3.5 h-3.5 text-blue-500" />;
        return <Activity className="w-3.5 h-3.5 text-gray-400" />;
    };

    const getActionBadge = (action: string) => {
        const styles: Record<string, string> = {
            'Login': 'bg-green-100 text-green-700',
            'Logout': 'bg-red-100 text-red-700',
            'Navigate': 'bg-blue-100 text-blue-700',
        };
        return styles[action] || 'bg-gray-100 text-gray-600';
    };

    const formatTimestamp = (ts: string) => {
        if (!ts) return '-';
        try {
            const d = new Date(ts);
            return d.toLocaleString('th-TH', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        } catch { return ts; }
    };

    return (

        <div className="space-y-6">

            <AlertModal {...modalProps} />

            <div className="flex items-center gap-3 mb-0 bg-white p-6 rounded-xl shadow-sm border border-gray-100">

                <Shield className="w-8 h-8 text-blue-600" />

                <div>

                    <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>

                    <p className="text-gray-500 text-sm">Manage users, roles, and view activity logs.</p>

                </div>

                <div className="ml-auto flex gap-3">

                    <div className="text-center px-4 py-2 bg-blue-50 rounded-lg border border-blue-100">

                        <p className="text-2xl font-bold text-blue-600">{users.length}</p>

                        <p className="text-xs text-blue-500 font-medium">Total Users</p>

                    </div>

                    {pendingUsers.length > 0 && (

                        <div className="text-center px-4 py-2 bg-amber-50 rounded-lg border border-amber-100">

                            <p className="text-2xl font-bold text-amber-600">{pendingUsers.length}</p>

                            <p className="text-xs text-amber-500 font-medium">Pending</p>

                        </div>

                    )}

                </div>

            </div>

            {/* Tab Bar */}
            <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1.5 shadow-sm">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        activeTab === 'users' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    User Management
                    {pendingUsers.length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingUsers.length}</span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        activeTab === 'logs' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                >
                    <Activity className="w-4 h-4" />
                    Log การใช้งาน
                </button>
            </div>



            {activeTab === 'users' && (
            <div className="space-y-4">
                {/* Search Filter */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-600 mb-2">ค้นหาผู้ใช้งาน</label>
                            <input
                                type="text"
                                placeholder="พิมพ์ชื่อ, อีเมล, ตำแหน่ง หรือ Role..."
                                value={userSearchQuery}
                                onChange={e => setUserSearchQuery(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        {userSearchQuery && (
                            <button
                                onClick={() => setUserSearchQuery('')}
                                className="text-sm text-red-500 hover:text-red-700 px-3 py-2 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                            >
                                ล้างการค้นหา
                            </button>
                        )}
                        <div className="text-sm text-gray-500">
                            แสดง {sortedUsers.length} / {users.length} คน
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">

                    <table className="w-full text-left text-sm">

                        <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">

                            <tr>

                                <th className="px-3 py-2 whitespace-nowrap text-xs">Name</th>

                                <th className="px-3 py-2 whitespace-nowrap text-xs">Email</th>

                                <th className="px-3 py-2 whitespace-nowrap text-xs">Position</th>

                                <th className="px-3 py-2 text-center whitespace-nowrap text-xs">Status</th>

                                <th className="px-3 py-2 whitespace-nowrap text-xs">Role</th>

                                <th className="px-3 py-2 whitespace-nowrap text-xs">Projects</th>

                                <th className="px-3 py-2 text-center whitespace-nowrap text-xs">Actions</th>

                            </tr>

                        </thead>

                        <tbody className="divide-y divide-gray-100">

                            {sortedUsers.map((u) => (

                                <tr key={u.uid} className={`hover:bg-gray-50/50 transition-colors ${u.status === 'Pending' ? 'bg-amber-50/30' : ''}`}>

                                    {/* Name */}

                                    <td className="px-3 py-1.5">

                                        {editingUser === u.uid ? (

                                            <div className="flex gap-1">

                                                <input

                                                    type="text"

                                                    value={editForm.firstName}

                                                    onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}

                                                    className="w-24 px-2 py-1 border border-blue-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"

                                                    placeholder="First"

                                                />

                                                <input

                                                    type="text"

                                                    value={editForm.lastName}

                                                    onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}

                                                    className="w-24 px-2 py-1 border border-blue-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"

                                                    placeholder="Last"

                                                />

                                            </div>

                                        ) : (

                                            <span className="font-medium text-gray-900">{u.firstName} {u.lastName}</span>

                                        )}

                                    </td>



                                    {/* Email */}

                                    <td className="px-3 py-1.5 text-gray-600 text-xs">{u.email}</td>



                                    {/* Position */}

                                    <td className="px-3 py-1.5">

                                        {editingUser === u.uid ? (

                                            <input

                                                type="text"

                                                value={editForm.position}

                                                onChange={e => setEditForm({ ...editForm, position: e.target.value })}

                                                className="w-32 px-2 py-1 border border-blue-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"

                                                placeholder="Position"

                                            />

                                        ) : (

                                            <span className="text-gray-600">{u.position || <span className="text-gray-300 italic">—</span>}</span>

                                        )}

                                    </td>



                                    {/* Status */}

                                    <td className="px-3 py-1.5 text-center">

                                        <div className="flex items-center justify-center gap-1">

                                            <select

                                                className={`px-2 py-1 rounded-full text-xs font-medium border ${u.uid === appUser?.uid ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${u.status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' :

                                                    u.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' :

                                                        !u.status ? 'bg-gray-100 text-gray-700 border-gray-200' :

                                                            'bg-yellow-100 text-yellow-700 border-yellow-200'

                                                    }`}

                                                value={u.status || ''}

                                                onChange={(e) => handleStatusChange(u.uid, e.target.value as Status)}

                                                disabled={u.uid === appUser?.uid}

                                            >

                                                {!u.status && <option value="" disabled>Select Status</option>}

                                                {statusList.map(s => <option key={s} value={s}>{s}</option>)}

                                            </select>

                                            {u.uid === appUser?.uid && (

                                                <span title="You cannot change your own status" className="text-gray-400">

                                                    <Shield className="w-4 h-4" />

                                                </span>

                                            )}

                                        </div>

                                    </td>



                                    {/* Role */}

                                    <td className="px-3 py-1.5">

                                        <div className="flex items-center gap-1">

                                            <select

                                                className={`border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-1.5 border ${u.uid === appUser?.uid ? 'bg-gray-50 cursor-not-allowed text-gray-500' : 'bg-white cursor-pointer'

                                                    }`}

                                                value={u.role || ''}

                                                onChange={(e) => handleRoleChange(u.uid, e.target.value as Role)}

                                                disabled={u.uid === appUser?.uid}

                                            >

                                                {!rolesList.includes(u.role) && <option value={u.role || ''} disabled>{u.role || 'Select Role'}</option>}

                                                {rolesList.map(r => <option key={r} value={r}>{r}</option>)}

                                            </select>

                                            {u.uid === appUser?.uid && (

                                                <span title="You cannot change your own role" className="text-gray-400 shrink-0">

                                                    <Shield className="w-4 h-4" />

                                                </span>

                                            )}

                                        </div>

                                    </td>



                                    {/* Projects Assigment */}

                                    <td className="px-3 py-1.5 min-w-[180px]">

                                        {editingUser === u.uid ? (

                                            <div className="flex flex-col gap-1 max-h-32 overflow-y-auto border border-blue-200 rounded p-1 bg-white">

                                                {projects.length === 0 && <span className="text-xs text-gray-400">No projects available</span>}

                                                {projects.map(p => (

                                                    <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-blue-50 p-1 rounded">

                                                        <input

                                                            type="checkbox"

                                                            checked={editForm.assigned_projects.includes(p.id)}

                                                            onChange={() => toggleProjectAssignment(p.id)}

                                                            className="rounded text-blue-600 focus:ring-blue-500"

                                                        />

                                                        <span className="truncate" title={p.name}>{p.no}</span>

                                                    </label>

                                                ))}

                                            </div>

                                        ) : (

                                            <div className="flex flex-wrap gap-1 max-w-[250px]">

                                                {u.assigned_projects && u.assigned_projects.length > 0 ? (

                                                    u.assigned_projects.map(pid => {

                                                        const p = projects.find(proj => proj.id === pid);

                                                        return p ? (

                                                            <span key={pid} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded-full border border-blue-200 truncate max-w-[120px]" title={p.name}>

                                                                {p.no}

                                                            </span>

                                                        ) : null;

                                                    })

                                                ) : (

                                                    <span className="text-xs text-gray-400 italic">None</span>

                                                )}

                                            </div>

                                        )}

                                    </td>



                                    {/* Actions */}

                                    <td className="px-3 py-1.5 text-center">

                                        <div className="flex items-center justify-center gap-1">

                                            {editingUser === u.uid ? (

                                                <>

                                                    <button

                                                        onClick={() => saveEdit(u.uid)}

                                                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"

                                                        title="Save"

                                                    >

                                                        <Save className="w-3.5 h-3.5 mr-1" /> Save

                                                    </button>

                                                    <button

                                                        onClick={cancelEdit}

                                                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold rounded shadow-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"

                                                        title="Cancel"

                                                    >

                                                        <X className="w-3.5 h-3.5" />

                                                    </button>

                                                </>

                                            ) : (

                                                <>

                                                    {u.status === 'Pending' && (

                                                        <>

                                                            <button

                                                                onClick={() => handleApprove(u.uid)}

                                                                className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold rounded shadow-sm text-white bg-green-600 hover:bg-green-700 transition-colors"

                                                                title="Approve"

                                                            >

                                                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve

                                                            </button>

                                                            <button

                                                                onClick={() => handleReject(u.uid)}

                                                                className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold rounded shadow-sm text-white bg-red-500 hover:bg-red-600 transition-colors"

                                                                title="Reject"

                                                            >

                                                                <XCircle className="w-3.5 h-3.5 mr-1" /> Reject

                                                            </button>

                                                        </>

                                                    )}

                                                    <button

                                                        onClick={() => startEdit(u)}

                                                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold rounded shadow-sm text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors"

                                                        title="Edit user details"

                                                    >

                                                        <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit

                                                    </button>

                                                    <button

                                                        onClick={() => handleDeleteUser(u.uid, `${u.firstName} ${u.lastName}`)}

                                                        disabled={u.uid === appUser?.uid}

                                                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold rounded shadow-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"

                                                        title={u.uid === appUser?.uid ? 'ไม่สามารถลบตัวเองได้' : 'ลบผู้ใช้'}

                                                    >

                                                        <Trash2 className="w-3.5 h-3.5" />

                                                    </button>

                                                </>

                                            )}

                                        </div>

                                    </td>

                                </tr>

                            ))}

                            {users.length === 0 && (

                                <tr>

                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">Loading users...</td>

                                </tr>

                            )}

                        </tbody>

                    </table>

                    </div>

                </div>
            </div>
            )} {/* end activeTab === 'users' */}

            {activeTab === 'logs' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">ค้นหาชื่อผู้ใช้</label>
                            <input
                                type="text"
                                placeholder="พิมพ์ชื่อ..."
                                value={logFilterUser}
                                onChange={e => setLogFilterUser(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">ประเภทกิจกรรม</label>
                            <select
                                value={logFilterAction}
                                onChange={e => setLogFilterAction(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="All">ทั้งหมด</option>
                                <option value="Login">Login</option>
                                <option value="Logout">Logout</option>
                                <option value="Navigate">เข้าเมนู</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">วันที่</label>
                            <input
                                type="date"
                                value={logFilterDate}
                                onChange={e => setLogFilterDate(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        {(logFilterUser || logFilterAction !== 'All' || logFilterDate) && (
                            <button
                                onClick={() => { setLogFilterUser(''); setLogFilterAction('All'); setLogFilterDate(''); }}
                                className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition-colors self-end"
                            >
                                ล้างตัวกรอง
                            </button>
                        )}
                        <div className="ml-auto self-end text-xs text-gray-400">
                            แสดง {filteredLogs.length} / {activityLogs.length} รายการ
                        </div>
                    </div>

                    {/* Log Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
                        <table className="w-full text-left text-sm text-nowrap">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">เวลา</th>
                                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">ชื่อผู้ใช้</th>
                                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">Role</th>
                                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">กิจกรรม</th>
                                    <th className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">เมนู / รายละเอียด</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-gray-400 text-sm">
                                            <Activity className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                                            <p>ยังไม่มีข้อมูล Log หรือไม่ตรงกับตัวกรอง</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log, idx) => (
                                        <tr key={log.id || idx} className={`hover:bg-gray-50 transition-colors ${log.action === 'Login' ? 'bg-green-50/30' : log.action === 'Logout' ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-3 py-1.5 text-xs text-gray-500 font-mono whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>
                                            <td className="px-3 py-1.5 text-xs font-semibold text-gray-800 whitespace-nowrap">{log.name || '-'}</td>
                                            <td className="px-3 py-1.5 whitespace-nowrap">
                                                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">{log.role || '-'}</span>
                                            </td>
                                            <td className="px-3 py-1.5 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${getActionBadge(log.action)}`}>
                                                    {getActionIcon(log.action)}
                                                    {log.action === 'Navigate' ? 'เข้าเมนู' : log.action}
                                                </span>
                                            </td>
                                            <td className="px-3 py-1.5 text-xs text-gray-600">
                                                {log.menu || log.detail || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )} {/* end activeTab === 'logs' */}

        </div>

    );

};

