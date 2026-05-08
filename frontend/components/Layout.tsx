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

const navIcons: Record<string, JSX.Element> = {
  '/dashboard': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
  ),
  '/applications/new': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
  ),
  '/applications': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
  ),
  '/citations': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ),
  '/admin/entities': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  ),
  '/chat': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
  ),
  '/reports': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
  ),
  '/admin/users': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
  ),
  '/admin/enforcers': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
  ),
  '/admin/fees': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ),
  '/admin/settings': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  ),
  '/admin/permit-types': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
  ),
  '/admin/attributes': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
  ),
  '/admin/rules': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
  ),
  '/admin/quantity-fees': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
  ),
  '/admin/rights-and-rentals': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6" /></svg>
  ),
};

export default function Layout({ children }: LayoutProps) {
  const { user, logout, hasRole } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => pathname === path;

  const isLinkActive = (path: string, activePaths?: string[]) => {
    if (activePaths) {
      return activePaths.some(p => pathname === p || pathname.startsWith(p + '/'));
    }
    return pathname === path;
  };

  const canAccess = (roles: string[]) => {
    if (!user) return false;
    return hasRole(roles);
  };

  const displayRoles = user?.roles && user.roles.length > 0 
    ? user.roles.join(', ') 
    : user?.role_name || '';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [sidebarOpen]);

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', show: true },
    { href: '/applications', label: 'Applications', show: !canAccess(['Rights and Rentals Manager']) },
    { href: '/admin/entities', label: 'Entities', show: !canAccess(['Rights and Rentals Manager']) },
    { href: '/citations', label: 'Citations', show: canAccess(['SuperAdmin', 'Admin', 'Traffic Officer', 'Assessor']) && !canAccess(['Rights and Rentals Manager']) },
    { href: '/admin/rights-and-rentals', label: 'Rights & Rentals', show: canAccess(['SuperAdmin', 'Admin', 'Rights and Rentals Manager']) },
    { href: '/chat', label: 'Chat', show: canAccess(['SuperAdmin', 'Admin', 'Assessor', 'Approver', 'Application Creator']) && !canAccess(['Rights and Rentals Manager']) },
  ];

  const adminLinks: { href: string; label: string; activePaths?: string[] }[] = [
    { href: '/admin/permit-types', label: 'Permit Setup', activePaths: ['/admin/permit-types', '/admin/attributes', '/admin/rules', '/admin/fees', '/admin/quantity-fees'] },
    { href: '/admin/enforcers', label: 'Enforcers' },
    { href: '/admin/users', label: 'Users' },
    { href: '/reports', label: 'Reports', activePaths: ['/reports', '/admin/reports', '/admin/templates', '/admin/report-templates'] },
    { href: '/admin/settings', label: 'Settings', activePaths: ['/admin/settings'] },
  ];

  // Page groups: show SubNav tabs when on any page in a group
  const pageGroups = [
    {
      paths: ['/admin/permit-types', '/admin/attributes', '/admin/rules', '/admin/fees', '/admin/quantity-fees'],
      tabs: [
        { href: '/admin/permit-types', label: 'Permit Types' },
        { href: '/admin/attributes', label: 'Attributes' },
        { href: '/admin/rules', label: 'Assessment Rules' },
        { href: '/admin/fees', label: 'Fees' },
        { href: '/admin/quantity-fees', label: 'Quantity Fees' },
      ],
    },
    {
      paths: ['/reports'],
      tabs: [
        { href: '/reports', label: 'Permit Reports' },
      ],
    },
    {
      paths: ['/admin/settings', '/admin/settings/role-permissions'],
      tabs: [
        { href: '/admin/settings', label: 'General' },
        { href: '/admin/settings/permit-display', label: 'Permit Display' },
        { href: '/admin/settings/role-permissions', label: 'Role Permissions' },
      ],
    },
  ];

  const currentGroup = pageGroups.find(g => g.paths.some(p => pathname === p || pathname.startsWith(p + '/')));

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 flex-shrink-0">
        <Link href="/dashboard" className="flex items-center space-x-3">
          <Image
            src="/dalaguete-logo.png"
            alt="Municipality of Dalaguete Official Seal"
            width={36}
            height={36}
            className="object-contain flex-shrink-0"
          />
          <span className={`text-lg font-bold text-white ${!mobile ? 'hidden lg:block' : ''}`}>PAMS</span>
        </Link>
        {mobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        <p className={`px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider ${!mobile ? 'hidden lg:block' : ''}`}>Main</p>
        {navLinks.filter(link => link.show).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            title={link.label}
            className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
              isActive(link.href)
                ? 'bg-teal-600 text-white'
                : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
            }`}
          >
            <span className="flex-shrink-0">{navIcons[link.href]}</span>
            <span className={`ml-3 truncate ${!mobile ? 'hidden lg:block' : ''}`}>{link.label}</span>
          </Link>
        ))}

        {canAccess(['SuperAdmin', 'Admin']) && !canAccess(['Rights and Rentals Manager']) && (
          <>
            <div className="pt-4">
              <p className={`px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider ${!mobile ? 'hidden lg:block' : ''}`}>Admin</p>
              <div className={`border-t border-slate-700 mb-2 ${!mobile ? 'lg:hidden' : 'hidden'}`}></div>
            </div>
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                title={link.label}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                  isLinkActive(link.href, link.activePaths)
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
                }`}
              >
                <span className="flex-shrink-0">{navIcons[link.href]}</span>
                <span className={`ml-3 truncate ${!mobile ? 'hidden lg:block' : ''}`}>{link.label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User info + Logout at bottom */}
      <div className="flex-shrink-0 border-t border-slate-700 p-3">
        <div className={`flex items-center mb-3 ${!mobile ? 'lg:flex hidden' : ''}`}>
          <div className="h-8 w-8 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-white">{user?.full_name?.charAt(0).toUpperCase() || 'U'}</span>
          </div>
          <div className="ml-3 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
            <p className="text-xs text-slate-400 truncate">{displayRoles}</p>
          </div>
        </div>
        <button
          onClick={logout}
          title="Logout"
          className={`flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-colors ${!mobile ? 'justify-center lg:justify-start' : ''}`}
        >
          <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          <span className={`ml-3 ${!mobile ? 'hidden lg:block' : ''}`}>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <ChatNotification />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile sidebar drawer */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-slate-900 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent mobile />
      </div>

      {/* Desktop sidebar - icons only on md, full on lg */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-16 lg:w-64 bg-slate-900 z-30 transition-all duration-200">
        <SidebarContent />
      </aside>

      {/* Main content area */}
      <div className="md:ml-16 lg:ml-64 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 h-14 flex items-center px-4 sm:px-6">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 md:hidden mr-2"
            aria-label="Open sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          {/* Mobile logo */}
          <Link href="/dashboard" className="flex items-center space-x-2 md:hidden mr-auto">
            <Image src="/dalaguete-logo.png" alt="PAMS" width={28} height={28} className="object-contain" />
            <span className="text-base font-bold text-slate-800">PAMS</span>
          </Link>

          <div className="hidden md:block mr-auto">
            <h2 className="text-sm font-medium text-slate-600">
              {navLinks.find(l => isActive(l.href))?.label || adminLinks.find(l => isLinkActive(l.href, l.activePaths))?.label || ''}
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            <NotificationBell />

            {/* User menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-50"
                aria-label="User menu"
              >
                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                  <span className="text-sm font-medium text-slate-600">{user?.full_name?.charAt(0).toUpperCase() || 'U'}</span>
                </div>
                <span className="hidden sm:inline-block max-w-[150px] truncate">{user?.full_name}</span>
                <svg className={`w-4 h-4 hidden sm:block transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 border border-slate-200">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900 truncate">{user?.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{displayRoles}</p>
                  </div>
                  <button
                    onClick={() => { setShowUserMenu(false); logout(); }}
                    className="block w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">
          {currentGroup && (
            <div className="border-b border-slate-200 bg-white -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 mb-6">
              <nav className="flex gap-1 overflow-x-auto">
                {currentGroup.tabs.map((tab) => (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                      isActive(tab.href)
                        ? 'border-teal-600 text-teal-700'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {tab.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

