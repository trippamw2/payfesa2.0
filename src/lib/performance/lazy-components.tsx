import { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// HOC for lazy loading with suspense
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback: React.ReactNode = <LoadingFallback />
) {
  const LazyComponent = lazy(importFunc);
  
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// Preload function for critical routes
export function preloadComponent(importFunc: () => Promise<any>) {
  importFunc();
}

// Lazy loaded routes
export const LazyDashboard = lazyLoad(() => import('@/pages/Dashboard'));
export const LazyAuth = lazyLoad(() => import('@/pages/Auth'));
export const LazyGroupDetails = lazyLoad(() => import('@/pages/GroupDetails'));
export const LazyInviteFriends = lazyLoad(() => import('@/pages/InviteFriends'));
export const LazySettings = lazyLoad(() => import('@/pages/Settings'));

// Image optimization component
export const OptimizedImage = ({
  src,
  alt,
  className,
  width,
  height,
  priority = false
}: {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}) => (
  <img
    src={src}
    alt={alt}
    className={className}
    width={width}
    height={height}
    loading={priority ? 'eager' : 'lazy'}
    decoding="async"
  />
);
