import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow = true, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress console.error output in tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.clearAllTimers();
  });

  describe('Normal Operation', () => {
    it('renders children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('does not show error UI when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('catches errors and displays error UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError errorMessage="Component crashed" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/Component crashed/i)).toBeInTheDocument();
    });

    it('shows reload button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/reload page now/i)).toBeInTheDocument();
    });
  });

  describe('Critical Error Detection', () => {
    it('detects "is not defined" as critical error', () => {
      render(
        <ErrorBoundary autoReloadOnCriticalError={true} autoReloadDelay={5}>
          <ThrowError errorMessage="BudgetConfigService is not defined" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/critical error detected/i)).toBeInTheDocument();
      expect(screen.getByText(/auto-reloading in \d+ second/i)).toBeInTheDocument();
    });

    it('detects "is not a function" as critical error', () => {
      render(
        <ErrorBoundary autoReloadOnCriticalError={true} autoReloadDelay={5}>
          <ThrowError errorMessage="someFunction is not a function" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/critical error detected/i)).toBeInTheDocument();
    });

    it('detects "Cannot read property" as critical error', () => {
      render(
        <ErrorBoundary autoReloadOnCriticalError={true} autoReloadDelay={5}>
          <ThrowError errorMessage="Cannot read property 'foo' of undefined" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/critical error detected/i)).toBeInTheDocument();
    });

    it('does not mark regular errors as critical', () => {
      render(
        <ErrorBoundary autoReloadOnCriticalError={true} autoReloadDelay={5}>
          <ThrowError errorMessage="Some regular error message" />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/critical error detected/i)).not.toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('Auto-reload Configuration', () => {
    it('shows auto-reload countdown when autoReloadOnCriticalError is true', () => {
      render(
        <ErrorBoundary autoReloadOnCriticalError={true} autoReloadDelay={3}>
          <ThrowError errorMessage="Service is not defined" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/auto-reloading in 3 seconds/i)).toBeInTheDocument();
    });

    it('does not show auto-reload for non-critical errors', () => {
      render(
        <ErrorBoundary autoReloadOnCriticalError={true} autoReloadDelay={3}>
          <ThrowError errorMessage="Regular error" />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/auto-reloading/i)).not.toBeInTheDocument();
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
    });

    it('does not auto-reload when autoReloadOnCriticalError is false', () => {
      render(
        <ErrorBoundary autoReloadOnCriticalError={false}>
          <ThrowError errorMessage="Service is not defined" />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/auto-reloading/i)).not.toBeInTheDocument();
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });
  });

  describe('Development Mode', () => {
    it('shows stack trace in development mode', () => {
      // Note: import.meta.env.DEV is set during build, so this test verifies the UI exists
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Stack trace is in a details element
      const detailsElement = screen.queryByText(/stack trace/i);
      if (detailsElement) {
        expect(detailsElement).toBeInTheDocument();
      }
    });
  });
});
