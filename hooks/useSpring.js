'use client';
/**
 * useSpring — Physics-based spring animation hook
 *
 * Extracted from TadawulNav_v9.jsx
 * Permanent RAF loop, zero restarts, onSettle callback.
 *
 * @param {number} target
 * @param {{ stiffness?, damping?, mass?, onSettle? }} options
 * @returns {number} animated value
 */

import { useState, useEffect, useRef } from 'react';

export function useSpring(target, {
  stiffness = 320,
  damping   = 28,
  mass      = 1,
  onSettle,
} = {}) {
  const val       = useRef(target);
  const vel       = useRef(0);
  const raf       = useRef(null);
  const lastTs    = useRef(null);
  const targetRef = useRef(target);
  const settleRef = useRef(onSettle);
  const [disp, setDisp] = useState(target);

  useEffect(() => { settleRef.current = onSettle; }, [onSettle]);
  useEffect(() => { targetRef.current = target;   }, [target]);

  const tick = useRef(null);
  useEffect(() => {
    tick.current = (ts) => {
      const dt = lastTs.current
        ? Math.min((ts - lastTs.current) / 1000, 0.064)
        : 1 / 60;
      lastTs.current = ts;
      const t     = targetRef.current;
      const dx    = val.current - t;
      const force = -stiffness * dx - damping * vel.current;
      vel.current += (force / mass) * dt;
      val.current += vel.current * dt;
      const maxVel = Math.abs(t - val.current) * 60;
      if (Math.abs(vel.current) > maxVel) vel.current *= 0.85;
      if (
        Math.abs(val.current - t) < 0.004 &&
        Math.abs(vel.current)     < 0.004
      ) {
        val.current  = t;
        vel.current  = 0;
        lastTs.current = null;
        raf.current    = null;
        setDisp(t);
        settleRef.current?.();
        return;
      }
      setDisp(val.current);
      raf.current = requestAnimationFrame(tick.current);
    };
  }, [stiffness, damping, mass]);

  useEffect(() => {
    if (
      Math.abs(val.current - target) < 0.004 &&
      Math.abs(vel.current)          < 0.004
    ) return;
    if (!raf.current) {
      lastTs.current = null;
      raf.current    = requestAnimationFrame(tick.current);
    }
  }, [target]);

  useEffect(() => {
    raf.current = requestAnimationFrame(tick.current);
    return () => {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    };
  }, []); // eslint-disable-line

  return disp;
}
