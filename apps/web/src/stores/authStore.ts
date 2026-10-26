import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '../services/api';
import { User, Role, LoginDto, RegisterDto } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
  hasRole: (roles: Role[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', credentials);
          if (response.success && response.data) {
            const { user, accessToken, refreshToken } = response.data;
            api.setTokens(accessToken, refreshToken);
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            throw new Error(response.error?.message || 'Login failed');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/register', data);
          if (response.success && response.data) {
            const { user, accessToken, refreshToken } = response.data;
            api.setTokens(accessToken, refreshToken);
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            throw new Error(response.error?.message || 'Registration failed');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Registration failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const { user } = get();
        if (user) {
          try {
            await api.post('/auth/logout', {});
          } catch {
            // Ignore logout errors
          }
        }
        api.clearTokens();
        set({ user: null, isAuthenticated: false });
      },

      refreshProfile: async () => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) return;

        set({ isLoading: true });
        try {
          const response = await api.get<User>('/auth/me');
          if (response.success && response.data) {
            set({ user: response.data, isLoading: false });
          } else {
            // Token invalid, logout
            get().logout();
          }
        } catch {
          get().logout();
        }
      },

      // Only notify subscribers when there is something to clear, otherwise
      // calling this during a render/effect would loop forever.
      clearError: () => {
        if (get().error !== null) {
          set({ error: null });
        }
      },

      hasRole: (roles) => {
        const { user } = get();
        return user ? roles.includes(user.role) : false;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize auth on app load
export const initAuth = async () => {
  const { isAuthenticated, refreshProfile } = useAuthStore.getState();
  if (isAuthenticated && api.getAccessToken()) {
    await refreshProfile();
  }
};