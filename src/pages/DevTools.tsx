import { useState } from 'react';
import { Database, Trash2, Loader2 } from 'lucide-react';
import { seedDummyData, clearDummyData } from '../utils/dummyDataSeeder';

/**
 * DevTools Page - Development utilities
 * This page provides tools for testing and development
 */
export function DevTools() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSeedData = async () => {
    setIsSeeding(true);
    setMessage(null);
    try {
      await seedDummyData();
      setMessage({
        type: 'success',
        text: 'Successfully seeded dummy data for the entire year! Refresh the page to see the data.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error seeding data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('Are you sure you want to clear all dummy data for this year?')) {
      return;
    }

    setIsClearing(true);
    setMessage(null);
    try {
      await clearDummyData();
      setMessage({
        type: 'success',
        text: 'Successfully cleared dummy data! Refresh the page to see the changes.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error clearing data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Development Tools
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Testing utilities for development and debugging
        </p>
      </div>

      {/* Dummy Data Seeder */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start mb-4">
          <Database className="h-6 w-6 text-blue-500 mr-3 mt-1" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Dummy Data Seeder
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Generate a full year of test data with extreme category patterns for testing analytics:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-1">
              <li>
                <span className="font-semibold text-red-500">Dining Out:</span> Always OVER budget (150-200%)
              </li>
              <li>
                <span className="font-semibold text-green-500">Entertainment:</span> Always UNDER budget (20-40%)
              </li>
              <li>
                <span className="font-semibold text-gray-500">Pet Care:</span> NEVER used (0%)
              </li>
              <li>
                <span className="font-semibold text-blue-500">Other categories:</span> Normal variation (70-110%)
              </li>
            </ul>
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
              ⚠️ This will replace existing data for the current year!
            </p>
            <button
              onClick={handleSeedData}
              disabled={isSeeding}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSeeding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Seeding Data...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Seed Dummy Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Clear Data */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start">
          <Trash2 className="h-6 w-6 text-red-500 mr-3 mt-1" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Clear Dummy Data
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Remove all transactions and monthly budgets for the current year.
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              ⚠️ This action cannot be undone!
            </p>
            <button
              onClick={handleClearData}
              disabled={isClearing}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isClearing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clearing Data...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Dummy Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
          }`}
        >
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mt-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          About This Tool
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
          This seeder creates realistic test data to help you visualize how the analytics work with different spending patterns:
        </p>
        <ul className="list-disc list-inside text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>Creates a personal budget with 9 categories</li>
          <li>Generates monthly budgets for all 12 months (with occasional adjustments)</li>
          <li>Creates 3-8 transactions per category per month (total ~400-500 transactions)</li>
          <li>Distributes transactions realistically throughout each month</li>
          <li>Includes three extreme patterns to test edge cases</li>
        </ul>
      </div>
    </div>
  );
}
