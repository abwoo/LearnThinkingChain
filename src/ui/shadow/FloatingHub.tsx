/**
 * Floating Hub - 浮动控制中心
 * 
 * React component for Shadow DOM UI
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { ProtocolMap } from '../../types/Protocols';
import type { FrameworkEntry } from '../../core/services/FrameworkService';

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
  isActive: _isActive,
  currentMode: _currentMode,
  modes: _modes,
  protocols: _protocols,
  onToggleActive: _onToggleActive,
  onModeChange: _onModeChange,
  status
}) => {
  const [expanded] = useState(true);
  const [frameworks, setFrameworks] = useState<FrameworkEntry[]>([]);
  const hubRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const normalizeFrameworks = (items: unknown): FrameworkEntry[] => {
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const data = item as Partial<FrameworkEntry>;
        if (typeof data.name !== 'string') return null;
        return {
          id: typeof data.id === 'string' ? data.id : `fw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: data.name,
          created_at: typeof data.created_at === 'number' ? data.created_at : Date.now()
        };
      })
      .filter((item): item is FrameworkEntry => Boolean(item));
  };

  useEffect(() => {
    const load = async () => {
      const data = await chrome.storage.local.get([
        'ltc_frameworks',
        'ltc_hub_position'
      ]);
      setFrameworks(normalizeFrameworks(data.ltc_frameworks));
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
      if (changes.ltc_frameworks) {
        setFrameworks(normalizeFrameworks(changes.ltc_frameworks.newValue));
      }
      if (changes.ltc_hub_position) {
        const pos = changes.ltc_hub_position.newValue;
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
          setPosition({ x: pos.x, y: pos.y });
        }
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

  useEffect(() => {
    if (!hubRef.current) return;
    hubRef.current.style.left = `${position.x}px`;
    hubRef.current.style.top = `${position.y}px`;
    hubRef.current.style.right = 'auto';
  }, [position.x, position.y]);

  const frameworkPreview = useMemo(() => {
    if (!frameworks.length) return '尚未添加框架';
    return frameworks.map((item) => `• ${item.name}`).join('\n');
  }, [frameworks]);

  return (
    <div className="ltc-hub" ref={hubRef}>
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
        {status && (
          <div className={`ltc-status ${status.type}`}>
            {status.message}
          </div>
        )}
      </div>

      {expanded && (
        <div className="ltc-panel">
          <div className="ltc-section-title">我的框架</div>
          <pre className="ltc-protocol">{frameworkPreview}</pre>
          <div className="ltc-empty">在看板中新增/删除框架</div>
        </div>
      )}
    </div>
  );
};
