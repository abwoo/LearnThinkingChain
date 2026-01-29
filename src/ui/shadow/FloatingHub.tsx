/**
 * Floating Hub - 浮动控制中心
 * 
 * React component for Shadow DOM UI
 */

import React, { useState, useEffect } from 'react';
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
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
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
      </div>
    </div>
  );
};
