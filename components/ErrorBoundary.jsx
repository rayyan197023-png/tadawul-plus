'use client';

/**
 * ErrorBoundary -- Catches React rendering errors
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
    if (typeof window !== 'undefined') {
      window.__LAST_ERROR__ = error.message + ' | ' + (info.componentStack||'').slice(0,200);
      document.title = error.message;
    }
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
         {process.env.NODE_ENV !== 'production' && (
        <div style={{ 
  fontSize: 11, 
  color: '#ff5f6a', 
  marginBottom: 16, 
  lineHeight: 1.6,
  textAlign: 'left',
  direction: 'ltr',
  background: 'rgba(255, 95, 106, 0.1)',
  padding: 10,
  borderRadius: 6,
  maxHeight: 300,
  overflow: 'auto',
  fontFamily: 'monospace',
  fontSize: 10,
}}>
  <strong style={{color: '#ff5f6a', fontSize: 12}}>🐛 Error:</strong>
  <br/>
  {this.state.error?.message ?? 'Unknown error'}
  <br/><br/>
  <strong style={{color: '#f0c050', fontSize: 11}}>Stack:</strong>
  <br/>
  <pre style={{fontSize: 9, whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>
    {this.state.error?.stack ?? 'No stack trace'}
  </pre>
  <br/>
  <strong style={{color: '#22d3ee', fontSize: 11}}>Component:</strong>
  <br/>
  <span style={{fontSize: 9}}>
    {typeof window !== 'undefined' && window.__LAST_ERROR__}
  </span>
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