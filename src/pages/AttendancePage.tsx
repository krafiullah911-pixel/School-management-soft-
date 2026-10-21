import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Student,
  SchoolClass,
  AcademicSession,
  AttendanceRecord,
  AttendanceStatus,
} from '../types';
import {
  getStudents,
  getDailyAttendance,
  saveDailyAttendance,
  generateAttendanceDocId,
} from '../services/db';
import {
  CalendarCheck,
  CheckCircle,
  XCircle,
  Clock,
  Printer,
  Save,
  CheckCheck,
  AlertCircle,
  Users,
  Search,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { PrintHeader } from '../components/common/PrintHeader';

interface AttendancePageProps {
  currentSessionId: string;
  classes: SchoolClass[];
  sessions: AcademicSession[];
}

export const AttendancePage: React.FC<AttendancePageProps> = ({
  currentSessionId,
  classes,
  sessions,
}) => {
  const { userProfile, schoolSettings } = useAuth();

  const todayStr = new Date().toISOString().slice(0, 10);

  // Filters
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [selectedSection, setSelectedSection] = useState('A');

  // Roster & Attendance state
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [existingRecords, setExistingRecords] = useState<AttendanceRecord[]>([]);
  const [markedByInfo, setMarkedByInfo] = useState<{ name?: string; at?: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [showCorrectionPrompt, setShowCorrectionPrompt] = useState(false);

  // Synchronize when class changes
  useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id);
      setSelectedSection(classes[0].sections[0] || 'A');
    }
  }, [classes]);

  useEffect(() => {
    if (selectedClassId) {
      loadClassRosterAndAttendance();
    }
  }, [currentSessionId, selectedClassId, selectedSection, selectedDate]);

  const loadClassRosterAndAttendance = async () => {
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setShowCorrectionPrompt(false);
    try {
      // 1. Fetch active students in class & section
      const enrolled = await getStudents({
        sessionId: currentSessionId,
        classId: selectedClassId,
        section: selectedSection,
        status: 'active',
      });
      // Sort by roll number or name
      enrolled.sort((a, b) => (Number(a.rollNumber) || 999) - (Number(b.rollNumber) || 999));
      setStudents(enrolled);

      // 2. Fetch existing saved attendance for this date
      const saved = await getDailyAttendance(
        currentSessionId,
        selectedClassId,
        selectedSection,
        selectedDate
      );
      setExistingRecords(saved);

      const map: Record<string, AttendanceStatus> = {};
      if (saved.length > 0) {
        saved.forEach(r => {
          map[r.studentId] = r.status;
        });
        setMarkedByInfo({
          name: saved[0].markedByName,
          at: saved[0].markedAt,
        });
      } else {
        // Default all to 'present' initially for quick mark
        enrolled.forEach(s => {
          map[s.id] = 'present';
        });
        setMarkedByInfo(null);
      }
      setAttendanceMap(map);
    } catch (err: any) {
      setErrorMessage('Failed to load roster: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: Record<string, AttendanceStatus> = {};
    students.forEach(s => {
      updated[s.id] = status;
    });
    setAttendanceMap(updated);
  };

  const handleSaveAttendance = async () => {
    if (students.length === 0) {
      alert('No students to mark attendance for.');
      return;
    }

    if (existingRecords.length > 0 && !showCorrectionPrompt) {
      const confirmOverwrite = window.confirm(
        `Attendance for this class on ${selectedDate} was already submitted by ${
          markedByInfo?.name || 'Staff'
        }. Do you want to submit corrections?`
      );
      if (!confirmOverwrite) return;
      setShowCorrectionPrompt(true);
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const currentClassObj = classes.find(c => c.id === selectedClassId);
      const recordsToSave: AttendanceRecord[] = students.map(s => {
        const status = attendanceMap[s.id] || 'present';
        const docId = generateAttendanceDocId(
          currentSessionId,
          selectedClassId,
          selectedSection,
          selectedDate,
          s.id
        );

        return {
          id: docId,
          studentId: s.id,
          studentName: s.fullName,
          admissionNumber: s.admissionNumber,
          rollNumber: s.rollNumber,
          classId: selectedClassId,
          className: currentClassObj?.name || s.className,
          section: selectedSection,
          sessionId: currentSessionId,
          date: selectedDate,
          status,
          markedByUid: userProfile?.uid || 'staff',
          markedByName: userProfile?.displayName || 'Teacher',
        };
      });

      await saveDailyAttendance(
        recordsToSave,
        userProfile?.uid || 'staff',
        userProfile?.displayName || 'Teacher',
        correctionReason.trim() || undefined
      );

      setSuccessMessage(
        `Attendance successfully saved for ${students.length} students on ${selectedDate}.`
      );
      setShowCorrectionPrompt(false);
      setCorrectionReason('');
      await loadClassRosterAndAttendance();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const selectedClassObj = classes.find(c => c.id === selectedClassId);

  // Summary counts
  const presentCount = Object.values(attendanceMap).filter(s => s === 'present').length;
  const absentCount = Object.values(attendanceMap).filter(s => s === 'absent').length;
  const leaveCount = Object.values(attendanceMap).filter(s => s === 'leave').length;
  const lateCount = Object.values(attendanceMap).filter(s => s === 'late').length;

  return (
    <div className="space-y-6">
      {/* Page Title & Print Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Daily Attendance Register
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record, verify, and correct student daily classroom presence
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Attendance Sheet</span>
          </button>
        </div>
      </div>

      {/* Selection Control Panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-slate-500 font-semibold">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Class Select */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <span className="text-slate-500 font-semibold">Class:</span>
            <select
              value={selectedClassId}
              onChange={e => {
                setSelectedClassId(e.target.value);
                const cls = classes.find(c => c.id === e.target.value);
                if (cls && cls.sections.length > 0) {
                  setSelectedSection(cls.sections[0]);
                }
              }}
              className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Select */}
          {selectedClassObj && selectedClassObj.sections.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-slate-500 font-semibold">Section:</span>
              <select
                value={selectedSection}
                onChange={e => setSelectedSection(e.target.value)}
                className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer"
              >
                {selectedClassObj.sections.map(sec => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Quick Bulk Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleMarkAll('present')}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All Present</span>
          </button>
        </div>
      </div>

      {/* Status Banners */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 print:hidden">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2 print:hidden">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {markedByInfo && (
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between print:hidden">
          <div>
            <span className="font-bold">Previously Saved:</span> Marked by{' '}
            <span className="font-semibold text-slate-900">{markedByInfo.name}</span> on{' '}
            {markedByInfo.at ? new Date(markedByInfo.at).toLocaleTimeString() : 'record'}.
          </div>
          <span className="text-[10px] bg-amber-200/60 px-2 py-0.5 rounded-md font-bold uppercase">
            Saved
          </span>
        </div>
      )}

      {/* Printable Sheet View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 print:p-0 print:border-none print:shadow-none">
        <PrintHeader
          title={`Daily Attendance Register — ${selectedClassObj?.name || 'Class'} (Section ${selectedSection})`}
          subtitle={`Date: ${selectedDate} | Academic Session: ${sessions.find(s => s.id === currentSessionId)?.name || '2024-2025'}`}
          metaRight={
            <div>
              <p className="font-bold text-slate-800">
                Total Students: {students.length} | Present: {presentCount} | Absent: {absentCount}
              </p>
              <p className="text-[10px]">
                Attendance Rate: {students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0}%
              </p>
            </div>
          }
        />

        {/* Quick Tally Chips */}
        <div className="flex flex-wrap items-center gap-3 mb-4 text-xs font-semibold print:hidden">
          <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300">
            Present: {presentCount}
          </span>
          <span className="px-3 py-1 rounded-xl bg-rose-100 text-rose-800 border border-rose-300">
            Absent: {absentCount}
          </span>
          <span className="px-3 py-1 rounded-xl bg-blue-100 text-blue-800 border border-blue-300">
            Leave: {leaveCount}
          </span>
          <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-800 border border-amber-300">
            Late: {lateCount}
          </span>
        </div>

        {/* Student Roster Register Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">Roll #</th>
                <th className="py-2.5 px-3">Adm #</th>
                <th className="py-2.5 px-3">Student Full Name</th>
                <th className="py-2.5 px-3">Father Name</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right print:hidden">Mark Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading class roster...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No active students enrolled in this class.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Enroll students in this class in the "Students" tab first.
                    </p>
                  </td>
                </tr>
              ) : (
                students.map((st, idx) => {
                  const currentStatus = attendanceMap[st.id] || 'present';
                  return (
                    <tr key={st.id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">
                        {st.rollNumber || idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700">{st.admissionNumber}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{st.fullName}</td>
                      <td className="py-2 px-3 text-slate-600">{st.fatherName}</td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant="attendance" value={currentStatus} />
                      </td>
                      <td className="py-2 px-3 text-right print:hidden">
                        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'present')}
                            className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                              currentStatus === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            P
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'absent')}
                            className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                              currentStatus === 'absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            A
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'leave')}
                            className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                              currentStatus === 'leave'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            L
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'late')}
                            className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                              currentStatus === 'late'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            T
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Correction reason input if modifying existing */}
        {showCorrectionPrompt && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 print:hidden space-y-2">
            <label className="block text-xs font-bold text-amber-900">
              Audit Reason for Attendance Correction (Optional):
            </label>
            <input
              type="text"
              value={correctionReason}
              onChange={e => setCorrectionReason(e.target.value)}
              placeholder="e.g. Student arrived after morning assembly / Medical certificate provided"
              className="w-full px-3 py-2 border border-amber-300 rounded-xl bg-white text-xs text-slate-900 focus:outline-hidden"
            />
          </div>
        )}

        {/* Save Bar */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between print:hidden">
          <div className="text-xs text-slate-500">
            {students.length} students rostered &bull; Total Present: {presentCount}
          </div>

          <button
            onClick={handleSaveAttendance}
            disabled={saving || students.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving to Firestore...' : 'Save Daily Attendance'}</span>
          </button>
        </div>

        {/* Print Footer Signatures */}
        <div className="hidden print:flex justify-between items-end pt-12 mt-8 border-t border-slate-400 text-xs">
          <div>
            <div className="w-44 border-b border-slate-800 mb-1"></div>
            <p className="font-bold">Class Teacher Signature</p>
          </div>
          <div className="text-right">
            <div className="w-44 border-b border-slate-800 mb-1"></div>
            <p className="font-bold">Principal / Incharge Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
};
