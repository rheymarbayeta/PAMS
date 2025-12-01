'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import NotificationBell from './NotificationBell';
import ChatNotification from './ChatNotification';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout, hasRole } = useAuth();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => pathname === path;

  const canAccess = (roles: string[]) => {
    if (!user) return false;
    // Use the hasRole function which checks the roles array
    return hasRole(roles);
  };

  // Get display roles - either roles array or single role_name
  const displayRoles = user?.roles && user.roles.length > 0 
    ? user.roles.join(', ') 
    : user?.role_name || '';

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };

    if (showUserMenu || showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu, showMobileMenu]);

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showMobileMenu]);

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', show: true },
    { href: '/applications/new', label: 'New Application', show: canAccess(['SuperAdmin', 'Admin', 'Application Creator']) },
    { href: '/applications', label: 'Applications', show: true },
    { href: '/admin/entities', label: 'Entities', show: true },
    { href: '/chat', label: 'Chat', show: canAccess(['SuperAdmin', 'Admin', 'Assessor', 'Approver', 'Application Creator']) },
  ];

  const adminLinks = [
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/fees', label: 'Fees' },
    { href: '/admin/settings', label: 'Settings' },
    { href: '/admin/permit-types', label: 'Permit Types' },
    { href: '/admin/rules', label: 'Rules' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Global Chat Notification */}
      <ChatNotification />
      
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16">
            {/* Left side: Logo and mobile menu button */}
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500 sm:hidden mr-2"
                aria-expanded={showMobileMenu ? "true" : "false"}
                aria-label="Toggle navigation menu"
              >
                <span className="sr-only">Open main menu</span>
                {showMobileMenu ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>

              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <Link href="/dashboard" className="flex items-center space-x-2 sm:space-x-3">
                  <Image
                    src="/dalaguete-logo.png"
                    alt="Municipality of Dalaguete Official Seal"
                    width={36}
                    height={36}
                    className="object-contain sm:w-10 sm:h-10"
                  />
                  <span className="text-lg sm:text-xl font-bold text-slate-800">PAMS</span>
                </Link>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-6 lg:space-x-8">
                {navLinks.filter(link => link.show).map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive(link.href)
                        ? 'border-teal-600 text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right side: Notifications and user menu */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <NotificationBell />
              
              {/* User menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-1 sm:space-x-2 text-sm text-slate-600 hover:text-slate-900 focus:outline-none p-1 sm:p-2 rounded-lg hover:bg-slate-50"
                  aria-expanded={showUserMenu ? "true" : "false"}
                  aria-label="User menu"
                >
                  {/* Mobile: Avatar only, Desktop: Full name */}
                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center sm:hidden">
                    <span className="text-sm font-medium text-slate-600">
                      {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="hidden sm:inline-block max-w-[150px] lg:max-w-none truncate">
                    {user?.full_name} ({displayRoles})
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${showUserMenu ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* User dropdown menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-1 z-50 border border-slate-200">
                    {/* Mobile: Show user info */}
                    <div className="px-4 py-3 border-b border-slate-100 sm:hidden">
                      <p className="text-sm font-medium text-slate-900 truncate">{user?.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">{displayRoles}</p>
                    </div>
                    
                    {canAccess(['SuperAdmin', 'Admin']) && (
                      <>
                        {adminLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setShowUserMenu(false)}
                            className={`block px-4 py-2.5 text-sm ${
                              isActive(link.href)
                                ? 'bg-teal-50 text-teal-700'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {link.label}
                          </Link>
                        ))}
                        <div className="border-t border-slate-200 my-1"></div>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="block w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
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

      {/* Mobile Navigation Menu (Slide-out) */}
      {showMobileMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 sm:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
          
          {/* Menu panel */}
          <div 
            ref={mobileMenuRef}
            className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-50 sm:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto"
          >
            {/* Menu header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Image
                  src="/dalaguete-logo.png"
                  alt="Municipality of Dalaguete Official Seal"
                  width={32}
                  height={32}
                  className="object-contain"
                />
                <span className="text-lg font-bold text-slate-800">PAMS</span>
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* User info */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                  <span className="text-lg font-medium text-teal-700">
                    {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{user?.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{displayRoles}</p>
                </div>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="px-2 py-4 space-y-1">
              {navLinks.filter(link => link.show).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? 'bg-teal-50 text-teal-700 border-l-4 border-teal-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Admin section */}
            {canAccess(['SuperAdmin', 'Admin']) && (
              <>
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin</p>
                </div>
                <nav className="px-2 pb-4 space-y-1">
                  {adminLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive(link.href)
                          ? 'bg-teal-50 text-teal-700 border-l-4 border-teal-600'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </>
            )}

            {/* Logout button */}
            <div className="px-2 py-4 border-t border-slate-200 mt-auto">
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  logout();
                }}
                className="flex items-center w-full px-3 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </>
      )}

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

