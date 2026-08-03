"use client";
import React from 'react';
import { AccessibleDataCard, CardData } from '@/components/ui-study/AccessibleDataCard';

const mockData: CardData[] = [
    {
        id: '1',
        title: 'AI Model Genesis',
        description: 'Training data optimization loop for the primary Nexus core limiters. Ensures parameters are within secure threshold. Used strictly for evaluation models.',
        status: 'active',
        lastUpdated: '10 mins ago'
    },
    {
        id: '2',
        title: 'Neural Link Feedback',
        description: 'Reviewing accessibility constraints on the sensory feedback mechanism for end-users.',
        status: 'pending',
        lastUpdated: '1 hr ago'
    },
    {
        id: '3',
        title: 'Legacy System Archive',
        description: 'Archive of visual regression testing assets and outdated design tokens from 2024. Deprecated but maintained for compliance.',
        status: 'inactive',
        lastUpdated: '2 days ago'
    }
];

export default function DesignSystemPage() {
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            padding: '40px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <header style={{ marginBottom: '40px', borderBottom: '1px solid #334155', paddingBottom: '20px' }}>
                <h1 style={{ margin: 0, fontSize: '2rem', letterSpacing: '-0.02em', fontWeight: '700' }}>
                    🔬 micro1 Study Playground
                </h1>
                <p style={{ color: '#94a3b8', marginTop: '10px', maxWidth: '650px', lineHeight: 1.6 }}>
                    Este é um ambiente de isolamento seguro criado exclusivamente para treinar e avaliar os requisitos da vaga da micro1.
                    Nenhuma destas alterações impacta o portal de produção principal. Foco em <strong>TypeScript Strict</strong>, <strong>CSS3 Pixel-Perfect</strong> e <strong>Acessibilidade Web (a11y)</strong>.
                </p>
            </header>

            <section>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%' }} />
                    Componente: AccessibleDataCard
                </h2>

                {/* CSS Grid usado aqui para layout responsivo Pixel-Perfect */}
                <div style={{
                    display: 'grid',
                    gap: '24px',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))'
                }}>
                    {mockData.map((data) => (
                        <AccessibleDataCard
                            key={data.id}
                            data={data}
                            onAction={(id) => alert(`Ação processada para o item de ID: ${id}`)}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
}
