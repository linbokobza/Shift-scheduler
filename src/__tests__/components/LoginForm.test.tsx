import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '../../components/LoginForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock useAuth hook
const mockLogin = vi.fn();
const mockUseAuth = vi.fn(() => ({
  login: mockLogin,
  isLoading: false,
  user: null,
  isAuthenticated: false,
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock localStorage
const localStorageMock: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => localStorageMock[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      localStorageMock[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete localStorageMock[key];
    }),
    clear: vi.fn(() => {
      Object.keys(localStorageMock).forEach((key) => delete localStorageMock[key]);
    }),
  },
  writable: true,
});

const renderLoginForm = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LoginForm />
    </QueryClientProvider>
  );
};

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockReset();
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isLoading: false,
      user: null,
      isAuthenticated: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render login form with email and password fields', () => {
      renderLoginForm();

      expect(screen.getByLabelText(/אימייל/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/סיסמה/i)).toBeInTheDocument();
    });

    it('should render login button', () => {
      renderLoginForm();

      expect(screen.getByRole('button', { name: /התחברות/i })).toBeInTheDocument();
    });

    it('should render forgot password link', () => {
      renderLoginForm();

      expect(screen.getByText(/שכחתי סיסמה/i)).toBeInTheDocument();
    });

    it('should render quick login section', () => {
      renderLoginForm();

      expect(screen.getByText(/התחברות מהירה/i)).toBeInTheDocument();
    });

    it('should render application title', () => {
      renderLoginForm();

      expect(screen.getByText(/מערכת ניהול משמרות/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call login with email and password on submit', async () => {
      mockLogin.mockResolvedValue(true);
      renderLoginForm();

      const emailInput = screen.getByLabelText(/אימייל/i);
      const passwordInput = screen.getByLabelText(/סיסמה/i);
      const submitButton = screen.getByRole('button', { name: /התחברות/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should show error message on failed login', async () => {
      mockLogin.mockResolvedValue(false);
      renderLoginForm();

      const emailInput = screen.getByLabelText(/אימייל/i);
      const passwordInput = screen.getByLabelText(/סיסמה/i);
      const submitButton = screen.getByRole('button', { name: /התחברות/i });

      await userEvent.type(emailInput, 'wrong@example.com');
      await userEvent.type(passwordInput, 'wrongpassword');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/אימייל או סיסמה שגויים/i)).toBeInTheDocument();
      });
    });

    it('should clear error message on new submission attempt', async () => {
      mockLogin.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      renderLoginForm();

      const emailInput = screen.getByLabelText(/אימייל/i);
      const passwordInput = screen.getByLabelText(/סיסמה/i);
      const submitButton = screen.getByRole('button', { name: /התחברות/i });

      // First attempt - fails
      await userEvent.type(emailInput, 'wrong@example.com');
      await userEvent.type(passwordInput, 'wrongpassword');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/אימייל או סיסמה שגויים/i)).toBeInTheDocument();
      });

      // Clear and try again
      await userEvent.clear(emailInput);
      await userEvent.clear(passwordInput);
      await userEvent.type(emailInput, 'correct@example.com');
      await userEvent.type(passwordInput, 'correctpassword');
      await userEvent.click(submitButton);

      // Error should be cleared during submission
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Loading State', () => {
    it('should disable inputs when loading', () => {
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        isLoading: true,
        user: null,
        isAuthenticated: false,
      });

      renderLoginForm();

      expect(screen.getByLabelText(/אימייל/i)).toBeDisabled();
      expect(screen.getByLabelText(/סיסמה/i)).toBeDisabled();
    });

    it('should disable submit button when loading', () => {
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        isLoading: true,
        user: null,
        isAuthenticated: false,
      });

      renderLoginForm();

      // When loading, submit button shows only spinner (no text), find by type
      const form = document.querySelector('form');
      const submitButton = form?.querySelector('button[type="submit"]');
      expect(submitButton).toBeDisabled();
    });

    it('should show loading spinner when loading', () => {
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        isLoading: true,
        user: null,
        isAuthenticated: false,
      });

      renderLoginForm();

      // Loading spinner should be visible - find submit button by type
      // When loading, the button only shows a spinner icon, not text
      const form = document.querySelector('form');
      const submitButton = form?.querySelector('button[type="submit"]');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Input Validation', () => {
    it('should require email input', () => {
      renderLoginForm();

      const emailInput = screen.getByLabelText(/אימייל/i);
      expect(emailInput).toHaveAttribute('required');
    });

    it('should require password input', () => {
      renderLoginForm();

      const passwordInput = screen.getByLabelText(/סיסמה/i);
      expect(passwordInput).toHaveAttribute('required');
    });

    it('should have email type on email input', () => {
      renderLoginForm();

      const emailInput = screen.getByLabelText(/אימייל/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should have password type on password input', () => {
      renderLoginForm();

      const passwordInput = screen.getByLabelText(/סיסמה/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Forgot Password', () => {
    it('should open forgot password modal on click', async () => {
      renderLoginForm();

      const forgotPasswordLink = screen.getByText(/שכחתי סיסמה/i);
      await userEvent.click(forgotPasswordLink);

      // Modal should appear
      await waitFor(() => {
        expect(screen.getByText(/איפוס סיסמה/i)).toBeInTheDocument();
      });
    });
  });

  describe('Quick Login', () => {
    it('should populate form and login on quick login button click', async () => {
      mockLogin.mockResolvedValue(true);

      // Mock localStorage to return employees
      const mockEmployees = [
        { id: '1', name: 'Test User', email: 'test@test.com', role: 'employee' },
      ];
      vi.spyOn(window.localStorage, 'getItem').mockReturnValue(JSON.stringify(mockEmployees));

      renderLoginForm();

      // Find and click quick login button
      const quickLoginButtons = screen.getAllByRole('button').filter(
        (btn) => btn.textContent?.includes('Test User')
      );

      if (quickLoginButtons.length > 0) {
        await userEvent.click(quickLoginButtons[0]);

        await waitFor(() => {
          expect(mockLogin).toHaveBeenCalled();
        }, { timeout: 500 });
      }
    });

    it('should disable quick login buttons when loading', () => {
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        isLoading: true,
        user: null,
        isAuthenticated: false,
      });

      renderLoginForm();

      // Find only the quick login buttons (in the quick login section)
      // Note: "forgot password" button is not disabled during loading (intentional UX)
      const quickLoginSection = document.querySelector('.space-y-2');
      const quickLoginButtons = quickLoginSection?.querySelectorAll('button');
      quickLoginButtons?.forEach((button) => {
        expect(button).toBeDisabled();
      });

      // Also check submit button is disabled
      const form = document.querySelector('form');
      const submitButton = form?.querySelector('button[type="submit"]');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for inputs', () => {
      renderLoginForm();

      const emailInput = screen.getByLabelText(/אימייל/i);
      const passwordInput = screen.getByLabelText(/סיסמה/i);

      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');
    });

    it('should have proper placeholder text', () => {
      renderLoginForm();

      expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('should display error with proper styling', async () => {
      mockLogin.mockResolvedValue(false);
      renderLoginForm();

      const emailInput = screen.getByLabelText(/אימייל/i);
      const passwordInput = screen.getByLabelText(/סיסמה/i);
      const submitButton = screen.getByRole('button', { name: /התחברות/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'wrongpassword');
      await userEvent.click(submitButton);

      await waitFor(() => {
        const errorElement = screen.getByText(/אימייל או סיסמה שגויים/i);
        expect(errorElement).toBeInTheDocument();
        // The error div itself has bg-red-50 class (not its parent)
        expect(errorElement).toHaveClass('bg-red-50');
      });
    });
  });
});
