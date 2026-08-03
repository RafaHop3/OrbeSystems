import React, { useState, useCallback, useMemo, KeyboardEvent } from 'react';
import styles from './AccessibleDataCard.module.css';

// Using strict types (no 'any')
export interface CardData {
    id: string;
    title: string;
    description: string;
    status: 'active' | 'inactive' | 'pending';
    lastUpdated: string;
}

interface AccessibleDataCardProps {
    data: CardData;
    onAction?: (id: string) => void;
}

export const AccessibleDataCard: React.FC<AccessibleDataCardProps> = ({ data, onAction }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Performance: memoizing handlers
    const handleToggle = useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, []);

    // Accessibility: Keyboard navigation support
    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); // Prevent page scroll on space
            handleToggle();
        }
    }, [handleToggle]);

    const handleActionClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation(); // Previne o clique de expandir/contrair o card acidentalmente
        if (onAction) {
            onAction(data.id);
        }
    }, [onAction, data.id]);

    // Performance: memoize derived status label classes so it doesn't recalculate unnecessarily 
    const statusClass = useMemo(() => {
        switch (data.status) {
            case 'active': return styles.statusActive;
            case 'inactive': return styles.statusInactive;
            case 'pending': return styles.statusPending;
            default: return '';
        }
    }, [data.status]);

    return (
        <div
            className={`${styles.card} ${isExpanded ? styles.expanded : ''}`}
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            aria-controls={`card-content-${data.id}`}
            onKeyDown={handleKeyDown}
            onClick={handleToggle}
        >
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <h3 id={`card-title-${data.id}`} className={styles.title}>{data.title}</h3>
                    <span
                        className={`${styles.statusBadge} ${statusClass}`}
                        aria-label={`Status: ${data.status}`}
                    >
                        {data.status}
                    </span>
                </div>
                <button
                    className={styles.toggleBtn}
                    aria-label={isExpanded ? "Collapse card details" : "Expand card details"}
                    tabIndex={-1} // Foco está no container pai (o div principal) para ser mais limpo a11y
                >
                    ▼
                </button>
            </div>

            <div
                id={`card-content-${data.id}`}
                className={styles.content}
                aria-hidden={!isExpanded}
            >
                <p className={styles.description}>{data.description}</p>

                <div className={styles.footer}>
                    <span className={styles.meta}>Last updated: {data.lastUpdated}</span>
                    <button
                        className={styles.actionBtn}
                        onClick={handleActionClick}
                        aria-label={`Perform action on ${data.title}`}
                        tabIndex={isExpanded ? 0 : -1} // Only focusable when expanded
                    >
                        Process Item
                    </button>
                </div>
            </div>
        </div>
    );
};
