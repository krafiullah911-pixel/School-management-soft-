import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Student,
  MonthlyFee,
  FeePayment,
  AttendanceRecord,
  SchoolClass,
  AcademicSession,
} from '../types';
import {
  getStudents,
  getMonthlyFees,
  getFeePayments,
  getDailyAttendance,
} from '../services/db';
import {
  Users,
  CreditCard,
  CalendarCheck,
  TrendingUp,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Banknote,
  GraduationCap,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';

interface DashboardPageProps {
  currentSessionId: string;
  classes: SchoolClass[];
  sessions: AcademicSession[];
  onNavigate: (tab: any) => void;
  onOpenAddStudent: () => void;
  onOpenRecordPayment: () => void;
  onOpenMarkAttendance: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentSessionId,
  classes,
  sessions,
  onNavigate,
  onOpenAddStudent,
  onOpenRecordPayment,
  onOpenMarkAttendance,
}) => {
  const { isAccounts, isPrincipal, isTeacher } = useAuth();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [monthlyFees, setMonthlyFees] = useState<MonthlyFee[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);

  // Current month format: YYYY-MM
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const todayStr = new Date().toISOString().slice(0, 10);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  useEffect(() => {
    loadDashboardData();
  }, [currentSessionId, selectedMonth, selectedDate]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Students
      const stdList = await getStudents({ sessionId: currentSessionId });
      setStudents(stdList);

      // 2. If Accounts or Principal, fetch financial data
      if (isAccounts || isPrincipal) {
        const fees = await getMonthlyFees({
          sessionId: currentSessionId,
          feeMonth: selectedMonth,
        });
        setMonthlyFees(fees);

        const allPayments = await getFeePayments({
          sessionId: currentSessionId,
        });
        setPayments(allPayments);
      }

      // 3. Today's attendance for the first class or across classes
      // We can aggregate attendance records for today
      // For dashboard summary, fetch attendance of enrolled classes
      let allTodayAtt: AttendanceRecord[] = [];
      for (const cls of classes) {
        const att = await getDailyAttendance(currentSessionId, cls.id, 'ALL', selectedDate);
        allTodayAtt = [...allTodayAtt, ...att];
        // Also check section 'A'
        const attA = await getDailyAttendance(currentSessionId, cls.id, 'A', selectedDate);
        allTodayAtt = [...allTodayAtt, ...attA];
      }
      // Deduplicate by studentId
      const uniqueAttMap = new Map<string, AttendanceRecord>();
      allTodayAtt.forEach(a => uniqueAttMap.set(a.studentId, a));
      setTodayAttendance(Array.from(uniqueAttMap.values()));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // Student metrics
  const activeStudents = students.filter(s => s.status === 'active');
  const withdrawnStudents = students.filter(s => s.status === 'withdrawn');

  // Students by class
  const classBreakdown = classes.map(cls => {
    const count = activeStudents.filter(s => s.classId === cls.id).length;
    return { name: cls.name, count, id: cls.id };
  });

  // Attendance metrics
  const presentCount = todayAttendance.filter(a => a.status === 'present').length;
  const absentCount = todayAttendance.filter(a => a.status === 'absent').length;
  const leaveCount = todayAttendance.filter(a => a.status === 'leave').length;
  const lateCount = todayAttendance.filter(a => a.status === 'late').length;
  const totalMarked = todayAttendance.length;

  // Financial metrics
  const todayPayments = payments.filter(
    p => p.paymentDate === selectedDate && !p.isReversed
  );
  const todayCollection = todayPayments.reduce((acc, p) => acc + p.amountPaid, 0);

  const monthPayments = payments.filter(
    p => p.feeMonth === selectedMonth && !p.isReversed
  );
  const monthCollection = monthPayments.reduce((acc, p) => acc + p.amountPaid, 0);

  const totalOutstandingDues = monthlyFees.reduce(
    (acc, f) => acc + (f.remainingBalance || 0),
    0
  );

  const recentTransactions = payments.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 text-xs font-bold mb-2">
              <span>Academic Session {sessions.find(s => s.id === currentSessionId)?.name || '2024-2025'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              School Performance Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Live statistics for Workers Model Higher Secondary School Pishin &bull; Balochistan
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenAddStudent}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Enroll Student</span>
            </button>
            {isAccounts && (
              <button
                onClick={onOpenRecordPayment}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Receive Fee</span>
              </button>
            )}
            <button
              onClick={onOpenMarkAttendance}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Mark Attendance</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date & Month Filter Ribbon */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Attendance Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium text-slate-800 focus:outline-hidden"
            />
          </div>

          {(isAccounts || isPrincipal) && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">Billing Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium text-slate-800 focus:outline-hidden"
              />
            </div>
          )}
        </div>

        <button
          onClick={loadDashboardData}
          className="text-amber-700 hover:text-amber-800 font-bold text-xs cursor-pointer"
        >
          {loading ? 'Refreshing...' : 'Refresh Statistics'}
        </button>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active Students */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Active Students</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{activeStudents.length}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Across {classes.length} registered classes
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Today's Attendance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Attendance</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {presentCount} <span className="text-xs font-normal text-slate-500">/ {totalMarked} marked</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {totalMarked > 0 ? `${Math.round((presentCount / totalMarked) * 100)}% Present today` : 'No register marked yet'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <CalendarCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Today's Fee Collection (Accounts & Principal only) */}
        {isAccounts || isPrincipal ? (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Collection</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">
                Rs. {todayCollection.toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {todayPayments.length} transactions received
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Banknote className="w-6 h-6" />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Staff Role</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">Teaching Staff</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Class Attendance Authorized</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <GraduationCap className="w-6 h-6" />
            </div>
          </div>
        )}

        {/* Total Outstanding Dues / Month Collection (Accounts & Principal) */}
        {isAccounts || isPrincipal ? (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unpaid Fee Balance</p>
              <h3 className="text-2xl font-black text-rose-600 mt-1">
                Rs. {totalOutstandingDues.toLocaleString()}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Month: Rs. {monthCollection.toLocaleString()} collected
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Absent Today</p>
              <h3 className="text-2xl font-black text-rose-600 mt-1">{absentCount}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{leaveCount} students on approved leave</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
        )}
      </div>

      {/* Main Two-Column Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Breakdown Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Today's Attendance Status</h3>
              <p className="text-xs text-slate-500">Date: {selectedDate}</p>
            </div>
            <button
              onClick={() => onNavigate('attendance')}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <span className="text-[11px] font-bold text-emerald-800 uppercase">Present</span>
              <p className="text-2xl font-black text-emerald-700 mt-0.5">{presentCount}</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
              <span className="text-[11px] font-bold text-rose-800 uppercase">Absent</span>
              <p className="text-2xl font-black text-rose-700 mt-0.5">{absentCount}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <span className="text-[11px] font-bold text-blue-800 uppercase">On Leave</span>
              <p className="text-2xl font-black text-blue-700 mt-0.5">{leaveCount}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <span className="text-[11px] font-bold text-amber-800 uppercase">Late Entry</span>
              <p className="text-2xl font-black text-amber-700 mt-0.5">{lateCount}</p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed text-center">
            {totalMarked > 0
              ? `${totalMarked} students logged in the daily register.`
              : 'Select a class in the Attendance tab to take or update attendance.'}
          </p>
        </div>

        {/* Enrollment by Class */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Enrolled Students by Class</h3>
              <p className="text-xs text-slate-500">Active strength</p>
            </div>
            <button
              onClick={() => onNavigate('students')}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {classBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No classes configured.</p>
            ) : (
              classBreakdown.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                >
                  <span className="font-semibold text-slate-800">{c.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 font-bold text-slate-800 text-[11px]">
                    {c.count} students
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Fee Payments (Accounts & Principal only) */}
        {isAccounts || isPrincipal ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Collections</h3>
                <p className="text-xs text-slate-500">Official receipt log</p>
              </div>
              <button
                onClick={() => onNavigate('fees')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Fees Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <CreditCard className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs">No fee transactions recorded yet.</p>
                </div>
              ) : (
                recentTransactions.map(p => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 text-xs flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{p.studentName}</p>
                      <p className="text-[10px] text-slate-500">
                        {p.className} &bull; <span className="font-mono">{p.receiptNumber}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold font-mono text-emerald-600">
                        +Rs. {p.amountPaid.toLocaleString()}
                      </p>
                      <span className="text-[10px] text-slate-400 uppercase">{p.paymentMethod}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Teacher Quick Guidelines</h3>
            <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4">
              <li>Mark attendance daily before the second school period.</li>
              <li>Students absent for 3 consecutive days will appear in the principal's notification log.</li>
              <li>Use the Attendance Register tab to review and correct student attendance.</li>
              <li>Official school session is governed by BBISE calendar.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
