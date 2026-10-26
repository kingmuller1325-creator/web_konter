// API service with automatic token handling
import { ApiResponse, ApiError } from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api/v1';

export interface RequestOptions extends RequestInit {
  /** Set to true to skip the global 401 refresh/retry flow. */
  skipAuthRefresh?: boolean;
}

class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  getAccessToken() {
    return this.accessToken;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${endpoint}`;
    const { skipAuthRefresh, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      ...(fetchOptions.body ? { 'Content-Type': 'application/json' } : {}),
      ...((fetchOptions.headers as Record<string, string>) || {}),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const config: RequestInit = {
      ...fetchOptions,
      headers,
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 - try to refresh token (once)
      if (response.status === 401 && this.refreshToken && !skipAuthRefresh) {
        const newAccessToken = await this.refreshAccessToken();
        if (newAccessToken) {
          headers['Authorization'] = `Bearer ${newAccessToken}`;
          const retryResponse = await fetch(url, { ...config, headers });
          return this.handleResponse<T>(retryResponse);
        }
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
        },
      };
    }
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      let error: ApiError = {
        code: `HTTP_${response.status}`,
        message: this.defaultMessageForStatus(response.status),
      };

      if (isJson) {
        try {
          const data = await response.json();
          if (data?.error) {
            error = {
              code: data.error.code || error.code,
              message: data.error.message || error.message,
              details: data.error.details,
            };
          } else if (data?.message) {
            error.message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
          }
        } catch {
          // Keep default error
        }
      }

      return { success: false, error };
    }

    if (isJson) {
      return response.json();
    }

    return { success: true, data: undefined as T };
  }

  private defaultMessageForStatus(status: number): string {
    if (status === 401) return 'Sesi Anda telah berakhir. Silakan masuk kembali.';
    if (status === 403) return 'Anda tidak memiliki izin untuk tindakan ini.';
    if (status === 404) return 'Data tidak ditemukan.';
    if (status >= 500) return 'Terjadi kesalahan pada server.';
    return `Permintaan gagal (HTTP ${status}).`;
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string | null> {
    if (!this.refreshToken) return null;

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return null;
      }

      const data = await response.json();
      if (data.success && data.data?.accessToken) {
        this.setTokens(data.data.accessToken, data.data.refreshToken || this.refreshToken);
        return data.data.accessToken;
      }

      this.clearTokens();
      return null;
    } catch {
      return null;
    }
  }

  // Convenience methods
  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, data?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  }

  patch<T>(endpoint: string, data?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiService();

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Terjadi kesalahan. Silakan coba lagi.';
}
