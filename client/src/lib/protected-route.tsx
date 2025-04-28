import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { UserRole } from "@shared/schema";
import { ForbiddenError } from "@/components/ui/error-state";

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
        <ForbiddenError />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
