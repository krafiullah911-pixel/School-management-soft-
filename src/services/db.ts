import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import {
  SchoolSetting,
  UserProfile,
  AcademicSession,
  SchoolClass,
  Student,
  MonthlyFee,
  FeePayment,
  AttendanceRecord,
  AuditLog,
} from '../types';

export const DEFAULT_SCHOOL_SETTINGS: SchoolSetting = {
  schoolName: 'Workers Model Higher Secondary School Pishin',
  location: 'Killi Haji Abdul Razzaq, Pishin, Balochistan, Pakistan',
  phone: '+92 826 421000',
  registrationNumber: 'WMHSS-PSH-2018',
  principalName: 'Principal WMHSS Pishin',
  receiptPrefix: 'WMHSS-REC-',
  currency: 'PKR',
  timezone: 'Asia/Karachi',
  defaultSessionId: 'session_2024_2025',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

export const INITIAL_CLASSES: Omit<SchoolClass, 'id'>[] = [
  { name: 'Nursery', sections: ['A'], defaultMonthlyFee: 1500, order: 1 },
  { name: 'Prep', sections: ['A'], defaultMonthlyFee: 1600, order: 2 },
  { name: 'Class 1st', sections: ['A', 'B'], defaultMonthlyFee: 1800, order: 3 },
  { name: 'Class 2nd', sections: ['A', 'B'], defaultMonthlyFee: 1800, order: 4 },
  { name: 'Class 3rd', sections: ['A', 'B'], defaultMonthlyFee: 2000, order: 5 },
  { name: 'Class 4th', sections: ['A', 'B'], defaultMonthlyFee: 2000, order: 6 },
  { name: 'Class 5th', sections: ['A', 'B'], defaultMonthlyFee: 2200, order: 7 },
  { name: 'Class 6th', sections: ['A', 'B'], defaultMonthlyFee: 2400, order: 8 },
  { name: 'Class 7th', sections: ['A', 'B'], defaultMonthlyFee: 2500, order: 9 },
  { name: 'Class 8th', sections: ['A', 'B'], defaultMonthlyFee: 2600, order: 10 },
  { name: 'Class 9th (Matric)', sections: ['A', 'B'], defaultMonthlyFee: 3000, order: 11 },
  { name: 'Class 10th (Matric)', sections: ['A', 'B'], defaultMonthlyFee: 3200, order: 12 },
  { name: '1st Year F.Sc (Pre-Medical)', sections: ['A'], defaultMonthlyFee: 4000, order: 13 },
  { name: '1st Year F.Sc (Pre-Engineering)', sections: ['A'], defaultMonthlyFee: 4000, order: 14 },
  { name: '1st Year ICS', sections: ['A'], defaultMonthlyFee: 3800, order: 15 },
  { name: '2nd Year F.Sc (Pre-Medical)', sections: ['A'], defaultMonthlyFee: 4200, order: 16 },
  { name: '2nd Year F.Sc (Pre-Engineering)', sections: ['A'], defaultMonthlyFee: 4200, order: 17 },
  { name: '2nd Year ICS', sections: ['A'], defaultMonthlyFee: 4000, order: 18 },
];

export const INITIAL_SESSIONS: AcademicSession[] = [
  {
    id: 'session_2024_2025',
    name: '2024-2025',
    startDate: '2024-04-01',
    endDate: '2025-03-31',
    isDefault: true,
    status: 'active',
  },
  {
    id: 'session_2025_2026',
    name: '2025-2026',
    startDate: '2025-04-01',
    endDate: '2026-03-31',
    isDefault: false,
    status: 'active',
  },
];

// ---- SCHOOL SETTINGS ----
export async function getSchoolSettings(): Promise<SchoolSetting> {
  const path = 'schoolSettings/general';
  try {
    const snap = await getDoc(doc(db, 'schoolSettings', 'general'));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as SchoolSetting;
    }
    // Only attempt to seed default if user is authenticated
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'schoolSettings', 'general'), {
          ...DEFAULT_SCHOOL_SETTINGS,
          updatedAt: new Date().toISOString(),
        });
      } catch (writeErr) {
        // Non-fatal if user does not have write privileges
      }
    }
    return DEFAULT_SCHOOL_SETTINGS;
  } catch (error) {
    if (!auth.currentUser) {
      return DEFAULT_SCHOOL_SETTINGS;
    }
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateSchoolSettings(settings: Partial<SchoolSetting>, uid: string): Promise<void> {
  const path = 'schoolSettings/general';
  try {
    await setDoc(
      doc(db, 'schoolSettings', 'general'),
      {
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy: uid,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ---- AUDIT LOGS ----
export async function logAuditEvent(action: string, details: string, uid: string, name: string): Promise<void> {
  const path = 'auditLogs';
  try {
    const logRef = doc(collection(db, 'auditLogs'));
    await setDoc(logRef, {
      action,
      details,
      performedByUid: uid,
      performedByName: name,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Audit log write error (non-fatal):', error);
  }
}

// ---- USERS & PROFILES ----
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const path = `users/${profile.uid}`;
  try {
    await setDoc(doc(db, 'users', profile.uid), {
      ...profile,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => d.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// ---- ACADEMIC SESSIONS ----
export async function getAcademicSessions(): Promise<AcademicSession[]> {
  const path = 'academicSessions';
  try {
    const snap = await getDocs(collection(db, 'academicSessions'));
    if (snap.empty) {
      // Seed default sessions
      const batch = writeBatch(db);
      for (const s of INITIAL_SESSIONS) {
        batch.set(doc(db, 'academicSessions', s.id), s);
      }
      await batch.commit();
      return INITIAL_SESSIONS;
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AcademicSession));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveAcademicSession(session: AcademicSession): Promise<void> {
  const path = `academicSessions/${session.id}`;
  try {
    await setDoc(doc(db, 'academicSessions', session.id), session, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function setDefaultSession(sessionId: string): Promise<void> {
  const path = 'academicSessions';
  try {
    const sessions = await getAcademicSessions();
    const batch = writeBatch(db);
    sessions.forEach(s => {
      batch.update(doc(db, 'academicSessions', s.id), { isDefault: s.id === sessionId });
    });
    batch.update(doc(db, 'schoolSettings', 'general'), { defaultSessionId: sessionId });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ---- CLASSES ----
export async function getClasses(): Promise<SchoolClass[]> {
  const path = 'classes';
  try {
    const snap = await getDocs(collection(db, 'classes'));
    if (snap.empty) {
      // Seed initial classes
      const batch = writeBatch(db);
      const seeded: SchoolClass[] = [];
      INITIAL_CLASSES.forEach((c, idx) => {
        const id = `class_${c.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const item: SchoolClass = { ...c, id, order: idx + 1 };
        batch.set(doc(db, 'classes', id), item);
        seeded.push(item);
      });
      await batch.commit();
      return seeded;
    }
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as SchoolClass));
    return list.sort((a, b) => (a.order || 99) - (b.order || 99));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveClass(cls: SchoolClass): Promise<void> {
  const path = `classes/${cls.id}`;
  try {
    await setDoc(doc(db, 'classes', cls.id), cls, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteClass(classId: string): Promise<void> {
  const path = `classes/${classId}`;
  try {
    await deleteDoc(doc(db, 'classes', classId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ---- STUDENTS ----
export async function getStudents(filters?: {
  classId?: string;
  section?: string;
  sessionId?: string;
  status?: string;
}): Promise<Student[]> {
  const path = 'students';
  try {
    const constraints: any[] = [];
    if (filters?.classId && filters.classId !== 'all') {
      constraints.push(where('classId', '==', filters.classId));
    }
    if (filters?.section && filters.section !== 'all') {
      constraints.push(where('section', '==', filters.section));
    }
    if (filters?.sessionId && filters.sessionId !== 'all') {
      constraints.push(where('sessionId', '==', filters.sessionId));
    }
    if (filters?.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status));
    }

    const q = constraints.length > 0
      ? query(collection(db, 'students'), ...constraints)
      : collection(db, 'students');

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function checkAdmissionNumberUnique(admissionNumber: string, excludeId?: string): Promise<boolean> {
  const path = 'students';
  try {
    const q = query(collection(db, 'students'), where('admissionNumber', '==', admissionNumber.trim()));
    const snap = await getDocs(q);
    if (snap.empty) return true;
    if (excludeId && snap.docs.length === 1 && snap.docs[0].id === excludeId) return true;
    return false;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveStudent(student: Student, uid: string, staffName: string): Promise<string> {
  const studentId = student.id || `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `students/${studentId}`;
  try {
    const isNew = !student.id;
    const isUnique = await checkAdmissionNumberUnique(student.admissionNumber, student.id);
    if (!isUnique) {
      throw new Error(`Admission Number "${student.admissionNumber}" is already registered to another student.`);
    }

    const payload: Student = {
      ...student,
      id: studentId,
      admissionNumber: student.admissionNumber.trim(),
      fullName: student.fullName.trim(),
      fatherName: student.fatherName.trim(),
      netMonthlyDue: Math.max(0, (student.monthlyFee || 0) + (student.otherRecurringCharges || 0) - (student.discount || 0)),
      updatedAt: new Date().toISOString(),
      ...(isNew ? { createdAt: new Date().toISOString() } : {}),
    };

    await setDoc(doc(db, 'students', studentId), payload, { merge: true });
    await logAuditEvent(
      isNew ? 'CREATE_STUDENT' : 'UPDATE_STUDENT',
      `${isNew ? 'Enrolled' : 'Updated'} student: ${payload.fullName} (Adm: ${payload.admissionNumber}, Class: ${payload.className})`,
      uid,
      staffName
    );
    return studentId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getStudentById(id: string): Promise<Student | null> {
  const path = `students/${id}`;
  try {
    const snap = await getDoc(doc(db, 'students', id));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Student;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// ---- MONTHLY FEES ----
export function generateMonthlyFeeDocId(studentId: string, sessionId: string, feeMonth: string): string {
  // Deterministic ID prevents duplicate fees for the same student, session and month
  return `${studentId}_${sessionId}_${feeMonth}`;
}

export async function getMonthlyFees(filters: {
  feeMonth?: string;
  sessionId?: string;
  classId?: string;
  status?: string;
}): Promise<MonthlyFee[]> {
  const path = 'monthlyFees';
  try {
    const constraints: any[] = [];
    if (filters.feeMonth && filters.feeMonth !== 'all') {
      constraints.push(where('feeMonth', '==', filters.feeMonth));
    }
    if (filters.sessionId && filters.sessionId !== 'all') {
      constraints.push(where('sessionId', '==', filters.sessionId));
    }
    if (filters.classId && filters.classId !== 'all') {
      constraints.push(where('classId', '==', filters.classId));
    }
    if (filters.status && filters.status !== 'all') {
      constraints.push(where('status', '==', filters.status));
    }

    const q = constraints.length > 0
      ? query(collection(db, 'monthlyFees'), ...constraints)
      : collection(db, 'monthlyFees');

    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MonthlyFee));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function generateMonthlyFeesForSession(
  sessionId: string,
  feeMonth: string,
  classId?: string,
  uid?: string,
  staffName?: string
): Promise<{ created: number; existing: number }> {
  const path = 'monthlyFees';
  try {
    // 1. Get all active students for this session (and optional class)
    const students = await getStudents({
      sessionId,
      status: 'active',
      ...(classId && classId !== 'all' ? { classId } : {}),
    });

    if (students.length === 0) {
      return { created: 0, existing: 0 };
    }

    let createdCount = 0;
    let existingCount = 0;

    // Split writes in batches of max 400
    const chunkSize = 400;
    for (let i = 0; i < students.length; i += chunkSize) {
      const chunk = students.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const st of chunk) {
        const feeDocId = generateMonthlyFeeDocId(st.id, sessionId, feeMonth);
        const feeRef = doc(db, 'monthlyFees', feeDocId);
        const existingSnap = await getDoc(feeRef);

        if (existingSnap.exists()) {
          existingCount++;
          continue;
        }

        const totalDue = st.netMonthlyDue || (st.monthlyFee + (st.otherRecurringCharges || 0) - (st.discount || 0));
        const feeRecord: MonthlyFee = {
          id: feeDocId,
          studentId: st.id,
          studentName: st.fullName,
          admissionNumber: st.admissionNumber,
          classId: st.classId,
          className: st.className,
          section: st.section || 'A',
          sessionId,
          feeMonth,
          baseFee: st.monthlyFee || 0,
          additionalCharges: st.otherRecurringCharges || 0,
          concession: st.discount || 0,
          previousBalance: 0,
          totalDue,
          paidAmount: 0,
          remainingBalance: totalDue,
          status: 'unpaid',
          generatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        batch.set(feeRef, feeRecord);
        createdCount++;
      }

      await batch.commit();
    }

    if (uid && staffName && createdCount > 0) {
      await logAuditEvent(
        'GENERATE_MONTHLY_FEES',
        `Generated ${createdCount} fee records for Month ${feeMonth} (Session: ${sessionId})`,
        uid,
        staffName
      );
    }

    return { created: createdCount, existing: existingCount };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ---- FEE PAYMENTS & RECEIPTS ----
export async function getFeePayments(filters?: {
  studentId?: string;
  sessionId?: string;
  feeMonth?: string;
  classId?: string;
}): Promise<FeePayment[]> {
  const path = 'feePayments';
  try {
    const constraints: any[] = [];
    if (filters?.studentId) {
      constraints.push(where('studentId', '==', filters.studentId));
    }
    if (filters?.sessionId && filters.sessionId !== 'all') {
      constraints.push(where('sessionId', '==', filters.sessionId));
    }
    if (filters?.feeMonth && filters.feeMonth !== 'all') {
      constraints.push(where('feeMonth', '==', filters.feeMonth));
    }
    if (filters?.classId && filters.classId !== 'all') {
      constraints.push(where('classId', '==', filters.classId));
    }

    const q = constraints.length > 0
      ? query(collection(db, 'feePayments'), ...constraints)
      : collection(db, 'feePayments');

    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as FeePayment));
    return list.sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function generateReceiptNumber(prefix = 'WMHSS-REC-'): Promise<string> {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix}${year}-${timestamp}${randomSuffix}`;
}

export async function recordFeePayment(params: {
  feeId: string;
  amountPaid: number;
  paymentMethod: FeePayment['paymentMethod'];
  paymentDate: string;
  remarks?: string;
  recordedByUid: string;
  recordedByName: string;
}): Promise<FeePayment> {
  const path = 'feePayments';
  try {
    if (params.amountPaid <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    // 1. Get current monthly fee doc
    const feeRef = doc(db, 'monthlyFees', params.feeId);
    const feeSnap = await getDoc(feeRef);
    if (!feeSnap.exists()) {
      throw new Error('Monthly fee record not found.');
    }
    const feeData = feeSnap.data() as MonthlyFee;

    const currentPaid = feeData.paidAmount || 0;
    const currentRemaining = feeData.remainingBalance;
    const newPaidTotal = currentPaid + params.amountPaid;
    const newRemaining = Math.max(0, currentRemaining - params.amountPaid);
    const newStatus: MonthlyFee['status'] = newRemaining <= 0 ? 'paid' : 'partially_paid';

    // 2. Settings for receipt prefix
    const settings = await getSchoolSettings();
    const receiptNumber = await generateReceiptNumber(settings.receiptPrefix || 'WMHSS-REC-');

    const paymentId = `pay_${Date.now()}_${feeData.studentId.slice(-4)}`;
    const paymentRecord: FeePayment = {
      id: paymentId,
      receiptNumber,
      feeId: params.feeId,
      studentId: feeData.studentId,
      studentName: feeData.studentName,
      admissionNumber: feeData.admissionNumber,
      classId: feeData.classId,
      className: feeData.className,
      section: feeData.section,
      sessionId: feeData.sessionId,
      feeMonth: feeData.feeMonth,
      amountPaid: params.amountPaid,
      previousBalance: currentRemaining,
      remainingBalance: newRemaining,
      paymentMethod: params.paymentMethod,
      paymentDate: params.paymentDate,
      recordedByUid: params.recordedByUid,
      recordedByName: params.recordedByName,
      remarks: params.remarks || '',
      isReversed: false,
      createdAt: new Date().toISOString(),
    };

    // 3. Atomic batch write: save payment and update monthly fee doc
    const batch = writeBatch(db);
    batch.set(doc(db, 'feePayments', paymentId), paymentRecord);
    batch.update(feeRef, {
      paidAmount: newPaidTotal,
      remainingBalance: newRemaining,
      status: newStatus,
      lastPaymentDate: params.paymentDate,
      updatedAt: new Date().toISOString(),
    });

    await batch.commit();

    await logAuditEvent(
      'RECORD_PAYMENT',
      `Collected PKR ${params.amountPaid.toLocaleString()} from ${feeData.studentName} (Adm: ${feeData.admissionNumber}, Rec: ${receiptNumber})`,
      params.recordedByUid,
      params.recordedByName
    );

    return paymentRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function reverseFeePayment(
  paymentId: string,
  reason: string,
  staffUid: string,
  staffName: string
): Promise<void> {
  const path = `feePayments/${paymentId}`;
  try {
    const payRef = doc(db, 'feePayments', paymentId);
    const paySnap = await getDoc(payRef);
    if (!paySnap.exists()) {
      throw new Error('Payment record not found.');
    }
    const payData = paySnap.data() as FeePayment;
    if (payData.isReversed) {
      throw new Error('This payment has already been reversed.');
    }

    // Get corresponding monthly fee
    const feeRef = doc(db, 'monthlyFees', payData.feeId);
    const feeSnap = await getDoc(feeRef);
    if (!feeSnap.exists()) {
      throw new Error('Associated monthly fee record not found.');
    }
    const feeData = feeSnap.data() as MonthlyFee;

    const restoredPaid = Math.max(0, (feeData.paidAmount || 0) - payData.amountPaid);
    const restoredRemaining = (feeData.remainingBalance || 0) + payData.amountPaid;
    const restoredStatus: MonthlyFee['status'] = restoredPaid === 0 ? 'unpaid' : 'partially_paid';

    const batch = writeBatch(db);
    batch.update(payRef, {
      isReversed: true,
      reversalReason: reason,
      reversedBy: staffName,
      reversedAt: new Date().toISOString(),
    });
    batch.update(feeRef, {
      paidAmount: restoredPaid,
      remainingBalance: restoredRemaining,
      status: restoredStatus,
      updatedAt: new Date().toISOString(),
    });

    await batch.commit();

    await logAuditEvent(
      'REVERSE_PAYMENT',
      `Reversed payment ${payData.receiptNumber} (PKR ${payData.amountPaid.toLocaleString()}) for ${payData.studentName}. Reason: ${reason}`,
      staffUid,
      staffName
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ---- ATTENDANCE ----
export function generateAttendanceDocId(sessionId: string, classId: string, section: string, date: string, studentId: string): string {
  const sec = section || 'ALL';
  return `${sessionId}_${classId}_${sec}_${date}_${studentId}`;
}

export async function getDailyAttendance(sessionId: string, classId: string, section: string, date: string): Promise<AttendanceRecord[]> {
  const path = 'attendance';
  try {
    const sec = section || 'ALL';
    const q = query(
      collection(db, 'attendance'),
      where('sessionId', '==', sessionId),
      where('classId', '==', classId),
      where('section', '==', sec),
      where('date', '==', date)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveDailyAttendance(
  records: AttendanceRecord[],
  uid: string,
  staffName: string,
  reason?: string
): Promise<void> {
  const path = 'attendance';
  try {
    if (records.length === 0) return;

    const chunkSize = 400;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      chunk.forEach(r => {
        const id = r.id || generateAttendanceDocId(r.sessionId, r.classId, r.section, r.date, r.studentId);
        const ref = doc(db, 'attendance', id);
        batch.set(ref, {
          ...r,
          id,
          markedByUid: uid,
          markedByName: staffName,
          markedAt: new Date().toISOString(),
          ...(reason ? { correctionReason: reason } : {}),
        }, { merge: true });
      });

      await batch.commit();
    }

    const first = records[0];
    await logAuditEvent(
      'MARK_ATTENDANCE',
      `Marked attendance for ${records.length} students of Class ${first.className} Section ${first.section} on ${first.date}`,
      uid,
      staffName
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getMonthlyAttendanceMatrix(
  sessionId: string,
  classId: string,
  section: string,
  month: string // "YYYY-MM"
): Promise<AttendanceRecord[]> {
  const path = 'attendance';
  try {
    const sec = section || 'ALL';
    // date >= month-01 and date <= month-31
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    const q = query(
      collection(db, 'attendance'),
      where('sessionId', '==', sessionId),
      where('classId', '==', classId),
      where('section', '==', sec),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getStudentAttendanceHistory(studentId: string, sessionId?: string): Promise<AttendanceRecord[]> {
  const path = 'attendance';
  try {
    const constraints: any[] = [where('studentId', '==', studentId)];
    if (sessionId && sessionId !== 'all') {
      constraints.push(where('sessionId', '==', sessionId));
    }
    const q = query(collection(db, 'attendance'), ...constraints);
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
    return list.sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
