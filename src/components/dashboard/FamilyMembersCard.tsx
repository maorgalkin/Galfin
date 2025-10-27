import React from 'react';
import { Users } from 'lucide-react';

interface FamilyMembersCardProps {
  familyMembersCount: number;
  onOpenModal: () => void;
}

/**
 * Quick access card for managing family members
 */
export const FamilyMembersCard: React.FC<FamilyMembersCardProps> = ({
  familyMembersCount,
  onOpenModal,
}) => {
  return (
    <button
      onClick={onOpenModal}
      className="bg-white rounded-lg shadow-sm border p-4 w-full hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Users className="h-5 w-5 text-blue-600 mr-3" />
          <div>
            <p className="text-sm font-medium text-gray-900">Family Members</p>
            <p className="text-xs text-gray-500">Click to manage family members</p>
          </div>
        </div>
        <p className="text-2xl font-bold text-blue-600">{familyMembersCount}</p>
      </div>
    </button>
  );
};
