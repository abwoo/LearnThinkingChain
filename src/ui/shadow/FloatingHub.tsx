/**
 * Floating Hub - 浮动控制中心
 * 
 * React component for Shadow DOM UI
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { ProtocolMap } from '../../types/Protocols';
import type { HistoryEntry } from '../../core/services/HistoryService';
import type { CustomFramework } from '../../messaging/Types';

export interface FloatingHubProps {
  isActive: boolean;
  currentMode: string;
  modes: Array<{ id: string; name: string }>;
  protocols?: ProtocolMap;
  customFrameworks?: CustomFramework[];
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
  customFrameworks: propFrameworks,
  onToggleActive,
  onModeChange,
  status
}) => {
  const [expanded, setExpanded] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [protocols, setProtocols] = useState<Record<string, Record<string, string>>>({});
  const [customFrameworks, setCustomFrameworks] = useState<CustomFramework[]>([]);
  const [profileTrend, setProfileTrend] = useState<string>('');
  const hubRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const normalizeHistory = (items: unknown): HistoryEntry[] => {
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const data = item as Partial<HistoryEntry>;
        if (typeof data.title !== 'string' || typeof data.desc !== 'string') return null;
        return {
          id: typeof data.id === 'string' ? data.id : `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          title: data.title,
          desc: data.desc,
          created_at: typeof data.created_at === 'number' ? data.created_at : Date.now()
        };
      })
      .filter((item): item is HistoryEntry => Boolean(item));
  };

  useEffect(() => {
    const load = async () => {
      const data = await chrome.storage.local.get([
        'ltc_last_thinking_steps',
        'ltc_protocols',
        'ltc_profile',
        'ltc_hub_position',
        'ltc_custom_frameworks'
      ]);
      setHistory(normalizeHistory(data.ltc_last_thinking_steps));
      const storedProtocols = typeof data.ltc_protocols === 'object' && data.ltc_protocols ? data.ltc_protocols : {};
      setProtocols(storedProtocols as Record<string, Record<string, string>>);
      const trend = data.ltc_profile?.thinking_trend;
      setProfileTrend(typeof trend === 'string' ? trend : '');
      if (Array.isArray(data.ltc_custom_frameworks)) {
        setCustomFrameworks(data.ltc_custom_frameworks);
      }
      const pos = data.ltc_hub_position;
      if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
        setPosition({ x: pos.x, y: pos.y });
      } else {
        requestAnimationFrame(() => {
          const rect = hubRef.current?.getBoundingClientRect();
          const width = rect?.width ?? 320;
          const x = Math.max(20, window.innerWidth - width - 20);
          setPosition({ x, y: 20 });
        });
      }
    };
    load();

    const onChanged = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.ltc_last_thinking_steps) {
        setHistory(normalizeHistory(changes.ltc_last_thinking_steps.newValue));
      }
      if (changes.ltc_protocols) {
        const next = changes.ltc_protocols.newValue;
        setProtocols(typeof next === 'object' && next ? next : {});
      }
      if (changes.ltc_profile) {
        const trend = changes.ltc_profile.newValue?.thinking_trend;
        setProfileTrend(typeof trend === 'string' ? trend : '');
      }
      if (changes.ltc_hub_position) {
        const pos = changes.ltc_hub_position.newValue;
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
          setPosition({ x: pos.x, y: pos.y });
        }
      }
      if (changes.ltc_custom_frameworks) {
        setCustomFrameworks(Array.isArray(changes.ltc_custom_frameworks.newValue)
          ? changes.ltc_custom_frameworks.newValue
          : []);
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setPosition(prev => {
        const rect = hubRef.current?.getBoundingClientRect();
        const width = rect?.width ?? 320;
        const height = rect?.height ?? 140;
        const maxX = Math.max(0, window.innerWidth - width);
        const maxY = Math.max(0, window.innerHeight - height);
        const nextX = Math.min(maxX, Math.max(0, prev.x + deltaX));
        const nextY = Math.min(maxY, Math.max(0, prev.y + deltaY));
        return { x: nextX, y: nextY };
      });

      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      chrome.storage.local.set({
        ltc_hub_position: {
          x: position.x,
          y: position.y
        }
      });
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, position.x, position.y]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const containerStyle: React.CSSProperties = {
    left: position.x,
    top: position.y,
    right: 'auto'
  };

  const protocolPreview = useMemo(() => {
    const source = propProtocols ?? protocols;
    const p = source[currentMode] || {};
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
  }, [protocols, propProtocols, currentMode]);

  const frameworkList = useMemo(() => {
    return (propFrameworks ?? customFrameworks).slice(0, 6);
  }, [propFrameworks, customFrameworks]);

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
            {history.map((item, index) => (
              <div key={`${item.title}-${index}`} className="ltc-history-item">
                <strong>{item.title}</strong>
                <span>{item.desc}</span>
              </div>
            ))}
          </div>

          <div className="ltc-section-title">CUSTOM FRAMEWORKS</div>
          <div className="ltc-history-list">
            {frameworkList.length === 0 && <div className="ltc-empty">暂无自定义框架</div>}
            {frameworkList.map((item) => (
              <div key={item.id} className="ltc-history-item">
                <strong>{item.name}</strong>
                <span>{item.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
