'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../lib/api-client';
import { Search, X, Compass, FolderKanban, BrainCircuit, Building2, GraduationCap, ArrowRight, Loader2 } from 'lucide-react';

interface SearchResultItem {
  id: string;
  type: 'challenge' | 'project' | 'solution' | 'organization' | 'faculty';
  title: string;
  subtitle: string;
  snippet: string;
  url: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface GlobalSearchResponse {
  query: string;
  total: number;
  counts: {
    challenges: number;
    projects: number;
    solutions: number;
    organizations: number;
    faculty: number;
  };
  results: SearchResultItem[];
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.request<GlobalSearchResponse>(
          `/api/v1/search?q=${encodeURIComponent(query.trim())}&limit=8`
        );
        if (res.success && res.data) {
          setResults(res.data.results || []);
          setSelectedIndex(0);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          router.push(results[selectedIndex].url);
          onClose();
        } else if (query.trim()) {
          router.push(`/search?q=${encodeURIComponent(query.trim())}`);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, query, router, onClose]);

  if (!isOpen) return null;

  const getIcon = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'challenge':
        return <Compass className="w-4 h-4 text-blue-500" />;
      case 'project':
        return <FolderKanban className="w-4 h-4 text-indigo-500" />;
      case 'solution':
        return <BrainCircuit className="w-4 h-4 text-emerald-500" />;
      case 'organization':
        return <Building2 className="w-4 h-4 text-amber-500" />;
      case 'faculty':
        return <GraduationCap className="w-4 h-4 text-purple-500" />;
    }
  };

  const getTypeBadgeColor = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'challenge':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'project':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'solution':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'organization':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'faculty':
        return 'bg-purple-50 text-purple-700 border-purple-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search problems, projects, solutions, institutions, faculty..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-none text-slate-900 placeholder-slate-400 focus:outline-hidden text-base"
          />
          {loading && <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />}
          {query && !loading && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs text-slate-400 bg-slate-100 border border-slate-200 rounded">
            ESC
          </kbd>
        </div>

        {/* Search Body */}
        <div className="overflow-y-auto p-2 flex-1 divide-y divide-slate-100">
          {results.length > 0 ? (
            <div className="space-y-1">
              {results.map((item, idx) => (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => {
                    router.push(item.url);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedIndex === idx ? 'bg-blue-50/80 border border-blue-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{getIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 truncate">
                        {item.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${getTypeBadgeColor(
                          item.type
                        )}`}
                      >
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{item.subtitle}</p>
                    <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{item.snippet}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 self-center shrink-0" />
                </div>
              ))}
            </div>
          ) : query.trim() && !loading ? (
            <div className="py-12 px-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">
                No matching results found for &ldquo;{query}&rdquo;
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try searching by different keywords, or explore our categorized sections:
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => {
                    router.push('/challenges');
                    onClose();
                  }}
                  className="text-xs px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium"
                >
                  Browse Problems
                </button>
                <button
                  onClick={() => {
                    router.push('/solutions');
                    onClose();
                  }}
                  className="text-xs px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
                >
                  Solution Memories
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 px-4 space-y-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
                Quick Navigation
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    router.push('/challenges');
                    onClose();
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-left"
                >
                  <Compass className="w-4 h-4 text-blue-500 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Explore Challenges</div>
                    <div className="text-[11px] text-slate-500">Citizen & systemic issues</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    router.push('/solutions');
                    onClose();
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-left"
                >
                  <BrainCircuit className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Solution Memory</div>
                    <div className="text-[11px] text-slate-500">Institutional blueprints</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    router.push('/analytics');
                    onClose();
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-left"
                >
                  <ArrowRight className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Platform Analytics</div>
                    <div className="text-[11px] text-slate-500">Genuine database metrics</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    router.push('/university');
                    onClose();
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-left"
                >
                  <GraduationCap className="w-4 h-4 text-purple-500 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">University Portal</div>
                    <div className="text-[11px] text-slate-500">Faculty & R&amp;D teams</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search Footer */}
        {query.trim() && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Press Enter to navigate</span>
            <button
              onClick={() => {
                router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                onClose();
              }}
              className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
            >
              <span>View full faceted search</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
