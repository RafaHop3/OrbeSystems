'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Activity, HardDrive, LogOut, Edit3, Save, X, Globe, Video, Image as ImageIcon, Search, Plus, CheckCircle2, AlertCircle, Crown } from 'lucide-react';
import type { Repository } from '@/types/repository';
import VisitorMonitor from '@/components/VisitorMonitor';
import FileUploader from '@/components/FileUploader';

/*
- [x] Install/Add Backend dependency (`cloudinary`)
- [x] Update `backend/config.py` with Cloudinary fields
- [x] Create `backend/services/upload_service.py`
- [x] Create `backend/routes/upload.py`
- [x] Integrate upload route in `backend/main.py`
- [x] Create Frontend `FileUploader` component
- [x] Integrate `FileUploader` into `app/admin/page.tsx`
- [ ] Verify upload flow to production CDN
*/

interface SystemStatus {
  status: string;
  shield: string;
  sys_info: {
    os: string;
    release: string;
    cpu_cores: number;
  };
  log: string[];
}

export type LookupResult = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
};

export default function AdminDashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [projects, setProjects] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    custom_description: '',
    image_url: '',
    video_url: '',
    deploy_url: '',
    is_premium_only: false
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<number | null>(null);

  // ── User Management state ─────────────────────────────────────────────────────
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'projects' | 'users'>('projects');
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'premium'>('user');
  const [creatingUser, setCreatingUser] = useState(false);

  // ── Inject Repo state ─────────────────────────────────────────────────────
  const [injectRepoName, setInjectRepoName]   = useState('');
  const [lookupResult, setLookupResult]       = useState<LookupResult | null>(null);
  const [lookupError, setLookupError]         = useState('');
  const [lookupLoading, setLookupLoading]     = useState(false);
  const [injectMeta, setInjectMeta]           = useState({ custom_description: '', image_url: '', deploy_url: '' });
  const [injectStatus, setInjectStatus]       = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [injectMsg, setInjectMsg]             = useState('');
  const router = useRouter();

  const rawUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://orbe-systems-api.onrender.com';
  const API_URL = rawUrl.trim().replace(/\/$/, '');

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('orbe_admin_token');
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch Status, Projects and Users in parallel
        const [statusRes, projectsRes, usersRes] = await Promise.all([
          fetch(`${API_URL}/api/admin/status`, { headers }),
          fetch(`${API_URL}/api/admin/projects`, { headers }),
          fetch(`${API_URL}/api/admin/users`, { headers })
        ]);

        if (statusRes.status === 401 || projectsRes.status === 401 || usersRes.status === 401) {
          localStorage.removeItem('orbe_admin_token');
          router.replace('/admin/login');
          return;
        }

        if (!statusRes.ok || !projectsRes.ok || !usersRes.ok) throw new Error('Systems Link Failure');

        const statusData = await statusRes.json();
        const projectsData = await projectsRes.json();
        const usersData = await usersRes.json();

        setStatus(statusData);
        setProjects(projectsData);
        setUsers(usersData.users || usersData);
      } catch (err) {
        console.error('Core data sync failed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, API_URL]);

  const handleLogout = () => {
    localStorage.removeItem('orbe_admin_token');
    router.push('/admin/login');
  };

  // ── User Management handlers ───────────────────────────────────────────────────
  const handleUpdateUserRole = async (userId: string, newRole: 'user' | 'premium') => {
    const token = localStorage.getItem('orbe_admin_token');
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!res.ok) throw new Error('Failed to update user role');

      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, role: newRole } : u
      ));
    } catch (err) {
      alert('Error updating user role.');
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    const token = localStorage.getItem('orbe_admin_token');
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to delete user');

      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      alert('Error deleting user.');
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      alert('Please fill in all fields');
      return;
    }

    if (newUserPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    setCreatingUser(true);
    const token = localStorage.getItem('orbe_admin_token');
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': 'csrf-token-placeholder'
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to create user');
      }

      const data = await res.json();
      setUsers(prev => [...prev, data.user]);
      setShowCreateUserForm(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('user');
      alert('User created successfully');
    } catch (err: any) {
      alert(err.message || 'Error creating user');
    } finally {
      setCreatingUser(false);
    }
  };

  const startEditing = (project: Repository) => {
    setEditingId(project.id);
    setEditForm({
      custom_description: project.custom_description || project.description || '',
      image_url: project.image_url || '',
      video_url: project.video_url || '',
      deploy_url: project.deploy_url || '',
      is_premium_only: project.is_premium_only || false
    });
  };

  const saveProject = async (id: number) => {
    setSaving(true);
    const token = localStorage.getItem('orbe_admin_token');
    try {
      // Only send fields that have actual values — empty strings are skipped
      // to avoid wiping existing DB values (backend also enforces this)
      const payload: Record<string, string | boolean> = {};
      if (editForm.custom_description) payload.custom_description = editForm.custom_description;
      if (editForm.image_url) payload.image_url = editForm.image_url;
      if (editForm.video_url) payload.video_url = editForm.video_url;
      if (editForm.deploy_url) payload.deploy_url = editForm.deploy_url;
      payload.is_premium_only = editForm.is_premium_only;

      const res = await fetch(`${API_URL}/api/admin/projects/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Update propagation failed');

      // Merge: only overwrite fields that were actually sent
      setProjects(prev => prev.map(p =>
        p.id === id ? { ...p, ...payload } : p
      ));
      setEditingId(null);
      setSaveSuccess(id);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      alert('Error updating project metadata.');
    } finally {
      setSaving(false);
    }
  };

  // ── Inject Repo handlers ────────────────────────────────────────────────
  const handleLookup = async () => {
    if (!injectRepoName.trim()) return;
    setLookupLoading(true);
    setLookupResult(null);
    setLookupError('');
    setInjectStatus('idle');
    const token = localStorage.getItem('orbe_admin_token');
    try {
      const res = await fetch(`${API_URL}/api/admin/repos/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ repo_name: injectRepoName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      setLookupResult(await res.json());
    } catch (e: unknown) {
      setLookupError(e instanceof Error ? e.message : String(e));
    } finally {
      setLookupLoading(false);
    }
  };

  const handleInject = async () => {
    if (!lookupResult) return;
    setInjectStatus('loading');
    const token = localStorage.getItem('orbe_admin_token');
    try {
      const res = await fetch(`${API_URL}/api/admin/repos/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          repo_id: lookupResult.id,
          repo_name: lookupResult.name,
          ...injectMeta,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setInjectStatus('success');
      setInjectMsg(data.message);
      // Reset form
      setInjectRepoName('');
      setLookupResult(null);
      setInjectMeta({ custom_description: '', image_url: '', deploy_url: '' });
    } catch (e: unknown) {
      setInjectStatus('error');
      setInjectMsg(e instanceof Error ? e.message : String(e));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-neon-green flex flex-col items-center justify-center font-mono gap-4">
        <Activity className="animate-spin-slow" />
        <span className="tracking-[0.5em] animate-pulse">ESTABLISHING SECURE CONNECTION_</span>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="min-h-screen bg-black text-neon-green p-4 md:p-8 relative overflow-hidden font-mono antialiased text-sm">
      {/* Scanline effect */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] z-50 opacity-40" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-neon-green/30 pb-6 mb-10 gap-6">
          <div>
            <div className="flex items-center gap-3">
              <Shield className="text-neon-cyan animate-pulse" />
              <h1 className="text-xl md:text-2xl font-bold tracking-[0.3em] uppercase">
                COMMAND CENTER <span className="text-neon-cyan/50 text-xs font-normal">v1.2.0</span>
              </h1>
            </div>
            <p className="text-[10px] text-neon-green/50 mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-ping" />
              ORBE SYSTEMS ACTIVE NODE // ENCRYPTED SESSION
            </p>
          </div>
          
          <button
            onClick={handleLogout}
            className="group flex items-center gap-2 text-[10px] border border-red-500/40 px-4 py-2 hover:bg-red-500/20 text-red-500/70 hover:text-red-500 transition-all uppercase tracking-widest"
          >
            <LogOut size={12} className="group-hover:rotate-12 transition-transform" /> TERMINATE SESSION
          </button>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-neon-green/20 pb-2">
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 text-[10px] uppercase tracking-wider transition-all ${
              activeTab === 'projects'
                ? 'text-neon-cyan border-b-2 border-neon-cyan'
                : 'text-neon-green/40 hover:text-neon-green'
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-[10px] uppercase tracking-wider transition-all ${
              activeTab === 'users'
                ? 'text-neon-cyan border-b-2 border-neon-cyan'
                : 'text-neon-green/40 hover:text-neon-green'
            }`}
          >
            Users ({users.length})
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Status Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="border border-neon-green/20 bg-neon-green/5 p-5">
              <h2 className="text-xs font-bold border-b border-neon-green/10 pb-3 mb-4 flex items-center gap-2 text-neon-cyan/80">
                <Activity size={14} /> CORE MONITOR
              </h2>
              <div className="space-y-4 text-[10px] uppercase tracking-tighter">
                <div className="flex justify-between">
                  <span className="text-neon-green/40">Status</span>
                  <span className="text-neon-green">{status.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neon-green/40">Firewall</span>
                  <span className="text-neon-cyan">{status.shield}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neon-green/40">Uptime</span>
                  <span className="font-bold underline">100.00%</span>
                </div>
              </div>
            </div>

            <div className="border border-neon-green/20 bg-neon-green/5 p-5">
              <h2 className="text-xs font-bold border-b border-neon-green/10 pb-3 mb-4 flex items-center gap-2 text-neon-cyan/80">
                <HardDrive size={14} /> HARDWARE
              </h2>
              <div className="space-y-4 text-[10px] uppercase tracking-tighter">
                <div className="flex justify-between">
                  <span className="text-neon-green/40">Kernel</span>
                  <span>{status.sys_info.os} {status.sys_info.release}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neon-green/40">Cores</span>
                  <span className="text-yellow-500">{status.sys_info.cpu_cores}</span>
                </div>
              </div>
            </div>

            {/* Visitor Tracking Node */}
            <VisitorMonitor />
          </div>

          {/* Project Manager Panel */}
          {activeTab === 'projects' && (
            <div className="lg:col-span-2 border border-neon-cyan/20 bg-neon-cyan/5 p-5">
              <h2 className="text-xs font-bold border-b border-neon-cyan/10 pb-3 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-neon-cyan uppercase">
                  <Globe size={14} /> PROJECT RECOGNITION & METADATA
                </div>
                <span className="text-[10px] text-neon-cyan/40 px-2 border border-neon-cyan/20 rounded">
                  {projects.length} RECORDS
                </span>
              </h2>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neon-cyan/20">
              {projects.map(project => (
                <div 
                  key={project.id} 
                  className={`border transition-all ${editingId === project.id ? 'border-neon-cyan bg-neon-cyan/10 shadow-[0_0_15px_rgba(0,255,245,0.1)]' : 'border-neon-green/10 hover:border-neon-cyan/40 bg-black/40'}`}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-wider flex items-center gap-2 italic">
                          <span className="text-neon-green">#</span> {project.name}
                        </h3>
                        <p className="text-[9px] text-neon-green/40 mt-1 uppercase">{project.full_name}</p>
                      </div>
                      
                      {editingId !== project.id ? (
                        <button 
                          onClick={() => startEditing(project)}
                          className="p-2 border border-neon-cyan/30 text-neon-cyan/60 hover:text-neon-cyan hover:border-neon-cyan transition-all"
                        >
                          <Edit3 size={12} />
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => saveProject(project.id)}
                            disabled={saving}
                            className="p-2 border border-neon-green/50 text-neon-green/70 hover:text-neon-green hover:border-neon-green transition-all"
                          >
                            <Save size={12} />
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="p-2 border border-red-500/50 text-red-500/70 hover:text-red-500 hover:border-red-500 transition-all"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {editingId === project.id ? (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="space-y-1">
                          <label className="text-[9px] text-neon-cyan/60 uppercase">Custom Description</label>
                          <textarea 
                            className="w-full bg-black/60 border border-neon-cyan/30 p-2 text-xs text-neon-cyan focus:outline-none focus:border-neon-cyan min-h-[80px]"
                            value={editForm.custom_description}
                            onChange={e => setEditForm({...editForm, custom_description: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="flex justify-between items-end mb-1">
                              <label className="text-[9px] text-neon-cyan/60 uppercase flex items-center gap-2">
                                <ImageIcon size={10} /> Image URL
                              </label>
                              <FileUploader 
                                onUploadComplete={(url) => setEditForm({...editForm, image_url: url})} 
                                label="IMG_UPLINK"
                                accept="image/*"
                              />
                            </div>
                            <input 
                              type="text"
                              className="w-full bg-black/60 border border-neon-cyan/30 p-2 text-[10px] text-neon-cyan focus:outline-none focus:border-neon-cyan"
                              value={editForm.image_url}
                              onChange={e => setEditForm({...editForm, image_url: e.target.value})}
                              placeholder="https://..."
                            />
                            {/* Live image preview */}
                            {editForm.image_url && (
                              <img
                                src={editForm.image_url}
                                alt="preview"
                                className="mt-1 w-full h-20 object-cover border border-neon-cyan/20 bg-black/40"
                                onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }}
                                onLoad={(e) => { (e.target as HTMLImageElement).style.display='block'; }}
                              />
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-end mb-1">
                              <label className="text-[9px] text-neon-cyan/60 uppercase flex items-center gap-2">
                                <Video size={10} /> Video URL (MP4)
                              </label>
                              <FileUploader 
                                onUploadComplete={(url) => setEditForm({...editForm, video_url: url})} 
                                label="VID_UPLINK"
                                accept="video/*"
                              />
                            </div>
                            <input 
                              type="text"
                              className="w-full bg-black/60 border border-neon-cyan/30 p-2 text-[10px] text-neon-cyan focus:outline-none focus:border-neon-cyan"
                              value={editForm.video_url}
                              onChange={e => setEditForm({...editForm, video_url: e.target.value})}
                              placeholder="https://..."
                            />
                          </div>
                        </div>

                        {/* Production Link Input */}
                        <div className="space-y-1">
                          <label className="text-[9px] text-neon-purple/70 uppercase flex items-center gap-2">
                             <Globe size={10} /> Production URL (Deploy)
                          </label>
                          <input
                            type="text"
                            className="w-full bg-black/60 border border-neon-purple/30 p-2 text-[10px] text-neon-purple focus:outline-none focus:border-neon-purple"
                            value={editForm.deploy_url}
                            onChange={e => setEditForm({...editForm, deploy_url: e.target.value})}
                            placeholder="https://sua-app-live.com"
                          />
                        </div>

                        {/* Premium-only Toggle */}
                        <div className="flex items-center justify-between p-3 border border-neon-purple/30 bg-neon-purple/5 rounded">
                          <label className="text-[9px] text-neon-purple/70 uppercase flex items-center gap-2 cursor-pointer">
                            <Crown size={12} /> Premium Exclusive
                          </label>
                          <input
                            type="checkbox"
                            checked={editForm.is_premium_only}
                            onChange={e => setEditForm({...editForm, is_premium_only: e.target.checked})}
                            className="w-4 h-4 accent-neon-purple cursor-pointer"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <p className="text-[10px] text-neon-green/70 leading-relaxed italic border-l border-neon-green/20 pl-3 line-clamp-3">
                          {project.custom_description || project.description || '# NO METADATA AVAILABLE'}
                        </p>
                        <div className="space-y-2">
                          {/* Image preview thumbnail */}
                          {project.image_url && (
                            <div className="flex items-start gap-2">
                              <img
                                src={project.image_url}
                                alt={`${project.name} preview`}
                                className="w-16 h-10 object-cover border border-neon-cyan/30 bg-black"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                              <span className="flex items-center gap-1 text-neon-cyan border border-neon-cyan/20 px-2 py-0.5 rounded-full bg-neon-cyan/5 text-[10px]">
                                <ImageIcon size={10}/> Visual
                              </span>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 items-center text-[10px]">
                            {project.video_url && <span className="flex items-center gap-1 text-neon-purple border border-neon-purple/20 px-2 py-0.5 rounded-full bg-neon-purple/5"><Video size={10}/> Motion</span>}
                            {project.deploy_url && (
                              <a
                                href={project.deploy_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-neon-purple border border-neon-purple/50 px-2 py-0.5 rounded-full bg-neon-purple/20 font-bold tracking-tighter hover:bg-neon-purple/40 transition-colors"
                                title={project.deploy_url}
                              >
                                <Globe size={10}/> LIVE ↗
                              </a>
                            )}
                            {saveSuccess === project.id && (
                              <span className="flex items-center gap-1 text-neon-green border border-neon-green/30 px-2 py-0.5 rounded-full bg-neon-green/5 animate-pulse">
                                <CheckCircle2 size={10}/> SAVED
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>

        {/* ── INJECT REPO Panel ──────────────────────────────────── */}
        {activeTab === 'projects' && (
        <div className="mt-6 border border-neon-purple/30 bg-neon-purple/5 p-5">
          <h2 className="text-xs font-bold border-b border-neon-purple/10 pb-3 mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-neon-purple uppercase">
              <Plus size={14} /> INJECT REPO
            </div>
            <span className="text-[10px] text-neon-purple/40 px-2 border border-neon-purple/20 rounded">
              theorbesystems-sketch/...
            </span>
          </h2>

          {/* Input row */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 flex items-center border border-neon-purple/30 bg-black/60">
              <span className="px-3 text-neon-purple/40 text-[10px] font-mono select-none">~/</span>
              <input
                id="inject-repo-input"
                type="text"
                placeholder="nome-do-repositorio"
                value={injectRepoName}
                onChange={e => { setInjectRepoName(e.target.value); setLookupResult(null); setLookupError(''); setInjectStatus('idle'); }}
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
                className="flex-1 bg-transparent py-2 pr-3 text-[11px] text-neon-purple font-mono focus:outline-none placeholder:text-neon-purple/20"
              />
            </div>
            <button
              id="inject-lookup-btn"
              onClick={handleLookup}
              disabled={lookupLoading || !injectRepoName.trim()}
              className="flex items-center gap-2 px-4 py-2 border border-neon-purple/50 text-neon-purple/80 text-[10px] uppercase tracking-widest hover:bg-neon-purple/20 hover:text-neon-purple hover:border-neon-purple transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {lookupLoading
                ? <span className="animate-spin inline-block w-3 h-3 border border-neon-purple border-t-transparent rounded-full" />
                : <Search size={12} />}
              LOOKUP
            </button>
          </div>

          {/* Lookup error */}
          {lookupError && (
            <div className="flex items-center gap-2 text-red-400 text-[10px] font-mono mb-4 border border-red-500/20 bg-red-500/5 px-3 py-2">
              <AlertCircle size={12} />
              {lookupError}
            </div>
          )}

          {/* Preview card */}
          {lookupResult && (
            <div className="border border-neon-purple/40 bg-black/40 p-4 mb-4 space-y-4 animate-in fade-in duration-300">
              {/* Repo header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-bold text-sm tracking-wide">
                    <span className="text-neon-purple/50">#</span> {lookupResult.name}
                  </p>
                  <p className="text-[9px] text-neon-purple/40 mt-0.5 uppercase">{lookupResult.full_name}</p>
                </div>
                <div className="flex gap-3 text-[10px] text-neon-purple/60 font-mono">
                  {lookupResult.language && <span>{lookupResult.language}</span>}
                  <span>★ {lookupResult.stargazers_count}</span>
                  <span>⑂ {lookupResult.forks_count}</span>
                </div>
              </div>
              {lookupResult.description && (
                <p className="text-[10px] text-neon-green/70 italic border-l border-neon-green/20 pl-3">
                  {lookupResult.description}
                </p>
              )}

              {/* Optional metadata */}
              <div className="space-y-3 pt-2 border-t border-neon-purple/10">
                <p className="text-[9px] text-neon-purple/50 uppercase tracking-widest">Metadata opcional</p>
                <textarea
                  placeholder="Custom description (opcional)"
                  value={injectMeta.custom_description}
                  onChange={e => setInjectMeta(m => ({ ...m, custom_description: e.target.value }))}
                  className="w-full bg-black/60 border border-neon-purple/20 p-2 text-[10px] text-neon-purple font-mono focus:outline-none focus:border-neon-purple min-h-[56px] resize-none placeholder:text-neon-purple/20"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Image URL (opcional)"
                    value={injectMeta.image_url}
                    onChange={e => setInjectMeta(m => ({ ...m, image_url: e.target.value }))}
                    className="bg-black/60 border border-neon-purple/20 p-2 text-[10px] text-neon-purple font-mono focus:outline-none focus:border-neon-purple placeholder:text-neon-purple/20"
                  />
                  <input
                    type="text"
                    placeholder="Deploy URL (opcional)"
                    value={injectMeta.deploy_url}
                    onChange={e => setInjectMeta(m => ({ ...m, deploy_url: e.target.value }))}
                    className="bg-black/60 border border-neon-purple/20 p-2 text-[10px] text-neon-purple font-mono focus:outline-none focus:border-neon-purple placeholder:text-neon-purple/20"
                  />
                </div>
              </div>

              {/* Inject button */}
              <button
                id="inject-confirm-btn"
                onClick={handleInject}
                disabled={injectStatus === 'loading'}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-neon-purple text-neon-purple text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-neon-purple hover:text-black transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {injectStatus === 'loading'
                  ? <span className="animate-spin inline-block w-3 h-3 border border-current border-t-transparent rounded-full" />
                  : <Plus size={12} />}
                INJECT AS FEATURED
              </button>
            </div>
          )}

          {/* Feedback */}
          {injectStatus === 'success' && (
            <div className="flex items-center gap-2 text-neon-green text-[10px] font-mono border border-neon-green/30 bg-neon-green/5 px-3 py-2">
              <CheckCircle2 size={12} /> {injectMsg}
            </div>
          )}
          {injectStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-400 text-[10px] font-mono border border-red-500/20 bg-red-500/5 px-3 py-2">
              <AlertCircle size={12} /> {injectMsg}
            </div>
          )}
        </div>
        )}

        {/* User Management Panel */}
        {activeTab === 'users' && (
          <div className="lg:col-span-2 border border-neon-purple/20 bg-neon-purple/5 p-5">
            <h2 className="text-xs font-bold border-b border-neon-purple/10 pb-3 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-neon-purple uppercase">
                <Crown size={14} /> USER MANAGEMENT
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-neon-purple/40 px-2 border border-neon-purple/20 rounded">
                  {users.length} USERS
                </span>
                <button
                  onClick={() => setShowCreateUserForm(!showCreateUserForm)}
                  className="text-[10px] text-neon-purple hover:text-white transition-colors"
                >
                  + Create User
                </button>
              </div>
            </h2>

            {showCreateUserForm && (
              <div className="mb-6 p-4 border border-neon-purple/30 bg-black/40 animate-in fade-in duration-300">
                <h3 className="text-xs font-bold text-neon-purple mb-4">CREATE NEW USER</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] text-neon-purple/60 uppercase block mb-1">Email</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full bg-black/60 border border-neon-purple/30 p-2 text-xs text-neon-purple focus:outline-none focus:border-neon-purple"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-neon-purple/60 uppercase block mb-1">Password (min 8 chars)</label>
                    <input
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full bg-black/60 border border-neon-purple/30 p-2 text-xs text-neon-purple focus:outline-none focus:border-neon-purple"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-neon-purple/60 uppercase block mb-1">Role</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as 'user' | 'premium')}
                      className="w-full bg-black/60 border border-neon-purple/30 p-2 text-xs text-neon-purple focus:outline-none focus:border-neon-purple"
                    >
                      <option value="user">User</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleCreateUser}
                      disabled={creatingUser}
                      className="flex-1 border border-neon-purple/50 text-neon-purple py-2 text-[10px] uppercase tracking-wider hover:bg-neon-purple/10 transition-colors disabled:opacity-50"
                    >
                      {creatingUser ? 'Creating...' : 'Create User'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateUserForm(false);
                        setNewUserEmail('');
                        setNewUserPassword('');
                        setNewUserRole('user');
                      }}
                      className="flex-1 border border-red-500/30 text-red-500/70 py-2 text-[10px] uppercase tracking-wider hover:bg-red-500/10 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neon-purple/20">
              {users.map(user => (
                <div
                  key={user.id}
                  className="border border-neon-purple/10 bg-black/40 p-4 hover:border-neon-purple/30 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-sm font-bold text-white">{user.email}</h3>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full ${
                          user.role === 'premium'
                            ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                            : 'bg-neon-green/20 text-neon-green border border-neon-green/30'
                        }`}>
                          {user.role.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[9px] text-neon-purple/40 space-y-1">
                        <div>ID: {user.id}</div>
                        <div>Status: {user.subscription_status}</div>
                        <div>Created: {new Date(user.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {user.role === 'user' ? (
                        <button
                          onClick={() => handleUpdateUserRole(user.id, 'premium')}
                          className="p-2 border border-neon-purple/30 text-neon-purple/60 hover:text-neon-purple hover:border-neon-purple transition-all"
                          title="Promote to Premium"
                        >
                          <Crown size={12} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateUserRole(user.id, 'user')}
                          className="p-2 border border-neon-green/30 text-neon-green/60 hover:text-neon-green hover:border-neon-green transition-all"
                          title="Demote to User"
                        >
                          <AlertCircle size={12} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 border border-red-500/30 text-red-500/60 hover:text-red-500 hover:border-red-500 transition-all"
                        title="Delete User"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Console Footprint */}
        <div className="mt-6 border border-neon-green/20 bg-black/40 p-5">
          <h2 className="text-[10px] font-bold text-neon-green/60 mb-4 tracking-widest uppercase">System Initialization Logs</h2>
          <div className="text-[9px] space-y-1.5 font-mono opacity-60 max-h-[100px] overflow-y-auto">
            {status.log.map((logStr, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-neon-green/30">[{new Date().toLocaleTimeString()}]</span>
                <span className="text-neon-green/70">SYNC</span>
                <span>{logStr}</span>
              </div>
            ))}
            <div className="animate-pulse text-neon-green">READY_</div>
          </div>
        </div>
      </div>
    </div>
  );
}
