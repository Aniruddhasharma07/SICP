import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { HelpCircle, Clock, UserCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ZeroDeadEndNoticeProps {
  whatHappened: string;
  currentStatus: string;
  whyStatus: string;
  whatCanDoNext: string[];
  whoIsResponsible: string;
  whatHappensIfIdle: string;
  variant?: 'info' | 'warning' | 'error' | 'success';
  className?: string;
  onActionClick?: (action: string) => void;
}

export function ZeroDeadEndNotice({
  whatHappened,
  currentStatus,
  whyStatus,
  whatCanDoNext,
  whoIsResponsible,
  whatHappensIfIdle,
  variant = 'info',
  className,
  onActionClick,
}: ZeroDeadEndNoticeProps) {
  const badgeVariant =
    variant === 'error' ? 'destructive' : variant === 'warning' ? 'warning' : variant === 'success' ? 'success' : 'default';

  const borderColor =
    variant === 'error'
      ? 'border-rose-300 bg-rose-50/40'
      : variant === 'warning'
      ? 'border-amber-300 bg-amber-50/40'
      : variant === 'success'
      ? 'border-emerald-300 bg-emerald-50/40'
      : 'border-blue-300 bg-blue-50/40';

  return (
    <Card className={cn('border-2 overflow-hidden', borderColor, className)}>
      <CardHeader className="bg-white/80 border-b border-slate-200/60 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
            <CardTitle className="text-base">System State & Workflow Guide</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Current Status:</span>
            <Badge variant={badgeVariant}>{currentStatus}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4 text-sm">
        {/* 1. What Happened */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">1. What happened?</h4>
          <p className="text-slate-800 font-medium leading-relaxed">{whatHappened}</p>
        </div>

        {/* 2 & 3. Why is it in that status */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">2. Why is it in this status?</h4>
          <p className="text-slate-700 leading-relaxed">{whyStatus}</p>
        </div>

        {/* 4. Who is responsible */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-white border border-slate-200">
            <UserCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="block text-xs font-semibold text-slate-500">Responsible Stakeholder</span>
              <span className="text-xs font-medium text-slate-900">{whoIsResponsible}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-white border border-slate-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="block text-xs font-semibold text-slate-500">If No Action Taken</span>
              <span className="text-xs font-medium text-slate-800">{whatHappensIfIdle}</span>
            </div>
          </div>
        </div>

        {/* 5. What you can do next */}
        <div className="pt-2 border-t border-slate-200/70">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-600" />
            Available Next Actions
          </h4>
          <div className="flex flex-wrap gap-2">
            {whatCanDoNext.map((action, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onActionClick && onActionClick(action)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 text-xs font-medium text-slate-800 shadow-sm transition-all"
              >
                <span>{action}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
