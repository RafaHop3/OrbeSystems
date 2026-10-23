import { NextResponse } from 'next/server';
import brokersData from '@/data/ghost_brokers.json';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const method = searchParams.get('method');
  const query = searchParams.get('q')?.toLowerCase();

  let filtered = [...brokersData];

  if (category && category !== 'all') {
    filtered = filtered.filter(b => b.category.toLowerCase() === category.toLowerCase());
  }

  if (method && method !== 'all') {
    filtered = filtered.filter(b => b.method.toLowerCase() === method.toLowerCase());
  }

  if (query) {
    filtered = filtered.filter(b => 
      b.name.toLowerCase().includes(query) || 
      b.domain.toLowerCase().includes(query) ||
      b.category.toLowerCase().includes(query)
    );
  }

  const byCategory: Record<string, number> = {};
  const byMethod: Record<string, number> = {};

  brokersData.forEach(b => {
    byCategory[b.category] = (byCategory[b.category] || 0) + 1;
    byMethod[b.method] = (byMethod[b.method] || 0) + 1;
  });

  return NextResponse.json({
    status: 'success',
    total: brokersData.length,
    matching: filtered.length,
    stats: {
      total_targets: brokersData.length,
      categories_count: Object.keys(byCategory).length,
      by_category: byCategory,
      by_method: byMethod,
      average_sla_days: 15
    },
    brokers: filtered
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    }
  });
}
