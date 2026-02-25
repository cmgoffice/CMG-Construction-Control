import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, Trash2, X } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'delete';

interface AlertModalProps {
    open: boolean;
    type: AlertType;
    title: string;
    message?: string;
    onClose: () => void;
    onConfirm?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
}

const CONFIG: Record<AlertType, { icon: React.ReactNode; color: string; bg: string; border: string; btnColor: string }> = {
    success: {
        icon: <CheckCircle className="w-12 h-12 text-green-500" />,
        color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200',
        btnColor: 'bg-green-600 hover:bg-green-700'
    },
    error: {
        icon: <XCircle className="w-12 h-12 text-red-500" />,
        color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200',
        btnColor: 'bg-red-600 hover:bg-red-700'
    },
    warning: {
        icon: <AlertTriangle className="w-12 h-12 text-amber-500" />,
        color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200',
        btnColor: 'bg-amber-500 hover:bg-amber-600'
    },
    info: {
        icon: <Info className="w-12 h-12 text-blue-500" />,
        color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200',
        btnColor: 'bg-blue-600 hover:bg-blue-700'
    },
    confirm: {
        icon: <AlertTriangle className="w-12 h-12 text-orange-500" />,
        color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200',
        btnColor: 'bg-orange-500 hover:bg-orange-600'
    },
    delete: {
        icon: <Trash2 className="w-12 h-12 text-red-500" />,
        color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200',
        btnColor: 'bg-red-600 hover:bg-red-700'
    },
};

export const AlertModal: React.FC<AlertModalProps> = ({
    open, type, title, message, onClose, onConfirm, confirmLabel, cancelLabel
}) => {
    if (!open) return null;
    const cfg = CONFIG[type];
    const isConfirm = type === 'confirm' || type === 'delete';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!isConfirm ? onClose : undefined} />

            {/* Modal */}
            <div className={`relative bg-white rounded-2xl shadow-2xl border ${cfg.border} w-full max-w-sm mx-auto animate-in zoom-in-95 duration-200`}>
                {/* Close button (non-confirm only) */}
                {!isConfirm && (
                    <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                )}

                <div className="p-6 flex flex-col items-center text-center gap-4">
                    {/* Icon */}
                    <div className={`p-3 rounded-full ${cfg.bg}`}>
                        {cfg.icon}
                    </div>

                    {/* Content */}
                    <div>
                        <h3 className={`text-lg font-bold ${cfg.color}`}>{title}</h3>
                        {message && <p className="mt-1 text-sm text-gray-500 whitespace-pre-wrap">{message}</p>}
                    </div>

                    {/* Buttons */}
                    {isConfirm ? (
                        <div className="flex gap-3 w-full mt-1">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-xl font-semibold text-sm transition-colors"
                            >
                                {cancelLabel || 'ยกเลิก'}
                            </button>
                            <button
                                onClick={() => { onConfirm?.(); onClose(); }}
                                className={`flex-1 px-4 py-2.5 text-white rounded-xl font-semibold text-sm transition-colors ${cfg.btnColor}`}
                            >
                                {confirmLabel || 'ยืนยัน'}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onClose}
                            className={`w-full px-4 py-2.5 text-white rounded-xl font-semibold text-sm transition-colors ${cfg.btnColor}`}
                        >
                            {confirmLabel || 'ตกลง'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Hook for easy usage
export const useAlert = () => {
    const [state, setState] = React.useState<{
        open: boolean; type: AlertType; title: string; message?: string;
        onConfirm?: () => void; confirmLabel?: string; cancelLabel?: string;
    }>({ open: false, type: 'info', title: '' });

    const showAlert = (type: AlertType, title: string, message?: string) => {
        setState({ open: true, type, title, message });
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void, confirmLabel?: string, cancelLabel?: string) => {
        setState({ open: true, type: 'confirm', title, message, onConfirm, confirmLabel, cancelLabel });
    };

    const showDelete = (title: string, message: string, onConfirm: () => void) => {
        setState({ open: true, type: 'delete', title, message, onConfirm, confirmLabel: 'ลบ', cancelLabel: 'ยกเลิก' });
    };

    const closeAlert = () => setState(s => ({ ...s, open: false }));

    const modalProps = { ...state, onClose: closeAlert };

    return { showAlert, showConfirm, showDelete, modalProps };
};
