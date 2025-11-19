// Error tracking and monitoring utility
// Can be integrated with Sentry or other error tracking services

interface ErrorContext {
  userId?: string;
  route?: string;
  action?: string;
  metadata?: Record<string, any>;
}

class ErrorTracker {
  private enabled: boolean = true;
  
  // Initialize error tracking (e.g., Sentry)
  init() {
    // Add Sentry.init() here if using Sentry
    console.info('Error tracking initialized');
    
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError(event.error, {
        route: window.location.pathname,
        metadata: { message: event.message, filename: event.filename, lineno: event.lineno }
      });
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(new Error(event.reason), {
        route: window.location.pathname,
        metadata: { reason: event.reason }
      });
    });
  }
  
  // Capture error with context
  captureError(error: Error, context?: ErrorContext) {
    if (!this.enabled) return;
    
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...context
    };
    
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error captured:', errorData);
    }
    
    // Send to error tracking service
    // Sentry.captureException(error, { contexts: { custom: context } });
    
    // Log to analytics
    this.logToAnalytics(errorData);
  }
  
  // Capture message (non-error events)
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext) {
    if (!this.enabled) return;
    
    const logData = {
      message,
      level,
      timestamp: new Date().toISOString(),
      ...context
    };
    
    if (import.meta.env.DEV) {
      console.log('Message captured:', logData);
    }
    
    // Sentry.captureMessage(message, level);
    this.logToAnalytics(logData);
  }
  
  // Set user context
  setUser(userId: string, email?: string) {
    // Sentry.setUser({ id: userId, email });
  }
  
  // Clear user context
  clearUser() {
    // Sentry.setUser(null);
  }
  
  // Add breadcrumb for debugging
  addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
    if (!this.enabled) return;
    
    // Sentry.addBreadcrumb({ message, category, data, timestamp: Date.now() / 1000 });
  }
  
  // Log to analytics service
  private logToAnalytics(data: any) {
    // Send to analytics endpoint
    // You can integrate with your analytics service here
  }
  
  // Disable error tracking (e.g., for testing)
  disable() {
    this.enabled = false;
  }
  
  // Enable error tracking
  enable() {
    this.enabled = true;
  }
}

export const errorTracker = new ErrorTracker();

// Performance monitoring
export class PerformanceMonitor {
  private metrics: Map<string, number> = new Map();
  
  // Start timing
  startTiming(label: string) {
    this.metrics.set(label, performance.now());
  }
  
  // End timing and log
  endTiming(label: string) {
    const start = this.metrics.get(label);
    if (!start) return;
    
    const duration = performance.now() - start;
    this.metrics.delete(label);
    
    // Log slow operations
    if (duration > 1000) {
      errorTracker.captureMessage(
        `Slow operation: ${label} took ${duration.toFixed(2)}ms`,
        'warning',
        { metadata: { duration, label } }
      );
    }
    
    return duration;
  }
  
  // Measure React component render
  measureRender(componentName: string, callback: () => void) {
    this.startTiming(componentName);
    callback();
    const duration = this.endTiming(componentName);
    
    if (duration && duration > 100) {
      console.warn(`${componentName} rendered in ${duration.toFixed(2)}ms`);
    }
  }
  
  // Get Web Vitals
  getWebVitals() {
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log('LCP:', entry);
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] });
      
      // First Input Delay
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log('FID:', entry);
        }
      }).observe({ entryTypes: ['first-input'] });
      
      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log('CLS:', entry);
        }
      }).observe({ entryTypes: ['layout-shift'] });
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();
