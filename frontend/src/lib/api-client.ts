import { ApiResponse, ApiError, StandardErrorCode } from '@sicp/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiClient {
  private accessToken: string | null = null;

  public setToken(token: string | null) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('sicp_access_token', token);
      } else {
        localStorage.removeItem('sicp_access_token');
      }
    }
  }

  public getToken(): string | null {
    if (!this.accessToken && typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('sicp_access_token');
    }
    return this.accessToken;
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-Id': `fe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // sends refresh cookie
      });

      // Handle 401: attempt token refresh if user had a token and not on auth endpoints
      if (
        response.status === 401 &&
        !endpoint.includes('/auth/login') &&
        !endpoint.includes('/auth/refresh') &&
        !endpoint.includes('/auth/me') &&
        Boolean(this.getToken())
      ) {
        const refreshSuccess = await this.refreshToken();
        if (refreshSuccess) {
          headers['Authorization'] = `Bearer ${this.getToken()}`;
          const retryResponse = await fetch(url, { ...options, headers, credentials: 'include' });
          return await retryResponse.json();
        }
      }

      const data: ApiResponse<T> = await response.json();
      return data;
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: StandardErrorCode.INTERNAL_ERROR,
          message: (err as Error).message || 'Network communication error',
        },
        meta: {
          requestId: headers['X-Request-Id'],
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const payload: ApiResponse<{ accessToken: string }> = await res.json();
        if (payload.success && payload.data?.accessToken) {
          this.setToken(payload.data.accessToken);
          return true;
        }
      }
    } catch {
      // Refresh failed
    }
    this.setToken(null);
    return false;
  }
}

export const apiClient = new ApiClient();
