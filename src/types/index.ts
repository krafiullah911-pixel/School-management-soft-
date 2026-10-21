export type UserRole = 'super_admin' | 'principal' | 'accounts_staff' | 'teacher';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  assignedClasses?: string[]; // IDs of classes assigned to teachers
  phone?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SchoolSetting {
  id?: string;
  schoolName: string;
  location: string;
  phone?: string;
  registrationNumber?: string;
  principalName?: string;
  receiptPrefix: string;
  currency: string;
  timezone: string;
  defaultSessionId?: string;
  workingDays?: string[]; // e.g. ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  updatedAt?: string;
  updatedBy?: string;
}

export interface AcademicSession {
  id: string;
  name: string; // e.g. "2024-2025"
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  isDefault: boolean;
  status: 'active' | 'closed';
  createdAt?: string;
}

export interface SchoolClass {
  id: string;
  name: string; // e.g. "Class 9th", "Class 10th", "1st Year Pre-Medical"
  sections: string[]; // e.g. ["A", "B"]
  defaultMonthlyFee: number; // in PKR
  classTeacher?: string; // name or UID
  order?: number;
  createdAt?: string;
}

export type StudentStatus = 'active' | 'withdrawn' | 'graduated';
export type Gender = 'male' | 'female' | 'other';

export interface Student {
  id: string;
  admissionNumber: string; // Unique school identifier
  fullName: string;
  fatherName: string;
  gender: Gender;
  dob?: string;
  classId: string;
  className: string;
  section: string;
  rollNumber: string;
  admissionDate: string;
  guardianPhone: string;
  address?: string;
  monthlyFee: number; // PKR
  otherRecurringCharges?: number; // PKR
  discount?: number; // Scholarship / concession PKR
  netMonthlyDue: number; // monthlyFee + otherCharges - discount
  status: StudentStatus;
  sessionId: string;
  sessionName?: string;
  createdAt?: string;
  updatedAt?: string;
  isSample?: boolean;
}

export type FeePaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

export interface MonthlyFee {
  id: string; // deterministic: `${studentId}_${sessionId}_${feeMonth}`
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classId: string;
  className: string;
  section: string;
  sessionId: string;
  feeMonth: string; // "YYYY-MM", e.g. "2026-10"
  baseFee: number;
  additionalCharges: number;
  concession: number;
  previousBalance: number;
  totalDue: number;
  paidAmount: number;
  remainingBalance: number;
  status: FeePaymentStatus;
  lastPaymentDate?: string;
  generatedAt?: string;
  updatedAt?: string;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'easypaisa' | 'jazzcash' | 'cheque';

export interface FeePayment {
  id: string;
  receiptNumber: string; // e.g. "WMHSS-REC-2026-0001"
  feeId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classId: string;
  className: string;
  section: string;
  sessionId: string;
  feeMonth: string;
  amountPaid: number;
  previousBalance: number;
  remainingBalance: number;
  paymentMethod: PaymentMethod;
  paymentDate: string; // "YYYY-MM-DD"
  recordedByUid: string;
  recordedByName: string;
  remarks?: string;
  isReversed?: boolean;
  reversalReason?: string;
  reversedBy?: string;
  reversedAt?: string;
  createdAt?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'late';

export interface AttendanceRecord {
  id: string; // deterministic: `${sessionId}_${classId}_${section || 'ALL'}_${date}_${studentId}`
  studentId: string;
  studentName: string;
  admissionNumber: string;
  rollNumber: string;
  classId: string;
  className: string;
  section: string;
  sessionId: string;
  date: string; // "YYYY-MM-DD"
  status: AttendanceStatus;
  markedByUid: string;
  markedByName: string;
  markedAt?: string;
  correctionReason?: string;
}

export interface AuditLog {
  id?: string;
  action: string;
  details: string;
  performedByUid: string;
  performedByName: string;
  timestamp: string;
}
