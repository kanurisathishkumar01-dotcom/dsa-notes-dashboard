import React from 'react';
import { DSANote, RevisionData, OtherWay } from '../app/page';
import { apiSync } from '@/utils/apiSync';

interface NoteModalProps {
  selectedNote: DSANote;
  setSelectedNote: (note: DSANote | null) => void;
  isBlindMode: boolean;
  drillStatus: 'idle' | 'running' | 'paused';
  setDrillStatus: (val: 'idle' | 'running' | 'paused') => void;
  drillSeconds: number;
  saveSolveTime: (id: string, seconds: number) => void;
  showExplanation: boolean;
  setShowExplanation: (val: boolean) => void;
  showMistakes: boolean;
  setShowMistakes: (val: boolean) => void;
  showOtherWays: boolean;
  setShowOtherWays: (val: boolean) => void;
  revealedCode: boolean;
  setRevealedCode: (val: boolean) => void;
  revisionMap: Record<string, RevisionData>;
  setRevisionMap: React.Dispatch<React.SetStateAction<Record<string, RevisionData>>>;
  markCustomRevised: (id: string, dateStr: string) => void;
  updateLocalNote: (updatedNote: DSANote) => void;
  isUnlocked: boolean;
}

export default function NoteModal({
  selectedNote,
  setSelectedNote,
  isBlindMode,
  drillStatus,
  setDrillStatus,
  drillSeconds,
  saveSolveTime,
  showExplanation,
  setShowExplanation,
  showMistakes,
  setShowMistakes,
  showOtherWays,
  setShowOtherWays,
  revealedCode,
  setRevealedCode,
  revisionMap,
  setRevisionMap,
  markCustomRevised,
  updateLocalNote,
  isUnlocked
}: NoteModalProps) {
  const [editingCodeId, setEditingCodeId] = React.useState<string | null>(null);
  const [editedCodeValue, setEditedCodeValue] = React.useState<string>("");
  const [isEditingUrl, setIsEditingUrl] = React.useState(false);
  const [urlValue, setUrlValue] = React.useState("");

  const handleSaveUrl = (val: string) => {
    const prev = revisionMap[selectedNote.id] || { lastRevised: 0, nextDue: 0, interval: 0 };
    const updated = {
      ...revisionMap,
      [selectedNote.id]: { ...prev, problemUrl: val }
    };
    setRevisionMap(updated);
    localStorage.setItem('dsaRevisionMap', JSON.stringify(updated));
    apiSync('UPDATE_REVISIONS', updated)
      .then(res => res.json()).then(data => {
        if (data.success) alert("URL saved!");
        else alert(`Error: ${data.error}`);
      });
    setIsEditingUrl(false);
  };

  return (
    <div className="detail-view" style={{ padding: 0, border: 'none', background: 'transparent' }}>
      <div className="sticky-header-container" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--bg-color)', paddingBottom: '10px', borderBottom: '1px solid var(--panel-border)', marginBottom: '20px' }}>
        <button className="btn" style={{ alignSelf: 'flex-start', marginBottom: '10px' }} onClick={() => { setSelectedNote(null); setShowOtherWays(false); setShowExplanation(false); setShowMistakes(false); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Back to Notes
        </button>

        <div className="note-header" style={{ marginBottom: 0 }}>
          <div className="note-header-left">
            <div className="note-header-title">
              <h2 style={{ fontSize: '2rem', color: 'var(--text-main)', textShadow: '0 0 10px var(--accent-glow)', margin: 0 }}>{selectedNote.title}</h2>
              {isEditingUrl ? (
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <input
                    type="url"
                    value={urlValue}
                    onChange={(e) => setUrlValue(e.target.value)}
                    placeholder="Paste LeetCode URL..."
                    className="btn"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', cursor: 'text' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveUrl(e.currentTarget.value);
                      else if (e.key === 'Escape') setIsEditingUrl(false);
                    }}
                  />
                  <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => handleSaveUrl(urlValue)} title="Save">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  </button>
                  <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} onClick={() => setIsEditingUrl(false)} title="Cancel">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              ) : (selectedNote.problemUrl || revisionMap[selectedNote.id]?.problemUrl) ? (
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <a href={selectedNote.problemUrl || revisionMap[selectedNote.id]?.problemUrl} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', borderColor: '#ffa116', color: '#ffa116' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                    Solve on LeetCode
                  </a>
                  {isUnlocked && (
                    <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} onClick={() => {
                      setUrlValue(selectedNote.problemUrl || revisionMap[selectedNote.id]?.problemUrl || "");
                      setIsEditingUrl(true);
                    }} title="Edit Link">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                  )}
                </div>
              ) : isUnlocked ? (
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', borderColor: 'var(--panel-border)' }} onClick={() => {
                    setUrlValue("");
                    setIsEditingUrl(true);
                  }}>
                    + Add LeetCode URL
                  </button>
                </div>
              ) : null}
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
                  title={isUnlocked ? "Set a custom date for when you want to revise this next" : "Dashboard is locked. Cannot edit date."}
                  disabled={!isUnlocked}
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    Start
                  </button>
                )}

                {drillStatus === 'running' && (
                  <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--warning)', color: 'var(--warning)' }} onClick={() => setDrillStatus('paused')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                    Pause
                  </button>
                )}

                {drillStatus === 'paused' && (
                  <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--success)', color: 'var(--success)' }} onClick={() => setDrillStatus('running')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    Resume
                  </button>
                )}

                {(drillStatus === 'running' || drillStatus === 'paused') && (
                  <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => {
                    setDrillStatus('idle');
                    saveSolveTime(selectedNote.id, drillSeconds);
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>
                    Stop & Save
                  </button>
                )}
              </div>
            )}

            <button className="btn" onClick={() => setShowExplanation(!showExplanation)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
              {showExplanation ? "Hide Notes" : "Notes"}
            </button>
            <button className="btn" onClick={() => setShowMistakes(!showMistakes)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              {showMistakes ? "Hide Mistakes" : "Mistakes"}
            </button>
            {selectedNote.otherWays.length > 0 && (
              <button className="btn" onClick={() => setShowOtherWays(!showOtherWays)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18" /><path d="M3 12h18" /></svg>
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
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                <div style={{ fontSize: '1.1rem' }}>Code & Complexities Hidden</div>
                <div style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Guess the pattern and solve it first!</div>
                <button className="btn" style={{ background: 'var(--warning)', color: '#000', border: 'none', fontWeight: 'bold' }} onClick={() => setRevealedCode(true)}>
                  Reveal Solution
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '5px', zIndex: 10 }}>
                  {editingCodeId === 'main' ? (
                    <>
                      <button className="btn" style={{ padding: '0.4rem', background: 'var(--success)', color: '#000', border: 'none', fontWeight: 'bold' }} onClick={() => {
                        const updatedNote = { ...selectedNote, code: editedCodeValue };
                        setSelectedNote(updatedNote);
                        updateLocalNote(updatedNote);
                        apiSync('UPDATE_NOTE_FIELD', { noteId: selectedNote.id, field: 'code', value: editedCodeValue })
                          .then(res => res.json()).then(data => {
                            if (data.success) alert("Code saved to GitHub!");
                            else alert(`Error: ${data.error}`);
                          });
                        setEditingCodeId(null);
                      }}>Save</button>
                      <button className="btn" style={{ padding: '0.4rem', background: 'var(--panel-bg)' }} onClick={() => setEditingCodeId(null)}>Cancel</button>
                    </>
                  ) : isUnlocked ? (
                    <button className="btn" style={{ padding: '0.4rem', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', opacity: 0.7 }} onClick={() => {
                      setEditingCodeId('main');
                      setEditedCodeValue(selectedNote.code);
                    }} title="Edit code">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                    </button>
                  ) : null}
                  <button
                    className="btn"
                    style={{ padding: '0.4rem', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', opacity: 0.7 }}
                    onClick={() => navigator.clipboard.writeText(selectedNote.code)}
                    title="Copy code"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  </button>
                </div>
                {editingCodeId === 'main' ? (
                  <textarea
                    className="code-block"
                    style={{ width: '100%', height: '70vh', margin: 0, fontFamily: 'monospace', resize: 'vertical', background: 'var(--panel-bg)', color: 'var(--text-main)', fontSize: '0.85rem', whiteSpace: 'pre', overflowX: 'auto' }}
                    value={editedCodeValue}
                    onChange={(e) => setEditedCodeValue(e.target.value)}
                    spellCheck={false}
                  />
                ) : (
                  <pre className="code-block" style={{ maxHeight: '70vh', margin: 0, fontSize: '0.85rem', overflowX: 'auto' }}>
                    <code>{selectedNote.code}</code>
                  </pre>
                )}
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
                      {isUnlocked && (
                        <button className="btn" style={{ padding: '2px 6px', fontSize: '0.7rem', borderColor: 'var(--danger)', color: 'var(--danger)', height: 'fit-content' }} onClick={() => {
                          if (confirm(`Delete alternate way: ${way.title}?`)) {
                            apiSync('REMOVE_ALTERNATE_WAY', { noteId: selectedNote.id, altId: way.id })
                              .then(res => res.json()).then(data => {
                                if (data.success) {
                                  const updatedNote = { ...selectedNote, otherWays: selectedNote.otherWays.filter((w: any) => w.id !== way.id) };
                                  setSelectedNote(updatedNote);
                                  updateLocalNote(updatedNote);
                                  alert("Alternate way deleted!");
                                } else {
                                  alert(`Error: ${data.error}`);
                                }
                              });
                          }
                        }}>Del</button>
                      )}
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
                        <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '5px', zIndex: 10 }}>
                          {editingCodeId === way.id ? (
                            <>
                              <button className="btn" style={{ padding: '0.4rem', background: 'var(--success)', color: '#000', border: 'none', fontWeight: 'bold' }} onClick={() => {
                                const newOtherWays = selectedNote.otherWays.map((w: any) => w.id === way.id ? { ...w, code: editedCodeValue } : w);
                                const updatedNote = { ...selectedNote, otherWays: newOtherWays };
                                setSelectedNote(updatedNote);
                                updateLocalNote(updatedNote);
                                apiSync('UPDATE_NOTE_FIELD', { noteId: selectedNote.id, field: 'otherWays', value: newOtherWays })
                                  .then(res => res.json()).then(data => {
                                    if (data.success) alert("Alternate code saved to GitHub!");
                                    else alert(`Error: ${data.error}`);
                                  });
                                setEditingCodeId(null);
                              }}>Save</button>
                              <button className="btn" style={{ padding: '0.4rem', background: 'var(--panel-bg)' }} onClick={() => setEditingCodeId(null)}>Cancel</button>
                            </>
                          ) : isUnlocked ? (
                            <button className="btn" style={{ padding: '0.4rem', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', opacity: 0.7 }} onClick={() => {
                              setEditingCodeId(way.id);
                              setEditedCodeValue(way.code);
                            }} title="Edit code">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                            </button>
                          ) : null}
                          <button
                            className="btn"
                            style={{ padding: '0.4rem', background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', opacity: 0.7 }}
                            onClick={() => navigator.clipboard.writeText(way.code)}
                            title="Copy code"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                          </button>
                        </div>
                        {editingCodeId === way.id ? (
                          <textarea
                            className="code-block"
                            style={{ width: '100%', height: '40vh', margin: 0, fontFamily: 'monospace', resize: 'vertical', background: 'var(--panel-bg)', color: 'var(--text-main)', fontSize: '0.85rem', whiteSpace: 'pre', overflowX: 'auto' }}
                            value={editedCodeValue}
                            onChange={(e) => setEditedCodeValue(e.target.value)}
                            spellCheck={false}
                          />
                        ) : (
                          <pre className="code-block" style={{ maxHeight: '40vh', margin: 0, fontSize: '0.85rem', overflowX: 'auto' }}>
                            <code>{way.code}</code>
                          </pre>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}

              {isUnlocked && (
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
                    updateLocalNote(updatedNote);

                    apiSync('ADD_ALTERNATE_WAY', { noteId: selectedNote.id, alternateWay })
                      .then(res => res.json()).then(data => {
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
              )}
            </>
          )}
        </div>

        {/* Right Side: Notes and Logic */}
        <div className="detail-right">
          {showExplanation && (
            <div className="detail-section" style={{ borderLeft: '4px solid var(--accent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>My Notes</h3>
                {isUnlocked && (
                  <button className="btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => {
                    const newLogic = prompt("Edit Notes:", selectedNote.problemLogic);
                    if (newLogic && newLogic !== selectedNote.problemLogic) {
                      const updatedNote = { ...selectedNote, problemLogic: newLogic };
                      setSelectedNote(updatedNote);
                      updateLocalNote(updatedNote);
                      apiSync('UPDATE_NOTE_FIELD', { noteId: selectedNote.id, field: 'problemLogic', value: newLogic })
                        .then(res => res.json()).then(data => {
                          if (data.success) alert("Notes saved to GitHub!");
                          else alert(`Error: ${data.error}\nDetails: ${data.details}`);
                        });
                    }
                  }}>Edit</button>
                )}
              </div>
              <p style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap', marginTop: '10px' }}>{selectedNote.problemLogic}</p>
            </div>
          )}

          {showMistakes && (
            <div className="detail-section" style={{ borderLeft: '4px solid var(--danger)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Mistakes to Avoid</h3>
                {isUnlocked && (
                  <button className="btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => {
                    const newMistakes = prompt("Edit Mistakes:", selectedNote.mistakes);
                    if (newMistakes && newMistakes !== selectedNote.mistakes) {
                      const updatedNote = { ...selectedNote, mistakes: newMistakes };
                      setSelectedNote(updatedNote);
                      updateLocalNote(updatedNote);
                      apiSync('UPDATE_NOTE_FIELD', { noteId: selectedNote.id, field: 'mistakes', value: newMistakes })
                        .then(res => res.json()).then(data => {
                          if (data.success) alert("Mistakes saved to GitHub!");
                          else alert(`Error: ${data.error}\nDetails: ${data.details}`);
                        });
                    }
                  }}>Edit</button>
                )}
              </div>
              <p style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap', marginTop: '10px' }}>{selectedNote.mistakes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
