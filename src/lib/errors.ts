/**
 * Error handling utilities for consistent user-facing error messages
 */

export interface AppError {
  message: string;
  statusCode?: number;
  recoverable: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
}

export function getErrorMessage(error: unknown): string {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'Network connection lost. Please check your internet and try again.';
  }

  // API response errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // 401 Unauthorized
    if (message.includes('401') || message.includes('unauthorized')) {
      return 'Your session has expired. Please log in again.';
    }

    // 403 Forbidden
    if (message.includes('403') || message.includes('forbidden')) {
      return 'You do not have permission to perform this action.';
    }

    // 404 Not Found
    if (message.includes('404') || message.includes('not found')) {
      return 'The requested resource was not found. It may have been deleted or moved.';
    }

    // 409 Conflict
    if (message.includes('409') || message.includes('conflict')) {
      return 'This record conflicts with existing data. Please check your inputs.';
    }

    // 422 Validation
    if (message.includes('422') || message.includes('validation')) {
      return 'Please check your inputs and try again.';
    }

    // 500 Server Error
    if (message.includes('500') || message.includes('server error')) {
      return 'Server error. Please try again later or contact support if the issue persists.';
    }

    // Return the actual error message if it's user-friendly
    if (error.message.length < 100 && !error.message.includes('fetch')) {
      return error.message;
    }
  }

  // Generic fallback
  return 'Something went wrong. Please try again.';
}

export function parseApiError(response: Response): Promise<string> {
  return response.json().then((data) => {
    return data.error || data.message || 'An error occurred';
  }).catch(() => {
    return 'An unexpected error occurred';
  });
}

export function createError(
  message: string,
  statusCode?: number,
  recoverable: boolean = true
): AppError {
  return {
    message,
    statusCode,
    recoverable,
  };
}

export function isRecoverableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // These errors are recoverable by retrying
    return message.includes('network') ||
           message.includes('timeout') ||
           message.includes('503') ||
           message.includes('502');
  }
  return false;
}
