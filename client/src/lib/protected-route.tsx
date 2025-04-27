import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { UserRole } from "@shared/schema";

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
  const { user, isLoading } = useAuth();

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
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-center mb-4">
            You don't have permission to access this page. This area requires 
            {roles.length === 1 
              ? ` ${roles[0]} privileges.` 
              : ` one of these roles: ${roles.join(', ')}.`}
          </p>
          <p className="text-center text-muted-foreground">
            Your current role: <span className="font-medium">{user.role}</span>
          </p>
        </div>
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
