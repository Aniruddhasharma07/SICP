'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Users, Heart, ArrowUpRight } from 'lucide-react';

export interface TeamMember {
  name: string;
  linkedinUrl?: string;
}

export const SICP_TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Aniruddha Sharma',
    linkedinUrl: 'https://www.linkedin.com/in/aniruddha-sharma-8793692b5/',
  },
  {
    name: 'Priyanshi Choudhary',
    linkedinUrl: 'https://www.linkedin.com/in/priyanshi-choudhary-197453385/?skipRedirect=true',
  },
  {
    name: 'Mansi Kharb',
  },
  {
    name: 'Vishnu Ojha',
  },
  {
    name: 'Anurag Kumar Mishra',
  },
  {
    name: 'Anurag Gangwar',
  },
];

export const SICP_GITHUB_REPO_URL = 'https://github.com/Aniruddhasharma07/SICP';

export function TeamCreditWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearCloseTimeout();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 250);
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearCloseTimeout();
    setIsOpen((prev) => !prev);
  };

  // Keyboard and outside-click handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearCloseTimeout();
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        clearCloseTimeout();
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearCloseTimeout();
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="team-credit-widget"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 select-none font-sans"
    >
      {/* Credit Card Popover */}
      <div
        role="region"
        aria-label="SICP Team Credits"
        aria-hidden={!isOpen}
        className={`absolute bottom-full right-0 mb-3 w-[calc(100vw-32px)] max-w-[340px] sm:w-88 rounded-2xl bg-slate-900/98 text-slate-100 border border-slate-700/80 shadow-2xl backdrop-blur-md p-4 space-y-3 transition-all duration-200 ease-out ${
          isOpen
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto visible'
            : 'opacity-0 translate-y-2 scale-95 pointer-events-none invisible'
        } motion-reduce:transition-none motion-reduce:transform-none`}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                MADE BY —
              </div>
              <div className="text-sm font-extrabold text-white tracking-tight leading-snug mt-0.5">
                SICP Team
              </div>
            </div>
          </div>
          <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20 shrink-0" aria-hidden="true" />
        </div>

        {/* Team Members List */}
        <div className="space-y-0.5">
          {SICP_TEAM_MEMBERS.map((member) => {
            const isClickable = Boolean(member.linkedinUrl);

            if (isClickable && member.linkedinUrl) {
              return (
                <a
                  key={member.name}
                  href={member.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${member.name} on LinkedIn (opens in a new tab)`}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors group focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 group-hover:scale-125 transition-transform" />
                    <span className="font-semibold truncate">{member.name}</span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
                </a>
              );
            }

            return (
              <div
                key={member.name}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-300"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                  <span className="font-medium truncate text-slate-300">{member.name}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Divider & Project Github Link */}
        <div className="pt-2 border-t border-slate-800/80">
          <a
            href={SICP_GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="SICP Project Repository on GitHub (opens in a new tab)"
            className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs text-slate-200 hover:text-white transition-colors group border border-slate-700/60 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <div className="flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-300 group-hover:text-white"
                aria-hidden="true"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              <span className="font-semibold text-white">Project Github Link</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </a>
        </div>
      </div>

      {/* Floating Circular Trigger Button */}
      <button
        type="button"
        onClick={handleToggleClick}
        onFocus={handleMouseEnter}
        aria-label="Made by SICP Team"
        title="Made by SICP Team"
        aria-expanded={isOpen}
        className={`w-12 h-12 md:w-13 md:h-13 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${
          isOpen
            ? 'bg-blue-700 text-white shadow-blue-900/40 ring-2 ring-blue-400/40 scale-105'
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30 hover:shadow-xl hover:scale-105 active:scale-95 border border-blue-400/30'
        }`}
      >
        <Users className="w-5 h-5 md:w-6 md:h-6 transition-transform" />
      </button>
    </div>
  );
}
