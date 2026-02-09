'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

const LOW_CREDIT_THRESHOLD = 50;

export function LowCreditWarning() {
  const { getToken } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const response = await fetch(`${api.baseUrl}/api/users/subscription`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setCredits(data.current_credits ?? data.credits ?? null);
        }
      } catch {
        // Silently fail — this is a non-critical UI enhancement
      }
    };

    fetchCredits();
  }, [getToken]);

  if (dismissed || credits === null || credits >= LOW_CREDIT_THRESHOLD) {
    return null;
  }

  return (
    <div className="mx-4 mt-4 mb-0 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/40">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          You have <strong>{credits}</strong> credits remaining.{' '}
          <Link href="/dashboard/settings" className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100">
            Purchase more credits
          </Link>{' '}
          to continue running tests.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
