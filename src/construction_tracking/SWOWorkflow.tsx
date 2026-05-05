import React, { useState } from 'react';
import {
    FileText, UserCheck, ClipboardCheck, CheckCircle2, XCircle, ArrowRight,
    ChevronDown, ChevronUp, Info, AlertTriangle, Lock, Send, Eye,
    RefreshCw, RotateCcw, GitBranch, Users, Shield, Briefcase, HardHat,
    FileCheck, Star, Clock, BookOpen
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface StepCardProps {
    number: number;
    title: string;
    actor: string;
    actorColor: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    status?: 'normal' | 'warning' | 'success' | 'info';
}

interface RoleBadgeProps {
    role: string;
    color: string;
}

// ─── Role Badge ───────────────────────────────────────────────────────────────
const RoleBadge: React.FC<RoleBadgeProps> = ({ role, color }) => {
    const colors: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-700 border-blue-200',
        green: 'bg-green-100 text-green-700 border-green-200',
        purple: 'bg-purple-100 text-purple-700 border-purple-200',
        orange: 'bg-orange-100 text-orange-700 border-orange-200',
        red: 'bg-red-100 text-red-700 border-red-200',
        indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        gray: 'bg-gray-100 text-gray-700 border-gray-200',
        teal: 'bg-teal-100 text-teal-700 border-teal-200',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[color] || colors.gray}`}>
            {role}
        </span>
    );
};

// ─── Status Arrow ─────────────────────────────────────────────────────────────
const Arrow: React.FC<{ label?: string; type?: 'approve' | 'reject' | 'normal' }> = ({ label, type = 'normal' }) => {
    const colors = {
        approve: 'text-green-600',
        reject: 'text-red-500',
        normal: 'text-blue-500',
    };
    return (
        <div className="flex flex-col items-center my-1">
            <div className={`flex flex-col items-center gap-0.5 ${colors[type]}`}>
                {label && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-current">{label}</span>}
                <ArrowRight className="w-5 h-5 rotate-90" />
            </div>
        </div>
    );
};

// ─── Status Pill ─────────────────────────────────────────────────────────────
const StatusPill: React.FC<{ label: string; color: string }> = ({ label, color }) => {
    const map: Record<string, string> = {
        draft: 'bg-gray-100 text-gray-600 border-gray-300',
        ready: 'bg-sky-100 text-sky-700 border-sky-300',
        assigned: 'bg-blue-100 text-blue-700 border-blue-300',
        accepted: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        'request change': 'bg-orange-100 text-orange-700 border-orange-300',
        'pending cm': 'bg-yellow-100 text-yellow-700 border-yellow-300',
        'pending pm': 'bg-blue-100 text-blue-700 border-blue-300',
        approved: 'bg-green-100 text-green-700 border-green-300',
        rejected: 'bg-red-100 text-red-700 border-red-300',
        'pm review': 'bg-blue-100 text-blue-700 border-blue-300',
        'cd review': 'bg-indigo-100 text-indigo-700 border-indigo-300',
        'md review': 'bg-purple-100 text-purple-700 border-purple-300',
        'closed swo': 'bg-green-100 text-green-700 border-green-300',
    };
    return (
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${map[color] || 'bg-gray-100 text-gray-600 border-gray-300'}`}>
            {label}
        </span>
    );
};

