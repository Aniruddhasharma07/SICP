'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { GlobalSearchModal } from '../common/GlobalSearchModal';
import { PortalSwitcher } from './PortalSwitcher';
import { apiClient } from '../../lib/api-client';
import { formatRelativeDate, formatEnumToHuman } from '../../lib/formatters';
import {
  Globe,
  User,
  LogOut,
  Bell,
  PlusCircle,
  Search,
  CheckCheck,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export function AppHeader() {
  const { user, logout } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch notifications when user is logged in
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await apiClient.request<NotificationItem[]>('/api/v1/notifications');
      if (res.success && res.data) {
        setNotifications(res.data);
        setUnreadCount(res.data.filter((n) => !n.read).length);
      }
    } catch {
      // Ignore network errors on polling
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Click outside to close notification menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await apiClient.request(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="flex h-16 items-center justify-between px-4 md:px-8">
          {/* Logo & Portal Branding */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 text-slate-900 group">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs transition-transform group-hover:scale-105">
                S
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-tight text-base text-slate-950">SICP</span>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    PRODUCTION
                  </span>
                </div>
                <span className="hidden lg:block text-[10px] font-medium text-slate-500 -mt-0.5">
                  Societal Innovation Collaboration Portal
                </span>
              </div>
            </Link>
            <div className="h-5 w-px bg-slate-200 hidden sm:block mx-1" />
            <PortalSwitcher />
          </div>

          {/* Center: Global Search Bar Trigger */}
          <div className="flex-1 max-w-md mx-4 hidden lg:block">
            <button
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search problems, projects, solutions and institutions"
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl border border-slate-200/90 bg-slate-50/70 text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-700 text-xs font-medium transition-all shadow-2xs group"
            >
              <span className="flex items-center gap-2.5 truncate">
                <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate">Search problems, solutions, faculty...</span>
              </span>
              <kbd className="px-2 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200/90 rounded-md shadow-2xs shrink-0">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Search Icon */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-2"
              onClick={() => setIsSearchOpen(true)}
              title="Search"
            >
              <Search className="w-4 h-4 text-slate-600" />
            </Button>

            {/* Submit Problem Button */}
            <Link href="/challenges/new">
              <Button size="sm" className="hidden lg:flex gap-1.5 shadow-xs">
                <PlusCircle className="w-4 h-4" />
                <span>Submit Problem</span>
              </Button>
            </Link>

            {/* Notifications Dropdown */}
            {user && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setIsNotifOpen((prev) => !prev)}
                  className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Notifications ({unreadCount} unread)
                      </span>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => {
                            notifications
                              .filter((n) => !n.read)
                              .forEach((n) => markAsRead(n.id));
                          }}
                          className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
                        >
                          <CheckCheck className="w-3 h-3" />
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length > 0 ? (
                        notifications.slice(0, 8).map((n) => (
                          <div
                            key={n.id}
                            className={`p-3 text-xs transition-colors ${
                              n.read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50/70'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-slate-900 line-clamp-1">{n.title}</span>
                              <span className="text-[10px] font-medium text-slate-400 shrink-0">
                                {formatRelativeDate(n.createdAt)}
                              </span>
                            </div>
                            <p className="text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                            <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/60">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{n.type}</span>
                              {!n.read && (
                                <button
                                  onClick={() => markAsRead(n.id)}
                                  className="text-[11px] text-blue-600 hover:underline font-medium"
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 px-4 text-center text-xs text-slate-400">
                          No notifications yet. You will be alerted when your challenges, proposals, or reviews update.
                        </div>
                      )}
                    </div>

                    <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
                      <Link
                        href="/dashboard"
                        onClick={() => setIsNotifOpen(false)}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        View Dashboard Activity &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Auth State Menu */}
            {user ? (
              <div className="flex items-center gap-2.5">
                <Link href="/dashboard">
                  <Badge variant="secondary" className="hidden md:inline-flex cursor-pointer hover:bg-slate-200 text-[11px] font-semibold">
                    {formatEnumToHuman(user.role)}
                  </Badge>
                </Link>

                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <Link
                    href="/dashboard"
                    className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs hover:ring-2 hover:ring-blue-300 transition-all"
                    title="User Profile"
                  >
                    {user.fullName.charAt(0).toUpperCase()}
                  </Link>
                  <span className="hidden lg:inline text-xs font-semibold text-slate-800 max-w-[130px] truncate">
                    {user.fullName}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => logout()} title="Sign out" className="p-1.5 hover:bg-rose-50">
                    <LogOut className="w-4 h-4 text-slate-400 hover:text-rose-600 transition-colors" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <Link href="/login">
                  <Button variant="outline" size="sm" className="px-2.5 sm:px-3 text-xs">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" className="hidden sm:inline-block">
                  <Button size="sm" className="px-2.5 sm:px-3 text-xs">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Command Palette */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
