import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import WorkItemSummary from "@/components/work-item-summary";
import { UserRole } from "@shared/schema";

// Define the types for the data we expect from the API
type User = {
  id: number;
  username: string;
  name: string;
  role: string;
};

type Store = {
  id: number;
  name: string;
  location: string;
};

type WorkItem = {
  id: number;
  title: string;
  description: string | null;
  type: string;
  userId: number;
  storeId: number;
  storeAssignmentId: number;
  dueDate: string;
  priority: string;
  status: string;
  completedAt: string | null;
  notes: string | null;
  attachments: string[];
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  user?: User;
  store?: Store;
};

const WorkItemSummaryPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute<{ id: string }>("/work-item-summary/:id");
  const workItemId = parseInt(params?.id || "0");

  // Redirect if no match or invalid ID
  if (!match || isNaN(workItemId) || workItemId <= 0) {
    setLocation("/my-assignments");
    return null;
  }

  // Fetch work item details
  const { 
    data: workItem, 
    isLoading: isLoadingWorkItem,
    error: workItemError
  } = useQuery({
    queryKey: [`/api/work-items/${workItemId}`],
    enabled: !!user && !!workItemId
  });

  // Fetch related stock take data if it exists
  const { 
    data: stockTake,
    isLoading: isLoadingStockTake
  } = useQuery({
    queryKey: [`/api/stock-takes/by-work-item/${workItemId}`],
    enabled: !!workItem && !!workItemId
  });

  // Fetch related merchandising data if it exists
  const { 
    data: merchandising,
    isLoading: isLoadingMerchandising
  } = useQuery({
    queryKey: [`/api/merchandising/by-work-item/${workItemId}`],
    enabled: !!workItem && !!workItemId
  });

  // Fetch related competitor merchandising data if it exists
  const { 
    data: competitorMerchandising,
    isLoading: isLoadingCompetitorMerchandising
  } = useQuery({
    queryKey: [`/api/competitor-merchandising/by-work-item/${workItemId}`],
    enabled: !!workItem && !!workItemId
  });

  // Fetch related order data if it exists
  const { 
    data: order,
    isLoading: isLoadingOrder
  } = useQuery({
    queryKey: [`/api/orders/by-work-item/${workItemId}`],
    enabled: !!workItem && !!workItemId
  });

  // Handle errors
  if (workItemError) {
    toast({
      title: "Error",
      description: "Failed to load work item details. Please try again.",
      variant: "destructive",
    });
    setLocation("/my-assignments");
    return null;
  }

  // Show loading state
  if (isLoadingWorkItem || isLoadingStockTake || isLoadingMerchandising || 
      isLoadingCompetitorMerchandising || isLoadingOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading work item summary...</p>
        </div>
      </div>
    );
  }

  // If work item doesn't exist, redirect
  if (!workItem) {
    toast({
      title: "Work Item Not Found",
      description: "The requested work item could not be found.",
      variant: "destructive",
    });
    setLocation("/my-assignments");
    return null;
  }

  // Make sure user has permission to view this work item
  if (user?.role !== UserRole.ADMIN && user?.role !== UserRole.MANAGER && workItem?.userId !== user?.id) {
    toast({
      title: "Access Denied",
      description: "You don't have permission to view this work item.",
      variant: "destructive",
    });
    setLocation("/my-assignments");
    return null;
  }

  return (
    <WorkItemSummary
      workItem={workItem}
      stockTake={stockTake}
      merchandising={merchandising}
      competitorMerchandising={competitorMerchandising}
      order={order}
    />
  );
};

export default WorkItemSummaryPage;