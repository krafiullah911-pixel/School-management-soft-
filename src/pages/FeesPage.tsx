import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  MonthlyFee,
  FeePayment,
  SchoolClass,
  AcademicSession,
  FeePaymentStatus,
  PaymentMethod,
} from '../types';
import {
  getMonthlyFees,
  getFeePayments,
  generateMonthlyFeesForSession,
  recordFeePayment,
  reverseFeePayment,
} from '../services/db';
import {
  Search,
  CreditCard,
  Printer,
  RotateCcw,
  PlusCircle,
  Download,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Filter,
  Eye,
  FileSpreadsheet,
  Clock,
  History,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { ReceiptModal } from '../components/fee/ReceiptModal';

interface FeesPageProps {
  currentSessionId: string;
  classes: SchoolClass[];
  sessions: AcademicSession[];
  initialPaymentOpen?: boolean;
}

export const FeesPage: React.FC<FeesPageProps> = ({
  currentSessionId,
  classes,
  sessions,
  initialPaymentOpen = false,
}) => {
  const { userProfile, isSuperAdmin, isPrincipal, isAccounts, schoolSettings } = useAuth();

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const todayStr = new Date().toISOString().slice(0, 10);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | FeePaymentStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [monthlyFees, setMonthlyFees] = useState<MonthlyFee[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedFeeForPay, setSelectedFeeForPay] = useState<MonthlyFee | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<FeePayment | null>(null);
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [paymentToReverse, setPaymentToReverse] = useState<FeePayment | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyPayments, setHistoryPayments] = useState<FeePayment[]>([]);

  // Payment Form State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payDate, setPayDate] = useState(todayStr);
  const [payRemarks, setPayRemarks] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Fee Generation State
  const [genMonth, setGenMonth] = useState(currentMonthStr);
  const [genClassId, setGenClassId] = useState('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);

  useEffect(() => {
    loadFeesData();
  }, [currentSessionId, selectedMonth, selectedClassId, selectedStatus]);

  const loadFeesData = async () => {
    setLoading(true);
    try {
      const [fees, allPayments] = await Promise.all([
        getMonthlyFees({
          sessionId: currentSessionId,
          feeMonth: selectedMonth,
          classId: selectedClassId,
          status: selectedStatus,
        }),
        getFeePayments({
          sessionId: currentSessionId,
          feeMonth: selectedMonth,
        }),
      ]);
      setMonthlyFees(fees);
      setPayments(allPayments);
    } catch (err) {
      console.error('Failed to load fee records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayModal = (fee: MonthlyFee) => {
    setSelectedFeeForPay(fee);
    setPayAmount(fee.remainingBalance);
    setPayMethod('cash');
    setPayDate(todayStr);
    setPayRemarks('');
    setPayError(null);
    setIsPaymentModalOpen(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeeForPay) return;

    if (payAmount <= 0) {
      setPayError('Payment amount must be greater than zero.');
      return;
    }

    if (payAmount > selectedFeeForPay.remainingBalance) {
      if (!window.confirm(`Amount entered (Rs. ${payAmount}) is greater than remaining balance (Rs. ${selectedFeeForPay.remainingBalance}). Proceed with advance balance?`)) {
        return;
      }
    }

    setPaySubmitting(true);
    setPayError(null);
    try {
      const recordedPayment = await recordFeePayment({
        feeId: selectedFeeForPay.id,
        amountPaid: Number(payAmount),
        paymentMethod: payMethod,
        paymentDate: payDate,
        remarks: payRemarks,
        recordedByUid: userProfile?.uid || 'cashier',
        recordedByName: userProfile?.displayName || 'Cashier',
      });

      setIsPaymentModalOpen(false);
      // Auto-open print receipt
      setActiveReceiptPayment(recordedPayment);
      setIsReceiptModalOpen(true);
      await loadFeesData();
    } catch (err: any) {
      setPayError(err.message || 'Payment processing failed.');
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleGenerateMonthlyFees = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGenResult(null);
    try {
      const result = await generateMonthlyFeesForSession(
        currentSessionId,
        genMonth,
        genClassId,
        userProfile?.uid,
        userProfile?.displayName
      );
      setGenResult(
        `Generated ${result.created} new monthly fee invoices. (${result.existing} already existed for month ${genMonth}).`
      );
      setSelectedMonth(genMonth);
      await loadFeesData();
    } catch (err: any) {
      setGenResult(`Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenReverse = (p: FeePayment) => {
    setPaymentToReverse(p);
    setReversalReason('');
    setIsReverseModalOpen(true);
  };

  const handleConfirmReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentToReverse || !reversalReason.trim()) return;

    try {
      await reverseFeePayment(
        paymentToReverse.id,
        reversalReason.trim(),
        userProfile?.uid || 'system',
        userProfile?.displayName || 'Authorized Admin'
      );
      setIsReverseModalOpen(false);
      await loadFeesData();
      alert(`Payment receipt ${paymentToReverse.receiptNumber} successfully reversed.`);
    } catch (err: any) {
      alert(`Reversal failed: ${err.message}`);
    }
  };

  const viewStudentHistory = (studentId: string) => {
    const studentPayments = payments.filter(p => p.studentId === studentId);
    setHistoryPayments(studentPayments);
    setIsHistoryModalOpen(true);
  };

  // Filter fees by search query
  const filteredFees = monthlyFees.filter(f => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      f.studentName.toLowerCase().includes(q) ||
      f.admissionNumber.toLowerCase().includes(q) ||
      f.className.toLowerCase().includes(q)
    );
  });

  // Totals
  const totalDueSum = filteredFees.reduce((acc, f) => acc + (f.totalDue || 0), 0);
  const totalPaidSum = filteredFees.reduce((acc, f) => acc + (f.paidAmount || 0), 0);
  const totalRemainingSum = filteredFees.reduce((acc, f) => acc + (f.remainingBalance || 0), 0);

  // Export to CSV
  const handleExportFeeReport = () => {
    if (filteredFees.length === 0) {
      alert('No fee records to export.');
      return;
    }

    const headers = [
      'Adm #',
      'Student Name',
      'Class',
      'Section',
      'Month',
      'Base Fee (PKR)',
      'Extra Charges (PKR)',
      'Concession (PKR)',
      'Total Due (PKR)',
      'Paid (PKR)',
      'Balance (PKR)',
      'Status',
      'Last Payment Date',
    ];

    const rows = filteredFees.map(f => [
      `"${f.admissionNumber}"`,
      `"${f.studentName}"`,
      `"${f.className}"`,
      `"${f.section}"`,
      `"${f.feeMonth}"`,
      f.baseFee || 0,
      f.additionalCharges || 0,
      f.concession || 0,
      f.totalDue || 0,
      f.paidAmount || 0,
      f.remainingBalance || 0,
      `"${f.status}"`,
      `"${f.lastPaymentDate || 'None'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `WMHSS_Fee_Report_${selectedMonth}_Session_${currentSessionId}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Monthly Fee Management & Ledgers
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Process tuition fee invoices, collect installments, print official vouchers, and track outstanding balances
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setGenResult(null);
              setIsGenerateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-amber-400" />
            <span>Generate Month Invoices</span>
          </button>

          <button
            onClick={handleExportFeeReport}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Billing Due ({selectedMonth})
          </span>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">
            Rs. {totalDueSum.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{filteredFees.length} student invoices generated</p>
        </div>

        <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            Total Amount Collected
          </span>
          <p className="text-2xl font-black text-emerald-700 font-mono mt-1">
            Rs. {totalPaidSum.toLocaleString()}
          </p>
          <p className="text-xs text-emerald-800 font-medium mt-0.5">
            {totalDueSum > 0 ? `${Math.round((totalPaidSum / totalDueSum) * 100)}% recovery rate` : '0%'}
          </p>
        </div>

        <div className="bg-rose-50/70 p-5 rounded-2xl border border-rose-200 shadow-xs">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
            Total Outstanding Arrears
          </span>
          <p className="text-2xl font-black text-rose-700 font-mono mt-1">
            Rs. {totalRemainingSum.toLocaleString()}
          </p>
          <p className="text-xs text-rose-800 font-medium mt-0.5">Pending collection</p>
        </div>
      </div>

      {/* Filter and Search Ribbon */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search student or adm #..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-400 text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Month selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Class Filter */}
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="unpaid">Unpaid Only</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid Only</option>
          </select>
        </div>
      </div>

      {/* Monthly Fee Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Adm #</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Class & Sec</th>
                <th className="py-3 px-4 text-right">Fee Due</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Receive Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading monthly fee records...
                  </td>
                </tr>
              ) : filteredFees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">
                      No invoices found for {selectedMonth}.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click "Generate Month Invoices" above to generate billing records for all active students.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredFees.map(fee => (
                  <tr key={fee.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {fee.admissionNumber}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{fee.studentName}</p>
                      <button
                        onClick={() => viewStudentHistory(fee.studentId)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                      >
                        View Payment History
                      </button>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {fee.className} ({fee.section || 'A'})
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                      Rs. {fee.totalDue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                      Rs. {fee.paidAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                      Rs. {fee.remainingBalance.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="fee" value={fee.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {fee.status !== 'paid' ? (
                        <button
                          onClick={() => handleOpenPayModal(fee)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          Receive Fee
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Cleared</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Showing {filteredFees.length} records</span>
          <span className="font-mono font-semibold text-slate-700">
            Total Outstanding: Rs. {totalRemainingSum.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Recent Payment Receipts & Transactions Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
          <span>Fee Transaction History & Official Receipts ({selectedMonth})</span>
          <span className="text-xs font-normal text-slate-400">
            {payments.length} receipts issued
          </span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Receipt #</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Student</th>
                <th className="py-2.5 px-4">Class</th>
                <th className="py-2.5 px-4 text-right">Amount Received</th>
                <th className="py-2.5 px-4">Method</th>
                <th className="py-2.5 px-4">Cashier</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400">
                    No transactions recorded for {selectedMonth}.
                  </td>
                </tr>
              ) : (
                payments.map(p => (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50/70 ${p.isReversed ? 'bg-rose-50/30 line-through text-slate-400' : ''}`}
                  >
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                      {p.receiptNumber}
                      {p.isReversed && (
                        <span className="ml-2 text-[10px] text-rose-600 uppercase font-bold no-underline">
                          (Reversed)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{p.paymentDate}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">{p.studentName}</td>
                    <td className="py-2.5 px-4 text-slate-600">{p.className}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                      Rs. {p.amountPaid.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 uppercase text-[10px] font-semibold text-slate-600">
                      {p.paymentMethod.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">{p.recordedByName}</td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setActiveReceiptPayment(p);
                            setIsReceiptModalOpen(true);
                          }}
                          title="Print Receipt Voucher"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {!p.isReversed && (isSuperAdmin || isPrincipal) && (
                          <button
                            onClick={() => handleOpenReverse(p)}
                            title="Reverse Payment"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Fee Payment"
        subtitle={
          selectedFeeForPay
            ? `${selectedFeeForPay.studentName} (Adm: ${selectedFeeForPay.admissionNumber}, Class: ${selectedFeeForPay.className})`
            : ''
        }
      >
        {selectedFeeForPay && (
          <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
            {payError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{payError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Billing Month</span>
                <p className="font-bold text-slate-800">{selectedFeeForPay.feeMonth}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Total Invoice Due</span>
                <p className="font-mono font-bold text-slate-900">
                  Rs. {selectedFeeForPay.totalDue.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Already Paid</span>
                <p className="font-mono font-bold text-emerald-600">
                  Rs. {selectedFeeForPay.paidAmount.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Remaining Dues</span>
                <p className="font-mono font-bold text-rose-600">
                  Rs. {selectedFeeForPay.remainingBalance.toLocaleString()}
                </p>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Amount Paid (PKR) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={payAmount}
                onChange={e => setPayAmount(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 font-mono text-base font-extrabold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Installment: You may enter a partial amount or the full remaining balance.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-semibold focus:outline-hidden cursor-pointer"
                >
                  <option value="cash">Cash in Hand</option>
                  <option value="bank_transfer">Bank Deposit / Transfer</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Remarks / Reference (Optional)</label>
              <input
                type="text"
                value={payRemarks}
                onChange={e => setPayRemarks(e.target.value)}
                placeholder="e.g. 1st installment, Bank Slip #..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paySubmitting || payAmount <= 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {paySubmitting ? 'Recording...' : `Receive Rs. ${payAmount.toLocaleString()} & Issue Receipt`}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Generate Month Invoices Modal */}
      <Modal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        title="Generate Monthly Fee Invoices"
        subtitle="Creates individual fee assessment records for active students"
      >
        <form onSubmit={handleGenerateMonthlyFees} className="space-y-4 text-xs">
          {genResult && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl">
              {genResult}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Target Billing Month</label>
            <input
              type="month"
              required
              value={genMonth}
              onChange={e => setGenMonth(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Target Classes</label>
            <select
              value={genClassId}
              onChange={e => setGenClassId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All School Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <p className="font-bold text-slate-700">Financial Integrity Guarantee:</p>
            <p>
              • Duplicate invoice protection is enforced: students already having an invoice for {genMonth} will not be duplicated.
            </p>
            <p>• Student-specific tuition fee, recurring charges, and concessions are applied automatically.</p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsGenerateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? 'Generating...' : `Generate Invoices for ${genMonth}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reverse Payment Modal */}
      <Modal
        isOpen={isReverseModalOpen}
        onClose={() => setIsReverseModalOpen(false)}
        title="Authorize Fee Payment Reversal"
        subtitle="This action will reverse the collected amount and restore the student's unpaid dues."
      >
        {paymentToReverse && (
          <form onSubmit={handleConfirmReversal} className="space-y-4 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1">
              <p className="font-bold">Reversing Voucher: {paymentToReverse.receiptNumber}</p>
              <p>Student: {paymentToReverse.studentName}</p>
              <p>Amount: Rs. {paymentToReverse.amountPaid.toLocaleString()}</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Official Reversal Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={reversalReason}
                onChange={e => setReversalReason(e.target.value)}
                placeholder="e.g. Bank bounced cheque / Cash entered by mistake / Duplicate entry..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsReverseModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-colors cursor-pointer"
              >
                Confirm Reversal
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Student History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Student Fee Payment History"
        maxWidth="2xl"
      >
        <div className="space-y-3 text-xs">
          {historyPayments.length === 0 ? (
            <p className="text-center py-6 text-slate-400">No payment receipts on record.</p>
          ) : (
            <table className="w-full text-left border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 font-bold text-slate-600">
                <tr>
                  <th className="p-2">Receipt #</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Month</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2">Method</th>
                  <th className="p-2 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyPayments.map(p => (
                  <tr key={p.id}>
                    <td className="p-2 font-mono font-bold">{p.receiptNumber}</td>
                    <td className="p-2">{p.paymentDate}</td>
                    <td className="p-2">{p.feeMonth}</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">
                      Rs. {p.amountPaid.toLocaleString()}
                    </td>
                    <td className="p-2 uppercase text-[10px]">{p.paymentMethod}</td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() => {
                          setActiveReceiptPayment(p);
                          setIsReceiptModalOpen(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                      >
                        Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>

      {/* Official Voucher Printable Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        payment={activeReceiptPayment}
      />
    </div>
  );
};
