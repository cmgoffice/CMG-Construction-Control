import React, { useState } from 'react';
import {
    X, BookOpen, Briefcase, FileText, CheckCircle, BarChart3,
    Shield, Users, Wrench, HardHat, ChevronRight, ChevronDown,
    Bell, ClipboardList, AlertTriangle, LogIn, Settings,
    UserCheck, Star, ArrowRight, Info, Layers, Eye,
    PlusCircle, Edit3, Send, XCircle, RefreshCw, Lock
} from 'lucide-react';

const ROLES = ['Admin', 'PM', 'CM', 'Supervisor', 'MD / CD / GM'] as const;
type ManualRole = typeof ROLES[number];

interface Step {
    step: number;
    title: string;
    desc: string;
    icon: React.ReactNode;
    tip?: string;
}

interface MenuSection {
    menu: string;
    icon: React.ReactNode;
    color: string;
    badgeColor: string;
    who: string;
    steps: Step[];
}

const roleSections: Record<ManualRole, MenuSection[]> = {
    'Admin': [
        {
            menu: 'Admin Panel',
            icon: <Shield className="w-5 h-5" />,
            color: 'from-purple-500 to-purple-700',
            badgeColor: 'bg-purple-100 text-purple-700',
            who: 'Admin เท่านั้น',
            steps: [
                { step: 1, icon: <UserCheck className="w-4 h-4" />, title: 'อนุมัติ / ปฏิเสธผู้ใช้ใหม่', desc: 'เมื่อมีผู้ลงทะเบียนใหม่ กระดิ่งแจ้งเตือนจะแสดงตัวเลข → ไปที่เมนู Admin Panel แท็บ "ผู้ใช้งาน" → กด Approve หรือ Reject', tip: 'ไอคอนกระดิ่งด้านบนขวาจะแสดงตัวเลขสีแดงเมื่อมีผู้รอการอนุมัติ' },
                { step: 2, icon: <Settings className="w-4 h-4" />, title: 'กำหนด Role และสิทธิ์', desc: 'คลิกไอคอนดินสอ (Edit) ข้างชื่อผู้ใช้ → เลือก Role ที่ต้องการ (PM / CM / Supervisor ฯลฯ) → ติ๊กเลือกโปรเจกต์ที่ต้องการมอบหมาย → กด Save', tip: 'การเปลี่ยน Role และ Assigned Projects จะมีผลทันทีโดยไม่ต้องให้ผู้ใช้ logout' },
                { step: 3, icon: <BarChart3 className="w-4 h-4" />, title: 'ดู Activity Log', desc: 'แท็บ "Activity Log" → ดูประวัติการใช้งานทั้งหมด เช่น Login, Create, Approve, Reject พร้อมระบุ SWO No. และเหตุผล', tip: 'สามารถกรองตามชื่อผู้ใช้, Role, วันที่, หรือประเภทกิจกรรมได้' },
            ]
        },
        {
            menu: 'Projects (A1-A4)',
            icon: <Briefcase className="w-5 h-5" />,
            color: 'from-blue-500 to-blue-700',
            badgeColor: 'bg-blue-100 text-blue-700',
            who: 'Admin, MD, GM, CD, PM, CM',
            steps: [
                { step: 1, icon: <PlusCircle className="w-4 h-4" />, title: 'สร้างโปรเจกต์ใหม่ (A1)', desc: 'ไปที่เมนู Projects → กดปุ่ม "+ New Project" → กรอก Project No., ชื่อโปรเจกต์, วันเริ่ม-สิ้นสุด → กด Save', tip: 'กำหนด Project No. ในรูปแบบ เช่น PRJ-2026-J-73 เพื่อใช้อ้างอิง SWO' },
                { step: 2, icon: <Users className="w-4 h-4" />, title: 'เพิ่ม Supervisor (A2)', desc: 'คลิกแท็บ "Supervisors" → กด "+ Add" → เลือกชื่อ Supervisor จากรายชื่อ, ระบุ Scope Type, วันเริ่ม-สิ้นสุด, รูปแบบการทำงาน → กด Save', tip: 'Supervisor ต้องถูกสร้างบัญชีผู้ใช้และอนุมัติแล้วก่อนจึงจะปรากฏในรายการ' },
                { step: 3, icon: <Wrench className="w-4 h-4" />, title: 'เพิ่มอุปกรณ์ (A3)', desc: 'คลิกแท็บ "Equipment" → กด "+ Add" → กรอกชื่ออุปกรณ์, PO No., ประเภท, เงื่อนไขเชื้อเพลิง, วันเริ่ม-สิ้นสุด → กด Save' },
                { step: 4, icon: <HardHat className="w-4 h-4" />, title: 'เพิ่มทีมงาน (A4)', desc: 'คลิกแท็บ "Worker Teams" → กด "+ Add" → กรอกรหัสทีม, ชื่อทีม, หัวหน้าทีม, ประเภท, จำนวนคน → กด Save' },
            ]
        },
        {
            menu: 'Create SWO',
            icon: <FileText className="w-5 h-5" />,
            color: 'from-green-500 to-green-700',
            badgeColor: 'bg-green-100 text-green-700',
            who: 'Admin, PM, CM',
            steps: [
                { step: 1, icon: <Edit3 className="w-4 h-4" />, title: 'กรอกข้อมูล SWO', desc: 'ไปที่เมนู Create SWO → เลือกโปรเจกต์ → กรอก Work Name/Scope, เลือก Supervisor, อุปกรณ์, ทีมงาน, วันเริ่ม-สิ้นสุด' },
                { step: 2, icon: <Send className="w-4 h-4" />, title: 'บันทึก Draft หรือ Assign', desc: 'กด "Save Draft" เพื่อบันทึกชั่วคราว หรือกด "Assign SWO" เพื่อส่งงานให้ Supervisor ทันที', tip: 'ระบบจะสร้าง SWO No. อัตโนมัติ เช่น J-73-SWO-001 โดยไม่ซ้ำกัน' },
                { step: 3, icon: <Bell className="w-4 h-4" />, title: 'Supervisor รับการแจ้งเตือน', desc: 'Supervisor จะได้รับแจ้งเตือนผ่านกระดิ่งเมื่อมี SWO ถูก Assign ให้ → Supervisor กด Accept หรือ Request Change' },
            ]
        },
        {
            menu: 'Daily Report',
            icon: <ClipboardList className="w-5 h-5" />,
            color: 'from-orange-500 to-orange-700',
            badgeColor: 'bg-orange-100 text-orange-700',
            who: 'ทุก Role (อ่านได้), Supervisor (กรอกได้)',
            steps: [
                { step: 1, icon: <Eye className="w-4 h-4" />, title: 'ดู SWO ทั้งหมด', desc: 'Admin เห็น SWO ทุกโปรเจกต์ กรองตามวันที่, โปรเจกต์, Supervisor ได้' },
                { step: 2, icon: <CheckCircle className="w-4 h-4" />, title: 'ดูและจัดการรายงาน', desc: 'คลิกแถว SWO → ดูรายงานของวันนั้น เห็น C1 Progress, อุปกรณ์, จำนวนคน' },
            ]
        },
        {
            menu: 'Approvals',
            icon: <CheckCircle className="w-5 h-5" />,
            color: 'from-teal-500 to-teal-700',
            badgeColor: 'bg-teal-100 text-teal-700',
            who: 'Admin, PM, CM',
            steps: [
                { step: 1, icon: <Eye className="w-4 h-4" />, title: 'ดูรายงานรอการอนุมัติ', desc: 'เมนู Approvals แสดงรายการ Daily Report ที่อยู่ในสถานะ Pending CM หรือ Pending PM' },
                { step: 2, icon: <CheckCircle className="w-4 h-4" />, title: 'Approve', desc: 'เลือกรายงาน → ตรวจสอบข้อมูล → กด "Approve & Forward to PM" (CM) หรือ "Final Approval" (PM)' },
                { step: 3, icon: <XCircle className="w-4 h-4" />, title: 'Reject', desc: 'กด "Reject" → กรอกเหตุผล → กด Confirm → ระบบแจ้งเตือน Supervisor ให้แก้ไขและส่งใหม่' },
            ]
        },
        {
            menu: 'Closures',
            icon: <Lock className="w-5 h-5" />,
            color: 'from-red-500 to-red-700',
            badgeColor: 'bg-red-100 text-red-700',
            who: 'ทุก Role (ตาม flow)',
            steps: [
                { step: 1, icon: <Send className="w-4 h-4" />, title: 'Supervisor ส่งคำขอปิด SWO', desc: 'Supervisor กด "Request Closure" → เลือก SWO ที่ต้องการปิด → ยืนยัน → สถานะเปลี่ยนเป็น PM Review' },
                { step: 2, icon: <CheckCircle className="w-4 h-4" />, title: 'PM / CD / MD Review', desc: 'ระบบแจ้งเตือน PM → PM กด View Details → กรอก Note, Quality Score, On Time → Approve (ส่งต่อ CD) หรือ Reject (ส่งคืน Supervisor)' },
                { step: 3, icon: <Lock className="w-4 h-4" />, title: 'MD ปิด SWO', desc: 'หลัง CD อนุมัติ MD จะได้รับแจ้งเตือน → MD ตรวจสอบและกด Approve เพื่อปิด SWO → สถานะเปลี่ยนเป็น "Closed SWO"' },
            ]
        },
        {
            menu: 'Analytics',
            icon: <BarChart3 className="w-5 h-5" />,
            color: 'from-indigo-500 to-indigo-700',
            badgeColor: 'bg-indigo-100 text-indigo-700',
            who: 'Admin, MD, GM, CD, PM',
            steps: [
                { step: 1, icon: <Eye className="w-4 h-4" />, title: 'ดูภาพรวม', desc: 'เมนู Analytics แสดง Dashboard สรุป SWO ทั้งหมด, Progress รายโปรเจกต์, สถิติการอนุมัติ' },
            ]
        },
    ],
    'PM': [
        {
            menu: 'Projects',
            icon: <Briefcase className="w-5 h-5" />,
            color: 'from-blue-500 to-blue-700',
            badgeColor: 'bg-blue-100 text-blue-700',
            who: 'PM (เห็นเฉพาะโปรเจกต์ที่ได้รับมอบหมาย)',
            steps: [
                { step: 1, icon: <Eye className="w-4 h-4" />, title: 'ดูโปรเจกต์ของฉัน', desc: 'PM เห็นเฉพาะโปรเจกต์ที่ Admin ได้ Assign ไว้ → ดูรายละเอียด Supervisor, อุปกรณ์, ทีมงาน' },
                { step: 2, icon: <Users className="w-4 h-4" />, title: 'เพิ่ม Supervisor (A2)', desc: 'ในโปรเจกต์ของตนเอง → แท็บ Supervisors → กด "+ Add" → เลือก Supervisor, กรอก Scope, วัน → กด Save', tip: 'ต้องมี Supervisor ที่ได้รับการสร้างบัญชีและอนุมัติแล้วเท่านั้น' },
                { step: 3, icon: <Wrench className="w-4 h-4" />, title: 'เพิ่มอุปกรณ์ / ทีมงาน', desc: 'แท็บ Equipment หรือ Worker Teams → กด "+ Add" → กรอกรายละเอียด → กด Save' },
            ]
        },
        {
            menu: 'Create SWO',
            icon: <FileText className="w-5 h-5" />,
            color: 'from-green-500 to-green-700',
            badgeColor: 'bg-green-100 text-green-700',
            who: 'PM (เฉพาะโปรเจกต์ที่รับผิดชอบ)',
            steps: [
                { step: 1, icon: <Edit3 className="w-4 h-4" />, title: 'สร้าง SWO', desc: 'เมนู Create SWO → เลือกโปรเจกต์ของตน → กรอก Work Name, เลือก Supervisor, อุปกรณ์, ทีม, วันเริ่ม-สิ้นสุด' },
                { step: 2, icon: <Send className="w-4 h-4" />, title: 'Save Draft หรือ Assign', desc: 'กด "Save Draft" บันทึกชั่วคราว หรือกด "Assign SWO" เพื่อมอบหมายงานให้ Supervisor ทันที', tip: 'SWO No. ถูกสร้างอัตโนมัติ จะไม่ซ้ำกันแม้สร้างพร้อมกัน' },
            ]
        },
        {
            menu: 'Approvals',
            icon: <CheckCircle className="w-5 h-5" />,
            color: 'from-teal-500 to-teal-700',
            badgeColor: 'bg-teal-100 text-teal-700',
            who: 'PM (อนุมัติขั้นสุดท้าย)',
            steps: [
                { step: 1, icon: <Bell className="w-4 h-4" />, title: 'รับการแจ้งเตือน', desc: 'กระดิ่งแสดงตัวเลขเมื่อมี Daily Report รอ Pending PM → คลิกกระดิ่งและเลือกรายการ หรือไปที่เมนู Approvals' },
                { step: 2, icon: <CheckCircle className="w-4 h-4" />, title: 'Approve / Reject', desc: 'ตรวจสอบรายงาน → กด "Final Approval (PM)" เพื่ออนุมัติ หรือกด Reject พร้อมกรอกเหตุผล → ระบบแจ้งเตือน Supervisor' },
            ]
        },
        {
            menu: 'Closures',
            icon: <Lock className="w-5 h-5" />,
            color: 'from-red-500 to-red-700',
            badgeColor: 'bg-red-100 text-red-700',
            who: 'PM (เห็นเฉพาะโปรเจกต์ที่รับผิดชอบ)',
            steps: [
                { step: 1, icon: <Bell className="w-4 h-4" />, title: 'รับแจ้งเตือน Closure', desc: 'เมื่อ Supervisor ส่ง Request Closure → PM ได้รับแจ้งเตือนทางกระดิ่ง → ไปที่เมนู Closures' },
                { step: 2, icon: <Eye className="w-4 h-4" />, title: 'View Details และ Review', desc: 'กด "View Details" บนรายการที่มีสถานะ "PM Review" → ตรวจสอบ → กรอก Closure Note, Quality Score, On Time' },
                { step: 3, icon: <ArrowRight className="w-4 h-4" />, title: 'Approve → ส่งต่อ CD', desc: 'กด Approve → ระบบส่งต่อไปยัง CD Review อัตโนมัติ หรือ กด Reject → กรอกเหตุผล → Supervisor รับแจ้งเตือน', tip: 'PM จะเห็นเฉพาะ SWO ในโปรเจกต์ที่ตนรับผิดชอบเท่านั้น' },
            ]
        },
    ],
    'CM': [
        {
            menu: 'Projects',
            icon: <Briefcase className="w-5 h-5" />,
            color: 'from-blue-500 to-blue-700',
            badgeColor: 'bg-blue-100 text-blue-700',
            who: 'CM (เห็นโปรเจกต์ที่ได้รับมอบหมาย)',
            steps: [
                { step: 1, icon: <Eye className="w-4 h-4" />, title: 'ดูข้อมูลโปรเจกต์', desc: 'CM เห็นโปรเจกต์ที่ Admin Assign → ดูรายชื่อ Supervisor, อุปกรณ์, ทีมงาน' },
                { step: 2, icon: <Users className="w-4 h-4" />, title: 'เพิ่ม Supervisor / Equipment / Team', desc: 'แท็บที่ต้องการ → กด "+ Add" → กรอกข้อมูล → กด Save เหมือน PM' },
            ]
        },
        {
            menu: 'Create SWO',
            icon: <FileText className="w-5 h-5" />,
            color: 'from-green-500 to-green-700',
            badgeColor: 'bg-green-100 text-green-700',
            who: 'CM',
            steps: [
                { step: 1, icon: <Edit3 className="w-4 h-4" />, title: 'สร้าง SWO', desc: 'เมนู Create SWO → เลือกโปรเจกต์ → กรอกข้อมูล → Assign SWO ให้ Supervisor' },
            ]
        },
        {
            menu: 'Daily Report / Approvals',
            icon: <CheckCircle className="w-5 h-5" />,
            color: 'from-teal-500 to-teal-700',
            badgeColor: 'bg-teal-100 text-teal-700',
            who: 'CM',
            steps: [
                { step: 1, icon: <Bell className="w-4 h-4" />, title: 'รับแจ้งเตือน Pending CM', desc: 'เมื่อ Supervisor ส่ง Daily Report → CM ได้รับแจ้งเตือน → ไปที่เมนู Approvals' },
                { step: 2, icon: <CheckCircle className="w-4 h-4" />, title: 'Approve / Reject', desc: 'ตรวจสอบรายงาน → กด "Approve & Forward to PM" หรือกด Reject พร้อมระบุเหตุผล', tip: 'CM ไม่มีสิทธิ์ Final Approve — ต้องส่งต่อให้ PM เสมอ' },
            ]
        },
    ],
    'Supervisor': [
        {
            menu: 'Daily Report',
            icon: <ClipboardList className="w-5 h-5" />,
            color: 'from-orange-500 to-orange-700',
            badgeColor: 'bg-orange-100 text-orange-700',
            who: 'Supervisor',
            steps: [
                { step: 1, icon: <Bell className="w-4 h-4" />, title: 'รับแจ้งเตือน SWO ใหม่', desc: 'เมื่อถูก Assign SWO → กระดิ่งแสดงแจ้งเตือน → คลิกและไปที่หน้า Daily Report → กด "Accept SWO" เพื่อรับงาน' },
                { step: 2, icon: <Edit3 className="w-4 h-4" />, title: 'กรอก Daily Report', desc: 'เลือก SWO → เลือกวันที่ → กรอก C1 Work Activities (Today\'s Progress), C2 Equipment Usage, C3 Worker Headcount → กด Submit', tip: 'ต้องกรอกทุกวันที่ทำงาน — ข้อมูลย้อนหลังจะอ่านได้อย่างเดียว' },
                { step: 3, icon: <RefreshCw className="w-4 h-4" />, title: 'แก้ไขหลัง Reject', desc: 'หากรายงานถูก Reject → กระดิ่งแจ้งเตือนพร้อมเหตุผล → คลิกเข้าไปแก้ไข → กด "Resubmit for Approval"' },
            ]
        },
        {
            menu: 'Closures',
            icon: <Lock className="w-5 h-5" />,
            color: 'from-red-500 to-red-700',
            badgeColor: 'bg-red-100 text-red-700',
            who: 'Supervisor',
            steps: [
                { step: 1, icon: <Send className="w-4 h-4" />, title: 'ส่งคำขอปิด SWO', desc: 'เมื่องานเสร็จสิ้น → เมนู Closures → กด "Request Closure" → เลือก SWO ที่ต้องการปิด → กด Confirm', tip: 'SWO ต้องมีสถานะ Active และไม่มีรายงานค้างรอก่อน' },
                { step: 2, icon: <Bell className="w-4 h-4" />, title: 'รับแจ้งเตือนเมื่อถูก Reject', desc: 'ถ้า PM Reject → กระดิ่งแจ้งเตือนพร้อมแสดง SWO No., ชื่องาน, Role ที่ Reject, และเหตุผล' },
                { step: 3, icon: <RefreshCw className="w-4 h-4" />, title: 'ส่งคำขอใหม่ หรือยกเลิก', desc: 'กดปุ่ม "ส่งคำขอใหม่" เพื่อส่งกลับ PM อีกครั้ง หรือกด "ยกเลิก" เพื่อยกเลิกคำขอปิดและกลับสู่สถานะ Active' },
            ]
        },
    ],
    'MD / CD / GM': [
        {
            menu: 'Projects',
            icon: <Briefcase className="w-5 h-5" />,
            color: 'from-blue-500 to-blue-700',
            badgeColor: 'bg-blue-100 text-blue-700',
            who: 'MD เห็นทุกโปรเจกต์, CD / GM เห็นที่ได้รับมอบหมาย',
            steps: [
                { step: 1, icon: <Eye className="w-4 h-4" />, title: 'ดูภาพรวมโปรเจกต์', desc: 'เมนู Projects → ดูรายชื่อโปรเจกต์, Supervisor, อุปกรณ์, ทีมงาน ในแต่ละโปรเจกต์ (View Only)' },
            ]
        },
        {
            menu: 'Closures',
            icon: <Lock className="w-5 h-5" />,
            color: 'from-red-500 to-red-700',
            badgeColor: 'bg-red-100 text-red-700',
            who: 'MD, CD (ตาม flow)',
            steps: [
                { step: 1, icon: <Bell className="w-4 h-4" />, title: 'รับแจ้งเตือน (CD Review / MD Review)', desc: 'CD ได้รับแจ้งเตือนเมื่อ PM Approve → MD ได้รับแจ้งเตือนเมื่อ CD Approve → ไปที่เมนู Closures' },
                { step: 2, icon: <Eye className="w-4 h-4" />, title: 'View Details', desc: 'กด "View Details" บนรายการที่อยู่ในสถานะของตน (CD Review / MD Review) → ดูรายละเอียด SWO, รายงาน' },
                { step: 3, icon: <CheckCircle className="w-4 h-4" />, title: 'Approve หรือ Reject', desc: 'CD: Approve → ส่งต่อ MD, Reject → ส่งคืน PM พร้อมเหตุผล\nMD: Approve → SWO ปิดสมบูรณ์ (Closed SWO), Reject → ส่งคืน PM', tip: 'เมื่อ MD Approve สถานะ SWO จะเปลี่ยนเป็น "Closed SWO" ถาวร' },
            ]
        },
        {
            menu: 'Analytics',
            icon: <BarChart3 className="w-5 h-5" />,
            color: 'from-indigo-500 to-indigo-700',
            badgeColor: 'bg-indigo-100 text-indigo-700',
            who: 'MD, GM, CD',
            steps: [
                { step: 1, icon: <BarChart3 className="w-4 h-4" />, title: 'ดู Dashboard ภาพรวม', desc: 'เมนู Analytics → ดูสถิติโปรเจกต์, SWO Progress, Closure Rate, Daily Report Approval Rate' },
            ]
        },
    ],
};

