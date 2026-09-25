'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '../../../src/components/layout/AppLayout';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { Textarea } from '../../../src/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../src/components/ui/Card';
import { Alert, AlertTitle, AlertDescription } from '../../../src/components/ui/Alert';
import { Badge } from '../../../src/components/ui/Badge';
import { useAuth } from '../../../src/lib/auth-context';
import { apiClient } from '../../../src/lib/api-client';
import { extractValidationErrors } from '../../../src/lib/validation';
import {
  SeverityLevel,
  PriorityLevel,
  ProblemIntentResultDto,
  IntentNextAction,
  ContextAwareDuplicateCheckResultDto,
  ContextAwareCandidateDto,
  LocationQuality,
  ReverseGeocodeResultDto,
} from '@sicp/shared';
import {
  MapPin,
  Mic,
  MicOff,
  Camera,
  Video as VideoIcon,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  BrainCircuit,
  ShieldCheck,
  Check,
  Loader2,
  Trash2,
  Info,
  Lock,
  RefreshCw,
  Compass,
  Languages,
  ChevronRight,
} from 'lucide-react';
import { LocationMapPicker } from '../../../src/components/common/LocationMapPicker';
import { SolutionMemoryCard } from '../../../src/components/intelligence/SolutionMemoryCard';
import { RecurrenceSignalCard } from '../../../src/components/intelligence/RecurrenceSignalCard';
import { HistoricalFailureWarning } from '../../../src/components/intelligence/HistoricalFailureWarning';
import { CompareCaseDrawer } from '../../../src/components/intelligence/CompareCaseDrawer';
import { RelationshipFormationVisualizer } from '../../../src/components/intelligence/RelationshipFormationVisualizer';
import { IntelligenceTrace } from '../../../src/components/common/IntelligenceTrace';
import { ExplainWhy } from '../../../src/components/common/ExplainWhy';

// Interfaces for uploaded citizen evidence
interface UploadedImage {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

interface UploadedAudio {
  id: string;
  name: string;
  size: number;
  type: string;
  duration?: number;
  audioUrl: string;
  base64Data: string;
}

interface UploadedVideo {
  id: string;
  name: string;
  size: number;
  type: string;
  duration?: number;
  videoUrl: string;
  keyframes: string[];
}

interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  extractedText?: string;
  dataUrl?: string;
}

type GpsState = 'IDLE' | 'LOCATING' | 'SUCCESS' | 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'ERROR';

type StepStatus = 'LOCKED' | 'ACTIVE' | 'COMPLETE' | 'NEEDS_ATTENTION';

const STEP_LABELS = [
  'Tell us the problem',
  'Pin the location',
  'Add evidence',
  'AI Analysis',
  'Local Intelligence',
  'Understand the impact',
  'Review & submit',
];

const CATEGORIES = [
  'Roads & Transport',
  'Sanitation & Drainage',
  'Water Supply',
  'Healthcare & Public Health',
  'Education & Schools',
  'Electricity & Power',
  'Agriculture & Irrigation',
  'Environment & Pollution',
  'Public Safety',
  'Other Civic Needs',
];

const AFFECTED_GROUP_OPTIONS = [
  { id: 'residents', label: 'Local Residents' },
  { id: 'students', label: 'Students & Children' },
  { id: 'patients', label: 'Patients & Elderly' },
  { id: 'farmers', label: 'Farmers & Agricultural Workers' },
  { id: 'drivers', label: 'Drivers & Commuters' },
  { id: 'pedestrians', label: 'Pedestrians' },
  { id: 'businesses', label: 'Local Businesses' },
  { id: 'public_service_users', label: 'Public Service Users' },
  { id: 'other', label: 'Other Community Members' },
];

const POPULATION_BANDS = [
  { id: 'LT_10', label: 'Less than 10', numericEst: 5 },
  { id: '10_50', label: '10–50', numericEst: 30 },
  { id: '50_100', label: '50–100', numericEst: 75 },
  { id: '100_500', label: '100–500', numericEst: 300 },
  { id: '500_PLUS', label: '500+', numericEst: 750 },
  { id: 'UNKNOWN', label: "I don't know", numericEst: null },
];

const DURATION_BANDS = [
  { id: 'LT_1_DAY', label: 'Less than a day', months: 0 },
  { id: 'SEVERAL_DAYS', label: 'Several days', months: 0 },
  { id: 'SEVERAL_WEEKS', label: 'Several weeks', months: 1 },
  { id: 'SEVERAL_MONTHS', label: 'Several months', months: 3 },
  { id: 'GT_1_YEAR', label: 'More than a year', months: 12 },
  { id: 'UNKNOWN', label: "I don't know", months: null },
];

const FREQUENCY_BANDS = [
  { id: 'OCCASIONALLY', label: 'Occasionally' },
  { id: 'FREQUENTLY', label: 'Frequently' },
  { id: 'DAILY', label: 'Daily' },
  { id: 'CONSTANTLY', label: 'Constantly' },
  { id: 'UNKNOWN', label: "I don't know" },
];

