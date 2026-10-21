import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { SchoolClass, AcademicSession } from '../types';
import { saveClass, deleteClass, saveAcademicSession, setDefaultSession } from '../services/db';
import { Plus, Edit2, Trash2, GraduationCap, Calendar, Check, AlertCircle } from 'lucide-react';
import { Modal } from '../components/common/Modal';

interface ClassesPageProps {
  classes: SchoolClass[];
  sessions: AcademicSession[];
  onRefreshData: () => Promise<void>;
  selectedSessionId: string;
  setSelectedSessionId: (id: string) => void;
}

export const ClassesPage: React.FC<ClassesPageProps> = ({
  classes,
  sessions,
  onRefreshData,
  selectedSessionId,
  setSelectedSessionId,
}) => {
  const { isSuperAdmin, isPrincipal } = useAuth();
  const canEdit = isSuperAdmin || isPrincipal;

  // Class Modal state
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [className, setClassName] = useState('');
  const [sectionsStr, setSectionsStr] = useState('A, B');
  const [defaultFee, setDefaultFee] = useState(2500);
  const [classTeacher, setClassTeacher] = useState('');

  // Session Modal state
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<AcademicSession | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [sessionStartDate, setSessionStartDate] = useState('');
  const [sessionEndDate, setSessionEndDate] = useState('');
  const [sessionStatus, setSessionStatus] = useState<'active' | 'closed'>('active');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAddClass = () => {
    setEditingClass(null);
    setClassName('');
    setSectionsStr('A, B');
    setDefaultFee(2500);
    setClassTeacher('');
    setError(null);
    setIsClassModalOpen(true);
  };

  const openEditClass = (c: SchoolClass) => {
    setEditingClass(c);
    setClassName(c.name);
    setSectionsStr(c.sections.join(', '));
    setDefaultFee(c.defaultMonthlyFee);
    setClassTeacher(c.classTeacher || '');
    setError(null);
    setIsClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) {
      setError('Class name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const sections = sectionsStr
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(s => s.length > 0);

      const id = editingClass
        ? editingClass.id
        : `class_${className.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;

      await saveClass({
        id,
        name: className.trim(),
        sections: sections.length > 0 ? sections : ['A'],
        defaultMonthlyFee: Number(defaultFee) || 2500,
        classTeacher: classTeacher.trim() || undefined,
        order: editingClass?.order || classes.length + 1,
      });

      setIsClassModalOpen(false);
      await onRefreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to save class.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async (classId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? Only do this if no active students are enrolled in this class.`)) {
      return;
    }
    try {
      await deleteClass(classId);
      await onRefreshData();
    } catch (err: any) {
      alert(`Error deleting class: ${err.message}`);
    }
  };

  const openAddSession = () => {
    setEditingSession(null);
    setSessionName('');
    setSessionStartDate(new Date().toISOString().slice(0, 10));
    setSessionEndDate('');
    setSessionStatus('active');
    setError(null);
    setIsSessionModalOpen(true);
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim()) {
      setError('Session name is required (e.g. 2025-2026).');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const id = editingSession ? editingSession.id : `session_${sessionName.replace(/[^0-9]/g, '_')}`;
      await saveAcademicSession({
        id,
        name: sessionName.trim(),
        startDate: sessionStartDate,
        endDate: sessionEndDate,
        status: sessionStatus,
        isDefault: editingSession ? editingSession.isDefault : false,
      });
      setIsSessionModalOpen(false);
      await onRefreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to save academic session.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefaultSession = async (sessionId: string) => {
    try {
      await setDefaultSession(sessionId);
      setSelectedSessionId(sessionId);
      await onRefreshData();
    } catch (err: any) {
      alert(`Error setting default session: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Classes & Academic Sessions
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure grade levels, assigned teachers, sections, and academic year terms
        </p>
      </div>

      {/* Academic Sessions Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>Academic Sessions Registry</span>
            </h2>
            <p className="text-xs text-slate-500">
              Preserves previous years' data while setting the currently active session
            </p>
          </div>
          {canEdit && (
            <button
              onClick={openAddSession}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Session</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {sessions.map(s => {
            const isDefault = s.isDefault;
            const isCurrentlySelected = s.id === selectedSessionId;
            return (
              <div
                key={s.id}
                className={`p-4 rounded-xl border transition-all ${
                  isDefault
                    ? 'border-amber-400 bg-amber-50/40 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{s.name}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {s.startDate || 'N/A'} &rarr; {s.endDate || 'N/A'}
                    </p>
                  </div>
                  {isDefault && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px]">
                      Default Active
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span
                    className={`text-[10px] uppercase font-bold ${
                      s.status === 'active' ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    Status: {s.status}
                  </span>

                  {canEdit && !isDefault && (
                    <button
                      onClick={() => handleSetDefaultSession(s.id)}
                      className="text-indigo-600 hover:text-indigo-800 font-bold text-[11px] cursor-pointer"
                    >
                      Set as Default
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Classes & Sections Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              <span>Configured Classes & Sections</span>
            </h2>
            <p className="text-xs text-slate-500">
              Grade levels, default monthly tuition fees, and assigned section teachers
            </p>
          </div>
          {canEdit && (
            <button
              onClick={openAddClass}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Class</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-4">#</th>
                <th className="py-2.5 px-4">Class Name</th>
                <th className="py-2.5 px-4">Sections</th>
                <th className="py-2.5 px-4">Default Monthly Fee</th>
                <th className="py-2.5 px-4">Class Teacher</th>
                {canEdit && <th className="py-2.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {classes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No classes registered yet. Click "Add Class" to register grades.
                  </td>
                </tr>
              ) : (
                classes.map((cls, idx) => (
                  <tr key={cls.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{cls.name}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        {cls.sections.map(sec => (
                          <span
                            key={sec}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]"
                          >
                            Sec {sec}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      Rs. {cls.defaultMonthlyFee?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {cls.classTeacher || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    {canEdit && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditClass(cls)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClass(cls.id, cls.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Class Modal */}
      <Modal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        title={editingClass ? `Edit Class: ${editingClass.name}` : 'Add New Class'}
      >
        <form onSubmit={handleSaveClass} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Class / Grade Name</label>
            <input
              type="text"
              required
              value={className}
              onChange={e => setClassName(e.target.value)}
              placeholder="e.g. 10th Grade (Matric) or 1st Year ICS"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Sections (comma separated)
            </label>
            <input
              type="text"
              value={sectionsStr}
              onChange={e => setSectionsStr(e.target.value)}
              placeholder="A, B, C"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Default Monthly Tuition Fee (PKR)
            </label>
            <input
              type="number"
              min="0"
              required
              value={defaultFee}
              onChange={e => setDefaultFee(Number(e.target.value))}
              placeholder="2500"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Class Teacher Name (Optional)</label>
            <input
              type="text"
              value={classTeacher}
              onChange={e => setClassTeacher(e.target.value)}
              placeholder="e.g. Sir Muhammad Rafiq"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsClassModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Session Modal */}
      <Modal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        title="Add Academic Session"
        subtitle="Workers Model Higher Secondary School Pishin"
      >
        <form onSubmit={handleSaveSession} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Academic Session Label</label>
            <input
              type="text"
              required
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
              placeholder="e.g. 2025-2026"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={sessionStartDate}
                onChange={e => setSessionStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                required
                value={sessionEndDate}
                onChange={e => setSessionEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Status</label>
            <select
              value={sessionStatus}
              onChange={e => setSessionStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden cursor-pointer"
            >
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsSessionModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Session'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
