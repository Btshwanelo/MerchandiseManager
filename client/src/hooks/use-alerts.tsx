import { createContext, ReactNode, useContext, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { isFeatureEnabled, FeatureFlags } from "@/config/feature-flags";

// Enum that matches the backend AlertType
export enum AlertType {
  WORK_ITEM_COMPLETED = "work_item_completed",
  STORE_ASSIGNED = "store_assigned",
  WORK_ITEM_ASSIGNED = "work_item_assigned",
  DUE_DATE_APPROACHING = "due_date_approaching"
}

// Enum that matches the backend AlertStatus
export enum AlertStatus {
  UNREAD = "unread",
  READ = "read"
}

// Interface for the alert data
export interface UserAlert {
  id: number;
  userId: number;
  type: AlertType;
  message: string;
  relatedItemId: number | null;
  status: AlertStatus;
  createdAt: string; // ISO date string
}

// Context type for alerts
type AlertsContextType = {
  alerts: UserAlert[];
  unreadAlerts: UserAlert[];
  isLoading: boolean;
  error: Error | null;
  markAsRead: (alertId: number) => void;
  deleteAlert: (alertId: number) => void;
  refetchAlerts: () => void;
};

// Create context
export const AlertsContext = createContext<AlertsContextType | null>(null);

// Provider component
export function AlertsProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const alertsEnabled = isFeatureEnabled(FeatureFlags.ENABLE_USER_ALERTS);

  // Query to get all alerts for the current user
  const {
    data: alerts = [],
    error,
    isLoading,
    refetch: refetchAlerts
  } = useQuery<UserAlert[], Error>({
    queryKey: ["/api/user-alerts", lastRefreshed],
    queryFn: async () => {
      if (!user || !alertsEnabled) return [];
      const res = await fetch("/api/user-alerts");
      if (!res.ok) {
        throw new Error("Failed to fetch alerts");
      }
      return res.json();
    },
    enabled: !!user && alertsEnabled, // Only run query if user is logged in and alerts are enabled
  });

  // Query to get unread alerts
  const {
    data: unreadAlerts = [],
    refetch: refetchUnreadAlerts
  } = useQuery<UserAlert[], Error>({
    queryKey: ["/api/user-alerts/unread", lastRefreshed],
    queryFn: async () => {
      if (!user || !alertsEnabled) return [];
      const res = await fetch("/api/user-alerts/unread");
      if (!res.ok) {
        throw new Error("Failed to fetch unread alerts");
      }
      return res.json();
    },
    enabled: !!user && alertsEnabled, // Only run query if user is logged in and alerts are enabled
  });

  // Mutation to mark an alert as read
  const markAsReadMutation = useMutation({
    mutationFn: async (alertId: number) => {
      if (!alertsEnabled) return null; // Don't make API call if alerts are disabled
      
      const res = await fetch(`/api/user-alerts/${alertId}/read`, {
        method: "PATCH",
      });
      if (!res.ok) {
        throw new Error("Failed to mark alert as read");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch alerts
      if (alertsEnabled) {
        queryClient.invalidateQueries({ queryKey: ["/api/user-alerts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user-alerts/unread"] });
        setLastRefreshed(new Date());
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to mark alert as read: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete an alert
  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      if (!alertsEnabled) return null; // Don't make API call if alerts are disabled
      
      const res = await fetch(`/api/user-alerts/${alertId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete alert");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate and refetch alerts
      if (alertsEnabled) {
        queryClient.invalidateQueries({ queryKey: ["/api/user-alerts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user-alerts/unread"] });
        setLastRefreshed(new Date());
        toast({
          title: "Success",
          description: "Alert deleted successfully",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete alert: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mark alert as read handler
  const markAsRead = (alertId: number) => {
    markAsReadMutation.mutate(alertId);
  };

  // Delete alert handler
  const deleteAlert = (alertId: number) => {
    deleteAlertMutation.mutate(alertId);
  };

  // Manual refetch function
  const refreshAlerts = () => {
    refetchAlerts();
    refetchUnreadAlerts();
    setLastRefreshed(new Date());
  };

  return (
    <AlertsContext.Provider
      value={{
        alerts,
        unreadAlerts,
        isLoading,
        error,
        markAsRead,
        deleteAlert,
        refetchAlerts: refreshAlerts,
      }}
    >
      {children}
    </AlertsContext.Provider>
  );
}

// Hook to use the alerts context
export function useAlerts() {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error("useAlerts must be used within an AlertsProvider");
  }
  return context;
}