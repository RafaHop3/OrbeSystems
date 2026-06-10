import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const url = `${API_BASE_URL.replace(/\/$/, '')}/health`;
    console.log(`[KeepAlive] Pingando backend externo em: ${url}`);
    
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'OrbeSystems-KeepAlive-Robot'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      backend_response: data
    });
  } catch (error: any) {
    console.error('[KeepAlive] Erro ao pingar backend:', error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
