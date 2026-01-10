/**
 * Subscription Error Hook
 * 
 * Utility hook for handling subscription and credit errors from the API.
 * Displays appropriate error messages and provides upgrade prompts.
 */

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export interface SubscriptionError {
  error: string;
  message: string;
  details?: {
    upgradeRequired?: boolean;
    action?: string;
    required?: number;
    available?: number;
    feature?: string;
    currentPackage?: string;
    current?: number;
    max?: number;
  };
}

export interface SubscriptionErrorResult {
  type: 'error' | 'warning';
  code: string;
  message: string;
  details?: {
    required?: number;
    available?: number;
    packageName?: string;
    creditsPerTest?: number;
    testCaseCount?: number;
    max?: number;
    current?: number;
    feature?: string;
  };
}

export function useSubscriptionError() {
  const router = useRouter();

  /**
   * Check if an error response is a subscription/credit error
   */
  const isSubscriptionError = useCallback((status: number): boolean => {
    return status === 402;
  }, []);

  /**
   * Parse subscription error to get user-friendly message
   */
  const parseSubscriptionError = useCallback((errorData: SubscriptionError): SubscriptionErrorResult => {
    let code = 'UNKNOWN';
    let message = errorData.message || 'Please upgrade your subscription to continue.';

    switch (errorData.error) {
      case 'subscription_required':
        code = 'NO_SUBSCRIPTION';
        message = 'An active subscription is required to perform this action. Please purchase a package to continue.';
        break;

      case 'subscription_expired':
        code = 'SUBSCRIPTION_INACTIVE';
        message = 'Your subscription has expired. Please renew to continue using this feature.';
        break;

      case 'insufficient_credits':
        code = 'INSUFFICIENT_CREDITS';
        message = `You need ${errorData.details?.required || 0} credits but only have ${errorData.details?.available || 0}. Please purchase more credits.`;
        break;

      case 'feature_not_available':
        code = 'FEATURE_UNAVAILABLE';
        message = `This feature is not included in your ${errorData.details?.currentPackage || 'current'} package. Please upgrade to access this feature.`;
        break;

      case 'team_member_limit_reached':
        code = 'LIMIT_REACHED';
        message = `You have reached the maximum number of team members (${errorData.details?.max || 0}). Please upgrade your package to add more.`;
        break;

      default:
        break;
    }

    return {
      type: 'error',
      code,
      message,
      details: {
        required: errorData.details?.required,
        available: errorData.details?.available,
        packageName: errorData.details?.currentPackage,
        max: errorData.details?.max,
        current: errorData.details?.current,
        feature: errorData.details?.feature,
      },
    };
  }, []);

  /**
   * Handle subscription error - redirect to settings if needed
   */
  const handleSubscriptionError = useCallback((
    errorData: SubscriptionError,
    options?: {
      redirectToSettings?: boolean;
      onError?: (result: SubscriptionErrorResult) => void;
    }
  ): SubscriptionErrorResult => {
    const { redirectToSettings = false, onError } = options || {};
    const result = parseSubscriptionError(errorData);

    if (onError) {
      onError(result);
    }

    if (redirectToSettings) {
      router.push('/dashboard/settings?tab=subscription');
    }

    return result;
  }, [parseSubscriptionError, router]);

  /**
   * Process API response and handle subscription errors automatically
   * Returns true if there was a subscription error
   */
  const processApiResponse = useCallback(async (
    response: Response,
    options?: {
      showToast?: boolean;
      redirectToSettings?: boolean;
      onError?: (result: SubscriptionErrorResult) => void;
    }
  ): Promise<{ isSubscriptionError: boolean; errorData?: SubscriptionError; errorResult?: SubscriptionErrorResult }> => {
    if (!isSubscriptionError(response.status)) {
      return { isSubscriptionError: false };
    }

    try {
      const errorData: SubscriptionError = await response.json();
      const errorResult = handleSubscriptionError(errorData, {
        redirectToSettings: options?.redirectToSettings,
        onError: options?.onError,
      });

      // Show alert if showToast is true and no custom onError handler
      if (options?.showToast && !options?.onError) {
        // Get title based on code
        const title = errorResult.code === 'NO_SUBSCRIPTION' 
          ? 'Subscription Required'
          : errorResult.code === 'SUBSCRIPTION_INACTIVE'
          ? 'Subscription Expired'
          : errorResult.code === 'INSUFFICIENT_CREDITS'
          ? 'Insufficient Credits'
          : 'Subscription Error';
        
        const shouldUpgrade = confirm(`${title}\n\n${errorResult.message}\n\nWould you like to go to settings to upgrade?`);
        if (shouldUpgrade) {
          router.push('/dashboard/settings?tab=subscription');
        }
      }

      return { isSubscriptionError: true, errorData, errorResult };
    } catch {
      const fallbackResult: SubscriptionErrorResult = {
        type: 'error',
        code: 'UNKNOWN',
        message: 'A subscription or payment issue occurred. Please check your account.',
      };
      return { isSubscriptionError: true, errorResult: fallbackResult };
    }
  }, [isSubscriptionError, handleSubscriptionError, router]);

  /**
   * Navigate to subscription settings
   */
  const goToSubscriptionSettings = useCallback(() => {
    router.push('/dashboard/settings?tab=subscription');
  }, [router]);

  return {
    isSubscriptionError,
    parseSubscriptionError,
    handleSubscriptionError,
    processApiResponse,
    goToSubscriptionSettings,
  };
}

/**
 * Wrapper function for API calls that automatically handles subscription errors
 */
export async function fetchWithSubscriptionCheck<T>(
  url: string,
  options: RequestInit,
  onSubscriptionError?: (error: SubscriptionError) => void
): Promise<{ success: boolean; data?: T; subscriptionError?: SubscriptionError }> {
  try {
    const response = await fetch(url, options);

    if (response.status === 402) {
      const errorData: SubscriptionError = await response.json();
      if (onSubscriptionError) {
        onSubscriptionError(errorData);
      }
      return { success: false, subscriptionError: errorData };
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'API request failed');
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    throw error;
  }
}
