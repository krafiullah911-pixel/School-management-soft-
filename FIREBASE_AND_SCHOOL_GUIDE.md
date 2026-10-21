# Workers Model Higher Secondary School Pishin — School Management System

**Location:** Killi Haji Abdul Razzaq, Pishin, Balochistan, Pakistan  
**Currency:** Pakistani Rupees (PKR / Rs.)  
**Timezone:** Asia/Karachi (PKT, UTC+5)  
**Affiliation:** Balochistan Board of Intermediate & Secondary Education (BBISE Quetta)

---

## 1. System Overview & Technology Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS
- **Backend & Database:** Google Cloud Firestore
- **Authentication:** Firebase Authentication (Google Sign-In popup & Email/Password)
- **Security:** Zero-Trust Attribute-Based Access Control (ABAC) in `firestore.rules`
- **Printing:** Dedicated `@media print` CSS formatted for standard A4 and voucher slip printing ("Save as PDF" ready)

---

## 2. Firebase Configuration & Architecture

The application connects to Firebase via `firebase-applet-config.json` at the root of the project:

```json
{
  "projectId": "fresh-button-r53bd",
  "appId": "1:577823909553:web:48d039952f3fdd3fafe490",
  "apiKey": "AIzaSyD0tFTg7gLlkSjqTVrdEqXjTPM2qZ-phwU",
  "authDomain": "fresh-button-r53bd.firebaseapp.com",
  "firestoreDatabaseId": "ai-studio-93fab57f-a89e-4016-97ae-f1e2988181f1",
  "storageBucket": "fresh-button-r53bd.firebasestorage.app",
  "messagingSenderId": "577823909553"
}
```

### Initial Administrator Setup:
- Primary administrator email: **`krafiullah911@gmail.com`**
- When signing in with this email, the system automatically bootstraps the user profile with the `super_admin` role in Firestore `users/{uid}`.
- The Super Administrator can then authorize staff members from the **Staff & Roles** page.

---

## 3. User Roles & Permission Matrix

| Feature / Module | Super Admin | Principal | Accounts Staff | Teacher |
|---|:---:|:---:|:---:|:---:|
| **Dashboard Statistics** | Full | Full | Full (Fees & Counts) | Attendance & Counts |
| **Student Management** | Full CRUD | Full CRUD | View & Enroll | View Assigned Class |
| **Classes & Sessions** | Full CRUD | Full CRUD | View | View |
| **Monthly Fee Generation** | Full | Full | Full | No Access |
| **Receive Fee Payments** | Full | Full | Full | No Access |
| **Payment Receipts (Print)** | Yes | Yes | Yes | No Access |
| **Payment Reversals** | Yes | Yes | Authorized Only | No Access |
| **Mark Daily Attendance** | Yes | Yes | Yes | Yes |
| **Attendance Correction** | With Audit | With Audit | With Audit | With Audit |
| **Financial Reports** | Full | Full | Full | No Access |
| **Staff & Role Management** | Full CRUD | View | No Access | No Access |
| **School Settings & Backup** | Full | View | No Access | No Access |

---

## 4. Modules & Key Functionalities

### 1. Student Management
- Complete profile: Unique Admission Number, Full Name, Father's Name, Gender, Class, Section, Roll Number, Admission Date, Guardian Phone, Monthly Tuition Fee (PKR), Other Recurring Charges, Scholarship / Concession, Net Monthly Due.
- Uniqueness validation: Duplicate admission numbers are prevented.
- Archiving: Withdrawing a student preserves all their historical fee payments and attendance marks without deleting records.
- CSV Import & Export: Bulk student onboarding with column preview and validation.

### 2. Monthly Fee Management
- **Invoice Generation:** Generate monthly fee records for all active students with a single click. Deterministic keys (`${studentId}_${sessionId}_${feeMonth}`) prevent duplicate invoices for the same month.
- **Installment Payments:** Supports partial fee payments or full payments. System automatically recalculates remaining balance and updates status (`unpaid` &rarr; `partially_paid` &rarr; `paid`).
- **Official Vouchers:** Generates unique sequential receipt numbers (e.g. `WMHSS-REC-2026-0001`). Dual voucher copy format (Office Copy + Student Copy) with school crest and signature blocks.
- **Payment Reversals:** Authorized staff can reverse mistakes or bounced cheques with a mandatory audit reason.

### 3. Attendance Register
- Real-time roster loaded by Class, Section, and Date.
- Statuses: Present (P), Absent (A), Leave (L), Late (T).
- Quick "Mark All Present" button.
- Overwrite protection: warns if attendance for that class and date was already recorded by another teacher.
- Attendance percentage calculations.

### 4. Reports & Official A4 Printing
- Monthly Fee Collection Report
- Defaulters (Unpaid Fees) List
- Partially Paid Fee Ledgers
- Date-Range Collection Report
- Class Student Rosters
- Daily Class Attendance Sheets
- Formatted with clean CSS `@media print` removing all buttons and sidebars for crisp output and "Save as PDF".

---

## 5. Backup & Recovery Procedure

1. Navigate to **School Settings** &rarr; **Database Backup & Cloud Diagnostics**.
2. Click **Download JSON Backup**.
3. This creates a point-in-time snapshot of:
   - School settings and profile
   - All enrolled students
   - Monthly fee invoices
   - Immutable fee payment receipts
4. Store the JSON file securely on institutional backup drives or encrypted storage.
