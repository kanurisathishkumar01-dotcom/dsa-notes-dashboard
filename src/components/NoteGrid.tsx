import React from 'react';
import { DSANote, RevisionData } from '../app/page';

interface NoteGridProps {
  filteredNotes: DSANote[];
  setSelectedNote: (note: DSANote | null) => void;
  setRevealedCode: (val: boolean) => void;
  setDrillStatus: (val: 'idle' | 'running' | 'paused') => void;
  setDrillSeconds: (val: number) => void;
  setShowOtherWays: (val: boolean) => void;
  setShowExplanation: (val: boolean) => void;
  setShowMistakes: (val: boolean) => void;
  revisionMap: Record<string, RevisionData>;
  isBlindMode: boolean;
}

export default function NoteGrid({
  filteredNotes,
  setSelectedNote,
  setRevealedCode,
  setDrillStatus,
  setDrillSeconds,
  setShowOtherWays,
  setShowExplanation,
  setShowMistakes,
  revisionMap,
  isBlindMode
}: NoteGridProps) {
  return (
    <>
      {filteredNotes.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 10px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Showing {filteredNotes.length} problems</span>
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
  );
}
