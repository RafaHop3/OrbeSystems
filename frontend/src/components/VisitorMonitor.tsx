'use client';

import { useState, useEffect } from 'react';
import { Activity, Globe, Monitor, MapPin, Clock, Server } from 'lucide-react';

interface Visit {
  id: string;
  ip: string;
  city: string;
  region: string;
  country: string;
  isp: string;
  ua: string;
  path: string;
  timestamp: string;
}

export default function VisitorMonitor() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVisits = async () => {
    try {
      const token = localStorage.getItem('orbe_admin_token');
      const rawUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://orbe-systems-api.onrender.com';
      const API_URL = rawUrl.trim().replace(/\/$/, '');
      
      const res = await fetch(`${API_URL}/api/analytics/list`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setVisits(data.visits || []);
      }
    } catch (err) {
      console.error("Failed to fetch visits:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
    const interval = setInterval(fetchVisits, 10000); // Poll every 10s for real-time feel
    return () => clearInterval(interval);
  }, []);

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return "--:--:--";
    }
  };

  // Helper to simplify User Agent
  const simplifyUA = (ua: string) => {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Macintosh')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Other';
  };

  return (
    <div className="border border-neon-green/20 bg-neon-green/5 p-5 flex flex-col h-full overflow-hidden">
        <h2 className="text-xs font-bold border-b border-neon-green/10 pb-3 mb-4 flex items-center justify-between text-neon-cyan/80">
            <div className="flex items-center gap-2 uppercase tracking-widest">
                <Activity size={14} className="animate-pulse" /> NETWORK TRAFFIC
            </div>
            <span className="text-[9px] bg-neon-green/10 px-2 py-0.5 rounded animate-pulse">LIVE</span>
        </h2>

        <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 scrollbar-thin scrollbar-thumb-neon-green/20">
            {loading && visits.length === 0 ? (
                <div className="text-neon-green/40 text-[10px] animate-pulse py-4 italic">Interrogating network packets...</div>
            ) : visits.length === 0 ? (
                <div className="text-neon-green/40 text-[10px] py-4 italic border border-dashed border-neon-green/10 text-center">No active signals detected.</div>
            ) : (
                visits.map((visit) => (
                    <div key={visit.id} className="border border-neon-green/5 bg-black/40 p-3 hover:bg-neon-green/5 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold text-neon-green flex items-center gap-1.5 leading-none">
                                <Clock size={10} className="text-neon-green/40" />
                                {formatDate(visit.timestamp)}
                            </span>
                            <span className="text-[9px] text-neon-green/30 font-mono tracking-tighter">
                                ID_{visit.id}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-2">
                             <div className="flex items-center gap-1.5 text-[10px] text-neon-green/80">
                                <MapPin size={10} className="text-neon-cyan" />
                                <span className="truncate">{visit.city}, {visit.country}</span>
                             </div>
                             <div className="flex items-center gap-1.5 text-[10px] text-neon-green/80">
                                <Monitor size={10} className="text-neon-cyan" />
                                <span>{simplifyUA(visit.ua)}</span>
                             </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[9px] text-neon-green/40 border-t border-neon-green/5 pt-2">
                            <Server size={10} />
                            <span className="truncate opacity-60">{visit.isp}</span>
                            <span className="ml-auto text-neon-cyan/40 text-[8px] italic">{visit.ip}</span>
                        </div>
                    </div>
                ))
            )}
        </div>

        <div className="mt-4 pt-3 border-t border-neon-green/10 flex justify-between items-center text-[8px] text-neon-green/30 uppercase tracking-[0.2em]">
            <span>ORBE ANALYTICS v1.0</span>
            <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-ping" />
                DDoS Shield Active
            </span>
        </div>
    </div>
  );
}
