import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ReactElement, ReactNode } from 'react';
import { vi } from 'vitest';

// Create a custom query client for testing
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0
      }
    }
  });

interface AllProvidersProps {
  children: ReactNode;
}

// Wrapper with all providers
const AllProviders = ({ children }: AllProvidersProps) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null })
  }))
};

// Mock user data
export const mockUser = {
  id: 'test-user-id',
  phone_number: '+265991234567',
  name: 'Test User',
  wallet_balance: 1000,
  trust_score: 75,
  language: 'en'
};

// Mock group data
export const mockGroup = {
  id: 'test-group-id',
  name: 'Test Group',
  amount: 5000,
  frequency: 'monthly',
  status: 'active',
  member_count: 10,
  max_members: 20
};

// Mock transaction data
export const mockTransaction = {
  id: 'test-transaction-id',
  user_id: 'test-user-id',
  type: 'contribution',
  amount: 5000,
  status: 'completed',
  created_at: new Date().toISOString()
};
