import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary component for graceful error handling
 * Catches JavaScript errors anywhere in the child component tree
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // In a real app, you might want to send this to an error reporting service
    // like Sentry, LogRocket, or similar
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-5">
          <div className="text-center max-w-lg p-10 border border-red-300 rounded-xl bg-red-50">
            <h2 className="text-red-600 text-2xl font-bold mb-5">Oops! Something went wrong</h2>
            <details className="my-5 text-left">
              <summary className="cursor-pointer text-gray-500 text-sm">Error Details</summary>
              <pre className="bg-gray-100 p-2.5 rounded text-xs overflow-x-auto mt-2.5">{this.state.error?.message}</pre>
            </details>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="m-2.5 px-5 py-2.5 border-0 rounded-md cursor-pointer font-medium bg-blue-500 text-white hover:bg-blue-600"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="m-2.5 px-5 py-2.5 border-0 rounded-md cursor-pointer font-medium bg-gray-500 text-white hover:bg-gray-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}