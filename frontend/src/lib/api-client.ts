import { ApiResponse, ApiError, StandardErrorCode } from '@sicp/shared';

function getApiBaseUrl(): string {
  let url = '';
  if (process.env.NEXT_PUBLIC_API_URL) {
    url = process.env.NEXT_PUBLIC_API_URL;
  } else if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === '127.0.0.1') {
      url = 'http://127.0.0.1:5000';
    } else {
      url = 'http://localhost:5000';
    }
  } else {
    url = 'http://localhost:5000';
  }
  return url.replace(/\/+$/, '');
}

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
    const requestId = `fe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
      ...(options.headers as Record<string, string>),
    };

    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const baseUrl = getApiBaseUrl();
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${normalizedEndpoint}`;

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // sends refresh cookie
      });
    } catch (err: unknown) {
      // True network/CORS error (request could not reach server)
      return {
        success: false,
        error: {
          code: StandardErrorCode.INTERNAL_ERROR,
          message: `Unable to connect to SICP Backend (${baseUrl}). Please ensure the backend server is running.`,
        },
        meta: {
          requestId: headers['X-Request-Id'],
          timestamp: new Date().toISOString(),
        },
      };
    }

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
        try {
          const retryResponse = await fetch(url, { ...options, headers, credentials: 'include' });
          if (retryResponse.headers.get('content-type')?.includes('application/json')) {
            return await retryResponse.json();
          }
        } catch {
          // ignore retry failure
        }
      }
    }

    // Parse response body safely
    let data: any = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    }

    if (data && typeof data === 'object' && ('success' in data || 'error' in data)) {
      if (!response.ok && (!data.error || !data.error.message)) {
        data.error = {
          code: response.status === 401 ? StandardErrorCode.UNAUTHORIZED :
                response.status === 403 ? StandardErrorCode.FORBIDDEN :
                response.status >= 500 ? StandardErrorCode.INTERNAL_ERROR : StandardErrorCode.VALIDATION_ERROR,
          message: response.status === 401 ? 'Invalid email or password.' :
                   response.status === 403 ? 'Access denied. You do not have permission for this action.' :
                   response.status >= 500 ? 'SICP Backend encountered an internal server error. Please try again shortly.' :
                   `Request failed with status ${response.status}.`,
        };
      }
      return data as ApiResponse<T>;
    }

    // Non-JSON or fallback error classification
    let fallbackMessage = `Request failed with status ${response.status}.`;
    let errorCode = StandardErrorCode.INTERNAL_ERROR;

    if (response.status === 401) {
      errorCode = StandardErrorCode.UNAUTHORIZED;
      fallbackMessage = 'Invalid email or password.';
    } else if (response.status === 403) {
      errorCode = StandardErrorCode.FORBIDDEN;
      fallbackMessage = 'Access denied. You do not have permission to access this resource.';
    } else if (response.status === 404) {
      errorCode = StandardErrorCode.NOT_FOUND;
      fallbackMessage = 'Requested endpoint not found on SICP Backend.';
    } else if (response.status >= 500) {
      errorCode = StandardErrorCode.INTERNAL_ERROR;
      fallbackMessage = 'SICP Backend encountered an internal server error. Please try again shortly.';
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message: fallbackMessage,
      },
      meta: {
        requestId: headers['X-Request-Id'],
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
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
