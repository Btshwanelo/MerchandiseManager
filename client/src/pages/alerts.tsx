import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert as AlertComponent } from "@/components/ui/alert";
import { AlertCircle, Filter, Loader2, Search, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Alert } from "@shared/schema";
import { isFeatureEnabled, FeatureFlags } from "@/config/feature-flags";

const AlertsPage = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("active");

  // Fetch alerts
  const { data: alerts, isLoading, error } = useQuery<(Alert & { product: any; store: any })[]>({
    queryKey: ["/api/alerts"],
  });

  // Resolve alert mutation
  const resolveMutation = useMutation({
    mutationFn: async (alertId: number) => {
      const res = await apiRequest("POST", `/api/alerts/${alertId}/resolve`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({
        title: "Alert resolved",
        description: "The alert has been successfully resolved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to resolve alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleResolveAlert = (alertId: number) => {
    resolveMutation.mutate(alertId);
  };

  // Filter alerts based on search query and tab
  const filteredAlerts = alerts?.filter((alert) => {
    const matchesSearch =
      alert.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "all") return matchesSearch;
    return matchesSearch && alert.status === activeTab;
  });

  // Alert type badge color
  const getAlertTypeBadge = (type: string) => {
    switch (type) {
      case "low_stock":
        return <Badge className="bg-warning text-warning-foreground">Low Stock</Badge>;
      case "expired":
        return <Badge className="bg-destructive text-destructive-foreground">Expired</Badge>;
      case "damaged":
        return <Badge className="bg-destructive text-destructive-foreground">Damaged</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Alerts & Notifications</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Manage Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search alerts..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="active">Active Alerts</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
              <TabsTrigger value="all">All Alerts</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <AlertComponent variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="ml-2">Failed to load alerts. Please try again.</span>
                </AlertComponent>
              ) : filteredAlerts?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-4 p-4 bg-muted rounded-full">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                  <h3 className="text-lg font-medium">No alerts found</h3>
                  <p className="text-muted-foreground mt-1">
                    {activeTab === "active" 
                      ? "There are no active alerts at the moment" 
                      : "No alerts match your search criteria"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Using sample data until connected to API */}
                  {[
                    {
                      id: 1,
                      type: "low_stock",
                      productId: 1,
                      storeId: 23,
                      message: "Low stock for Premium Coffee Beans: 3 units remaining",
                      status: "active",
                      createdAt: new Date(new Date().setHours(new Date().getHours() - 2)),
                      product: { id: 1, name: "Premium Coffee Beans", minStockLevel: 25 },
                      store: { id: 23, name: "Store #23" }
                    },
                    {
                      id: 2,
                      type: "low_stock",
                      productId: 2,
                      storeId: 8,
                      message: "Low stock for Organic Honey 12oz: 14 units remaining",
                      status: "active",
                      createdAt: new Date(new Date().setHours(new Date().getHours() - 5)),
                      product: { id: 2, name: "Organic Honey 12oz", minStockLevel: 50 },
                      store: { id: 8, name: "Store #08" }
                    },
                    {
                      id: 3,
                      type: "low_stock",
                      productId: 3,
                      storeId: 12,
                      message: "Low stock for Whole Grain Bread: 8 units remaining",
                      status: "active",
                      createdAt: new Date(new Date().setDate(new Date().getDate() - 1)),
                      product: { id: 3, name: "Whole Grain Bread", minStockLevel: 25 },
                      store: { id: 12, name: "Store #12" }
                    }
                  ].map(alert => (
                    <div 
                      key={alert.id} 
                      className={`p-4 rounded-lg border ${
                        alert.type === "low_stock" 
                          ? "bg-warning/5 border-warning/20" 
                          : "bg-destructive/5 border-destructive/20"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center">
                            {getAlertTypeBadge(alert.type)}
                            <span className="ml-2 text-sm text-muted-foreground">
                              {formatDate(alert.createdAt)}
                            </span>
                          </div>
                          <h3 className="text-lg font-medium mt-2">{alert.product.name}</h3>
                          <p className="text-muted-foreground">{alert.store.name}</p>
                          <p className="mt-1">{alert.message}</p>
                        </div>
                        <Button 
                          variant="outline"
                          onClick={() => handleResolveAlert(alert.id)}
                          disabled={resolveMutation.isPending && resolveMutation.variables === alert.id}
                        >
                          {resolveMutation.isPending && resolveMutation.variables === alert.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                          )}
                          Resolve
                        </Button>
                      </div>

                      {alert.type === "low_stock" && (
                        <div className="mt-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Current Stock: {alert.message.match(/\d+/)?.[0] || "0"} units</span>
                            <span>Minimum: {alert.product.minStockLevel} units</span>
                          </div>
                          <Progress 
                            value={
                              parseInt(alert.message.match(/\d+/)?.[0] || "0") / 
                              alert.product.minStockLevel * 100
                            } 
                            className="h-2" 
                            indicatorClassName={
                              parseInt(alert.message.match(/\d+/)?.[0] || "0") < 
                              alert.product.minStockLevel * 0.5
                                ? "bg-destructive"
                                : "bg-warning"
                            }
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertsPage;
