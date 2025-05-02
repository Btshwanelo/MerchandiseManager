import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Setting } from "@shared/schema";
import { useToast } from "./use-toast";

export function useSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all settings
  const {
    data: settings,
    isLoading,
    error,
  } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/settings");
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to fetch settings: ${text}`);
      }
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
  });

  // Get a specific setting
  const getSetting = (key: string) => {
    return useQuery<Setting>({
      queryKey: ["/api/settings", key],
      queryFn: async () => {
        const response = await apiRequest("GET", `/api/settings/${key}`);
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Failed to fetch setting: ${text}`);
        }
        return response.json();
      },
      staleTime: 60 * 1000, // 1 minute
    });
  };

  // Create a new setting
  const createSettingMutation = useMutation({
    mutationFn: async (newSetting: { key: string; value: any; description?: string }) => {
      const response = await apiRequest("POST", "/api/settings", newSetting);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create setting");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Success",
        description: "Setting created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update a setting
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const response = await apiRequest("PUT", `/api/settings/${key}`, { value });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update setting");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings", variables.key] });
      toast({
        title: "Success",
        description: "Setting updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete a setting
  const deleteSettingMutation = useMutation({
    mutationFn: async (key: string) => {
      const response = await apiRequest("DELETE", `/api/settings/${key}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete setting");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings", variables] });
      toast({
        title: "Success",
        description: "Setting deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    settings,
    isLoading,
    error,
    getSetting,
    createSetting: createSettingMutation.mutate,
    updateSetting: updateSettingMutation.mutate,
    deleteSetting: deleteSettingMutation.mutate,
    createSettingPending: createSettingMutation.isPending,
    updateSettingPending: updateSettingMutation.isPending,
    deleteSettingPending: deleteSettingMutation.isPending,
  };
}