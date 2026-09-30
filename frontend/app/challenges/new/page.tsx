'use client';

import React, { useState, useRef } from 'react';
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
  const [category, setCategory] = useState('Roads & Transport');
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

  // Step 3: Evidence
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedChallenge, setSubmittedChallenge] = useState<{ id: string; title: string } | null>(null);

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
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setGpsLoading(false);

        // Attempt reverse geocode lookup
        apiClient
          .request<any>(`/api/v1/geospatial/reverse-geocode?latitude=${lat}&longitude=${lng}`)
          .then((res) => {
            if (res.data) {
              if (res.data.district) setDistrict(res.data.district);
              if (res.data.state) setState(res.data.state);
              if (res.data.displayName) setAddress(res.data.displayName);
            }
          })
          .catch(() => {
            // Non-fatal: coordinates are preserved
          });
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
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        latitude: latitude || null,
        longitude: longitude || null,
        address: address.trim() || null,
        district: district.trim() || null,
        state: state.trim() || null,
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
              <Button
                variant="outline"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Sector Category (Optional)
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                >
                  {CITIZEN_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-400 mt-1 block">
                  Pick the closest area, or leave as default — our AI confirms domain classification automatically.
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
                Provide the location so local authorities and field teams can find it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={gpsLoading}
                  className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100"
                >
                  {gpsLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Locating via GPS...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2 text-blue-600" /> Use Current GPS Location
                    </>
                  )}
                </Button>

                {latitude && longitude && (
                  <Badge variant="secondary" className="self-center font-mono text-xs py-1.5 px-3">
                    GPS: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                  </Badge>
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
                    placeholder="e.g., Bhopal, Patna, Jaipur"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State
                  </label>
                  <Input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g., Madhya Pradesh, Bihar, Rajasthan"
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
                  placeholder="e.g., Ward 12, near Government High School, Kolar Road"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={() => {
                  setErrorMessage(null);
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
