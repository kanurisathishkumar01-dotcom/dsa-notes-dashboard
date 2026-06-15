import React, { useState } from 'react';
import { DSANote } from '../app/page';
import { apiSync } from '@/utils/apiSync';

interface AddNoteModalProps {
  onClose: () => void;
  onAddNote: (newNote: DSANote) => void;
}

export default function AddNoteModal({ onClose, onAddNote }: AddNoteModalProps) {
  const [title, setTitle] = useState('');
  const [problemUrl, setProblemUrl] = useState('');
  const [tags, setTags] = useState('');
  const [problemLogic, setProblemLogic] = useState('');
  const [mistakes, setMistakes] = useState('');
  const [code, setCode] = useState('');
  const [timeComplexity, setTimeComplexity] = useState('O(N)');
  const [spaceComplexity, setSpaceComplexity] = useState('O(1)');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [altTitle, setAltTitle] = useState('');
  const [altLogic, setAltLogic] = useState('');
  const [altCode, setAltCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !code) return alert("Title and Code are required.");
    setIsSubmitting(true);

    const otherWays = [];
    if (altTitle && altCode) {
      otherWays.push({
        id: Date.now().toString() + '_alt',
        title: altTitle,
        logic: altLogic,
        code: altCode,
        complexity: { time: 'O(N)', space: 'O(1)' } // Defaulting, can be customized later
      });
    }

    const newNote: DSANote = {
      id: Date.now().toString(),
      title,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      problemLogic,
      mistakes,
      code,
      complexity: { time: timeComplexity, space: spaceComplexity },
      dateAdded: new Date().toISOString().split('T')[0],
      otherWays,
      ...(problemUrl ? { problemUrl } : {})
    };

    try {
      const res = await apiSync('ADD_NOTE', newNote);
      const data = await res.json();
      if (data.success) {
        onAddNote(newNote);
        alert("Note added successfully!");
        onClose();
      } else {
        alert(`Error: ${data.error}\nDetails: ${data.details}`);
      }
    } catch (err: any) {
      alert("Network Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="detail-view" style={{ padding: 0, border: 'none', background: 'transparent' }}>
      <div className="sticky-header-container" style={{ position: 'sticky', top: 0, zIndex: 100, padding: '20px', background: 'var(--bg-color)', borderBottom: '1px solid var(--panel-border)' }}>
        <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Back
        </button>
        <h2 style={{ fontSize: '1.8rem', margin: '10px 0 0', textShadow: '0 0 10px var(--accent-glow)' }}>Add New Problem</h2>
      </div>

      <div style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '800px', margin: '0 auto' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Problem Title *</label>
            <input type="text" className="btn" style={{ width: '100%', padding: '10px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)' }} value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Two Sum" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Problem URL (Optional)</label>
            <input type="url" className="btn" style={{ width: '100%', padding: '10px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)' }} value={problemUrl} onChange={e => setProblemUrl(e.target.value)} placeholder="https://leetcode.com/problems/..." />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Tags (Comma separated)</label>
            <input type="text" className="btn" style={{ width: '100%', padding: '10px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)' }} value={tags} onChange={e => setTags(e.target.value)} placeholder="Arrays, Hash Map, Two Pointers" />
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Time Complexity</label>
              <input type="text" className="btn" style={{ width: '100%', padding: '10px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)' }} value={timeComplexity} onChange={e => setTimeComplexity(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Space Complexity</label>
              <input type="text" className="btn" style={{ width: '100%', padding: '10px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)' }} value={spaceComplexity} onChange={e => setSpaceComplexity(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Problem Logic & Notes</label>
            <textarea className="btn" style={{ width: '100%', minHeight: '100px', padding: '10px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', resize: 'vertical' }} value={problemLogic} onChange={e => setProblemLogic(e.target.value)} placeholder="Explain your approach..." />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Mistakes to Avoid</label>
            <textarea className="btn" style={{ width: '100%', minHeight: '80px', padding: '10px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', resize: 'vertical' }} value={mistakes} onChange={e => setMistakes(e.target.value)} placeholder="What did you do wrong the first time?" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Main Code Solution *</label>
            <textarea className="btn code-block" style={{ width: '100%', minHeight: '200px', padding: '10px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre', overflowX: 'auto' }} value={code} onChange={e => setCode(e.target.value)} required placeholder="Paste your code here..." spellCheck={false} />
          </div>

          <div style={{ marginTop: '20px', padding: '15px', border: '1px dashed var(--panel-border)', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 15px', color: 'var(--accent)' }}>Alternative Approach (Optional)</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Alternative Title</label>
              <input type="text" className="btn" style={{ width: '100%', padding: '10px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)' }} value={altTitle} onChange={e => setAltTitle(e.target.value)} placeholder="e.g. Optimized Hash Map Approach" />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Alternative Logic</label>
              <textarea className="btn" style={{ width: '100%', minHeight: '60px', padding: '10px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', resize: 'vertical' }} value={altLogic} onChange={e => setAltLogic(e.target.value)} placeholder="Explain the alternate logic..." />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Alternative Code</label>
              <textarea className="btn code-block" style={{ width: '100%', minHeight: '150px', padding: '10px', background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre', overflowX: 'auto' }} value={altCode} onChange={e => setAltCode(e.target.value)} placeholder="Paste alternate code here..." spellCheck={false} />
            </div>
          </div>

          <button type="submit" className="btn" style={{ background: 'var(--success)', color: '#000', fontWeight: 'bold', padding: '15px', fontSize: '1.1rem', marginTop: '10px', marginBottom: '40px' }} disabled={isSubmitting}>
            {isSubmitting ? 'Saving to GitHub...' : 'Save New Problem'}
          </button>
        </form>
      </div>
    </div>
  );
}
