import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from "./supabase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper to extract auth token
const getAuthToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return session.access_token;
};

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const token = await getAuthToken();
    console.log('Making API request with token:', token ? 'present' : 'missing');

    const res = await fetch(url, {
      method,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        "Authorization": `Bearer ${token}`,
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    console.log('API Response status:', res.status);
    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    console.error('API Request error:', error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const token = await getAuthToken();
      console.log('Making query with token:', token ? 'present' : 'missing');

      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers: {
          "Authorization": `Bearer ${token}`
        },
      });

      console.log('Query Response status:', res.status);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error: any) {
      console.error('Query error:', error);
      if (error.message?.includes('Not authenticated') && unauthorizedBehavior === "returnNull") {
        return null;
      }
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