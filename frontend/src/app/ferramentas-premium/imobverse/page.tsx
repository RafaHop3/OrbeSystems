'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  Building2, MapPin, DollarSign, Star, Search, Filter, Eye,
  Phone, Mail, User, MessageSquare, CheckCircle, AlertTriangle,
  Plus, Home, List, ChevronRight, Loader2, Lock, Crown, Camera,
  ShieldCheck, TrendingUp, X, Send, ChevronDown
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { API_BASE_URL } from '@/lib/api';

const API_URL = API_BASE_URL;

// ── Types ──────────────────────────────────────────────────────────────────────
interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  deal_type: string;
  property_type: string;
  city: string;
  neighborhood: string;
  bedrooms: string | null;
  bathrooms: string | null;
  area_m2: number | null;
  cover_image_url: string | null;
  reputation_score: number;
  status: string;
  street_address?: string;
  images_json?: string;
  is_published?: boolean;
}

interface Lead {
  property_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  message: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const ReputationBadge = ({ score }: { score: number }) => {
  const color = score >= 4.0
    ? '#10b981' : score >= 3.2
    ? '#f59e0b' : '#ef4444';
  const label = score >= 4.0 ? 'Excelente' : score >= 3.2 ? 'Atenção' : 'Insalubre';
  return (
    <span style={{
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
      borderRadius: '6px',
      padding: '2px 8px',
      fontSize: '12px',
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
    }}>
      <Star size={11} fill={color} />
      {score.toFixed(1)} · {label}
    </span>
  );
};

const PropertyCard = ({ property, onClick }: { property: Property; onClick: () => void }) => (
  <div
    onClick={onClick}
    style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'all 0.25s ease',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
      (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)';
      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(168,85,247,0.3)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
    }}
  >
    {/* Cover Image */}
    <div style={{
      height: '180px',
      background: property.cover_image_url
        ? `url(${property.cover_image_url}) center/cover no-repeat`
        : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }}>
      {!property.cover_image_url && (
        <Building2 size={48} color="rgba(255,255,255,0.2)" />
      )}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
      }}>
        <span style={{
          background: property.deal_type === 'venda' ? 'rgba(168,85,247,0.9)' : 'rgba(59,130,246,0.9)',
          color: 'white',
          borderRadius: '6px',
          padding: '3px 10px',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {property.deal_type}
        </span>
      </div>
      <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
        <ReputationBadge score={property.reputation_score} />
      </div>
    </div>

    {/* Content */}
    <div style={{ padding: '16px' }}>
      <h3 style={{
        fontSize: '15px',
        fontWeight: 700,
        color: '#f1f5f9',
        marginBottom: '6px',
        lineHeight: 1.3,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {property.title}
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px' }}>
        <MapPin size={12} color="#a855f7" />
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          {property.neighborhood}, {property.city}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {property.bedrooms && (
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>🛏 {property.bedrooms} quartos</span>
        )}
        {property.bathrooms && (
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>🚿 {property.bathrooms} banh.</span>
        )}
        {property.area_m2 && (
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>📐 {property.area_m2}m²</span>
        )}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: '18px',
          fontWeight: 800,
          color: '#a855f7',
        }}>
          {formatCurrency(property.price)}
          {property.deal_type === 'aluguel' && (
            <span style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>/mês</span>
          )}
        </span>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: '#a855f7',
          fontSize: '12px',
          fontWeight: 600,
        }}>
          <Eye size={12} />
          Ver detalhes
        </div>
      </div>
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ImobversePage() {
  const { user, loading: authLoading } = useAuth();
  const [activeView, setActiveView] = useState<'listings' | 'senior-match' | 'my-properties' | 'new-property'>('listings');
  const [properties, setProperties] = useState<Property[]>([]);
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [loadingProps, setLoadingProps] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Senior Matchmaker states
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchCity, setMatchCity] = useState('');
  const [matchMaxPrice, setMatchMaxPrice] = useState('');
  const [importanceAccessibility, setImportanceAccessibility] = useState('high');
  const [importanceSecurity, setImportanceSecurity] = useState('high');
  const [importanceConvenience, setImportanceConvenience] = useState('medium');
  const [importanceSilence, setImportanceSilence] = useState('medium');

  // Filters
  const [filterCity, setFilterCity] = useState('');
  const [filterDeal, setFilterDeal] = useState('');
  const [filterType, setFilterType] = useState('');

  // Lead form
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadForm, setLeadForm] = useState<Lead>({
    property_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    message: '',
  });
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);

  // New property form
  const [propForm, setPropForm] = useState({
    title: '', description: '', price: '', deal_type: 'aluguel',
    property_type: 'apartamento', bedrooms: '', bathrooms: '',
    area_m2: '', city: '', neighborhood: '', street_address: '',
    cover_image_url: '',
  });
  const [propLoading, setPropLoading] = useState(false);
  const [propSuccess, setPropSuccess] = useState(false);

  const isPremium = user?.role === 'premium';

  // ── API Helpers ──────────────────────────────────────────────────────────────
  const apiFetch = useCallback(async (endpoint: string, options?: RequestInit) => {
    const res = await fetch(`${API_URL}/api/imobverse${endpoint}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.detail ?? `Erro ${res.status}`);
    }
    return res.json();
  }, []);

  // ── Load Listings ─────────────────────────────────────────────────────────────
  const loadProperties = useCallback(async () => {
    setLoadingProps(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterCity) params.append('city', filterCity);
      if (filterDeal) params.append('deal_type', filterDeal);
      if (filterType) params.append('property_type', filterType);
      const data = await apiFetch(`/properties?${params}`);
      setProperties(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingProps(false);
    }
  }, [apiFetch, filterCity, filterDeal, filterType]);

  const loadMyProperties = useCallback(async () => {
    if (!isPremium) return;
    setLoadingProps(true);
    try {
      const data = await apiFetch('/my-properties');
      setMyProperties(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingProps(false);
    }
  }, [apiFetch, isPremium]);

  const runSeniorMatch = useCallback(async () => {
    setMatchLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/imobverse/senior-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: matchCity || undefined,
          max_price: matchMaxPrice ? parseFloat(matchMaxPrice) : undefined,
          importance_accessibility: importanceAccessibility,
          importance_security: importanceSecurity,
          importance_convenience: importanceConvenience,
          importance_silence: importanceSilence,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail ?? `Erro ${res.status}`);
      }
      const data = await res.json();
      setMatchResults(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMatchLoading(false);
    }
  }, [matchCity, matchMaxPrice, importanceAccessibility, importanceSecurity, importanceConvenience, importanceSilence]);

  useEffect(() => {
    if (activeView === 'listings') loadProperties();
    if (activeView === 'my-properties') loadMyProperties();
    if (activeView === 'senior-match') runSeniorMatch();
  }, [activeView, loadProperties, loadMyProperties, runSeniorMatch]);

  // ── Submit Lead ───────────────────────────────────────────────────────────────
  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadLoading(true);
    try {
      await apiFetch('/leads', {
        method: 'POST',
        body: JSON.stringify(leadForm),
      });
      setLeadSuccess(true);
      setTimeout(() => {
        setShowLeadModal(false);
        setLeadSuccess(false);
        setLeadForm({ property_id: '', customer_name: '', customer_email: '', customer_phone: '', message: '' });
      }, 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLeadLoading(false);
    }
  };

  // ── Submit New Property ───────────────────────────────────────────────────────
  const submitProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setPropLoading(true);
    try {
      await apiFetch('/properties', {
        method: 'POST',
        body: JSON.stringify({
          ...propForm,
          price: parseFloat(propForm.price),
          area_m2: propForm.area_m2 ? parseFloat(propForm.area_m2) : undefined,
        }),
      });
      setPropSuccess(true);
      setTimeout(() => {
        setPropSuccess(false);
        setActiveView('my-properties');
      }, 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPropLoading(false);
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#f1f5f9',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
    display: 'block',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Inter', sans-serif" }}>
      <Header />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 24px 40px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(168,85,247,0.08) 0%, transparent 100%)',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)',
          borderRadius: '100px', padding: '6px 16px', marginBottom: '20px',
        }}>
          <Building2 size={14} color="#a855f7" />
          <span style={{ fontSize: '13px', color: '#a855f7', fontWeight: 600 }}>Proptech MVP · Premium</span>
          <Crown size={13} color="#f59e0b" />
        </div>

        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 900,
          color: '#f1f5f9',
          marginBottom: '16px',
          lineHeight: 1.1,
          letterSpacing: '-1px',
        }}>
          Imobverse
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #3b82f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Motor de Reputação Real
          </span>
        </h1>

        <p style={{
          fontSize: '16px',
          color: '#94a3b8',
          maxWidth: '580px',
          margin: '0 auto 40px',
          lineHeight: 1.7,
        }}>
          Plataforma proptech com vistoria fotográfica inteligente, motor de reputação automático
          e gestão de leads. Cada deterioração crítica penaliza o score do imóvel em tempo real.
        </p>

        {/* Stats row */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '32px',
          flexWrap: 'wrap', marginBottom: '48px',
        }}>
          {[
            { icon: <ShieldCheck size={18} color="#10b981" />, label: 'Motor de Reputação', desc: 'Score 0–5 automático' },
            { icon: <Camera size={18} color="#3b82f6" />, label: 'Vistoria Fotográfica', desc: 'Overlay baseline/check-out' },
            { icon: <TrendingUp size={18} color="#a855f7" />, label: 'Geração de Leads', desc: 'Contato sem exposição de dados' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px', padding: '12px 20px',
            }}>
              {item.icon}
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>{item.label}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Nav Tabs ──────────────────────────────────────────────────────────── */}
      <div style={{
        maxWidth: '1200px', margin: '0 auto', padding: '0 24px 24px',
        display: 'flex', gap: '8px', flexWrap: 'wrap',
      }}>
        {[
          { id: 'listings', label: '🏠 Buscar Imóveis', public: true },
          { id: 'senior-match', label: '👴👵 Matchmaker Sênior', public: true },
          { id: 'my-properties', label: '📋 Meus Imóveis', public: false },
          { id: 'new-property', label: '＋ Anunciar Imóvel', public: false },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (!tab.public && !isPremium) return;
              setActiveView(tab.id as any);
              setError(null);
            }}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: activeView === tab.id
                ? '1px solid rgba(168,85,247,0.5)'
                : '1px solid rgba(255,255,255,0.1)',
              background: activeView === tab.id
                ? 'rgba(168,85,247,0.15)'
                : 'rgba(255,255,255,0.04)',
              color: activeView === tab.id ? '#a855f7' : '#94a3b8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: !tab.public && !isPremium ? 'not-allowed' : 'pointer',
              opacity: !tab.public && !isPremium ? 0.5 : 1,
              display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}
          >
            {tab.label}
            {!tab.public && <Crown size={12} color="#f59e0b" />}
          </button>
        ))}
      </div>

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Error Banner */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px', padding: '12px 16px', marginBottom: '24px',
            display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444',
          }}>
            <AlertTriangle size={16} />
            <span style={{ fontSize: '14px' }}>{error}</span>
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── VIEW: Listings ───────────────────────────────────────────────────── */}
        {activeView === 'listings' && (
          <div>
            {/* Filters */}
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px', padding: '20px', marginBottom: '32px',
              display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end',
            }}>
              <div style={{ flex: '1', minWidth: '140px' }}>
                <label style={labelStyle}>Cidade</label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    value={filterCity}
                    onChange={e => setFilterCity(e.target.value)}
                    placeholder="São Paulo..."
                    style={{ ...inputStyle, paddingLeft: '34px' }}
                  />
                </div>
              </div>
              <div style={{ flex: '1', minWidth: '130px' }}>
                <label style={labelStyle}>Negócio</label>
                <select value={filterDeal} onChange={e => setFilterDeal(e.target.value)} style={inputStyle}>
                  <option value="">Todos</option>
                  <option value="aluguel">Aluguel</option>
                  <option value="venda">Venda</option>
                </select>
              </div>
              <div style={{ flex: '1', minWidth: '130px' }}>
                <label style={labelStyle}>Tipo</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} style={inputStyle}>
                  <option value="">Todos</option>
                  <option value="apartamento">Apartamento</option>
                  <option value="casa">Casa</option>
                  <option value="terreno">Terreno</option>
                  <option value="comercial">Comercial</option>
                </select>
              </div>
              <button
                onClick={loadProperties}
                style={{
                  padding: '10px 24px',
                  background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Filter size={14} />
                Filtrar
              </button>
            </div>

            {/* Grid */}
            {loadingProps ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                <p>Carregando imóveis...</p>
              </div>
            ) : properties.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '80px',
                background: 'rgba(255,255,255,0.02)', borderRadius: '16px',
                border: '1px dashed rgba(255,255,255,0.08)',
              }}>
                <Building2 size={48} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: '#64748b', fontSize: '15px' }}>Nenhum imóvel encontrado com os filtros aplicados.</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px',
              }}>
                {properties.map(prop => (
                  <PropertyCard
                    key={prop.id}
                    property={prop}
                    onClick={() => setSelectedProperty(prop)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VIEW: Senior Matchmaker ───────────────────────────────────────────── */}
        {activeView === 'senior-match' && (
          <div>
            {/* Preferences Questionnaire Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.06) 0%, rgba(59,130,246,0.02) 100%)',
              border: '1px solid rgba(168,85,247,0.2)',
              borderRadius: '16px', padding: '24px', marginBottom: '32px',
            }}>
              <h2 style={{
                fontSize: '18px', fontWeight: 800, color: '#f1f5f9',
                marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <Filter size={18} color="#a855f7" />
                Preferências do Senhor / Senhora (Garantia de Match)
              </h2>
              <form onSubmit={e => { e.preventDefault(); runSeniorMatch(); }} style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px', alignItems: 'flex-end'
              }}>
                <div>
                  <label style={labelStyle}>Cidade de Interesse</label>
                  <input
                    value={matchCity}
                    onChange={e => setMatchCity(e.target.value)}
                    placeholder="Ex: São Paulo"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Orçamento Máximo (R$)</label>
                  <input
                    type="number"
                    value={matchMaxPrice}
                    onChange={e => setMatchMaxPrice(e.target.value)}
                    placeholder="Ex: 4000"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Importância: Sem Escadas / Elevador</label>
                  <select
                    value={importanceAccessibility}
                    onChange={e => setImportanceAccessibility(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="high">Alta (Crucial)</option>
                    <option value="medium">Média (Desejável)</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Importância: Portaria & Câmeras</label>
                  <select
                    value={importanceSecurity}
                    onChange={e => setImportanceSecurity(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="high">Alta (Crucial)</option>
                    <option value="medium">Média (Desejável)</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Importância: Próximo a Hospitais</label>
                  <select
                    value={importanceConvenience}
                    onChange={e => setImportanceConvenience(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="high">Alta (Crucial)</option>
                    <option value="medium">Média (Desejável)</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Importância: Rua Silenciosa</label>
                  <select
                    value={importanceSilence}
                    onChange={e => setImportanceSilence(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="high">Alta (Crucial)</option>
                    <option value="medium">Média (Desejável)</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    type="submit"
                    disabled={matchLoading}
                    style={{
                      padding: '12px 32px',
                      background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
                      color: 'white', border: 'none', borderRadius: '10px',
                      fontWeight: 800, fontSize: '14px', cursor: matchLoading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      boxShadow: '0 0 15px rgba(168,85,247,0.3)',
                    }}
                  >
                    {matchLoading ? (
                      <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Calculando...</>
                    ) : (
                      <>✨ Calcular Match Perfeito</>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Results Grid */}
            {matchLoading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                <p>Processando algoritmo de compatibilidade sênior...</p>
              </div>
            ) : matchResults.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '80px',
                background: 'rgba(255,255,255,0.02)', borderRadius: '16px',
                border: '1px dashed rgba(255,255,255,0.08)',
              }}>
                <Building2 size={48} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: '#64748b', fontSize: '15px' }}>Nenhum imóvel corresponde aos critérios básicos.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                {matchResults.map((result: any) => {
                  const prop = result.property;
                  const matchColor = result.match_percentage >= 85 ? '#10b981' : result.match_percentage >= 60 ? '#f59e0b' : '#ef4444';
                  
                  return (
                    <div
                      key={prop.id}
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'row',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)';
                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(168,85,247,0.05)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {/* Left: Image */}
                      <div style={{
                        width: '240px',
                        height: 'auto',
                        background: prop.cover_image_url
                          ? `url(${prop.cover_image_url}) center/cover no-repeat`
                          : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                        position: 'relative',
                        flexShrink: 0,
                      }}>
                        <div style={{ position: 'absolute', top: 12, left: 12 }}>
                          <span style={{
                            background: prop.deal_type === 'venda' ? 'rgba(168,85,247,0.9)' : 'rgba(59,130,246,0.9)',
                            color: 'white', borderRadius: '6px', padding: '3px 10px',
                            fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                          }}>
                            {prop.deal_type}
                          </span>
                        </div>
                      </div>

                      {/* Right: Info */}
                      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          {/* Title and Match percentage */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '8px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f1f5f9' }}>{prop.title}</h3>
                            <div style={{
                              background: `${matchColor}15`,
                              color: matchColor,
                              border: `1px solid ${matchColor}30`,
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              flexShrink: 0,
                            }}>
                              <span>✨ {result.match_percentage}% Match</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>
                            <MapPin size={12} color="#a855f7" />
                            <span style={{ fontSize: '13px', color: '#94a3b8' }}>{prop.neighborhood}, {prop.city}</span>
                          </div>

                          {/* Breakdown Scores */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                            gap: '12px',
                            marginBottom: '20px',
                            background: 'rgba(255,255,255,0.02)',
                            padding: '12px',
                            borderRadius: '10px',
                          }}>
                            {[
                              { label: '🧑‍🦽 Acessibilidade', val: result.breakdown.accessibility },
                              { label: '🛡️ Segurança', val: result.breakdown.security },
                              { label: '🏥 Conveniência', val: result.breakdown.convenience },
                              { label: '🤫 Silêncio', val: result.breakdown.silence },
                            ].map((score, sIdx) => (
                              <div key={sIdx}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                                  <span>{score.label}</span>
                                  <span style={{ fontWeight: 700, color: score.val >= 70 ? '#10b981' : score.val >= 40 ? '#f59e0b' : '#ef4444' }}>{score.val}%</span>
                                </div>
                                <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${score.val}%`,
                                    background: score.val >= 70 ? '#10b981' : score.val >= 40 ? '#f59e0b' : '#ef4444',
                                    borderRadius: '2px',
                                  }} />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Match Reasons */}
                          <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                              Por que este imóvel é ideal?
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {result.match_reasons.map((reason: string, rIdx: number) => (
                                <div key={rIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#cbd5e1' }}>
                                  <CheckCircle size={14} color="#10b981" style={{ flexShrink: 0 }} />
                                  <span>{reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Price and Details button */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                          paddingTop: '16px',
                        }}>
                          <span style={{ fontSize: '20px', fontWeight: 800, color: '#a855f7' }}>
                            {formatCurrency(prop.price)}
                            {prop.deal_type === 'aluguel' && <span style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>/mês</span>}
                          </span>
                          <button
                            onClick={() => setSelectedProperty(prop)}
                            style={{
                              padding: '8px 20px',
                              background: 'rgba(168,85,247,0.1)',
                              border: '1px solid rgba(168,85,247,0.3)',
                              borderRadius: '8px',
                              color: '#a855f7',
                              fontWeight: 700,
                              fontSize: '13px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.1)'; }}
                          >
                            <Eye size={14} />
                            Ver Detalhes
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── VIEW: My Properties ──────────────────────────────────────────────── */}
        {activeView === 'my-properties' && (
          <div>
            {!isPremium ? (
              <div style={{
                textAlign: 'center', padding: '80px',
                background: 'rgba(168,85,247,0.04)',
                borderRadius: '16px', border: '1px dashed rgba(168,85,247,0.2)',
              }}>
                <Lock size={40} color="#a855f7" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: '#94a3b8', fontSize: '15px' }}>Esta área é exclusiva para anunciantes Premium.</p>
              </div>
            ) : loadingProps ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                <p>Carregando seus imóveis...</p>
              </div>
            ) : myProperties.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '80px',
                background: 'rgba(255,255,255,0.02)', borderRadius: '16px',
                border: '1px dashed rgba(255,255,255,0.08)',
              }}>
                <Home size={48} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '20px' }}>Você ainda não tem imóveis cadastrados.</p>
                <button
                  onClick={() => setActiveView('new-property')}
                  style={{
                    padding: '12px 28px', background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                    color: 'white', border: 'none', borderRadius: '10px',
                    fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Anunciar primeiro imóvel →
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px',
              }}>
                {myProperties.map(prop => (
                  <div key={prop.id} style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '160px',
                      background: prop.cover_image_url
                        ? `url(${prop.cover_image_url}) center/cover no-repeat`
                        : 'linear-gradient(135deg, #1e1b4b, #312e81)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative',
                    }}>
                      {!prop.cover_image_url && <Building2 size={40} color="rgba(255,255,255,0.2)" />}
                      <div style={{ position: 'absolute', top: 10, right: 10 }}>
                        <ReputationBadge score={prop.reputation_score} />
                      </div>
                    </div>
                    <div style={{ padding: '16px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '6px' }}>{prop.title}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                        <MapPin size={11} color="#a855f7" />
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{prop.neighborhood}, {prop.city}</span>
                      </div>
                      {prop.street_address && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>📍 {prop.street_address}</div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#a855f7', fontWeight: 800, fontSize: '16px' }}>
                          {formatCurrency(prop.price)}
                          {prop.deal_type === 'aluguel' && <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748b' }}>/mês</span>}
                        </span>
                        <span style={{
                          fontSize: '11px', fontWeight: 600,
                          color: prop.status === 'active' ? '#10b981' : prop.status === 'unhealthy' ? '#ef4444' : '#64748b',
                          background: prop.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          padding: '3px 8px', borderRadius: '6px',
                        }}>
                          {prop.status === 'active' ? '● Ativo' : prop.status === 'unhealthy' ? '⚠ Insalubre' : '○ Inativo'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VIEW: New Property ───────────────────────────────────────────────── */}
        {activeView === 'new-property' && (
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            {!isPremium ? (
              <div style={{
                textAlign: 'center', padding: '80px',
                background: 'rgba(168,85,247,0.04)',
                borderRadius: '16px', border: '1px dashed rgba(168,85,247,0.2)',
              }}>
                <Lock size={40} color="#a855f7" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: '#94a3b8', fontSize: '15px' }}>Apenas usuários Premium podem anunciar imóveis.</p>
              </div>
            ) : (
              <form onSubmit={submitProperty} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '32px',
              }}>
                <h2 style={{
                  fontSize: '20px', fontWeight: 800, color: '#f1f5f9',
                  marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  <Plus size={20} color="#a855f7" />
                  Novo Anúncio de Imóvel
                </h2>

                {propSuccess && (
                  <div style={{
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '10px', padding: '14px 18px', marginBottom: '20px',
                    color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px',
                  }}>
                    <CheckCircle size={16} />
                    Imóvel cadastrado com sucesso! Redirecionando...
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                  {/* Title */}
                  <div>
                    <label style={labelStyle}>Título do anúncio *</label>
                    <input
                      required value={propForm.title}
                      onChange={e => setPropForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="Apartamento espaçoso com varanda gourmet..."
                      style={inputStyle}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label style={labelStyle}>Descrição *</label>
                    <textarea
                      required value={propForm.description}
                      onChange={e => setPropForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Descreva o imóvel em detalhes..."
                      rows={4}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Price */}
                    <div>
                      <label style={labelStyle}>Preço (R$) *</label>
                      <input
                        required type="number" value={propForm.price}
                        onChange={e => setPropForm(p => ({ ...p, price: e.target.value }))}
                        placeholder="2500.00"
                        style={inputStyle}
                      />
                    </div>
                    {/* Deal Type */}
                    <div>
                      <label style={labelStyle}>Tipo de Negócio *</label>
                      <select
                        value={propForm.deal_type}
                        onChange={e => setPropForm(p => ({ ...p, deal_type: e.target.value }))}
                        style={inputStyle}
                      >
                        <option value="aluguel">Aluguel</option>
                        <option value="venda">Venda</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Type */}
                    <div>
                      <label style={labelStyle}>Tipo de Imóvel</label>
                      <select
                        value={propForm.property_type}
                        onChange={e => setPropForm(p => ({ ...p, property_type: e.target.value }))}
                        style={inputStyle}
                      >
                        <option value="apartamento">Apartamento</option>
                        <option value="casa">Casa</option>
                        <option value="terreno">Terreno</option>
                        <option value="comercial">Comercial</option>
                      </select>
                    </div>
                    {/* Area */}
                    <div>
                      <label style={labelStyle}>Área (m²)</label>
                      <input
                        type="number" value={propForm.area_m2}
                        onChange={e => setPropForm(p => ({ ...p, area_m2: e.target.value }))}
                        placeholder="65"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Quartos</label>
                      <input value={propForm.bedrooms}
                        onChange={e => setPropForm(p => ({ ...p, bedrooms: e.target.value }))}
                        placeholder="2" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Banheiros</label>
                      <input value={propForm.bathrooms}
                        onChange={e => setPropForm(p => ({ ...p, bathrooms: e.target.value }))}
                        placeholder="1" style={inputStyle} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Cidade *</label>
                      <input required value={propForm.city}
                        onChange={e => setPropForm(p => ({ ...p, city: e.target.value }))}
                        placeholder="São Paulo" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Bairro *</label>
                      <input required value={propForm.neighborhood}
                        onChange={e => setPropForm(p => ({ ...p, neighborhood: e.target.value }))}
                        placeholder="Vila Mariana" style={inputStyle} />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Endereço Completo (visível apenas após lead)</label>
                    <input value={propForm.street_address}
                      onChange={e => setPropForm(p => ({ ...p, street_address: e.target.value }))}
                      placeholder="Rua das Acácias, 123 — Apto 4B"
                      style={inputStyle} />
                  </div>

                  <div>
                    <label style={labelStyle}>URL da Foto Principal (Cloudinary/Imagem)</label>
                    <input value={propForm.cover_image_url}
                      onChange={e => setPropForm(p => ({ ...p, cover_image_url: e.target.value }))}
                      placeholder="https://res.cloudinary.com/..."
                      style={inputStyle} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={propLoading}
                  style={{
                    width: '100%', marginTop: '28px',
                    padding: '14px',
                    background: propLoading
                      ? 'rgba(255,255,255,0.1)'
                      : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                    color: 'white', border: 'none', borderRadius: '12px',
                    fontWeight: 800, fontSize: '15px', cursor: propLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  {propLoading
                    ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Cadastrando...</>
                    : <><Plus size={16} /> Publicar Anúncio</>
                  }
                </button>
              </form>
            )}
          </div>
        )}
      </main>

      {/* ── Property Detail Modal ─────────────────────────────────────────────── */}
      {selectedProperty && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}
          onClick={() => setSelectedProperty(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              maxWidth: '600px', width: '100%',
              maxHeight: '90vh', overflow: 'auto',
            }}
          >
            {/* Modal Cover */}
            <div style={{
              height: '240px',
              background: selectedProperty.cover_image_url
                ? `url(${selectedProperty.cover_image_url}) center/cover no-repeat`
                : 'linear-gradient(135deg, #1e1b4b, #312e81)',
              display: 'flex', alignItems: 'flex-end',
              padding: '20px',
              position: 'relative',
            }}>
              <button
                onClick={() => setSelectedProperty(null)}
                style={{
                  position: 'absolute', top: 16, right: 16,
                  background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '8px',
                  padding: '6px', cursor: 'pointer', color: 'white',
                }}
              >
                <X size={18} />
              </button>
              <div>
                <span style={{
                  background: selectedProperty.deal_type === 'venda' ? 'rgba(168,85,247,0.9)' : 'rgba(59,130,246,0.9)',
                  color: 'white', borderRadius: '6px', padding: '4px 12px',
                  fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.5px', marginRight: '8px',
                }}>
                  {selectedProperty.deal_type}
                </span>
                <ReputationBadge score={selectedProperty.reputation_score} />
              </div>
            </div>

            <div style={{ padding: '28px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f1f5f9', marginBottom: '8px' }}>
                {selectedProperty.title}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                <MapPin size={14} color="#a855f7" />
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  {selectedProperty.neighborhood}, {selectedProperty.city}
                </span>
              </div>
              <div style={{
                fontSize: '28px', fontWeight: 900, color: '#a855f7', marginBottom: '20px',
              }}>
                {formatCurrency(selectedProperty.price)}
                {selectedProperty.deal_type === 'aluguel' && (
                  <span style={{ fontSize: '14px', fontWeight: 400, color: '#64748b' }}>/mês</span>
                )}
              </div>

              {/* Features */}
              <div style={{
                display: 'flex', gap: '16px', flexWrap: 'wrap',
                background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
                padding: '14px 18px', marginBottom: '20px',
              }}>
                {selectedProperty.bedrooms && <span style={{ fontSize: '13px', color: '#f1f5f9' }}>🛏 {selectedProperty.bedrooms} quartos</span>}
                {selectedProperty.bathrooms && <span style={{ fontSize: '13px', color: '#f1f5f9' }}>🚿 {selectedProperty.bathrooms} banheiros</span>}
                {selectedProperty.area_m2 && <span style={{ fontSize: '13px', color: '#f1f5f9' }}>📐 {selectedProperty.area_m2}m²</span>}
                <span style={{ fontSize: '13px', color: '#f1f5f9' }}>🏠 {selectedProperty.property_type}</span>
              </div>

              <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '24px' }}>
                {selectedProperty.description}
              </p>

              {/* Address masked note */}
              <div style={{
                background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)',
                borderRadius: '10px', padding: '12px 16px', marginBottom: '24px',
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '13px', color: '#a855f7',
              }}>
                <Lock size={14} />
                Endereço completo liberado após registro de interesse.
              </div>

              {/* Lead Button */}
              <button
                onClick={() => {
                  setLeadForm(f => ({ ...f, property_id: selectedProperty.id }));
                  setShowLeadModal(true);
                }}
                style={{
                  width: '100%', padding: '14px',
                  background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                  color: 'white', border: 'none', borderRadius: '12px',
                  fontWeight: 800, fontSize: '15px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                <Phone size={16} />
                Tenho Interesse — Entrar em Contato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lead Form Modal ───────────────────────────────────────────────────── */}
      {showLeadModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            background: '#111118', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px', maxWidth: '440px', width: '100%', padding: '32px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f1f5f9' }}>
                Registrar Interesse
              </h3>
              <button
                onClick={() => setShowLeadModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            {leadSuccess ? (
              <div style={{
                textAlign: 'center', padding: '40px',
                color: '#10b981',
              }}>
                <CheckCircle size={48} style={{ margin: '0 auto 16px' }} />
                <p style={{ fontSize: '16px', fontWeight: 700 }}>Lead enviado!</p>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>O anunciante entrará em contato em breve.</p>
              </div>
            ) : (
              <form onSubmit={submitLead} style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Seu Nome *</label>
                  <input required value={leadForm.customer_name}
                    onChange={e => setLeadForm(f => ({ ...f, customer_name: e.target.value }))}
                    placeholder="Maria da Silva"
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>E-mail *</label>
                  <input required type="email" value={leadForm.customer_email}
                    onChange={e => setLeadForm(f => ({ ...f, customer_email: e.target.value }))}
                    placeholder="maria@exemplo.com"
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Telefone / WhatsApp *</label>
                  <input required value={leadForm.customer_phone}
                    onChange={e => setLeadForm(f => ({ ...f, customer_phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Mensagem (opcional)</label>
                  <textarea value={leadForm.message}
                    onChange={e => setLeadForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Tenho disponibilidade para visita às..."
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                <button
                  type="submit" disabled={leadLoading}
                  style={{
                    padding: '14px',
                    background: leadLoading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                    color: 'white', border: 'none', borderRadius: '12px',
                    fontWeight: 800, fontSize: '14px', cursor: leadLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  {leadLoading
                    ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</>
                    : <><Send size={16} /> Enviar Interesse</>
                  }
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus {
          outline: none !important;
          border-color: rgba(168,85,247,0.5) !important;
          box-shadow: 0 0 0 3px rgba(168,85,247,0.1) !important;
        }
      `}</style>

      <Footer />
    </div>
  );
}
