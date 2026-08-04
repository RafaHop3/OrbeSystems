/**
 * types/utils.ts — TypeScript Utility Types
 * ══════════════════════════════════════════════════════════════════
 * Advanced generic types used across the frontend.
 *
 * Pattern: Discriminated Union + built-in utility types.
 * This creates compile-time contracts — broken data shapes are
 * caught before build, not at runtime.
 */

// ── Fetch State (Discriminated Union) ────────────────────────────────────────
/**
 * Models the full lifecycle of an async data fetch.
 * TypeScript enforces exhaustive handling of all states via switch/if chains.
 *
 * Usage:
 *   const [state, setState] = useState<FetchState<Repository[]>>({ status: 'idle' });
 */
export type FetchState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: T }
    | { status: 'error'; message: string };

// ── Repository Utility Types ──────────────────────────────────────────────────
import type { Repository } from './repository';

/** Fields shown in portfolio card previews — minimal surface area. */
export type RepositoryCard = Pick<
    Repository,
    'id' | 'name' | 'description' | 'deploy_url' | 'language' | 'is_featured' | 'is_premium_only'
>;

/** Partial update payload for admin edits — all fields optional. */
export type UpdateRepositoryPayload = Partial<
    Pick<Repository, 'custom_description' | 'image_url' | 'video_url' | 'deploy_url' | 'is_featured' | 'is_premium_only'>
>;

// ── API Response Wrapper ──────────────────────────────────────────────────────
/**
 * Standard envelope returned by the FastAPI backend.
 * T is the actual payload type — enforces contract between back/front.
 */
export type ApiResponse<T> =
    | { ok: true; data: T }
    | { ok: false; error: string; status: number };
