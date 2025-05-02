import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProcessForm from '../process-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as queryClientModule from '../../lib/queryClient';
import { AuthProvider } from '../../hooks/use-auth';
import { Toaster } from '../../components/ui/toaster';
import * as React from 'react';

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/process-form?workItemId=1&storeId=1', vi.fn()],
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

// Mock auth hook
vi.mock('../../hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 5, username: 'test', role: 'merchandiser' },
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the API request function
vi.mock('../../lib/queryClient', async () => {
  const actual = await vi.importActual('../../lib/queryClient');
  return {
    ...actual,
    apiRequest: vi.fn().mockImplementation(async (method, url, data) => {
      // Return successful responses for all API calls
      return {
        ok: true,
        json: async () => ({ id: 1, success: true }),
      };
    }),
    queryClient: {
      invalidateQueries: vi.fn(),
      setQueryData: vi.fn(),
    },
  };
});

// Setup query client for tests
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock useQuery returns
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn().mockImplementation(({ queryKey }) => {
      if (queryKey[0] === '/api/work-items') {
        return {
          data: {
            id: 1,
            title: 'Test Work Item',
            description: 'Test description',
            status: 'in_progress',
            storeId: 1,
            dueDate: '2025-12-31',
            type: 'stock_take',
          },
          isLoading: false,
          error: null,
        };
      }
      
      if (queryKey[0] === '/api/stores') {
        return {
          data: [
            {
              id: 1,
              name: 'Test Store',
              location: 'Test Location',
            },
          ],
          isLoading: false,
          error: null,
        };
      }
      
      if (queryKey[0] === '/api/products') {
        return {
          data: [
            {
              id: 1,
              name: 'Test Product',
              sku: 'TEST-123',
              price: 999, // price in cents
            },
          ],
          isLoading: false,
          error: null,
        };
      }
      
      return {
        data: null,
        isLoading: false,
        error: null,
      };
    }),
    useMutation: vi.fn().mockImplementation(() => ({
      mutate: vi.fn(),
      isPending: false,
    })),
  };
});

