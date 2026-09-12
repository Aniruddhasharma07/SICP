'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { UserDto, UserRole } from '@sicp/shared';
import { apiClient } from './api-client';

export interface RegisterResult {
  success: boolean;
  user?: UserDto;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface OrgRegistrationPayload {
  name: string;
  type?: string;
  sector?: string;
  category?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  website?: string;
  officialEmail?: string;
  contactPhone?: string;
  accreditationDetails?: string;
  registrationNumber?: string;
  departments?: string[];
  researchDomains?: string[];
  facilities?: string[];
  capabilities?: string[];
  supportingDocuments?: any[];
}

interface AuthContextType {
  user: UserDto | null;
  permissions: readonly string[];
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; user?: UserDto; error?: string }>;
  register: (data: {
    email: string;
    pass: string;
    fullName: string;
    role?: UserRole;
    phone?: string;
    organizationId?: string;
    organization?: OrgRegistrationPayload;
  }) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  refreshUser: () => Promise<void>;
  demoSwitch: (universityOrgId: string) => Promise<{ success: boolean; user?: UserDto; error?: string }>;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [permissions, setPermissions] = useState<readonly string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await apiClient.request<{ user: UserDto; permissions: string[] }>('/api/v1/auth/me');
      if (res.success && res.data) {
        setUser(res.data.user);
        setPermissions(res.data.permissions || []);
      } else {
        setUser(null);
        setPermissions([]);
      }
    } catch {
      setUser(null);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    const res = await apiClient.request<{
      user: UserDto;
      accessToken: string;
      permissions: string[];
    }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });

    setIsLoading(false);
    if (res.success && res.data) {
      apiClient.setToken(res.data.accessToken);
      setUser(res.data.user);
      setPermissions(res.data.permissions || []);
      return { success: true, user: res.data.user };
    }
    return { success: false, error: res.error?.message || 'Invalid email or password' };
  };

  const register = async (data: {
    email: string;
    pass: string;
    fullName: string;
    role?: UserRole;
    phone?: string;
    organizationId?: string;
    organization?: OrgRegistrationPayload;
  }): Promise<RegisterResult> => {
    setIsLoading(true);
    const res = await apiClient.request<{
      user: UserDto;
      accessToken: string;
    }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email.trim(),
        password: data.pass,
        fullName: data.fullName.trim(),
        role: data.role || UserRole.CITIZEN,
        phone: data.phone?.trim() || undefined,
        organizationId: data.organizationId?.trim() || undefined,
        organization: data.organization ? {
          ...data.organization,
          name: data.organization.name.trim(),
          officialEmail: data.organization.officialEmail?.trim() || undefined,
        } : undefined,
      }),
    });

    setIsLoading(false);
    if (res.success && res.data) {
      apiClient.setToken(res.data.accessToken);
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    }

    // Parse field-level validation errors from details array
    const fieldErrors: Record<string, string> = {};
    if (res.error?.details && Array.isArray(res.error.details)) {
      for (const d of res.error.details as Array<{ field?: string; message?: string }>) {
        if (d.field && d.message) {
          fieldErrors[d.field] = d.message;
        }
      }
    }

    return {
      success: false,
      error: res.error?.message || 'Registration failed. Please check the form fields.',
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
    };
  };

  const logout = async () => {
    await apiClient.request('/api/v1/auth/logout', { method: 'POST' });
    apiClient.setToken(null);
    setUser(null);
    setPermissions([]);
  };

  const demoSwitch = async (universityOrgId: string) => {
    setIsLoading(true);
    const res = await apiClient.request<{
      user: UserDto;
      accessToken: string;
      refreshToken: string;
      permissions: string[];
    }>('/api/v1/auth/demo-switch', {
      method: 'POST',
      body: JSON.stringify({ universityOrgId }),
    });

    setIsLoading(false);
    if (res.success && res.data) {
      apiClient.setToken(res.data.accessToken);
      setUser(res.data.user);
      setPermissions(res.data.permissions || []);
      return { success: true, user: res.data.user };
    }
    return { success: false, error: res.error?.message || 'Failed to switch institution' };
  };

  const hasPermission = (permission: string) => {
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isLoading,
        login,
        register,
        logout,
        hasPermission,
        refreshUser: fetchCurrentUser,
        demoSwitch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
