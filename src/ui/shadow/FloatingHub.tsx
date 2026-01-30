/**
 * Floating Hub - 浮动控制中心
 * 
 * React component for Shadow DOM UI
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { ProtocolMap } from '../../types/Protocols';
import { HistoryService, type HistoryEntry } from '../../core/services/HistoryService';

export interface FloatingHubProps {
  isActive: boolean;
  currentMode: string;
  modes: Array<{ id: string; name: string }>;
  protocols?: ProtocolMap;
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
  protocols: propProtocols,
  onToggleActive,
  onModeChange,
  status
}) => {
  const [expanded, setExpanded] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [protocols, setProtocols] = useState<Record<string, Record<string, string>>>({});
  const [profileTrend, setProfileTrend] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const hubRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      const data = (await chrome.storage.local.get([
        'ltc_last_thinking_steps',
        'ltc_protocols',
        'ltc_profile',
        'ltc_hub_position'
      ])) as {
        ltc_last_thinking_steps?: HistoryEntry[];
        ltc_protocols?: Record<string, Record<string, string>>;
        ltc_profile?: { thinking_trend?: string };
        ltc_hub_position?: { x?: number; y?: number };
      };
      const steps = Array.isArray(data.ltc_last_thinking_steps) ? data.ltc_last_thinking_steps : [];
      setHistory(steps as HistoryEntry[]);
      const storedProtocols = typeof data.ltc_protocols === 'object' && data.ltc_protocols ? data.ltc_protocols : {};
      setProtocols(storedProtocols as Record<string, Record<string, string>>);
      const trend = data.ltc_profile?.thinking_trend;
      setProfileTrend(typeof trend === 'string' ? trend : '');

      const pos = data.ltc_hub_position;
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        setPosition({ x: pos.x, y: pos.y });
      } else {
        requestAnimationFrame(() => {
          const width = hubRef.current?.getBoundingClientRect().width || 320;
          const x = Math.max(8, window.innerWidth - width - 28);
          const y = 20;
          setPosition({ x, y });
        });
      }
    };
    load();

    const onChanged = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.ltc_last_thinking_steps) {
        const steps = changes.ltc_last_thinking_steps.newValue;
        setHistory(Array.isArray(steps) ? (steps as HistoryEntry[]) : []);
      }
      if (changes.ltc_protocols) {
        const next = changes.ltc_protocols.newValue as Record<string, Record<string, string>> | undefined;
        setProtocols(typeof next === 'object' && next ? next : {});
      }
      if (changes.ltc_profile) {
        const trend = (changes.ltc_profile.newValue as { thinking_trend?: string } | undefined)?.thinking_trend;
        setProfileTrend(typeof trend === 'string' ? trend : '');
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const rect = hubRef.current?.getBoundingClientRect();
      const width = rect?.width || 320;
      const height = rect?.height || 160;
      const maxX = Math.max(8, window.innerWidth - width - 8);
      const maxY = Math.max(8, window.innerHeight - height - 8);
      const nextX = Math.min(maxX, Math.max(8, e.clientX - dragOffset.x));
      const nextY = Math.min(maxY, Math.max(8, e.clientY - dragOffset.y));
      setPosition({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      chrome.storage.local.set({ ltc_hub_position: position });
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const containerStyle: React.CSSProperties = {
    left: `${position.x}px`,
    top: `${position.y}px`,
    right: 'auto'
  };

  const protocolPreview = useMemo(() => {
    const source = (propProtocols ?? protocols) as Record<string, Record<string, string>>;
    const raw = source[currentMode];
    const p = (raw && typeof raw === 'object' ? (raw as Record<string, string>) : {});
    const q1 = p.q1_blind_spot ?? p.q1 ?? '—';
    const q2 = p.q2_entropy ?? p.q2 ?? '—';
    const q3 = p.q3_backtrack ?? p.q3 ?? '—';
    const q4 = p.q4_handover ?? p.q4 ?? '—';
    return [
      `Mode: ${currentMode}`,
      `Q1: ${q1}`,
      `Q2: ${q2}`,
      `Q3: ${q3}`,
      `Q4: ${q4}`
    ].join('\n');
  }, [protocols, propProtocols, currentMode]);

  return (
    <div className="ltc-hub" style={containerStyle} ref={hubRef}>
      <div
        className="ltc-header"
        onMouseDown={handleMouseDown}
      >
        <div className="ltc-brand">
          <span className="ltc-icon">⚡</span>
          THINKING CHAIN
        </div>
        <div className="ltc-drag-handle" />
      </div>

      <div className="ltc-controls">
        <div className="ltc-toggle-group">
          <label className="ltc-switch">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => onToggleActive(e.target.checked)}
              aria-label="Enable LearnThinkingChain"
            />
            <span className="ltc-slider" />
          </label>
          <div className="ltc-select-wrap">
            <select
              className="ltc-select"
              value={currentMode}
              onChange={(e) => onModeChange(e.target.value)}
              disabled={modes.length === 0}
              aria-label="Select cognitive mode"
            >
              {modes.length === 0 && (
                <option value="">暂无模式</option>
              )}
              {modes.map(mode => (
                <option key={mode.id} value={mode.id}>
                  {mode.name}
                </option>
              ))}
            </select>
            <span className="ltc-select-caret">▾</span>
          </div>
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
            {history.length === 0 && <div className="ltc-empty">暂无历史，发送一次提示后生成</div>}
            {history.map((item, index) => {
              const id = item.id || `${index}`;
              const isExpanded = Boolean(expandedItems[id]);
              const hasLongDesc = item.desc && item.desc.length > 80;
              return (
                <div key={id} className={`ltc-history-item ${isExpanded ? 'expanded' : ''}`}>
                  <div className="ltc-history-header">
                    <button
                      className="ltc-history-title"
                      onClick={() => {
                        if (item.url) {
                          window.location.assign(item.url);
                        }
                      }}
                      aria-label="Jump to Gemini conversation"
                    >
                      {item.title}
                    </button>
                    <div className="ltc-history-actions">
                      {hasLongDesc && (
                        <button
                          className="ltc-history-toggle"
                          onClick={() =>
                            setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }))
                          }
                          aria-label="Toggle history detail"
                        >
                          {isExpanded ? '收起' : '展开'}
                        </button>
                      )}
                      <button
                        className="ltc-history-delete"
                        onClick={async () => {
                          await HistoryService.deleteAt(index);
                        }}
                        aria-label="Delete history item"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  <div className="ltc-history-desc">{item.desc}</div>
                  {item.timestamp && (
                    <div className="ltc-history-time">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