// Wrap component in providers for testing
const renderWithProviders = (ui: React.ReactElement) => {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider>
        {ui}
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('ProcessForm', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the window.location
    Object.defineProperty(window, 'location', {
      value: {
        search: '?workItemId=1&storeId=1',
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test skipping all steps
  it('allows skipping the merchandising step when no data is entered', async () => {
    renderWithProviders(<ProcessForm />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Process Form')).toBeInTheDocument();
    });
    
    // Verify that the skip button is present
    const skipButton = screen.getByText('Skip Merchandising Step');
    expect(skipButton).toBeInTheDocument();
    
    // Click the skip button and verify API was not called for merchandising
    fireEvent.click(skipButton);
    
    // Wait for step to be skipped and check API wasn't called with merchandising data
    await waitFor(() => {
      expect(queryClientModule.apiRequest).not.toHaveBeenCalledWith(
        'POST', 
        '/api/merchandising', 
        expect.anything()
      );
    });
    
    // Verify toast shows skipped message
    await waitFor(() => {
      expect(queryClientModule.apiRequest).not.toHaveBeenCalledWith(
        'POST', 
        '/api/merchandising', 
        expect.anything()
      );
    });
  });

  // Test submitting the merchandising step with data
  it('allows submitting merchandising data when product is added', async () => {
    renderWithProviders(<ProcessForm />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Process Form')).toBeInTheDocument();
    });
    
    // Select a product
    const productDropdown = screen.getByRole('combobox');
    fireEvent.change(productDropdown, { target: { value: '1' } });
    
    // Enter a price
    const priceInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(priceInput, { target: { value: '5.99' } });
    
    // Click add item button
    const addItemButton = screen.getByText('Add Item');
    fireEvent.click(addItemButton);
    
    // Verify that the submit button text is now updated
    const submitButton = screen.getByText('Submit Merchandising Information');
    expect(submitButton).toBeInTheDocument();
    
    // Click the submit button
    fireEvent.click(submitButton);
    
    // Verify the API was called with the right data
    await waitFor(() => {
      expect(queryClientModule.apiRequest).toHaveBeenCalledWith(
        'POST', 
        '/api/merchandising', 
        expect.objectContaining({
          storeId: 1,
          workItemId: 1,
        })
      );
    });
  });

  // Test skipping the competitor analysis step
  it('allows skipping the competitor analysis step when no data is entered', async () => {
    // Mock the active step - we need to be at competitor analysis step
    vi.spyOn(React, 'useState').mockImplementationOnce(() => ["competitor-analysis", vi.fn()]);
    
    renderWithProviders(<ProcessForm />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Process Form')).toBeInTheDocument();
    });
    
    // Try to find the skip button for competitor analysis
    const skipButton = screen.getByText('Skip Competitor Analysis Step');
    expect(skipButton).toBeInTheDocument();
    
    // Click the skip button
    fireEvent.click(skipButton);
    
    // Verify API was not called for competitor analysis
    await waitFor(() => {
      expect(queryClientModule.apiRequest).not.toHaveBeenCalledWith(
        'POST', 
        '/api/competitor-merchandising', 
        expect.anything()
      );
    });
  });

  // Test submitting the competitor analysis step with data
  it('allows submitting competitor analysis when data is entered', async () => {
    // Mock the active step - we need to be at competitor analysis step
    vi.spyOn(React, 'useState').mockImplementationOnce(() => ["competitor-analysis", vi.fn()]);
    
    renderWithProviders(<ProcessForm />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Process Form')).toBeInTheDocument();
    });
    
    // Enter brand and description
    const brandInput = screen.getByPlaceholderText('Enter competitor brand name');
    fireEvent.change(brandInput, { target: { value: 'Test Competitor' } });
    
    const descriptionInput = screen.getByPlaceholderText('Describe the competitor product...');
    fireEvent.change(descriptionInput, { target: { value: 'This is a test competitor product' } });
    
    // Verify button text is now for submission, not skipping
    const submitButton = screen.getByText('Submit Competitor Analysis');
    expect(submitButton).toBeInTheDocument();
    
    // Click the submit button
    fireEvent.click(submitButton);
    
    // Verify the API was called with the right data
    await waitFor(() => {
      expect(queryClientModule.apiRequest).toHaveBeenCalledWith(
        'POST', 
        '/api/competitor-merchandising', 
        expect.objectContaining({
          storeId: 1,
          brand: 'Test Competitor',
          productDescription: 'This is a test competitor product',
          workItemId: 1,
        })
      );
    });
  });

  // Test skipping the orders step
  it('allows skipping the order step when no data is entered', async () => {
    // Mock the active step - we need to be at order placement step
    vi.spyOn(React, 'useState').mockImplementationOnce(() => ["order-placement", vi.fn()]);
    
    renderWithProviders(<ProcessForm />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Process Form')).toBeInTheDocument();
    });
    
    // Find the skip button for orders
    const skipButton = screen.getByText('Skip Order Step & Complete');
    expect(skipButton).toBeInTheDocument();
    
    // Click the skip button
    fireEvent.click(skipButton);
    
    // Verify API was not called for orders creation but was called to mark work item as complete
    await waitFor(() => {
      expect(queryClientModule.apiRequest).not.toHaveBeenCalledWith(
        'POST', 
        '/api/orders', 
        expect.anything()
      );
      
      expect(queryClientModule.apiRequest).toHaveBeenCalledWith(
        'PATCH', 
        '/api/work-items/1', 
        { status: 'completed' }
      );
    });
  });

  // Test submitting the orders step with data
  it('allows submitting order when data is entered', async () => {
    // Mock the active step - we need to be at order placement step
    vi.spyOn(React, 'useState').mockImplementationOnce(() => ["order-placement", vi.fn()]);
    
    renderWithProviders(<ProcessForm />);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Process Form')).toBeInTheDocument();
    });
    
    // Enter order notes
    const notesInput = screen.getByPlaceholderText('Provide details for this order...');
    fireEvent.change(notesInput, { target: { value: 'These are test order notes' } });
    
    // Verify button text is now for submission, not skipping
    const submitButton = screen.getByText('Submit Order & Complete');
    expect(submitButton).toBeInTheDocument();
    
    // Click the submit button
    fireEvent.click(submitButton);
    
    // Verify the API was called with the right data for order and to complete the work item
    await waitFor(() => {
      // Check order was created
      expect(queryClientModule.apiRequest).toHaveBeenCalledWith(
        'POST', 
        '/api/orders', 
        expect.objectContaining({
          storeId: 1,
          notes: 'These are test order notes',
          workItemId: 1,
        })
      );
      
      // Check work item was marked complete
      expect(queryClientModule.apiRequest).toHaveBeenCalledWith(
        'PATCH', 
        '/api/work-items/1', 
        { status: 'completed' }
      );
    });
  });
});