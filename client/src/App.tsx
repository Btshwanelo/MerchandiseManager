import { Switch, Route, useLocation } from "wouter";
import { queryClient, AUTH_EVENTS, authEvents } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AlertsProvider } from "@/hooks/use-alerts";
import { ProtectedRoute } from "@/lib/protected-route";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import Products from "@/pages/products";
import Stores from "@/pages/stores";
import Reports from "@/pages/reports";
import Alerts from "@/pages/alerts";
import UserManagement from "@/pages/user-management";
import UserProfile from "@/pages/user-profile";
import UserDetail from "@/pages/user-detail";
import UserImport from "@/pages/user-import";
import Settings from "@/pages/settings";
import AuthPage from "@/pages/auth-page";
import Changelog from "@/pages/changelog";
import AllActivities from "@/pages/all-activities";
import Layout from "@/components/layout/layout";
import { ThemeProvider } from "next-themes";
import { UserRole } from "@shared/schema";
import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

// New pages
import StockTake from "@/pages/stock-take";
import StockTakeDetail from "@/pages/stock-take-detail";
import Merchandising from "@/pages/merchandising";
import CompetitorMerchandising from "@/pages/competitor-merchandising";
import Flows from "@/pages/flows";
import ProductSheets from "@/pages/product-sheets";
import ListPrices from "@/pages/list-prices";
import Deals from "@/pages/deals";
import Orders from "@/pages/orders";
import Assignments from "@/pages/assignments";
import MyAssignments from "@/pages/my-assignments";
import ProcessForm from "@/pages/process-form";
import WorkItems from "@/pages/work-items";
import WorkItemDetail from "@/pages/work-item-detail";
import WorkItemSummaryPage from "@/pages/work-item-summary-page";

// Redirector component for different user roles
function RoleBasedRedirect() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  useEffect(() => {
    if (user) {
      if (user.role === UserRole.MERCHANDISER) {
        // Merchandisers go directly to My Assignments page
        navigate("/my-assignments");
      } else {
        // Admins and Managers go to dashboard
        navigate("/dashboard");
      }
    }
  }, [user, navigate]);
  
  return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/changelog" component={Changelog} />
      
      <ProtectedRoute path="/" component={RoleBasedRedirect} />
      
      <ProtectedRoute 
        path="/dashboard" 
        roles={[UserRole.ADMIN, UserRole.MANAGER]}
        component={() => (
          <Layout>
            <Dashboard />
          </Layout>
        )}
      />
      
      <ProtectedRoute 
        path="/inventory" 
        roles={[UserRole.ADMIN, UserRole.MANAGER]}
        component={() => (
          <Layout>
            <Inventory />
          </Layout>
        )} 
      />
      
      <ProtectedRoute 
        path="/products" 
        roles={[UserRole.ADMIN, UserRole.MANAGER]}
        component={() => (
          <Layout>
            <Products />
          </Layout>
        )} 
      />
      
      <ProtectedRoute 
        path="/stores" 
        roles={[UserRole.ADMIN, UserRole.MANAGER]}
        component={() => (
          <Layout>
            <Stores />
          </Layout>
        )} 
      />
      
      <ProtectedRoute 
        path="/reports" 
        roles={[UserRole.ADMIN, UserRole.MANAGER]}
        component={() => (
          <Layout>
            <Reports />
          </Layout>
        )} 
      />
      
      <ProtectedRoute 
        path="/alerts" 
        roles={[UserRole.ADMIN, UserRole.MANAGER]}
        component={() => (
          <Layout>
            <Alerts />
          </Layout>
        )} 
      />
      
      <ProtectedRoute 
        path="/users" 
        component={() => (
          <Layout>
            <UserManagement />
          </Layout>
        )}
        roles={[UserRole.ADMIN]}
      />
      
      <ProtectedRoute 
        path="/settings" 
        component={() => (
          <Layout>
            <Settings />
          </Layout>
        )}
        roles={[UserRole.ADMIN]}
      />
      
      {/* User Profile & Detail Routes */}
      <ProtectedRoute 
        path="/user-profile" 
        component={() => (
          <Layout>
            <UserProfile />
          </Layout>
        )}
      />
      
      <ProtectedRoute 
        path="/user-detail/:id" 
        component={() => (
          <Layout>
            <UserDetail />
          </Layout>
        )}
        roles={[UserRole.ADMIN, UserRole.MANAGER]}
      />
      
      <ProtectedRoute 
        path="/user-import" 
        component={() => (
          <Layout>
            <UserImport />
          </Layout>
        )}
        roles={[UserRole.ADMIN]}
      />
      
      {/* Stock Take & Merchandising Routes */}
      <ProtectedRoute path="/stock-take" component={() => (
        <Layout>
          <StockTake />
        </Layout>
      )} />
      
      <Route path="/stock-take/:storeId">
        {(params: { storeId: string }) => {
          const StockTakeWithParams = () => (
            <Layout>
              <StockTake storeId={params.storeId} />
            </Layout>
          );
          return <ProtectedRoute path="/stock-take/:storeId" component={StockTakeWithParams} />;
        }}
      </Route>
      
      <ProtectedRoute path="/stock-take-detail/:id" component={() => (
        <Layout>
          <StockTakeDetail />
        </Layout>
      )} />
      
      <ProtectedRoute path="/merchandising" component={() => (
        <Layout>
          <Merchandising />
        </Layout>
      )} />
      
      <ProtectedRoute path="/competitor-merchandising" component={() => (
        <Layout>
          <CompetitorMerchandising />
        </Layout>
      )} />
      
      {/* Flow & Document Routes - Admin/Manager Only */}
      <ProtectedRoute 
        path="/flows" 
        roles={[UserRole.ADMIN, UserRole.MANAGER]}
        component={() => (
          <Layout>
            <Flows />
          </Layout>
        )} 
      />
      
      <ProtectedRoute 
        path="/product-sheets" 
        roles={[UserRole.ADMIN, UserRole.MANAGER]}
        component={() => (
          <Layout>
            <ProductSheets />
          </Layout>
        )} 
      />
      
      <ProtectedRoute 
        path="/list-prices" 
        roles={[UserRole.ADMIN, UserRole.MANAGER]}
        component={() => (
          <Layout>
            <ListPrices />
          </Layout>
        )} 
      />
      
      <ProtectedRoute 
        path="/deals" 
        roles={[UserRole.ADMIN, UserRole.MANAGER]}
        component={() => (
          <Layout>
            <Deals />
          </Layout>
        )} 
      />
      
      <ProtectedRoute 
        path="/orders" 
        roles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER]}
        component={() => (
          <Layout>
            <Orders />
          </Layout>
        )} 
      />
      
      {/* Store Assignments Routes */}
      <ProtectedRoute 
        path="/assignments" 
        roles={[UserRole.ADMIN, UserRole.MANAGER]}
        component={() => (
          <Layout>
            <Assignments />
          </Layout>
        )} 
      />
      
      <ProtectedRoute 
        path="/my-assignments" 
        roles={[UserRole.MERCHANDISER]}
        component={() => (
          <Layout>
            <MyAssignments />
          </Layout>
        )} 
      />
      
      <ProtectedRoute 
        path="/process-form" 
        component={() => (
          <Layout>
            <ProcessForm />
          </Layout>
        )} 
      />
      
      {/* Work Items Routes - Admin Only */}
      <ProtectedRoute 
        path="/work-items" 
        roles={[UserRole.ADMIN]}
        component={() => (
          <Layout>
            <WorkItems />
          </Layout>
        )} 
      />
      
      <ProtectedRoute 
        path="/work-item-detail/:id" 
        roles={[UserRole.ADMIN]}
        component={() => (
          <Layout>
            <WorkItemDetail />
          </Layout>
        )} 
      />
      
      <ProtectedRoute 
        path="/work-item-summary/:id" 
        roles={[UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER]}
        component={() => (
          <Layout>
            <WorkItemSummaryPage />
          </Layout>
        )} 
      />
      
      {/* System Activity Routes - Admin Only */}
      <ProtectedRoute 
        path="/all-activities" 
        roles={[UserRole.ADMIN]}
        component={() => (
          <Layout>
            <AllActivities />
          </Layout>
        )} 
      />
      
      <Route component={NotFound} />
    </Switch>
  );
}

