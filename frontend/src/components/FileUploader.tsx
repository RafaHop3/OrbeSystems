'use client';

import { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface FileUploaderProps {
  onUploadComplete: (url: string) => void;
  label?: string;
  accept?: string;
}

/**
 * FileUploader: Handle direct uploads from the PC to Cloudinary via our Backend.
 * Styles follow the Orbe Systems Cyberpunk design language.
 */
export default function FileUploader({ 
  onUploadComplete, 
  label = "UPLINK FILE", 
  accept = "image/*,video/*" 
}: FileUploaderProps) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('uploading');
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('orbe_admin_token');
    const rawUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://orbe-systems-api.onrender.com';
    const API_URL = rawUrl.trim().replace(/\/$/, '');

    try {
      const response = await fetch(`${API_URL}/api/admin/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Upload rejected:", errorData);
        throw new Error('Uplink data rejected by remote node.');
      }

      const data = await response.json();
      
      // Notify parent to update the URL field
      onUploadComplete(data.url);
      
      setStatus('success');
      // Visual feedback reset after success
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error("CRITICAL_UPLINK_ERROR:", err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    } finally {
      // Clear the input so the same file can be uploaded again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative inline-block">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept={accept}
        onChange={handleUpload}
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={status === 'uploading'}
        className={`flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.2em] px-4 py-2 border transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.5)]
          ${status === 'idle' ? 'border-neon-cyan/40 text-neon-cyan/70 hover:bg-neon-cyan/10 hover:border-neon-cyan hover:shadow-[0_0_10px_rgba(0,255,245,0.2)]' : ''}
          ${status === 'uploading' ? 'border-yellow-500/40 text-yellow-500/70 bg-yellow-500/5 cursor-wait animate-pulse' : ''}
          ${status === 'success' ? 'border-neon-green/40 text-neon-green bg-neon-green/10 shadow-[0_0_10px_rgba(57,255,20,0.2)]' : ''}
          ${status === 'error' ? 'border-red-500/40 text-red-500 bg-red-500/10' : ''}
        `}
      >
        {status === 'idle' && <><UploadCloud size={12} /> {label}</>}
        {status === 'uploading' && <><Loader2 size={12} className="animate-spin" /> ESTABLISHING_UPLINK...</>}
        {status === 'success' && <><CheckCircle size={12} /> SYNC_COMPLETE</>}
        {status === 'error' && <><AlertCircle size={12} /> NODE_REJECTED</>}
      </button>
    </div>
  );
}
