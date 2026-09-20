'use client';

import { FC, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LucideIcon, LogOut, ChevronDown, Search, HelpCircle,
  PanelLeftClose, PanelLeftOpen, X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { signOut } from '@/services/auth';

interface NavChild {
  href: string;
  label: string;
}

interface NavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  children?: NavChild[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface AdminSidebarProps {
  sections: NavSection[];
  collapsed?: boolean;
  mobileOpen?: boolean;
  onToggle?: () => void;
  onMobileClose?: () => void;
}

export const AdminSidebar: FC<AdminSidebarProps> = ({
  sections,
  collapsed = false,
  mobileOpen = false,
  onToggle,
  onMobileClose,
}) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const childMatches = useCallback((href: string) => {
    const [path, query] = href.split('?');
    if (!pathname.startsWith(path)) return false;
    if (!query) return pathname === path && !searchParams.get('view');
    const expected = new URLSearchParams(query);
    return Array.from(expected.entries()).every(([key, value]) => searchParams.get(key) === value);
  }, [pathname, searchParams]);

  const isChildActive = (children?: NavChild[]) => children?.some(c => childMatches(c.href)) ?? false;

  const toggleExpand = (label: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  // Keep the active navigation branch visible after route changes.
  useEffect(() => {
    sections.forEach(section => {
      section.items.forEach(item => {
        if (item.children?.some(c => childMatches(c.href))) {
          setExpandedItems(prev => new Set(prev).add(item.label));
        }
      });
    });
  }, [childMatches, sections]);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onMobileClose?.();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileOpen, onMobileClose]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== '/' || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      event.preventDefault();
      if (collapsed) onToggle?.();
      window.setTimeout(() => searchRef.current?.focus(), collapsed ? 220 : 0);
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, [collapsed, onToggle]);

  const filteredSections = search
    ? sections.map(section => ({
        ...section,
        items: section.items.filter(item => {
          const matchParent = item.label.toLowerCase().includes(search.toLowerCase());
          const matchChild = item.children?.some(c =>
            c.label.toLowerCase().includes(search.toLowerCase())
          );
          return matchParent || matchChild;
        }),
      })).filter(section => section.items.length > 0)
    : sections;

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Tutup navigasi"
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[1px] lg:hidden"
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r border-slate-200 bg-white transition-[width,transform] duration-200 ease-out lg:relative lg:z-auto ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${collapsed ? 'w-[76px]' : 'w-[272px]'}`}>
      {/* Brand */}
      <div className={`flex h-16 items-center gap-3 border-b border-slate-100 ${collapsed ? 'justify-center px-3' : 'px-5'}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Image
            src="/icons/Akurat_Logo_White.svg"
            alt="AKURAT"
            width={18}
            height={18}
            className="h-[18px] w-[18px] object-contain"
          />
        </div>
        <div className={`min-w-0 flex-1 ${collapsed ? 'hidden' : ''}`}>
          <p className="font-display text-[15px] font-extrabold tracking-tight text-slate-800">
            AKURAT
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Admin Panel
          </p>
        </div>
        <button type="button" onClick={onMobileClose} aria-label="Tutup navigasi" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"><X size={17} /></button>
      </div>

      {/* Search */}
      <div className={`flex items-center gap-2 pb-2 pt-4 ${collapsed ? 'flex-col px-3' : 'px-4'}`}>
        <div className={`relative ${collapsed ? 'hidden' : 'min-w-0 flex-1'}`}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari halaman...  /"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-slate-400"
          />
        </div>
        {collapsed && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Buka pencarian navigasi"
            title="Cari halaman"
            className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 lg:flex"
          >
            <Search size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Perluas navigasi' : 'Perkecil navigasi'}
          title={collapsed ? 'Perluas navigasi' : 'Perkecil navigasi'}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 lg:flex"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav aria-label="Navigasi admin" className={`flex-1 overflow-y-auto py-2 ${collapsed ? 'px-2' : 'px-3'}`}>
        {filteredSections.map((section, si) => (
          <div key={section.title} className={si > 0 ? 'mt-5' : ''}>
            <p className={`mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 ${collapsed ? 'sr-only' : ''}`}>
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const hasChildren = item.children && item.children.length > 0;
                const isExpanded = expandedItems.has(item.label);
                const active = item.href ? isActive(item.href) : false;
                const childActive = isChildActive(item.children);

                return (
                  <li key={item.label} className={collapsed && hasChildren ? 'group relative' : ''}>
                    {/* Parent item */}
                    {hasChildren ? (
                      <button
                        onClick={() => toggleExpand(item.label)}
                        title={collapsed ? item.label : undefined}
                        aria-label={collapsed ? item.label : undefined}
                        aria-expanded={isExpanded}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                          childActive
                            ? 'text-primary font-semibold'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Icon
                          size={18}
                          strokeWidth={1.8}
                          className={`shrink-0 ${
                            childActive ? 'text-primary' : 'text-slate-500'
                          }`}
                        />
                        <span className={`flex-1 text-left truncate ${collapsed ? 'sr-only' : ''}`}>{item.label}</span>
                        <ChevronDown
                          size={14}
                          className={`shrink-0 text-slate-400 transition-transform duration-200 ${collapsed ? 'hidden' : ''} ${
                            isExpanded ? 'rotate-0' : '-rotate-90'
                          }`}
                        />
                      </button>
                    ) : (
                      <Link
                        href={item.href!}
                        onClick={onMobileClose}
                        title={collapsed ? item.label : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                          active
                            ? 'bg-[#4F46E5] text-white font-semibold'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Icon
                          size={18}
                          strokeWidth={1.8}
                          className={`shrink-0 ${
                            active ? 'text-white' : 'text-slate-500'
                          }`}
                        />
                        <span className={`flex-1 truncate ${collapsed ? 'sr-only' : ''}`}>{item.label}</span>
                      </Link>
                    )}

                    {/* Children */}
                    {hasChildren && isExpanded && !collapsed && (
                      <ul className="mt-0.5 ml-3 space-y-0.5 border-l-2 border-slate-100 pl-3">
                        {item.children!.map(child => {
                          const childIsActive = childMatches(child.href);
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={onMobileClose}
                                className={`flex items-center rounded-md px-3 py-1.5 text-[12px] transition-all duration-150 ${
                                  childIsActive
                                    ? 'bg-[#4F46E5]/10 text-[#4F46E5] font-semibold'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                                }`}
                              >
                                <span className="truncate">{child.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {hasChildren && collapsed && (
                      <div className="invisible absolute left-full top-0 z-50 ml-2 w-56 translate-x-1 rounded-xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl transition-all group-hover:visible group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-x-0 group-focus-within:opacity-100">
                        <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
                        {item.children!.map(child => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onMobileClose}
                            className={`block rounded-lg px-2.5 py-2 text-xs font-medium ${childMatches(child.href) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className={`border-t border-slate-100 py-3 ${collapsed ? 'px-3' : 'px-4'}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-600 text-[11px] font-bold text-white">
            {profile?.displayName?.charAt(0).toUpperCase() ?? 'A'}
          </div>
          <div className={`min-w-0 flex-1 ${collapsed ? 'hidden' : ''}`}>
            <p className="truncate text-[13px] font-semibold text-slate-700">
              {profile?.displayName ?? 'Admin Pusat'}
            </p>
            <p className="truncate text-[11px] text-slate-400">
              {profile?.role === 'admin' ? 'Super administrator' : profile?.email}
            </p>
          </div>
        </div>
        <div className={`mt-3 items-center gap-3 ${collapsed ? 'hidden' : 'flex'}`}>
          <button className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700 transition-colors">
            <HelpCircle size={14} />
            Bantuan
          </button>
          <button
            onClick={() => signOut()}
            className="ml-auto flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={14} />
            Keluar
          </button>
        </div>
      </div>
      </aside>
    </>
  );
};
