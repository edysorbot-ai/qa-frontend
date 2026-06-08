'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function TestCasesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[test-cases] route error:', error);
  }, [error]);

  return (
    <div className="container mx-auto py-12">
      <div className="max-w-2xl mx-auto border rounded-lg p-6 bg-red-50 border-red-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-red-900 mb-2">
              Test Cases page crashed
            </h2>
            <p className="text-sm text-red-800 mb-3">{error.message || 'Unknown error'}</p>
            {error.digest && (
              <p className="text-xs text-red-700 mb-3">
                <span className="font-mono">digest: {error.digest}</span>
              </p>
            )}
            <pre className="text-xs bg-white border border-red-200 rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap break-all">
              {error.stack || String(error)}
            </pre>
            <div className="mt-4 flex gap-2">
              <Button onClick={reset} size="sm">Try again</Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/dashboard">Back to dashboard</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
