import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { action, payload } = await request.json();
    
    // Security: Check if ADMIN_SECRET is set and matches the Authorization header
    const adminSecret = process.env.ADMIN_SECRET;
    if (adminSecret && request.headers.get('Authorization') !== adminSecret) {
      return NextResponse.json({ success: false, error: 'Unauthorized', details: 'Invalid or missing ADMIN_SECRET' }, { status: 401 });
    }
    
    // Read from Vercel Environment Variables securely
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO; // Format: "username/repo-name"

    if (action === 'VERIFY_SECRET') {
      return NextResponse.json({ success: true, message: 'Valid secret' });
    }

    if (!token || !repo) {
      if (process.env.NODE_ENV === 'development') {
        return handleLocalDevelopment(action, payload);
      }
      return NextResponse.json({ 
        error: 'Missing GitHub credentials in .env', 
        details: `GITHUB_TOKEN: ${!!token}, GITHUB_REPO: ${!!repo}` 
      }, { status: 500 });
    }

    let filePath = '';
    if (action === 'ADD_NOTE' || action === 'ADD_ALTERNATE_WAY' || action === 'UPDATE_NOTE_FIELD' || action === 'REMOVE_ALTERNATE_WAY' || action === 'OVERWRITE_NOTES') filePath = 'src/data/notes.json';
    else if (action === 'UPDATE_REVISIONS') filePath = 'src/data/revisions.json';
    else if (action === 'ADD_FRIEND' || action === 'REMOVE_FRIEND' || action === 'OVERWRITE_FRIENDS') filePath = 'src/data/friends.json';
    else return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;

    // Step 1: Fetch current file to get SHA
    const getRes = await fetch(apiUrl, {
      headers: { 
        Authorization: `Bearer ${token}`, 
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DSA-Tracker-App'
      },
      cache: 'no-store'
    });

    if (!getRes.ok && getRes.status !== 404) {
      const getErr = await getRes.text();
      return NextResponse.json({ error: `GitHub GET Failed (${getRes.status})`, details: getErr }, { status: 500 });
    }

    let sha = undefined;
    let currentData: any = filePath.endsWith('.json') ? (filePath === 'src/data/notes.json' ? [] : {}) : null;

    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
      if (fileData.content) {
        const decoded = Buffer.from(fileData.content, 'base64').toString('utf8');
        try {
          currentData = JSON.parse(decoded);
        } catch (e) {
          console.error("Failed to parse existing JSON from GitHub");
        }
      }
    }

    // Step 2: Apply payload modification
    let newContentString = '';
    if (action === 'ADD_ALTERNATE_WAY') {
      const { noteId, alternateWay } = payload;
      const noteIndex = currentData.findIndex((n: any) => n.id === noteId);
      if (noteIndex === -1) return NextResponse.json({ error: 'Note not found in GitHub file' }, { status: 404 });
      if (!currentData[noteIndex].otherWays) currentData[noteIndex].otherWays = [];
      currentData[noteIndex].otherWays.push(alternateWay);
      newContentString = JSON.stringify(currentData, null, 2);
    } else if (action === 'ADD_NOTE') {
      if (!Array.isArray(currentData)) currentData = [];
      currentData.push(payload);
      newContentString = JSON.stringify(currentData, null, 2);
    } else if (action === 'UPDATE_NOTE_FIELD') {
      const { noteId, field, value } = payload;
      const noteIndex = currentData.findIndex((n: any) => n.id === noteId);
      if (noteIndex === -1) return NextResponse.json({ error: 'Note not found in GitHub file' }, { status: 404 });
      currentData[noteIndex][field] = value;
      newContentString = JSON.stringify(currentData, null, 2);
    } else if (action === 'ADD_FRIEND') {
      if (!Array.isArray(currentData)) currentData = [];
      currentData.push(payload);
      newContentString = JSON.stringify(currentData, null, 2);
    } else if (action === 'REMOVE_FRIEND') {
      const { name } = payload;
      if (Array.isArray(currentData)) {
        currentData = currentData.filter((f: any) => f.name !== name);
      }
      newContentString = JSON.stringify(currentData, null, 2);
    } else if (action === 'REMOVE_ALTERNATE_WAY') {
      const { noteId, altId } = payload;
      const noteIndex = currentData.findIndex((n: any) => n.id === noteId);
      if (noteIndex !== -1 && currentData[noteIndex].otherWays) {
        currentData[noteIndex].otherWays = currentData[noteIndex].otherWays.filter((w: any) => w.id !== altId);
      }
      newContentString = JSON.stringify(currentData, null, 2);
    } else if (action === 'UPDATE_REVISIONS' || action === 'OVERWRITE_NOTES' || action === 'OVERWRITE_FRIENDS') {
      currentData = payload;
      newContentString = JSON.stringify(currentData, null, 2);
    }

    // Step 3: Push back to GitHub
    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: { 
        Authorization: `Bearer ${token}`, 
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DSA-Tracker-App'
      },
      body: JSON.stringify({
        message: `API Sync: ${action}` + (action === 'UPDATE_REVISIONS' ? ' [skip ci]' : ''),
        content: Buffer.from(newContentString).toString('base64'),
        sha 
      })
    });

    if (!putRes.ok) {
      const putErr = await putRes.text();
      return NextResponse.json({ error: `GitHub PUT Failed (${putRes.status})`, details: putErr }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Successfully pushed to GitHub!' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server Crash', details: String(error) }, { status: 500 });
  }
}

