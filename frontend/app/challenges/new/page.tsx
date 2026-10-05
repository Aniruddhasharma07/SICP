'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '../../../src/components/layout/AppLayout';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { Textarea } from '../../../src/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Alert, AlertDescription, AlertTitle } from '../../../src/components/ui/Alert';
import { useAuth } from '../../../src/lib/auth-context';
import { apiClient } from '../../../src/lib/api-client';
import {
  MapPin,
  Mic,
  MicOff,
  Camera,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Trash2,
  Info,
  Sparkles,
  UploadCloud,
  ChevronRight,
  Search,
} from 'lucide-react';
import { LocationMapPicker } from '../../../src/components/common/LocationMapPicker';

interface EvidenceItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  base64Data?: string;
  previewUrl?: string;
}

const CITIZEN_CATEGORIES = [
  'Roads & Transport',
  'Water Supply',
  'Sanitation & Drainage',
  'Electricity & Lighting',
  'Healthcare & Public Health',
  'Education & Schools',
  'Agriculture & Irrigation',
  'Environment & Waste',
  'General Civic Issue',
];

export default function NewChallengePage() {
  const router = useRouter();
  const { user } = useAuth();

  // 3-Step Citizen Flow (1: Problem, 2: Location, 3: Evidence & Submit)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Problem
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [userHasOverriddenCategory, setUserHasOverriddenCategory] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Step 2: Location
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Precise Location Search Autocomplete
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    displayName: string;
    latitude: number;
    longitude: number;
    district: string | null;
    state: string | null;
    locality: string | null;
  }>>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Step 3: Evidence
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedChallenge, setSubmittedChallenge] = useState<{ id: string; title: string } | null>(null);

  // Real Gemini AI Analysis State
  const activeRequestIdRef = useRef<number>(0);
  const [aiStatus, setAiStatus] = useState<'IDLE' | 'ANALYZING' | 'RESOLVED' | 'UNAVAILABLE'>('IDLE');
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    category: string;
    confidenceScore: number | null;
    normalizedStatement?: string;
    reasoningSummary?: string;
    rootCauses?: string[];
  } | null>(null);
  const [showWhyClassification, setShowWhyClassification] = useState(false);

  // Authoritative Gemini AI Analysis with strict trigger rule (no 1st-letter guessing) and race condition defense
  useEffect(() => {
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    const titleWords = trimmedTitle.split(/\s+/).filter(Boolean);

    // AI categorization becomes eligible ONLY when:
    // (trimmedTitle.length >= 8 AND titleWords.length >= 2) OR trimmedDesc.length >= 15
    const isEligible =
      (trimmedTitle.length >= 8 && titleWords.length >= 2) ||
      trimmedDesc.length >= 15;

    if (!isEligible) {
      setAiStatus('IDLE');
      setAiAnalysisResult(null);
      setAiMessage(null);
      return;
    }

    setAiStatus('ANALYZING');
    const reqSeq = ++activeRequestIdRef.current;

    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.request<any>('/api/v1/challenges/analyze', {
          method: 'POST',
          body: JSON.stringify({
            title: trimmedTitle,
            description: trimmedDesc,
            category: category || 'General',
          }),
        });

        // Drop stale response if newer request was dispatched while this was in-flight
        if (reqSeq !== activeRequestIdRef.current) {
          return;
        }

        if (res.success && res.data) {
          const data = res.data;

          if (data.isPartial) {
            setAiStatus('IDLE');
            setAiMessage(data.message || null);
            return;
          }

          if (data.aiUnavailable) {
            setAiStatus('UNAVAILABLE');
            setAiMessage(data.message || 'AI categorization is currently unavailable.');
            return;
          }

          const canonical = data.category;
          const conf = typeof data.confidenceScore === 'number' && data.confidenceScore > 0 ? data.confidenceScore : null;

          if (canonical) {
            setAiAnalysisResult({
              category: canonical,
              confidenceScore: conf,
              normalizedStatement: data.normalizedStatement,
              reasoningSummary: data.reasoningSummary,
              rootCauses: data.rootCauseHypotheses || [],
            });
            setAiStatus('RESOLVED');
            setAiMessage(null);

            if (!userHasOverriddenCategory) {
              setCategory(canonical);
            }
          } else {
            setAiStatus('IDLE');
          }
        } else {
          setAiStatus('UNAVAILABLE');
          setAiMessage('AI categorization is temporarily unavailable. Please select your sector manually.');
        }
      } catch {
        if (reqSeq !== activeRequestIdRef.current) return;
        setAiStatus('UNAVAILABLE');
        setAiMessage('AI categorization is temporarily unavailable. Please select your sector manually.');
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [title, description, userHasOverriddenCategory]);

  // Debounced forward geocoding search for precise manual location
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const res = await apiClient.request<any[]>(`/api/v1/geospatial/search?q=${encodeURIComponent(trimmed)}`);
        if (res.success && Array.isArray(res.data)) {
          setSearchResults(res.data);
          setShowSearchDropdown(res.data.length > 0);
        }
      } catch {
        // Non-fatal
      } finally {
        setIsSearchingLocation(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLocationResult = (item: any) => {
    setLatitude(item.latitude);
    setLongitude(item.longitude);
    if (item.district) setDistrict(item.district);
    if (item.state) setState(item.state);
    setAddress(item.displayName);
    setSearchQuery(item.displayName);
    setShowSearchDropdown(false);
    setGpsError(null);
  };

  // Speech Recognition (Voice Dictation)
  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your description.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian English, supports Hindi code-mixing

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        setDescription((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  // Get Current Location via Geolocation API
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);

        try {
          const res = await apiClient.request<any>(
            `/api/v1/geospatial/reverse-geocode?latitude=${lat}&longitude=${lng}`
          );

          if (res.success && res.data) {
            const data = res.data;
            if (data.district) setDistrict(data.district.replace(/\s+District$/i, '').trim());
            if (data.state) setState(data.state.trim());

            const resolvedAddr = data.formattedAddress || [data.locality, data.district, data.state].filter(Boolean).join(', ');
            const finalAddr = resolvedAddr || `Coordinates: ${lat}, ${lng}`;
            setAddress(finalAddr);
            setSearchQuery(finalAddr);
          } else {
            const fallbackAddr = `GPS Coordinates: ${lat}, ${lng}`;
            setAddress(fallbackAddr);
            setSearchQuery(fallbackAddr);
          }
        } catch {
          const fallbackAddr = `GPS Coordinates: ${lat}, ${lng}`;
          setAddress(fallbackAddr);
          setSearchQuery(fallbackAddr);
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(`Could not access GPS (${err.message}). You can select on the map or enter address below.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = (event.target?.result as string)?.split(',')[1] || '';
        const previewUrl = event.target?.result as string;

        setEvidenceList((prev) => [
          ...prev,
          {
            id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            base64Data,
            previewUrl,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveEvidence = (id: string) => {
    setEvidenceList((prev) => prev.filter((item) => item.id !== id));
  };

  // Submission
  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!title.trim() || title.length < 5) {
      setErrorMessage('Please provide a title of at least 5 characters.');
      setCurrentStep(1);
      return;
    }
    if (!description.trim() || description.length < 15) {
      setErrorMessage('Please describe the issue in at least 15 characters so municipal engineers understand the situation.');
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);

    try {
      let finalLat = latitude;
      let finalLng = longitude;
      let finalDistrict = district.trim() || null;
      let finalState = state.trim() || null;

      // Ensure coordinates are never null if address/district is present
      if ((finalLat === null || finalLng === null) && (address.trim() || district.trim())) {
        const geoQuery = [address.trim(), district.trim(), state.trim(), 'India'].filter(Boolean).join(', ');
        try {
          const geoRes = await apiClient.request<any[]>(`/api/v1/geospatial/search?q=${encodeURIComponent(geoQuery)}`);
          if (geoRes.success && Array.isArray(geoRes.data) && geoRes.data.length > 0) {
            finalLat = geoRes.data[0].latitude;
            finalLng = geoRes.data[0].longitude;
            if (!finalDistrict && geoRes.data[0].district) finalDistrict = geoRes.data[0].district;
            if (!finalState && geoRes.data[0].state) finalState = geoRes.data[0].state;
            setLatitude(finalLat);
            setLongitude(finalLng);
          }
        } catch {
          // non-fatal
        }
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        latitude: finalLat || null,
        longitude: finalLng || null,
        address: address.trim() || null,
        district: finalDistrict,
        state: finalState,
        aiAnalysisResult: aiAnalysisResult || undefined,
        evidence: evidenceList.map((e) => ({
          originalName: e.name,
          mimeType: e.mimeType,
          sizeBytes: e.size,
          base64Data: e.base64Data,
        })),
      };

      const res = await apiClient.request<any>('/api/v1/challenges', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.success && res.data) {
        const created = res.data;
        setSubmittedChallenge({ id: created.id, title: created.title || title });
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('sicp_my_problem_ids');
            const ids: string[] = raw ? JSON.parse(raw) : [];
            if (created.problemId) ids.push(created.problemId);
            if (created.id) ids.push(created.id);
            localStorage.setItem('sicp_my_problem_ids', JSON.stringify(Array.from(new Set(ids))));
          } catch {
            // non-fatal
          }
        }
      } else {
        setErrorMessage(res.error?.message || 'Failed to submit challenge. Please check your network and try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit challenge. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (submittedChallenge) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto py-12 px-4">
          <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900 text-center p-8">
            <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Problem Successfully Registered!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your report has been received and queued into the SICP Civic Intelligence engine.
            </p>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 max-w-md mx-auto mb-8 text-left">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tracking Reference</div>
              <div className="font-mono text-base font-semibold text-blue-600 dark:text-blue-400 mb-3">
                REF-{submittedChallenge.id.slice(0, 8).toUpperCase()}
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{submittedChallenge.title}</div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4 text-left max-w-md mx-auto mb-8 text-sm text-gray-700 dark:text-gray-300">
              <div className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" /> What happens next?
              </div>
              <ul className="space-y-1.5 text-xs">
                <li>• <strong>AI Problem Analysis:</strong> Maps technical category and checks for neighboring incidents.</li>
                <li>• <strong>Municipal Officer Review:</strong> Field team verifies spatial impact and confirms routing.</li>
                <li>• <strong>Institutional Matching:</strong> Complex problems are routed to university research labs.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/challenges/${submittedChallenge.id}`}>
                <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                  View Problem Intelligence <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/my-problems">
                <Button variant="outline" className="w-full sm:w-auto bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                  Track in My Problems
                </Button>
              </Link>
              <Button
                variant="ghost"
                onClick={() => {
                  setSubmittedChallenge(null);
                  setTitle('');
                  setDescription('');
                  setEvidenceList([]);
                  setLatitude(null);
                  setLongitude(null);
                  setCurrentStep(1);
                }}
              >
                Submit Another Report
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-8 px-4">
        {/* Simple Header */}
        <div className="mb-6">
          <Link href="/challenges" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Problems
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Report a Civic Problem
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            Simple 3-step reporting. Our intelligence engine handles categorization and institutional routing.
          </p>
        </div>

        {/* 3-Step Progress Bar */}
        <div className="flex items-center justify-between mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
          <div
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2 cursor-pointer ${
              currentStep === 1 ? 'text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === 1
                  ? 'bg-blue-600 text-white'
                  : currentStep > 1
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              1
            </span>
            <span className="text-sm">1. Problem</span>
          </div>

          <ChevronRight className="w-4 h-4 text-gray-400" />

          <div
            onClick={() => {
              if (title.trim().length >= 5) setCurrentStep(2);
            }}
            className={`flex items-center gap-2 cursor-pointer ${
              currentStep === 2 ? 'text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === 2
                  ? 'bg-blue-600 text-white'
                  : currentStep > 2
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              2
            </span>
            <span className="text-sm">2. Location</span>
          </div>

          <ChevronRight className="w-4 h-4 text-gray-400" />

          <div
            onClick={() => {
              if (title.trim().length >= 5) setCurrentStep(3);
            }}
            className={`flex items-center gap-2 cursor-pointer ${
              currentStep === 3 ? 'text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              3
            </span>
            <span className="text-sm">3. Evidence & Submit</span>
          </div>
        </div>

        {errorMessage && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Please check required details</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* STEP 1: What is the problem? */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">What is the problem?</CardTitle>
              <CardDescription>
                Describe the civic issue in your own words. You can type or use the voice recording button.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Problem Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Deep pothole cluster on Main Road near Community Health Centre"
                  className="w-full text-base"
                />
                <span className="text-xs text-gray-400 mt-1 block">
                  Give a short summary of the issue (minimum 5 characters)
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Detailed Description <span className="text-red-500">*</span>
                  </label>
                  <Button
                    type="button"
                    variant={isRecording ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={toggleRecording}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-3.5 h-3.5 animate-pulse" /> Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-blue-600" /> Voice Dictation
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what is happening, how long it has been an issue, and how it impacts people in the area..."
                  rows={5}
                  className="w-full text-base"
                />
                <span className="text-xs text-gray-400 mt-1 block">
                  Natural language description (minimum 15 characters)
                </span>
              </div>

              {/* Real-time Gemini AI Categorization Status & Intelligence */}
              {aiStatus === 'IDLE' && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-xs text-slate-500 dark:text-slate-400">
                  <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {aiMessage || 'AI Intelligence: Awaiting problem details (minimum 2 words or 8 characters)...'}
                  </span>
                </div>
              )}

              {aiStatus === 'ANALYZING' && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg border border-blue-200/80 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-700 dark:text-blue-300">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="font-medium animate-pulse">Gemini 3.1 analyzing problem context &amp; societal impact...</span>
                </div>
              )}

              {aiStatus === 'UNAVAILABLE' && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300">
                  <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{aiMessage || 'AI categorization is currently unavailable. Please select your sector from the dropdown below.'}</span>
                </div>
              )}

              {aiStatus === 'RESOLVED' && aiAnalysisResult && (
                <div className="rounded-xl border border-blue-200/80 dark:border-blue-900/70 bg-gradient-to-br from-blue-50/60 via-slate-50/30 to-emerald-50/30 dark:from-blue-950/30 dark:via-slate-900/20 dark:to-emerald-950/20 p-4 text-xs text-slate-700 dark:text-slate-300 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white shadow-xs">
                        <Sparkles className="w-3 h-3" />
                        {aiAnalysisResult.category}
                      </span>
                      {aiAnalysisResult.confidenceScore !== null ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            aiAnalysisResult.confidenceScore >= 0.8
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : aiAnalysisResult.confidenceScore >= 0.65
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {aiAnalysisResult.confidenceScore >= 0.8
                            ? `High Confidence (${Math.round(aiAnalysisResult.confidenceScore * 100)}%)`
                            : aiAnalysisResult.confidenceScore >= 0.65
                            ? `Moderate Confidence (${Math.round(aiAnalysisResult.confidenceScore * 100)}%)`
                            : `Preliminary (${Math.round(aiAnalysisResult.confidenceScore * 100)}%)`}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          Confidence unavailable
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowWhyClassification(!showWhyClassification)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex items-center gap-1 text-[11.5px] font-medium"
                    >
                      <span>{showWhyClassification ? 'Hide explanation' : 'Why this classification?'}</span>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${showWhyClassification ? 'rotate-90' : ''}`} />
                    </button>
                  </div>

                  {showWhyClassification && (
                    <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/70 space-y-2 text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">
                      {aiAnalysisResult.normalizedStatement && (
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">Problem Definition: </span>
                          <span>{aiAnalysisResult.normalizedStatement}</span>
                        </div>
                      )}
                      {aiAnalysisResult.reasoningSummary && (
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">Domain Reasoning: </span>
                          <span>{aiAnalysisResult.reasoningSummary}</span>
                        </div>
                      )}
                      {aiAnalysisResult.rootCauses && aiAnalysisResult.rootCauses.length > 0 && (
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">Preliminary Hypotheses (Not Yet Verified): </span>
                          <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11.5px]">
                            {aiAnalysisResult.rootCauses.map((rc, idx) => (
                              <li key={idx}>{rc}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                        Population Impact: <span className="italic">Unavailable (Requires field census)</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sector Category {category ? '' : '(Auto-assigned by AI or select manually)'}
                  </label>
                  {userHasOverriddenCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserHasOverriddenCategory(false);
                        if (aiAnalysisResult?.category) {
                          setCategory(aiAnalysisResult.category);
                        }
                      }}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Reset to AI recommendation
                    </button>
                  )}
                </div>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setUserHasOverriddenCategory(true);
                  }}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="" disabled>
                    Select sector or describe problem above for AI auto-detection...
                  </option>
                  {CITIZEN_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat} {aiAnalysisResult && cat === aiAnalysisResult.category ? ' · Recommended by AI' : ''}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-400 mt-1 block">
                  {category
                    ? userHasOverriddenCategory
                      ? 'Manually selected sector.'
                      : 'Auto-assigned by Gemini intelligence based on your problem statement.'
                    : 'Category will be automatically assigned once you enter your problem details above.'}
                </span>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
              <div />
              <Button
                onClick={() => {
                  if (!title.trim() || title.length < 5) {
                    setErrorMessage('Please provide a title of at least 5 characters.');
                    return;
                  }
                  if (!description.trim() || description.length < 15) {
                    setErrorMessage('Please describe the issue in at least 15 characters.');
                    return;
                  }
                  if (!category) {
                    setCategory(aiAnalysisResult?.category || 'General Civic Issue');
                  }
                  setErrorMessage(null);
                  setCurrentStep(2);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Next: Where is it? <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 2: Where is it? */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Where is the problem located?</CardTitle>
              <CardDescription>
                Provide the precise location so local authorities and field teams can find it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Location Autocomplete Search */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-blue-600" />
                    Search Location (Town, City, Locality, Landmark)
                  </span>
                  <span className="text-xs font-normal text-gray-400">
                    Auto-fills coordinates & administrative boundary
                  </span>
                </label>
                <div className="relative">
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchDropdown(true);
                    }}
                    onFocus={() => {
                      if (searchResults.length > 0) setShowSearchDropdown(true);
                    }}
                    placeholder="e.g., Kosi, Mathura, Uttar Pradesh or Kolar Road, Bhopal"
                    className="w-full pl-9 pr-10 text-sm"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {isSearchingLocation && (
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {showSearchDropdown && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
                    {searchResults.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectLocationResult(item)}
                        className="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer border-b border-gray-100 dark:border-gray-700/60 last:border-b-0 transition-colors"
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          <span className="truncate">{item.displayName}</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex gap-2">
                          {item.district && <span>District: {item.district}</span>}
                          {item.state && <span>• State: {item.state}</span>}
                          <span className="font-mono text-blue-600 dark:text-blue-400">
                            ({item.latitude.toFixed(4)}, {item.longitude.toFixed(4)})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={gpsLoading}
                  className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100"
                >
                  {gpsLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Auto-Detecting GPS Location...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2 text-blue-600" /> Use Current GPS Location
                    </>
                  )}
                </Button>

                {latitude && longitude ? (
                  <Badge variant="secondary" className="self-center font-mono text-xs py-1.5 px-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 inline" />
                    GPS: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                  </Badge>
                ) : (
                  <span className="self-center text-xs text-gray-400 italic">
                    Coordinates auto-pin upon search or GPS lock.
                  </span>
                )}
              </div>

              {gpsError && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded border border-amber-200">
                  {gpsError}
                </p>
              )}

              {/* Leaflet Map Picker */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Map Pin (Click or Drag to set location)
                </label>
                <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
                  <LocationMapPicker
                    latitude={latitude}
                    longitude={longitude}
                    onLocationSelect={(lat, lng) => {
                      setLatitude(lat);
                      setLongitude(lng);
                      setGpsError(null);
                    }}
                  />
                </div>
              </div>

              {/* Address details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    District / City
                  </label>
                  <Input
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g., Mathura, Bhopal, Patna"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State
                  </label>
                  <Input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g., Uttar Pradesh, Madhya Pradesh"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Street Address / Landmark / Ward
                </label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g., Kosi, Ward 4, Near Bus Stand"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={async () => {
                  setErrorMessage(null);
                  if (latitude === null && (address.trim() || district.trim())) {
                    const geoQuery = [address.trim(), district.trim(), state.trim(), 'India'].filter(Boolean).join(', ');
                    try {
                      const geoRes = await apiClient.request<any[]>(`/api/v1/geospatial/search?q=${encodeURIComponent(geoQuery)}`);
                      if (geoRes.success && Array.isArray(geoRes.data) && geoRes.data.length > 0) {
                        setLatitude(geoRes.data[0].latitude);
                        setLongitude(geoRes.data[0].longitude);
                        if (!district && geoRes.data[0].district) setDistrict(geoRes.data[0].district);
                        if (!state && geoRes.data[0].state) setState(geoRes.data[0].state);
                      }
                    } catch {
                      // non-fatal
                    }
                  }
                  setCurrentStep(3);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Next: Add Evidence <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 3: Add Evidence & Submit */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Add Evidence & Review</CardTitle>
              <CardDescription>
                Upload photos, videos, or documents to strengthen the report. Evidence helps engineers verify the issue faster.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload Dropzone */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 rounded-lg p-6 text-center cursor-pointer bg-gray-50/50 dark:bg-gray-800/30 transition-colors"
                >
                  <UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Click to upload photos, videos, or documents
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Supports JPG, PNG, MP4, PDF (max 10MB per file)
                  </p>
                </div>
              </div>

              {/* Uploaded Evidence Previews */}
              {evidenceList.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Attached Evidence ({evidenceList.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {evidenceList.map((item) => (
                      <div
                        key={item.id}
                        className="relative group border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 bg-white dark:bg-gray-800 text-xs flex flex-col justify-between"
                      >
                        {item.previewUrl && item.mimeType.startsWith('image/') ? (
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            className="w-full h-20 object-cover rounded mb-2"
                          />
                        ) : (
                          <div className="w-full h-20 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center mb-2">
                            <FileText className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="truncate font-medium text-gray-800 dark:text-gray-200">{item.name}</div>
                        <div className="text-gray-400 text-[10px]">{(item.size / 1024).toFixed(0)} KB</div>
                        <button
                          type="button"
                          onClick={() => handleRemoveEvidence(item.id)}
                          className="absolute top-1 right-1 p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Summary Box */}
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-sm space-y-2">
                <div className="font-semibold text-gray-900 dark:text-gray-100">Review Summary</div>
                <div>
                  <span className="text-gray-500 text-xs uppercase block">Title:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{title}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase block">Location:</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {address || district ? `${address ? address + ', ' : ''}${district || ''} ${state || ''}` : 'No address specified (GPS only)'}
                    {latitude && longitude && ` [${latitude.toFixed(4)}, ${longitude.toFixed(4)}]`}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 text-xs uppercase block">Category:</span>
                  <Badge variant="outline">{category}</Badge>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting to SICP...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Submit Civic Problem
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