// Session check component to handle authentication events and session verification
function SessionCheck() {
  const { refetchUser, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const isAuthPage = location === '/auth';
  
  // Track if we've already shown a toast for session expiration
  const sessionToastShownRef = useRef(false);
  
  // Handle authentication events (session expired, permission denied)
  useEffect(() => {
    // Listen for session expired events
    const unsubscribeExpired = authEvents.on(AUTH_EVENTS.SESSION_EXPIRED, () => {
      if (!sessionToastShownRef.current && !isAuthPage) {
        sessionToastShownRef.current = true;
        
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        
        // Redirect to login page
        logoutMutation.mutate(undefined, {
          onSuccess: () => {
            navigate('/auth');
            // Reset toast shown flag after redirect
            setTimeout(() => {
              sessionToastShownRef.current = false;
            }, 1000);
          }
        });
      }
    });
    
    // Listen for permission denied events
    const unsubscribePermission = authEvents.on(AUTH_EVENTS.PERMISSION_DENIED, () => {
      if (!isAuthPage) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this resource.",
          variant: "destructive",
        });
      }
    });
    
    return () => {
      unsubscribeExpired();
      unsubscribePermission();
    };
  }, [toast, navigate, logoutMutation, isAuthPage]);

  // Periodically check user session status
  useEffect(() => {
    if (isAuthPage) return; // Don't check session on auth page

    // Initial check after a short delay
    const initialCheck = setTimeout(() => {
      refetchUser();
    }, 10000); // 10 seconds after page load
    
    // Regular interval check (every 5 minutes)
    const sessionCheckInterval = setInterval(() => {
      refetchUser();
    }, 5 * 60 * 1000); // 5 minutes

    // Clean up on unmount
    return () => {
      clearTimeout(initialCheck);
      clearInterval(sessionCheckInterval);
    };
  }, [refetchUser, isAuthPage]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <AuthProvider>
          <AlertsProvider>
            <TooltipProvider>
              <Toaster />
              <SessionCheck />
              <Router />
            </TooltipProvider>
          </AlertsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
