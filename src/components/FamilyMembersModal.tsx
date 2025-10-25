import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Users } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface FamilyMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

const FamilyMembersModal: React.FC<FamilyMembersModalProps> = ({ isOpen, onClose }) => {
  const { familyMembers, addFamilyMember } = useFinance();
  const [newMemberName, setNewMemberName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleAddMember = async () => {
    if (!newMemberName.trim()) {
      alert('Please enter a name');
      return;
    }

    setIsAdding(true);
    try {
      await addFamilyMember({
        name: newMemberName.trim(),
        color: selectedColor,
      });
      
      setNewMemberName('');
      // Rotate to next color
      const currentIndex = PRESET_COLORS.indexOf(selectedColor);
      const nextIndex = (currentIndex + 1) % PRESET_COLORS.length;
      setSelectedColor(PRESET_COLORS[nextIndex]);
    } catch (error) {
      console.error('Error adding family member:', error);
      alert('Failed to add family member. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Users className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-900">Family Members</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add New Member Form */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Add New Member</h3>
            
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
              placeholder="Enter name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              disabled={isAdding}
            />

            {/* Color Picker */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Choose Color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      selectedColor === color
                        ? 'border-gray-900 scale-110'
                        : 'border-gray-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleAddMember}
              disabled={isAdding || !newMemberName.trim()}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isAdding ? 'Adding...' : 'Add Member'}
            </button>
          </div>

          {/* Existing Members List */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Members ({familyMembers.length})</h3>
            
            {familyMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No family members yet</p>
                <p className="text-sm mt-1">Add your first member above!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {familyMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center">
                      <div
                        className="w-8 h-8 rounded-full mr-3 flex-shrink-0"
                        style={{ backgroundColor: member.color }}
                      />
                      <span className="font-medium text-gray-900">{member.name}</span>
                    </div>
                    {/* Note: Delete functionality could be added here in the future */}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Family members help you track who made each transaction. 
              You can assign a member when adding or editing transactions.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default FamilyMembersModal;
