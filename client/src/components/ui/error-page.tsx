import { ServerError, UnauthorizedError, ForbiddenError, NotFoundError, NetworkError, MaintenanceError } from "@/components/ui/error-state";

type ErrorProps = {
  statusCode?: number;
  type?: "network" | "server" | "maintenance" | "auth" | "notFound" | "forbidden";
  onRetry?: () => void;
};

/**
 * ErrorPage component displays appropriate error pages based on status code or error type
 * 
 * @param {number} statusCode - HTTP status code to determine the type of error
 * @param {string} type - Error type: "network", "server", "maintenance", "auth", "notFound", "forbidden"
 * @param {function} onRetry - Action to perform when retry button is clicked
 */
export function ErrorPage({ statusCode, type, onRetry }: ErrorProps) {
  // If type is provided directly, use it
  if (type) {
    switch (type) {
      case "network":
        return <NetworkError />;
      case "server":
        return <ServerError />;
      case "maintenance":
        return <MaintenanceError />;
      case "auth":
        return <UnauthorizedError />;
      case "notFound":
        return <NotFoundError />;
      case "forbidden":
        return <ForbiddenError />;
    }
  }
  
  // Otherwise use status code to determine error type
  if (statusCode) {
    switch (statusCode) {
      case 404:
        return <NotFoundError />;
      case 401:
        return <UnauthorizedError />;
      case 403:
        return <ForbiddenError />;
      case 500:
      case 502:
      case 503:
      case 504:
        return <ServerError />;
      default:
        // For any unhandled status code, default to server error
        return <ServerError />;
    }
  }
  
  // Default to server error if neither type nor status code is provided
  return <ServerError />;
}