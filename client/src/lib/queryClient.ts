import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
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

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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
