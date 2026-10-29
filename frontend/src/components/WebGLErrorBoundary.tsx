'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class WebGLErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[WebGL Fallback] WebGL rendering error captured safely:', error.message, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div 
          className="absolute inset-0 bg-[#050810] pointer-events-none opacity-80"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0, 255, 204, 0.05) 0%, transparent 70%)'
          }}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Utilitário seguro para verificar se o ambiente suporta WebGL sem travar
 */
export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export default WebGLErrorBoundary;