// Fallback for local development
async function handleLocalDevelopment(action: string, payload: any) {
  const fs = require('fs/promises');
  const path = require('path');
  
  if (action === 'ADD_ALTERNATE_WAY') {
    const { noteId, alternateWay } = payload;
    const notesPath = path.join(process.cwd(), 'src', 'data', 'notes.json');
    const data = JSON.parse(await fs.readFile(notesPath, 'utf8'));
    const noteIndex = data.findIndex((n: any) => n.id === noteId);
    if (noteIndex !== -1) {
      if (!data[noteIndex].otherWays) data[noteIndex].otherWays = [];
      data[noteIndex].otherWays.push(alternateWay);
      await fs.writeFile(notesPath, JSON.stringify(data, null, 2));
    }
  } else if (action === 'ADD_NOTE') {
    const notesPath = path.join(process.cwd(), 'src', 'data', 'notes.json');
    const data = JSON.parse(await fs.readFile(notesPath, 'utf8'));
    data.push(payload);
    await fs.writeFile(notesPath, JSON.stringify(data, null, 2));
  } else if (action === 'UPDATE_NOTE_FIELD') {
    const { noteId, field, value } = payload;
    const notesPath = path.join(process.cwd(), 'src', 'data', 'notes.json');
    const data = JSON.parse(await fs.readFile(notesPath, 'utf8'));
    const noteIndex = data.findIndex((n: any) => n.id === noteId);
    if (noteIndex !== -1) {
      data[noteIndex][field] = value;
      await fs.writeFile(notesPath, JSON.stringify(data, null, 2));
    }
  } else if (action === 'ADD_FRIEND') {
    const friendsPath = path.join(process.cwd(), 'src', 'data', 'friends.json');
    const data = JSON.parse(await fs.readFile(friendsPath, 'utf8'));
    data.push(payload);
    await fs.writeFile(friendsPath, JSON.stringify(data, null, 2));
  } else if (action === 'REMOVE_FRIEND') {
    const friendsPath = path.join(process.cwd(), 'src', 'data', 'friends.json');
    let data = JSON.parse(await fs.readFile(friendsPath, 'utf8'));
    data = data.filter((f: any) => f.name !== payload.name);
    await fs.writeFile(friendsPath, JSON.stringify(data, null, 2));
  } else if (action === 'REMOVE_ALTERNATE_WAY') {
    const { noteId, altId } = payload;
    const notesPath = path.join(process.cwd(), 'src', 'data', 'notes.json');
    const data = JSON.parse(await fs.readFile(notesPath, 'utf8'));
    const noteIndex = data.findIndex((n: any) => n.id === noteId);
    if (noteIndex !== -1 && data[noteIndex].otherWays) {
      data[noteIndex].otherWays = data[noteIndex].otherWays.filter((w: any) => w.id !== altId);
      await fs.writeFile(notesPath, JSON.stringify(data, null, 2));
    }
  } else if (action === 'UPDATE_REVISIONS') {
    const revPath = path.join(process.cwd(), 'src', 'data', 'revisions.json');
    await fs.writeFile(revPath, JSON.stringify(payload, null, 2));
  }
  return NextResponse.json({ success: true, message: 'Saved locally' });
}
