import React, { useState, useEffect } from 'react';
import { useAuth, SUPER_ADMIN_EMAIL } from '../context/AuthContext';
import { UserProfile, UserRole, SchoolClass } from '../types';
import { getAllUsers, saveUserProfile } from '../services/db';
import {
  UserPlus,
  ShieldCheck,
  UserCheck,
  UserX,
  Mail,
  Phone,
  GraduationCap,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';

interface StaffPageProps {
  classes: SchoolClass[];
}

export const StaffPage: React.FC<StaffPageProps> = ({ classes }) => {
  const { userProfile, isSuperAdmin, refreshProfile } = useAuth();

  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);

  // Form
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('teacher');
  const [phone, setPhone] = useState('');
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const users = await getAllUsers();
      setStaffList(users);
    } catch (e) {
      console.error('Error loading staff:', e);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingStaff(null);
    setEmail('');
    setDisplayName('');
    setRole('teacher');
    setPhone('');
    setAssignedClasses([]);
    setIsActive(true);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (staff: UserProfile) => {
    setEditingStaff(staff);
    setEmail(staff.email);
    setDisplayName(staff.displayName);
    setRole(staff.role);
    setPhone(staff.phone || '');
    setAssignedClasses(staff.assignedClasses || []);
    setIsActive(staff.isActive);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !displayName.trim()) {
      setError('Email and Display Name are required.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      // If new, generate deterministic uid from email hash or timestamp
      const uid = editingStaff?.uid || `staff_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

      const profile: UserProfile = {
        uid,
        email: email.trim().toLowerCase(),
        displayName: displayName.trim(),
        role,
        phone: phone.trim(),
        assignedClasses,
        isActive,
        createdAt: editingStaff?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveUserProfile(profile);
      setIsModalOpen(false);
      setMessage(`Staff record for ${displayName} successfully saved.`);
      await loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to save staff record.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (staff: UserProfile) => {
    if (staff.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      alert('Cannot deactivate the root Super Administrator.');
      return;
    }

    try {
      await saveUserProfile({
        ...staff,
        isActive: !staff.isActive,
      });
      await loadStaff();
    } catch (err: any) {
      alert(`Error toggling account: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Staff & Permissions Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Authorize school personnel, assign administrative roles, and map class teachers
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>Authorize Staff Member</span>
          </button>
        )}
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Assigned Classes</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Status</th>
                {isSuperAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading staff profiles...
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No authorized staff profiles found.
                  </td>
                </tr>
              ) : (
                staffList.map(st => (
                  <tr key={st.uid} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {st.displayName}
                      {st.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && (
                        <span className="ml-1.5 text-[10px] text-amber-600 font-mono font-bold">
                          [ROOT]
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{st.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant="role" value={st.role} />
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {st.assignedClasses && st.assignedClasses.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {st.assignedClasses.map(cId => {
                            const found = classes.find(c => c.id === cId);
                            return (
                              <span key={cId} className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px]">
                                {found?.name || cId}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">All / Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{st.phone || '-'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          st.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {st.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(st)}
                            className="text-amber-700 hover:text-amber-800 font-bold cursor-pointer"
                          >
                            Edit
                          </button>
                          {st.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase() && (
                            <button
                              onClick={() => handleToggleActive(st)}
                              className={`font-semibold cursor-pointer ${
                                st.isActive ? 'text-rose-600 hover:text-rose-800' : 'text-emerald-600 hover:text-emerald-800'
                              }`}
                            >
                              {st.isActive ? 'Suspend' : 'Activate'}
                            </button>
                          )}
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

      {/* Staff Authorize Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStaff ? `Edit Staff: ${editingStaff.displayName}` : 'Authorize New Staff Account'}
      >
        <form onSubmit={handleSaveStaff} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Staff Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="teacher@wmhsspishin.edu.pk or google account"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Staff Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Sir Abdul Ghafoor"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Assigned School Role <span className="text-rose-500">*</span>
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold focus:outline-hidden cursor-pointer"
            >
              <option value="teacher">Teacher (Daily Class Attendance)</option>
              <option value="accounts_staff">Accounts Staff (Fee Collections & Receipts)</option>
              <option value="principal">Principal (Schoolwide Statistics & Ledgers)</option>
              <option value="super_admin">Super Admin (Full Administrative Authority)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+92 3XX XXXXXXX"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Account Status</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="staffStatus"
                  checked={isActive}
                  onChange={() => setIsActive(true)}
                />
                <span>Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="staffStatus"
                  checked={!isActive}
                  onChange={() => setIsActive(false)}
                />
                <span className="text-rose-600">Suspended</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Staff Profile'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
