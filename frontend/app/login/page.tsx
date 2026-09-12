'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../src/lib/auth-context';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../src/components/ui/Card';
import { Alert } from '../../src/components/ui/Alert';
import {
  ShieldCheck,
  Building2,
  GraduationCap,
  Briefcase,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Mail,
  Loader2,
} from 'lucide-react';
import { cn } from '../../src/lib/utils';

export type PortalKey = 'citizen' | 'government' | 'university' | 'industry' | 'admin';

interface PortalPreset {
  key: PortalKey;
  label: string;
  sublabel: string;
  destination: string;
  email: string;
  role: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  activeBorder: string;
  activeBg: string;
  badgeBg: string;
}

const PORTAL_PRESETS: PortalPreset[] = [
  {
    key: 'citizen',
    label: 'Citizen',
    sublabel: 'Complaint & Civic Action',
    destination: '/dashboard',
    email: 'citizen@sicp.gov.in',
    role: 'CITIZEN',
    icon: Layers,
    accentColor: 'text-blue-600',
    activeBorder: 'border-blue-600 ring-2 ring-blue-500/20',
    activeBg: 'bg-blue-50/80',
    badgeBg: 'bg-blue-100 text-blue-800',
  },
  {
    key: 'government',
    label: 'Government',
    sublabel: 'Municipal & Triage Command',
    destination: '/government',
    email: 'officer@sicp.gov.in',
    role: 'GOVERNMENT_OFFICER',
    icon: ShieldCheck,
    accentColor: 'text-purple-600',
    activeBorder: 'border-purple-600 ring-2 ring-purple-500/20',
    activeBg: 'bg-purple-50/80',
    badgeBg: 'bg-purple-100 text-purple-800',
  },
  {
    key: 'university',
    label: 'University',
    sublabel: 'Academic Innovation & R&D',
    destination: '/university',
    email: 'university@sicp.gov.in',
    role: 'UNIVERSITY_ADMIN',
    icon: GraduationCap,
    accentColor: 'text-indigo-600',
    activeBorder: 'border-indigo-600 ring-2 ring-indigo-500/20',
    activeBg: 'bg-indigo-50/80',
    badgeBg: 'bg-indigo-100 text-indigo-800',
  },
  {
    key: 'industry',
    label: 'Industry',
    sublabel: 'CSR & MSME Scaling',
    destination: '/industry',
    email: 'industry@sicp.gov.in',
    role: 'CSR_ORGANIZATION',
    icon: Briefcase,
    accentColor: 'text-amber-600',
    activeBorder: 'border-amber-600 ring-2 ring-amber-500/20',
    activeBg: 'bg-amber-50/80',
    badgeBg: 'bg-amber-100 text-amber-800',
  },
  {
    key: 'admin',
    label: 'System Administrator',
    sublabel: 'Superuser Platform Security',
    destination: '/admin',
    email: 'admin@sicp.gov.in',
    role: 'SYSTEM_ADMIN',
    icon: Lock,
    accentColor: 'text-emerald-500',
    activeBorder: 'border-slate-900 ring-2 ring-slate-900/20',
    activeBg: 'bg-slate-900 text-white',
    badgeBg: 'bg-slate-800 text-emerald-400',
  },
];

