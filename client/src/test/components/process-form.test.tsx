import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProcessForm from '@/pages/process-form';
import { WorkItemStatus } from '@shared/schema';
import * as queryClient from '@/lib/queryClient';
import * as wouter from 'wouter';

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
    useQuery: ({ queryKey, enabled }) => {
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
    QueryClientProvider: ({ children }) => children,
  };
});

describe('ProcessForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders the process form with progress stepper', async () => {
    render(<ProcessForm />);
    
    // Check if the progress stepper is rendered
    expect(screen.getByText('Stock Take')).toBeInTheDocument();
    expect(screen.getByText('Stock taking at shelf or Store')).toBeInTheDocument();
    expect(screen.getByText('Merchandising')).toBeInTheDocument();
    expect(screen.getByText('Promotions for any of our products')).toBeInTheDocument();
    expect(screen.getByText('Competitor Promotions')).toBeInTheDocument();
    expect(screen.getByText('Any promotions from competitors')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
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
    const startButton = screen.getByText('Start Work');
    fireEvent.click(startButton);
    
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

  test('clicking on different tabs updates the progress stepper', async () => {
    render(<ProcessForm />);
    
    // Click on the Merchandising tab
    const merchandisingTab = screen.getByText('Merchandising');
    fireEvent.click(merchandisingTab);
    
    // First two steps should be highlighted (Stock Take and Merchandising)
    const progressBars = document.querySelectorAll('.h-2');
    expect(progressBars[0]).toHaveClass('bg-blue-600');
    expect(progressBars[1]).toHaveClass('bg-blue-600');
    expect(progressBars[2]).not.toHaveClass('bg-blue-600');
    expect(progressBars[3]).not.toHaveClass('bg-blue-600');
    
    // Click on the Competitor tab
    const competitorTab = screen.getByText('Competitor');
    fireEvent.click(competitorTab);
    
    // First three steps should be highlighted
    expect(progressBars[0]).toHaveClass('bg-blue-600');
    expect(progressBars[1]).toHaveClass('bg-blue-600');
    expect(progressBars[2]).toHaveClass('bg-blue-600');
    expect(progressBars[3]).not.toHaveClass('bg-blue-600');
    
    // Click on the Order tab
    const orderTab = screen.getByText('Order');
    fireEvent.click(orderTab);
    
    // All steps should be highlighted
    expect(progressBars[0]).toHaveClass('bg-blue-600');
    expect(progressBars[1]).toHaveClass('bg-blue-600');
    expect(progressBars[2]).toHaveClass('bg-blue-600');
    expect(progressBars[3]).toHaveClass('bg-blue-600');
  });
});