import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Student,
  SchoolClass,
  AcademicSession,
  Gender,
  StudentStatus,
} from '../types';
import {
  getStudents,
  saveStudent,
  checkAdmissionNumberUnique,
  getMonthlyFees,
  getFeePayments,
  getStudentAttendanceHistory,
} from '../services/db';
import {
  Search,
  Plus,
  Filter,
  Eye,
  Edit2,
  Archive,
  Download,
  Upload,
  UserCheck,
  UserX,
  Printer,
  X,
  FileSpreadsheet,
  AlertTriangle,
  GraduationCap,
  Calendar,
  Phone,
  MapPin,
  CreditCard,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { PrintHeader } from '../components/common/PrintHeader';

interface StudentsPageProps {
  currentSessionId: string;
  classes: SchoolClass[];
  sessions: AcademicSession[];
  onSelectStudentDetail?: (student: Student) => void;
  initialAddOpen?: boolean;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({
  currentSessionId,
  classes,
  sessions,
  initialAddOpen = false,
}) => {
  const { userProfile, isAccounts, isSuperAdmin, isPrincipal, schoolSettings } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | StudentStatus>('active');

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(initialAddOpen);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Student profile history state
  const [studentFeeHistory, setStudentFeeHistory] = useState<any[]>([]);
  const [studentPayHistory, setStudentPayHistory] = useState<any[]>([]);
  const [studentAttHistory, setStudentAttHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Student>>({
    admissionNumber: '',
    fullName: '',
    fatherName: '',
    gender: 'male',
    dob: '',
    classId: '',
    className: '',
    section: 'A',
    rollNumber: '',
    admissionDate: new Date().toISOString().slice(0, 10),
    guardianPhone: '',
    address: '',
    monthlyFee: 2500,
    otherRecurringCharges: 0,
    discount: 0,
    status: 'active',
    sessionId: currentSessionId,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // CSV Import State
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [currentSessionId, selectedClassId, selectedSection, selectedStatus]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await getStudents({
        sessionId: currentSessionId,
        classId: selectedClassId,
        section: selectedSection,
        status: selectedStatus,
      });
      setStudents(data);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    const defaultClass = classes[0];
    setEditingStudent(null);
    setFormData({
      admissionNumber: `WM-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      fullName: '',
      fatherName: '',
      gender: 'male',
      dob: '',
      classId: defaultClass?.id || '',
      className: defaultClass?.name || '',
      section: 'A',
      rollNumber: '',
      admissionDate: new Date().toISOString().slice(0, 10),
      guardianPhone: '+92 ',
      address: 'Pishin, Balochistan',
      monthlyFee: defaultClass?.defaultMonthlyFee || 2500,
      otherRecurringCharges: 0,
      discount: 0,
      status: 'active',
      sessionId: currentSessionId,
    });
    setFormError(null);
    setIsAddEditOpen(true);
  };

  const openEditModal = (st: Student) => {
    setEditingStudent(st);
    setFormData({ ...st });
    setFormError(null);
    setIsAddEditOpen(true);
  };

  const openProfileView = async (st: Student) => {
    setViewingStudent(st);
    setIsProfileModalOpen(true);
    setLoadingHistory(true);
    try {
      const [fees, payments, att] = await Promise.all([
        getMonthlyFees({ sessionId: currentSessionId }).then(list => list.filter(f => f.studentId === st.id)),
        getFeePayments({ studentId: st.id }),
        getStudentAttendanceHistory(st.id, currentSessionId),
      ]);
      setStudentFeeHistory(fees);
      setStudentPayHistory(payments);
      setStudentAttHistory(att);
    } catch (e) {
      console.error('Error fetching student history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleClassChange = (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    setFormData(prev => ({
      ...prev,
      classId,
      className: cls?.name || '',
      monthlyFee: cls?.defaultMonthlyFee || prev.monthlyFee || 2500,
      section: cls?.sections?.[0] || 'A',
    }));
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.fullName?.trim() || !formData.fatherName?.trim() || !formData.admissionNumber?.trim()) {
      setFormError('Full Name, Father Name, and Admission Number are required.');
      return;
    }

    if (!formData.classId) {
      setFormError('Please select a class for this student.');
      return;
    }

    setIsSaving(true);
    try {
      const isUnique = await checkAdmissionNumberUnique(formData.admissionNumber!, editingStudent?.id);
      if (!isUnique) {
        setFormError(`Admission number "${formData.admissionNumber}" is already in use by another student.`);
        setIsSaving(false);
        return;
      }

      await saveStudent(
        formData as Student,
        userProfile?.uid || 'system',
        userProfile?.displayName || 'Administrator'
      );

      setIsAddEditOpen(false);
      await loadStudents();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save student record.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (st: Student, newStatus: StudentStatus) => {
    const confirmMsg =
      newStatus === 'withdrawn'
        ? `Are you sure you want to mark ${st.fullName} as Withdrawn? Their historical records will be preserved.`
        : `Mark ${st.fullName} as Active?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await saveStudent(
        { ...st, status: newStatus },
        userProfile?.uid || 'system',
        userProfile?.displayName || 'Administrator'
      );
      await loadStudents();
    } catch (err: any) {
      alert(`Error updating student status: ${err.message}`);
    }
  };

  // Filter students by search
  const filteredStudents = students.filter(s => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      s.fullName.toLowerCase().includes(query) ||
      s.admissionNumber.toLowerCase().includes(query) ||
      s.fatherName.toLowerCase().includes(query) ||
      (s.rollNumber && s.rollNumber.toLowerCase().includes(query)) ||
      (s.guardianPhone && s.guardianPhone.includes(query))
    );
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredStudents.length === 0) {
      alert('No students to export.');
      return;
    }

    const headers = [
      'Admission Number',
      'Full Name',
      'Father Name',
      'Gender',
      'Class',
      'Section',
      'Roll Number',
      'Admission Date',
      'Guardian Phone',
      'Monthly Fee (PKR)',
      'Other Charges (PKR)',
      'Discount (PKR)',
      'Net Monthly Due (PKR)',
      'Status',
    ];

    const rows = filteredStudents.map(s => [
      `"${s.admissionNumber}"`,
      `"${s.fullName}"`,
      `"${s.fatherName}"`,
      `"${s.gender}"`,
      `"${s.className}"`,
      `"${s.section || 'A'}"`,
      `"${s.rollNumber || ''}"`,
      `"${s.admissionDate || ''}"`,
      `"${s.guardianPhone || ''}"`,
      s.monthlyFee || 0,
      s.otherRecurringCharges || 0,
      s.discount || 0,
      s.netMonthlyDue || 0,
      `"${s.status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WMHSS_Students_Session_${currentSessionId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import handling
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError(null);
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          setCsvError('CSV file must have at least one header row and one student record.');
          return;
        }

        const headers = lines[0].split(',').map(h => h.replace(/["\r]/g, '').trim().toLowerCase());
        const parsedRows = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.replace(/["\r]/g, '').trim());
          if (values.length < 3) continue;

          // Attempt to find fields
          const adm = values[headers.indexOf('admission number')] || values[0];
          const name = values[headers.indexOf('full name')] || values[1];
          const father = values[headers.indexOf('father name')] || values[2];
          const roll = values[headers.indexOf('roll number')] || '';
          const phone = values[headers.indexOf('guardian phone')] || '';
          const fee = Number(values[headers.indexOf('monthly fee (pkr)')] || 2500);

          if (adm && name) {
            parsedRows.push({
              admissionNumber: adm,
              fullName: name,
              fatherName: father || 'Guardian',
              gender: 'male',
              classId: classes[0]?.id || '',
              className: classes[0]?.name || 'Nursery',
              section: 'A',
              rollNumber: roll || String(i),
              guardianPhone: phone || '+92 ',
              monthlyFee: isNaN(fee) ? 2500 : fee,
              otherRecurringCharges: 0,
              discount: 0,
              status: 'active',
              sessionId: currentSessionId,
            });
          }
        }

        setCsvPreviewData(parsedRows);
      } catch (err: any) {
        setCsvError('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleCommitCSVImport = async () => {
    if (csvPreviewData.length === 0) return;
    setIsImporting(true);
    setCsvError(null);

    let importedCount = 0;
    try {
      for (const st of csvPreviewData) {
        // check unique
        const isUnique = await checkAdmissionNumberUnique(st.admissionNumber);
        if (isUnique) {
          await saveStudent(st as Student, userProfile?.uid || 'import', userProfile?.displayName || 'CSV Importer');
          importedCount++;
        }
      }
      setIsImportModalOpen(false);
      setCsvPreviewData([]);
      await loadStudents();
      alert(`Successfully imported ${importedCount} student records.`);
    } catch (err: any) {
      setCsvError('Error during import: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const canManage = isSuperAdmin || isPrincipal || isAccounts;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Student Management Module
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage student registrations, personal files, fee ledgers, and academic status
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Import CSV</span>
              </button>
              <button
                onClick={openAddModal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Enroll New Student</span>
              </button>
            </>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, adm #, roll, phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-400 text-slate-800"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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
            <option value="active">Active Only</option>
            <option value="withdrawn">Withdrawn (Archived)</option>
            <option value="graduated">Graduated</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Adm #</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Father / Guardian</th>
                <th className="py-3 px-4">Class & Section</th>
                <th className="py-3 px-4">Roll #</th>
                <th className="py-3 px-4">Monthly Fee</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading student records from Firestore...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <GraduationCap className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No student records found.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery ? 'Try clearing your search query.' : 'Click "Enroll New Student" to add student records.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map(st => (
                  <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {st.admissionNumber}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{st.fullName}</p>
                      <span className="text-[10px] text-slate-400 capitalize">{st.gender}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <p>{st.fatherName}</p>
                      <span className="text-[10px] text-slate-400">{st.guardianPhone}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      <span className="font-semibold">{st.className}</span>
                      <span className="text-slate-400 ml-1">({st.section || 'A'})</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      {st.rollNumber || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-mono font-bold text-slate-900">
                        Rs. {(st.netMonthlyDue || st.monthlyFee).toLocaleString()}
                      </p>
                      {st.discount ? (
                        <span className="text-[10px] text-emerald-600 font-medium">
                          Concession: -Rs. {st.discount}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="status" value={st.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openProfileView(st)}
                          title="View Full Profile & Ledgers"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {canManage && (
                          <>
                            <button
                              onClick={() => openEditModal(st)}
                              title="Edit Student Info"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {st.status === 'active' ? (
                              <button
                                onClick={() => handleToggleStatus(st, 'withdrawn')}
                                title="Archive / Withdraw Student"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(st, 'active')}
                                title="Re-activate Student"
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Showing {filteredStudents.length} students</span>
          <span className="text-[11px] text-slate-400">Total Enrolled: {students.length}</span>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingStudent ? `Edit Student: ${editingStudent.fullName}` : 'Enroll New Student'}
        subtitle="Workers Model Higher Secondary School Pishin - Student Registry"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Admission Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.admissionNumber || ''}
                onChange={e => setFormData({ ...formData, admissionNumber: e.target.value })}
                placeholder="e.g. WM-2024-001"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Student Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.fullName || ''}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Student Name"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Father / Guardian Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.fatherName || ''}
                onChange={e => setFormData({ ...formData, fatherName: e.target.value })}
                placeholder="Father's Name"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Gender</label>
              <select
                value={formData.gender || 'male'}
                onChange={e => setFormData({ ...formData, gender: e.target.value as Gender })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Class <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.classId || ''}
                onChange={e => handleClassChange(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                <option value="">Select Class...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Section</label>
                <input
                  type="text"
                  value={formData.section || 'A'}
                  onChange={e => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                  placeholder="A"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Roll Number</label>
                <input
                  type="text"
                  value={formData.rollNumber || ''}
                  onChange={e => setFormData({ ...formData, rollNumber: e.target.value })}
                  placeholder="e.g. 12"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.dob || ''}
                onChange={e => setFormData({ ...formData, dob: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Admission Date</label>
              <input
                type="date"
                value={formData.admissionDate || ''}
                onChange={e => setFormData({ ...formData, admissionDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Guardian Phone Number</label>
              <input
                type="text"
                value={formData.guardianPhone || ''}
                onChange={e => setFormData({ ...formData, guardianPhone: e.target.value })}
                placeholder="+92 3XX XXXXXXX"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Residential Address</label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="Village / Ward, Pishin"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* Fee Configuration for Student */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mt-4 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Monthly Fee Agreement (PKR)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Base Tuition (PKR)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.monthlyFee || 0}
                  onChange={e => setFormData({ ...formData, monthlyFee: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-slate-900 font-bold focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Other Charges (PKR)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.otherRecurringCharges || 0}
                  onChange={e => setFormData({ ...formData, otherRecurringCharges: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Scholarship / Concession</label>
                <input
                  type="number"
                  min="0"
                  value={formData.discount || 0}
                  onChange={e => setFormData({ ...formData, discount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-emerald-600 font-bold focus:outline-hidden"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-950">
              <span>Final Net Monthly Due Payable:</span>
              <span className="font-mono text-sm text-emerald-700">
                Rs. {Math.max(0, (formData.monthlyFee || 0) + (formData.otherRecurringCharges || 0) - (formData.discount || 0)).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddEditOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors cursor-pointer"
            >
              {isSaving ? 'Saving...' : editingStudent ? 'Update Student Record' : 'Enroll Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Full Profile & Ledger Modal (Printable) */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title={viewingStudent ? `${viewingStudent.fullName} — Official Profile` : 'Student Profile'}
        maxWidth="4xl"
      >
        {viewingStudent && (
          <div className="space-y-6 text-xs">
            {/* Action Bar for Modal */}
            <div className="flex justify-end print:hidden">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Student File (A4)</span>
              </button>
            </div>

            {/* Print Header */}
            <PrintHeader
              title="Official Student Profile & Academic Record"
              subtitle={`Session: ${viewingStudent.sessionName || currentSessionId}`}
              metaRight={
                <div>
                  <p className="font-mono font-bold text-slate-900">Adm: {viewingStudent.admissionNumber}</p>
                  <p>Roll: {viewingStudent.rollNumber || 'N/A'}</p>
                </div>
              }
            />

            {/* Profile Overview Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Full Name</span>
                <p className="text-sm font-bold text-slate-900">{viewingStudent.fullName}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Father's Name</span>
                <p className="text-sm font-bold text-slate-900">{viewingStudent.fatherName}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Class & Section</span>
                <p className="text-sm font-bold text-slate-900">
                  {viewingStudent.className} ({viewingStudent.section})
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Admission Date</span>
                <p className="text-sm font-medium text-slate-900">{viewingStudent.admissionDate || '-'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Guardian Phone</span>
                <p className="text-sm font-medium text-slate-900">{viewingStudent.guardianPhone || '-'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Date of Birth</span>
                <p className="text-sm font-medium text-slate-900">{viewingStudent.dob || '-'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Monthly Fee</span>
                <p className="text-sm font-mono font-bold text-emerald-700">
                  Rs. {viewingStudent.netMonthlyDue?.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Status</span>
                <div>
                  <Badge variant="status" value={viewingStudent.status} />
                </div>
              </div>
            </div>

            {/* Fee Assessment & Payments Ledger */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center justify-between">
                <span>Monthly Fee Invoices & Payment Ledger</span>
                <span className="text-xs font-normal text-slate-500">
                  Total Payments: Rs. {studentPayHistory.reduce((a, b) => a + (b.isReversed ? 0 : b.amountPaid), 0).toLocaleString()}
                </span>
              </h4>

              {loadingHistory ? (
                <p className="text-center py-4 text-slate-400">Loading historical ledgers...</p>
              ) : studentFeeHistory.length === 0 ? (
                <p className="text-slate-400 py-3 text-center bg-slate-50 rounded-xl">No fee records found for this student.</p>
              ) : (
                <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2 px-3 text-left">Month</th>
                      <th className="py-2 px-3 text-right">Total Due</th>
                      <th className="py-2 px-3 text-right">Amount Paid</th>
                      <th className="py-2 px-3 text-right">Balance</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentFeeHistory.map(f => (
                      <tr key={f.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-800">{f.feeMonth}</td>
                        <td className="py-2 px-3 text-right font-mono">Rs. {f.totalDue.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 font-bold">
                          Rs. {f.paidAmount.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600 font-bold">
                          Rs. {f.remainingBalance.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant="fee" value={f.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Attendance History Summary */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">Attendance Record</h4>
              {studentAttHistory.length === 0 ? (
                <p className="text-slate-400 py-3 text-center bg-slate-50 rounded-xl">No daily attendance logged yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {studentAttHistory.slice(0, 30).map(a => (
                    <div
                      key={a.id}
                      className="px-2 py-1 rounded-md bg-white border border-slate-200 text-[10px] flex items-center gap-1.5"
                    >
                      <span className="font-mono text-slate-600">{a.date}:</span>
                      <Badge variant="attendance" value={a.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Students from CSV"
        subtitle="Upload a .csv file with Admission Number, Full Name, Father Name, Roll Number, etc."
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          {csvError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{csvError}</span>
            </div>
          )}

          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50 transition-colors">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-amber-500 mb-2" />
            <p className="font-bold text-slate-800">Select CSV Student File</p>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Columns: Admission Number, Full Name, Father Name, Roll Number, Guardian Phone, Monthly Fee
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
            />
          </div>

          {csvPreviewData.length > 0 && (
            <div>
              <p className="font-bold text-slate-800 mb-2">
                Parsed {csvPreviewData.length} student rows for preview:
              </p>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="p-2">Adm #</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Father</th>
                      <th className="p-2">Roll</th>
                      <th className="p-2">Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {csvPreviewData.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-mono">{row.admissionNumber}</td>
                        <td className="p-2">{row.fullName}</td>
                        <td className="p-2">{row.fatherName}</td>
                        <td className="p-2">{row.rollNumber}</td>
                        <td className="p-2">Rs. {row.monthlyFee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvPreviewData.length > 5 && (
                <p className="text-[10px] text-slate-400 mt-1">...and {csvPreviewData.length - 5} more rows.</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCommitCSVImport}
              disabled={csvPreviewData.length === 0 || isImporting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isImporting ? 'Importing...' : `Import ${csvPreviewData.length} Students`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
