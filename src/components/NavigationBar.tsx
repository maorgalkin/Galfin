import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const NavigationBar: React.FC = () => {
  const location = useLocation();

  const getPageName = (path: string) => {
    switch (path) {
      case '/':
        return 'Dashboard';
      case '/older-transactions':
        return 'Older Transactions';
      default:
        return 'Unknown';
    }
  };

  return (
    <nav className="bg-gray-100 p-4 rounded-md mb-6">
      <ol className="flex space-x-2 text-gray-600">
        <li>
          <Link to="/" className="text-blue-600 hover:underline">Dashboard</Link>
        </li>
        {location.pathname !== '/' && (
          <>
            <span>/</span>
            <li className="text-gray-900 font-semibold">
              {getPageName(location.pathname)}
            </li>
          </>
        )}
      </ol>
    </nav>
  );
};

export default NavigationBar;
