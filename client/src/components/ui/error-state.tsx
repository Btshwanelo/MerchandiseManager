import React from "react";
import { AlertCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";

interface ErrorStateProps {
  code?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  showSearch?: boolean;
  backToHome?: boolean;
  imageUrl?: string;
}

export function ErrorState({
  code,
  title,
  description,
  action,
  showSearch = false,
  backToHome = true,
  imageUrl,
}: ErrorStateProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log("Searching for:", searchQuery);
    // In a real implementation, you'd redirect to search results
  };

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-8 my-12 container px-4 max-w-4xl mx-auto">
      <div className="flex-1 space-y-6 text-center lg:text-left">
        {code && (
          <div className="inline-block text-sm font-medium text-primary px-3 py-1 rounded-full bg-primary/10">
            {code} error
          </div>
        )}
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-lg">{description}</p>
        
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          {action && (
            <Button onClick={action.onClick} className="flex-1">
              {action.label}
            </Button>
          )}
          
          {backToHome && (
            <Button variant="outline" asChild className="flex-1">
              <Link href="/">Back to Dashboard</Link>
            </Button>
          )}
        </div>
        
        {showSearch && (
          <div className="pt-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input 
                placeholder="Search our site" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </form>
          </div>
        )}
      </div>
      
      <div className="flex-1 flex justify-center">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt="Error illustration" 
            className="max-w-full h-auto"
          />
        ) : (
          <div className="text-slate-200 w-full max-w-xs">
            <svg viewBox="0 0 362 145" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path
                fill="currentColor"
                d="M22.5,22.5h11.25v11.25h-11.25zm0,22.5h11.25v11.25h-11.25zm11.25,0h11.25v11.25h-11.25zm11.25,0h11.25v11.25h-11.25zm11.25,0h11.25v11.25h-11.25zm11.25,-22.5h11.25v11.25h-11.25zm0,22.5h11.25v11.25h-11.25zm22.5,-22.5h11.25v11.25h-11.25zm0,22.5h11.25v11.25h-11.25zm11.25,0h11.25v11.25h-11.25zm11.25,0h11.25v11.25h-11.25zm11.25,0h11.25v11.25h-11.25zm11.25,-22.5h11.25v11.25h-11.25zm0,22.5h11.25v11.25h-11.25zm22.5,-22.5h11.25v11.25h-11.25zm0,22.5h11.25v11.25h-11.25zm11.25,0h11.25v11.25h-11.25zm11.25,0h11.25v11.25h-11.25zm11.25,0h11.25v11.25h-11.25zm11.25,-22.5h11.25v11.25h-11.25zm0,22.5h11.25v11.25h-11.25z"
              />
              <ellipse
                fill="none"
                stroke="currentColor"
                cx="152.5"
                cy="67.5"
                rx="40"
                ry="40"
              />
              <path
                fill="none"
                stroke="currentColor"
                d="M 152.5,27.5 v 80 M 112.5,67.5 h 80"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// Predefined error states
export function NotFoundError() {
  return (
    <ErrorState
      code="404"
      title="Page not found"
      description="Sorry, the page you are looking for doesn't exist or has been moved. Try searching our site or navigate to the dashboard."
      showSearch={true}
    />
  );
}

export function ServerError() {
  return (
    <ErrorState
      code="500"
      title="Server error"
      description="Our server encountered an unexpected error. We've been notified and will fix the issue as soon as possible."
      action={{
        label: "Try again",
        onClick: () => window.location.reload(),
      }}
    />
  );
}

export function UnauthorizedError() {
  return (
    <ErrorState
      code="401"
      title="Unauthorized access"
      description="You don't have permission to view this page. Please log in with appropriate credentials."
      action={{
        label: "Log in",
        onClick: () => window.location.href = "/auth",
      }}
      backToHome={false}
    />
  );
}

export function ForbiddenError({ 
  customTitle, 
  customDescription, 
  customAction 
}: { 
  customTitle?: string, 
  customDescription?: string, 
  customAction?: {
    label: string;
    onClick: () => void;
  }
}) {
  return (
    <ErrorState
      code="403"
      title={customTitle || "Access forbidden"}
      description={customDescription || "You don't have permission to access this resource. If you believe this is a mistake, please check your assignments or contact your manager."}
      action={customAction || {
        label: "View my assignments",
        onClick: () => window.location.href = "/my-assignments",
      }}
    />
  );
}

export function NetworkError() {
  return (
    <ErrorState
      title="Network error"
      description="Unable to connect to the server. Please check your internet connection and try again."
      action={{
        label: "Retry connection",
        onClick: () => window.location.reload(),
      }}
    />
  );
}

export function MaintenanceError() {
  return (
    <ErrorState
      title="Under maintenance"
      description="Our system is currently undergoing scheduled maintenance. Please check back later."
    />
  );
}

export function DataLoadError({ entityName, retryAction }: { entityName: string, retryAction: () => void }) {
  return (
    <ErrorState
      title={`Unable to load ${entityName}`}
      description={`We couldn't retrieve the ${entityName} data. This could be due to a temporary issue or network problem.`}
      action={{
        label: "Try again",
        onClick: retryAction,
      }}
    />
  );
}

// Specific error for work item access issues
export function WorkItemAccessError() {
  return (
    <ErrorState
      code="403"
      title="Work Item Access Restricted"
      description="You don't have permission to access this work item. It might be assigned to another merchandiser or you need specific store permissions."
      action={{
        label: "View My Assignments",
        onClick: () => window.location.href = "/my-assignments",
      }}
    />
  );
}

export function EmptyDataState({ 
  entityName, 
  description, 
  actionLabel, 
  actionFn 
}: { 
  entityName: string, 
  description?: string, 
  actionLabel?: string, 
  actionFn?: () => void 
}) {
  return (
    <div className="text-center py-10 px-4 rounded-lg border-2 border-dashed bg-muted/20">
      <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
      <h3 className="mt-4 text-lg font-medium">No {entityName} found</h3>
      <p className="mt-2 text-muted-foreground">
        {description || `There are no ${entityName} to display right now.`}
      </p>
      {actionLabel && actionFn && (
        <Button onClick={actionFn} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}