// ─── Collapsible Section ──────────────────────────────────────────────────────
const Section: React.FC<{ title: string; icon: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode; accent?: string }> = ({
    title, icon, defaultOpen = true, children, accent = 'blue'
}) => {
    const [open, setOpen] = useState(defaultOpen);
    const accents: Record<string, string> = {
        blue: 'border-blue-500 bg-blue-50',
        green: 'border-green-500 bg-green-50',
        purple: 'border-purple-500 bg-purple-50',
        orange: 'border-orange-500 bg-orange-50',
        red: 'border-red-500 bg-red-50',
        indigo: 'border-indigo-500 bg-indigo-50',
    };
    const headerColors: Record<string, string> = {
        blue: 'text-blue-700',
        green: 'text-green-700',
        purple: 'text-purple-700',
        orange: 'text-orange-700',
        red: 'text-red-700',
        indigo: 'text-indigo-700',
    };
    return (
        <div className={`rounded-2xl border-l-4 shadow-sm overflow-hidden ${accents[accent] || accents.blue} border border-gray-200`}>
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:opacity-90 transition-opacity"
            >
                <div className={`flex items-center gap-3 font-bold text-lg ${headerColors[accent] || headerColors.blue}`}>
                    {icon}
                    {title}
                </div>
                {open ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {open && <div className="px-6 pb-6">{children}</div>}
        </div>
    );
};

// ─── Flow Node ────────────────────────────────────────────────────────────────
const FlowNode: React.FC<{
    status: string;
    statusColor: string;
    actor: string;
    actorColor: string;
    actions?: string[];
    note?: string;
}> = ({ status, statusColor, actor, actorColor, actions, note }) => (
    <div className="flex flex-col items-center">
        <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm px-4 py-3 w-52 text-center hover:shadow-md transition-shadow">
            <StatusPill label={status} color={statusColor} />
            <div className="mt-2 flex justify-center">
                <RoleBadge role={actor} color={actorColor} />
            </div>
            {actions && actions.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                    {actions.map((a, i) => (
                        <li key={i} className="text-xs text-gray-500">• {a}</li>
                    ))}
                </ul>
            )}
            {note && <p className="mt-1.5 text-[10px] italic text-gray-400">{note}</p>}
        </div>
    </div>
);

