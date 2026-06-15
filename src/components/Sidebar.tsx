import React from 'react';
import friendsList from '@/data/friends.json';
import { apiSync } from '@/utils/apiSync';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  calendarDate: Date;
  setCalendarDate: (val: Date) => void;
  activityMap: Record<string, number>;
  friends: Array<{ name: string; url: string }>;
  setFriends: React.Dispatch<React.SetStateAction<Array<{ name: string; url: string }>>>;
  isUnlocked: boolean;
  handleExport: () => void;
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  bulkClearDueDates: (operator: string, days: number) => void;
}

export default function Sidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  calendarDate,
  setCalendarDate,
  activityMap,
  friends,
  setFriends,
  isUnlocked,
  handleExport,
  handleImport,
  bulkClearDueDates
}: SidebarProps) {
  const [clearOperator, setClearOperator] = React.useState('>');
  const [clearDays, setClearDays] = React.useState('');
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const monthName = calendarDate.toLocaleString('default', { month: 'short' });

  return (
    <>
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
            {friends.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>No friends added yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {friends.map((f: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: '2px 6px', fontSize: '0.7rem', color: 'var(--accent)', borderColor: 'var(--accent)' }}>View</a>
                      {isUnlocked && (
                        <button className="btn" onClick={() => {
                          if (confirm(`Remove friend ${f.name}?`)) {
                            apiSync('REMOVE_FRIEND', { name: f.name })
                            .then(res => res.json()).then(data => {
                              if (data.success) {
                                setFriends(friends.filter(friend => friend.name !== f.name));
                                alert("Friend removed!");
                              } else alert(`Error: ${data.error}`);
                            });
                          }
                        }} style={{ padding: '2px 6px', fontSize: '0.7rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}>Del</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {isUnlocked && (
              <button className="btn" onClick={() => {
                const name = prompt("Friend's Name:");
                if (!name) return;
                const url = prompt("Friend's Vercel URL:");
                if (!url) return;
                apiSync('ADD_FRIEND', { name, url })
                .then(res => res.json()).then(data => {
                  if (data.success) {
                    setFriends([...friends, { name, url }]);
                    alert("Friend added to GitHub!");
                  } else alert(`Error: ${data.error}\nDetails: ${data.details}`);
                });
              }} style={{ padding: '4px', fontSize: '0.8rem', width: '100%', justifyContent: 'center', marginTop: '10px' }}>
                + Add Friend
              </button>
            )}
          </div>

          {/* System Actions */}
          {isUnlocked && (
            <div className="friends-section" style={{ marginTop: '20px', borderTop: '1px solid var(--panel-border)', paddingTop: '15px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Data Backup</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn" onClick={handleExport} style={{ flex: 1, padding: '6px', fontSize: '0.8rem', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Export JSON
              </button>
              <label className="btn" style={{ flex: 1, padding: '6px', fontSize: '0.8rem', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                Import JSON
                <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
              </label>
            </div>
            {isUnlocked && (
              <div style={{ marginTop: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', color: 'var(--danger)' }}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--danger)' }}>Bulk Clear Due Dates</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px' }}>
                  <span style={{ padding: '0.4rem 0.2rem 0.4rem 0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rev.</span>
                  <select
                    value={clearOperator}
                    onChange={(e) => setClearOperator(e.target.value)}
                    style={{ background: 'transparent', color: 'var(--text-main)', border: 'none', padding: '0.4rem 0.2rem', fontSize: '0.8rem', outline: 'none', cursor: 'pointer', appearance: 'none', textAlign: 'center', borderRight: '1px solid var(--panel-border)' }}
                  >
                    <option value=">" style={{ background: 'var(--panel-bg)', color: 'var(--text-main)' }}>&gt;</option>
                    <option value="<" style={{ background: 'var(--panel-bg)', color: 'var(--text-main)' }}>&lt;</option>
                    <option value="=" style={{ background: 'var(--panel-bg)', color: 'var(--text-main)' }}>=</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Days"
                    value={clearDays}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^[0-9]+$/.test(val)) setClearDays(val);
                    }}
                    style={{ width: '45px', background: 'transparent', color: 'var(--text-main)', border: 'none', padding: '0.4rem', fontSize: '0.8rem', outline: 'none' }}
                  />
                  <span style={{ padding: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', borderLeft: '1px solid var(--panel-border)' }}>days ago</span>
                </div>
                <button className="btn" onClick={() => {
                  if (!clearDays) return alert("Please enter a valid number of days.");
                  bulkClearDueDates(clearOperator, parseInt(clearDays, 10));
                }} style={{ padding: '4px', fontSize: '0.8rem', width: '100%', justifyContent: 'center', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                  Clear Matching Due Dates
                </button>
              </div>
            )}
          </div>
          )}
        </nav>
      </aside>
    </>
  );
}
