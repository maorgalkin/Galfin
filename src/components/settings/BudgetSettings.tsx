// Budget Settings Component
// Part of Category Management Restructure (Phase 5)
// Consolidates Global Settings, Family Members, and Household Management

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  DollarSign, 
  Bell, 
  Mail, 
  Users, 
  Home,
  Save,
  Loader2,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useActiveBudget, useUpdatePersonalBudget } from '../../hooks/useBudgets';
import HouseholdSettingsModal from '../HouseholdSettingsModal';
import * as HouseholdService from '../../services/householdService';
import type { Household } from '../../services/householdService';

interface BudgetSettingsProps {
  className?: string;
}

export const BudgetSettings: React.FC<BudgetSettingsProps> = ({ className = '' }) => {
  const { data: activeBudget, isLoading: loadingBudget } = useActiveBudget();
  const updateBudget = useUpdatePersonalBudget();
  
  // Global settings state
  const [currency, setCurrency] = useState('ILS');
  const [warningNotifications, setWarningNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Household state
  const [household, setHousehold] = useState<Household | null>(null);
  const [loadingHousehold, setLoadingHousehold] = useState(true);
  const [showHouseholdModal, setShowHouseholdModal] = useState(false);
  
  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    currency: true,
    notifications: true,
    household: true,
  });

  // Load settings from active budget
  useEffect(() => {
    if (activeBudget?.global_settings) {
      setCurrency(activeBudget.global_settings.currency || 'ILS');
      setWarningNotifications(activeBudget.global_settings.warningNotifications ?? true);
      setEmailAlerts(activeBudget.global_settings.emailAlerts ?? false);
      setHasChanges(false);
    }
  }, [activeBudget]);

  // Load household data
  useEffect(() => {
    const loadHousehold = async () => {
      try {
        const data = await HouseholdService.getUserHousehold();
        setHousehold(data);
      } catch (error) {
        console.error('Error loading household:', error);
      } finally {
        setLoadingHousehold(false);
      }
    };
    loadHousehold();
  }, [showHouseholdModal]); // Reload when modal closes

  const handleSaveSettings = async () => {
    if (!activeBudget) return;

    try {
      const updatedGlobalSettings = {
        ...activeBudget.global_settings,
        currency,
        warningNotifications,
        emailAlerts,
      };

      await updateBudget.mutateAsync({
        budgetId: activeBudget.id,
        updates: {
          global_settings: updatedGlobalSettings,
        },
      });

      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    }
  };

  const handleSettingChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value);
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getCurrencySymbol = (curr: string) => {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      ILS: '₪',
      JPY: '¥',
    };
    return symbols[curr] || curr;
  };

  if (loadingBudget) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!activeBudget) {
    return (
      <div className="text-center py-12">
        <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          Create a budget first to configure settings
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Budget Settings
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure your budget preferences and household
          </p>
        </div>
        
        {/* Save Button */}
        {hasChanges && (
          <button
            onClick={handleSaveSettings}
            disabled={updateBudget.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {updateBudget.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
        )}
        
        {saveSuccess && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <Check className="h-5 w-5" />
            <span className="text-sm font-medium">Saved!</span>
          </div>
        )}
      </div>

      {/* Current Settings Summary */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Current Settings
        </h4>
        <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
          <span>Currency: {getCurrencySymbol(currency)} ({currency})</span>
          {warningNotifications && (
            <span className="text-green-600 dark:text-green-400">✓ Warning Notifications</span>
          )}
          {emailAlerts && (
            <span className="text-green-600 dark:text-green-400">✓ Email Alerts</span>
          )}
          {household && (
            <span className="text-purple-600 dark:text-purple-400">✓ Household: {household.name}</span>
          )}
        </div>
      </div>

      {/* Household Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => toggleSection('household')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Home className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-left">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Household</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {loadingHousehold ? 'Loading...' : household?.name || 'No household'}
              </p>
            </div>
          </div>
          {expandedSections.household ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.household && (
          <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            {loadingHousehold ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : household ? (
              <div className="space-y-4">
                {/* Household Info Card */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                      <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900 dark:text-gray-100">
                        {household.name}
                      </h5>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Created {new Date(household.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setShowHouseholdModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    Manage
                  </button>
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage household members, invite participants, and configure member tags for transactions.
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400 mb-3">
                  No household configured
                </p>
                <button
                  onClick={() => setShowHouseholdModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  Set Up Household
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Currency Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => toggleSection('currency')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-left">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Currency</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Current: {getCurrencySymbol(currency)} ({currency})
              </p>
            </div>
          </div>
          {expandedSections.currency ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.currency && (
          <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Display Currency
            </label>
            <select
              value={currency}
              onChange={(e) => handleSettingChange(setCurrency, e.target.value)}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="USD">USD ($) - US Dollar</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="GBP">GBP (£) - British Pound</option>
              <option value="ILS">ILS (₪) - Israeli Shekel</option>
              <option value="JPY">JPY (¥) - Japanese Yen</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              This affects how amounts are displayed throughout the app
            </p>
          </div>
        )}
      </div>

      {/* Notifications Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => toggleSection('notifications')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-left">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Notifications</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {warningNotifications ? 'Warnings enabled' : 'Warnings disabled'}
                {emailAlerts ? ', Email alerts on' : ''}
              </p>
            </div>
          </div>
          {expandedSections.notifications ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.notifications && (
          <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-4">
            {/* Warning Notifications */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Budget Warnings
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Show alerts when spending approaches category limits
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={warningNotifications}
                  onChange={(e) => handleSettingChange(setWarningNotifications, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>
            
            {/* Email Alerts */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Email Alerts
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive email notifications for important budget events
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => handleSettingChange(setEmailAlerts, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="text-sm text-gray-500 dark:text-gray-400 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <p className="font-medium mb-2">💡 Settings Tips:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Household:</strong> Share budgets and track spending across family members</li>
          <li><strong>Currency:</strong> Changes how amounts are displayed, not the actual values</li>
          <li><strong>Notifications:</strong> Get notified when you're close to exceeding category limits</li>
        </ul>
      </div>

      {/* Household Settings Modal */}
      <HouseholdSettingsModal
        isOpen={showHouseholdModal}
        onClose={() => setShowHouseholdModal(false)}
      />
    </div>
  );
};
