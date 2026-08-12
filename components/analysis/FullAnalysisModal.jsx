'use client';
import React from 'react';
import Tooltip from '../Tooltip';
import { LayerIcon, C } from './AnalysisHelpers';
import { scoreWord } from '../../engines/analysisEngine';
import { STOCKS_LIVE as STOCKS } from '../../constants/stocksData';

export default function FullAnalysisModal({ sym, onClose, allData, liveStocks, haptic }) {
  const fullAnalysis = sym;
  if(!fullAnalysis) return null;
  const fd = allData.find(d=>d.stk.sym===fullAnalysis);
  if(!fd) return null;
  const {stk, bars, health} = fd;
  const up = stk.ch>=0;
  const pC = up?C.mint:C.coral;

  const {L1=0,L2=0,L3=0,L4=0,L5=0,L6=0,L7=0,L8=0,L9=0} = health.layers || {};
  const ex = health.extras || {};

  const lc = v => v>=70?C.mint:v>=50?C.amber:C.coral;

