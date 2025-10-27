import React from 'react';
import { Edit2 } from 'lucide-react';
import { getCategoryColor } from '../../utils/categoryColors';
import type { Transaction, FamilyMember, BudgetConfiguration } from '../../types';

interface TransactionsListProps {
  transactions: Transaction[];
  familyMembers: FamilyMember[];
  budgetConfig: BudgetConfiguration | null;
  formatCurrency: (amount: number) => string;
  onEditTransaction: (transaction: Transaction) => void;
  emptyMessage?: string;
}

/**
 * List of transaction cards with edit functionality
 * Shows category badge, description, date, family member, and amount
 */
export const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
  familyMembers,
  budgetConfig,
  formatCurrency,
  onEditTransaction,
  emptyMessage = 'No transactions available',
}) => {
  if (transactions.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">{emptyMessage}</div>
    );
  }

  return (
    <div className="grid gap-4">
      {transactions.map(t => {
        const categoryColors = getCategoryColor(t.category, t.type, budgetConfig);
        return (
          <div key={t.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span 
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border"
                    style={{
                      backgroundColor: categoryColors.bg,
                      borderColor: categoryColors.border,
                      color: categoryColors.text
                    }}
                  >
                    {t.category}
                  </span>
                </div>
                {t.description && (
                  <div className="text-sm text-gray-700 mb-2">{t.description}</div>
                )}
                <div className="text-sm text-gray-500">
                  {new Date(t.date).toLocaleDateString()} 
                  {t.familyMember && ` • ${familyMembers.find(m => m.id === t.familyMember)?.name || 'Unknown'}`}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`font-bold text-lg ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </div>
                <button
                  onClick={() => onEditTransaction(t)}
                  className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                  title="Edit transaction"
                >
                  <Edit2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
