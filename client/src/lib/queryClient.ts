import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      // Try to parse JSON error response
      const responseText = await res.text();
      if (responseText) {
        try {
          const errorJson = JSON.parse(responseText);
          errorMessage = errorJson.error || errorJson.message || responseText;
        } catch (e) {
          // If it's not JSON, use the raw text
          errorMessage = responseText;
        }
      }
    } catch (e) {
      // If text() fails, fall back to statusText
      console.error("Failed to read error response:", e);
    }

    // Create error with additional properties
    const error = new Error(`${res.status}: ${errorMessage}`);
    
    // Add status code for easier checking
    (error as any).status = res.status;
    
    // Add flag for authentication errors with enhanced error details
    if (res.status === 401) {
      (error as any).isAuthError = true;
      (error as any).type = 'unauthorized';
      (error as any).message = 'Your session has expired. Please log in again.';
    } else if (res.status === 403) {
      (error as any).isAuthError = true;
      (error as any).type = 'forbidden';
      
      // Try to get more specific error details from the response
      try {
        const responseText = await res.clone().text();
        if (responseText) {
          const errorJson = JSON.parse(responseText);
          
          // Check for detailed error information
          if (errorJson.details) {
            (error as any).message = `${errorJson.error || 'Access denied'}. ${errorJson.details}`;
          } else if (errorJson.error) {
            (error as any).message = errorJson.error;
          } else {
            (error as any).message = 'You do not have permission to access this resource.';
          }
          
          // Store additional context for more specific UI handling
          (error as any).errorDetails = errorJson;
        } else {
          (error as any).message = 'You do not have permission to access this resource.';
        }
      } catch (e) {
        console.error("Failed to parse error details:", e);
        (error as any).message = 'You do not have permission to access this resource.';
      }
    }
    
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: {
    headers?: Record<string, string>;
  }
): Promise<Response> {
  // Set up headers
  const headers: Record<string, string> = {};
  
  // Set default Content-Type if data exists and no Content-Type is provided
  if (data && !options?.headers?.["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  
  // Merge with custom headers if provided
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }
  
  // Prepare the body based on Content-Type
  let body: string | FormData | undefined = undefined;
  
  if (data) {
    if (headers["Content-Type"]?.includes("multipart/form-data")) {
      // For multipart/form-data, use FormData directly
      body = data as FormData;
      // Remove Content-Type to let browser set it with boundary
      delete headers["Content-Type"];
    } else if (headers["Content-Type"]?.includes("application/json")) {
      // For JSON, stringify the data
      body = JSON.stringify(data);
    } else if (data) {
      // For other types with data, use it as is
      body = data as any;
    }
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Define error handling behavior types
type UnauthorizedBehavior = "returnNull" | "throw";

interface QueryFnOptions {
  on401: UnauthorizedBehavior;
  fromCache?: boolean;
}

// Global event for authentication state changes
export const AUTH_EVENTS = {
  SESSION_EXPIRED: "session_expired",
  PERMISSION_DENIED: "permission_denied",
};

// Event emitter for auth events
export const authEvents = {
  listeners: new Map<string, Set<Function>>(),
  
  emit(event: string, ...args: any[]) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  },
  
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }
};

// Enhanced query function factory
export const getQueryFn: <T>(options: QueryFnOptions) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, fromCache = false }) =>
  async ({ queryKey }) => {
    try {
      // Make the request with credentials
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        cache: fromCache ? "default" : "no-cache",
      });

      // Handle 401 based on options
      if (res.status === 401) {
        // Emit event for session expiration
        authEvents.emit(AUTH_EVENTS.SESSION_EXPIRED);
        
        // Return null or throw based on configuration
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
      }
      
      // Handle 403 errors
      if (res.status === 403) {
        // Emit event for permission issues
        authEvents.emit(AUTH_EVENTS.PERMISSION_DENIED);
      }

      // Check for errors
      await throwIfResNotOk(res);
      
      // Parse response
      return await res.json();
    } catch (error) {
      console.error(`Query error for ${queryKey[0]}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
