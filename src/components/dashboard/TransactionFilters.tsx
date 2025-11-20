import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FamilyMember } from '../../types';

interface TransactionFiltersProps {
  typeFilter: 'all' | 'income' | 'expense';
  memberFilter: string; // 'all' or member ID
  monthFilter: string; // 'current' or YYYY-MM format
  familyMembers: FamilyMember[];
  onTypeChange: (type: 'all' | 'income' | 'expense') => void;
  onMemberChange: (memberId: string) => void;
  onMonthChange: (month: string) => void;
  onMoreClick: () => void;
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  typeFilter,
  memberFilter,
  monthFilter,
  familyMembers,
  onTypeChange,
  onMemberChange,
  onMonthChange,
  onMoreClick,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Generate last 12 months for dropdown
  const generateMonthOptions = () => {
    const months = [{ value: 'current', label: 'Current Month' }];
    const now = new Date();
    
    for (let i = 1; i <= 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      months.push({ value, label });
    }
    
    return months;
  };

  const monthOptions = generateMonthOptions();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const clickedOutside = Object.values(dropdownRefs.current).every(
        ref => ref && !ref.contains(event.target as Node)
      );
      if (clickedOutside) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (dropdown: string) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const getTypeLabel = () => {
    if (typeFilter === 'income') return 'Income';
    if (typeFilter === 'expense') return 'Expenses';
    return 'All Types';
  };

  const getMemberLabel = () => {
    if (memberFilter === 'all') return 'All Members';
    const member = familyMembers.find(m => m.id === memberFilter);
    return member?.name || 'Unknown';
  };

  const getMonthLabel = () => {
    const option = monthOptions.find(m => m.value === monthFilter);
    return option?.label || 'Current Month';
  };

  const getButtonClasses = (isActive: boolean) => {
    return `px-4 py-2 rounded-md border font-medium transition-all relative ${
      isActive
        ? 'bg-blue-600 dark:bg-blue-700 text-white border-blue-600 dark:border-blue-500'
        : 'bg-white dark:bg-blue-900/20 text-blue-700 dark:text-blue-200 border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-800/30'
    }`;
  };

  const dropdownClasses = 'absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 min-w-[200px] max-h-[300px] overflow-y-auto';
  const optionClasses = 'px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer transition-colors text-gray-700 dark:text-gray-300';
  const activeOptionClasses = 'px-4 py-2 bg-blue-100 dark:bg-blue-900/50 cursor-pointer text-blue-700 dark:text-blue-300 font-medium';

  return (
    <div className="flex justify-center gap-2 mb-6 flex-wrap">
      {/* Type Filter */}
      <div 
        ref={el => dropdownRefs.current['type'] = el}
        className="relative"
        onMouseEnter={() => setOpenDropdown('type')}
        onMouseLeave={() => setOpenDropdown(null)}
      >
        <button
          onClick={() => toggleDropdown('type')}
          className={getButtonClasses(typeFilter !== 'all')}
        >
          <span className="flex items-center gap-1">
            {getTypeLabel()}
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
        
        {openDropdown === 'type' && (
          <div className={dropdownClasses}>
            <div
              onClick={() => {
                onTypeChange('all');
                setOpenDropdown(null);
              }}
              className={typeFilter === 'all' ? activeOptionClasses : optionClasses}
            >
              All Types
            </div>
            <div
              onClick={() => {
                onTypeChange('income');
                setOpenDropdown(null);
              }}
              className={typeFilter === 'income' ? activeOptionClasses : optionClasses}
            >
              Income
            </div>
            <div
              onClick={() => {
                onTypeChange('expense');
                setOpenDropdown(null);
              }}
              className={typeFilter === 'expense' ? activeOptionClasses : optionClasses}
            >
              Expenses
            </div>
          </div>
        )}
      </div>

      {/* Member Filter */}
      <div 
        ref={el => dropdownRefs.current['member'] = el}
        className="relative"
        onMouseEnter={() => setOpenDropdown('member')}
        onMouseLeave={() => setOpenDropdown(null)}
      >
        <button
          onClick={() => toggleDropdown('member')}
          className={getButtonClasses(memberFilter !== 'all')}
        >
          <span className="flex items-center gap-1">
            {getMemberLabel()}
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
        
        {openDropdown === 'member' && (
          <div className={dropdownClasses}>
            <div
              onClick={() => {
                onMemberChange('all');
                setOpenDropdown(null);
              }}
              className={memberFilter === 'all' ? activeOptionClasses : optionClasses}
            >
              All Members
            </div>
            {familyMembers.map(member => (
              <div
                key={member.id}
                onClick={() => {
                  onMemberChange(member.id);
                  setOpenDropdown(null);
                }}
                className={memberFilter === member.id ? activeOptionClasses : optionClasses}
              >
                {member.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Month Filter */}
      <div 
        ref={el => dropdownRefs.current['month'] = el}
        className="relative"
        onMouseEnter={() => setOpenDropdown('month')}
        onMouseLeave={() => setOpenDropdown(null)}
      >
        <button
          onClick={() => toggleDropdown('month')}
          className={getButtonClasses(monthFilter !== 'current')}
        >
          <span className="flex items-center gap-1">
            {getMonthLabel()}
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
        
        {openDropdown === 'month' && (
          <div className={dropdownClasses}>
            {monthOptions.map(option => (
              <div
                key={option.value}
                onClick={() => {
                  onMonthChange(option.value);
                  setOpenDropdown(null);
                }}
                className={monthFilter === option.value ? activeOptionClasses : optionClasses}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* More Button */}
      <div 
        ref={el => dropdownRefs.current['more'] = el}
        className="relative"
        onMouseEnter={() => setOpenDropdown('more')}
        onMouseLeave={() => setOpenDropdown(null)}
      >
        <button
          onClick={() => toggleDropdown('more')}
          className={getButtonClasses(false)}
        >
          <span className="flex items-center gap-1">
            More
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
        
        {openDropdown === 'more' && (
          <div className={dropdownClasses}>
            <div
              onClick={() => {
                onMoreClick();
                setOpenDropdown(null);
              }}
              className="px-4 py-2 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            >
              Coming Soon...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
