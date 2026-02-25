import React, { useState } from 'react';
import { useAuthContext } from './AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User, KeyRound, Save } from 'lucide-react';

export const Profile = () => {
    const { currentUser, appUser, resetPassword } = useAuthContext();
    const [firstName, setFirstName] = useState(appUser?.firstName || '');
    const [lastName, setLastName] = useState(appUser?.lastName || '');
    const [position, setPosition] = useState(appUser?.position || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setSaving(true);
        try {
            if (currentUser) {
                await updateDoc(doc(db, 'users', currentUser.uid), {
                    firstName,
                    lastName,
                    position
                });
                setMessage('Profile updated successfully.');
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            setMessage('Error updating profile.');
        }
        setSaving(false);
    };

    const handleResetPassword = async () => {
        setMessage('');
        try {
            if (currentUser?.email) {
                await resetPassword(currentUser.email);
                setMessage('Password reset email sent. Please check your inbox.');
            }
        } catch (error) {
            console.error("Error sending reset email:", error);
            setMessage('Error sending reset email.');
        }
    };

    if (!appUser) return <div>Loading Profile...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                    <User className="w-10 h-10 text-blue-600 bg-blue-50 p-2 rounded-full" />
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
                        <p className="text-gray-500 text-sm">Update your personal information and credentials.</p>
                    </div>
                </div>

                {message && (
                    <div className="mb-6 p-4 rounded-md text-sm border font-medium bg-blue-50 text-blue-700 border-blue-200">
                        {message}
                    </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-6 relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                            <input
                                required
                                type="text"
                                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
                                value={firstName}
                                onChange={e => setFirstName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                            <input
                                required
                                type="text"
                                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
                                value={lastName}
                                onChange={e => setLastName(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Position / Title</label>
                            <input
                                required
                                type="text"
                                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
                                value={position}
                                onChange={e => setPosition(e.target.value)}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address (Read-only)</label>
                            <input
                                disabled
                                type="text"
                                className="w-full p-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
                                value={appUser.email}
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={handleResetPassword}
                            className="text-sm flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium px-4 py-2 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                            <KeyRound className="w-4 h-4" /> Send Password Reset
                        </button>

                        <button
                            disabled={saving}
                            type="submit"
                            className="bg-blue-600 text-white font-medium py-2.5 px-6 rounded-lg shadow-sm hover:bg-blue-700 hover:shadow-md transition-all disabled:bg-blue-400 flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" /> {saving ? 'Saving Changes...' : 'Save Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
