import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Student,
  SchoolClass,
  AcademicSession,
  MonthlyFee,
  FeePayment,
  AttendanceRecord,
} from '../types';
import {
  getStudents,
  getMonthlyFees,
  getFeePayments,
  getDailyAttendance,
} from '../services/db';
import {
  Printer,
  Download,
  Calendar,
  Filter,
  FileBarChart,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { PrintHeader } from '../components/common/PrintHeader';
import { Badge } from '../components/common/Badge';

export type ReportType =
  | 'monthly_fee_collection'
  | 'unpaid_defaulters'
  | 'partially_paid'
  | 'daily_attendance'
  | 'class_student_list'
  | 'date_range_collection';

interface ReportsPageProps {
  currentSessionId: string;
  classes: SchoolClass[];
  sessions: AcademicSession[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  currentSessionId,
  classes,
  sessions,
}) => {
  const { schoolSettings } = useAuth();

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const todayStr = new Date().toISOString().slice(0, 10);

  const [activeReport, setActiveReport] = useState<ReportType>('monthly_fee_collection');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [monthlyFees, setMonthlyFees] = useState<MonthlyFee[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    loadReportData();
  }, [currentSessionId, activeReport, selectedMonth, selectedClassId, selectedDate, startDate, endDate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      if (
        activeReport === 'monthly_fee_collection' ||
        activeReport === 'unpaid_defaulters' ||
        activeReport === 'partially_paid'
      ) {
        const fees = await getMonthlyFees({
          sessionId: currentSessionId,
          feeMonth: selectedMonth,
          classId: selectedClassId,
        });
        setMonthlyFees(fees);
      } else if (activeReport === 'class_student_list') {
        const list = await getStudents({
          sessionId: currentSessionId,
          classId: selectedClassId,
        });
        setStudents(list);
      } else if (activeReport === 'date_range_collection') {
        const allPays = await getFeePayments({
          sessionId: currentSessionId,
          classId: selectedClassId,
        });
        // Filter within date range
        const filtered = allPays.filter(
          p => p.paymentDate >= startDate && p.paymentDate <= endDate && !p.isReversed
        );
        setPayments(filtered);
      } else if (activeReport === 'daily_attendance') {
        let att: AttendanceRecord[] = [];
        if (selectedClassId === 'all') {
          for (const c of classes) {
            const res = await getDailyAttendance(currentSessionId, c.id, 'ALL', selectedDate);
            att = [...att, ...res];
            const resA = await getDailyAttendance(currentSessionId, c.id, 'A', selectedDate);
            att = [...att, ...resA];
          }
        } else {
          att = await getDailyAttendance(currentSessionId, selectedClassId, 'A', selectedDate);
        }
        setAttendanceRecords(att);
      }
    } catch (e) {
      console.error('Error generating report:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Export current report data to CSV
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[] = [];
    let filename = `WMHSS_${activeReport}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeReport === 'monthly_fee_collection') {
      headers = ['Adm #', 'Student Name', 'Class', 'Total Due', 'Paid Amount', 'Remaining Balance', 'Status'];
      rows = monthlyFees.map(f => [
        `"${f.admissionNumber}"`,
        `"${f.studentName}"`,
        `"${f.className}"`,
        f.totalDue,
        f.paidAmount,
        f.remainingBalance,
        `"${f.status}"`,
      ]);
    } else if (activeReport === 'unpaid_defaulters') {
      const unpaid = monthlyFees.filter(f => f.status === 'unpaid');
      headers = ['Adm #', 'Student Name', 'Class', 'Unpaid Dues (PKR)'];
      rows = unpaid.map(f => [
        `"${f.admissionNumber}"`,
        `"${f.studentName}"`,
        `"${f.className}"`,
        f.remainingBalance,
      ]);
    } else if (activeReport === 'class_student_list') {
      headers = ['Roll #', 'Adm #', 'Name', 'Father Name', 'Class', 'Phone', 'Monthly Fee'];
      rows = students.map(s => [
        `"${s.rollNumber || ''}"`,
        `"${s.admissionNumber}"`,
        `"${s.fullName}"`,
        `"${s.fatherName}"`,
        `"${s.className}"`,
        `"${s.guardianPhone}"`,
        s.monthlyFee,
      ]);
    } else if (activeReport === 'date_range_collection') {
      headers = ['Receipt #', 'Date', 'Student Name', 'Class', 'Amount Paid', 'Method', 'Cashier'];
      rows = payments.map(p => [
        `"${p.receiptNumber}"`,
        `"${p.paymentDate}"`,
        `"${p.studentName}"`,
        `"${p.className}"`,
        p.amountPaid,
        `"${p.paymentMethod}"`,
        `"${p.recordedByName}"`,
      ]);
    }

    if (rows.length === 0) {
      alert('No data rows to export.');
      return;
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedClassObj = classes.find(c => c.id === selectedClassId);
  const currentSessionObj = sessions.find(s => s.id === currentSessionId);

  // Derived financial metrics
  const totalBilled = monthlyFees.reduce((a, b) => a + (b.totalDue || 0), 0);
  const totalCollected = monthlyFees.reduce((a, b) => a + (b.paidAmount || 0), 0);
  const totalDefaulterDues = monthlyFees.reduce((a, b) => a + (b.remainingBalance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Title & Actions Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Academic & Financial Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Official printable A4 reports, fee collection ledgers, and attendance audits
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report (A4)</span>
          </button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-1 text-xs print:hidden">
        {[
          { id: 'monthly_fee_collection', label: 'Monthly Fee Collection' },
          { id: 'unpaid_defaulters', label: 'Defaulters (Unpaid Fees)' },
          { id: 'partially_paid', label: 'Partially Paid Ledgers' },
          { id: 'date_range_collection', label: 'Date-Range Collection' },
          { id: 'class_student_list', label: 'Class Student Roster' },
          { id: 'daily_attendance', label: 'Daily Attendance Report' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id as ReportType)}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeReport === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Parameters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-slate-500 font-semibold">Class:</span>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month selector for Monthly Reports */}
          {(activeReport === 'monthly_fee_collection' ||
            activeReport === 'unpaid_defaulters' ||
            activeReport === 'partially_paid') && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-slate-500 font-semibold">Billing Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer"
              />
            </div>
          )}

          {/* Date range for date range report */}
          {activeReport === 'date_range_collection' && (
            <>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <span className="text-slate-500 font-semibold">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 focus:outline-hidden"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <span className="text-slate-500 font-semibold">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 focus:outline-hidden"
                />
              </div>
            </>
          )}

          {/* Single date for Daily Attendance */}
          {activeReport === 'daily_attendance' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-slate-500 font-semibold">Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent font-bold text-slate-900 focus:outline-hidden"
              />
            </div>
          )}
        </div>

        <button
          onClick={loadReportData}
          className="text-amber-700 hover:text-amber-800 font-bold text-xs cursor-pointer"
        >
          {loading ? 'Refreshing...' : 'Apply Filters'}
        </button>
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 print:p-0 print:border-none print:shadow-none">
        {/* Printable Letterhead */}
        <PrintHeader
          title={
            activeReport === 'monthly_fee_collection'
              ? `Monthly Fee Collection Report — ${selectedMonth}`
              : activeReport === 'unpaid_defaulters'
              ? `Defaulters & Outstanding Dues Report — ${selectedMonth}`
              : activeReport === 'partially_paid'
              ? `Partially Paid Fee Summary — ${selectedMonth}`
              : activeReport === 'date_range_collection'
              ? `Date-Range Fee Collections (${startDate} to ${endDate})`
              : activeReport === 'class_student_list'
              ? `Student Class Registry — ${selectedClassObj?.name || 'All Classes'}`
              : `Daily Attendance Summary — ${selectedDate}`
          }
          subtitle={`Academic Session: ${currentSessionObj?.name || '2024-2025'} | Class: ${selectedClassObj?.name || 'All Registered Classes'}`}
          metaRight={
            <div>
              {activeReport === 'monthly_fee_collection' && (
                <>
                  <p className="font-bold text-slate-900">Total Invoiced: Rs. {totalBilled.toLocaleString()}</p>
                  <p className="text-emerald-700 font-bold">Collected: Rs. {totalCollected.toLocaleString()}</p>
                  <p className="text-rose-700 font-bold">Remaining: Rs. {totalDefaulterDues.toLocaleString()}</p>
                </>
              )}
              {activeReport === 'date_range_collection' && (
                <p className="font-bold text-emerald-700 text-sm">
                  Total Collected: Rs. {payments.reduce((a, b) => a + b.amountPaid, 0).toLocaleString()}
                </p>
              )}
            </div>
          }
        />

        {/* Report Content Table */}
        <div className="overflow-x-auto mt-4">
          {/* 1. Monthly Fee Collection Report */}
          {activeReport === 'monthly_fee_collection' && (
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 font-bold text-slate-800">
                <tr>
                  <th className="p-2 border">Adm #</th>
                  <th className="p-2 border">Student Name</th>
                  <th className="p-2 border">Class & Sec</th>
                  <th className="p-2 border text-right">Fee Due</th>
                  <th className="p-2 border text-right">Amount Paid</th>
                  <th className="p-2 border text-right">Balance</th>
                  <th className="p-2 border text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {monthlyFees.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="p-2 border font-mono font-bold">{f.admissionNumber}</td>
                    <td className="p-2 border font-bold text-slate-900">{f.studentName}</td>
                    <td className="p-2 border">{f.className} ({f.section})</td>
                    <td className="p-2 border text-right font-mono">Rs. {f.totalDue.toLocaleString()}</td>
                    <td className="p-2 border text-right font-mono text-emerald-700 font-bold">
                      Rs. {f.paidAmount.toLocaleString()}
                    </td>
                    <td className="p-2 border text-right font-mono text-rose-700 font-bold">
                      Rs. {f.remainingBalance.toLocaleString()}
                    </td>
                    <td className="p-2 border text-center">
                      <Badge variant="fee" value={f.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="p-2.5 border text-right uppercase">Total:</td>
                  <td className="p-2.5 border text-right font-mono">Rs. {totalBilled.toLocaleString()}</td>
                  <td className="p-2.5 border text-right font-mono text-emerald-700">Rs. {totalCollected.toLocaleString()}</td>
                  <td className="p-2.5 border text-right font-mono text-rose-700">Rs. {totalDefaulterDues.toLocaleString()}</td>
                  <td className="p-2.5 border"></td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* 2. Unpaid Defaulters Report */}
          {activeReport === 'unpaid_defaulters' && (
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-rose-50 font-bold text-rose-900">
                <tr>
                  <th className="p-2 border">#</th>
                  <th className="p-2 border">Adm #</th>
                  <th className="p-2 border">Student Name</th>
                  <th className="p-2 border">Class & Sec</th>
                  <th className="p-2 border text-right">Unpaid Balance (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {monthlyFees
                  .filter(f => f.status === 'unpaid')
                  .map((f, idx) => (
                    <tr key={f.id} className="hover:bg-rose-50/20">
                      <td className="p-2 border text-center font-mono">{idx + 1}</td>
                      <td className="p-2 border font-mono font-bold">{f.admissionNumber}</td>
                      <td className="p-2 border font-bold text-slate-900">{f.studentName}</td>
                      <td className="p-2 border">{f.className} ({f.section})</td>
                      <td className="p-2 border text-right font-mono text-rose-700 font-bold">
                        Rs. {f.remainingBalance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {/* 3. Partially Paid Report */}
          {activeReport === 'partially_paid' && (
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-amber-50 font-bold text-amber-900">
                <tr>
                  <th className="p-2 border">Adm #</th>
                  <th className="p-2 border">Student Name</th>
                  <th className="p-2 border">Class</th>
                  <th className="p-2 border text-right">Total Due</th>
                  <th className="p-2 border text-right">Paid Installment</th>
                  <th className="p-2 border text-right">Remaining Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {monthlyFees
                  .filter(f => f.status === 'partially_paid')
                  .map(f => (
                    <tr key={f.id} className="hover:bg-amber-50/20">
                      <td className="p-2 border font-mono font-bold">{f.admissionNumber}</td>
                      <td className="p-2 border font-bold">{f.studentName}</td>
                      <td className="p-2 border">{f.className}</td>
                      <td className="p-2 border text-right font-mono">Rs. {f.totalDue.toLocaleString()}</td>
                      <td className="p-2 border text-right font-mono text-emerald-700 font-bold">
                        Rs. {f.paidAmount.toLocaleString()}
                      </td>
                      <td className="p-2 border text-right font-mono text-rose-700 font-bold">
                        Rs. {f.remainingBalance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {/* 4. Date Range Collection Report */}
          {activeReport === 'date_range_collection' && (
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 font-bold text-slate-800">
                <tr>
                  <th className="p-2 border">Receipt #</th>
                  <th className="p-2 border">Payment Date</th>
                  <th className="p-2 border">Student Name</th>
                  <th className="p-2 border">Class</th>
                  <th className="p-2 border text-right">Amount Received</th>
                  <th className="p-2 border">Method</th>
                  <th className="p-2 border">Cashier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-2 border font-mono font-bold">{p.receiptNumber}</td>
                    <td className="p-2 border">{p.paymentDate}</td>
                    <td className="p-2 border font-bold">{p.studentName}</td>
                    <td className="p-2 border">{p.className}</td>
                    <td className="p-2 border text-right font-mono text-emerald-700 font-bold">
                      Rs. {p.amountPaid.toLocaleString()}
                    </td>
                    <td className="p-2 border uppercase text-[10px]">{p.paymentMethod}</td>
                    <td className="p-2 border">{p.recordedByName}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="p-2.5 border text-right uppercase">Total Collected:</td>
                  <td className="p-2.5 border text-right font-mono text-emerald-700">
                    Rs. {payments.reduce((a, b) => a + b.amountPaid, 0).toLocaleString()}
                  </td>
                  <td colSpan={2} className="p-2.5 border"></td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* 5. Class Student List */}
          {activeReport === 'class_student_list' && (
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 font-bold text-slate-800">
                <tr>
                  <th className="p-2 border w-12 text-center">Roll #</th>
                  <th className="p-2 border">Adm #</th>
                  <th className="p-2 border">Student Full Name</th>
                  <th className="p-2 border">Father Name</th>
                  <th className="p-2 border">Class & Sec</th>
                  <th className="p-2 border">Guardian Phone</th>
                  <th className="p-2 border text-right">Monthly Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-2 border text-center font-mono font-bold">{s.rollNumber || '-'}</td>
                    <td className="p-2 border font-mono font-bold">{s.admissionNumber}</td>
                    <td className="p-2 border font-bold text-slate-900">{s.fullName}</td>
                    <td className="p-2 border text-slate-700">{s.fatherName}</td>
                    <td className="p-2 border">{s.className} ({s.section})</td>
                    <td className="p-2 border font-mono">{s.guardianPhone}</td>
                    <td className="p-2 border text-right font-mono">
                      Rs. {(s.netMonthlyDue || s.monthlyFee).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 6. Daily Attendance Report */}
          {activeReport === 'daily_attendance' && (
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 font-bold text-slate-800">
                <tr>
                  <th className="p-2 border">Roll #</th>
                  <th className="p-2 border">Adm #</th>
                  <th className="p-2 border">Student Name</th>
                  <th className="p-2 border">Class</th>
                  <th className="p-2 border text-center">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {attendanceRecords.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="p-2 border font-mono text-center font-bold">{a.rollNumber || '-'}</td>
                    <td className="p-2 border font-mono">{a.admissionNumber}</td>
                    <td className="p-2 border font-bold">{a.studentName}</td>
                    <td className="p-2 border">{a.className} ({a.section})</td>
                    <td className="p-2 border text-center">
                      <Badge variant="attendance" value={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Print Signatures */}
        <div className="hidden print:flex justify-between items-end pt-12 mt-8 border-t border-slate-400 text-xs">
          <div>
            <div className="w-48 border-b border-slate-800 mb-1"></div>
            <p className="font-bold">Prepared By / Accounts Officer</p>
          </div>
          <div className="text-right">
            <div className="w-48 border-b border-slate-800 mb-1"></div>
            <p className="font-bold">Principal / Workers Model HSS Pishin</p>
          </div>
        </div>
      </div>
    </div>
  );
};
