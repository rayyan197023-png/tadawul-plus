'use client';
import React from 'react';
import Tooltip from '../Tooltip';
import { ArcRing, StoryChart, C, getKsaMarket } from './AnalysisHelpers';
import { scoreWord } from '../../engines/analysisEngine';
import { calcSmartStopLoss, calcSmartTakeProfit } from '../../engines/positionEngine';
import { shareStockCard } from '../../utils/shareStockCard';

export default function StockCard({
  stk, bars, health, isRealData, idx,
  selected, isFlashing, globalRank,
  allData, discovered,
  onCardClick, onFullAnalysis, haptic
}) {
              const up=stk.ch>=0;
              const priceColor=up?C.mint:C.coral;
              const globalRankSafe = globalRank || 1;

