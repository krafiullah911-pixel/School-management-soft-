import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap } from 'lucide-react';

interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  metaRight?: React.ReactNode;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({ title, subtitle, metaRight }) => {
  const { schoolSettings } = useAuth();

  return (
    <div className="border-b-2 border-slate-900 pb-4 mb-6 print:mb-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
            <GraduationCap className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
              {schoolSettings.schoolName || 'Workers Model Higher Secondary School Pishin'}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {schoolSettings.location || 'Killi Haji Abdul Razzaq, Pishin, Balochistan, Pakistan'}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 text-[11px] text-slate-500 mt-0.5">
              <span>Tel: {schoolSettings.phone || '+92 826 421000'}</span>
              <span>Reg #: {schoolSettings.registrationNumber || 'WMHSS-PSH-2018'}</span>
              <span>Affiliated with BBISE Quetta</span>
            </div>
          </div>
        </div>

        {metaRight && <div className="text-right text-xs text-slate-600">{metaRight}</div>}
      </div>

      <div className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800 tracking-wide uppercase">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className="text-right text-[11px] text-slate-400">
          Generated: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};
