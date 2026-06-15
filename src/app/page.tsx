"use client";

import { useState, useMemo, useEffect } from 'react';
import notesData from '@/data/notes.json';
import friendsList from '@/data/friends.json';

export interface OtherWay { id: string; title: string; code: string; logic: string; complexity: { time: string; space: string; }; }
export interface DSANote { id: string; title: string; tags: string[]; problemLogic: string; mistakes: string; code: string; complexity: { time: string; space: string; }; dateAdded: string; otherWays: OtherWay[]; problemUrl?: string; }
const dsaNotes: DSANote[] = notesData as DSANote[];

export interface RevisionData {
  lastRevised: number;
  nextDue: number;
  interval: number;
  history?: number[];
  solveTimes?: number[];
  problemUrl?: string;
}

export default function Home() {
  const [search, setSearch] = useState('');
  const [selectedNote, setSelectedNote] = useState<DSANote | null>(null);
  const [showOtherWays, setShowOtherWays] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showMistakes, setShowMistakes] = useState(false);
  const [revisionMap, setRevisionMap] = useState<Record<string, RevisionData>>({});
  const [filterMode, setFilterMode] = useState<'all' | 'srs_due' | 'srs_tomorrow' | 'srs_future'>('all');
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [isBlindMode, setIsBlindMode] = useState(false);
  const [revealedCode, setRevealedCode] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [drillStatus, setDrillStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [drillSeconds, setDrillSeconds] = useState(0);
  const [feedbackKey, setFeedbackKey] = useState(0);
  const [feedbackType, setFeedbackType] = useState<'none' | 'shuriken' | 'turtle'>('none');
  const [selectedFilterTag, setSelectedFilterTag] = useState<string | null>(null);
  // Optional local state in case they import data during runtime
  const [localNotes, setLocalNotes] = useState<DSANote[]>(dsaNotes);

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (drillStatus === 'running') {
      interval = setInterval(() => {
        setDrillSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [drillStatus]);

  useEffect(() => {
    const migrateData = (data: any) => {
      const migrated: Record<string, RevisionData> = {};
      for (const [key, val] of Object.entries(data)) {
        if (typeof val === 'number') {
          migrated[key] = { lastRevised: val, nextDue: val + 3 * 24 * 60 * 60 * 1000, interval: 3 };
        } else {
          migrated[key] = val as RevisionData;
        }
      }
      return migrated;
    };

    fetch(`/api/revisions?t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (Object.keys(data).length > 0) {
          const m = migrateData(data);
          setRevisionMap(m);
          localStorage.setItem('dsaRevisionMap', JSON.stringify(m));
        } else {
          const stored = localStorage.getItem('dsaRevisionMap');
          if (stored) {
            try { setRevisionMap(migrateData(JSON.parse(stored))); } catch(e) {}
          }
        }
      })
      .catch(() => {
        const stored = localStorage.getItem('dsaRevisionMap');
        if (stored) {
          try { setRevisionMap(migrateData(JSON.parse(stored))); } catch(e) {}
        }
      });
  }, []);

  const markCustomRevised = (id: string, dateStr: string) => {
    if (!dateStr) return;
    const prev = revisionMap[id];
    const now = Date.now();
    
    // Parse the date at local noon to avoid timezone shift issues
    const parts = dateStr.split('-');
    const nextDue = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0).getTime();
    
    const history = prev?.history ? [...prev.history, now] : [now];
    
    const updated = { ...revisionMap, [id]: { lastRevised: now, nextDue, interval: 0, history, solveTimes: prev?.solveTimes } };
    setRevisionMap(updated);
    localStorage.setItem('dsaRevisionMap', JSON.stringify(updated));
    fetch('/api/github', { method: 'POST', body: JSON.stringify({ action: 'UPDATE_REVISIONS', payload: updated }) })
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          alert(`Sync Failed!\nError: ${data.error}\nDetails: ${data.details}`);
        }
      });
  };

  const showFeedback = (type: 'shuriken' | 'turtle') => {
    setFeedbackType(type);
    setFeedbackKey(k => k + 1);
    setTimeout(() => {
      setFeedbackType(current => current === type ? 'none' : current);
    }, type === 'shuriken' ? 3000 : 10000);
  };

  const saveSolveTime = (id: string, seconds: number) => {
    const prev = revisionMap[id];
    
    if (prev?.solveTimes?.length) {
      const bestTime = Math.min(...prev.solveTimes);
      if (seconds <= bestTime) {
        showFeedback('shuriken');
      } else {
        showFeedback('turtle');
      }
    } else {
      showFeedback('shuriken');
    }

    const solveTimes = prev?.solveTimes ? [...prev.solveTimes, seconds] : [seconds];
    const updated = { 
      ...revisionMap, 
      [id]: { 
        lastRevised: prev?.lastRevised || Date.now(), 
        nextDue: prev?.nextDue || Date.now(), 
        interval: prev?.interval || 0, 
        history: prev?.history,
        solveTimes 
      } 
    };
    setRevisionMap(updated);
    localStorage.setItem('dsaRevisionMap', JSON.stringify(updated));
    fetch('/api/revisions', { method: 'POST', body: JSON.stringify(updated) });
  };

  const resetAllRevisions = () => {
    if (confirm("Are you sure you want to reset all your revision progress? This will mark all problems as Not Revised.")) {
      setRevisionMap({});
      localStorage.removeItem('dsaRevisionMap');
      fetch('/api/revisions', { method: 'POST', body: JSON.stringify({}) });
    }
  };

  const filteredNotes = useMemo(() => {
    return localNotes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(search.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase())) ||
        note.problemLogic.toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;
      if (selectedFilterTag && !note.tags.includes(selectedFilterTag)) return false;
      
      if (filterMode === 'all') return true;
      const revData = revisionMap[note.id];
      
      if (!revData) {
        if (filterMode === 'srs_due') return true;
        return false;
      }
      
      if (filterMode === 'srs_due') return Date.now() >= revData.nextDue;
      if (filterMode === 'srs_tomorrow') {
        const dueInMs = revData.nextDue - Date.now();
        return dueInMs > 0 && dueInMs <= 24 * 60 * 60 * 1000;
      }
      if (filterMode === 'srs_future') {
        const dueInMs = revData.nextDue - Date.now();
        return dueInMs > 24 * 60 * 60 * 1000;
      }
      
      return true;
    });
  }, [search, localNotes, revisionMap, filterMode, selectedFilterTag]);

  const bulkMarkRevised = () => {
    if (filteredNotes.length === 0) return;
    if (!confirm(`Mark all ${filteredNotes.length} visible problems as "Hard" revised today?`)) return;
    
    const updated = { ...revisionMap };
    const now = Date.now();
    filteredNotes.forEach(note => {
      const prev = updated[note.id];
      const interval = prev ? Math.max(1, Math.round(prev.interval * 1.5)) : 1;
      const history = prev?.history ? [...prev.history, now] : [now];
      updated[note.id] = { lastRevised: now, nextDue: now + interval * 24 * 60 * 60 * 1000, interval, history, solveTimes: prev?.solveTimes };
    });
    
    setRevisionMap(updated);
    localStorage.setItem('dsaRevisionMap', JSON.stringify(updated));
    fetch('/api/revisions', { method: 'POST', body: JSON.stringify(updated) });
  };

  const bulkResetRevisions = () => {
    if (filteredNotes.length === 0) return;
    if (!confirm(`Reset revision status for all ${filteredNotes.length} visible problems? They will be marked as never revised.`)) return;
    
    const updated = { ...revisionMap };
    filteredNotes.forEach(note => {
      delete updated[note.id];
    });
    
    setRevisionMap(updated);
    localStorage.setItem('dsaRevisionMap', JSON.stringify(updated));
    fetch('/api/revisions', { method: 'POST', body: JSON.stringify(updated) });
  };

  const activityMap = useMemo(() => {
    const map: Record<string, number> = {};
    localNotes.forEach(note => {
      const d = new Date(note.dateAdded);
      const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      map[dateStr] = (map[dateStr] || 0) + 1;
    });
    return map;
  }, [localNotes]);
  
  const tagStats = useMemo(() => {
    const stats: Record<string, { total: number; revised: number; uniqueDays: Set<string> }> = {};
    
    localNotes.forEach(note => {
      note.tags.forEach(tag => {
        if (!stats[tag]) stats[tag] = { total: 0, revised: 0, uniqueDays: new Set() };
        stats[tag].total += 1;
        
        const rev = revisionMap[note.id];
        if (rev) {
          stats[tag].revised += 1;
          if (rev.history) {
            rev.history.forEach(ts => {
              const d = new Date(ts);
              stats[tag].uniqueDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
            });
          }
          if (!rev.history && rev.lastRevised) {
            const d = new Date(rev.lastRevised);
            stats[tag].uniqueDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
          }
        }
      });
    });
    
    return Object.entries(stats)
      .map(([tag, data]) => ({
        tag,
        total: data.total,
        solvedCount: data.revised,
        unsolvedCount: data.total - data.revised
      }))
      .sort((a, b) => b.total - a.total);
  }, [localNotes, revisionMap]);
  
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = calendarDate.toLocaleString('default', { month: 'short' });

  const handleExport = () => {
    const exportData = {
      notes: localNotes,
      revisions: revisionMap
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "dsa-vault-backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files[0]) {
      fileReader.readAsText(event.target.files[0], "UTF-8");
      fileReader.onload = e => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          if (Array.isArray(parsed)) {
            setLocalNotes(parsed);
          } else if (parsed.notes && parsed.revisions) {
            setLocalNotes(parsed.notes);
            setRevisionMap(parsed.revisions);
            localStorage.setItem('dsaRevisionMap', JSON.stringify(parsed.revisions));
            fetch('/api/revisions', { method: 'POST', body: JSON.stringify(parsed.revisions) });
          }
          alert("Imported successfully. To make permanent, ask the AI to hardcode this data!");
        } catch(error) {
          alert("Error parsing JSON file");
        }
      };
    }
  };

  return (
    <div className="layout">
      {/* Mobile Overlay */}
      <div className={`mobile-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          DSA Vault
        </div>
        <nav>
          <a className="nav-link active">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            My Notes
          </a>
          <div style={{ marginTop: '2rem', padding: '10px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 'bold', letterSpacing: '1px' }}>
                Activity
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button className="btn" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => setCalendarDate(new Date(year, month - 1, 1))}>&lt;</button>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-main)', width: '60px', textAlign: 'center', fontWeight: 'bold' }}>{monthName} {year}</span>
                <button className="btn" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => setCalendarDate(new Date(year, month + 1, 1))}>&gt;</button>
              </div>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '10px', fontStyle: 'italic', lineHeight: '1.2' }}>
              Bubbles show # of problems solved
            </div>
            
            <div className="calendar-grid" style={{ padding: 0 }}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="calendar-header-day">{d}</div>
              ))}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="calendar-cell empty"></div>
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                const count = activityMap[dateStr] || 0;
                const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                
                return (
                  <div key={day} className={`calendar-cell ${isToday ? 'today' : ''}`} title={count > 0 ? `${count} problems added` : ''}>
                    <span className="calendar-day-number">{day}</span>
                    {count > 0 && (
                      <div className="calendar-bubble">
                        {count}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>


          <div style={{ marginTop: '2rem', padding: '10px', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 'bold', letterSpacing: '1px' }}>
                Friends Network
              </div>
            </div>
            {friendsList.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>No friends added yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {friendsList.map((f: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: '2px 6px', fontSize: '0.7rem', color: 'var(--accent)', borderColor: 'var(--accent)' }}>View</a>
                    </div>
                  </div>
                ))}
                <button className="btn" onClick={() => {
                  const name = prompt("Friend's Name:");
                  if (!name) return;
                  const url = prompt("Friend's Vercel URL:");
                  if (!url) return;
                  fetch('/api/github', {
                    method: 'POST',
                    body: JSON.stringify({ action: 'ADD_FRIEND', payload: { name, url } })
                  }).then(res => res.json()).then(data => {
                    if (data.success) alert("Friend added to GitHub!");
                    else alert(`Error: ${data.error}\nDetails: ${data.details}`);
                  });
                }} style={{ padding: '4px', fontSize: '0.8rem', width: '100%', justifyContent: 'center' }}>
                  + Add Friend
                </button>
              </div>
            )}
          </div>

          {/* Quick actions wrapper */}
          <div style={{ marginTop: '2rem' }}>
            <div className="nav-link" onClick={resetAllRevisions} style={{ color: 'var(--danger)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Reset Revisions
            </div>
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="header-actions">
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, width: '100%' }}>
              <button 
                className="btn mobile-menu-btn" 
                onClick={() => setIsSidebarOpen(true)}
                style={{ padding: '0.5rem' }}
                title="Open Menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              <div className="search-bar" style={{ flex: 1 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input 
                  type="text" 
                  placeholder="Search notes, tags..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle Theme" style={{ padding: '0.5rem' }}>
                {theme === 'dark' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
              </button>
              <button className="btn" onClick={handleExport} title="Export JSON" style={{ padding: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </button>
              <label className="btn" title="Import JSON" style={{ padding: '0.5rem', cursor: 'pointer', margin: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
              </label>
            </div>
          </div>
          <div className="header-controls" style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
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
            <select 
              className="btn" 
              style={{ background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', padding: '0.5rem' }}
              value={filterMode}
              onChange={(e) => {
                setFilterMode(e.target.value as any);
              }}
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
              onChange={(e) => {
                setSelectedFilterTag(e.target.value === "" ? null : e.target.value);
              }}
            >
              <option value="">All Topics</option>
              {tagStats.map(stat => (
                <option key={stat.tag} value={stat.tag}>{stat.tag} ({stat.total})</option>
              ))}
            </select>
          </div>
        </header>

        {!selectedNote ? (
          <>
            {filteredNotes.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 10px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Showing {filteredNotes.length} problems</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={bulkResetRevisions}>
                    Reset All to Unrevised
                  </button>
                  <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderColor: 'var(--success)', color: 'var(--success)' }} onClick={bulkMarkRevised}>
                    Mark All as Revised
                  </button>
                </div>
              </div>
            )}
            <div className="grid">
              {filteredNotes.map(note => (
              <div key={note.id} className="card" onClick={() => { setSelectedNote(note); setRevealedCode(false); setDrillStatus('idle'); setDrillSeconds(0); setShowOtherWays(false); setShowExplanation(false); setShowMistakes(false); }}>
                <div className="card-title">
                  {note.title}
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {(() => {
                      const d = new Date(note.dateAdded);
                      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                    })()}
                    {(() => {
                      const revData = revisionMap[note.id];
                      if (!revData) return null;
                      const dueIn = Math.ceil((revData.nextDue - Date.now()) / (1000 * 60 * 60 * 24));
                      if (dueIn <= 0) {
                        return <span style={{ marginLeft: '10px', color: 'var(--danger)', fontWeight: 'bold' }}>⚠️ Due</span>;
                      }
                      return <span style={{ marginLeft: '10px', color: 'var(--success)' }}>✓ Due in {dueIn}d</span>;
                    })()}
                  </span>
                </div>
                {!isBlindMode && (
                  <>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {note.problemLogic}
                    </p>
                    <div className="tags">
                      {note.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
            {filteredNotes.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                No saved problems found. Ask me (your AI) to save a new one!
              </div>
            )}
          </div>
          </>
        ) : (
          <div className="detail-view" style={{ padding: 0, border: 'none', background: 'transparent' }}>
            <div className="sticky-header-container">
              <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => { setSelectedNote(null); setShowOtherWays(false); setShowExplanation(false); setShowMistakes(false); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                Back to Notes
              </button>
              
              <div className="note-header">
                <div className="note-header-left">
                  <div className="note-header-title">
                    <h2 style={{ fontSize: '2rem', color: 'var(--text-main)', textShadow: '0 0 10px var(--accent-glow)', margin: 0 }}>{selectedNote.title}</h2>
                    {(selectedNote.problemUrl || revisionMap[selectedNote.id]?.problemUrl) ? (
                      <a href={selectedNote.problemUrl || revisionMap[selectedNote.id]?.problemUrl} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderColor: '#ffa116', color: '#ffa116' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        Solve on LeetCode
                      </a>
                    ) : (
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <input 
                          type="url" 
                          placeholder="Paste LeetCode URL..." 
                          className="btn" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', cursor: 'text' }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = e.currentTarget.value;
                              if (val) {
                                // Save to persistent revisionMap
                                const prev = revisionMap[selectedNote.id] || { lastRevised: 0, nextDue: 0, interval: 0 };
                                const updated = {
                                  ...revisionMap,
                                  [selectedNote.id]: {
                                    ...prev,
                                    problemUrl: val
                                  }
                                };
                                setRevisionMap(updated);
                                localStorage.setItem('dsaRevisionMap', JSON.stringify(updated));
                                fetch('/api/revisions', { method: 'POST', body: JSON.stringify(updated) });
                              }
                            }
                          }}
                        />
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Press Enter</span>
                      </div>
                    )}
                  </div>
                  <div className="note-header-stats">
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Last Revised: {revisionMap[selectedNote.id] ? new Date(revisionMap[selectedNote.id].lastRevised).toLocaleDateString() : 'Never'}
                    </span>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '500' }}>Next Due:</span>
                      <input 
                        type="date" 
                        style={{ 
                          background: 'var(--panel-bg)', 
                          color: 'var(--text-main)', 
                          border: '1px solid var(--panel-border)', 
                          borderRadius: '6px', 
                          padding: '4px 8px', 
                          fontSize: '0.85rem',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                        value={revisionMap[selectedNote.id]?.nextDue ? new Date(revisionMap[selectedNote.id].nextDue).toISOString().split('T')[0] : ''}
                        onChange={(e) => markCustomRevised(selectedNote.id, e.target.value)}
                        title="Set a custom date for when you want to revise this next"
                      />
                    </div>
                  </div>
                </div>
                <div className="note-header-right">
                  {/* Stopwatch UI */}
                  {isBlindMode && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--panel-bg)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', color: drillStatus === 'running' ? 'var(--warning)' : 'var(--text-main)', width: '60px', textAlign: 'center' }}>
                        {Math.floor(drillSeconds / 60).toString().padStart(2, '0')}:{(drillSeconds % 60).toString().padStart(2, '0')}
                      </div>
                      
                      {drillStatus === 'idle' && (
                        <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--success)', color: 'var(--success)' }} onClick={() => setDrillStatus('running')}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          Start
                        </button>
                      )}

                      {drillStatus === 'running' && (
                        <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--warning)', color: 'var(--warning)' }} onClick={() => setDrillStatus('paused')}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                          Pause
                        </button>
                      )}

                      {drillStatus === 'paused' && (
                        <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--success)', color: 'var(--success)' }} onClick={() => setDrillStatus('running')}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          Resume
                        </button>
                      )}

                      {(drillStatus === 'running' || drillStatus === 'paused') && (
                        <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => {
                          setDrillStatus('idle');
                          saveSolveTime(selectedNote.id, drillSeconds);
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
                          Stop & Save
                        </button>
                      )}
                    </div>
                  )}

                  <button className="btn" onClick={() => setShowExplanation(!showExplanation)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    {showExplanation ? "Hide Notes" : "Notes"}
                  </button>
                  <button className="btn" onClick={() => setShowMistakes(!showMistakes)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    {showMistakes ? "Hide Mistakes" : "Mistakes"}
                  </button>
                  {selectedNote.otherWays.length > 0 && (
                    <button className="btn" onClick={() => setShowOtherWays(!showOtherWays)}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18"/><path d="M3 12h18"/></svg>
                      {showOtherWays ? "Hide Other Ways" : "Other Ways"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="detail-grid">
              {/* Left Side: Code */}
              <div className="detail-left">
                <div className="detail-section" style={{ height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                    <h3 style={{ margin: 0 }}>Code Hint / Implementation</h3>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>

                      <div className="complexities" style={{ margin: 0, filter: (isBlindMode && !revealedCode) ? 'blur(6px)' : 'none', opacity: (isBlindMode && !revealedCode) ? 0.5 : 1, transition: 'all 0.3s' }}>
                        {(() => {
                          const st = revisionMap[selectedNote.id]?.solveTimes;
                          if (!st || st.length === 0) return null;
                          return (
                            <>
                              <div className="complexity-badge" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
                                <span>Last Time</span>
                                <span>{Math.floor(st.slice(-1)[0] / 60)}m {st.slice(-1)[0] % 60}s</span>
                              </div>
                              <div className="complexity-badge" style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}>
                                <span>Best Time</span>
                                <span>{Math.floor(Math.min(...st) / 60)}m {Math.min(...st) % 60}s</span>
                              </div>
                            </>
                          );
                        })()}
                        <div className="complexity-badge">
                          <span>Time</span>
                          <span>{selectedNote.complexity.time}</span>
                        </div>
                        <div className="complexity-badge">
                          <span>Space</span>
                          <span>{selectedNote.complexity.space}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {isBlindMode && !revealedCode ? (
                    <div className="code-block" style={{ maxHeight: '70vh', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      <div style={{ fontSize: '1.1rem' }}>Code & Complexities Hidden</div>
                      <div style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Guess the pattern and solve it first!</div>
                      <button className="btn" style={{ background: 'var(--warning)', color: '#000', border: 'none', fontWeight: 'bold' }} onClick={() => setRevealedCode(true)}>
                        Reveal Solution
                      </button>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <button 
                        className="btn" 
                        style={{ position: 'absolute', top: '12px', right: '12px', padding: '0.4rem', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', opacity: 0.7, zIndex: 10 }} 
                        onClick={() => navigator.clipboard.writeText(selectedNote.code)}
                        title="Copy code"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                      <pre className="code-block" style={{ maxHeight: '70vh', margin: 0 }}>
                        <code>{selectedNote.code}</code>
                      </pre>
                    </div>
                  )}
                </div>

                {showOtherWays && (
                  <>
                    {selectedNote.otherWays.map(way => (
                      <div key={way.id} className="detail-section glass" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                      <h3 style={{ color: 'var(--warning)', margin: 0 }}>Alternate: {way.title}</h3>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div className="complexities" style={{ margin: 0, filter: (isBlindMode && !revealedCode) ? 'blur(6px)' : 'none', opacity: (isBlindMode && !revealedCode) ? 0.5 : 1, transition: 'all 0.3s' }}>
                          <div className="complexity-badge">
                            <span>Time</span>
                            <span>{way.complexity.time}</span>
                          </div>
                          <div className="complexity-badge">
                            <span>Space</span>
                            <span>{way.complexity.space}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {isBlindMode && !revealedCode ? (
                      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem', textAlign: 'center', background: 'var(--bg-color)', borderRadius: '6px' }}>
                        Alternate logic hidden in Blind Mode.
                      </div>
                    ) : (
                      <>
                        <p style={{ marginBottom: '1rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{way.logic}</p>
                        <div style={{ position: 'relative' }}>
                          <button 
                            className="btn" 
                            style={{ position: 'absolute', top: '12px', right: '12px', padding: '0.4rem', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', opacity: 0.7, zIndex: 10 }} 
                            onClick={() => navigator.clipboard.writeText(way.code)}
                            title="Copy code"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          </button>
                          <pre className="code-block" style={{ maxHeight: '40vh', margin: 0 }}>
                            <code>{way.code}</code>
                          </pre>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                  <button className="btn" onClick={() => {
                    const title = prompt("Title of approach:");
                    if (!title) return;
                    const logic = prompt("Logic explanation:");
                    if (!logic) return;
                    const code = prompt("Paste code:");
                    if (!code) return;
                    const time = prompt("Time complexity:", "O(N)");
                    const space = prompt("Space complexity:", "O(1)");
                    
                    const alternateWay = {
                      id: Date.now().toString(),
                      title, logic, code, complexity: { time: time || 'O(N)', space: space || 'O(1)' }
                    };
                    
                    const updatedNote = { ...selectedNote, otherWays: [...(selectedNote.otherWays || []), alternateWay] };
                    setSelectedNote(updatedNote);
                    
                    fetch('/api/github', {
                      method: 'POST',
                      body: JSON.stringify({ action: 'ADD_ALTERNATE_WAY', payload: { noteId: selectedNote.id, alternateWay } })
                    }).then(res => res.json()).then(data => {
                      if (data.success) {
                        alert("Alternate Way pushed to GitHub successfully!");
                      } else {
                        alert(`GitHub Sync Failed!\nError: ${data.error}\nDetails: ${data.details}`);
                      }
                    }).catch(err => {
                      alert("Network Error: " + err.message);
                    });
                  }}>
                    + Add Alternate Way
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right Side: Notes and Logic */}
              <div className="detail-right">
                {showExplanation && (
                  <div className="detail-section" style={{ borderLeft: '4px solid var(--accent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0 }}>My Notes</h3>
                      <button className="btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => {
                        const newLogic = prompt("Edit Notes:", selectedNote.problemLogic);
                        if (newLogic && newLogic !== selectedNote.problemLogic) {
                          setSelectedNote({ ...selectedNote, problemLogic: newLogic });
                          fetch('/api/github', {
                            method: 'POST',
                            body: JSON.stringify({ action: 'UPDATE_NOTE_FIELD', payload: { noteId: selectedNote.id, field: 'problemLogic', value: newLogic } })
                          }).then(res => res.json()).then(data => {
                            if (!data.success) alert(`Error: ${data.error}\nDetails: ${data.details}`);
                          });
                        }
                      }}>Edit</button>
                    </div>
                    <p style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap', marginTop: '10px' }}>{selectedNote.problemLogic}</p>
                  </div>
                )}

                {showMistakes && (
                  <div className="detail-section" style={{ borderLeft: '4px solid var(--danger)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0 }}>Mistakes to Avoid</h3>
                      <button className="btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => {
                        const newMistakes = prompt("Edit Mistakes:", selectedNote.mistakes);
                        if (newMistakes && newMistakes !== selectedNote.mistakes) {
                          setSelectedNote({ ...selectedNote, mistakes: newMistakes });
                          fetch('/api/github', {
                            method: 'POST',
                            body: JSON.stringify({ action: 'UPDATE_NOTE_FIELD', payload: { noteId: selectedNote.id, field: 'mistakes', value: newMistakes } })
                          }).then(res => res.json()).then(data => {
                            if (!data.success) alert(`Error: ${data.error}\nDetails: ${data.details}`);
                          });
                        }
                      }}>Edit</button>
                    </div>
                    <p style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap', marginTop: '10px' }}>{selectedNote.mistakes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      
      {feedbackType === 'shuriken' && (
        <img key={`shuriken-${feedbackKey}`} src="/shuriken.png" alt="Shuriken" className="shuriken-anim" />
      )}
      {feedbackType === 'turtle' && (
        <div key={`turtle-${feedbackKey}`} className="turtle-anim">🐢</div>
      )}
    </div>
  );
}
