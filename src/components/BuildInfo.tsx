import React from 'react';

export const BuildInfo: React.FC = () => {
  const commit = import.meta.env.VITE_GIT_COMMIT;
  const branch = import.meta.env.VITE_GIT_BRANCH;
  const buildTime = import.meta.env.VITE_BUILD_TIME;
  const isDev = import.meta.env.DEV;

  return (
    <div className="fixed bottom-2 right-2 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg opacity-75 hover:opacity-100 transition-opacity font-mono z-50">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded ${isDev ? 'bg-yellow-600' : 'bg-green-600'}`}>
            {isDev ? 'DEV' : 'PROD'}
          </span>
          <span>{branch}</span>
        </div>
        <div className="text-gray-300">
          {commit && <div>Commit: {commit}</div>}
          {buildTime && <div>Built: {new Date(buildTime).toLocaleString()}</div>}
        </div>
      </div>
    </div>
  );
};
