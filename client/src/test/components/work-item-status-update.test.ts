import { describe, test, expect, vi, beforeEach } from 'vitest';
import * as queryClient from '@/lib/queryClient';

// Define the enum locally for testing purposes since we can't import directly from shared
enum WorkItemStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled"
}

// Mock the queryClient module
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

// Mock toast notification
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('Work Item Status Update', () => {
  // Testing function that mimics the handleStartWorkItem logic
  async function updateWorkItemStatus(workItemId: number, status: string) {
    try {
      await queryClient.apiRequest('PUT', `/api/work-items/${workItemId}/status`, {
        status
      });
      
      queryClient.queryClient.invalidateQueries({ queryKey: ['/api/my-work-items'] });
      queryClient.queryClient.invalidateQueries({ queryKey: ['/api/work-items', workItemId] });
      
      return { success: true };
    } catch (error) {
      console.error("Error updating work item:", error);
      return { success: false, error };
    }
  }
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('successfully updates work item status', async () => {
    // Setup a successful response
    const apiRequestMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true }),
    });
    
    vi.spyOn(queryClient, 'apiRequest').mockImplementation(apiRequestMock);
    
    // Call the function
    const result = await updateWorkItemStatus(1, WorkItemStatus.IN_PROGRESS);
    
    // Verify the API was called with correct parameters
    expect(apiRequestMock).toHaveBeenCalledWith(
      'PUT',
      '/api/work-items/1/status',
      { status: WorkItemStatus.IN_PROGRESS }
    );
    
    // Verify queries were invalidated
    expect(queryClient.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['/api/my-work-items'],
    });
    expect(queryClient.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['/api/work-items', 1],
    });
    
    // Verify result
    expect(result).toEqual({ success: true });
  });

  test('handles API error when updating work item status', async () => {
    // Setup an error response
    const error = new Error('API error');
    const apiRequestMock = vi.fn().mockRejectedValue(error);
    
    vi.spyOn(queryClient, 'apiRequest').mockImplementation(apiRequestMock);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Call the function
    const result = await updateWorkItemStatus(1, WorkItemStatus.IN_PROGRESS);
    
    // Verify the API was called with correct parameters
    expect(apiRequestMock).toHaveBeenCalledWith(
      'PUT',
      '/api/work-items/1/status',
      { status: WorkItemStatus.IN_PROGRESS }
    );
    
    // Verify error was logged
    expect(consoleSpy).toHaveBeenCalledWith('Error updating work item:', error);
    
    // Verify result
    expect(result).toEqual({ success: false, error });
    
    // Verify queries were not invalidated
    expect(queryClient.queryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  test('handles different work item statuses correctly', async () => {
    const apiRequestMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true }),
    });
    
    vi.spyOn(queryClient, 'apiRequest').mockImplementation(apiRequestMock);
    
    // Test with COMPLETED status
    await updateWorkItemStatus(1, WorkItemStatus.COMPLETED);
    expect(apiRequestMock).toHaveBeenCalledWith(
      'PUT',
      '/api/work-items/1/status',
      { status: WorkItemStatus.COMPLETED }
    );
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Test with CANCELLED status
    await updateWorkItemStatus(1, WorkItemStatus.CANCELLED);
    expect(apiRequestMock).toHaveBeenCalledWith(
      'PUT',
      '/api/work-items/1/status',
      { status: WorkItemStatus.CANCELLED }
    );
  });
});