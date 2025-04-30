import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ProcessForm from '@/pages/process-form';
import * as queryClient from '@/lib/queryClient';
import * as wouter from 'wouter';

// Define WorkItemStatus enum locally for testing purposes
enum WorkItemStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled"
}

// Define types for mock functions
type QueryKey = string | readonly unknown[];
interface QueryOptions {
  queryKey: QueryKey;
  enabled?: boolean;
}

// Mock the useAuth hook
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'merchandiser' },
  }),
}));

// Mock the useToast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock dependencies
vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual('@/lib/queryClient');
  return {
    ...actual,
    apiRequest: vi.fn(),
    queryClient: {
      invalidateQueries: vi.fn(),
    },
  };
});

// Mock wouter's useLocation hook
vi.mock('wouter', async () => {
  const actual = await vi.importActual('wouter');
  return {
    ...actual,
    useLocation: () => {
      return [
        '?workItemId=1&storeId=1',
        vi.fn(),
      ];
    },
  };
});

// Mock React Query
vi.mock('@tanstack/react-query', () => {
  return {
    useQuery: ({ queryKey, enabled }: QueryOptions) => {
      // Mock work item data
      if (queryKey[0] === '/api/work-items') {
        return {
          data: {
            id: 1,
            userId: 1,
            title: 'Test Work Item',
            status: WorkItemStatus.PENDING,
            dueDate: '2025-05-01',
            storeId: 1,
            type: 'stock_take',
          },
          isLoading: false,
          error: null,
        };
      }
      
      // Mock store data
      if (queryKey[0] === '/api/stores') {
        return {
          data: {
            id: 1,
            name: 'Test Store',
            location: 'Test Location',
          },
          isLoading: false,
          error: null,
        };
      }
      
      // Mock products data
      if (queryKey[0] === '/api/products') {
        return {
          data: [
            {
              id: 1,
              name: 'Test Product',
              sku: 'TEST123',
              price: 1000,
              minStockLevel: 5,
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
    },
    useMutation: () => {
      return {
        mutate: vi.fn(),
        isPending: false,
      };
    },
    QueryClient: vi.fn(),
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

describe('ProcessForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders the process form with progress stepper', async () => {
    const { container } = render(<ProcessForm />);
    
    // Wait for component to be fully rendered
    await waitFor(() => {
      expect(container.querySelector('.grid-cols-4')).toBeInTheDocument();
    });
    
    // Check if the progress stepper descriptions are rendered (these are more unique)
    expect(screen.getByText('Stock taking at shelf or Store')).toBeInTheDocument();
    expect(screen.getByText('Promotions for any of our products')).toBeInTheDocument();
    expect(screen.getByText('Any promotions from competitors')).toBeInTheDocument();
    expect(screen.getByText('Orders of stock that is depleted etc')).toBeInTheDocument();
  });

  test('clicking start work button calls the API with correct arguments', async () => {
    // Setup mock implementation for apiRequest
    const apiRequestMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: true }),
    });
    
    vi.spyOn(queryClient, 'apiRequest').mockImplementation(apiRequestMock);
    
    render(<ProcessForm />);
    
    // Find and click the "Start Work" button
    await waitFor(() => {
      expect(screen.getByText('Start Work')).toBeInTheDocument();
    });
    
    await act(async () => {
      fireEvent.click(screen.getByText('Start Work'));
    });
    
    // Verify that apiRequest was called with the correct arguments
    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        'PUT',
        '/api/work-items/1/status',
        { status: WorkItemStatus.IN_PROGRESS }
      );
    });
    
    // Verify that invalidateQueries was called to refresh data
    expect(queryClient.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['/api/my-work-items'],
    });
    expect(queryClient.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['/api/work-items', 1],
    });
  });

  test('progress stepper is displayed correctly', async () => {
    // Render the component
    const { container } = render(<ProcessForm />);
    
    // Wait for component to be fully rendered with stepper visible
    await waitFor(() => {
      const stepper = container.querySelector('.grid-cols-4');
      expect(stepper).toBeInTheDocument();
    });
    
    // Get the progress bars by their CSS class
    const progressBars = container.querySelectorAll('.h-2');
    
    // Verify we have the right number of progress steps
    expect(progressBars.length).toBe(4);
    
    // Check that the first step is highlighted initially
    // This verifies that the progress stepper is working with active highlighting
    expect(progressBars[0].className).toContain('bg-blue-600');
  });
});