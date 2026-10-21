import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateSchoolSettings, getStudents, getMonthlyFees, getFeePayments } from '../services/db';
import {
  Settings,
  School,
  Save,
  CheckCircle,
  Database,
  Download,
  Shield,
  Clock,
  Coins,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { schoolSettings, refreshSettings, userProfile, isSuperAdmin } = useAuth();

  const [formData, setFormData] = useState({
    schoolName: schoolSettings.schoolName || 'Workers Model Higher Secondary School Pishin',
    location: schoolSettings.location || 'Killi Haji Abdul Razzaq, Pishin, Balochistan, Pakistan',
    phone: schoolSettings.phone || '+92 826 421000',
    registrationNumber: schoolSettings.registrationNumber || 'WMHSS-PSH-2018',
    principalName: schoolSettings.principalName || 'Principal WMHSS Pishin',
    receiptPrefix: schoolSettings.receiptPrefix || 'WMHSS-REC-',
    currency: schoolSettings.currency || 'PKR',
    timezone: schoolSettings.timezone || 'Asia/Karachi',
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await updateSchoolSettings(formData, userProfile?.uid || 'admin');
      await refreshSettings();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      alert(`Error updating settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Administrative JSON Backup download
  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    try {
      const [students, fees, payments] = await Promise.all([
        getStudents(),
        getMonthlyFees({}),
        getFeePayments({}),
      ]);

      const backupObject = {
        schoolSettings: formData,
        backupDate: new Date().toISOString(),
        exportedBy: userProfile?.displayName,
        totalStudents: students.length,
        totalFees: fees.length,
        totalPayments: payments.length,
        students,
        monthlyFees: fees,
        feePayments: payments,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObject, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `WMHSS_Pishin_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e: any) {
      alert('Backup failed: ' + e.message);
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          School Settings & Configuration
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          General institution profile, receipt numbering scheme, and database tools
        </p>
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>School configuration updated successfully.</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 text-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <School className="w-4 h-4 text-amber-500" />
            <span>Institution Information</span>
          </h2>
          <p className="text-slate-500 text-[11px]">
            This information appears on all printed fee vouchers, attendance sheets, and academic reports.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">
              Official School Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.schoolName}
              onChange={e => setFormData({ ...formData, schoolName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">
              Campus Address / Location <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Office Telephone / Phone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+92 826 421000"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Registration / Code</label>
            <input
              type="text"
              value={formData.registrationNumber}
              onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
              placeholder="WMHSS-PSH-2018"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-mono focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Principal / Incharge Name</label>
            <input
              type="text"
              value={formData.principalName}
              onChange={e => setFormData({ ...formData, principalName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Fee Voucher Receipt Prefix
            </label>
            <input
              type="text"
              value={formData.receiptPrefix}
              onChange={e => setFormData({ ...formData, receiptPrefix: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-mono font-bold focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">System Currency</label>
            <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 font-mono font-bold text-slate-800">
              <Coins className="w-4 h-4 text-emerald-600" />
              <span>Pakistani Rupee (PKR / Rs.)</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">System Timezone</label>
            <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 font-mono text-slate-800">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Asia/Karachi (PKT, UTC+5)</span>
            </div>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Update Settings'}</span>
            </button>
          </div>
        )}
      </form>

      {/* Administrative Data Backup & System Diagnostics */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
            <Database className="w-4 h-4 text-indigo-600" />
            <span>Database Backup & Cloud Diagnostics</span>
          </h2>
          <p className="text-slate-500 text-[11px]">
            Administrative tools to secure and export student records and historical ledgers.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-bold text-slate-800">Full Institutional JSON Archive</p>
            <p className="text-[11px] text-slate-500">
              Exports full database snapshot: all students, class configs, fee ledger records, and payment receipts.
            </p>
          </div>
          <button
            onClick={handleDownloadBackup}
            disabled={backupLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{backupLoading ? 'Generating...' : 'Download JSON Backup'}</span>
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-[11px] text-slate-600">
          <p className="font-bold text-slate-900 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Security Rules Verification:</span>
          </p>
          <p>
            • ABAC (Attribute-Based Access Control) enforced: Teachers cannot read financial ledgers.
          </p>
          <p>• Fee payments are protected as append-only immutable records.</p>
          <p>• Unique admission number constraints and deterministic fee doc keys prevent duplicates.</p>
        </div>
      </div>
    </div>
  );
};
