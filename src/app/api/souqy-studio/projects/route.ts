import { NextResponse } from 'next/server';
import { loadSouqyStudioProjects } from '@/app/actions/souqyStudio';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const result = await loadSouqyStudioProjects();
    return NextResponse.json(result, { status: result.status === 'success' ? 200 : 404 });
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        message: err instanceof Error ? err.message : 'Could not load Souqy Studio projects.',
      },
      { status: 500 },
    );
  }
}
