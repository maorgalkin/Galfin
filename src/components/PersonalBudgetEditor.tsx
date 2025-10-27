import React, { useState, useEffect } from 'react';
import {
  useActiveBudget,
  usePersonalBudgetHistory,
  useCreatePersonalBudget,
  useUpdatePersonalBudget,
  useSetActiveBudget,
  useDeletePersonalBudget,
} from '../hooks/useBudgets';
import { useFinance } from '../context/FinanceContext';
import { 
  Plus, 
  Trash2, 
  Save, 
  Star, 
  Clock, 
  Edit2, 
  X, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Settings as SettingsIcon
} from 'lucide-react';
import type { PersonalBudget, CategoryConfig } from '../types/budget';
import { getNextAvailableColor, CATEGORY_COLOR_PALETTE } from '../utils/categoryColors';

interface PersonalBudgetEditorProps {
  className?: string;
  autoCreate?: boolean; // Auto-open create mode on mount
  autoEdit?: boolean; // Auto-open edit mode for active budget
  onSaveComplete?: () => void; // Callback when save is complete
  onCancelEdit?: () => void; // Callback when editing is cancelled
}

export const PersonalBudgetEditor: React.FC<PersonalBudgetEditorProps> = ({
  className = '',
  autoCreate = false,
  autoEdit = false,
  onSaveComplete,
  onCancelEdit,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [budgetName, setBudgetName] = useState('');
  const [notes, setNotes] = useState('');
  const [categories, setCategories] = useState<Record<string, CategoryConfig>>({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryLimit, setNewCategoryLimit] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('');
  
  // Global settings state
  const [currency, setCurrency] = useState('USD');
  const [warningNotifications, setWarningNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  
  // Category editing modal state
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const { data: activeBudget, isLoading: loadingActive } = useActiveBudget();
  const { data: history = [], isLoading: loadingHistory } = usePersonalBudgetHistory();
  const { budgetConfig } = useFinance();
  const createBudget = useCreatePersonalBudget();
  const updateBudget = useUpdatePersonalBudget();
  const setActive = useSetActiveBudget();
  const deleteBudget = useDeletePersonalBudget();

  // Auto-open create mode if autoCreate prop is true
  useEffect(() => {
    if (autoCreate && !isCreating && !editingBudgetId && !activeBudget) {
      handleStartCreate();
    }
  }, [autoCreate]); // Only run on mount or when autoCreate changes

  // Auto-open edit mode if autoEdit prop is true and there's an active budget
  useEffect(() => {
    if (autoEdit && !isCreating && !editingBudgetId && activeBudget) {
      handleStartEdit(activeBudget);
    }
  }, [autoEdit, activeBudget]); // Only run on mount or when autoEdit/activeBudget changes

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingBudgetId(null);
    setBudgetName('My Budget');
    setNotes('');
    
    // Initialize global settings from budgetConfig or defaults
    if (budgetConfig.globalSettings) {
      setCurrency(budgetConfig.globalSettings.currency || 'USD');
      setWarningNotifications(budgetConfig.globalSettings.warningNotifications ?? true);
      setEmailAlerts(budgetConfig.globalSettings.emailAlerts ?? false);
    } else {
      setCurrency('USD');
      setWarningNotifications(true);
      setEmailAlerts(false);
    }
    
    // Priority 1: Use existing categories from budgetConfig (Personalize Budget section)
    // Transfer ALL fields: monthlyLimit, warningThreshold, isActive, color, description
    const existingCategories = Object.entries(budgetConfig.categories).reduce((acc, [name, cat]) => {
      acc[name] = {
        monthlyLimit: cat.monthlyLimit,
        warningThreshold: cat.warningThreshold || 80,
        isActive: cat.isActive,
        color: cat.color, // Transfer color for UI consistency
        description: cat.description, // Transfer description for context
      };
      return acc;
    }, {} as Record<string, CategoryConfig>);
    
    // Priority 2: If no budgetConfig categories, use active budget
    // Priority 3: If no active budget, use minimal defaults
    if (Object.keys(existingCategories).length > 0) {
      setCategories(existingCategories);
    } else if (activeBudget) {
      setCategories({ ...activeBudget.categories });
      // Also load global settings from active budget
      if (activeBudget.global_settings) {
        setCurrency(activeBudget.global_settings.currency || 'USD');
        setWarningNotifications(activeBudget.global_settings.warningNotifications ?? true);
        setEmailAlerts(activeBudget.global_settings.emailAlerts ?? false);
      }
    } else {
      setCategories({
        'Groceries': { monthlyLimit: 500, warningThreshold: 80, isActive: true },
        'Transportation': { monthlyLimit: 200, warningThreshold: 80, isActive: true },
        'Entertainment': { monthlyLimit: 150, warningThreshold: 80, isActive: true },
      });
    }
  };

  const handleStartEdit = (budget: PersonalBudget) => {
    setIsCreating(false);
    setEditingBudgetId(budget.id);
    setBudgetName(budget.name);
    setNotes(budget.notes || '');
    setCategories({ ...budget.categories });
    
    // Load global settings from budget
    if (budget.global_settings) {
      setCurrency(budget.global_settings.currency || 'USD');
      setWarningNotifications(budget.global_settings.warningNotifications ?? true);
      setEmailAlerts(budget.global_settings.emailAlerts ?? false);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingBudgetId(null);
    setBudgetName('');
    setNotes('');
    setCategories({});
    
    // Call the onCancelEdit callback if provided
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  const handleSave = async () => {
    if (!budgetName.trim()) {
      alert('Please enter a budget name');
      return;
    }

    if (Object.keys(categories).length === 0) {
      alert('Please add at least one category');
      return;
    }

    try {
      if (isCreating) {
        // Build global settings from state
        const globalSettings = {
          currency,
          warningNotifications,
          emailAlerts,
          familyMembers: [], // Empty array for now (feature not implemented in budgetConfig)
          activeExpenseCategories: Object.keys(categories).filter(name => categories[name].isActive),
        };

        await createBudget.mutateAsync({
          name: budgetName,
          categories,
          global_settings: globalSettings,
          notes: notes || undefined,
        });
      } else if (editingBudgetId) {
        // Build global settings from state for update
        const globalSettings = {
          currency,
          warningNotifications,
          emailAlerts,
          familyMembers: [], // Empty array for now (feature not implemented in budgetConfig)
          activeExpenseCategories: Object.keys(categories).filter(name => categories[name].isActive),
        };
        
        await updateBudget.mutateAsync({
          budgetId: editingBudgetId,
          updates: {
            name: budgetName,
            categories,
            global_settings: globalSettings,
            notes: notes || undefined,
          },
        });
      }
      handleCancel();
      
      // Call the onSaveComplete callback if provided
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error) {
      console.error('Error saving budget:', error);
      alert('Failed to save budget');
    }
  };

  const handleAddCategory = () => {
    // Get list of colors already in use
    const usedColors = Object.values(categories)
      .map(cat => cat.color)
      .filter((color): color is string => color !== undefined);
    // Get next available distinct color
    const nextColor = getNextAvailableColor(usedColors);
    setNewCategoryColor(nextColor);
    setIsAddingCategory(true);
  };

  const handleUpdateCategory = (categoryName: string, field: keyof CategoryConfig, value: any) => {
    setCategories({
      ...categories,
      [categoryName]: {
        ...categories[categoryName],
        [field]: value,
      },
    });
  };

  const handleRemoveCategory = (categoryName: string) => {
    const { [categoryName]: removed, ...rest } = categories;
    setCategories(rest);
  };

  const handleSetActive = async (budgetId: string) => {
    try {
      await setActive.mutateAsync(budgetId);
    } catch (error) {
      console.error('Error setting active budget:', error);
      alert('Failed to set active budget');
    }
  };

  const handleDelete = async (budgetId: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;

    try {
      await deleteBudget.mutateAsync(budgetId);
    } catch (error) {
      console.error('Error deleting budget:', error);
      alert('Failed to delete budget');
    }
  };

  const totalBudget = Object.values(categories)
    .filter(cat => cat.isActive)
    .reduce((sum, cat) => sum + cat.monthlyLimit, 0);

  if (loadingActive || loadingHistory) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600 dark:text-gray-300">Loading budgets...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Personalize Your Budget
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Configure your budget categories and monthly limits
            </p>
          </div>
          {!isCreating && !editingBudgetId && !activeBudget && (
            <button
              onClick={handleStartCreate}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Budget
            </button>
          )}
        </div>
      </div>

      {/* Editor Form */}
      {(isCreating || editingBudgetId) && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <div className="space-y-4">
            {/* Budget Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Budget Name
              </label>
              <input
                type="text"
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
                placeholder="e.g., Summer 2025 Budget"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Global Settings - MOVED TO TOP */}
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-3">
                <SettingsIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Global Settings
                </label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Currency */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="ILS">ILS (₪)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
                
                {/* Warning Notifications */}
                <div>
                  <label className="flex items-center h-full cursor-pointer">
                    <input
                      type="checkbox"
                      checked={warningNotifications}
                      onChange={(e) => setWarningNotifications(e.target.checked)}
                      className="mr-2 h-4 w-4"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Warning Notifications
                    </span>
                  </label>
                </div>
                
                {/* Email Alerts */}
                <div>
                  <label className="flex items-center h-full cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                      className="mr-2 h-4 w-4"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Email Alerts
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Categories Grid */}
            <div className="pt-4 border-t border-gray-300 dark:border-gray-600">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Budget Categories
              </label>
              
              {/* Categories Grid - v3.0 CUSTOM CSS */}
              <div 
                className="budget-category-grid mb-4"
                data-testid="category-grid"
                data-grid-version="3.0"
              >
                {Object.entries(categories).map(([name, config]) => (
                  <div
                    key={name}
                    onClick={() => setEditingCategory(name)}
                    className="p-4 bg-white dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        {/* Color Badge */}
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: config.color || '#3B82F6' }}
                        />
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                          {name}
                        </h4>
                      </div>
                      {!config.isActive && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">Inactive</span>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Limit</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(config.monthlyLimit)}
                        </span>
                      </div>
                      
                      {config.warningThreshold && (
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Warning</span>
                          <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                            {config.warningThreshold}%
                          </span>
                        </div>
                      )}
                      
                      {config.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                          {config.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        Click to edit →
                      </span>
                    </div>
                  </div>
                ))}
                
                {/* Add Category Tile - Last in Grid */}
                <button
                  onClick={handleAddCategory}
                  className="p-4 bg-white dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-400 cursor-pointer transition-all hover:shadow-md flex flex-col items-center justify-center min-h-[140px]"
                >
                  <Plus className="h-8 w-8 text-green-600 dark:text-green-400 mb-2" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Add Category
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Click to create new
                  </span>
                </button>
              </div>

              {/* Total */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Total Monthly Budget:
                  </span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(totalBudget)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about your budget configuration..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={createBudget.isPending || updateBudget.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
              >
                {createBudget.isPending || updateBudget.isPending ? (
                  <>
                    <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="inline h-4 w-4 mr-2" />
                    Save Budget
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                <X className="inline h-4 w-4 mr-2" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget List - Only show if no active budget (for version history in the future) */}
      {!activeBudget && (
        <div className="px-6 py-4">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">No budget configured yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Click "Create Budget" to set up your first budget
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((budget) => (
                <div
                  key={budget.id}
                  className={`p-4 rounded-lg border transition-all ${
                    budget.is_active
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          {budget.name}
                        </h4>
                        {budget.is_active && (
                          <span className="flex items-center text-xs bg-blue-600 text-white px-2 py-1 rounded">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          v{budget.version}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {Object.keys(budget.categories).length} categories • {formatCurrency(
                          Object.values(budget.categories).filter(cat => cat.isActive).reduce((sum, cat) => sum + cat.monthlyLimit, 0)
                        )} total
                      </p>
                      {budget.notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 italic">
                          {budget.notes}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        <Clock className="inline h-3 w-3 mr-1" />
                        Updated {new Date(budget.updated_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {!budget.is_active && (
                        <button
                          onClick={() => handleSetActive(budget.id)}
                          disabled={setActive.isPending}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-md transition-colors"
                          title="Set as active"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleStartEdit(budget)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {!budget.is_active && (
                        <button
                          onClick={() => handleDelete(budget.id)}
                          disabled={deleteBudget.isPending}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Category Edit/Add Modal */}
      {(editingCategory || isAddingCategory) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setEditingCategory(null);
            setIsAddingCategory(false);
            setNewCategoryName('');
            setNewCategoryLimit('');
            setNewCategoryColor('');
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isAddingCategory ? 'Add Category' : `Edit ${editingCategory}`}
              </h3>
              <button
                onClick={() => {
                  setEditingCategory(null);
                  setIsAddingCategory(false);
                  setNewCategoryName('');
                  setNewCategoryLimit('');
                  setNewCategoryColor('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {isAddingCategory ? (
                // ADD MODE
                <>
                  {/* Category Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g., Groceries"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      autoFocus
                    />
                  </div>
                  
                  {/* Monthly Limit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Monthly Limit ($) *
                    </label>
                    <input
                      type="number"
                      value={newCategoryLimit}
                      onChange={(e) => setNewCategoryLimit(e.target.value)}
                      placeholder="500"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      min="0"
                      step="10"
                    />
                  </div>
                  
                  {/* Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Color <span className="text-xs text-gray-500">(auto-selected for distinction)</span>
                    </label>
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="color"
                        value={newCategoryColor}
                        onChange={(e) => setNewCategoryColor(e.target.value)}
                        className="w-20 h-12 rounded-md cursor-pointer border border-gray-300 dark:border-gray-600"
                      />
                      <div className="flex-1">
                        <div 
                          className="h-12 rounded-md border border-gray-300 dark:border-gray-600 flex items-center justify-center text-sm font-medium shadow-sm"
                          style={{ backgroundColor: newCategoryColor, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                        >
                          Preview
                        </div>
                      </div>
                    </div>
                    
                    {/* Quick color palette selector */}
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_COLOR_PALETTE.map((color) => {
                        const usedColors = Object.values(categories)
                          .map(cat => cat.color)
                          .filter((color): color is string => color !== undefined);
                        const isUsed = usedColors.some(used => used.toLowerCase() === color.toLowerCase());
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewCategoryColor(color)}
                            disabled={isUsed}
                            className={`w-8 h-8 rounded-md border-2 transition-all ${
                              newCategoryColor.toLowerCase() === color.toLowerCase()
                                ? 'border-gray-900 dark:border-white scale-110 shadow-md'
                                : isUsed 
                                  ? 'border-gray-300 dark:border-gray-600 opacity-30 cursor-not-allowed'
                                  : 'border-gray-300 dark:border-gray-600 hover:scale-110 hover:shadow-md cursor-pointer'
                            }`}
                            style={{ backgroundColor: color }}
                            title={isUsed ? 'Color already in use' : 'Select this color'}
                          />
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Buttons */}
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => {
                        if (!newCategoryName.trim()) {
                          alert('Please enter a category name');
                          return;
                        }
                        const limit = parseFloat(newCategoryLimit);
                        if (isNaN(limit) || limit < 0) {
                          alert('Please enter a valid limit');
                          return;
                        }
                        if (categories[newCategoryName]) {
                          alert('Category already exists');
                          return;
                        }
                        
                        setCategories({
                          ...categories,
                          [newCategoryName]: {
                            monthlyLimit: limit,
                            warningThreshold: 80,
                            isActive: true,
                            color: newCategoryColor,
                          },
                        });
                        setIsAddingCategory(false);
                        setNewCategoryName('');
                        setNewCategoryLimit('');
                        setNewCategoryColor('');
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                    >
                      <Plus className="inline h-4 w-4 mr-2" />
                      Add Category
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingCategory(false);
                        setNewCategoryName('');
                        setNewCategoryLimit('');
                        setNewCategoryColor('');
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : editingCategory ? (
                // EDIT MODE
                <>
                  {/* Color Picker and Monthly Limit - Side by Side */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Color Picker */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Color
                      </label>
                      <input
                        type="color"
                        value={categories[editingCategory]?.color || '#3B82F6'}
                        onChange={(e) => handleUpdateCategory(editingCategory, 'color', e.target.value)}
                        className="w-full h-12 rounded-md cursor-pointer border border-gray-300 dark:border-gray-600"
                      />
                    </div>
                    
                    {/* Monthly Limit */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Monthly Limit ({currency === 'USD' ? '$' : currency === 'ILS' ? '₪' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '¥'})
                      </label>
                      <input
                        type="number"
                        value={categories[editingCategory]?.monthlyLimit || 0}
                        onChange={(e) =>
                          handleUpdateCategory(editingCategory, 'monthlyLimit', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        min="0"
                        step="10"
                      />
                    </div>
                  </div>
                  
                  {/* Warning Threshold */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Warning Threshold (%)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        value={categories[editingCategory]?.warningThreshold || 80}
                        onChange={(e) =>
                          handleUpdateCategory(editingCategory, 'warningThreshold', parseFloat(e.target.value))
                        }
                        className="flex-1"
                        min="0"
                        max="100"
                        step="5"
                      />
                      <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 w-12">
                        {categories[editingCategory]?.warningThreshold || 80}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={categories[editingCategory]?.description || ''}
                      onChange={(e) => handleUpdateCategory(editingCategory, 'description', e.target.value)}
                      placeholder="e.g., Groceries, household items, and food"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      rows={3}
                    />
                  </div>
                  
                  {/* Active Toggle */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Active Category
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={categories[editingCategory]?.isActive || false}
                        onChange={(e) => handleUpdateCategory(editingCategory, 'isActive', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-4 rtl:peer-checked:after:-translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {/* Buttons */}
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                    >
                      <Save className="inline h-4 w-4 mr-2" />
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${editingCategory}"?`)) {
                          handleRemoveCategory(editingCategory);
                          setEditingCategory(null);
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
