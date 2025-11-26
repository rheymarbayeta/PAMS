'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import NotificationBell from './NotificationBell';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => pathname === path;

  const canAccess = (roles: string[]) => {
    return user && roles.includes(user.role_name);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/dashboard" className="flex items-center space-x-3">
                  <Image
                    src="/dalaguete-logo.png"
                    alt="Municipality of Dalaguete Official Seal"
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                  <span className="text-xl font-bold text-slate-800">PAMS</span>
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/dashboard')
                      ? 'border-teal-600 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Dashboard
                </Link>
                {canAccess(['SuperAdmin', 'Admin', 'Application Creator']) && (
                  <Link
                    href="/applications/new"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive('/applications/new')
                        ? 'border-teal-600 text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    New Application
                  </Link>
                )}
                <Link
                  href="/applications"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/applications')
                      ? 'border-teal-600 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Applications
                </Link>
                {canAccess(['SuperAdmin', 'Admin']) && (
                  <Link
                    href="/admin/entities"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive('/admin/entities')
                        ? 'border-teal-600 text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    Entities
                  </Link>
                )}
                {canAccess(['SuperAdmin', 'Admin', 'Assessor', 'Approver', 'Application Creator']) && (
                  <Link
                    href="/chat"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive('/chat')
                        ? 'border-teal-600 text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    Chat
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900 focus:outline-none"
                >
                  <span>{user?.full_name} ({user?.role_name})</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${showUserMenu ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showUserMenu && canAccess(['SuperAdmin', 'Admin']) && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 border border-slate-200">
                    <Link
                      href="/admin/users"
                      onClick={() => setShowUserMenu(false)}
                      className={`block px-4 py-2 text-sm ${
                        isActive('/admin/users')
                          ? 'bg-teal-50 text-teal-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Users
                    </Link>
                    <Link
                      href="/admin/fees"
                      onClick={() => setShowUserMenu(false)}
                      className={`block px-4 py-2 text-sm ${
                        isActive('/admin/fees')
                          ? 'bg-teal-50 text-teal-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Fees
                    </Link>
                    <Link
                      href="/admin/settings"
                      onClick={() => setShowUserMenu(false)}
                      className={`block px-4 py-2 text-sm ${
                        isActive('/admin/settings')
                          ? 'bg-teal-50 text-teal-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Settings
                    </Link>
                    <Link
                      href="/admin/permit-types"
                      onClick={() => setShowUserMenu(false)}
                      className={`block px-4 py-2 text-sm ${
                        isActive('/admin/permit-types')
                          ? 'bg-teal-50 text-teal-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Permit Types
                    </Link>
                    <Link
                      href="/admin/rules"
                      onClick={() => setShowUserMenu(false)}
                      className={`block px-4 py-2 text-sm ${
                        isActive('/admin/rules')
                          ? 'bg-teal-50 text-teal-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Rules
                    </Link>
                    <div className="border-t border-slate-200 my-1"></div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
                {showUserMenu && !canAccess(['SuperAdmin', 'Admin']) && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 border border-slate-200">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

