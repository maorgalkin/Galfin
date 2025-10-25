import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, Download, Upload, Code, Plus, Trash2, ChevronRight } from 'lucide-react';
import { BudgetConfigService } from '../services/budgetConfig';
import type { BudgetConfiguration } from '../types';
import CategoryEditModal from './CategoryEditModal';

interface BudgetSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: BudgetConfiguration) => void;
}

const BudgetSettings: React.FC<BudgetSettingsProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [config, setConfig] = useState<BudgetConfiguration | null>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

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

  // Load configuration when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadedConfig = BudgetConfigService.loadConfig();
      setConfig(loadedConfig);
      setJsonText(JSON.stringify(loadedConfig, null, 2));
      setJsonError('');
    }
  }, [isOpen]);

  const addCategory = () => {
    if (!config || !newCategoryName.trim()) return;
    
    const newConfig = {
      ...config,
      categories: {
        ...config.categories,
        [newCategoryName]: {
          monthlyLimit: 0,
          warningThreshold: 80,
          isActive: false,
          color: '#64748B',
          description: ''
        }
      }
    };
    setConfig(newConfig);
    setJsonText(JSON.stringify(newConfig, null, 2));
    setNewCategoryName('');
    setIsAddingCategory(false);
    // Open the newly created category for editing
    setSelectedCategory(newCategoryName);
  };

  const handleCategoryUpdate = (categoryName: string, updates: Partial<BudgetConfiguration['categories'][string]>) => {
    if (!config) return;
    
    const newConfig = {
      ...config,
      categories: {
        ...config.categories,
        [categoryName]: {
          ...config.categories[categoryName],
          ...updates
        }
      },
      lastUpdated: new Date().toISOString()
    };
    setConfig(newConfig);
    setJsonText(JSON.stringify(newConfig, null, 2));
  };

  const handleCategoryDelete = (categoryName: string) => {
    if (!config) return;
    
    const newCategories = { ...config.categories };
    delete newCategories[categoryName];
    
    const newConfig = {
      ...config,
      categories: newCategories,
      lastUpdated: new Date().toISOString()
    };
    setConfig(newConfig);
    setJsonText(JSON.stringify(newConfig, null, 2));
    setSelectedCategory(null);
  };

  const handleJsonChange = (value: string) => {
    setJsonText(value);
    try {
      const parsed = JSON.parse(value) as BudgetConfiguration;
      if (parsed.version && parsed.categories && parsed.globalSettings) {
        setConfig(parsed);
        setJsonError('');
      } else {
        setJsonError('Invalid configuration structure');
      }
    } catch (error) {
      setJsonError('Invalid JSON format');
    }
  };

  const handleSave = () => {
    if (!config) return;
    
    try {
      BudgetConfigService.saveConfig(config);
      onSave(config);
      onClose();
    } catch (error) {
      setJsonError('Failed to save configuration');
    }
  };

  const handleExport = () => {
    if (!config) return;
    
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `galfin-budget-config-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content) as BudgetConfiguration;
        setConfig(parsed);
        setJsonText(JSON.stringify(parsed, null, 2));
        setJsonError('');
      } catch (error) {
        setJsonError('Failed to import configuration file');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen || !config) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Settings className="h-6 w-6 text-gray-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Budget Configuration</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('visual')}
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'visual'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Visual Editor
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`py-2 px-4 text-sm font-medium flex items-center ${
              activeTab === 'json'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Code className="h-4 w-4 mr-1" />
            JSON Editor
          </button>
        </div>

        {activeTab === 'visual' && (
          <div className="space-y-6">
            {/* Header with Add Category Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Settings className="h-5 w-5 text-gray-600 mr-2" />
                <h4 className="text-md font-medium text-gray-900">Budget Categories</h4>
              </div>
              <button
                onClick={() => setIsAddingCategory(true)}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Category
              </button>
            </div>

            {/* Global Settings Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Global Settings</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Currency:</span>
                  <span className="ml-2 font-medium text-gray-900">{config.globalSettings.currency}</span>
                </div>
                <div>
                  <span className="text-gray-500">Active Categories:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {Object.values(config.categories).filter((c: any) => c.isActive).length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Warnings:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {config.globalSettings.warningNotifications ? 'On' : 'Off'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {config.lastUpdated ? new Date(config.lastUpdated).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>

            {/* Active Categories List */}
            {Object.entries(config.categories).filter(([, cat]: any) => cat.isActive).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Active Categories</h4>
                <div className="space-y-2">
                  {Object.entries(config.categories)
                    .filter(([, category]: any) => category.isActive)
                    .map(([categoryName, category]: any) => (
                      <button
                        key={categoryName}
                        onClick={() => setSelectedCategory(categoryName)}
                        className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: category.color || '#64748B' }}
                          />
                          <div>
                            <div className="font-medium text-gray-900">{categoryName}</div>
                            {category.description && (
                              <div className="text-xs text-gray-500 mt-0.5">{category.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-sm font-medium text-gray-900">
                            {getCurrencySymbol(config.globalSettings.currency)}
                            {category.monthlyLimit?.toLocaleString() || '0'}
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Inactive Categories List */}
            {Object.entries(config.categories).filter(([, cat]: any) => !cat.isActive).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Inactive Categories</h4>
                <div className="space-y-2">
                  {Object.entries(config.categories)
                    .filter(([, category]: any) => !category.isActive)
                    .map(([categoryName, category]: any) => (
                      <button
                        key={categoryName}
                        onClick={() => setSelectedCategory(categoryName)}
                        className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors text-left opacity-60"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: category.color || '#64748B' }}
                          />
                          <div>
                            <div className="font-medium text-gray-900 flex items-center">
                              {categoryName}
                              <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                                Inactive
                              </span>
                            </div>
                            {category.description && (
                              <div className="text-xs text-gray-500 mt-0.5">{category.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-sm font-medium text-gray-900">
                            {getCurrencySymbol(config.globalSettings.currency)}
                            {category.monthlyLimit?.toLocaleString() || '0'}
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {Object.keys(config.categories).length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No categories configured yet</p>
                <button
                  onClick={() => setIsAddingCategory(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 inline-flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Your First Category
                </button>
              </div>
            )}

            {/* Add Category Modal */}
            {isAddingCategory && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60] flex items-center justify-center">
                <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Category</h3>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name (e.g., Groceries, Entertainment)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newCategoryName.trim()) {
                        addCategory();
                      }
                    }}
                    autoFocus
                  />
                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCategoryName('');
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addCategory}
                      disabled={!newCategoryName.trim()}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Category
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Category Edit Modal */}
            {selectedCategory && config.categories[selectedCategory] && (
              <CategoryEditModal
                isOpen={true}
                onClose={() => setSelectedCategory(null)}
                categoryName={selectedCategory}
                category={config.categories[selectedCategory]}
                currency={config.globalSettings.currency}
                onSave={(updates) => handleCategoryUpdate(selectedCategory, updates)}
                onDelete={() => handleCategoryDelete(selectedCategory)}
              />
            )}
          </div>
        )}

        {activeTab === 'json' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Edit the raw JSON configuration. Changes will be validated automatically.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleExport}
                  className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </button>
                <label className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 cursor-pointer flex items-center">
                  <Upload className="h-3 w-3 mr-1" />
                  Import
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            
            {jsonError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{jsonError}</p>
              </div>
            )}

            <textarea
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              className="w-full h-96 font-mono text-sm border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter JSON configuration..."
            />
          </div>
        )}

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!!jsonError}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetSettings;
