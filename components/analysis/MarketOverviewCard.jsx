'use client';
import React from 'react';
import { C } from './AnalysisHelpers';
import { scoreWord } from '../../engines/analysisEngine';

export default function MarketOverviewCard({ allData, signalCounts, marketAverages, sortedByScore }) {
            const totalN     = allData.length;
            const buyN       = signalCounts.buy;
            const watchN     = signalCounts.watch;
            const reduceN    = signalCounts.reduce;
            const noSigN     = signalCounts.neutral;
            const avgHealth  = marketAverages.health;
            const avgConf    = marketAverages.conf;
            const avgRadar   = marketAverages.radar;
            const mktLabel   = "المؤشر العام";
            
 