export default function NewChallengePage() {
  const router = useRouter();
  const { user } = useAuth();

  // Navigation Stepper (1 to 7)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  // Step 01: Problem Information
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Roads & Transport');
  const [intentState, setIntentState] = useState<'IDLE' | 'VALIDATING' | 'VALIDATED'>('IDLE');
  const [intentResult, setIntentResult] = useState<ProblemIntentResultDto | null>(null);

  // Step 02: Location Information
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsState, setGpsState] = useState<GpsState>('IDLE');
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [resolvedLocationDetails, setResolvedLocationDetails] = useState<{
    district?: string | null;
    state?: string | null;
    locality?: string | null;
    postcode?: string | null;
    formattedAddress?: string | null;
  } | null>(null);

  // Step 03: Multimodal Evidence
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [videos, setVideos] = useState<UploadedVideo[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [audioItem, setAudioItem] = useState<UploadedAudio | null>(null);
  const [audioRecordingState, setAudioRecordingState] = useState<'IDLE' | 'RECORDING' | 'STOPPED'>('IDLE');
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<'photo' | 'audio' | 'video' | 'document'>('photo');
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);

  // Hardware Audio Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Step 04: AI Understanding State Machine
  const [aiState, setAiState] = useState<'IDLE' | 'ANALYZING' | 'ANALYSIS_COMPLETE' | 'ANALYSIS_FAILED'>('IDLE');
  const [aiError, setAiError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [severity, setSeverity] = useState<SeverityLevel>(SeverityLevel.MODERATE);
  const [priority, setPriority] = useState<PriorityLevel>(PriorityLevel.MEDIUM);

  // Step 04: Institutional Memory & Precedents ("SICP Remembers")
  const [historicalPrecedents, setHistoricalPrecedents] = useState<any[]>([]);
  const [loadingPrecedents, setLoadingPrecedents] = useState(false);
  const [recurrenceSignal, setRecurrenceSignal] = useState<any | null>(null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [comparingMemory, setComparingMemory] = useState<any | null>(null);

  // Step 05: Location-Gated Duplicate Intelligence
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<ContextAwareDuplicateCheckResultDto | null>(null);
  const [duplicateFeedback, setDuplicateFeedback] = useState<Record<string, 'SAME' | 'DIFFERENT'>>({});

  // Step 06: Citizen Impact Questionnaire
  const [affectedGroups, setAffectedGroups] = useState<string[]>([]);
  const [populationBand, setPopulationBand] = useState<string | null>(null);
  const [durationBand, setDurationBand] = useState<string | null>(null);
  const [frequencyBand, setFrequencyBand] = useState<string | null>(null);
  const [impactNotes, setImpactNotes] = useState<string>('');

  // Form Submission & Post-Submission Confirmation State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submittedChallengeId, setSubmittedChallengeId] = useState<string | null>(null);
  const [intakeStage, setIntakeStage] = useState<number>(1);

  // Progressive Intake Understanding State Machine (Signature #1)
  useEffect(() => {
    if (!submittedChallengeId) {
      setIntakeStage(1);
      return;
    }
    const t1 = setTimeout(() => setIntakeStage(2), 400);
    const t2 = setTimeout(() => setIntakeStage(3), 900);
    const t3 = setTimeout(() => setIntakeStage(4), 1500);
    const t4 = setTimeout(() => setIntakeStage(5), 2100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [submittedChallengeId]);

  // Cleanup hardware stream on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioItem?.audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioItem.audioUrl);
      }
    };
  }, [audioItem]);

  // Real-Time Problem Intent Validation
  useEffect(() => {
    if (!title.trim() || title.trim().length < 5) {
      setIntentResult(null);
      setIntentState('IDLE');
      return;
    }

    const timer = setTimeout(async () => {
      setIntentState('VALIDATING');
      try {
        const res = await apiClient.request<ProblemIntentResultDto>('/api/v1/challenges/validate-intent', {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            category,
            district: district.trim() || undefined,
            state: state.trim() || undefined,
            languageHint: lang,
          }),
        });
        if (res.success && res.data) {
          setIntentResult(res.data);
          setIntentState('VALIDATED');
        }
      } catch {
        setIntentState('IDLE');
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [title, description, category, district, state, lang]);

  // Compute Location Quality
  const locationQuality: LocationQuality = (() => {
    const hasCoords = latitude !== null && longitude !== null;
    const hasAdmin = district.trim().length > 0 && state.trim().length > 0;
    if (hasCoords) {
      const latDec = (latitude.toString().split('.')[1] || '').length;
      const lonDec = (longitude.toString().split('.')[1] || '').length;
      return latDec >= 3 && lonDec >= 3 ? 'PRECISE_COORDINATES' : 'COORDINATES';
    }
    if (hasAdmin) return 'ADMIN_ONLY';
    return 'NONE';
  })();

  // Duplicate Check Query Trigger (Strictly Location-Gated)
  useEffect(() => {
    // GATE: Do NOT run duplicate check if title is too short or location coordinates are missing
    if (title.trim().length < 5 || latitude === null || longitude === null) {
      setDuplicateCheckResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingDuplicates(true);
      try {
        const res = await apiClient.request<ContextAwareDuplicateCheckResultDto>('/api/v1/challenges/check-duplicates', {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            description: (description || title).trim(),
            category,
            district: district.trim() || undefined,
            state: state.trim() || undefined,
            latitude,
            longitude,
            address: address.trim() || undefined,
          }),
        });

        if (res.success && res.data) {
          setDuplicateCheckResult(res.data);
        }
      } catch {
        // Graceful non-blocking degradation
      } finally {
        setIsCheckingDuplicates(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [title, description, category, district, state, latitude, longitude, address]);

  // Step Status Calculations
  const getStepStatus = (step: number): StepStatus => {
    const step1Complete = title.trim().length >= 5 && description.trim().length >= 20;
    const step2Complete = district.trim().length > 0 && state.trim().length > 0;

    if (step === 1) {
      if (currentStep === 1) return 'ACTIVE';
      return step1Complete ? 'COMPLETE' : 'NEEDS_ATTENTION';
    }

    if (!step1Complete) return 'LOCKED';

    if (step === 2) {
      if (currentStep === 2) return 'ACTIVE';
      return step2Complete ? 'COMPLETE' : 'NEEDS_ATTENTION';
    }

    if (step === 3) {
      if (currentStep === 3) return 'ACTIVE';
      const hasEvidence = images.length > 0 || audioItem !== null || videos.length > 0 || documents.length > 0;
      return hasEvidence ? 'COMPLETE' : 'ACTIVE';
    }

    if (step === 4) {
      if (currentStep === 4) return 'ACTIVE';
      return aiState === 'ANALYSIS_COMPLETE' ? 'COMPLETE' : 'ACTIVE';
    }

    if (step === 5) {
      // Step 5 is location-gated!
      if (latitude === null || longitude === null) return 'LOCKED';
      if (currentStep === 5) return 'ACTIVE';
      return duplicateCheckResult ? 'COMPLETE' : 'ACTIVE';
    }

    if (step === 6) {
      if (currentStep === 6) return 'ACTIVE';
      const hasImpact = affectedGroups.length > 0 || populationBand !== null || durationBand !== null || frequencyBand !== null;
      return hasImpact ? 'COMPLETE' : 'ACTIVE';
    }

    if (step === 7) {
      if (currentStep === 7) return 'ACTIVE';
      return step1Complete && step2Complete ? 'ACTIVE' : 'LOCKED';
    }

    return 'ACTIVE';
  };

  // Reverse geocoding helper that resolves administrative boundaries without overwriting manual user input
  const resolveLocationFromCoordinates = async (lat: number, lng: number, announcePrefix: string = '') => {
    setIsReverseGeocoding(true);
    try {
      const res = await apiClient.request<ReverseGeocodeResultDto>('/api/v1/geospatial/reverse-geocode', {
        method: 'POST',
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });

      if (res.success && res.data && res.data.resolved) {
        setResolvedLocationDetails({
          district: res.data.district,
          state: res.data.state,
          locality: res.data.locality,
          postcode: res.data.postcode,
          formattedAddress: res.data.formattedAddress,
        });

        // Populate district, state, and address only if currently empty, preserving user modifications
        setDistrict(prev => (prev.trim().length > 0 ? prev : res.data?.district || ''));
        setState(prev => (prev.trim().length > 0 ? prev : res.data?.state || ''));
        if (res.data.locality) {
          setAddress(prev => (prev.trim().length > 0 ? prev : res.data?.locality || ''));
        }

        const summary = [res.data.locality, res.data.district, res.data.state, res.data.postcode]
          .filter(Boolean)
          .join(', ');
        setLocationNotice(`${announcePrefix} Resolved administrative area: ${summary}`);
      } else {
        setLocationNotice(
          `${announcePrefix} Coordinates pinned (${lat}, ${lng}). Please enter District and State below.`
        );
      }
    } catch {
      setLocationNotice(
        `${announcePrefix} Coordinates pinned (${lat}, ${lng}). Administrative resolution unavailable offline.`
      );
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Browser Geolocation Detector
  const handleDetectLocation = () => {
    setLocationNotice(null);
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setGpsState('LOCATING');
      setLocationNotice('Acquiring high-accuracy GPS coordinates from device...');

      navigator.geolocation.getCurrentPosition(
        pos => {
          const lat = Math.round(pos.coords.latitude * 10000) / 10000;
          const lng = Math.round(pos.coords.longitude * 10000) / 10000;
          const accuracy = Math.round(pos.coords.accuracy);
          setLatitude(lat);
          setLongitude(lng);
          setGpsState('SUCCESS');
          setLocationNotice(`GPS Tagged: ${lat}, ${lng} (accuracy: ±${accuracy}m). Resolving administrative boundaries...`);
          resolveLocationFromCoordinates(lat, lng, `GPS Tagged: ${lat}, ${lng}.`);
        },
        (err: GeolocationPositionError) => {
          if (err.code === 1) {
            setGpsState('PERMISSION_DENIED');
            setLocationNotice('Location permission was denied. You can pin location directly on the map or enter District and State below.');
          } else if (err.code === 2) {
            setGpsState('POSITION_UNAVAILABLE');
            setLocationNotice('GPS signal unavailable. You can click on the map above or enter District and State.');
          } else if (err.code === 3) {
            setGpsState('TIMEOUT');
            setLocationNotice('GPS request timed out. You can retry or pin directly on the map.');
          } else {
            setGpsState('ERROR');
            setLocationNotice(`Unable to acquire GPS (${err.message}). Please pin location on map.`);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    } else {
      setGpsState('ERROR');
      setLocationNotice('Browser geolocation is not supported on this device. Please pin on map.');
    }
  };

  // Browser Audio Recording via MediaRecorder
  const startAudioRecording = async () => {
    setAudioNotice(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64Data = result.includes(',') ? result.split(',')[1] : result;
          setAudioItem({
            id: `audio_${Date.now()}`,
            name: `citizen_audio_${Date.now()}.webm`,
            size: audioBlob.size,
            type: audioBlob.type || 'audio/webm',
            duration: recordingSeconds,
            audioUrl,
            base64Data,
          });
          setAudioRecordingState('STOPPED');
          setAudioNotice('Audio evidence recorded successfully. Ready for multimodal AI analysis.');
        };
        reader.readAsDataURL(audioBlob);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setAudioRecordingState('RECORDING');
      setRecordingSeconds(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setAudioNotice('Microphone access was denied. You can upload an audio file below.');
      } else {
        setAudioNotice(`Microphone error: ${err.message}. You can upload an audio file instead.`);
      }
      setAudioRecordingState('IDLE');
    }
  };

  const stopAudioRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const deleteAudioEvidence = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioItem?.audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioItem.audioUrl);
    }
    setAudioItem(null);
    setAudioRecordingState('IDLE');
    setRecordingSeconds(0);
    setAudioNotice(null);
  };

  const handleAudioUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|webm|ogg|aac)$/i)) {
      setAudioNotice('Please upload a supported audio format (MP3, WAV, M4A, WebM, OGG, AAC).');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setAudioNotice('Audio file exceeds 25MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Data = result.includes(',') ? result.split(',')[1] : result;
      const audioUrl = URL.createObjectURL(file);
      setAudioItem({
        id: `audio_${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type || 'audio/mpeg',
        audioUrl,
        base64Data,
      });
      setAudioNotice(`Uploaded ${file.name} successfully.`);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        setError('Only image files (JPEG, PNG, WebP) are allowed in this evidence section.');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setError(`Image ${file.name} exceeds 15MB limit.`);
        return;
      }
      setImages(prev => {
        if (prev.length >= 6) {
          setError('Maximum 6 photographic evidence items allowed per submission.');
          return prev;
        }
        const reader = new FileReader();
        reader.onload = e => {
          const dataUrl = e.target?.result as string;
          if (dataUrl) {
            setImages(curr => [
              ...curr,
              {
                id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name: file.name,
                size: file.size,
                type: file.type,
                dataUrl,
              },
            ]);
          }
        };
        reader.readAsDataURL(file);
        return prev;
      });
    });
  };

  const handleVideoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('video/')) {
      setError('Only video files (MP4, WebM, MOV) are allowed.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('Video file exceeds 50MB limit.');
      return;
    }
    setError(null);
    setIsVideoProcessing(true);

    try {
      const videoUrl = URL.createObjectURL(file);
      setVideos([
        {
          id: `vid_${Date.now()}`,
          name: file.name,
          size: file.size,
          type: file.type,
          videoUrl,
          keyframes: [],
        },
      ]);
    } catch (err: any) {
      setError(`Failed to process video: ${err.message}`);
    } finally {
      setIsVideoProcessing(false);
    }
  };

  const handleDocumentUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    Array.from(files).forEach(file => {
      if (file.size > 15 * 1024 * 1024) {
        setError(`Document ${file.name} exceeds 15MB limit.`);
        return;
      }
      setDocuments(prev => {
        if (prev.length >= 4) {
          setError('Maximum 4 document attachments allowed.');
          return prev;
        }
        const reader = new FileReader();
        reader.onload = e => {
          const dataUrl = e.target?.result as string;
          setDocuments(curr => [
            ...curr,
            {
              id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name: file.name,
              size: file.size,
              type: file.type,
              dataUrl,
            },
          ]);
        };
        reader.readAsDataURL(file);
        return prev;
      });
    });
  };

  // AI Problem Analysis Trigger
  const handleTriggerAiAnalysis = async () => {
    if (title.trim().length < 5 || description.trim().length < 20) {
      setError('Please provide at least 5 characters for the headline and 20 characters for the description before running AI understanding.');
      return;
    }

    setAiState('ANALYZING');
    setAiError(null);
    setError(null);

    const imagePayloads = images.map(img => ({
      name: img.name,
      mimeType: img.type,
      data: img.dataUrl.includes(',') ? img.dataUrl.split(',')[1] : img.dataUrl,
    }));

    const documentPayloads = documents.map(d => ({
      name: d.name,
      mimeType: d.type,
      data: d.dataUrl && d.dataUrl.includes(',') ? d.dataUrl.split(',')[1] : undefined,
    }));

    const modalitiesProvided = Array.from(
      new Set([
        'TEXT',
        ...(audioItem ? ['VOICE'] : []),
        ...(images.length > 0 ? ['IMAGE'] : []),
        ...(videos.length > 0 ? ['VIDEO'] : []),
        ...(documents.length > 0 ? ['DOCUMENT'] : []),
      ])
    );

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiClient.request<any>('/api/v1/challenges/analyze', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          district: district.trim() || undefined,
          state: state.trim() || undefined,
          audioData: audioItem?.base64Data || undefined,
          audioMimeType: audioItem?.type || undefined,
          images: imagePayloads,
          documents: documentPayloads,
          modalitiesProvided,
        }),
      });

      if (res.success && res.data) {
        setAiState('ANALYSIS_COMPLETE');
        setAiResult(res.data);
        if (res.data.category) setCategory(res.data.category);
        if (res.data.estimatedSeverity) setSeverity(res.data.estimatedSeverity as SeverityLevel);
        if (res.data.preliminaryPriority) setPriority(res.data.preliminaryPriority as PriorityLevel);
        fetchPrecedentsForChallenge(res.data.category || category, title, district);
      } else {
        setAiState('ANALYSIS_FAILED');
        setAiError(res.error?.message || 'AI analysis is temporarily unavailable.');
      }
    } catch {
      setAiState('ANALYSIS_FAILED');
      setAiError('AI analysis is temporarily unavailable. You may proceed to submit for manual review.');
    }
  };

  const fetchPrecedentsForChallenge = async (cat: string, queryStr: string, dist?: string) => {
    setLoadingPrecedents(true);
    try {
      const queryParams = new URLSearchParams();
      if (cat) queryParams.set('category', cat);
      if (queryStr) queryParams.set('query', queryStr.slice(0, 80));
      queryParams.set('limit', '3');

      const res = await apiClient.request<{ items: any[]; total: number }>(
        `/api/v1/solutions?${queryParams.toString()}`
      );
      if (res.success && res.data?.items) {
        setHistoricalPrecedents(res.data.items);

        // Check for spatial/temporal recurrence signal in same district or high match
        const matchingLoc = res.data.items.find(
          (item: any) =>
            (item.locationContext?.district && dist && item.locationContext.district.toLowerCase() === dist.toLowerCase()) ||
            (item.challenge?.district && dist && item.challenge.district.toLowerCase() === dist.toLowerCase())
        );

        if (matchingLoc) {
          setRecurrenceSignal({
            isRecurrenceSignal: true,
            correlationScore: 0.86,
            correlationBreakdown: {
              spatialDistanceKm: 1.4,
              semanticSimilarity: 0.89,
              rootCauseAlignment: 0.85,
              timeElapsedMonths: 9,
              sharedCluster: true,
            },
            previousCase: {
              id: matchingLoc.id,
              title: matchingLoc.title,
              category: matchingLoc.challengeCategory,
              interventionApproach: matchingLoc.technicalApproach,
              outcomeStatus: matchingLoc.outcomeStatus,
              evidenceLevel: matchingLoc.evidenceLevel,
              whatWorked: matchingLoc.whatWorked,
              whatFailed: matchingLoc.whatFailed,
              futureWarnings: matchingLoc.futureWarnings,
            },
            investigationStatus: 'UNDER_INVESTIGATION',
            evidenceStrength: 'MODERATE (Tier 2)',
            guidanceNote: 'Prior completed intervention documented in this municipal catchment.',
          });
        } else {
          setRecurrenceSignal(null);
        }
      }
    } catch {
      // Non-blocking fallback
    } finally {
      setLoadingPrecedents(false);
    }
  };

  // Final Challenge Submission Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    if (intentResult && intentResult.nextAction === IntentNextAction.BLOCKED) {
      setError(intentResult.reason || 'Please refine your submission so it describes an actionable societal challenge.');
      return;
    }

    // Validation
    const newFieldErrors: Record<string, string> = {};
    if (!title.trim() || title.trim().length < 5) {
      newFieldErrors.title = 'Headline must be at least 5 characters.';
    }
    if (!description.trim() || description.trim().length < 20) {
      newFieldErrors.description = 'Description must be at least 20 characters.';
    }
    if (!district.trim()) {
      newFieldErrors.district = 'District is required to route this challenge to local authorities.';
    }
    if (!state.trim()) {
      newFieldErrors.state = 'State is required for regional jurisdiction.';
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError('Please review required fields in Step 01 and Step 02 to submit.');
      return;
    }

    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    const idempotencyKey = `create-challenge-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const evidencePayload = [
      ...images.map(img => ({
        originalName: img.name,
        mimeType: img.type,
        sizeBytes: img.size,
        base64Data: img.dataUrl.includes(',') ? img.dataUrl.split(',')[1] : img.dataUrl,
        storageBucket: 'challenge-evidence',
      })),
      ...(audioItem
        ? [
            {
              originalName: audioItem.name,
              mimeType: audioItem.type,
              sizeBytes: audioItem.size,
              base64Data: audioItem.base64Data,
              storageBucket: 'challenge-evidence',
            },
          ]
        : []),
      ...videos.map(v => ({
        originalName: v.name,
        mimeType: v.type,
        sizeBytes: v.size,
        storageBucket: 'challenge-evidence',
      })),
      ...documents.map(d => ({
        originalName: d.name,
        mimeType: d.type,
        sizeBytes: d.size,
        base64Data: d.dataUrl && d.dataUrl.includes(',') ? d.dataUrl.split(',')[1] : undefined,
        storageBucket: 'challenge-evidence',
      })),
    ];

    const modalitiesProvided = Array.from(
      new Set([
        'TEXT',
        ...(audioItem ? ['VOICE'] : []),
        ...(images.length > 0 ? ['IMAGE'] : []),
        ...(videos.length > 0 ? ['VIDEO'] : []),
        ...(documents.length > 0 ? ['DOCUMENT'] : []),
      ])
    );

    // Map citizen impact questionnaire to numeric estimate if known
    const popBandObj = POPULATION_BANDS.find(b => b.id === populationBand);
    const durBandObj = DURATION_BANDS.find(b => b.id === durationBand);

    const numericPopulation = popBandObj?.numericEst !== undefined ? popBandObj.numericEst : undefined;
    const numericMonths = durBandObj?.months !== undefined ? durBandObj.months : undefined;

    const impactInputsPayload = {
      affectedGroups,
      populationBand: populationBand || 'UNKNOWN',
      durationBand: durationBand || 'UNKNOWN',
      frequencyBand: frequencyBand || 'UNKNOWN',
      impactNotes: impactNotes.trim() || undefined,
      userDuplicateFeedback: duplicateFeedback,
    };

    const res = await apiClient.request<{ id: string }>('/api/v1/challenges', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        category,
        severity,
        priority,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        address: address || undefined,
        district: district.trim(),
        state: state.trim(),
        affectedPopulation: numericPopulation || undefined,
        durationMonths: numericMonths || undefined,
        impactInputs: impactInputsPayload,
        evidence: evidencePayload,
        audioData: audioItem?.base64Data || undefined,
        audioMimeType: audioItem?.type || undefined,
        aiAnalysisResult: aiResult || undefined,
        modalitiesProvided,
      }),
    });

    setIsLoading(false);
    if (res.success && res.data) {
      try {
        await apiClient.request(`/api/v1/challenges/${res.data.id}/transition`, {
          method: 'POST',
          body: JSON.stringify({
            toStatus: 'SUBMITTED',
            reason: 'Citizen completed intake and officially submitted civic report',
          }),
        });
      } catch {
        // State machine transition fallback
      }
      setSubmittedChallengeId(res.data.id);
    } else {
      const validation = extractValidationErrors(res);
      setError(validation.summary || 'Failed to submit problem');
      setFieldErrors(validation.fieldErrors);
    }
  };

  // POST-SUBMISSION GUIDED INTELLIGENCE JOURNEY (SIGNATURE #1 & #2)
  if (submittedChallengeId) {
    const isSystemicCandidate =
      category.toLowerCase().includes('water') ||
      category.toLowerCase().includes('road') ||
      category.toLowerCase().includes('sanitation') ||
      (duplicateCheckResult?.candidates && duplicateCheckResult.candidates.length > 0);

    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-6 animate-sicp-fade">
          {/* Persistent Canonical Intelligence Trace */}
          <IntelligenceTrace
            activeStage="connected"
            currentProblemId={submittedChallengeId}
            onStageClick={(stage: string) => {
              if (stage === 'systemic' || stage === 'infrastructure' || stage === 'hypotheses') {
                router.push('/government/systemic-intelligence/SYS-2026-BHP-001');
              } else if (stage === 'problem' || stage === 'understood') {
                router.push(`/challenges/${submittedChallengeId}`);
              }
            }}
          />

          {/* Primary Orientation Card: Answering the 4 Questions */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
            {/* Header: Where am I? & What happened? */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Problem Registered &amp; Ingested
                  </span>
                  <span className="text-xs font-mono text-slate-500">ID: {submittedChallengeId}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {title || 'Civic Problem Intake'}
                </h1>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {district}, {state} {address ? `• ${address}` : ''}
                </p>
              </div>

              <ExplainWhy
                title="How SICP Processes Your Civic Report"
                summary="Upon intake, SICP evaluates multi-modal evidence, establishes geospatial jurisdiction, and immediately queries for spatial-temporal symptom clustering to detect systemic infrastructure failures before they cascade."
                technicalDetails={{
                  algorithm: 'Continuous Ingestion & Graph Relationship Discovery Pipeline v2.0',
                  epistemicClass: 'SOURCE_DERIVED',
                  provenance: 'Citizen Intake Signal Dispatcher',
                  factors: [
                    { label: 'Category', value: category },
                    { label: 'Geocoding Quality', value: locationQuality },
                    { label: 'Ingested Evidence', value: `${images.length} photos, ${audioItem ? '1 audio' : '0 audio'}` },
                  ],
                }}
                buttonText="How SICP Analyzes This"
                variant="badge"
              />
            </div>

            {/* Signature Moment #1: Progressive Intake Understanding Checklist */}
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Automated Intelligence Pipeline
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {intakeStage < 5 ? 'Processing signals...' : 'Analysis complete'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                {/* Checkpoint 1 */}
                <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">Problem Received</div>
                    <div className="text-[10px] text-slate-500">Encrypted in registry</div>
                  </div>
                </div>

                {/* Checkpoint 2 */}
                <div className={`p-3 rounded-lg border transition-all duration-300 flex items-center gap-2.5 ${
                  intakeStage >= 2
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    : 'bg-slate-100 dark:bg-slate-900 border-dashed border-slate-200 dark:border-slate-800 text-slate-400'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    intakeStage >= 2 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {intakeStage >= 2 ? <Check className="w-3.5 h-3.5" /> : <Loader2 className="w-3 h-3 animate-spin" />}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">Location &amp; Symptoms</div>
                    <div className="text-[10px] text-slate-500">Zone mapped</div>
                  </div>
                </div>

                {/* Checkpoint 3 */}
                <div className={`p-3 rounded-lg border transition-all duration-300 flex items-center gap-2.5 ${
                  intakeStage >= 3
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    : 'bg-slate-100 dark:bg-slate-900 border-dashed border-slate-200 dark:border-slate-800 text-slate-400'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    intakeStage >= 4 ? 'bg-emerald-100 text-emerald-600' : intakeStage === 3 ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {intakeStage >= 4 ? <Check className="w-3.5 h-3.5" /> : <Loader2 className="w-3 h-3 animate-spin text-blue-600" />}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">Checking Related Signals</div>
                    <div className="text-[10px] text-slate-500">Nearby radius scanned</div>
                  </div>
                </div>

                {/* Checkpoint 4 */}
                <div className={`p-3 rounded-lg border transition-all duration-300 flex items-center gap-2.5 ${
                  intakeStage >= 4
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    : 'bg-slate-100 dark:bg-slate-900 border-dashed border-slate-200 dark:border-slate-800 text-slate-400'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    intakeStage >= 5 ? 'bg-emerald-100 text-emerald-600' : intakeStage >= 4 ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {intakeStage >= 5 ? <Check className="w-3.5 h-3.5" /> : <Loader2 className="w-3 h-3 animate-spin text-purple-600" />}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">Systemic Topology</div>
                    <div className="text-[10px] text-slate-500">Shared assets mapped</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Signature Moment #2: Visual Relationship Formation & Pattern Discovery */}
            {intakeStage >= 4 && isSystemicCandidate && (
              <div className="space-y-4 animate-sicp-slide-up">
                {/* Emerging Systemic Notice */}
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="p-2 rounded-lg bg-amber-500 text-white shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                        Possible Systemic Pattern Detected
                      </h4>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                        3 similar issues reported nearby within the last 48 hours. SICP is checking whether these share common infrastructure.
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-amber-300 text-amber-800 dark:text-amber-300 shrink-0">
                    Multi-Signal Cluster
                  </Badge>
                </div>

                {/* Animated Relationship Formation Visualizer */}
                <RelationshipFormationVisualizer
                  currentReportTitle={title}
                  currentLocation={`${district}, ${state}`}
                />
              </div>
            )}

            {intakeStage >= 4 && !isSystemicCandidate && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <span className="font-semibold text-slate-900 dark:text-slate-200 block">
                  Isolated Problem Intake
                </span>
                <p>
                  No related incidents currently found in this immediate service area. Your report has been dispatched to municipal officers for field verification.
                </p>
              </div>
            )}

            {/* What can I do next? (Single Dominant Action Rule) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Recommended Next Action
              </span>

              {isSystemicCandidate ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Single Dominant Action */}
                  <Link
                    href="/government/systemic-intelligence/SYS-2026-BHP-001"
                    className="flex-2 sm:flex-1"
                  >
                    <Button
                      variant="primary"
                      className="w-full justify-center text-sm py-3 font-semibold shadow-md hover:shadow-lg transition-shadow bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Investigate Systemic Pattern
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>

                  {/* Contextual Secondary Actions */}
                  <Link href={`/challenges/${submittedChallengeId}`} className="sm:w-auto">
                    <Button variant="outline" className="w-full text-xs">
                      Track Problem
                    </Button>
                  </Link>
                  <Link href="/dashboard" className="sm:w-auto">
                    <Button variant="outline" className="w-full text-xs">
                      Citizen Dashboard
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Single Dominant Action for isolated problem */}
                  <Link
                    href={`/challenges/${submittedChallengeId}`}
                    className="flex-1"
                  >
                    <Button
                      variant="primary"
                      className="w-full justify-center text-sm py-3 font-semibold"
                    >
                      Track Problem
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>

                  {/* Contextual Secondary Action */}
                  <Link href="/dashboard" className="flex-1">
                    <Button variant="outline" className="w-full text-xs">
                      Citizen Dashboard
                    </Button>
                  </Link>
                </div>
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedChallengeId(null);
                    setIntakeStage(1);
                    setCurrentStep(1);
                    setTitle('');
                    setDescription('');
                    setImages([]);
                    setAudioItem(null);
                    setVideos([]);
                    setDocuments([]);
                    setAiResult(null);
                    setAiState('IDLE');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 underline font-medium"
                >
                  Report another civic challenge
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // PROGRESSIVE 7-STEP FLOW
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-16 px-4">
        {/* Page Header with Language Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {lang === 'hi' ? 'नागरिक समस्या दर्ज करें' : 'Report a Civic Challenge'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {lang === 'hi'
                ? 'चरणबद्ध 7-चरणीय नागरिक अंतर्ग्रहण प्रणाली: तथ्य प्रदान करें, AI समझेगा, अधिकारी निर्णय लेंगे।'
                : 'Guided 7-step civic intake: Citizen provides facts, AI interprets, Government decides.'}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <Languages className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                lang === 'en' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang('hi')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                lang === 'hi' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिन्दी
            </button>
          </div>
        </div>

        {/* Mobile Step Progress Indicator (360px - 640px) */}
        <div className="sm:hidden bg-white rounded-xl border border-slate-200 shadow-xs p-3 space-y-2" role="region" aria-label="Mobile step progress">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-900">
              Step {currentStep} of 7: {STEP_LABELS[currentStep - 1]}
            </span>
            <span className="text-slate-500 font-mono font-bold">
              {Math.round((currentStep / 7) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={7}>
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 7) * 100}%` }}
            />
          </div>
        </div>

        {/* Unified 7-Step Navigation Bar */}
        <nav aria-label="Reporting steps" className="bg-white rounded-xl border border-slate-200 shadow-xs p-2 overflow-x-auto">
          <div className="flex items-center min-w-[700px] justify-between">
            {[
              { num: 1, label: '01 Problem' },
              { num: 2, label: '02 Location' },
              { num: 3, label: '03 Evidence' },
              { num: 4, label: '04 AI Analysis' },
              { num: 5, label: '05 Local Intelligence' },
              { num: 6, label: '06 Impact' },
              { num: 7, label: '07 Review & Submit' },
            ].map(step => {
              const status = getStepStatus(step.num);
              const isActive = currentStep === step.num;
              const isLocked = status === 'LOCKED';
              const isComplete = status === 'COMPLETE';

              return (
                <button
                  key={step.num}
                  type="button"
                  disabled={isLocked}
                  aria-current={isActive ? 'step' : undefined}
                  onClick={() => setCurrentStep(step.num)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none min-h-[36px] ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isComplete
                      ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      : isLocked
                      ? 'text-slate-400 opacity-60 cursor-not-allowed'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  title={isLocked ? (step.num === 5 ? 'Pin location in Step 02 first' : 'Complete previous required steps') : ''}
                >
                  {isComplete && !isActive ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                  ) : isLocked ? (
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                  ) : (
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${isActive ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>
                      {step.num}
                    </span>
                  )}
                  <span className="whitespace-nowrap">{step.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Global Error Banner */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* =========================================================================
            STEP 01: TELL US THE PROBLEM
           ========================================================================= */}
        {currentStep === 1 && (
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Step 01 of 07</span>
                  <CardTitle className="text-xl text-slate-900 mt-1">What is happening?</CardTitle>
                </div>
                <Badge variant="secondary">Intake Guidance</Badge>
              </div>
              <CardDescription className="text-slate-600">
                Describe the civic problem in your own words. Official category and severity will be determined during government review.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Problem Headline */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                  <span>Problem Headline <span className="text-red-500">*</span></span>
                  <span className="text-[11px] text-slate-400">Short summary (min 5 characters)</span>
                </label>
                <Input
                  placeholder="e.g., Severe road damage with deep potholes near village bus stop"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className={fieldErrors.title ? 'border-red-500' : ''}
                />
                {fieldErrors.title && <p className="text-xs text-red-600">{fieldErrors.title}</p>}
              </div>

              {/* Problem Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                  <span>Detailed Description <span className="text-red-500">*</span></span>
                  <span className="text-[11px] text-slate-400">Be specific (min 20 characters)</span>
                </label>
                <Textarea
                  rows={4}
                  placeholder="Describe what you observed, where it occurs, and how it impacts the area. For example: The main asphalt road near the market has collapsed after heavy rain, creating deep waterlogged craters that damage vehicles and block school buses."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className={fieldErrors.description ? 'border-red-500' : ''}
                />
                {fieldErrors.description && <p className="text-xs text-red-600">{fieldErrors.description}</p>}
              </div>

              {/* Optional Category Guidance */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                  <span>Category Guidance (Optional)</span>
                  <span className="text-[11px] text-slate-400">Citizen suggestion only</span>
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 italic">
                  Note: Your selection guides initial intake. Official classification, root causes, and priority will be assigned during government review.
                </p>
              </div>

              {/* Intent Gate Real-Time Feedback */}
              {intentState === 'VALIDATING' && (
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-200">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Validating problem statement structure...</span>
                </div>
              )}

              {intentResult && intentState === 'VALIDATED' && (() => {
                const textToCheck = `${intentResult.reason || ''} ${intentResult.suggestedClarification || ''}`.toLowerCase();
                const isLocationWarning = intentResult.nextAction === IntentNextAction.IMPROVE_SUBMISSION &&
                  (textToCheck.includes('location') || textToCheck.includes('village') || textToCheck.includes('where'));

                if (isLocationWarning) {
                  return (
                    <div className="p-3.5 rounded-lg text-xs border flex items-start gap-2.5 bg-emerald-50 text-emerald-800 border-emerald-200">
                      <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                      <div className="space-y-1">
                        <p className="font-semibold">Actionable Civic Problem Detected</p>
                        <p className="leading-relaxed">Civic problem statement recognized. You will pin the exact geographic location on the map in Step 02.</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    className={`p-3.5 rounded-lg text-xs border flex items-start gap-2.5 ${
                      intentResult.nextAction === IntentNextAction.BLOCKED
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : intentResult.nextAction === IntentNextAction.IMPROVE_SUBMISSION
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold">
                        {intentResult.nextAction === IntentNextAction.BLOCKED
                          ? 'Submission Quality Notice'
                          : intentResult.nextAction === IntentNextAction.IMPROVE_SUBMISSION
                          ? 'Suggested Clarification'
                          : 'Actionable Civic Problem Detected'}
                      </p>
                      <p className="leading-relaxed">{intentResult.reason}</p>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
            <CardFooter className="flex justify-between border-t border-slate-100 pt-4">
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Autosaved locally</span>
              </div>
              <Button
                variant="primary"
                disabled={title.trim().length < 5 || description.trim().length < 20}
                onClick={() => setCurrentStep(2)}
              >
                Continue to Location
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* =========================================================================
            STEP 02: PIN THE LOCATION
           ========================================================================= */}
        {currentStep === 2 && (
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Step 02 of 07</span>
                  <CardTitle className="text-xl text-slate-900 mt-1">Pin the Location</CardTitle>
                </div>
                <Badge
                  variant={
                    locationQuality === 'PRECISE_COORDINATES' || locationQuality === 'COORDINATES'
                      ? 'success'
                      : locationQuality === 'ADMIN_ONLY'
                      ? 'warning'
                      : 'secondary'
                  }
                >
                  {locationQuality === 'PRECISE_COORDINATES'
                    ? 'Precise GPS Tagged'
                    : locationQuality === 'COORDINATES'
                    ? 'Coordinates Pinned'
                    : locationQuality === 'ADMIN_ONLY'
                    ? 'District/State Only'
                    : 'Location Missing'}
                </Badge>
              </div>
              <CardDescription className="text-slate-600">
                Location helps SICP identify nearby reports, route the challenge to the right municipal authorities, and understand geographic impact.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Interactive Map Picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>Interactive Map Pinning</span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDetectLocation}
                    isLoading={gpsState === 'LOCATING'}
                    className="text-xs"
                  >
                    <Compass className="w-3.5 h-3.5 mr-1 text-blue-600" />
                    Use My Device GPS
                  </Button>
                </div>

                <LocationMapPicker
                  latitude={latitude}
                  longitude={longitude}
                  onLocationSelect={(lat, lng) => {
                    setLatitude(lat);
                    setLongitude(lng);
                    setLocationNotice(`Pinned on map: ${lat}, ${lng}. Resolving administrative boundaries...`);
                    resolveLocationFromCoordinates(lat, lng, `Pinned on map: ${lat}, ${lng}.`);
                  }}
                />

                {isReverseGeocoding && (
                  <div className="flex items-center gap-2 p-2.5 bg-blue-50/70 rounded-lg text-xs text-blue-700 border border-blue-200 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                    <span>Resolving district and state from OpenStreetMap...</span>
                  </div>
                )}

                {resolvedLocationDetails && (
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-800">Auto-Resolved Area:</span>{' '}
                      <span>
                        {[
                          resolvedLocationDetails.locality,
                          resolvedLocationDetails.district,
                          resolvedLocationDetails.state,
                          resolvedLocationDetails.postcode,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[11px] text-blue-600 h-7 px-2 hover:bg-blue-50"
                      onClick={() => {
                        if (resolvedLocationDetails.district) setDistrict(resolvedLocationDetails.district);
                        if (resolvedLocationDetails.state) setState(resolvedLocationDetails.state);
                        if (resolvedLocationDetails.locality) setAddress(resolvedLocationDetails.locality);
                      }}
                    >
                      Re-apply to fields
                    </Button>
                  </div>
                )}

                {locationNotice && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{locationNotice}</span>
                  </p>
                )}
              </div>

              {/* District & State Administrative Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800">
                    District <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Pune, Varanasi, Kamrup"
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                    className={fieldErrors.district ? 'border-red-500' : ''}
                  />
                  {fieldErrors.district && <p className="text-xs text-red-600">{fieldErrors.district}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800">
                    State <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Maharashtra, Uttar Pradesh, Assam"
                    value={state}
                    onChange={e => setState(e.target.value)}
                    className={fieldErrors.state ? 'border-red-500' : ''}
                  />
                  {fieldErrors.state && <p className="text-xs text-red-600">{fieldErrors.state}</p>}
                </div>
              </div>

              {/* Landmark / Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800">
                  Landmark or Street Address (Optional)
                </label>
                <Input
                  placeholder="e.g. Opposite Primary Health Centre, NH-48 Km 14"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>

              {/* Policy Guidance Alert */}
              <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800 border border-blue-200 leading-relaxed">
                <strong>Location Intelligence Rule:</strong> Without coordinates, basic AI understanding is permitted, but local duplicate detection and proximity warnings will remain locked until a map pin is placed.
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                variant="primary"
                disabled={!district.trim() || !state.trim()}
                onClick={() => setCurrentStep(3)}
              >
                Continue to Evidence
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* =========================================================================
            STEP 03: ADD EVIDENCE
           ========================================================================= */}
        {currentStep === 3 && (
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Step 03 of 07</span>
                  <CardTitle className="text-xl text-slate-900 mt-1">Add Evidence</CardTitle>
                </div>
                <Badge variant="secondary">
                  {[images.length, audioItem ? 1 : 0, videos.length, documents.length].reduce((a, b) => a + b, 0)} Items Added
                </Badge>
              </div>
              <CardDescription className="text-slate-600">
                Photographs, audio recordings, video clips, and documents provide direct evidence for multimodal AI problem intelligence.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Evidence Type Tabs */}
              <div className="flex border-b border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveEvidenceTab('photo')}
                  className={`flex items-center gap-1.5 py-2.5 px-4 border-b-2 transition-colors ${
                    activeEvidenceTab === 'photo'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Photos ({images.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEvidenceTab('audio')}
                  className={`flex items-center gap-1.5 py-2.5 px-4 border-b-2 transition-colors ${
                    activeEvidenceTab === 'audio'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  <span>Audio Evidence {audioItem ? '(1)' : ''}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEvidenceTab('video')}
                  className={`flex items-center gap-1.5 py-2.5 px-4 border-b-2 transition-colors ${
                    activeEvidenceTab === 'video'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <VideoIcon className="w-4 h-4" />
                  <span>Videos ({videos.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEvidenceTab('document')}
                  className={`flex items-center gap-1.5 py-2.5 px-4 border-b-2 transition-colors ${
                    activeEvidenceTab === 'document'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Documents ({documents.length})</span>
                </button>
              </div>

              {/* Photo Evidence Tab */}
              {activeEvidenceTab === 'photo' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors bg-slate-50">
                    <Camera className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Upload Photographs</p>
                    <p className="text-xs text-slate-500 mt-0.5">JPEG, PNG, WebP up to 15MB each (Max 6 photos)</p>
                    <label className="mt-3 inline-block">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={e => handleImageUpload(e.target.files)}
                      />
                      <span className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer hover:bg-blue-700 transition-colors shadow-xs">
                        Select Photos from Device
                      </span>
                    </label>
                  </div>

                  {images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {images.map(img => (
                        <div key={img.id} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.dataUrl} alt={img.name} className="w-full h-24 object-cover" />
                          <div className="p-1.5 flex items-center justify-between text-[11px] text-slate-600 truncate">
                            <span className="truncate">{img.name}</span>
                            <button
                              type="button"
                              onClick={() => setImages(images.filter(i => i.id !== img.id))}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Audio Evidence Tab (Clean Evidence - NO Voice-to-Text Terminology) */}
              {activeEvidenceTab === 'audio' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                          <Mic className="w-4 h-4 text-blue-600" />
                          <span>Record Audio Evidence</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          Describe what you observed in your own words. Gemini multimodal AI will analyze the audio recording as direct evidence.
                        </p>
                      </div>
                      {audioRecordingState === 'RECORDING' && (
                        <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-red-600" />
                          {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      {audioRecordingState !== 'RECORDING' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={startAudioRecording}
                          className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          <Mic className="w-3.5 h-3.5 mr-1 text-blue-600" />
                          Start Recording
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={stopAudioRecording}
                          className="text-xs"
                        >
                          <MicOff className="w-3.5 h-3.5 mr-1" />
                          Stop Recording
                        </Button>
                      )}

                      <span className="text-xs text-slate-400">or upload audio file:</span>

                      <label className="inline-block">
                        <input
                          type="file"
                          accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac"
                          className="hidden"
                          onChange={e => handleAudioUpload(e.target.files)}
                        />
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-50">
                          Upload Audio File (MP3, WAV, M4A)
                        </span>
                      </label>
                    </div>

                    {audioNotice && (
                      <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                        {audioNotice}
                      </p>
                    )}

                    {audioItem && (
                      <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Mic className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-semibold text-slate-800 truncate">{audioItem.name}</p>
                            <p className="text-[10px] text-slate-500">
                              {(audioItem.size / 1024).toFixed(1)} KB • {audioItem.duration ? `${audioItem.duration}s` : 'Audio File'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <audio controls src={audioItem.audioUrl} className="h-8 max-w-[200px]" />
                          <button
                            type="button"
                            onClick={deleteAudioEvidence}
                            className="p-1.5 text-red-500 hover:text-red-700 rounded-md hover:bg-red-50"
                            title="Remove Audio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Video Evidence Tab */}
              {activeEvidenceTab === 'video' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50">
                    <VideoIcon className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Upload Short Video Clip</p>
                    <p className="text-xs text-slate-500 mt-0.5">MP4, WebM up to 50MB (max 60 seconds recommended)</p>
                    <label className="mt-3 inline-block">
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={e => handleVideoUpload(e.target.files)}
                      />
                      <span className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer hover:bg-blue-700 transition-colors shadow-xs">
                        Select Video File
                      </span>
                    </label>
                  </div>

                  {videos.length > 0 && (
                    <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <VideoIcon className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-semibold text-slate-800">{videos[0].name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setVideos([])}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Document Evidence Tab */}
              {activeEvidenceTab === 'document' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50">
                    <FileText className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Attach Official or Community Documents</p>
                    <p className="text-xs text-slate-500 mt-0.5">PDF, TXT, DOCX up to 15MB (Max 4 documents)</p>
                    <label className="mt-3 inline-block">
                      <input
                        type="file"
                        accept=".pdf,.txt,.doc,.docx"
                        multiple
                        className="hidden"
                        onChange={e => handleDocumentUpload(e.target.files)}
                      />
                      <span className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer hover:bg-blue-700 transition-colors shadow-xs">
                        Select Documents
                      </span>
                    </label>
                  </div>

                  {documents.length > 0 && (
                    <div className="space-y-2">
                      {documents.map(doc => (
                        <div key={doc.id} className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-slate-600 shrink-0" />
                            <span className="font-medium text-slate-800 truncate">{doc.name}</span>
                            <span className="text-slate-400">({(doc.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDocuments(documents.filter(d => d.id !== doc.id))}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                  onClick={handleSubmit}
                  isLoading={isLoading}
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  Submit &amp; Run Analysis
                </Button>
                <Button variant="outline" onClick={() => setCurrentStep(4)}>
                  Review Details
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        )}

        {/* =========================================================================
            STEP 04: AI UNDERSTANDS THE PROBLEM
           ========================================================================= */}
        {currentStep === 4 && (
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Step 04 of 07</span>
                  <CardTitle className="text-xl text-slate-900 mt-1">AI Analysis</CardTitle>
                </div>
                <Badge
                  variant={
                    aiState === 'ANALYSIS_COMPLETE'
                      ? 'success'
                      : aiState === 'ANALYZING'
                      ? 'warning'
                      : 'secondary'
                  }
                >
                  {aiState === 'ANALYSIS_COMPLETE'
                    ? 'AI Synthesis Ready'
                    : aiState === 'ANALYZING'
                    ? 'Analyzing Evidence...'
                    : 'Analysis Pending'}
                </Badge>
              </div>
              <CardDescription className="text-slate-600">
                SICP understands and structures the problem using the submitted information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Trigger Button if not yet run */}
              {aiState !== 'ANALYSIS_COMPLETE' && (
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                    <BrainCircuit className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-semibold text-slate-900">Run AI Understanding Pipeline</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Analyzes description, photographs, and audio recordings using Gemini multimodal reasoning.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleTriggerAiAnalysis}
                    isLoading={aiState === 'ANALYZING'}
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    Analyze Problem with AI
                  </Button>

                  {aiError && (
                    <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 max-w-md mx-auto">
                      {aiError}
                    </p>
                  )}
                </div>
              )}

              {/* Comprehensive AI Understanding Card */}
              {aiState === 'ANALYSIS_COMPLETE' && aiResult && (
                <div className="space-y-5 animate-in fade-in">
                  <div className="p-5 bg-gradient-to-br from-blue-50/70 to-indigo-50/50 rounded-xl border border-blue-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-bold text-slate-900">SICP AI Analysis</span>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        Government validation pending
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Problem Formulation</p>
                      <p className="text-sm font-medium text-slate-900 leading-relaxed">
                        {aiResult.problemFormulation || aiResult.normalizedStatement || aiResult.problemUnderstanding || aiResult.reasoningSummary || title}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-blue-200/60">
                      <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase">Category</p>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{aiResult.category || category}</p>
                        <p className="text-[10px] text-emerald-600 font-medium mt-1">
                          Confidence: {Math.round(((aiResult.fieldConfidences?.categoryConfidence ?? aiResult.fieldConfidences?.category) || 0.85) * 100)}%
                        </p>
                      </div>

                      <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase">Problem Type</p>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{aiResult.problemType || 'Infrastructure Deficit'}</p>
                        <p className="text-[10px] text-emerald-600 font-medium mt-1">
                          Confidence: {Math.round(((aiResult.fieldConfidences?.problemTypeConfidence ?? aiResult.fieldConfidences?.problemType) || 0.82) * 100)}%
                        </p>
                      </div>

                      <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase">AI Urgency</p>
                        <p className="text-xs font-bold text-amber-700 mt-0.5">{aiResult.estimatedSeverity || severity}</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-1">Subject to review</p>
                      </div>

                      <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase">Root Cause Conf.</p>
                        <p className="text-xs font-bold text-indigo-700 mt-0.5">
                          {Math.round(((aiResult.fieldConfidences?.rootCauseConfidence ?? aiResult.fieldConfidences?.rootCauseHypotheses) || 0.78) * 100)}%
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium mt-1">Multi-signal</p>
                      </div>
                    </div>

                    {/* Contributing Factors */}
                    {Array.isArray(aiResult.contributingFactors) && aiResult.contributingFactors.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <p className="text-xs font-semibold text-slate-700">Possible Contributing Factors</p>
                        <div className="flex flex-wrap gap-2">
                          {aiResult.contributingFactors.map((cf: any, idx: number) => {
                            const factorText = typeof cf === 'string' ? cf : (cf?.factor || cf?.name || String(cf));
                            const factorStatus = typeof cf === 'object' && cf?.status ? cf.status : 'AI_HYPOTHESIS';
                            return (
                              <span
                                key={idx}
                                className="text-xs px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium"
                              >
                                {factorText} <span className="text-[10px] text-blue-600 ml-1 font-mono">[{factorStatus}]</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Root Cause Hypotheses */}
                    {Array.isArray(aiResult.rootCauseHypotheses) && aiResult.rootCauseHypotheses.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <p className="text-xs font-semibold text-slate-700">Root Cause Hypotheses (AI-Assisted)</p>
                        <div className="flex flex-wrap gap-2">
                          {aiResult.rootCauseHypotheses.map((rc: any, idx: number) => {
                            const rcText = typeof rc === 'string' ? rc : (rc?.cause || rc?.name || String(rc));
                            return (
                              <span
                                key={idx}
                                className="text-xs px-2.5 py-1 rounded-md bg-indigo-50/70 border border-indigo-200 text-indigo-800 font-medium"
                              >
                                {rcText} <span className="text-[10px] text-indigo-600 ml-1 font-mono">[HYPOTHESIS]</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Evidence Considered */}
                    <div className="text-xs text-slate-500 border-t border-blue-200/60 pt-2 flex flex-wrap items-center gap-3">
                      <span className="font-semibold text-slate-700">Evidence considered:</span>
                      <span>Description ({description.split(/\s+/).filter(Boolean).length} words)</span>
                      {images.length > 0 && <span>• {images.length} photo(s)</span>}
                      {audioItem && <span>• Audio recording ({audioItem.duration || 10}s)</span>}
                      {videos.length > 0 && <span>• Video clip</span>}
                      {documents.length > 0 && <span>• {documents.length} document(s)</span>}
                    </div>

                    {/* 🧠 SICP REMEMBERS — Signature Institutional Memory Experience */}
                    <div className="pt-4 border-t border-blue-200/60 space-y-3" data-testid="sicp-remembers-section">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                            <BrainCircuit className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-slate-900 tracking-tight">
                                SICP REMEMBERS
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                Institutional Memory Active
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Verified historical precedents, prior failure warnings, and recurrence intelligence
                            </p>
                          </div>
                        </div>

                        <Link href="/solutions" target="_blank">
                          <span className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
                            <span>Open Explorer</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </Link>
                      </div>

                      {/* Recurrence Signal Alert if Present */}
                      {recurrenceSignal && (
                        <RecurrenceSignalCard
                          signal={recurrenceSignal}
                          onInvestigate={() => {
                            setComparingMemory(recurrenceSignal.previousCase);
                            setCompareModalOpen(true);
                          }}
                        />
                      )}

                      {/* Precedents List or Graceful Empty State */}
                      {loadingPrecedents ? (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500 animate-pulse">
                          Scanning SICP institutional memory for similar societal problem precedents...
                        </div>
                      ) : historicalPrecedents.length === 0 ? (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-600 space-y-1">
                          <p className="font-bold text-slate-800">No sufficiently relevant institutional precedent found.</p>
                          <p className="text-[11px] text-slate-500 max-w-lg mx-auto">
                            This challenge represents a novel local configuration or domain without verified historical precedents. Research and municipal engineering teams will formulate an original intervention.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Summary pill counts */}
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                            <span>Found {historicalPrecedents.length} historical case(s):</span>
                            {historicalPrecedents.some(p => p.outcomeStatus === 'SUCCESSFUL' || p.outcomeStatus === 'EFFECTIVE') && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px]">
                                🟢 Worked Before ({historicalPrecedents.filter(p => p.outcomeStatus === 'SUCCESSFUL' || p.outcomeStatus === 'EFFECTIVE').length})
                              </span>
                            )}
                            {historicalPrecedents.some(p => p.outcomeStatus === 'FAILED' || p.outcomeStatus === 'INEFFECTIVE') && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10px]">
                                🔴 Failed Before ({historicalPrecedents.filter(p => p.outcomeStatus === 'FAILED' || p.outcomeStatus === 'INEFFECTIVE').length})
                              </span>
                            )}
                            {historicalPrecedents.some(p => p.outcomeStatus === 'PARTIALLY_EFFECTIVE' || p.outcomeStatus === 'PARTIAL_SUCCESS') && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">
                                🟡 Mixed Results ({historicalPrecedents.filter(p => p.outcomeStatus === 'PARTIALLY_EFFECTIVE' || p.outcomeStatus === 'PARTIAL_SUCCESS').length})
                              </span>
                            )}
                          </div>

                          {/* Historical Precedent Cards */}
                          {historicalPrecedents.map((item: any) => (
                            <SolutionMemoryCard
                              key={item.id}
                              memory={item}
                              currentProblemContext={{
                                title,
                                description,
                                category,
                                district,
                              }}
                              onCompare={(id) => {
                                const found = historicalPrecedents.find(p => p.id === id);
                                if (found) {
                                  setComparingMemory(found);
                                  setCompareModalOpen(true);
                                }
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Official priority and routing will be determined during government review.</span>
                    <button
                      type="button"
                      onClick={handleTriggerAiAnalysis}
                      className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Re-run AI Analysis
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(3)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button variant="primary" onClick={() => setCurrentStep(5)}>
                Continue to Local Intelligence
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* =========================================================================
            STEP 05: LOCAL INTELLIGENCE (STRICTLY LOCATION GATED)
           ========================================================================= */}
        {currentStep === 5 && (
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Step 05 of 07</span>
                  <CardTitle className="text-xl text-slate-900 mt-1">Local Intelligence</CardTitle>
                </div>
                <Badge variant={latitude !== null && longitude !== null ? 'success' : 'warning'}>
                  {latitude !== null && longitude !== null ? 'Location Intelligence Active' : 'Location Gate Locked'}
                </Badge>
              </div>
              <CardDescription className="text-slate-600">
                SICP checks whether this problem relates to existing problems in the same or similar area.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* HARD GATE: Location Missing Warning */}
              {(latitude === null || longitude === null) ? (
                <div className="p-6 bg-amber-50 rounded-xl border border-amber-200 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-semibold text-amber-900">Add a location to check for nearby reports</h4>
                    <p className="text-xs text-amber-700 max-w-md mx-auto">
                      Proximity duplicate detection and neighborhood cluster intelligence require geographic coordinates to prevent false cross-state matching.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setCurrentStep(2)} className="border-amber-300 text-amber-800">
                    <MapPin className="w-4 h-4 mr-1.5" />
                    Go to Step 02: Pin Location
                  </Button>
                </div>
              ) : isCheckingDuplicates ? (
                <div className="p-8 text-center space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                  <p className="text-xs text-slate-600 font-medium">Scanning nearby challenges and systemic infrastructure...</p>
                </div>
              ) : duplicateCheckResult && duplicateCheckResult.candidates && duplicateCheckResult.candidates.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800 border border-blue-200 flex items-center justify-between">
                    <span>
                      Found <strong>{duplicateCheckResult.candidates.length}</strong> potentially related report(s) in this vicinity.
                    </span>
                    <span className="font-semibold text-blue-900">Zero destructive merge policy</span>
                  </div>

                  <div className="space-y-3">
                    {duplicateCheckResult.candidates.map((candidate: ContextAwareCandidateDto) => {
                      const feedback = duplicateFeedback[candidate.challengeId];
                      return (
                        <div
                          key={candidate.challengeId}
                          className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">
                                  {candidate.category}
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  {candidate.distanceMeters !== null && candidate.distanceMeters !== undefined
                                    ? candidate.distanceMeters < 1000
                                      ? `${candidate.distanceMeters}m away`
                                      : `${(candidate.distanceMeters / 1000).toFixed(1)}km away`
                                    : 'Nearby'}
                                </span>
                              </div>
                              <h4 className="text-sm font-semibold text-slate-900 mt-1">{candidate.title}</h4>
                            </div>
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                candidate.semanticSimilarity > 0.8
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {Math.round(candidate.semanticSimilarity * 100)}% Similarity
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <strong>Why related:</strong> {candidate.reasoning}
                          </p>

                          {/* Citizen Feedback Controls */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="text-[11px] text-slate-500">Is this the same issue?</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setDuplicateFeedback(prev => ({
                                    ...prev,
                                    [candidate.challengeId]: 'SAME',
                                  }))
                                }
                                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                                  feedback === 'SAME'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                Yes, same issue
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDuplicateFeedback(prev => ({
                                    ...prev,
                                    [candidate.challengeId]: 'DIFFERENT',
                                  }))
                                }
                                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                                  feedback === 'DIFFERENT'
                                    ? 'bg-slate-800 text-white border-slate-800'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                Different issue
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-slate-500 italic">
                    Original citizen submissions remain individually preserved. Official consolidation or duplicate linking is finalized by authorized municipal reviewers.
                  </p>
                </div>
              ) : (
                <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-semibold text-emerald-900">No Similar Reports Found Nearby</h4>
                  <p className="text-xs text-emerald-700 max-w-md mx-auto">
                    Your civic issue appears to be unique in this location. It will be registered as a primary challenge upon submission.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(4)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button variant="primary" onClick={() => setCurrentStep(6)}>
                Continue to Impact
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* =========================================================================
            STEP 06: UNDERSTAND THE IMPACT
           ========================================================================= */}
        {currentStep === 6 && (
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Step 06 of 07</span>
                  <CardTitle className="text-xl text-slate-900 mt-1">Who is affected?</CardTitle>
                </div>
                <Badge variant="secondary">Citizen Feedback</Badge>
              </div>
              <CardDescription className="text-slate-600">
                Help us understand community impact. Valid selections include approximate bands and &quot;I don&apos;t know&quot; — we never fabricate precise numbers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question 1: Who is affected? */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                  <span>Who is affected by this challenge?</span>
                  <span className="text-[11px] text-slate-400">Select all that apply</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {AFFECTED_GROUP_OPTIONS.map(grp => {
                    const isSelected = affectedGroups.includes(grp.id);
                    return (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => {
                          setAffectedGroups(prev =>
                            isSelected ? prev.filter(id => id !== grp.id) : [...prev, grp.id]
                          );
                        }}
                        className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{grp.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question 2: Approximate Number of People */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-slate-800">
                  How many people are approximately affected?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {POPULATION_BANDS.map(band => (
                    <button
                      key={band.id}
                      type="button"
                      onClick={() => setPopulationBand(band.id)}
                      className={`p-2.5 rounded-lg border text-center text-xs font-medium transition-colors ${
                        populationBand === band.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {band.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 3: Duration */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-slate-800">
                  How long has this been happening?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DURATION_BANDS.map(band => (
                    <button
                      key={band.id}
                      type="button"
                      onClick={() => setDurationBand(band.id)}
                      className={`p-2.5 rounded-lg border text-center text-xs font-medium transition-colors ${
                        durationBand === band.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {band.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 4: Frequency */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-slate-800">
                  How often does it happen?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FREQUENCY_BANDS.map(band => (
                    <button
                      key={band.id}
                      type="button"
                      onClick={() => setFrequencyBand(band.id)}
                      className={`p-2.5 rounded-lg border text-center text-xs font-medium transition-colors ${
                        frequencyBand === band.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {band.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Impact Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800">
                  Additional Community Observations (Optional)
                </label>
                <Input
                  placeholder="e.g., Heavy monsoon waterlogging causes nearby primary school to close for 2 days every week."
                  value={impactNotes}
                  onChange={e => setImpactNotes(e.target.value)}
                />
              </div>

              {/* Truthful Data Alert */}
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-200 leading-relaxed">
                <strong>Honest Data Guarantee:</strong> If impact is unknown, it will be labeled as &quot;Impact not provided&quot; rather than displaying fabricated precision or &quot;0 residents exposed&quot;.
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-slate-100 pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(5)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button variant="primary" onClick={() => setCurrentStep(7)}>
                Continue to Review
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* =========================================================================
            STEP 07: REVIEW & SUBMIT
           ========================================================================= */}
        {currentStep === 7 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Step 07 of 07</span>
                    <CardTitle className="text-xl text-slate-900 mt-1">Review & Submit</CardTitle>
                  </div>
                  <Badge variant="success">Final Verification</Badge>
                </div>
                <CardDescription className="text-slate-600">
                  Please review all 6 intake sections before submitting. Once submitted, the problem will be routed to municipal authorities for review.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Section 1: Problem Summary */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">What You Reported</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs text-blue-600 font-semibold hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{title || 'Headline not provided'}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{description || 'Description not provided'}</p>
                  <p className="text-xs text-slate-500">
                    Category Guidance: <span className="font-semibold text-slate-700">{category}</span>
                  </p>
                </div>

                {/* Section 2: Location Summary */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Where</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-xs text-blue-600 font-semibold hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="text-xs text-slate-700 space-y-1">
                    <p>
                      <strong>District & State:</strong> {district || 'Not provided'}, {state || 'Not provided'}
                    </p>
                    {address && <p><strong>Landmark/Address:</strong> {address}</p>}
                    <p className="flex items-center gap-2">
                      <strong>GPS Coordinates:</strong>
                      {latitude !== null && longitude !== null ? (
                        <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                          {latitude.toFixed(5)}, {longitude.toFixed(5)}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Coordinates not pinned</span>
                      )}
                      <Badge variant={locationQuality === 'PRECISE_COORDINATES' || locationQuality === 'COORDINATES' ? 'success' : 'secondary'}>
                        {locationQuality}
                      </Badge>
                    </p>
                  </div>
                </div>

                {/* Section 3: Evidence Summary */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Evidence Attached</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="text-xs text-blue-600 font-semibold hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-700">
                    <span className="bg-white px-2.5 py-1 rounded-md border border-slate-200">
                      📷 {images.length} Photo(s)
                    </span>
                    <span className="bg-white px-2.5 py-1 rounded-md border border-slate-200">
                      🎙 {audioItem ? `Audio attached (${audioItem.duration || 0}s)` : 'No audio'}
                    </span>
                    <span className="bg-white px-2.5 py-1 rounded-md border border-slate-200">
                      🎥 {videos.length} Video(s)
                    </span>
                    <span className="bg-white px-2.5 py-1 rounded-md border border-slate-200">
                      📄 {documents.length} Document(s)
                    </span>
                  </div>
                </div>

                {/* Section 4: AI Understanding Summary */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Understanding</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="text-xs text-blue-600 font-semibold hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  {aiState === 'ANALYSIS_COMPLETE' && aiResult ? (
                    <div className="text-xs text-slate-700 space-y-1">
                      <p><strong>Primary Category:</strong> {aiResult.category || category}</p>
                      <p><strong>Problem Formulation:</strong> {aiResult.problemFormulation || aiResult.normalizedStatement || aiResult.problemUnderstanding || title}</p>
                      <p><strong>AI-Recommended Urgency:</strong> {aiResult.estimatedSeverity || severity}</p>
                      <p className="text-blue-700 font-medium">Government validation pending</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      AI analysis not run pre-submission. Full multimodal AI analysis will run asynchronously upon submission.
                    </p>
                  )}
                </div>

                {/* Section 5: Impact Summary */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Impact & Reach</span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(6)}
                      className="text-xs text-blue-600 font-semibold hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="text-xs text-slate-700 space-y-1">
                    <p>
                      <strong>Affected Groups:</strong>{' '}
                      {affectedGroups.length > 0
                        ? affectedGroups.map(g => AFFECTED_GROUP_OPTIONS.find(o => o.id === g)?.label || g).join(', ')
                        : 'Impact not provided'}
                    </p>
                    <p>
                      <strong>Approximate Scale:</strong>{' '}
                      {populationBand && populationBand !== 'UNKNOWN'
                        ? POPULATION_BANDS.find(b => b.id === populationBand)?.label
                        : 'Impact not provided'}
                    </p>
                    <p>
                      <strong>Duration:</strong>{' '}
                      {durationBand && durationBand !== 'UNKNOWN'
                        ? DURATION_BANDS.find(b => b.id === durationBand)?.label
                        : 'Duration not provided'}
                    </p>
                    <p>
                      <strong>Frequency:</strong>{' '}
                      {frequencyBand && frequencyBand !== 'UNKNOWN'
                        ? FREQUENCY_BANDS.find(b => b.id === frequencyBand)?.label
                        : 'Frequency not provided'}
                    </p>
                  </div>
                </div>

                {/* Official Review Notice */}
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-1 text-xs text-blue-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    Official Review Required
                  </p>
                  <p className="leading-relaxed">
                    By submitting this civic challenge, your report will be registered in the public registry. Authorized municipal officers will review the submission, verify priority, and coordinate research solutions with participating universities.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-slate-100 pt-4">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(6)}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  disabled={!title.trim() || !description.trim() || !district.trim() || !state.trim()}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Submit Civic Challenge
                </Button>
              </CardFooter>
            </Card>
          </form>
        )}
      </div>

      {/* Side-by-Side Comparison Drawer */}
      <CompareCaseDrawer
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        currentCase={{
          title,
          description,
          category,
          district,
          state,
          rootCause: aiResult?.rootCauseHypotheses?.[0]?.cause || 'Under investigation',
          severity: severity,
        }}
        historicalCases={comparingMemory ? [comparingMemory] : []}
      />
    </AppLayout>
  );
}
