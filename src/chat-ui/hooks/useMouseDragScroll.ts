"use client";

import React from "react";

export function useMouseDragScroll() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  React.useEffect(() => {
    const slider = ref.current;
    if (!slider) return;

    let isDown = false;
    let activePointerId: number | null = null;
    let lastClientX = 0;
    let dragStartX = 0;
    let didDrag = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchLock: "x" | "y" | null = null;
    let rafId: number | null = null;
    let pendingDeltaX = 0;
    const DRAG_START_THRESHOLD_PX = 6;

    const setGrabCursor = (grabbing: boolean) => {
      slider.classList.toggle("cursor-grabbing", grabbing);
      slider.classList.toggle("cursor-grab", !grabbing);
    };

    const flushPendingDelta = () => {
      if (pendingDeltaX !== 0) {
        slider.scrollLeft -= pendingDeltaX;
        pendingDeltaX = 0;
      }
      rafId = null;
    };

    const queueDelta = (deltaX: number) => {
      pendingDeltaX += deltaX;
      if (rafId === null) {
        rafId = window.requestAnimationFrame(flushPendingDelta);
      }
    };

    const startDrag = (clientX: number, pointerId: number | null = null) => {
      isDown = true;
      activePointerId = pointerId;
      lastClientX = clientX;
      dragStartX = clientX;
      didDrag = false;
    };

    const markDragging = () => {
      setIsDragging((prev) => (prev ? prev : true));
      setGrabCursor(true);
    };

    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      activePointerId = null;
      touchLock = null;
      setIsDragging(false);
      didDrag = false;
      setGrabCursor(false);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (pendingDeltaX !== 0) {
        slider.scrollLeft -= pendingDeltaX;
        pendingDeltaX = 0;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      startDrag(e.clientX, e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown || activePointerId !== e.pointerId) return;
      const dxFromStart = e.clientX - dragStartX;
      if (!didDrag) {
        if (Math.abs(dxFromStart) < DRAG_START_THRESHOLD_PX) return;
        didDrag = true;
        slider.setPointerCapture(e.pointerId);
        markDragging();
      }
      e.preventDefault();
      const deltaX = e.clientX - lastClientX;
      lastClientX = e.clientX;
      queueDelta(deltaX);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (activePointerId !== e.pointerId) return;
      if (slider.hasPointerCapture(e.pointerId)) {
        slider.releasePointerCapture(e.pointerId);
      }
      endDrag();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchLock = null;
      startDrag(e.touches[0].clientX);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDown || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dxFromStart = touch.clientX - touchStartX;
      const dyFromStart = touch.clientY - touchStartY;

      if (touchLock === null) {
        if (Math.abs(dxFromStart) >= 6 || Math.abs(dyFromStart) >= 6) {
          touchLock = Math.abs(dxFromStart) > Math.abs(dyFromStart) ? "x" : "y";
        } else {
          return;
        }
      }

      if (touchLock === "y") {
        endDrag();
        return;
      }

      if (!didDrag) {
        if (Math.abs(dxFromStart) < DRAG_START_THRESHOLD_PX) return;
        didDrag = true;
        markDragging();
      }

      const deltaX = e.touches[0].clientX - lastClientX;
      lastClientX = e.touches[0].clientX;
      queueDelta(deltaX);
      e.preventDefault();
    };

    const supportsPointer = "PointerEvent" in window;
    if (supportsPointer) {
      slider.addEventListener("pointerdown", onPointerDown);
      slider.addEventListener("pointermove", onPointerMove);
      slider.addEventListener("pointerup", onPointerUp);
      slider.addEventListener("pointercancel", onPointerUp);
      window.addEventListener("pointerup", endDrag);
      window.addEventListener("pointercancel", endDrag);
    }
    slider.addEventListener("touchstart", onTouchStart, { passive: true });
    slider.addEventListener("touchmove", onTouchMove, { passive: false });
    slider.addEventListener("touchend", endDrag);
    slider.addEventListener("touchcancel", endDrag);

    return () => {
      if (supportsPointer) {
        slider.removeEventListener("pointerdown", onPointerDown);
        slider.removeEventListener("pointermove", onPointerMove);
        slider.removeEventListener("pointerup", onPointerUp);
        slider.removeEventListener("pointercancel", onPointerUp);
        window.removeEventListener("pointerup", endDrag);
        window.removeEventListener("pointercancel", endDrag);
      }
      slider.removeEventListener("touchstart", onTouchStart);
      slider.removeEventListener("touchmove", onTouchMove);
      slider.removeEventListener("touchend", endDrag);
      slider.removeEventListener("touchcancel", endDrag);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return { ref, isDragging };
}
