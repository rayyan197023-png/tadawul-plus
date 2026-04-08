'use client';
/**
 * @module hooks/usePullToRefresh
 * @description سحب للتحديث — Pull to Refresh للقوائم
 * 
 * يستمع لـ touch events ويُطلق onRefresh عند السحب ≥ 60px لأسفل
 * 
 * @param {Function} onRefresh - callback عند التحديث
 * @param {number} threshold - عتبة السحب بالبكسل (افتراضي: 60)
 * @returns {{ containerRef, isPulling, pullProgress, isRefreshing }}
 */

import { useRef, useState, useCallback } from 'react';

export function usePullToRefresh(onRefresh, threshold = 60) {
  const containerRef  = useRef(null);
  const startYRef     = useRef(0);
  const [isPulling,   setIsPulling]   = useState(false);
  const [pullDist,    setPullDist]    = useState(0);
  const [isRefreshing,setIsRefreshing]= useState(false);

  const onTouchStart = useCallback((e) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return; // فقط عند أعلى القائمة
    startYRef.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!startYRef.current) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;

    const dist = e.touches[0].clientY - startYRef.current;
    if (dist < 0) return; // سحب لأعلى — تجاهل

    setIsPulling(true);
    setPullDist(Math.min(dist, threshold * 1.5));
    if (dist > 5) e.preventDefault(); // منع scroll العادي
  }, [threshold]);

  const onTouchEnd = useCallback(() => {
    if (pullDist >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDist(0);
      setIsPulling(false);
      Promise.resolve(onRefresh()).finally(() => {
        setIsRefreshing(false);
      });
    } else {
      setIsPulling(false);
      setPullDist(0);
    }
    startYRef.current = 0;
  }, [pullDist, threshold, isRefreshing, onRefresh]);

  const pullProgress = Math.min(pullDist / threshold, 1);

  return {
    containerRef,
    isPulling,
    pullProgress,
    isRefreshing,
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
