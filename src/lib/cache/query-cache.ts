// Query caching strategy for optimizing data fetching

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class QueryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  
  // Set cache with custom TTL
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const timestamp = Date.now();
    this.cache.set(key, {
      data,
      timestamp,
      expiresAt: timestamp + ttl
    });
    
    // Clean up expired entries periodically
    this.cleanupExpired();
  }
  
  // Get from cache if not expired
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  // Invalidate cache for key
  invalidate(key: string): void {
    this.cache.delete(key);
  }
  
  // Invalidate all cache entries matching pattern
  invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  // Clear all cache
  clear(): void {
    this.cache.clear();
  }
  
  // Remove expired entries
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
  
  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const queryCache = new QueryCache();

// Cache key generators
export const cacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userGroups: (userId: string) => `user:${userId}:groups`,
  group: (groupId: string) => `group:${groupId}`,
  groupMembers: (groupId: string) => `group:${groupId}:members`,
  transactions: (userId: string) => `user:${userId}:transactions`,
  trustScore: (userId: string) => `user:${userId}:trust-score`,
  achievements: (userId: string) => `user:${userId}:achievements`,
  notifications: (userId: string) => `user:${userId}:notifications`
};

// React Query configuration for optimal caching
export const queryConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true
    }
  }
};
