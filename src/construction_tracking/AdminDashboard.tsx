import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, query } from 'firebase/firestore';
import { useAuthContext, AppUser, Role, Status } from './AuthContext';
import { Users, CheckCircle, Shield, XCircle, Edit3, Save, X } from 'lucide-react';
import { AlertModal, useAlert } from './AlertModal';

const isAdmin = (role: string | undefined) => role === 'Admin' || role === 'Administrator';

export const AdminDashboard = () => {
    const { appUser } = useAuthContext();
    const { showAlert, showConfirm, showDelete, modalProps } = useAlert();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ firstName: string; lastName: string; position: string; assigned_projects: string[] }>({ firstName: '', lastName: '', position: '', assigned_projects: [] });
    const [projects, setProjects] = useState<any[]>([]);

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
            await updateDoc(doc(db, 'users', userId), { status: 'Approved' });
            showAlert('success', 'อนุมัติสำเร็จ', 'อนุมัติผู้ใช้งานเรียบร้อยแล้ว');
        } catch (error) {
            console.error("Error approving user:", error);
            showAlert('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถอนุมัติผู้ใช้งานได้');
        }
    };

    const handleReject = (userId: string) => {
        showConfirm('ยืนยันการปฏิเสธ?', 'คุณแน่ใจว่าต้องการปฏิเสธผู้ใช้งานนี้ใช่หรือไม่?', async () => {
            try {
                await updateDoc(doc(db, 'users', userId), { status: 'Rejected' });
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

    const pendingUsers = users.filter(u => u.status === 'Pending');
    const otherUsers = users.filter(u => u.status !== 'Pending');
    const sortedUsers = [...pendingUsers, ...otherUsers];

    return (
        <div className="space-y-6">
            <AlertModal {...modalProps} />
            <div className="flex items-center gap-3 mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Panel (User Management)</h1>
                    <p className="text-gray-500 text-sm">Approve pending users, assign roles, and edit user information.</p>
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

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-4 whitespace-nowrap">Name</th>
                                <th className="px-4 py-4 whitespace-nowrap">Email</th>
                                <th className="px-4 py-4 whitespace-nowrap">Position</th>
                                <th className="px-4 py-4 text-center whitespace-nowrap">Status</th>
                                <th className="px-4 py-4 whitespace-nowrap">Role</th>
                                <th className="px-4 py-4 whitespace-nowrap">Projects</th>
                                <th className="px-4 py-4 text-center whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sortedUsers.map((u) => (
                                <tr key={u.uid} className={`hover:bg-gray-50/50 transition-colors ${u.status === 'Pending' ? 'bg-amber-50/30' : ''}`}>
                                    {/* Name */}
                                    <td className="px-4 py-3">
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
                                    <td className="px-4 py-3 text-gray-600 text-xs">{u.email}</td>

                                    {/* Position */}
                                    <td className="px-4 py-3">
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
                                    <td className="px-4 py-3 text-center">
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
                                    <td className="px-4 py-3">
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
                                    <td className="px-4 py-3 min-w-[200px]">
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
                                    <td className="px-4 py-3 text-center">
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
    );
};
