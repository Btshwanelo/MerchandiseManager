import { useAuth } from "@/hooks/use-auth";
import { Loader2, AlertCircle } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";
import { UserRole } from "@shared/schema";
import { ForbiddenError } from "@/components/ui/error-state";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  path: string;
  component: () => React.JSX.Element;
  roles?: UserRole[];
}

export function ProtectedRoute({
  path,
  component: Component,
  roles,
}: ProtectedRouteProps) {
  const { user, isLoading, error, refetchUser } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Handle authentication errors with improved error detection
  useEffect(() => {
    if (error) {
      if ((error as any).isAuthError) {
        // Use our custom auth error message from queryClient
        toast({
          title: (error as any).type === 'unauthorized' ? "Authentication Error" : "Access Denied",
          description: error.message || "Please log in again.",
          variant: "destructive",
        });
        
        // Redirect to login for unauthorized errors
        if ((error as any).type === 'unauthorized') {
          setLocation("/auth");
        }
      } else {
        // Show generic error toast for other errors
        toast({
          title: "Error",
          description: error.message || "An unexpected error occurred",
          variant: "destructive",
        });
      }
    }
  }, [error, toast, setLocation]);

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Check role access if roles are specified
  if (roles && roles.length > 0 && !roles.includes(user.role as UserRole)) {
    return (
      <Route path={path}>
        <ForbiddenError />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
