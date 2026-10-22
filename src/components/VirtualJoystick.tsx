import React, { useRef, useState, useCallback, useEffect } from 'react';

interface VirtualJoystickProps {
  onMove: (x: number, z: number) => void;
  onAim?: (angle: number) => void;
  disabled?: boolean;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  onAim,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const maxRadiusRef = useRef(36);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || touchIdRef.current !== null) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    touchIdRef.current = e.pointerId;
    setActive(true);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      maxRadiusRef.current = Math.max(18, rect.width / 2 - 28);
      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }

    processPointer(e.clientX, e.clientY);
  };

  const processPointer = useCallback(
    (clientX: number, clientY: number) => {
      const dx = clientX - centerRef.current.x;
      const dy = clientY - centerRef.current.y;
      const dist = Math.hypot(dx, dy);
      const maxRadius = maxRadiusRef.current;

      if (dist === 0) {
        setKnobPos({ x: 0, y: 0 });
        onMove(0, 0);
        return;
      }

      const clampedDist = Math.min(dist, maxRadius);
      const angle = Math.atan2(dy, dx);
      const clampedX = Math.cos(angle) * clampedDist;
      const clampedY = Math.sin(angle) * clampedDist;

      setKnobPos({ x: clampedX, y: clampedY });

      // Normalized vector (-1 to 1)
      const normX = clampedX / maxRadius;
      const normZ = clampedY / maxRadius;
      onMove(normX, normZ);

      if (onAim) {
        onAim(angle);
      }
    },
    [onMove, onAim]
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (touchIdRef.current !== e.pointerId) return;
    processPointer(e.clientX, e.clientY);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (touchIdRef.current !== e.pointerId) return;
    touchIdRef.current = null;
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    onMove(0, 0);
  };

  useEffect(() => {
    return () => {
      onMove(0, 0);
    };
  }, [onMove]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-zinc-950/70 border-2 border-amber-500/40 backdrop-blur-xs flex items-center justify-center select-none touch-none shadow-2xl pointer-events-auto"
      style={{ touchAction: 'none' }}
    >
      {/* Outer directional ticks */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
        <div className="w-1 h-full bg-amber-500/30" />
        <div className="h-1 w-full bg-amber-500/30 absolute" />
      </div>

      {/* Center base mark */}
      <div className="w-6 h-6 rounded-full border border-amber-500/30 bg-zinc-900/60 pointer-events-none" />

      {/* Draggable Stick Knob */}
      <div
        className={`absolute w-14 h-14 rounded-full border-2 transition-colors duration-75 flex items-center justify-center pointer-events-none ${
          active
            ? 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-200 shadow-lg shadow-amber-500/60 scale-105'
            : 'bg-zinc-800/90 border-amber-500/60 shadow-md'
        }`}
        style={{
          transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
        }}
      >
        <span className="text-zinc-950 text-xs font-pixel font-bold">
          {active ? '●' : '✦'}
        </span>
      </div>
    </div>
  );
};