const roleColors: Record<ManualRole, string> = {
    'Admin': 'bg-purple-600',
    'PM': 'bg-blue-600',
    'CM': 'bg-teal-600',
    'Supervisor': 'bg-orange-600',
    'MD / CD / GM': 'bg-indigo-600',
};

const roleBgLight: Record<ManualRole, string> = {
    'Admin': 'bg-purple-50 border-purple-200',
    'PM': 'bg-blue-50 border-blue-200',
    'CM': 'bg-teal-50 border-teal-200',
    'Supervisor': 'bg-orange-50 border-orange-200',
    'MD / CD / GM': 'bg-indigo-50 border-indigo-200',
};

interface UserManualModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentRole?: string;
}

export const UserManualModal: React.FC<UserManualModalProps> = ({ isOpen, onClose, currentRole }) => {
    const getDefaultTab = (): ManualRole => {
        if (currentRole === 'Admin') return 'Admin';
        if (currentRole === 'PM') return 'PM';
        if (currentRole === 'CM') return 'CM';
        if (currentRole === 'Supervisor') return 'Supervisor';
        if (currentRole === 'MD' || currentRole === 'CD' || currentRole === 'GM') return 'MD / CD / GM';
        return 'Admin';
    };

    const [activeRole, setActiveRole] = useState<ManualRole>(getDefaultTab());
    const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

    React.useEffect(() => {
        if (isOpen) {
            setActiveRole(getDefaultTab());
            setExpandedMenu(null);
        }
    }, [isOpen, currentRole]);

    if (!isOpen) return null;

    const sections = roleSections[activeRole];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">คู่มือการใช้งาน CMG Tracker</h2>
                            <p className="text-blue-200 text-xs mt-0.5">User Manual — เลือก Role เพื่อดูขั้นตอน</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Role Tabs */}
                <div className="flex gap-1.5 px-4 pt-4 pb-2 shrink-0 overflow-x-auto border-b border-gray-100 bg-gray-50">
                    {ROLES.map(role => (
                        <button
                            key={role}
                            onClick={() => { setActiveRole(role); setExpandedMenu(null); }}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                activeRole === role
                                    ? `${roleColors[role]} text-white shadow-md`
                                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            {role}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {/* Role description banner */}
                    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${roleBgLight[activeRole]}`}>
                        <Info className="w-4 h-4 mt-0.5 shrink-0 text-gray-500" />
                        <p className="text-xs text-gray-600">
                            คู่มือสำหรับ <span className="font-bold text-gray-800">{activeRole}</span> — แสดงเฉพาะเมนูและขั้นตอนที่เกี่ยวข้องกับ Role นี้
                        </p>
                    </div>

                    {sections.map((section) => {
                        const isExpanded = expandedMenu === section.menu;
                        return (
                            <div key={section.menu} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                {/* Menu Header */}
                                <button
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                                    onClick={() => setExpandedMenu(isExpanded ? null : section.menu)}
                                >
                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${section.color} flex items-center justify-center text-white shrink-0`}>
                                        {section.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-gray-900 text-sm">{section.menu}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${section.badgeColor}`}>
                                                {section.who}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">{section.steps.length} ขั้นตอน</p>
                                    </div>
                                    {isExpanded
                                        ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                                        : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                                    }
                                </button>

                                {/* Steps */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50/50">
                                        {section.steps.map((s) => (
                                            <div key={s.step} className="flex gap-3">
                                                <div className="flex flex-col items-center gap-1 shrink-0">
                                                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${section.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                                                        {s.step}
                                                    </div>
                                                    {s.step < section.steps.length && (
                                                        <div className="w-px flex-1 min-h-[12px] bg-gray-200" />
                                                    )}
                                                </div>
                                                <div className="pb-2 flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-gray-500">{s.icon}</span>
                                                        <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                                                    </div>
                                                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{s.desc}</p>
                                                    {s.tip && (
                                                        <div className="mt-2 flex items-start gap-1.5 bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-1.5">
                                                            <Star className="w-3 h-3 text-yellow-500 shrink-0 mt-0.5" />
                                                            <p className="text-[11px] text-yellow-800">{s.tip}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Notification guide */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-4 py-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Bell className="w-4 h-4 text-blue-600" />
                            <p className="text-sm font-bold text-blue-800">ระบบแจ้งเตือน (กระดิ่ง)</p>
                        </div>
                        <div className="space-y-2">
                            {[
                                { dot: 'bg-green-500', text: 'สีเขียว — SWO ใหม่ถูก Assign ให้ท่าน (Supervisor)' },
                                { dot: 'bg-yellow-500', text: 'สีเหลือง — Daily Report รอการอนุมัติ (CM / PM)' },
                                { dot: 'bg-blue-500', text: 'สีน้ำเงิน — Daily Report รอ PM Final Approve' },
                                { dot: 'bg-orange-500', text: 'สีส้ม — SWO รอ Review (PM / CD / MD Closure)' },
                                { dot: 'bg-red-500', text: 'สีแดง — คำขอหรือรายงานถูก Reject' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.dot}`} />
                                    <p className="text-xs text-gray-700">{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Flow overview */}
                    <div className="bg-white border border-gray-200 rounded-xl px-4 py-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Layers className="w-4 h-4 text-gray-600" />
                            <p className="text-sm font-bold text-gray-800">Flow การทำงานหลัก (SWO → Closure)</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            {[
                                { label: 'PM/CM\nสร้าง SWO', color: 'bg-green-100 text-green-700' },
                                { label: 'Supervisor\nรับงาน', color: 'bg-blue-100 text-blue-700' },
                                { label: 'Supervisor\nส่ง Daily Report', color: 'bg-orange-100 text-orange-700' },
                                { label: 'CM/PM\nอนุมัติรายงาน', color: 'bg-teal-100 text-teal-700' },
                                { label: 'Supervisor\nขอปิด SWO', color: 'bg-purple-100 text-purple-700' },
                                { label: 'PM → CD → MD\nอนุมัติปิด', color: 'bg-red-100 text-red-700' },
                                { label: 'SWO\nClosed ✓', color: 'bg-gray-200 text-gray-700' },
                            ].map((f, i, arr) => (
                                <React.Fragment key={i}>
                                    <div className={`px-2.5 py-1.5 rounded-lg font-semibold whitespace-pre-line text-center leading-tight ${f.color}`}>
                                        {f.label}
                                    </div>
                                    {i < arr.length - 1 && (
                                        <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                    <p className="text-xs text-gray-400">CMG Construction Control — User Manual v1.0</p>
                    <button onClick={onClose} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                        ปิด
                    </button>
                </div>
            </div>
        </div>
    );
};
