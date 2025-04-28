import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { InventoryChart } from "@/components/dashboard/inventory-chart";
import { LowStockList } from "@/components/dashboard/low-stock-list";
import { ActivityTable } from "@/components/dashboard/activity-table";
import { Package, Bell, Store, DollarSign, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const Dashboard = () => {
  const { user } = useAuth();
  const { data: dashboardStats, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-8">
      {/* Role-based access notification */}
      <Alert variant="info" className="bg-info/10 border-info">
        <AlertCircle className="h-4 w-4 text-info" />
        <div className="ml-2">
          <h3 className="font-medium text-foreground">Welcome to InvenTrack</h3>
          <p className="text-muted-foreground">
            Your current role is <span className="font-medium">{user?.role || 'Guest'}</span>.
            {user?.role === UserRole.ADMIN 
              ? ' You have access to all system features and management capabilities.'
              : user?.role === UserRole.MANAGER
                ? ' You can manage inventory, products, and view reports.'
                : ' You can view and update inventory.'
            }
          </p>
        </div>
      </Alert>

      {/* Dashboard Overview Section */}
      <section>
        <h3 className="text-xl font-medium text-foreground mb-4">Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading ? (
            // Loading skeleton
            Array(4)
              .fill(0)
              .map((_, index) => (
                <div key={index} className="bg-card p-6 rounded-lg border">
                  <div className="flex items-start justify-between">
                    <div>
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-8 w-24 mb-2" />
                      <Skeleton className="h-4 w-36" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-lg" />
                  </div>
                </div>
              ))
          ) : error ? (
            // Error state
            <div className="col-span-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="ml-2">Failed to load dashboard data</span>
              </Alert>
            </div>
          ) : (
            // Dashboard metrics
            <>
              <MetricCard
                title="Total Products"
                value={dashboardStats?.totalProducts.toLocaleString() || "1,254"}
                icon={Package}
                trend={{
                  value: "4.75% from last month",
                  direction: "up",
                }}
                iconColor="text-primary"
              />
              
              <MetricCard
                title="Low Stock Items"
                value={dashboardStats?.lowStockItems.toLocaleString() || "28"}
                icon={Bell}
                trend={{
                  value: "12.3% from last week",
                  direction: "up",
                }}
                iconColor="text-destructive"
                valueColor="text-destructive"
              />
              
              <MetricCard
                title="Active Stores"
                value={dashboardStats?.activeStores.toLocaleString() || "42"}
                icon={Store}
                trend={{
                  value: "No change",
                  direction: "neutral",
                }}
                iconColor="text-orange-500"
              />
              
              <MetricCard
                title="Inventory Value"
                value={formatCurrency(dashboardStats?.inventoryValue || 1200000)}
                icon={DollarSign}
                trend={{
                  value: "2.4% from last month",
                  direction: "up",
                }}
                iconColor="text-blue-500"
              />
            </>
          )}
        </div>
      </section>

      {/* Inventory Status Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-medium text-foreground">Inventory Status</h3>
          
          <div className="flex items-center space-x-2">
            <select className="bg-background border rounded-md py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last quarter</option>
              <option>Year to date</option>
            </select>
            
            <button className="bg-primary text-primary-foreground py-2 px-4 rounded-md text-sm flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InventoryChart />
          <LowStockList />
        </div>
      </section>

      {/* Admin Quick Access Section - Only visible to admins */}
      {user?.role === UserRole.ADMIN && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-medium text-foreground">Admin Management</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-2 border-primary/20 hover:border-primary transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-5 w-5 mr-2 text-primary" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage system users, assign roles, and control access.
                </p>
                <Link href="/users">
                  <Button className="w-full">
                    Manage Users
                  </Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-primary/20 hover:border-primary transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Package className="h-5 w-5 mr-2 text-primary" />
                  Bulk Import Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Import multiple products via CSV upload.
                </p>
                <Link href="/products">
                  <Button className="w-full">
                    Import Products
                  </Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-primary/20 hover:border-primary transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Store className="h-5 w-5 mr-2 text-primary" />
                  Store Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Add, edit, or remove store locations.
                </p>
                <Link href="/stores">
                  <Button className="w-full">
                    Manage Stores
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Recent Activity Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-medium text-foreground">Recent Activity</h3>
          <button className="text-sm text-primary">View All Activities</button>
        </div>
        
        <ActivityTable />
      </section>
    </div>
  );
};

export default Dashboard;
