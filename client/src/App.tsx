import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import Products from "@/pages/products";
import Stores from "@/pages/stores";
import Reports from "@/pages/reports";
import Alerts from "@/pages/alerts";
import UserManagement from "@/pages/user-management";
import Settings from "@/pages/settings";
import AuthPage from "@/pages/auth-page";
import Layout from "@/components/layout/layout";
import { ThemeProvider } from "next-themes";
import { UserRole } from "@shared/schema";

// New pages
import StockTake from "@/pages/stock-take";
import Merchandising from "@/pages/merchandising";
import CompetitorMerchandising from "@/pages/competitor-merchandising";
import Flows from "@/pages/flows";
import ProductSheets from "@/pages/product-sheets";
import ListPrices from "@/pages/list-prices";
import Deals from "@/pages/deals";
import Orders from "@/pages/orders";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      <ProtectedRoute path="/" component={() => (
        <Layout>
          <Dashboard />
        </Layout>
      )} />
      
      <ProtectedRoute path="/inventory" component={() => (
        <Layout>
          <Inventory />
        </Layout>
      )} />
      
      <ProtectedRoute path="/products" component={() => (
        <Layout>
          <Products />
        </Layout>
      )} />
      
      <ProtectedRoute path="/stores" component={() => (
        <Layout>
          <Stores />
        </Layout>
      )} />
      
      <ProtectedRoute path="/reports" component={() => (
        <Layout>
          <Reports />
        </Layout>
      )} />
      
      <ProtectedRoute path="/alerts" component={() => (
        <Layout>
          <Alerts />
        </Layout>
      )} />
      
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
      
      {/* Stock Take & Merchandising Routes */}
      <ProtectedRoute path="/stock-take" component={() => (
        <Layout>
          <StockTake />
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
      
      {/* Flow & Document Routes */}
      <ProtectedRoute path="/flows" component={() => (
        <Layout>
          <Flows />
        </Layout>
      )} />
      
      <ProtectedRoute path="/product-sheets" component={() => (
        <Layout>
          <ProductSheets />
        </Layout>
      )} />
      
      <ProtectedRoute path="/list-prices" component={() => (
        <Layout>
          <ListPrices />
        </Layout>
      )} />
      
      <ProtectedRoute path="/deals" component={() => (
        <Layout>
          <Deals />
        </Layout>
      )} />
      
      <ProtectedRoute path="/orders" component={() => (
        <Layout>
          <Orders />
        </Layout>
      )} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
