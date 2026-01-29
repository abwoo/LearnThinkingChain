/**
 * Floating Hub - 浮动控制中心
 * 
 * React component for Shadow DOM UI
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

export interface FloatingHubProps {
  isActive: boolean;
  currentMode: string;
  modes: Array<{ id: string; name: string }>;
  onToggleActive: (active: boolean) => void;
  onModeChange: (modeId: string) => void;
  status?: {
    type: 'info' | 'error' | 'success';
    message: string;
  };
}

export class FloatingHub {
  private root: ReturnType<typeof createRoot> | null = null;
  private shadowRoot: ShadowRoot;
  private container: HTMLDivElement | null = null;
  private lastProps: FloatingHubProps | null = null;

  constructor(shadowRoot: ShadowRoot) {
    this.shadowRoot = shadowRoot;
  }

  /**
   * Render FloatingHub component
   */
  render(props: FloatingHubProps): void {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'ltc-root';
      this.shadowRoot.appendChild(this.container);
      this.root = createRoot(this.container);
    }
    this.lastProps = props;
    this.root?.render(<FloatingHubComponent {...props} />);
  }

  /**
   * Update props
   */
  update(_props: Partial<FloatingHubProps>): void {
    if (!this.root || !this.lastProps) return;
    const nextProps = { ...this.lastProps, ..._props };
    this.lastProps = nextProps;
    this.root.render(<FloatingHubComponent {...nextProps} />);
  }

  /**
   * Unmount
   */
  unmount(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.lastProps = null;
  }
}

const FloatingHubComponent: React.FC<FloatingHubProps> = ({
  isActive,
  currentMode,
  modes,
  onToggleActive,
  onModeChange,
  status
}) => {
  const [expanded, setExpanded] = useState(true);
  const [history, setHistory] = useState<Array<{ title: string; desc: string }>>([]);
  const [protocols, setProtocols] = useState<Record<string, Record<string, string>>>({});
  const [profileTrend, setProfileTrend] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const load = async () => {
      const data = await chrome.storage.local.get([
        'ltc_last_thinking_steps',
        'ltc_protocols',
        'ltc_profile',
        'ltc_mode'
      ]);
      const steps = Array.isArray(data.ltc_last_thinking_steps) ? data.ltc_last_thinking_steps : [];
      setHistory(steps);
      const storedProtocols = typeof data.ltc_protocols === 'object' && data.ltc_protocols ? data.ltc_protocols : {};
      setProtocols(storedProtocols as Record<string, Record<string, string>>);
      const trend = data.ltc_profile?.thinking_trend;
      setProfileTrend(typeof trend === 'string' ? trend : '');
    };
    load();

    const onChanged = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.ltc_last_thinking_steps) {
        const steps = changes.ltc_last_thinking_steps.newValue;
        setHistory(Array.isArray(steps) ? steps : []);
      }
      if (changes.ltc_protocols) {
        const next = changes.ltc_protocols.newValue;
        setProtocols(typeof next === 'object' && next ? next : {});
      }
      if (changes.ltc_profile) {
        const trend = changes.ltc_profile.newValue?.thinking_trend;
        setProfileTrend(typeof trend === 'string' ? trend : '');
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const containerStyle: React.CSSProperties = {
    transform: position.x || position.y
      ? `translate(${position.x}px, ${position.y}px)`
      : undefined
  };

  const protocolPreview = useMemo(() => {
    const p = protocols[currentMode] || {};
    const q1 = p.q1_blind_spot || p.q1 || '—';
    const q2 = p.q2_entropy || p.q2 || '—';
    const q3 = p.q3_backtrack || p.q3 || '—';
    const q4 = p.q4_handover || p.q4 || '—';
    return [
      `Mode: ${currentMode}`,
      `Q1: ${q1}`,
      `Q2: ${q2}`,
      `Q3: ${q3}`,
      `Q4: ${q4}`
    ].join('\n');
  }, [protocols, currentMode]);

  return (
    <div className="ltc-hub" style={containerStyle}>
      <div
        className="ltc-header"
        onMouseDown={handleMouseDown}
      >
        <div className="ltc-brand">
          <span style={{ color: 'var(--accent-blue)', fontSize: '14px' }}>⚡</span>
          THINKING CHAIN
        </div>
        <div style={{ width: '30px', height: '4px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '2px' }} />
      </div>

      <div className="ltc-controls">
        <div className="ltc-toggle-group">
          <label className="ltc-switch">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => onToggleActive(e.target.checked)}
            />
            <span className="ltc-slider" />
          </label>
          <select
            className="ltc-select"
            value={currentMode}
            onChange={(e) => onModeChange(e.target.value)}
            disabled={!isActive}
          >
            {modes.map(mode => (
              <option key={mode.id} value={mode.id}>
                {mode.name}
              </option>
            ))}
          </select>
        </div>

        {status && (
          <div className={`ltc-status ${status.type}`}>
            {status.message}
          </div>
        )}

        {profileTrend && (
          <div className="ltc-trend">
            {profileTrend}
          </div>
        )}
      </div>

      <button
        className="ltc-expand-btn"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? '▼ Collapse Panel' : '▲ Expand Panel'}
      </button>

      {expanded && (
        <div className="ltc-panel">
          <div className="ltc-section-title">ACTIVE PROTOCOL (Q1-Q4)</div>
          <pre className="ltc-protocol">{protocolPreview}</pre>

          <div className="ltc-section-title">THINKING PATH MAP</div>
          <div className="ltc-path-map">
            <span>Start</span>
            <span className="ltc-path-arrow">→</span>
            <span>Wrong Turn</span>
            <span className="ltc-path-arrow">→</span>
            <span>Insight</span>
            <span className="ltc-path-arrow">→</span>
            <span>Target</span>
          </div>

          <div className="ltc-section-title">SESSION HISTORY</div>
          <div className="ltc-history-list">
            {history.length === 0 && <div className="ltc-empty">No history yet</div>}
            {history.map((item, index) => (
              <div key={`${item.title}-${index}`} className="ltc-history-item">
                <strong>{item.title}</strong>
                <span>{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
