import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuthProvider, useAuth, AuthContext } from '../../hooks/useAuth';
import { authAPI } from '../../api';
import React from 'react';

// Mock the authAPI module
vi.mock('../../api', () => ({
  authAPI: {
    login: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    updatePassword: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock: Record<string, string> = {};
const localStorageGetItem = vi.fn((key: string) => localStorageMock[key] || null);
const localStorageSetItem = vi.fn((key: string, value: string) => {
  localStorageMock[key] = value;
});
const localStorageRemoveItem = vi.fn((key: string) => {
  delete localStorageMock[key];
});
const localStorageClear = vi.fn(() => {
  Object.keys(localStorageMock).forEach((key) => delete localStorageMock[key]);
});

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: localStorageGetItem,
    setItem: localStorageSetItem,
    removeItem: localStorageRemoveItem,
    clear: localStorageClear,
  },
  writable: true,
});

describe('useAuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should start with isLoading true', async () => {
      vi.mocked(authAPI.getMe).mockResolvedValue({
        user: null,
      } as any);

      const { result } = renderHook(() => useAuthProvider());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should start with user null when no token', async () => {
      const { result } = renderHook(() => useAuthProvider());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it('should restore user from token if valid', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@test.com',
        role: 'employee' as const,
      };

      localStorageSetItem('authToken', 'valid-token');
      vi.mocked(authAPI.getMe).mockResolvedValue({ user: mockUser });

      const { result } = renderHook(() => useAuthProvider());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
    });

    it('should clear token if invalid', async () => {
      localStorageSetItem('authToken', 'invalid-token');
      vi.mocked(authAPI.getMe).mockRejectedValue(new Error('Invalid token'));

      const { result } = renderHook(() => useAuthProvider());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(localStorageRemoveItem).toHaveBeenCalledWith('authToken');
      expect(localStorageRemoveItem).toHaveBeenCalledWith('currentUser');
    });
  });

  describe('login', () => {
    it('should login successfully and store token', async () => {
      const mockResponse = {
        token: 'new-token',
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@test.com',
          role: 'employee' as const,
        },
      };

      vi.mocked(authAPI.login).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuthProvider());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult: boolean = false;
      await act(async () => {
        loginResult = await result.current.login('test@test.com', 'password123');
      });

      expect(loginResult).toBe(true);
      expect(result.current.user).toEqual(mockResponse.user);
      expect(localStorageSetItem).toHaveBeenCalledWith('authToken', 'new-token');
      expect(localStorageSetItem).toHaveBeenCalledWith('currentUser', JSON.stringify(mockResponse.user));
    });

    it('should return false on login failure', async () => {
      vi.mocked(authAPI.login).mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuthProvider());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loginResult: boolean = true;
      await act(async () => {
        loginResult = await result.current.login('wrong@test.com', 'wrongpassword');
      });

      expect(loginResult).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should set isLoading during login', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      vi.mocked(authAPI.login).mockReturnValue(loginPromise as any);

      const { result } = renderHook(() => useAuthProvider());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.login('test@test.com', 'password123');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveLogin!({
          token: 'token',
          user: { id: '1', name: 'Test', email: 'test@test.com', role: 'employee' },
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('logout', () => {
    it('should clear user and token on logout', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@test.com',
        role: 'employee' as const,
      };

      localStorageSetItem('authToken', 'valid-token');
      vi.mocked(authAPI.getMe).mockResolvedValue({ user: mockUser });
      vi.mocked(authAPI.logout).mockResolvedValue({} as any);

      const { result } = renderHook(() => useAuthProvider());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(localStorageRemoveItem).toHaveBeenCalledWith('authToken');
      expect(localStorageRemoveItem).toHaveBeenCalledWith('currentUser');
    });

    it('should clear state even if API logout fails', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@test.com',
        role: 'employee' as const,
      };

      localStorageSetItem('authToken', 'valid-token');
      vi.mocked(authAPI.getMe).mockResolvedValue({ user: mockUser });
      vi.mocked(authAPI.logout).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuthProvider());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.logout();
      });

      // State should still be cleared
      expect(result.current.user).toBeNull();
      expect(localStorageRemoveItem).toHaveBeenCalledWith('authToken');
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      vi.mocked(authAPI.updatePassword).mockResolvedValue({
        message: 'Password updated successfully',
      });

      const { result } = renderHook(() => useAuthProvider());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updateResult: boolean = false;
      await act(async () => {
        updateResult = await result.current.updatePassword('oldpass', 'newpass');
      });

      expect(updateResult).toBe(true);
      expect(authAPI.updatePassword).toHaveBeenCalledWith('oldpass', 'newpass');
    });

    it('should return false on update password failure', async () => {
      vi.mocked(authAPI.updatePassword).mockRejectedValue(new Error('Wrong current password'));

      const { result } = renderHook(() => useAuthProvider());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let updateResult: boolean = true;
      await act(async () => {
        updateResult = await result.current.updatePassword('wrongpass', 'newpass');
      });

      expect(updateResult).toBe(false);
    });

    it('should set isLoading during password update', async () => {
      let resolveUpdate: (value: any) => void;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });

      vi.mocked(authAPI.updatePassword).mockReturnValue(updatePromise as any);

      const { result } = renderHook(() => useAuthProvider());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updatePassword('oldpass', 'newpass');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveUpdate!({ message: 'Password updated' });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});

describe('useAuth', () => {
  it('should throw error when used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });

  it('should return context value when inside AuthProvider', () => {
    const mockValue = {
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      updatePassword: vi.fn(),
      isLoading: false,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthContext.Provider, { value: mockValue }, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toEqual(mockValue);
  });
});

describe('Security Considerations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageClear();
  });

  it('should not expose sensitive data in state', async () => {
    const mockResponse = {
      token: 'secret-token',
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@test.com',
        role: 'employee' as const,
      },
    };

    vi.mocked(authAPI.login).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAuthProvider());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.login('test@test.com', 'password123');
    });

    // User object should not contain token or password
    expect(result.current.user).not.toHaveProperty('token');
    expect(result.current.user).not.toHaveProperty('password');
  });

  it('should clear all auth data on logout', async () => {
    localStorageSetItem('authToken', 'token');
    localStorageSetItem('currentUser', JSON.stringify({ id: '1' }));
    vi.mocked(authAPI.getMe).mockResolvedValue({
      user: { id: '1', name: 'Test', email: 'test@test.com', role: 'employee' },
    });
    vi.mocked(authAPI.logout).mockResolvedValue({} as any);

    const { result } = renderHook(() => useAuthProvider());

    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(localStorageRemoveItem).toHaveBeenCalledWith('authToken');
    expect(localStorageRemoveItem).toHaveBeenCalledWith('currentUser');
    expect(result.current.user).toBeNull();
  });
});
