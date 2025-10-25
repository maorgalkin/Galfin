import React, { useState, useEffect } from 'react';
import { Settings, Save, Download, Upload, Code, Plus, ChevronRight, Edit, Users } from 'lucide-react';
import { BudgetConfigService } from '../services/budgetConfig';
import type { BudgetConfiguration, FamilyMember } from '../types';
import CategoryEditModal from './CategoryEditModal';
import { getNextAvailableColor } from '../utils/categoryIcons';
import { useFinance } from '../context/FinanceContext';

interface BudgetSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: BudgetConfiguration) => void;
  onOpenFamilyMembers?: () => void;
  familyMembersCount?: number;
}

const BudgetSettings: React.FC<BudgetSettingsProps> = ({
  isOpen,
  onClose,
  onSave,
  onOpenFamilyMembers,
  familyMembersCount: _familyMembersCount = 0
}) => {
  const { familyMembers } = useFinance();
  const [config, setConfig] = useState<BudgetConfiguration | null>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isEditingGlobalSettings, setIsEditingGlobalSettings] = useState(false);
  const [newlyAddedCategory, setNewlyAddedCategory] = useState<string | null>(null);

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
    
    // Get all currently used colors
    const usedColors = Object.values(config.categories)
      .map(cat => cat.color || '')
      .filter(color => color !== '');
    
    const newColor = getNextAvailableColor(usedColors);
    
    const newConfig = {
      ...config,
      categories: {
        ...config.categories,
        [newCategoryName]: {
          monthlyLimit: 0,
          warningThreshold: 80,
          isActive: false,
          color: newColor,
          description: ''
        }
      }
    };
    setConfig(newConfig);
    setJsonText(JSON.stringify(newConfig, null, 2));
    setNewCategoryName('');
    setIsAddingCategory(false);
    // Track as newly added but unsaved
    setNewlyAddedCategory(newCategoryName);
    // Open the newly created category for editing
    setSelectedCategory(newCategoryName);
  };

  const handleCancelNewCategory = () => {
    if (!config || !newlyAddedCategory) return;
    
    const newCategories = { ...config.categories };
    delete newCategories[newlyAddedCategory];
    
    const newConfig = {
      ...config,
      categories: newCategories,
      lastUpdated: new Date().toISOString()
    };
    setConfig(newConfig);
    setJsonText(JSON.stringify(newConfig, null, 2));
    setNewlyAddedCategory(null);
    setSelectedCategory(null);
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
    // Clear newly added flag since it's now saved
    if (newlyAddedCategory === categoryName) {
      setNewlyAddedCategory(null);
    }
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

  const updateGlobalSettings = (updates: Partial<BudgetConfiguration['globalSettings']>) => {
    if (!config) return;
    
    const newConfig = {
      ...config,
      globalSettings: {
        ...config.globalSettings,
        ...updates
      },
      lastUpdated: new Date().toISOString()
    };
    setConfig(newConfig);
    setJsonText(JSON.stringify(newConfig, null, 2));
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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      onClick={handleBackdropClick}
    >
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
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
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
                <h4 className="text-sm font-medium text-gray-700 mb-3">Active Categories</h4>
                <div 
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    maxWidth: '100%',
                  }}
                >
                  {Object.entries(config.categories)
                    .filter(([, category]: any) => category.isActive)
                    .map(([categoryName, category]: any) => (
                      <button
                        key={categoryName}
                        onClick={() => setSelectedCategory(categoryName)}
                        className="flex flex-col p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors text-left"
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: category.color || '#64748B' }}
                          />
                          <div className="font-medium text-gray-900 text-sm flex-1 truncate">{categoryName}</div>
                          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        </div>
                        {category.description && (
                          <div className="text-xs text-gray-500 mb-2 truncate">{category.description}</div>
                        )}
                        <div className="text-sm font-semibold text-gray-900">
                          {getCurrencySymbol(config.globalSettings.currency)}
                          {category.monthlyLimit?.toLocaleString() || '0'}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Inactive Categories List */}
            {Object.entries(config.categories).filter(([, cat]: any) => !cat.isActive).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Inactive Categories</h4>
                <div 
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    maxWidth: '100%',
                  }}
                >
                  {Object.entries(config.categories)
                    .filter(([, category]: any) => !category.isActive)
                    .map(([categoryName, category]: any) => (
                      <button
                        key={categoryName}
                        onClick={() => setSelectedCategory(categoryName)}
                        className="flex flex-col p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors text-left opacity-60"
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: category.color || '#64748B' }}
                          />
                          <div className="font-medium text-gray-900 text-sm flex-1 truncate flex items-center">
                            <span className="truncate">{categoryName}</span>
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded flex-shrink-0">
                              Inactive
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        </div>
                        {category.description && (
                          <div className="text-xs text-gray-500 mb-2 truncate">{category.description}</div>
                        )}
                        <div className="text-sm font-semibold text-gray-900">
                          {getCurrencySymbol(config.globalSettings.currency)}
                          {category.monthlyLimit?.toLocaleString() || '0'}
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
                onCancel={selectedCategory === newlyAddedCategory ? handleCancelNewCategory : undefined}
              />
            )}

            {/* Global Settings Edit Modal */}
            {isEditingGlobalSettings && (
              <div 
                className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60] flex items-center justify-center"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setIsEditingGlobalSettings(false);
                  }
                }}
              >
                <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Global Settings</h3>
                    <button
                      onClick={() => setIsEditingGlobalSettings(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Currency Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency
                      </label>
                      <select
                        value={config.globalSettings.currency}
                        onChange={(e) => updateGlobalSettings({ currency: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="ILS">ILS (₪)</option>
                      </select>
                    </div>

                    {/* Warning Notifications Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-900">
                          Budget Warning Notifications
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Get notified when spending reaches threshold
                        </p>
                      </div>
                      <label className="relative inline-flex h-6 w-11 items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.globalSettings.warningNotifications}
                          onChange={(e) => updateGlobalSettings({
                            warningNotifications: e.target.checked
                          })}
                          className="sr-only peer"
                          aria-label="Toggle budget warning notifications"
                        />
                        <span className="w-11 h-6 bg-gray-200 peer-checked:bg-blue-600 rounded-full peer transition-colors" />
                        <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform" />
                      </label>
                    </div>

                    {/* Email Alerts Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-900">
                          Email Alerts
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Receive budget alerts via email
                        </p>
                      </div>
                      <label className="relative inline-flex h-6 w-11 items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.globalSettings.emailAlerts}
                          onChange={(e) => updateGlobalSettings({
                            emailAlerts: e.target.checked
                          })}
                          className="sr-only peer"
                          aria-label="Toggle email alerts"
                        />
                        <span className="w-11 h-6 bg-gray-200 peer-checked:bg-blue-600 rounded-full peer transition-colors" />
                        <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform" />
                      </label>
                    </div>

                    {/* Family Members Section */}
                    {onOpenFamilyMembers && (
                      <div className="border-t pt-6">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Family Members</h4>
                        {familyMembers && familyMembers.length > 0 ? (
                          <>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {familyMembers.map((member: FamilyMember) => (
                                <div
                                  key={member.id}
                                  className="px-3 py-1.5 rounded-full text-white text-sm font-medium shadow-sm"
                                  style={{ backgroundColor: member.color }}
                                >
                                  {member.name}
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => {
                                setIsEditingGlobalSettings(false);
                                onClose();
                                onOpenFamilyMembers();
                              }}
                              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium text-blue-700"
                            >
                              <Users className="h-4 w-4" />
                              Manage Family Members
                            </button>
                          </>
                        ) : (
                          <div className="text-center p-6 bg-gray-50 rounded-lg">
                            <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 mb-3">No family members configured</p>
                            <button
                              onClick={() => {
                                setIsEditingGlobalSettings(false);
                                onClose();
                                onOpenFamilyMembers();
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              Add Family Members
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Last Updated Info */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Last Updated:</span>
                        <span className="font-medium">
                          {config.lastUpdated ? new Date(config.lastUpdated).toLocaleString() : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setIsEditingGlobalSettings(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setIsEditingGlobalSettings(false)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
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
