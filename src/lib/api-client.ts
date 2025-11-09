/**
 * Safe API client with consistent error handling
 * Prevents errors from being thrown to console unnecessarily
 * All errors are handled gracefully without logging to console
 */

interface FetchOptions extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number
}

interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  status: number
  ok: boolean
}

const DEFAULT_TIMEOUT = 10000 // 10 seconds
const DEFAULT_RETRIES = 1
const DEFAULT_RETRY_DELAY = 1000 // 1 second

/**
 * Safe fetch wrapper that never throws errors
 * Returns a response object even on failure
 */
export async function safeFetchWrapper(
  url: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; json: () => Promise<unknown>; status: number; statusText: string }> {
  try {
    const response = await fetch(url, options)
    return response
  } catch {
    // Return a mock response object that mimics fetch response
    // This prevents errors from propagating
    return {
      ok: false,
      status: 0,
      statusText: 'Network error',
      json: async () => ({ error: 'Network error: Unable to connect to server' }),
    }
  }
}

/**
 * Safe fetch with error handling, timeout, and retry logic
 */
export async function safeFetch<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    ...fetchOptions
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Handle non-OK responses
        if (!response.ok) {
          // Try to parse error message from response
          let errorMessage = `Request failed with status ${response.status}`
          try {
            const errorData = await response.json().catch(() => ({}))
            errorMessage = errorData.error || errorData.message || errorMessage
          } catch {
            // If JSON parsing fails, use status text
            errorMessage = response.statusText || errorMessage
          }

          return {
            error: errorMessage,
            status: response.status,
            ok: false,
          }
        }

        // Parse successful response
        try {
          const data = await response.json()
          return {
            data,
            status: response.status,
            ok: true,
          }
        } catch {
          // If response is not JSON, return empty data
          return {
            data: {} as T,
            status: response.status,
            ok: true,
          }
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)

        // Handle abort (timeout)
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          lastError = new Error('Request timeout')
          if (attempt < retries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay))
            continue
          }
          break
        }

        // Handle network errors
        if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
          lastError = new Error('Network error: Unable to connect to server')
          if (attempt < retries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay))
            continue
          }
          break
        }

        // Other errors
        lastError = fetchError instanceof Error ? fetchError : new Error('Unknown error')
        break
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      break
    }
  }

  // Return error response instead of throwing
  return {
    error: lastError?.message || 'Request failed',
    status: 0,
    ok: false,
  }
}

/**
 * GET request helper
 */
export async function apiGet<T = unknown>(url: string, options?: FetchOptions): Promise<ApiResponse<T>> {
  return safeFetch<T>(url, {
    ...options,
    method: 'GET',
  })
}

/**
 * POST request helper
 */
export async function apiPost<T = unknown>(
  url: string,
  data?: unknown,
  options?: FetchOptions
): Promise<ApiResponse<T>> {
  return safeFetch<T>(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PUT request helper
 */
export async function apiPut<T = unknown>(
  url: string,
  data?: unknown,
  options?: FetchOptions
): Promise<ApiResponse<T>> {
  return safeFetch<T>(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = unknown>(url: string, options?: FetchOptions): Promise<ApiResponse<T>> {
  return safeFetch<T>(url, {
    ...options,
    method: 'DELETE',
  })
}

