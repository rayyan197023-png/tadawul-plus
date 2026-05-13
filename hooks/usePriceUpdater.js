'use client';
import { useEffect } from 'react';
import { useStockDispatch } from '../store/stockStore';

export function usePriceUpdater() {
  const dispatch = useStockDispatch();

  useEffect(() => {
    alert('usePriceUpdater mounted!');
  }, []);
}