export function getCanonicalPortalForRole(role?: string | null): { path: string; portalName: string } {
  if (!role) return { path: '/dashboard', portalName: 'Citizen Complaint Portal' };
  const r = role.toUpperCase();

  if (['GOVERNMENT_OFFICER', 'GOVERNMENT_DEPARTMENT', 'ULB', 'PRI'].includes(r)) {
    return { path: '/government', portalName: 'Government Command Portal' };
  }
  if (['UNIVERSITY_ADMIN', 'FACULTY', 'STUDENT', 'RESEARCH_ASSISTANT'].includes(r)) {
    return { path: '/university', portalName: 'University R&D Portal' };
  }
  if (['INDUSTRY_PARTNER', 'STARTUP', 'MSME', 'CSR_ORGANIZATION'].includes(r)) {
    return { path: '/industry', portalName: 'Industry & CSR Portal' };
  }
  if (['SYSTEM_ADMIN'].includes(r)) {
    return { path: '/admin', portalName: 'System Admin Portal' };
  }
  return { path: '/dashboard', portalName: 'Citizen Complaint Portal' };
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [selectedPortal, setSelectedPortal] = useState<PortalKey>('citizen');
  const [email, setEmail] = useState('citizen@sicp.gov.in');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle Preset Portal Selection
  const handleSelectPreset = (preset: PortalPreset) => {
    setSelectedPortal(preset.key);
    setEmail(preset.email);
    setPassword('Password@123');
    setError(null);
    setInfoMessage(null);
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    // Client-side validations
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Email address is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await login(trimmedEmail, password);
      setIsLoading(false);

      if (res.success && res.user) {
        const userRole = res.user.role;
        const target = getCanonicalPortalForRole(userRole);

        // Check if user role aligns with the selected portal button
        const currentPreset = PORTAL_PRESETS.find((p) => p.key === selectedPortal);
        if (currentPreset && target.path !== currentPreset.destination && userRole !== 'SYSTEM_ADMIN') {
          // Informative redirection notice
          setInfoMessage(
            `Authenticated as ${userRole}. Redirecting to your authorized ${target.portalName}...`
          );
          setTimeout(() => {
            router.push(target.path);
          }, 800);
        } else {
          // Direct portal routing
          router.push(target.path);
        }
      } else {
        // Safe and descriptive error messaging
        const msg = res.error || 'Invalid email or password.';
        setError(msg);
      }
    } catch (err: unknown) {
      setIsLoading(false);
      setError('Unable to reach the authentication service. Please try again.');
    }
  };

  const activePreset = PORTAL_PRESETS.find((p) => p.key === selectedPortal) || PORTAL_PRESETS[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-lg space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <Link href="/" className="inline-flex items-center gap-2.5 font-black text-2xl text-slate-900 tracking-tight">
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm font-black shadow-xs">
              S
            </span>
            SICP Portal Entry
          </Link>
          <p className="text-xs text-slate-500 font-medium">
            Societal Innovation Collaboration Portal — 5 Independent Stakeholder Shells
          </p>
        </div>

        <Card className="shadow-md border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold text-slate-900">Sign In</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Select your portal persona to prefill development credentials, or enter your registered account.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Feedback Alerts */}
              {error && (
                <Alert variant="destructive" className="py-2.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-semibold">{error}</span>
                  </div>
                </Alert>
              )}

              {infoMessage && (
                <Alert variant="info" className="py-2.5 bg-blue-50 border-blue-200 text-blue-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
                    <span className="text-xs font-semibold">{infoMessage}</span>
                  </div>
                </Alert>
              )}

              {/* 5 Portal Stakeholder Presets Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="uppercase tracking-wider text-[11px] text-slate-400">
                    Select Your Portal
                  </span>
                  <span className="text-[10px] text-slate-400">Click to switch persona</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {PORTAL_PRESETS.slice(0, 4).map((p) => {
                    const Icon = p.icon;
                    const isSelected = selectedPortal === p.key;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => handleSelectPreset(p)}
                        className={cn(
                          'p-3 rounded-xl border text-left transition-all flex flex-col justify-between select-none relative overflow-hidden',
                          isSelected
                            ? cn(p.activeBorder, p.activeBg, 'shadow-xs')
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                        )}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs text-slate-900">{p.label}</span>
                          <Icon className={cn('w-4 h-4', isSelected ? p.accentColor : 'text-slate-400')} />
                        </div>
                        <span className="text-[10px] text-slate-500 line-clamp-1">{p.sublabel}</span>
                        {isSelected && (
                          <div className="mt-2 pt-1 border-t border-current/10 flex items-center justify-between text-[10px] font-semibold text-slate-600">
                            <span>Routes to:</span>
                            <span className="font-mono text-[9px] bg-white/70 px-1 rounded">{p.destination}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* 5th Preset: System Administrator spans full width */}
                  {(() => {
                    const p = PORTAL_PRESETS[4];
                    const Icon = p.icon;
                    const isSelected = selectedPortal === p.key;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => handleSelectPreset(p)}
                        className={cn(
                          'col-span-2 p-3 rounded-xl border text-left transition-all flex items-center justify-between select-none',
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                            : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-900'
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-white/10 text-emerald-400">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-xs flex items-center gap-2">
                              <span>{p.label}</span>
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Superuser
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">{p.sublabel}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono bg-white/10 text-slate-300 px-2 py-0.5 rounded">
                          {p.destination}
                        </span>
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* Input Fields */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      disabled={isLoading}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@sicp.gov.in"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      disabled={isLoading}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                  <span>Development Password:</span>
                  <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    Password@123
                  </span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className={cn(
                  'w-full font-bold text-xs py-2.5 transition-all shadow-xs flex items-center justify-center gap-1.5',
                  selectedPortal === 'admin' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-blue-600 hover:bg-blue-700'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating with SICP Server...</span>
                  </>
                ) : (
                  <>
                    <span>Enter {activePreset.label} Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>

              <div className="text-center text-xs text-slate-500">
                <span>Need a new account? </span>
                <Link href="/register" className="text-blue-600 font-bold hover:underline">
                  Register here
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
