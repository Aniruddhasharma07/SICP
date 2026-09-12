'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/lib/auth-context';
import { UserRole } from '@sicp/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { cn } from '../../src/lib/utils';
import {
  Shield,
  User,
  Building2,
  GraduationCap,
  Briefcase,
  Lock,
  Mail,
  Phone,
  Check,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  MapPin,
  Award,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';

const ROLES = [
  {
    role: UserRole.CITIZEN,
    label: 'Citizen',
    tagline: 'Report municipal grievances & verify societal solutions',
    destination: '/dashboard',
    icon: User,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-500',
  },
  {
    role: UserRole.GOVERNMENT_OFFICER,
    label: 'Government Officer',
    tagline: 'Validate challenges, accredit institutions & allocate grants',
    destination: '/government',
    icon: Shield,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-500',
  },
  {
    role: UserRole.UNIVERSITY_ADMIN,
    label: 'University Admin',
    tagline: 'Register academic institution, mobilize R&D & lead proposals',
    destination: '/university',
    icon: GraduationCap,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-500',
  },
  {
    role: UserRole.INDUSTRY_PARTNER,
    label: 'Industry Admin',
    tagline: 'Register enterprise, startup, MSME or CSR organization',
    destination: '/industry',
    icon: Briefcase,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-500',
  },
];

const UNIVERSITY_CATEGORIES = [
  'Institute of National Importance (IIT/NIT/IISc)',
  'Central University',
  'State Public University',
  'Deemed University',
  'Private Research University',
  'Autonomous Engineering College',
];

const INDUSTRY_SUBTYPES = [
  { id: 'INDUSTRY', label: 'Industry Partner', desc: 'Established corporate or enterprise partner' },
  { id: 'STARTUP', label: 'DeepTech / Innovation Startup', desc: 'DPIIT recognized innovative startup' },
  { id: 'MSME', label: 'MSME Enterprise', desc: 'Micro, Small & Medium enterprise partner' },
  { id: 'CSR', label: 'CSR Foundation / Organization', desc: 'Corporate Social Responsibility foundation' },
];

const INDUSTRY_CAPABILITIES = [
  'Mentorship',
  'Funding',
  'Technology',
  'Co-development',
  'Prototyping',
  'Testing',
  'Pilot',
  'Deployment',
];

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuth();

  // Account State
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.CITIZEN);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // University Organization State
  const [uniName, setUniName] = useState('');
  const [uniCategory, setUniCategory] = useState(UNIVERSITY_CATEGORIES[0]);
  const [uniAishe, setUniAishe] = useState('');
  const [uniNaac, setUniNaac] = useState('A++');
  const [uniWebsite, setUniWebsite] = useState('');
  const [uniOfficialEmail, setUniOfficialEmail] = useState('');
  const [uniContactPhone, setUniContactPhone] = useState('');
  const [uniAddress, setUniAddress] = useState('');
  const [uniCity, setUniCity] = useState('');
  const [uniDistrict, setUniDistrict] = useState('');
  const [uniState, setUniState] = useState('');
  const [uniDomains, setUniDomains] = useState('Water Purification, Renewable Energy, Public Health AI');
  const [uniDepartments, setUniDepartments] = useState('Civil Engineering, Computer Science, Environmental Tech');
  const [uniFacilities, setUniFacilities] = useState('Central Instrumentation Facility, IoT Sensors Lab, GIS Remote Sensing');
  const [uniAccreditationDetails, setUniAccreditationDetails] = useState('NAAC Cycle 4 CGPA 3.72, UGC 12(B) Accredited');
  const [uniDocName, setUniDocName] = useState('UGC_Accreditation_Certificate.pdf');

  // Industry Organization State
  const [indName, setIndName] = useState('');
  const [indSubtype, setIndSubtype] = useState('INDUSTRY');
  const [indSector, setIndSector] = useState('CleanTech & Water Infrastructure');
  const [indRegNo, setIndRegNo] = useState('');
  const [indWebsite, setIndWebsite] = useState('');
  const [indOfficialEmail, setIndOfficialEmail] = useState('');
  const [indContactPhone, setIndContactPhone] = useState('');
  const [indAddress, setIndAddress] = useState('');
  const [indCity, setIndCity] = useState('');
  const [indDistrict, setIndDistrict] = useState('');
  const [indState, setIndState] = useState('');
  const [indSelectedCaps, setIndSelectedCaps] = useState<string[]>(['Funding', 'Technology', 'Pilot']);
  const [indDocName, setIndDocName] = useState('Company_Incorporation_Certificate.pdf');

  // Feedback State
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submittedOrg, setSubmittedOrg] = useState<{
    orgName: string;
    orgType: string;
    role: UserRole;
    adminName: string;
    adminEmail: string;
    destination: string;
  } | null>(null);

  // Live password validation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const toggleCapability = (cap: string) => {
    setIndSelectedCaps((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter identical passwords.');
      return;
    }

    if (!hasMinLength || !hasUppercase || !hasNumber) {
      setError('Password must satisfy all 3 security requirements (8+ characters, 1 uppercase, 1 number).');
      return;
    }

    let orgPayload: any = undefined;

    if (selectedRole === UserRole.UNIVERSITY_ADMIN) {
      if (!uniName.trim()) {
        setFieldErrors((prev) => ({ ...prev, uniName: 'University Name is mandatory.' }));
        return;
      }
      if (!uniDistrict.trim() || !uniState.trim()) {
        setError('District and State are required for municipal and regional matching.');
        return;
      }

      orgPayload = {
        name: uniName.trim(),
        type: 'UNIVERSITY',
        category: uniCategory,
        sector: 'Academic & Civic Research',
        address: uniAddress.trim(),
        city: uniCity.trim(),
        district: uniDistrict.trim(),
        state: uniState.trim(),
        website: uniWebsite.trim() || undefined,
        officialEmail: uniOfficialEmail.trim() || email.trim(),
        contactPhone: uniContactPhone.trim() || phone.trim() || undefined,
        accreditationDetails: `AISHE: ${uniAishe} | NAAC: ${uniNaac} | ${uniAccreditationDetails}`,
        departments: uniDepartments.split(',').map((s) => s.trim()).filter(Boolean),
        researchDomains: uniDomains.split(',').map((s) => s.trim()).filter(Boolean),
        facilities: uniFacilities.split(',').map((s) => s.trim()).filter(Boolean),
        supportingDocuments: [
          {
            name: uniDocName.trim() || 'Institutional_Accreditation.pdf',
            type: 'application/pdf',
            uploadedAt: new Date().toISOString(),
          },
        ],
      };
    } else if (selectedRole === UserRole.INDUSTRY_PARTNER) {
      if (!indName.trim()) {
        setFieldErrors((prev) => ({ ...prev, indName: 'Organization Name is mandatory.' }));
        return;
      }
      if (!indDistrict.trim() || !indState.trim()) {
        setError('District and State are required for industry matching.');
        return;
      }

      orgPayload = {
        name: indName.trim(),
        type: indSubtype,
        sector: indSector.trim(),
        registrationNumber: indRegNo.trim() || undefined,
        address: indAddress.trim(),
        city: indCity.trim(),
        district: indDistrict.trim(),
        state: indState.trim(),
        website: indWebsite.trim() || undefined,
        officialEmail: indOfficialEmail.trim() || email.trim(),
        contactPhone: indContactPhone.trim() || phone.trim() || undefined,
        capabilities: indSelectedCaps,
        supportingDocuments: [
          {
            name: indDocName.trim() || 'Incorporation_Document.pdf',
            type: 'application/pdf',
            uploadedAt: new Date().toISOString(),
          },
        ],
      };
    }

    const res = await register({
      email: email.trim(),
      pass: password,
      fullName: fullName.trim(),
      role: selectedRole,
      phone: phone.trim() || undefined,
      organization: orgPayload,
    });

    if (res.success && res.user) {
      if (selectedRole === UserRole.UNIVERSITY_ADMIN) {
        setSubmittedOrg({
          orgName: uniName.trim(),
          orgType: 'University',
          role: selectedRole,
          adminName: fullName.trim(),
          adminEmail: email.trim(),
          destination: '/university',
        });
      } else if (selectedRole === UserRole.INDUSTRY_PARTNER) {
        setSubmittedOrg({
          orgName: indName.trim(),
          orgType: 'Industry',
          role: selectedRole,
          adminName: fullName.trim(),
          adminEmail: email.trim(),
          destination: '/industry',
        });
      } else if (selectedRole === UserRole.GOVERNMENT_OFFICER) {
        router.push('/government');
      } else {
        router.push('/dashboard');
      }
    } else {
      setError(res.error || 'Registration failed. Please check form entries.');
      if (res.fieldErrors) {
        setFieldErrors(res.fieldErrors);
      }
    }
  };

  // Render Status Screen after University/Industry submission
  if (submittedOrg) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-xl w-full border-slate-200 shadow-md">
          <CardHeader className="text-center pb-2">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Clock className="w-7 h-7" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 mx-auto mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Registration Submitted — Pending Verification
            </div>
            <CardTitle className="text-xl font-black text-slate-900">
              {submittedOrg.orgName}
            </CardTitle>
            <CardDescription className="text-xs text-slate-600 mt-1">
              Your {submittedOrg.orgType} registration and Administrator account have been created successfully.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Organization:</span>
                <span className="font-bold text-slate-800">{submittedOrg.orgName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Administrator:</span>
                <span className="font-bold text-slate-800">{submittedOrg.adminName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Contact Email:</span>
                <span className="font-mono text-slate-800">{submittedOrg.adminEmail}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Review Queue:</span>
                <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Government Verification Queue
                </span>
              </div>
            </div>

            {/* Lifecycle Steps */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 space-y-2">
              <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                What happens next?
              </h4>
              <div className="space-y-1.5 text-[11px] text-slate-600">
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </div>
                  <p>
                    <strong>Government Review:</strong> Municipal officers review your accreditation, registration numbers, and submitted verification documents.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </div>
                  <p>
                    <strong>Evaluation:</strong> If details are complete, the officer verifies your institution. If clarification is required, an information request will be issued with zero dead ends.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </div>
                  <p>
                    <strong>Portal Activation:</strong> Upon official verification, your institutional portal features (proposals, research teams, pilot funding) become fully active.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <Button
              onClick={() => router.push(submittedOrg.destination)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>View Registration Status in Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="w-full sm:w-auto text-xs"
            >
              Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const currentRoleOpt = ROLES.find((r) => r.role === selectedRole) || ROLES[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">SICP</h1>
            <p className="text-[11px] text-slate-500 font-medium">Societal Innovation Collaboration Portal</p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-1 pb-4 border-b border-slate-100">
            <CardTitle className="text-lg font-bold text-slate-900">Create SICP Account</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Join India's civic innovation ecosystem. Choose your stakeholder role below.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5 pt-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{error}</div>
                </div>
              )}

              {/* Stakeholder Role Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="uppercase tracking-wider text-[11px] text-slate-400">
                    Step 1: Select Stakeholder Role
                  </span>
                  <span className="text-[10px] text-slate-400">Determines portal and organization setup</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    const isSelected = selectedRole === r.role;
                    return (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => {
                          setSelectedRole(r.role);
                          setError(null);
                        }}
                        className={cn(
                          'p-3 rounded-xl border text-left transition-all flex items-start justify-between select-none',
                          isSelected
                            ? cn(r.border, r.bg, 'shadow-xs ring-1 ring-blue-400')
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={cn('p-2 rounded-lg shrink-0 mt-0.5', isSelected ? 'bg-white shadow-2xs' : 'bg-slate-100 text-slate-500')}>
                            <Icon className={cn('w-4 h-4', isSelected ? r.color : 'text-slate-500')} />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900">{r.label}</div>
                            <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{r.tagline}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Account Information */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider text-[11px] text-slate-400">
                  Step 2: Administrator / Personal Account Credentials
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        disabled={isLoading}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Dr. Ramesh Sharma"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Official Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        disabled={isLoading}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@institution.edu.in"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={password}
                        disabled={isLoading}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 8 chars, 1 uppercase, 1 number"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        disabled={isLoading}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className={cn(
                          'w-full pl-9 pr-3 py-2 rounded-lg border text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2',
                          confirmPassword && !passwordsMatch ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20' : 'border-slate-300 focus:ring-blue-500'
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Password Strength Checklist */}
                <div className="grid grid-cols-4 gap-1 pt-1 text-[10px]">
                  <div className={cn('flex items-center gap-1 font-medium', hasMinLength ? 'text-emerald-600' : 'text-slate-400')}>
                    <Check className={cn('w-3 h-3', hasMinLength ? 'text-emerald-600' : 'text-slate-300')} />
                    <span>8+ Chars</span>
                  </div>
                  <div className={cn('flex items-center gap-1 font-medium', hasUppercase ? 'text-emerald-600' : 'text-slate-400')}>
                    <Check className={cn('w-3 h-3', hasUppercase ? 'text-emerald-600' : 'text-slate-300')} />
                    <span>1 Uppercase</span>
                  </div>
                  <div className={cn('flex items-center gap-1 font-medium', hasNumber ? 'text-emerald-600' : 'text-slate-400')}>
                    <Check className={cn('w-3 h-3', hasNumber ? 'text-emerald-600' : 'text-slate-300')} />
                    <span>1 Number</span>
                  </div>
                  <div className={cn('flex items-center gap-1 font-medium', passwordsMatch ? 'text-emerald-600' : 'text-slate-400')}>
                    <Check className={cn('w-3 h-3', passwordsMatch ? 'text-emerald-600' : 'text-slate-300')} />
                    <span>Match</span>
                  </div>
                </div>
              </div>

              {/* Step 3: University Organization Section */}
              {selectedRole === UserRole.UNIVERSITY_ADMIN && (
                <div className="space-y-4 pt-3 border-t border-slate-100 bg-indigo-50/40 p-4 rounded-xl border border-indigo-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      Step 3: University Institutional Onboarding
                    </span>
                    <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200">
                      Requires Government Verification
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">University / Institute Name *</label>
                      <input
                        type="text"
                        required
                        value={uniName}
                        onChange={(e) => setUniName(e.target.value)}
                        placeholder="e.g. Indian Institute of Technology Varanasi (IIT BHU)"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Institution Category</label>
                      <select
                        value={uniCategory}
                        onChange={(e) => setUniCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      >
                        {UNIVERSITY_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">AISHE Code *</label>
                        <input
                          type="text"
                          required
                          value={uniAishe}
                          onChange={(e) => setUniAishe(e.target.value)}
                          placeholder="U-0500"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">NAAC Grade</label>
                        <select
                          value={uniNaac}
                          onChange={(e) => setUniNaac(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="A++">A++ (CGPA ≥ 3.51)</option>
                          <option value="A+">A+ (CGPA 3.26 - 3.50)</option>
                          <option value="A">A (CGPA 3.01 - 3.25)</option>
                          <option value="B++">B++</option>
                          <option value="B+">B+</option>
                          <option value="Eligible">In Process</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">District *</label>
                      <input
                        type="text"
                        required
                        value={uniDistrict}
                        onChange={(e) => setUniDistrict(e.target.value)}
                        placeholder="Varanasi"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">State *</label>
                      <input
                        type="text"
                        required
                        value={uniState}
                        onChange={(e) => setUniState(e.target.value)}
                        placeholder="Uttar Pradesh"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Official Website</label>
                      <input
                        type="text"
                        value={uniWebsite}
                        onChange={(e) => setUniWebsite(e.target.value)}
                        placeholder="https://iitbhu.ac.in"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Research Domains & Areas of Expertise</label>
                    <input
                      type="text"
                      value={uniDomains}
                      onChange={(e) => setUniDomains(e.target.value)}
                      placeholder="Comma-separated: Water Filtration, Smart Grid, Public Health"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Supporting Accreditation Document</label>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <input
                        type="text"
                        value={uniDocName}
                        onChange={(e) => setUniDocName(e.target.value)}
                        placeholder="e.g. NAAC_Accreditation_Certificate_2026.pdf"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Government reviewers will verify this document against official UGC/AISHE databases before approving.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Industry Organization Section */}
              {selectedRole === UserRole.INDUSTRY_PARTNER && (
                <div className="space-y-4 pt-3 border-t border-slate-100 bg-amber-50/40 p-4 rounded-xl border border-amber-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-amber-600" />
                      Step 3: Industry / Enterprise Onboarding
                    </span>
                    <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                      Requires Government Verification
                    </span>
                  </div>

                  {/* Subtype Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Organization Subtype *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {INDUSTRY_SUBTYPES.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setIndSubtype(sub.id)}
                          className={cn(
                            'p-2 rounded-lg border text-left text-xs transition-all',
                            indSubtype === sub.id
                              ? 'bg-amber-100 border-amber-500 font-bold text-amber-900 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          )}
                        >
                          <div>{sub.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Organization Name *</label>
                      <input
                        type="text"
                        required
                        value={indName}
                        onChange={(e) => setIndName(e.target.value)}
                        placeholder="e.g. AquaPure Innovations Pvt Ltd"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Industry Sector</label>
                      <input
                        type="text"
                        value={indSector}
                        onChange={(e) => setIndSector(e.target.value)}
                        placeholder="e.g. Clean Energy / Water Technology"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">CIN / Registration No.</label>
                      <input
                        type="text"
                        value={indRegNo}
                        onChange={(e) => setIndRegNo(e.target.value)}
                        placeholder="U72200MH2020PTC..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">District *</label>
                      <input
                        type="text"
                        required
                        value={indDistrict}
                        onChange={(e) => setIndDistrict(e.target.value)}
                        placeholder="Pune"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">State *</label>
                      <input
                        type="text"
                        required
                        value={indState}
                        onChange={(e) => setIndState(e.target.value)}
                        placeholder="Maharashtra"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Capabilities Picker */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Partnership Capabilities Offered:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {INDUSTRY_CAPABILITIES.map((cap) => {
                        const active = indSelectedCaps.includes(cap);
                        return (
                          <button
                            key={cap}
                            type="button"
                            onClick={() => toggleCapability(cap)}
                            className={cn(
                              'px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                              active
                                ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            )}
                          >
                            {active ? '✓ ' : '+ '}{cap}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Supporting Incorporation Document</label>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                      <input
                        type="text"
                        value={indDocName}
                        onChange={(e) => setIndDocName(e.target.value)}
                        placeholder="e.g. Company_Incorporation_Certificate.pdf"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full font-bold text-xs py-2.5 bg-blue-600 hover:bg-blue-700 shadow-xs flex items-center justify-center gap-1.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Registration...</span>
                  </>
                ) : (
                  <>
                    <span>Register as {currentRoleOpt.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>

              <div className="text-center text-xs text-slate-500">
                <span>Already have an account? </span>
                <Link href="/login" className="text-blue-600 font-bold hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
