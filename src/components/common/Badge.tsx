import React from 'react';
import { UserRole, FeePaymentStatus, AttendanceStatus, StudentStatus } from '../../types';

interface BadgeProps {
  variant?: 'role' | 'fee' | 'attendance' | 'status' | 'custom';
  value: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'custom', value, className = '' }) => {
  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = value;

  if (variant === 'role') {
    switch (value as UserRole) {
      case 'super_admin':
        colorStyles = 'bg-purple-50 text-purple-700 border-purple-200 font-semibold';
        label = 'Super Admin';
        break;
      case 'principal':
        colorStyles = 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold';
        label = 'Principal';
        break;
      case 'accounts_staff':
        colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
        label = 'Accounts Staff';
        break;
      case 'teacher':
        colorStyles = 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
        label = 'Teacher';
        break;
    }
  } else if (variant === 'fee') {
    switch (value as FeePaymentStatus) {
      case 'paid':
        colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
        label = 'Paid';
        break;
      case 'partially_paid':
        colorStyles = 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
        label = 'Partial';
        break;
      case 'unpaid':
        colorStyles = 'bg-rose-50 text-rose-700 border-rose-200 font-medium';
        label = 'Unpaid';
        break;
    }
  } else if (variant === 'attendance') {
    switch (value as AttendanceStatus) {
      case 'present':
        colorStyles = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold';
        label = 'Present (P)';
        break;
      case 'absent':
        colorStyles = 'bg-rose-100 text-rose-800 border-rose-300 font-semibold';
        label = 'Absent (A)';
        break;
      case 'leave':
        colorStyles = 'bg-blue-100 text-blue-800 border-blue-300 font-semibold';
        label = 'Leave (L)';
        break;
      case 'late':
        colorStyles = 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
        label = 'Late (T)';
        break;
    }
  } else if (variant === 'status') {
    switch (value as StudentStatus) {
      case 'active':
        colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        label = 'Active';
        break;
      case 'withdrawn':
        colorStyles = 'bg-slate-100 text-slate-600 border-slate-300';
        label = 'Withdrawn';
        break;
      case 'graduated':
        colorStyles = 'bg-blue-50 text-blue-700 border-blue-200';
        label = 'Graduated';
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border tracking-tight ${colorStyles} ${className}`}
    >
      {label}
    </span>
  );
};
