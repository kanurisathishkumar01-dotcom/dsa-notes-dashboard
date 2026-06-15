import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const dataFilePath = path.join(process.cwd(), 'src', 'data', 'revisions.json');

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (token && repo) {
    try {
      const url = `https://api.github.com/repos/${repo}/contents/src/data/revisions.json`;
      const res = await fetch(url, {
        headers: { 
          Authorization: `Bearer ${token}`, 
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'DSA-Tracker-App'
        },
        cache: 'no-store'
      });
      if (res.ok) {
        const fileData = await res.json();
        if (fileData.content) {
          const decoded = Buffer.from(fileData.content, 'base64').toString('utf8');
          return NextResponse.json(JSON.parse(decoded));
        }
      } else {
        console.error("GitHub API GET Revisions failed with status: " + res.status);
      }
    } catch (e) {
      console.error("Failed to fetch revisions from GitHub", e);
    }
  }

  // Fallback to local fs
  try {
    const data = await fs.readFile(dataFilePath, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({});
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await fs.writeFile(dataFilePath, JSON.stringify(body, null, 2), 'utf8');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save revisions' }, { status: 500 });
  }
}
