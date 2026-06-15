"use client";

import { useState, useMemo, useEffect } from 'react';
import notesData from '@/data/notes.json';
import friendsList from '@/data/friends.json';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import NoteGrid from '@/components/NoteGrid';
import NoteModal from '@/components/NoteModal';
import AddNoteModal from '@/components/AddNoteModal';
import { apiSync } from '@/utils/apiSync';

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
  const [friends, setFriends] = useState(friendsList);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [lastRevisedDays, setLastRevisedDays] = useState<string>("");
  const [lastRevisedOperator, setLastRevisedOperator] = useState<string>(">");

  useEffect(() => {
    const secret = localStorage.getItem('dsaAdminSecret');
    if (secret) {
      apiSync('VERIFY_SECRET', {}, secret)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setIsUnlocked(true);
          } else {
            localStorage.removeItem('dsaAdminSecret');
            setIsUnlocked(false);
          }
        })
        .catch(() => setIsUnlocked(false));
    }
  }, []);

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
    if (!isUnlocked) return alert("Restricted: Dashboard is locked. Click the padlock icon to unlock.");
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
    apiSync('UPDATE_REVISIONS', updated)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("Due date updated in GitHub!");
        } else {
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
    if (!isUnlocked) return alert("Restricted: Dashboard is locked. Click the padlock icon to unlock.");
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
    apiSync('UPDATE_REVISIONS', updated)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("Solve time saved to GitHub!");
        } else {
          alert(`Sync Failed!\nError: ${data.error}\nDetails: ${data.details}`);
        }
      });
  };

  const bulkClearDueDates = (operator: string, days: number) => {
    if (!isUnlocked) return alert("Restricted: Dashboard is locked.");
    const updated = { ...revisionMap };
    let matchCount = 0;
    
    Object.keys(updated).forEach(id => {
      const revData = updated[id];
      const lastRevised = revData.lastRevised || 0;
      let isMatch = false;

      if (lastRevised > 0) {
        const now = new Date();
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const lastRevDate = new Date(lastRevised);
        const lastRevMidnight = new Date(lastRevDate.getFullYear(), lastRevDate.getMonth(), lastRevDate.getDate()).getTime();
        const calendarDaysSince = Math.floor((todayMidnight - lastRevMidnight) / (1000 * 60 * 60 * 24));
        
        if (operator === '>' && calendarDaysSince > days) isMatch = true;
        else if (operator === '<' && calendarDaysSince < days) isMatch = true;
        else if (operator === '=' && calendarDaysSince === days) isMatch = true;
      } else {
        if (operator === '>') isMatch = true;
      }
      
      if (isMatch) {
        matchCount++;
        updated[id] = { ...revData, nextDue: 0, interval: 0 };
      }
    });

    if (matchCount === 0) {
      return alert("No problems matched the given criteria.");
    }

    if (confirm(`Are you sure you want to clear due dates (make them ready for review now) for ${matchCount} problems?`)) {
      setRevisionMap(updated);
      localStorage.setItem('dsaRevisionMap', JSON.stringify(updated));
      apiSync('UPDATE_REVISIONS', updated)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            alert(`Successfully cleared due dates for ${matchCount} problems in GitHub!`);
          } else {
            alert(`Sync Failed!\nError: ${data.error}\nDetails: ${data.details}`);
          }
        });
    }
  };

  const filteredNotes = useMemo(() => {
    return localNotes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(search.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase())) ||
        note.problemLogic.toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;
      if (selectedFilterTag && !note.tags.includes(selectedFilterTag)) return false;
      
      const revData = revisionMap[note.id];
      if (lastRevisedDays !== '') {
        const days = parseInt(lastRevisedDays, 10);
        if (!isNaN(days)) {
          const lastRevised = revData?.lastRevised || 0;
          if (lastRevised > 0) {
            const now = new Date();
            const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const lastRevDate = new Date(lastRevised);
            const lastRevMidnight = new Date(lastRevDate.getFullYear(), lastRevDate.getMonth(), lastRevDate.getDate()).getTime();
            const calendarDaysSince = Math.floor((todayMidnight - lastRevMidnight) / (1000 * 60 * 60 * 24));
            
            if (lastRevisedOperator === '>') {
              if (calendarDaysSince <= days) return false;
            } else if (lastRevisedOperator === '<') {
              if (calendarDaysSince >= days) return false;
            } else if (lastRevisedOperator === '=') {
              if (calendarDaysSince !== days) return false;
            }
          } else {
            // Never revised
            if (lastRevisedOperator === '<' || lastRevisedOperator === '=') {
              return false;
            }
          }
        }
      }

      if (filterMode === 'all') return true;
      
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
  }, [search, localNotes, revisionMap, filterMode, selectedFilterTag, lastRevisedDays, lastRevisedOperator]);

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
      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        calendarDate={calendarDate}
        setCalendarDate={setCalendarDate}
        activityMap={activityMap}
        friends={friends}
        setFriends={setFriends}
        isUnlocked={isUnlocked}
        handleExport={handleExport}
        handleImport={handleImport}
        bulkClearDueDates={bulkClearDueDates}
      />

      <main className="main-content">
        <Header 
          setIsSidebarOpen={setIsSidebarOpen}
          search={search}
          setSearch={setSearch}
          theme={theme}
          setTheme={setTheme}
          isBlindMode={isBlindMode}
          setIsBlindMode={setIsBlindMode}
          filterMode={filterMode}
          setFilterMode={setFilterMode}
          selectedFilterTag={selectedFilterTag}
          setSelectedFilterTag={setSelectedFilterTag}
          tagStats={tagStats}
          isUnlocked={isUnlocked}
          setIsUnlocked={setIsUnlocked}
          hideFilters={!!selectedNote}
          lastRevisedDays={lastRevisedDays}
          setLastRevisedDays={setLastRevisedDays}
          lastRevisedOperator={lastRevisedOperator}
          setLastRevisedOperator={setLastRevisedOperator}
        />

        {showAddNoteModal ? (
          <AddNoteModal 
            onClose={() => setShowAddNoteModal(false)}
            onAddNote={(newNote: DSANote) => {
              setLocalNotes(prev => [newNote, ...prev]);
              setShowAddNoteModal(false);
            }}
          />
        ) : !selectedNote ? (
          <NoteGrid 
            filteredNotes={filteredNotes}
            setSelectedNote={setSelectedNote}
            setRevealedCode={setRevealedCode}
            setDrillStatus={setDrillStatus}
            setDrillSeconds={setDrillSeconds}
            setShowOtherWays={setShowOtherWays}
            setShowExplanation={setShowExplanation}
            setShowMistakes={setShowMistakes}
            revisionMap={revisionMap}
            isBlindMode={isBlindMode}
          />
        ) : (
          <NoteModal 
            selectedNote={selectedNote}
            setSelectedNote={setSelectedNote}
            isBlindMode={isBlindMode}
            drillStatus={drillStatus}
            setDrillStatus={setDrillStatus}
            drillSeconds={drillSeconds}
            saveSolveTime={saveSolveTime}
            showExplanation={showExplanation}
            setShowExplanation={setShowExplanation}
            showMistakes={showMistakes}
            setShowMistakes={setShowMistakes}
            showOtherWays={showOtherWays}
            setShowOtherWays={setShowOtherWays}
            revealedCode={revealedCode}
            setRevealedCode={setRevealedCode}
            revisionMap={revisionMap}
            setRevisionMap={setRevisionMap}
            markCustomRevised={markCustomRevised}
            updateLocalNote={(updatedNote: DSANote) => {
              setLocalNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
            }}
            isUnlocked={isUnlocked}
          />
        )}
      </main>
      
      {/* Floating Action Button for adding notes */}
      {isUnlocked && !selectedNote && !showAddNoteModal && (
        <button 
          className="btn" 
          onClick={() => setShowAddNoteModal(true)}
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--accent)',
            color: '#000',
            fontSize: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            border: 'none',
            cursor: 'pointer'
          }}
          title="Add New Problem"
        >
          +
        </button>
      )}
      
      {feedbackType === 'shuriken' && (
        <img key={`shuriken-${feedbackKey}`} src="/shuriken.png" alt="Shuriken" className="shuriken-anim" />
      )}
      {feedbackType === 'turtle' && (
        <div key={`turtle-${feedbackKey}`} className="turtle-anim">🐢</div>
      )}
    </div>
  );
}
