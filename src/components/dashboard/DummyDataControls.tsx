import React from 'react';

interface DummyDataControlsProps {
  onAddDummyData: () => void;
  onRemoveDummyData: () => void;
}

/**
 * Control buttons for adding and removing dummy test data
 */
export const DummyDataControls: React.FC<DummyDataControlsProps> = ({
  onAddDummyData,
  onRemoveDummyData,
}) => {
  return (
    <div className="flex gap-2">
      <button
        onClick={onAddDummyData}
        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        + Add Dummy Data
      </button>
      <button
        onClick={onRemoveDummyData}
        className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        🗑️ Remove All Dummy
      </button>
    </div>
  );
};
