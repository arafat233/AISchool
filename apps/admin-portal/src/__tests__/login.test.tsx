import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from '../app/login/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn() }),
}));

// Mock API
jest.mock('../lib/api', () => ({
  api: {
    post: jest.fn(),
    interceptors: { response: { use: jest.fn() }, request: { use: jest.fn() } },
  },
}));

// Mock auth store
jest.mock('@/store/auth.store', () => ({
  useAuthStore: () => ({
    setTokens: jest.fn(),
    accessToken: null,
    getState: () => ({ accessToken: null, setAccessToken: jest.fn(), logout: jest.fn() }),
  }),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  default: { error: jest.fn(), success: jest.fn() },
  error: jest.fn(),
  success: jest.fn(),
}));

import { api } from '../lib/api';
const mockApi = api as jest.Mocked<typeof api>;

function renderWithQuery(component: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{component}</QueryClientProvider>);
}

describe('Admin Portal Login Page', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders email and password fields', () => {
    renderWithQuery(<LoginPage />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty submission', async () => {
    renderWithQuery(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/email is required|invalid email/i)).toBeInTheDocument();
    });
  });

  it('calls login API with email and password', async () => {
    (mockApi.post as jest.Mock).mockResolvedValueOnce({
      data: { accessToken: 'tok123', user: { id: '1', role: 'ADMIN' } },
    });
    renderWithQuery(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'admin@school.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Admin@123!' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith(
        expect.stringContaining('login'),
        expect.objectContaining({ email: 'admin@school.com', password: 'Admin@123!' }),
        expect.anything()
      );
    });
  });

  it('shows error message on invalid credentials', async () => {
    (mockApi.post as jest.Mock).mockRejectedValueOnce({
      response: { data: { message: 'Invalid credentials' } },
    });
    renderWithQuery(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'wrong@school.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('has a link to forgot password page', () => {
    renderWithQuery(<LoginPage />);
    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute('href', '/forgot-password');
  });
});
