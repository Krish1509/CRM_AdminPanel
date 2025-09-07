'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useDarkMode } from '../../hooks/useDarkMode';

interface DeleteSuccessPopupProps {
  fabricCode: string;
  fabricName: string;
  onClose: () => void;
  show: boolean;
}

export default function DeleteSuccessPopup({
  fabricCode,
  fabricName,
  onClose,
  show
}: DeleteSuccessPopupProps) {
  const { isDarkMode, mounted } = useDarkMode();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      // Auto close after 2 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [show]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!mounted || !show) return null;

  return (
    <div className={`fixed top-4 right-4 z-[9999] transition-all duration-300 ${
      isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
    }`}>
      <div className={`w-80 rounded-xl shadow-lg transform transition-all duration-300 ${
        isDarkMode ? 'bg-green-900/95 border border-green-700' : 'bg-green-50 border border-green-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-3 ${
          isDarkMode ? 'border-green-700' : 'border-green-200'
        }`}>
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
            }`}>
              <CheckCircleIcon className={`h-5 w-5 ${
                isDarkMode ? 'text-green-400' : 'text-green-600'
              }`} />
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${
                isDarkMode ? 'text-green-400' : 'text-green-600'
              }`}>
                Deleted Successfully
              </h3>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`p-1 rounded-full transition-colors duration-200 ${
              isDarkMode 
                ? 'hover:bg-green-800/50 text-green-400' 
                : 'hover:bg-green-100 text-green-600'
            }`}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-3 pb-3">
          <div className={`p-3 rounded-lg ${
            isDarkMode ? 'bg-green-800/30' : 'bg-white'
          }`}>
            <div className="flex items-center space-x-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isDarkMode ? 'bg-green-500/20' : 'bg-green-100'
              }`}>
                <CheckCircleIcon className={`h-4 w-4 ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`} />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {fabricCode} - {fabricName}
                </p>
                <p className={`text-xs ${
                  isDarkMode ? 'text-green-300' : 'text-green-700'
                }`}>
                  Permanently deleted
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
