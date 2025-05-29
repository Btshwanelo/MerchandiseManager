import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { InventoryChart } from "@/components/dashboard/inventory-chart";
import { LowStockList } from "@/components/dashboard/low-stock-list";
import { ActivityTable } from "@/components/dashboard/activity-table";
import { Package, Bell, Store, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";

const Dashboard = () => {
  const { user } = useAuth();
  const { data: dashboardStats, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground text-lg">Real-time insights from merchandiser submissions</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Logged in as</div>
            <div className="font-semibold text-foreground">{user?.name || user?.username}</div>
            <div className="text-xs text-muted-foreground capitalize">{user?.role}</div>
          </div>
        </div>

        {/* Key Metrics Section */}
        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-6">Key Metrics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoading ? (
              Array(4).fill(0).map((_, index) => (
                <Card key={index} className="p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-lg" />
                  </div>
                </Card>
              ))
            ) : error ? (
              <div className="col-span-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="ml-2">Failed to load dashboard data</span>
                </Alert>
              </div>
            ) : (
              <>
                <MetricCard
                  title="Products in Catalog"
                  value={dashboardStats?.totalProducts?.toLocaleString() || "0"}
                  icon={Package}
                  trend={{
                    value: "Total SKUs managed",
                    direction: "neutral",
                  }}
                  iconColor="text-blue-600"
                />
                
                <MetricCard
                  title="Low Stock Alerts"
                  value={dashboardStats?.lowStockItems?.toLocaleString() || "0"}
                  icon={Bell}
                  trend={{
                    value: "Items need restocking",
                    direction: "up",
                  }}
                  iconColor="text-red-600"
                  valueColor="text-red-600"
                />
                
                <MetricCard
                  title="Store Locations"
                  value={dashboardStats?.activeStores?.toLocaleString() || "0"}
                  icon={Store}
                  trend={{
                    value: "Active retail outlets",
                    direction: "neutral",
                  }}
                  iconColor="text-orange-600"
                />
                
                <MetricCard
                  title="Inventory Value"
                  value={formatCurrency(dashboardStats?.inventoryValue || 0)}
                  icon={DollarSign}
                  trend={{
                    value: "Total stock valuation",
                    direction: "neutral",
                  }}
                  iconColor="text-green-600"
                />
              </>
            )}
          </div>
        </section>

        {/* Analytics Section */}
        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-6">Analytics & Insights</h2>
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Inventory Trends Chart - Takes up 2 columns */}
            <div className="xl:col-span-2">
              <InventoryChart />
            </div>
            
            {/* Low Stock Alerts - Takes up 1 column */}
            <div className="xl:col-span-1">
              <LowStockList />
            </div>
          </div>
        </section>

        {/* Recent Activity Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-foreground">Recent Activity</h2>
            {user?.role === UserRole.ADMIN && (
              <Link href="/all-activities">
                <button className="text-sm text-primary hover:underline">View All Activities</button>
              </Link>
            )}
          </div>
          
          <ActivityTable />
        </section>
      </div>
    </div>
  );
};

export default Dashboard;