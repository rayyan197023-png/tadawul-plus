'use client';
import React from 'react';
import { SignalsPanel, C } from './AnalysisHelpers';
import { scoreWord } from '../../engines/analysisEngine';

export default function SignalsPage({
  allData, filtered2, filters, setFilters,
  screenerOpen, setScreenerOpen, sectorList,
  onBack, haptic
}) {
  return (
        <div style={{padding:"90px 20px 90px",position:"relative",zIndex:1}}>

