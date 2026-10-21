import React from 'react';
import { FeePayment, MonthlyFee } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Printer, X, CheckCircle, GraduationCap } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: FeePayment | null;
  feeDoc?: MonthlyFee | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
}) => {
  const { schoolSettings } = useAuth();

  if (!isOpen || !payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const renderVoucherCopy = (copyType: 'OFFICE COPY' | 'STUDENT COPY') => (
    <div className="border-2 border-slate-800 rounded-xl p-5 bg-white shadow-xs print:shadow-none print:border-slate-700 page-break-inside-avoid">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center font-bold">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight leading-tight">
              {schoolSettings.schoolName}
            </h3>
            <p className="text-[10px] text-slate-600 font-medium leading-tight">
              {schoolSettings.location}
            </p>
            <p className="text-[9px] text-slate-400">
              Tel: {schoolSettings.phone || '+92 826 421000'} | Reg #: {schoolSettings.registrationNumber || 'WMHSS-PSH-2018'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block px-2 py-0.5 rounded-sm bg-slate-900 text-white text-[10px] font-bold tracking-wider uppercase mb-1">
            {copyType}
          </span>
          <p className="text-xs font-mono font-bold text-slate-900">{payment.receiptNumber}</p>
          <p className="text-[10px] text-slate-500">Date: {payment.paymentDate}</p>
        </div>
      </div>

      {/* Student Details Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-3">
        <div>
          <span className="text-slate-500 text-[10px] uppercase font-semibold">Student Name:</span>
          <p className="font-bold text-slate-900">{payment.studentName}</p>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase font-semibold">Admission #:</span>
          <p className="font-mono font-bold text-slate-800">{payment.admissionNumber}</p>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase font-semibold">Class & Section:</span>
          <p className="font-medium text-slate-800">{payment.className} ({payment.section})</p>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase font-semibold">Billing Month:</span>
          <p className="font-bold text-indigo-700">
            {new Date(payment.feeMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Financial Table */}
      <table className="w-full text-xs mb-3 border border-slate-200">
        <thead>
          <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
            <th className="py-1.5 px-3 text-left">Description</th>
            <th className="py-1.5 px-3 text-right">Amount (PKR)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium">
          <tr>
            <td className="py-1.5 px-3 text-slate-700">Previous Unpaid Balance</td>
            <td className="py-1.5 px-3 text-right font-mono">
              Rs. {payment.previousBalance.toLocaleString()}
            </td>
          </tr>
          <tr className="bg-emerald-50/60 text-emerald-950 font-bold">
            <td className="py-2 px-3 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 inline" />
              <span>Amount Received ({payment.paymentMethod.toUpperCase().replace('_', ' ')})</span>
            </td>
            <td className="py-2 px-3 text-right text-emerald-700 font-mono text-sm">
              Rs. {payment.amountPaid.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="py-1.5 px-3 text-slate-700 font-semibold">Remaining Balance Due</td>
            <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-600">
              Rs. {payment.remainingBalance.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      {payment.remarks && (
        <p className="text-[11px] text-slate-600 mb-3 bg-amber-50/60 p-2 rounded-sm border border-amber-200">
          <span className="font-semibold text-amber-900">Remarks:</span> {payment.remarks}
        </p>
      )}

      {/* Signature Lines */}
      <div className="pt-6 mt-4 border-t border-dashed border-slate-300 flex justify-between items-end text-[10px] text-slate-500">
        <div>
          <p className="font-medium text-slate-700">{payment.recordedByName}</p>
          <div className="w-36 border-b border-slate-400 mt-1 mb-0.5"></div>
          <p>Cashier / Accounts Officer</p>
        </div>
        <div className="text-right">
          <div className="w-36 border-b border-slate-400 mt-4 mb-0.5"></div>
          <p>Principal / Authorized Sign</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Background backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs print:hidden" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
        <div className="relative w-full max-w-4xl bg-slate-100 rounded-2xl shadow-2xl overflow-hidden print:p-0 print:bg-white print:shadow-none print:w-full print:max-w-none">
          {/* Action Toolbar (Hidden during print) */}
          <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-wide">Official Fee Voucher</span>
              <span className="px-2 py-0.5 bg-slate-800 text-amber-400 text-xs font-mono rounded-md">
                {payment.receiptNumber}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt (A4 / Slip)</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Voucher Section (Dual Copy: Office & Student Copy) */}
          <div className="p-4 sm:p-6 print:p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-4">
              {renderVoucherCopy('OFFICE COPY')}
              {renderVoucherCopy('STUDENT COPY')}
            </div>

            <p className="text-center text-[10px] text-slate-400 mt-4 print:mt-3">
              Note: Keep this receipt safe for your records. Fees once paid are non-refundable. Computer-generated official receipt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
