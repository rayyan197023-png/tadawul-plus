'use client';

/**
 * ErrorBoundary — Catches React rendering errors
 * Prevents one broken component from crashing the whole app.
 * Shows a graceful fallback with retry option.
 */

import { Component } from 'react';
import { colors }    from '../theme/tokens';

const C = colors;

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console in dev, could send to Sentry in prod
    console.error('[ErrorBoundary] Caught:', error.message, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { fallback, label = 'هذا القسم' } = this.props;

    // Custom fallback
    if (fallback) return fallback;

    // Default fallback
    return (
      <div style={{
        padding: 24, textAlign: 'center',
        fontFamily: "'Cairo','Segoe UI',sans-serif",
        direction: 'rtl',
      }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
          تعذّر تحميل {label}
        </div>
        <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 16, lineHeight: 1.6 }}>
          {this.state.error?.message ?? 'خطأ غير متوقع'}
        </div>
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          style={{
            background: C.gold, border: 'none', borderRadius: 8,
            padding: '8px 20px', color: '#000', fontSize: 12,
            fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Cairo','Segoe UI',sans-serif",
          }}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }
}