// ─── Role Summary Card ────────────────────────────────────────────────────────
const RoleCard: React.FC<{
    role: string;
    color: string;
    icon: React.ReactNode;
    duties: string[];
}> = ({ role, color, icon, duties }) => {
    const borders: Record<string, string> = {
        blue: 'border-blue-300 bg-blue-50',
        green: 'border-green-300 bg-green-50',
        purple: 'border-purple-300 bg-purple-50',
        orange: 'border-orange-300 bg-orange-50',
        indigo: 'border-indigo-300 bg-indigo-50',
        teal: 'border-teal-300 bg-teal-50',
        yellow: 'border-yellow-300 bg-yellow-50',
        gray: 'border-gray-300 bg-gray-50',
    };
    const texts: Record<string, string> = {
        blue: 'text-blue-700', green: 'text-green-700', purple: 'text-purple-700',
        orange: 'text-orange-700', indigo: 'text-indigo-700', teal: 'text-teal-700',
        yellow: 'text-yellow-700', gray: 'text-gray-700',
    };
    return (
        <div className={`rounded-xl border-2 p-4 ${borders[color] || borders.gray}`}>
            <div className={`flex items-center gap-2 font-bold mb-3 ${texts[color] || texts.gray}`}>
                {icon}
                <span>{role}</span>
            </div>
            <ul className="space-y-1.5">
                {duties.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        {d}
                    </li>
                ))}
            </ul>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SWOWorkflow() {
    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-16">

            {/* Header */}
            <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
                <div className="flex items-center gap-4 mb-3">
                    <div className="p-3 bg-white/20 rounded-xl">
                        <GitBranch className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight">SWO Instruction Work Flow</h1>
                        <p className="text-blue-100 mt-1 text-sm">Site Work Order — ขั้นตอนและผู้เกี่ยวข้องตลอด Lifecycle</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-6">
                    {[
                        { label: 'Phase 1', sub: 'สร้าง SWO', color: 'bg-white/20' },
                        { label: 'Phase 2', sub: 'รับงาน', color: 'bg-white/20' },
                        { label: 'Phase 3', sub: 'Daily Report', color: 'bg-white/20' },
                        { label: 'Phase 4', sub: 'Change Request', color: 'bg-white/20' },
                        { label: 'Phase 5', sub: 'ปิด SWO', color: 'bg-white/20' },
                        { label: '5 Phases', sub: 'ทั้งหมด', color: 'bg-yellow-400/30' },
                    ].map((p, i) => (
                        <div key={i} className={`${p.color} rounded-xl px-3 py-2 text-center`}>
                            <div className="text-xs font-bold text-blue-100">{p.label}</div>
                            <div className="text-sm font-semibold">{p.sub}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Phase Overview Bar */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-500" /> ภาพรวม Lifecycle ของ SWO
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                    {[
                        { label: 'Draft', c: 'draft' },
                        { label: '→', c: '' },
                        { label: 'Ready', c: 'ready' },
                        { label: '→', c: '' },
                        { label: 'Assigned', c: 'assigned' },
                        { label: '→', c: '' },
                        { label: 'Accepted', c: 'accepted' },
                        { label: '→', c: '' },
                        { label: 'Daily Reports', c: 'pending cm' },
                        { label: '→', c: '' },
                        { label: 'Request Closure', c: 'pm review' },
                        { label: '→', c: '' },
                        { label: 'Closed SWO ✓', c: 'closed swo' },
                    ].map((item, i) =>
                        item.c === '' ? (
                            <ArrowRight key={i} className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        ) : (
                            <StatusPill key={i} label={item.label} color={item.c} />
                        )
                    )}
                </div>
            </div>

            {/* ─── Phase 1: สร้าง SWO ─── */}
            <Section title="Phase 1 — สร้างและมอบหมาย SWO" icon={<FileText className="w-6 h-6" />} accent="blue">
                <div className="space-y-5">
                    <div className="bg-white rounded-xl border border-blue-100 p-4 text-sm text-gray-600">
                        <p><strong>ผู้ดำเนินการ:</strong> <RoleBadge role="PM" color="blue" /> <RoleBadge role="CM" color="green" /> <RoleBadge role="Admin" color="gray" /></p>
                        <p className="mt-1">สร้าง SWO พร้อมกำหนด scope of work, activities, equipment, team และ supervisor ก่อน Assign งาน</p>
                    </div>

                    {/* Flow */}
                    <div className="flex flex-col items-center gap-0">
                        <FlowNode status="Draft" statusColor="draft" actor="PM / CM / Admin" actorColor="blue"
                            actions={['กรอกข้อมูล SWO', 'กำหนด Activities', 'เลือก Equipment & Team']}
                            note="บันทึกชั่วคราว ยังไม่ Assign" />
                        <Arrow label="Mark Ready" type="normal" />
                        <FlowNode status="Ready" statusColor="ready" actor="PM / CM / Admin" actorColor="blue"
                            actions={['ตรวจสอบข้อมูลครบ', 'พร้อม Assign']} />
                        <Arrow label="Assign Supervisor" type="approve" />
                        <FlowNode status="Assigned" statusColor="assigned" actor="PM / CM / Admin → Supervisor" actorColor="green"
                            actions={['เลือก Supervisor', 'กด Submit / Assign']}
                            note="Supervisor ได้รับแจ้งเตือนทันที" />
                    </div>

                    {/* Detail Table */}
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 text-blue-700">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                                    <th className="px-4 py-3 text-left font-semibold">ผู้ดำเนินการ</th>
                                    <th className="px-4 py-3 text-left font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <tr className="hover:bg-gray-50">
                                    <td className="px-4 py-3"><StatusPill label="Draft" color="draft" /></td>
                                    <td className="px-4 py-3"><RoleBadge role="PM / CM / Admin" color="blue" /></td>
                                    <td className="px-4 py-3 text-gray-600">สร้าง SWO กรอกข้อมูล บันทึก Draft</td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="px-4 py-3"><StatusPill label="Ready" color="ready" /></td>
                                    <td className="px-4 py-3"><RoleBadge role="PM / CM / Admin" color="blue" /></td>
                                    <td className="px-4 py-3 text-gray-600">Mark Ready — ข้อมูลครบ พร้อม Assign</td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="px-4 py-3"><StatusPill label="Assigned" color="assigned" /></td>
                                    <td className="px-4 py-3"><RoleBadge role="PM / CM / Admin" color="blue" /></td>
                                    <td className="px-4 py-3 text-gray-600">Submit / Assign ให้ Supervisor — แจ้งเตือนอัตโนมัติ</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </Section>

            {/* ─── Phase 2: รับงาน ─── */}
            <Section title="Phase 2 — Supervisor รับงาน (SWO Acceptance)" icon={<UserCheck className="w-6 h-6" />} accent="orange">
                <div className="space-y-5">
                    <div className="bg-white rounded-xl border border-orange-100 p-4 text-sm text-gray-600">
                        <p><strong>ผู้ดำเนินการ:</strong> <RoleBadge role="Supervisor" color="orange" /></p>
                        <p className="mt-1">เมื่อได้รับแจ้งเตือน Supervisor ต้องตัดสินใจ <strong>Accept</strong> หรือ <strong>Request Change</strong> ก่อนเริ่มงาน</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Accept Path */}
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-green-700 font-bold mb-3">
                                <CheckCircle2 className="w-5 h-5" /> กรณี Accept
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <StatusPill label="Assigned" color="assigned" />
                                <Arrow label="Accept" type="approve" />
                                <StatusPill label="Accepted" color="accepted" />
                            </div>
                            <p className="text-xs text-green-700 mt-3 text-center">✓ เริ่มส่ง Daily Report ได้ทันที</p>
                        </div>
                        {/* Request Change Path */}
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-orange-700 font-bold mb-3">
                                <RotateCcw className="w-5 h-5" /> กรณี Request Change
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <StatusPill label="Assigned" color="assigned" />
                                <Arrow label="Request Change" type="reject" />
                                <StatusPill label="Request Change" color="request change" />
                                <Arrow label="PM/Admin แก้ไข" type="normal" />
                                <StatusPill label="Assigned (ใหม่)" color="assigned" />
                            </div>
                            <p className="text-xs text-orange-700 mt-3 text-center">⚠ Supervisor ต้องยืนยันรับ Change ก่อนทำงาน</p>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700">ระหว่างที่ SWO อยู่ใน <strong>Assigned</strong> ผู้อื่น (PM/CM/Admin) จะเห็นสถานะ "รอ Supervisor รับงาน" และไม่สามารถดำเนินการใดได้</p>
                    </div>
                </div>
            </Section>

            {/* ─── Phase 3: Daily Report ─── */}
            <Section title="Phase 3 — Daily Report Approval" icon={<ClipboardCheck className="w-6 h-6" />} accent="green">
                <div className="space-y-5">
                    <div className="bg-white rounded-xl border border-green-100 p-4 text-sm text-gray-600">
                        <p><strong>ผู้เกี่ยวข้อง:</strong> <RoleBadge role="Supervisor" color="orange" /> <RoleBadge role="CM" color="green" /> <RoleBadge role="PM" color="blue" /></p>
                        <p className="mt-1">Supervisor ส่ง Daily Report ทุกวัน ผ่านการอนุมัติ 2 ขั้น — CM แล้ว PM</p>
                    </div>

                    {/* Main Approval Flow */}
                    <div className="flex flex-col items-center gap-0">
                        <FlowNode status="Pending CM" statusColor="pending cm" actor="CM" actorColor="green"
                            actions={['ตรวจสอบ Daily Report', 'กรอก CM Notes']} />
                        <div className="grid grid-cols-2 gap-8 my-2 w-full max-w-md">
                            <div className="flex flex-col items-center gap-1">
                                <Arrow label="Approve" type="approve" />
                                <FlowNode status="Pending PM" statusColor="pending pm" actor="PM" actorColor="blue"
                                    actions={['Final Review', 'กรอก PM Notes']} />
                                <div className="grid grid-cols-2 gap-4 mt-2 w-full">
                                    <div className="flex flex-col items-center gap-1">
                                        <Arrow label="Approve" type="approve" />
                                        <StatusPill label="Approved ✓" color="approved" />
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <Arrow label="Reject" type="reject" />
                                        <StatusPill label="Rejected" color="rejected" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <Arrow label="Reject" type="reject" />
                                <StatusPill label="Rejected" color="rejected" />
                            </div>
                        </div>
                    </div>

                    {/* Detail steps */}
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-sm">
                            <thead className="bg-green-50 text-green-700">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                                    <th className="px-4 py-3 text-left font-semibold">ผู้ดำเนินการ</th>
                                    <th className="px-4 py-3 text-left font-semibold">Action</th>
                                    <th className="px-4 py-3 text-left font-semibold">ถัดไป</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <tr className="hover:bg-gray-50">
                                    <td className="px-4 py-3"><StatusPill label="Pending CM" color="pending cm" /></td>
                                    <td className="px-4 py-3"><RoleBadge role="CM" color="green" /></td>
                                    <td className="px-4 py-3 text-gray-600">ตรวจสอบ, กรอก Notes</td>
                                    <td className="px-4 py-3">
                                        <span className="text-green-600 font-medium">Approve →</span> Pending PM<br />
                                        <span className="text-red-500 font-medium">Reject →</span> Rejected
                                    </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="px-4 py-3"><StatusPill label="Pending PM" color="pending pm" /></td>
                                    <td className="px-4 py-3"><RoleBadge role="PM" color="blue" /></td>
                                    <td className="px-4 py-3 text-gray-600">Final review, กรอก Notes</td>
                                    <td className="px-4 py-3">
                                        <span className="text-green-600 font-medium">Approve →</span> Approved ✓<br />
                                        <span className="text-red-500 font-medium">Reject →</span> Rejected
                                    </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="px-4 py-3"><StatusPill label="Approved" color="approved" /></td>
                                    <td className="px-4 py-3 text-gray-500">—</td>
                                    <td className="px-4 py-3 text-gray-600">รายงานถูกนับเข้า Progress</td>
                                    <td className="px-4 py-3 text-gray-500">สิ้นสุด</td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="px-4 py-3"><StatusPill label="Rejected" color="rejected" /></td>
                                    <td className="px-4 py-3"><RoleBadge role="Supervisor" color="orange" /></td>
                                    <td className="px-4 py-3 text-gray-600">แก้ไขและส่งใหม่</td>
                                    <td className="px-4 py-3 text-gray-500">→ Pending CM</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700"><strong>Shortcut:</strong> PM สามารถ "Hand-on" ข้าม CM step ได้โดยตรง (Pending CM → Pending PM ในคลิกเดียว) เมื่อต้องการเร่งงาน</p>
                    </div>
                </div>
            </Section>

            {/* ─── Phase 4: Change Request ─── */}
            <Section title="Phase 4 — Change Request (ขอแก้ไข SWO ระหว่างทำงาน)" icon={<RefreshCw className="w-6 h-6" />} accent="orange">
                <div className="space-y-5">
                    <div className="bg-white rounded-xl border border-orange-100 p-4 text-sm text-gray-600">
                        <p><strong>ผู้เกี่ยวข้อง:</strong> <RoleBadge role="Supervisor" color="orange" /> <RoleBadge role="CM" color="green" /> <RoleBadge role="PM" color="blue" /></p>
                        <p className="mt-1">Supervisor ขอแก้ไข Activities/Equipment/Team ของ SWO ระหว่างที่กำลังทำงานอยู่ ผ่านการอนุมัติ CM → PM</p>
                    </div>

                    <div className="flex flex-col items-center gap-0">
                        <div className="bg-white rounded-xl border-2 border-orange-200 shadow-sm px-4 py-3 w-56 text-center">
                            <StatusPill label="Accepted (In Progress)" color="accepted" />
                            <div className="mt-2">
                                <RoleBadge role="Supervisor" color="orange" />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">ส่งคำขอแก้ไข C1/C2/C3</p>
                        </div>
                        <Arrow label="Submit Change Request" type="normal" />
                        <div className="bg-white rounded-xl border-2 border-yellow-200 shadow-sm px-4 py-3 w-56 text-center">
                            <StatusPill label="Pending CM" color="pending cm" />
                            <div className="mt-2"><RoleBadge role="CM" color="green" /></div>
                            <p className="text-xs text-gray-500 mt-1">ตรวจสอบและส่งต่อ PM</p>
                        </div>
                        <Arrow label="Forward to PM" type="normal" />
                        <div className="bg-white rounded-xl border-2 border-blue-200 shadow-sm px-4 py-3 w-56 text-center">
                            <StatusPill label="Pending PM" color="pending pm" />
                            <div className="mt-2"><RoleBadge role="PM" color="blue" /></div>
                            <p className="text-xs text-gray-500 mt-1">แก้ไข Draft & Apply</p>
                        </div>
                        <Arrow label="Apply Changes" type="approve" />
                        <div className="bg-white rounded-xl border-2 border-green-200 shadow-sm px-4 py-3 w-56 text-center">
                            <StatusPill label="Assigned (Updated)" color="assigned" />
                            <div className="mt-2"><RoleBadge role="Supervisor" color="orange" /></div>
                            <p className="text-xs text-gray-500 mt-1">ยืนยันรับ Change ก่อนเริ่มงาน</p>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700">หลัง PM Apply Changes, SWO กลับมาเป็น <strong>Assigned</strong> และ Supervisor ต้องกด <strong>"Accept Change"</strong> ก่อนส่ง Daily Report ต่อได้</p>
                    </div>
                </div>
            </Section>

            {/* ─── Phase 5: Closure ─── */}
            <Section title="Phase 5 — SWO Closure (ปิดงาน)" icon={<Lock className="w-6 h-6" />} accent="purple">
                <div className="space-y-5">
                    <div className="bg-white rounded-xl border border-purple-100 p-4 text-sm text-gray-600">
                        <p><strong>ผู้เกี่ยวข้อง:</strong> <RoleBadge role="Supervisor" color="orange" /> <RoleBadge role="PM" color="blue" /> <RoleBadge role="CD" color="indigo" /> <RoleBadge role="MD" color="purple" /></p>
                        <p className="mt-1">เมื่องานเสร็จ Supervisor ส่งคำขอปิด SWO ผ่านการอนุมัติ 3 ขั้น — PM → CD → MD</p>
                    </div>

                    {/* Closure Flow */}
                    <div className="flex flex-col items-center gap-0">
                        <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm px-4 py-3 w-56 text-center">
                            <StatusPill label="Accepted" color="accepted" />
                            <div className="mt-2"><RoleBadge role="Supervisor" color="orange" /></div>
                            <p className="text-xs text-gray-500 mt-1">กด "Request Closure"</p>
                        </div>
                        <Arrow label="Request Closure" type="normal" />

                        {/* PM Review */}
                        <div className="bg-white rounded-xl border-2 border-blue-300 shadow-sm px-4 py-3 w-56 text-center">
                            <StatusPill label="PM Review" color="pm review" />
                            <div className="mt-2"><RoleBadge role="PM" color="blue" /></div>
                            <ul className="text-xs text-gray-500 mt-1 text-left space-y-0.5">
                                <li>• กรอก Closure Note</li>
                                <li>• Quality Score</li>
                                <li>• On Time / Delay</li>
                            </ul>
                        </div>
                        <div className="grid grid-cols-2 gap-8 my-2">
                            <div className="flex flex-col items-center gap-1">
                                <Arrow label="Approve" type="approve" />
                                <div className="bg-white rounded-xl border-2 border-indigo-300 shadow-sm px-4 py-3 w-52 text-center">
                                    <StatusPill label="CD Review" color="cd review" />
                                    <div className="mt-2"><RoleBadge role="CD" color="indigo" /></div>
                                    <p className="text-xs text-gray-500 mt-1">ตรวจสอบ & อนุมัติ</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div className="flex flex-col items-center gap-1">
                                        <Arrow label="Approve" type="approve" />
                                        <div className="bg-white rounded-xl border-2 border-purple-300 shadow-sm px-4 py-3 w-44 text-center">
                                            <StatusPill label="MD Review" color="md review" />
                                            <div className="mt-2"><RoleBadge role="MD" color="purple" /></div>
                                            <p className="text-xs text-gray-500 mt-1">Final Approval</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                            <div className="flex flex-col items-center gap-1">
                                                <Arrow label="Approve" type="approve" />
                                                <StatusPill label="Closed SWO ✓" color="closed swo" />
                                            </div>
                                            <div className="flex flex-col items-center gap-1">
                                                <Arrow label="Reject" type="reject" />
                                                <StatusPill label="→ PM Review" color="pm review" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                        <Arrow label="Reject" type="reject" />
                                        <StatusPill label="→ PM Review" color="pm review" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <Arrow label="Reject" type="reject" />
                                <div className="bg-red-50 rounded-xl border-2 border-red-200 shadow-sm px-4 py-3 w-44 text-center">
                                    <StatusPill label="Rejected" color="rejected" />
                                    <div className="mt-2"><RoleBadge role="Supervisor" color="orange" /></div>
                                    <p className="text-xs text-red-500 mt-1">ส่งคำขอใหม่ได้</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Closure steps table */}
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-sm">
                            <thead className="bg-purple-50 text-purple-700">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                                    <th className="px-4 py-3 text-left font-semibold">ผู้ดำเนินการ</th>
                                    <th className="px-4 py-3 text-left font-semibold">ข้อมูลที่บันทึก</th>
                                    <th className="px-4 py-3 text-left font-semibold">ถัดไป</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <tr className="hover:bg-gray-50">
                                    <td className="px-4 py-3"><StatusPill label="PM Review" color="pm review" /></td>
                                    <td className="px-4 py-3"><RoleBadge role="PM" color="blue" /></td>
                                    <td className="px-4 py-3 text-gray-600">Closure Note, Quality Score, On-Time</td>
                                    <td className="px-4 py-3">
                                        <span className="text-green-600">Approve →</span> CD Review<br />
                                        <span className="text-red-500">Reject →</span> คืน Supervisor
                                    </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="px-4 py-3"><StatusPill label="CD Review" color="cd review" /></td>
                                    <td className="px-4 py-3"><RoleBadge role="CD" color="indigo" /></td>
                                    <td className="px-4 py-3 text-gray-600">CD Closure Note</td>
                                    <td className="px-4 py-3">
                                        <span className="text-green-600">Approve →</span> MD Review<br />
                                        <span className="text-red-500">Reject →</span> PM Review
                                    </td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td className="px-4 py-3"><StatusPill label="MD Review" color="md review" /></td>
                                    <td className="px-4 py-3"><RoleBadge role="MD" color="purple" /></td>
                                    <td className="px-4 py-3 text-gray-600">Final verification</td>
                                    <td className="px-4 py-3">
                                        <span className="text-green-600">Approve →</span> <strong>Closed SWO ✓</strong><br />
                                        <span className="text-red-500">Reject →</span> PM Review
                                    </td>
                                </tr>
                                <tr className="hover:bg-gray-50 bg-green-50">
                                    <td className="px-4 py-3"><StatusPill label="Closed SWO" color="closed swo" /></td>
                                    <td className="px-4 py-3 text-gray-500">—</td>
                                    <td className="px-4 py-3 text-gray-600">SWO ปิดสมบูรณ์</td>
                                    <td className="px-4 py-3 font-semibold text-green-600">สิ้นสุด Workflow ✓</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </Section>

            {/* ─── Role Summary ─── */}
            <Section title="สรุปบทบาทและสิทธิ์ทั้งหมด" icon={<Users className="w-6 h-6" />} accent="indigo">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <RoleCard role="PM (Project Manager)" color="blue" icon={<Briefcase className="w-4 h-4" />}
                        duties={[
                            'สร้าง / Assign SWO',
                            'อนุมัติ Daily Report (Final)',
                            'อนุมัติ Change Request',
                            'Closure Review ขั้นแรก',
                            'เห็นข้อมูลเฉพาะ Project ตนเอง',
                        ]} />
                    <RoleCard role="CM (Construction Manager)" color="green" icon={<HardHat className="w-4 h-4" />}
                        duties={[
                            'สร้าง / Assign SWO',
                            'อนุมัติ Daily Report ขั้นแรก',
                            'ส่งต่อ Change Request ไปยัง PM',
                        ]} />
                    <RoleCard role="Supervisor" color="orange" icon={<UserCheck className="w-4 h-4" />}
                        duties={[
                            'รับงาน (Accept / Request Change)',
                            'ส่ง Daily Report ทุกวัน',
                            'ขอแก้ไข SWO (Change Request)',
                            'ส่งคำขอปิด SWO (Closure)',
                        ]} />
                    <RoleCard role="CD (Construction Director)" color="indigo" icon={<Shield className="w-4 h-4" />}
                        duties={[
                            'Closure Review ขั้นสอง',
                            'เห็นข้อมูล SWO ทุก Project',
                        ]} />
                    <RoleCard role="MD (Managing Director)" color="purple" icon={<Star className="w-4 h-4" />}
                        duties={[
                            'Final Closure Approval',
                            'ปิด SWO อย่างเป็นทางการ',
                            'เห็นข้อมูลทั้งหมดในระบบ',
                        ]} />
                    <RoleCard role="Admin" color="gray" icon={<Shield className="w-4 h-4" />}
                        duties={[
                            'ทำได้ทุกอย่างในระบบ',
                            'ลบ SWO / Daily Report',
                            'จัดการ User accounts',
                        ]} />
                </div>
            </Section>

            {/* ─── SLA & Timestamps ─── */}
            <Section title="SLA & Timestamps ที่ระบบบันทึก" icon={<Clock className="w-6 h-6" />} accent="green">
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                        <thead className="bg-green-50 text-green-700">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                                <th className="px-4 py-3 text-left font-semibold">บันทึกเมื่อ</th>
                                <th className="px-4 py-3 text-left font-semibold">ใช้คำนวณ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            <tr className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs text-gray-700">created_at</td>
                                <td className="px-4 py-3 text-gray-600">Supervisor ส่ง Daily Report</td>
                                <td className="px-4 py-3 text-gray-600">SLA ตั้งต้นของ CM</td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs text-gray-700">cm_approved_at</td>
                                <td className="px-4 py-3 text-gray-600">CM กด Approve</td>
                                <td className="px-4 py-3 text-gray-600">CM SLA = cm_approved_at − created_at</td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs text-gray-700">pm_approved_at</td>
                                <td className="px-4 py-3 text-gray-600">PM กด Final Approve</td>
                                <td className="px-4 py-3 text-gray-600">PM SLA = pm_approved_at − cm_approved_at</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700">ข้อมูล SLA นำไปแสดงผลใน <strong>Analytics Dashboard</strong> — CM/PM Approval SLA Chart</p>
                </div>
            </Section>

            {/* Footer */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 text-center">
                <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">CMG Construction Control — SWO Instruction Work Flow</p>
                <p className="text-xs text-gray-400 mt-1">อ้างอิงจาก source code จริงของระบบ</p>
            </div>
        </div>
    );
}
