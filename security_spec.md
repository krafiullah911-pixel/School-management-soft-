# Security Specification — Workers Model Higher Secondary School Pishin

## 1. Data Invariants
1. **Multi-Role Access Control**: Only Super Admin and Principal can manage staff accounts or alter school structural settings.
2. **Financial Isolation**: Teachers cannot read or write fee ledgers, payment transactions, or financial reports. Only Accounts Staff, Principal, and Super Admin have financial clearance.
3. **Transaction Immutability**: Fee payments cannot be deleted. Payment entries once recorded can only be reversed with an audit trail, keeping historical totals integral.
4. **Attendance Integrity**: Attendance entries cannot be marked by unauthenticated users or users without staff privileges. Duplicate attendance entries for the same student, class, session, and date are prevented by deterministic ID constraints.
5. **Admission Number Integrity**: Every student has a required admission number, unique roll number per class, and session association.
6. **No Self-Privilege Escalation**: Users cannot self-assign or escalate their role in the `users` collection. Only Super Admin can modify roles.

## 2. Dirty Dozen Payloads (Targeting Exploits to Reject)
1. **Payload 1 (Teacher Reading Financial Records)**:
   - Operation: `GET /feePayments/{paymentId}` by user with `role: "teacher"`.
   - Invariant: Denied. Only Accounts, Principal, or Super Admin may read fee records.
2. **Payload 2 (Unauthenticated Reading Student Database)**:
   - Operation: `LIST /students` with `request.auth == null`.
   - Invariant: Denied.
3. **Payload 3 (Self-Escalation to Super Admin)**:
   - Operation: `UPDATE /users/{uid}` by regular user setting `role: "super_admin"`.
   - Invariant: Denied. Only existing Super Admin can modify roles.
4. **Payload 4 (Direct Deletion of Historical Payment Transaction)**:
   - Operation: `DELETE /feePayments/{paymentId}` by Accounts Staff.
   - Invariant: Denied. Financial payment transactions are non-deletable.
5. **Payload 5 (Fee Month Duplicate Injection)**:
   - Operation: `CREATE /monthlyFees/random_id` for duplicate month.
   - Invariant: Deterministic document ID `${studentId}_${sessionId}_${feeMonth}` prevents duplicate keys.
6. **Payload 6 (Oversized Payload / Denial of Wallet)**:
   - Operation: Injecting strings > 1000 characters or junk arrays into student fields.
   - Invariant: String size limits enforced.
7. **Payload 7 (Falsifying Payment Collector UID)**:
   - Operation: `CREATE /feePayments` where `recordedByUid != request.auth.uid`.
   - Invariant: Denied. The recorder must match the authenticated user.
8. **Payload 8 (Anonymous Student Creation)**:
   - Operation: `CREATE /students` without authentication.
   - Invariant: Denied.
9. **Payload 9 (Teacher Modifying School Settings)**:
   - Operation: `WRITE /schoolSettings/general` by teacher.
   - Invariant: Denied.
10. **Payload 10 (Negative Payment / Arbitrary Balance Hack)**:
    - Operation: `CREATE /feePayments` with `amountPaid <= 0`.
    - Invariant: Denied. Payment amount must be positive.
11. **Payload 11 (Non-Teacher Modifying Other Teacher's Audit Log)**:
    - Operation: `UPDATE /auditLogs/{logId}`.
    - Invariant: Denied. Audit logs are append-only.
12. **Payload 12 (Attendance Tampering by Public)**:
    - Operation: `WRITE /attendance/{id}` without authenticated staff session.
    - Invariant: Denied.
