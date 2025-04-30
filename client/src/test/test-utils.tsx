import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/use-auth';
import { vi } from 'vitest';

// Create a custom render method that includes necessary providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    ),
    ...options,
  });
};

// Mock for the useLocation hook from wouter
const mockUseLocation = (location = "/") => {
  vi.mock("wouter", () => ({
    ...vi.importActual("wouter"),
    useLocation: vi.fn(() => [location, vi.fn()]),
  }));
};

// Re-export everything from react-testing-library
export * from '@testing-library/react';

// Override the render method with our custom version
export { customRender as render, mockUseLocation };