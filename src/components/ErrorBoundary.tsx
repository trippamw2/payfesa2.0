import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
          <Card className="p-6 max-w-md w-full">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
                <p className="text-sm text-muted-foreground">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                <details className="text-left">
                  <summary className="text-xs text-muted-foreground cursor-pointer">
                    Error details
                  </summary>
                  <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto max-h-32">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload
                </Button>
                <Button 
                  onClick={this.handleGoHome} 
                  className="flex-1"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
