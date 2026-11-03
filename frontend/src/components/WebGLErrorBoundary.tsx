'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

let cachedWebGLAvailable: boolean | null = null;

/**
 * Checks whether WebGL2 (required by Three.js r163+) is genuinely available
 * and functional without leaking temporary WebGL contexts.
 */
export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  if (cachedWebGLAvailable !== null) return cachedWebGLAvailable;

  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      cachedWebGLAvailable = false;
      return false;
    }

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      powerPreference: 'low-power',
      failIfMajorPerformanceCaveat: false,
    }) as WebGL2RenderingContext | null;

    if (!gl || gl.isContextLost()) {
      cachedWebGLAvailable = false;
      return false;
    }

    const precision = gl.getShaderPrecisionFormat?.(gl.VERTEX_SHADER, gl.HIGH_FLOAT);
    const ok = Boolean(precision && precision.precision > 0);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedWebGLAvailable = ok;
    return ok;
  } catch {
    cachedWebGLAvailable = false;
    return false;
  }
}

export class WebGLErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[WebGLErrorBoundary] Fallback para fundo CSS estático ativado:', error.message, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

export default WebGLErrorBoundary;
