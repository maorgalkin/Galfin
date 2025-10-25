import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Settings, Plus, ChevronRight, Edit } from 'lucide-react';
import CategoryEditModal from './CategoryEditModal';
import type { BudgetConfiguration } from '../types';

const BudgetConfigViewer: React.FC = () => {
  const { budgetConfig, setBudgetConfig } = useFinance();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isEditingGlobalSettings, setIsEditingGlobalSettings] = useState(false);

  // Get currency symbol based on the current configuration
  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'USD':
        return '$';
      case 'ILS':
        return '₪';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      default:
        return currency;
    }
  };

  const activeBudgets = Object.entries(budgetConfig.categories).filter(([, category]) => category.isActive);
  const inactiveBudgets = Object.entries(budgetConfig.categories).filter(([, category]) => !category.isActive);

  const handleCategoryUpdate = (categoryName: string, updates: Partial<BudgetConfiguration['categories'][string]>) => {
    const newConfig = {
      ...budgetConfig,
      categories: {
        ...budgetConfig.categories,
        [categoryName]: {
          ...budgetConfig.categories[categoryName],
          ...updates
        }
      },
      lastUpdated: new Date().toISOString()
    };
    setBudgetConfig(newConfig);
  };

  const handleCategoryDelete = (categoryName: string) => {
    const newCategories = { ...budgetConfig.categories };
    delete newCategories[categoryName];
    
    const newConfig = {
      ...budgetConfig,
      categories: newCategories,
      lastUpdated: new Date().toISOString()
    };
    setBudgetConfig(newConfig);
    setSelectedCategory(null);
  };

  const updateGlobalSettings = (updates: Partial<BudgetConfiguration['globalSettings']>) => {
    const newConfig = {
      ...budgetConfig,
      globalSettings: {
        ...budgetConfig.globalSettings,
        ...updates
      },
      lastUpdated: new Date().toISOString()
    };
    setBudgetConfig(newConfig);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const newConfig = {
      ...budgetConfig,
      categories: {
        ...budgetConfig.categories,
        [newCategoryName]: {
          monthlyLimit: 0,
          warningThreshold: 80,
          isActive: true,
          color: '#64748B',
          description: ''
        }
      },
      lastUpdated: new Date().toISOString()
    };
    setBudgetConfig(newConfig);
    setNewCategoryName('');
    setIsAddingCategory(false);
    // Open the newly created category for editing
    setSelectedCategory(newCategoryName);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Settings className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Budget Categories</h3>
          </div>
          <button
            onClick={() => setIsAddingCategory(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>

        {/* Global Settings Summary */}
        <div className="mb-6 pb-4 border-b bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">Global Settings</h4>
            <button
              onClick={() => setIsEditingGlobalSettings(true)}
              className="text-blue-600 hover:text-blue-700 flex items-center text-sm"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Currency:</span>
              <span className="ml-1 font-medium">{budgetConfig.globalSettings.currency}</span>
            </div>
            <div>
              <span className="text-gray-500">Active Categories:</span>
              <span className="ml-1 font-medium">{activeBudgets.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Notifications:</span>
              <span className="ml-1 font-medium">{budgetConfig.globalSettings.warningNotifications ? 'On' : 'Off'}</span>
            </div>
            <div>
              <span className="text-gray-500">Last Updated:</span>
              <span className="ml-1 font-medium">{new Date(budgetConfig.lastUpdated).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Active Categories List */}
        {activeBudgets.length > 0 && (
          <div className="space-y-3 mb-6">
            <h4 className="text-sm font-medium text-gray-700">Active Categories:</h4>
            <div className="grid gap-2">
              {activeBudgets.map(([categoryName, category]) => (
                <button
                  key={categoryName}
                  onClick={() => setSelectedCategory(categoryName)}
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    {category.color && (
                      <div 
                        className="w-3 h-3 rounded-full mr-3 flex-shrink-0 border border-gray-300"
                        style={{ backgroundColor: category.color }}
                      />
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium text-sm text-gray-900">{categoryName}</div>
                      {category.description && (
                        <div className="text-xs text-gray-500 truncate">{category.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="flex items-center text-sm font-medium text-gray-900">
                        <span className="mr-1">{getCurrencySymbol(budgetConfig.globalSettings.currency)}</span>
                        {category.monthlyLimit.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Alert at {category.warningThreshold}%
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Inactive Categories List */}
        {inactiveBudgets.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-500">Inactive Categories:</h4>
            <div className="grid gap-2">
              {inactiveBudgets.map(([categoryName, category]) => (
                <button
                  key={categoryName}
                  onClick={() => setSelectedCategory(categoryName)}
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors opacity-60 hover:opacity-100 group"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    {category.color && (
                      <div 
                        className="w-3 h-3 rounded-full mr-3 flex-shrink-0 border border-gray-300"
                        style={{ backgroundColor: category.color }}
                      />
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-medium text-sm text-gray-900">{categoryName}</div>
                      {category.description && (
                        <div className="text-xs text-gray-500 truncate">{category.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-xs text-gray-400">Inactive</div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {activeBudgets.length === 0 && inactiveBudgets.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Settings className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium mb-1">No budget categories yet</p>
            <p className="text-sm">Click "Add Category" to create your first budget category</p>
          </div>
        )}
      </div>

      {/* Add Category Modal */}
      {isAddingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Category</h3>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              placeholder="Category name (e.g., Groceries)"
              className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsAddingCategory(false);
                  setNewCategoryName('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Edit Modal */}
      {selectedCategory && budgetConfig.categories[selectedCategory] && (
        <CategoryEditModal
          isOpen={true}
          onClose={() => setSelectedCategory(null)}
          categoryName={selectedCategory}
          category={budgetConfig.categories[selectedCategory]}
          currency={budgetConfig.globalSettings.currency}
          onSave={(updates) => handleCategoryUpdate(selectedCategory, updates)}
          onDelete={() => handleCategoryDelete(selectedCategory)}
        />
      )}

      {/* Global Settings Edit Modal */}
      {isEditingGlobalSettings && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60] flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Global Settings</h3>
            
            <div className="space-y-4">
              {/* Currency Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  value={budgetConfig.globalSettings.currency}
                  onChange={(e) => updateGlobalSettings({ currency: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="ILS">ILS (₪)</option>
                </select>
              </div>

              {/* Warning Notifications */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="warningNotifications"
                  checked={budgetConfig.globalSettings.warningNotifications}
                  onChange={(e) => updateGlobalSettings({ warningNotifications: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="warningNotifications" className="ml-2 text-sm text-gray-700">
                  Enable warning notifications when approaching budget limits
                </label>
              </div>

              {/* Email Alerts */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="emailAlerts"
                  checked={budgetConfig.globalSettings.emailAlerts}
                  onChange={(e) => updateGlobalSettings({ emailAlerts: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="emailAlerts" className="ml-2 text-sm text-gray-700">
                  Send email alerts for budget warnings
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsEditingGlobalSettings(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BudgetConfigViewer;
