import React from 'react';
import { Link } from 'react-router-dom';
import { isDemoMode } from '../services/supabaseClient';
import { resetDemoData } from '../services/demo/store';

const DevelopedByFooter: React.FC = () => {
  const handleReset = () => {
    resetDemoData();
    window.location.reload();
  };

  return (
    <div className="relative w-full text-xs text-gray-400 py-3 px-4 border-t border-gray-100 flex-shrink-0">
      {isDemoMode && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 hidden sm:inline">
          <span className="font-semibold text-amber-600">Demo mode</span>
          {' · '}
          <Link to="/demo/outbox" className="hover:text-gray-600 hover:underline">
            Outbox
          </Link>
          {' · '}
          <button type="button" onClick={handleReset} className="hover:text-gray-600 hover:underline">
            Reset demo data
          </button>
        </span>
      )}
      <span className="block text-center">
        Developed by{' '}
        <a
          href="https://sinuxconsulting.com"
          target="_blank"
          rel="noreferrer"
          className="text-blue-500 hover:text-blue-700 hover:underline transition-colors"
        >
          Sinux Consulting
        </a>
      </span>
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
        V1.1
      </span>
    </div>
  );
};

export default DevelopedByFooter;
