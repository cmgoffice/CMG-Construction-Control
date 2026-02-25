import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from './AuthContext';
import { X, Clock, Mail } from 'lucide-react';

// Google "G" logo SVG component
const GoogleIcon = () => (
    <svg viewBox="0 0 48 48" width="24" height="24">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
);

export const AuthForm = () => {
    const { login, loginWithGoogle, register } = useAuthContext();
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPendingModal, setShowPendingModal] = useState(false);

    // Form fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [position, setPosition] = useState('');

    const handleError = (err: any) => {
        if (err.code === 'auth/pending' || err.message === 'PENDING') {
            setShowPendingModal(true);
            setError('');
        } else {
            setError(err.message || 'An error occurred.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
                navigate('/', { replace: true });
            } else {
                if (password !== confirmPassword) {
                    throw new Error("Passwords do not match.");
                }
                await register(email, password, firstName, lastName, position);
                setShowPendingModal(true);
                setIsLogin(true);
            }
        } catch (err: any) {
            handleError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setLoading(true);
        try {
            await loginWithGoogle();
            navigate('/', { replace: true });
        } catch (err: any) {
            handleError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl font-bold shadow-md">
                        C
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">CMG Tracker</h2>
                    <p className="text-gray-500 mt-2">{isLogin ? 'Sign in to your account' : 'Create a new account'}</p>
                </div>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                    <input required type="text" className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none" value={firstName} onChange={e => setFirstName(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                    <input required type="text" className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none" value={lastName} onChange={e => setLastName(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                                <input required type="text" className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none" value={position} onChange={e => setPosition(e.target.value)} />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input required type="email" className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input required type="password" minLength={6} className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>

                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                            <input required type="password" minLength={6} className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        </div>
                    )}

                    <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400">
                        {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Register'}
                    </button>

                </form>

                {/* Divider */}
                {isLogin && (
                    <>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-gray-300"></div>
                            <span className="text-sm text-gray-400 font-medium">or</span>
                            <div className="flex-1 h-px bg-gray-300"></div>
                        </div>

                        {/* Google Sign-In Button */}
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            type="button"
                            className="w-full flex items-center border-2 border-gray-200 rounded-md overflow-hidden hover:shadow-md transition-shadow disabled:opacity-60"
                            style={{ backgroundColor: '#4285F4' }}
                        >
                            <div className="bg-white p-3 flex items-center justify-center" style={{ minWidth: '48px' }}>
                                <GoogleIcon />
                            </div>
                            <span className="flex-1 text-white font-medium text-base px-4">
                                Sign in with Google
                            </span>
                        </button>
                    </>
                )}

                <div className="text-center mt-4">
                    <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        {isLogin ? "Don't have an account? Register" : "Already have an account? Sign In"}
                    </button>
                </div>
            </div>

            {/* Pending Approval Modal */}
            {showPendingModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPendingModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 relative text-center" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowPendingModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
                            <Clock className="w-8 h-8 text-amber-500" />
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                            Account Pending Approval
                        </h3>

                        <p className="text-gray-600 text-sm leading-relaxed mb-6">
                            บัญชีของคุณกำลังรอการอนุมัติจากผู้ดูแลระบบ<br />
                            กรุณาติดต่อผู้ดูแลระบบเพื่ออนุมัติบัญชีของคุณ
                        </p>

                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg py-3 px-4 mb-5">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>Please contact your system administrator</span>
                        </div>

                        <button
                            onClick={() => setShowPendingModal(false)}
                            className="w-full bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
