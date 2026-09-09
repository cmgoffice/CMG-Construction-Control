import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle, FileText, Calendar as CalendarIcon, Check } from 'lucide-react';

export interface DailyReportCalendarProps {
    selectedDate: string; // YYYY-MM-DD
    onSelectDate: (date: string) => void;
    swoReports: any[];
    swoStartDate?: string;
    swoEndDate?: string;
    todayStr: string;
    yesterdayStr: string;
    isSupervisorLike?: boolean;
    isAdminLike?: boolean;
    compact?: boolean;
    onClose?: () => void;
}

const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const ENG_MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = [
    { th: 'อา', en: 'Su', weekend: true },
    { th: 'จ', en: 'Mo', weekend: false },
    { th: 'อ', en: 'Tu', weekend: false },
    { th: 'พ', en: 'We', weekend: false },
    { th: 'พฤ', en: 'Th', weekend: false },
    { th: 'ศ', en: 'Fr', weekend: false },
    { th: 'ส', en: 'Sa', weekend: true },
];

export const DailyReportCalendar: React.FC<DailyReportCalendarProps> = ({
    selectedDate,
    onSelectDate,
    swoReports,
    swoStartDate,
    swoEndDate,
    todayStr,
    yesterdayStr,
    isSupervisorLike,
    isAdminLike,
    compact = false,
    onClose,
}) => {
    // Initial view month based on selectedDate or today
    const initialDateObj = useMemo(() => {
        if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
            const [y, m, d] = selectedDate.split('-').map(Number);
            return new Date(y, m - 1, d);
        }
        return new Date();
    }, [selectedDate]);

    const [viewYear, setViewYear] = useState(initialDateObj.getFullYear());
    const [viewMonth, setViewMonth] = useState(initialDateObj.getMonth()); // 0-11

    // Map reports by date for O(1) fast lookup
    const reportsMap = useMemo(() => {
        const map = new Map<string, any>();
        swoReports.forEach(r => {
            if (r.date) {
                map.set(r.date, r);
            }
        });
        return map;
    }, [swoReports]);

    // Calculate calendar days
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
        const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

        const days: Array<{
            dateStr: string;
            dayNum: number;
            isCurrentMonth: boolean;
            isToday: boolean;
            isYesterday: boolean;
            isSelected: boolean;
            isInSwoRange: boolean;
            isFuture: boolean;
            report: any | null;
        }> = [];

        // Previous month trailing days
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const d = daysInPrevMonth - i;
            const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
            const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
            const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            days.push({
                dateStr,
                dayNum: d,
                isCurrentMonth: false,
                isToday: dateStr === todayStr,
                isYesterday: dateStr === yesterdayStr,
                isSelected: dateStr === selectedDate,
                isInSwoRange: !!(swoStartDate && swoEndDate && dateStr >= swoStartDate && dateStr <= swoEndDate),
                isFuture: dateStr > todayStr,
                report: reportsMap.get(dateStr) || null,
            });
        }

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            days.push({
                dateStr,
                dayNum: d,
                isCurrentMonth: true,
                isToday: dateStr === todayStr,
                isYesterday: dateStr === yesterdayStr,
                isSelected: dateStr === selectedDate,
                isInSwoRange: !!(swoStartDate && swoEndDate && dateStr >= swoStartDate && dateStr <= swoEndDate),
                isFuture: dateStr > todayStr,
                report: reportsMap.get(dateStr) || null,
            });
        }

        // Next month trailing days to complete grid (up to 42 cells = 6 rows)
        const remaining = 42 - days.length;
        if (remaining > 0 && remaining < 7) {
            for (let d = 1; d <= remaining; d++) {
                const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
                const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
                const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                days.push({
                    dateStr,
                    dayNum: d,
                    isCurrentMonth: false,
                    isToday: dateStr === todayStr,
                    isYesterday: dateStr === yesterdayStr,
                    isSelected: dateStr === selectedDate,
                    isInSwoRange: !!(swoStartDate && swoEndDate && dateStr >= swoStartDate && dateStr <= swoEndDate),
                    isFuture: dateStr > todayStr,
                    report: reportsMap.get(dateStr) || null,
                });
            }
        }

        return days;
    }, [viewYear, viewMonth, selectedDate, todayStr, yesterdayStr, swoStartDate, swoEndDate, reportsMap]);

    // Monthly summary stats
    const monthStats = useMemo(() => {
        let approved = 0;
        let pending = 0;
        let rejected = 0;
        let draft = 0;
        let totalReported = 0;

        const currentMonthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
        swoReports.forEach(r => {
            if (r.date && r.date.startsWith(currentMonthPrefix)) {
                totalReported++;
                if (r.status === 'Approved') approved++;
                else if (r.status === 'Pending CM' || r.status === 'Pending PM') pending++;
                else if (r.status === 'Rejected') rejected++;
                else draft++;
            }
        });

        return { approved, pending, rejected, draft, totalReported };
    }, [viewYear, viewMonth, swoReports]);

    const prevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(v => v - 1);
        } else {
            setViewMonth(v => v - 1);
        }
    };

    const nextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(v => v + 1);
        } else {
            setViewMonth(v => v + 1);
        }
    };

    const jumpToToday = () => {
        const today = new Date();
        setViewYear(today.getFullYear());
        setViewMonth(today.getMonth());
        onSelectDate(todayStr);
    };

    // Helper: render status dot / badge for a cell
    const renderStatusIndicator = (report: any, compactCell: boolean) => {
        if (!report) return null;

        const status = report.status;
        if (status === 'Approved') {
            return (
                <span
                    title="Approved (อนุมัติแล้ว)"
                    className={`inline-flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs ${
                        compactCell ? 'w-2 h-2' : 'w-2.5 h-2.5'
                    }`}
                />
            );
        }
        if (status === 'Pending CM' || status === 'Pending PM') {
            return (
                <span
                    title={`Pending (${status}) - รออนุมัติ`}
                    className={`inline-flex items-center justify-center rounded-full bg-amber-500 text-white animate-pulse shadow-xs ${
                        compactCell ? 'w-2 h-2' : 'w-2.5 h-2.5'
                    }`}
                />
            );
        }
        if (status === 'Rejected') {
            return (
                <span
                    title="Rejected (ถูกส่งกลับแก้ไข)"
                    className={`inline-flex items-center justify-center rounded-full bg-rose-500 text-white shadow-xs ${
                        compactCell ? 'w-2 h-2' : 'w-2.5 h-2.5'
                    }`}
                />
            );
        }
        return (
            <span
                title="Draft (แบบร่าง)"
                className={`inline-flex items-center justify-center rounded-full bg-blue-400 text-white shadow-xs ${
                    compactCell ? 'w-2 h-2' : 'w-2.5 h-2.5'
                }`}
            />
        );
    };

    const selectedReport = reportsMap.get(selectedDate);

    return (
        <div className={`bg-white rounded-xl border border-gray-200/90 select-none overflow-hidden transition-all ${
            compact ? 'p-2.5 sm:p-3.5 shadow-xs w-full min-w-0 max-w-full' : 'p-3 sm:p-5 shadow-lg max-w-2xl mx-auto w-full min-w-0'
        }`}>
            {/* Header: Month & Year Navigator */}
            <div className={`flex items-center justify-between gap-2 border-b border-gray-100 ${
                compact ? 'pb-2.5 mb-2' : 'pb-3.5 mb-3'
            }`}>
                <div className="flex items-center gap-2">
                    <div className={`${compact ? 'w-7 h-7 rounded-lg' : 'w-8 h-8 rounded-xl'} bg-blue-50 text-blue-600 flex items-center justify-center font-bold`}>
                        <CalendarIcon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                    </div>
                    <div>
                        <h3 className={`${compact ? 'text-sm font-bold' : 'text-base font-bold'} text-gray-900 leading-tight`}>
                            {THAI_MONTHS[viewMonth]} {viewYear + 543}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-medium leading-none mt-0.5">
                            {ENG_MONTHS[viewMonth]} {viewYear}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={jumpToToday}
                        title="กลับมาที่วันนี้"
                        className="px-2 py-0.5 text-[11px] font-semibold rounded-md border border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                        วันนี้
                    </button>
                    <button
                        type="button"
                        onClick={prevMonth}
                        title="เดือนก่อนหน้า"
                        aria-label="Previous Month"
                        className="p-1 sm:p-1.5 rounded-md border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={nextMonth}
                        title="เดือนถัดไป"
                        aria-label="Next Month"
                        className="p-1 sm:p-1.5 rounded-md border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
                    >
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            title="ปิดปฏิทิน"
                            className="ml-1 p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Status Stats for the Month */}
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-1.5 bg-gray-50/90 rounded-lg text-center border border-gray-100 ${
                compact ? 'p-1.5 mb-2 text-[10px] sm:text-[11px]' : 'p-2 mb-3 text-xs'
            }`}>
                <div className="flex items-center justify-center gap-1 py-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="text-gray-500 font-medium">อนุมัติ:</span>
                    <span className="font-bold text-emerald-700">{monthStats.approved}</span>
                </div>
                <div className="flex items-center justify-center gap-1 py-0.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                    <span className="text-gray-500 font-medium">รอตรวจ:</span>
                    <span className="font-bold text-amber-700">{monthStats.pending}</span>
                </div>
                <div className="flex items-center justify-center gap-1 py-0.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                    <span className="text-gray-500 font-medium">Reject:</span>
                    <span className="font-bold text-rose-700">{monthStats.rejected}</span>
                </div>
                <div className="flex items-center justify-center gap-1 py-0.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                    <span className="text-gray-500 font-medium">ส่งแล้ว:</span>
                    <span className="font-bold text-blue-700">{monthStats.totalReported} วัน</span>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 w-full min-w-0">
                {/* Weekday Headers */}
                {WEEKDAYS.map((wd, i) => (
                    <div
                        key={i}
                        className={`text-center py-1 text-[11px] font-semibold ${
                            wd.weekend ? 'text-rose-500' : 'text-gray-500'
                        }`}
                    >
                        <span>{wd.th}</span>
                    </div>
                ))}

                {/* Day Cells */}
                {calendarDays.map((cell, idx) => {
                    const hasReport = !!cell.report;
                    const reportStatus = cell.report?.status;
                    const isApproved = reportStatus === 'Approved';

                    // Styles for cell
                    let cellBg = 'bg-white hover:bg-gray-50 text-gray-800';
                    let borderStyle = 'border border-transparent';

                    if (!cell.isCurrentMonth) {
                        cellBg = 'bg-gray-50/40 text-gray-300 hover:bg-gray-100/40';
                    }

                    // SWO scheduled duration subtle tint
                    if (cell.isInSwoRange && cell.isCurrentMonth) {
                        cellBg = 'bg-blue-50/40 hover:bg-blue-100/50 text-blue-950 font-medium';
                    }

                    // Approved day: subtle light green background tint and border
                    if (isApproved && cell.isCurrentMonth && !cell.isSelected) {
                        cellBg = 'bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-950 font-medium';
                        borderStyle = 'border border-emerald-300/80';
                    }

                    // Today highlight
                    if (cell.isToday && !cell.isSelected) {
                        borderStyle = 'border-2 border-blue-400';
                    }

                    // Selected highlight
                    if (cell.isSelected) {
                        cellBg = 'bg-blue-600 text-white font-bold shadow-xs';
                        borderStyle = 'border border-blue-700';
                    }

                    return (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => onSelectDate(cell.dateStr)}
                            className={`relative ${
                                compact ? 'h-7 sm:h-8 p-0.5' : 'min-h-[42px] p-1'
                            } rounded-lg flex flex-col items-center justify-between transition-all cursor-pointer group ${cellBg} ${borderStyle}`}
                            title={`${cell.dateStr}${cell.report ? ` - ${cell.report.status}` : ''}`}
                        >
                            {/* Day Number and Today Indicator */}
                            <div className="w-full flex items-center justify-between px-1 leading-none">
                                <span className={`text-[11px] sm:text-xs font-semibold ${cell.isSelected ? 'text-white' : ''}`}>
                                    {cell.dayNum}
                                </span>
                                {cell.isToday && !cell.isSelected && (
                                    <span className="text-[8px] font-bold text-blue-600 bg-blue-100 px-0.5 rounded leading-none">
                                        วันนี้
                                    </span>
                                )}
                            </div>

                            {/* Status Indicator: Small Green for Approved */}
                            <div className="flex items-center justify-center w-full leading-none mb-0.5">
                                {hasReport ? (
                                    isApproved ? (
                                        <span
                                            title="Approved (อนุมัติแล้ว)"
                                            className={`inline-block rounded-full bg-emerald-500 shadow-xs ring-1 ring-white ${
                                                cell.isSelected ? 'w-1.5 h-1.5 bg-emerald-300' : 'w-2 h-2'
                                            }`}
                                        />
                                    ) : (
                                        renderStatusIndicator(cell.report, compact)
                                    )
                                ) : (
                                    <span className="h-1" />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Calendar Legend */}
            <div className={`border-t border-gray-100 flex flex-wrap items-center justify-between gap-1 text-[10px] sm:text-[11px] text-gray-500 ${
                compact ? 'mt-2 pt-1.5' : 'mt-3 pt-2.5'
            }`}>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="font-semibold text-emerald-800">Approved</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="font-medium text-gray-600">รออนุมัติ</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span className="font-medium text-gray-600">Reject</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <span className="font-medium text-gray-600">ร่าง</span>
                    </span>
                </div>
                {swoStartDate && swoEndDate && (
                    <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60 font-medium">
                        SWO: {swoStartDate} ~ {swoEndDate}
                    </span>
                )}
            </div>

            {/* In non-compact mode: Selected Date Details */}
            {!compact && (
                <div className="mt-3 p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">วันที่เลือก:</span>
                        <span className="text-xs font-bold text-gray-900 bg-white px-2 py-1 rounded-lg border border-gray-200 shadow-2xs">
                            {selectedDate}
                        </span>
                        {selectedReport ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                selectedReport.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                selectedReport.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                selectedReport.status === 'Pending PM' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                                {selectedReport.status === 'Approved' && <Check className="w-3 h-3 mr-1" />}
                                {selectedReport.status === 'Rejected' && <AlertCircle className="w-3 h-3 mr-1" />}
                                {(selectedReport.status === 'Pending CM' || selectedReport.status === 'Pending PM') && <Clock className="w-3 h-3 mr-1" />}
                                {selectedReport.status}
                            </span>
                        ) : (
                            <span className="text-[11px] text-gray-500 italic bg-gray-100 px-2 py-0.5 rounded-full">
                                ยังไม่มีรายงาน
                            </span>
                        )}
                    </div>

                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                        >
                            เลือกวันนี้
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

