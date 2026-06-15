import React from 'react';
import { apiSync } from '@/utils/apiSync';

const secret_key = process.env.ADMIN_SECRET || 'Enter Admin Secret to unlock edit capabilities:';
interface HeaderProps {
  setIsSidebarOpen: (val: boolean) => void;
  search: string;
  setSearch: (val: string) => void;
  theme: 'dark' | 'light';
  setTheme: (val: 'dark' | 'light') => void;
  isBlindMode: boolean;
  setIsBlindMode: (val: boolean) => void;
  filterMode: 'all' | 'srs_due' | 'srs_tomorrow' | 'srs_future';
  setFilterMode: (val: 'all' | 'srs_due' | 'srs_tomorrow' | 'srs_future') => void;
  selectedFilterTag: string | null;
  setSelectedFilterTag: (val: string | null) => void;
  tagStats: Array<{ tag: string; total: number }>;
  isUnlocked: boolean;
  setIsUnlocked: (val: boolean) => void;
  hideFilters?: boolean;
  lastRevisedDays: string;
  setLastRevisedDays: (val: string) => void;
  lastRevisedOperator: string;
  setLastRevisedOperator: (val: string) => void;
}

export default function Header({
  setIsSidebarOpen,
  search,
  setSearch,
  theme,
  setTheme,
  isBlindMode,
  setIsBlindMode,
  filterMode,
  setFilterMode,
  selectedFilterTag,
  setSelectedFilterTag,
  tagStats,
  isUnlocked,
  setIsUnlocked,
  hideFilters,
  lastRevisedDays,
  setLastRevisedDays,
  lastRevisedOperator,
  setLastRevisedOperator
}: HeaderProps) {
  return (
    <header className="header">
      <div className="header-actions">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, width: '100%' }}>
          <button
            className="btn mobile-menu-btn"
            onClick={() => setIsSidebarOpen(true)}
            style={{ padding: '0.5rem' }}
            title="Open Menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <div className="search-bar" style={{ flex: 1 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              placeholder="Search notes, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn" onClick={() => {
            if (isUnlocked) {
              if (confirm('Clear admin secret and lock dashboard?')) {
                localStorage.removeItem('dsaAdminSecret');
                setIsUnlocked(false);
                alert('Dashboard locked.');
              }
            } else {
              const secret = prompt(secret_key);
              if (secret) {
                apiSync('VERIFY_SECRET', {}, secret)
                  .then(res => res.json())
                  .then(data => {
                    if (data.success) {
                      localStorage.setItem('dsaAdminSecret', secret);
                      setIsUnlocked(true);
                      alert('Admin secret verified and saved.');
                    } else {
                      alert('Invalid Admin Secret! Could not unlock.');
                    }
                  })
                  .catch(() => alert('Network error while verifying secret.'));
              }
            }
          }} title="Lock / Unlock Edit Mode" style={{ padding: '0.5rem' }}>
            {isUnlocked ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
          </button>
          <button className="btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle Theme" style={{ padding: '0.5rem' }}>
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            )}
          </button>

        </div>
      </div>
      <div className="header-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {isUnlocked && (
          <button
            className="btn"
            onClick={() => setIsBlindMode(!isBlindMode)}
            style={{
              background: isBlindMode ? 'var(--warning)' : 'var(--panel-bg)',
              color: isBlindMode ? '#000' : 'var(--text-main)',
              borderColor: isBlindMode ? 'var(--warning)' : 'var(--panel-border)',
              fontWeight: isBlindMode ? 'bold' : 'normal',
              boxShadow: isBlindMode ? '0 0 10px rgba(234, 179, 8, 0.4)' : 'none',
              padding: '0.5rem 0.8rem'
            }}
            title="Hide tags and code to test your pattern recognition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
              {isBlindMode && <line x1="1" y1="1" x2="23" y2="23" />}
            </svg>
            Blind Mode
          </button>
        )}
        {!hideFilters && (
          <>
            <select
              className="btn"
              style={{ background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', padding: '0.5rem' }}
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
            >
              <option value="all">All Problems</option>
              <option value="srs_due">Needs Revision Today</option>
              <option value="srs_tomorrow">Due Tomorrow</option>
              <option value="srs_future">Due Later</option>
            </select>
            <select
              className="btn"
              style={{ background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', padding: '0.5rem', maxWidth: '200px' }}
              value={selectedFilterTag || ""}
              onChange={(e) => setSelectedFilterTag(e.target.value === "" ? null : e.target.value)}
            >
              <option value="">All Topics</option>
              {tagStats.map(stat => (
                <option key={stat.tag} value={stat.tag}>{stat.tag} ({stat.total})</option>
              ))}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '6px', overflow: 'hidden' }}>
              <span style={{ padding: '0.5rem 0.2rem 0.5rem 0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Revised</span>
              <select
                value={lastRevisedOperator}
                onChange={(e) => setLastRevisedOperator(e.target.value)}
                style={{ background: 'transparent', color: 'var(--text-main)', border: 'none', padding: '0.5rem 0.2rem', fontSize: '0.85rem', outline: 'none', cursor: 'pointer', appearance: 'none', textAlign: 'center', borderRight: '1px solid var(--panel-border)' }}
                title="Change comparison operator"
              >
                <option value=">" style={{ background: 'var(--panel-bg)', color: 'var(--text-main)' }}>&gt;</option>
                <option value="<" style={{ background: 'var(--panel-bg)', color: 'var(--text-main)' }}>&lt;</option>
                <option value="=" style={{ background: 'var(--panel-bg)', color: 'var(--text-main)' }}>=</option>
              </select>
              <input
                type="text"
                placeholder="Days"
                value={lastRevisedDays}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^[0-9]+$/.test(val)) {
                    setLastRevisedDays(val);
                  }
                }}
                style={{
                  width: '60px',
                  background: 'transparent',
                  color: 'var(--text-main)',
                  border: 'none',
                  padding: '0.5rem',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
                title="Filter by problems not revised in the last X days"
              />
              <span style={{ padding: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', borderLeft: '1px solid var(--panel-border)' }}>days ago</span>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
