import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from "./supabase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = `HTTP error! status: ${res.status}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // If JSON parsing fails, use the original error message
    }
    throw new Error(errorMessage);
  }
}

// Helper to extract auth token
const getAuthToken = async () => {
  try {
    // First try to get token from localStorage
    const storedToken = localStorage.getItem('supabase.auth.token');
    if (storedToken) {
      return storedToken;
    }

    // If no stored token, get from current session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      // Store the token for future use
      localStorage.setItem('supabase.auth.token', session.access_token);
      return session.access_token;
    }

    throw new Error('Not authenticated');
  } catch (error) {
    console.error('Failed to get auth token:', error);
    localStorage.removeItem('supabase.auth.token');
    throw new Error('Not authenticated');
  }
};

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const token = await getAuthToken();
    console.log('Making API request:', method, url);

    const res = await fetch(url, {
      method,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        "Authorization": `Bearer ${token}`,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (res.status === 401) {
      // Clear token and redirect to auth page on 401
      localStorage.removeItem('supabase.auth.token');
      window.location.href = '/auth';
      throw new Error('Please log in to continue');
    }

    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    console.error('API Request error:', error);
    throw error;
  }
}

export const getQueryFn: <T>(options: {
  on401: "returnNull" | "throw";
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const token = await getAuthToken();
      console.log('Making query:', queryKey[0]);

      const res = await fetch(queryKey[0] as string, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
        // Clear token and redirect to auth page
        localStorage.removeItem('supabase.auth.token');
        window.location.href = '/auth';
        throw new Error('Please log in to continue');
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error: any) {
      console.error('Query error:', error);
      if (error.message === 'Not authenticated' && unauthorizedBehavior === "returnNull") {
        return null;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      retry: 1,
      retryDelay: 1000,
      staleTime: 30000,
      gcTime: 3600000, // 1 hour - using gcTime instead of cacheTime for v5
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});