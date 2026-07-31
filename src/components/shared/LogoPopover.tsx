import { useState } from "react";
import { createPortal } from "react-dom";

interface LogoPopoverProps {
  className?: string;
}

const POPUP_SIZE = 176; // h-44 w-44 = 176px + padding

export function LogoPopover({ className = "h-20 w-auto" }: LogoPopoverProps) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  function handleMouseEnter(e: React.MouseEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const popupW = POPUP_SIZE + 24; // image + padding

    // Center horizontally on logo, clamp within viewport
    let x = r.left + r.width / 2 - popupW / 2;
    x = Math.max(8, Math.min(x, window.innerWidth - popupW - 8));

    // Below logo, but flip above if not enough space
    let y = r.bottom + 8;
    if (y + POPUP_SIZE + 24 > window.innerHeight) {
      y = r.top - POPUP_SIZE - 32;
    }

    setPos({ x, y });
    setShow(true);
  }

  return (
    <div
      className="relative inline-flex cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      <img src="/image.png" alt="VibeNests Logo" className={className} />

      {show && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ left: pos.x, top: pos.y }}
        >
          <div className="glass-card rounded-2xl border border-[var(--gold)]/25 p-3 shadow-2xl">
            <img src="/image.png" alt="VibeNests Logo" className="h-44 w-44 object-contain" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
