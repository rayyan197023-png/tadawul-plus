'use client';

import React from 'react';

const C = {
  ink: "#06080f",
  layer1: "#141d2b",
  layer2: "#1e2d42",
  layer3: "#243352",
  line: "#32426a",
  smoke: "#90a4c8",
  gold: "#f0c050",
};

/**
 * Skeleton placeholder for content loading
 * Provides better UX than spinners
 */

export const SkeletonBox = React.memo(function SkeletonBox({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8,
  marginBottom = 0,
}) {
  return (
    <>
      <div
        style={{
          width,
          height,
          borderRadius,
          marginBottom,
          background: `linear-gradient(90deg, ${C.layer1} 25%, ${C.layer2} 50%, ${C.layer1} 75%)`,
          backgroundSize: '200% 100%',
          animation: 'skeletonShimmer 1.5s ease-in-out infinite',
        }}
      />
      {/* ✨ الحركة هنا لا في PageSkeleton -- كانت لا تعمل عند الاستخدام المباشر */}
      <style>{`
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
});

SkeletonBox.displayName = 'SkeletonBox';

/**
 * Skeleton for stock card
 */
export const StockCardSkeleton = React.memo(function StockCardSkeleton() {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${C.layer1}, ${C.layer2})`,
        borderRadius: 14,
        border: `1px solid ${C.line}`,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <SkeletonBox width="60%" height={14} marginBottom={6} />
          <SkeletonBox width="80%" height={20} marginBottom={4} />
          <SkeletonBox width="40%" height={12} />
        </div>
        <SkeletonBox width={52} height={52} borderRadius={26} />
      </div>
      <SkeletonBox width="100%" height={36} borderRadius={10} />
    </div>
  );
});

StockCardSkeleton.displayName = 'StockCardSkeleton';

/**
 * Skeleton for chart
 */
export const ChartSkeleton = React.memo(function ChartSkeleton({ height = 200 }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${C.layer1}, ${C.layer2})`,
        borderRadius: 14,
        border: `1px solid ${C.line}`,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <SkeletonBox width="40%" height={16} />
        <SkeletonBox width={60} height={20} borderRadius={20} />
      </div>
      <SkeletonBox width="100%" height={height} borderRadius={8} />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <SkeletonBox width="33%" height={40} borderRadius={8} />
        <SkeletonBox width="33%" height={40} borderRadius={8} />
        <SkeletonBox width="33%" height={40} borderRadius={8} />
      </div>
    </div>
  );
});

ChartSkeleton.displayName = 'ChartSkeleton';

/**
 * Skeleton for portfolio summary
 */
export const PortfolioSummarySkeleton = React.memo(function PortfolioSummarySkeleton() {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${C.layer1}, ${C.layer2})`,
        borderRadius: 16,
        border: `1px solid ${C.line}`,
        padding: 16,
        marginBottom: 12,
      }}
    >
      {/* Header with circle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <SkeletonBox width={68} height={68} borderRadius={34} />
        <div style={{ flex: 1 }}>
          <SkeletonBox width="50%" height={18} marginBottom={6} />
          <SkeletonBox width="70%" height={14} />
        </div>
        <div>
          <SkeletonBox width={80} height={22} marginBottom={4} />
          <SkeletonBox width={60} height={12} />
        </div>
      </div>
      
      {/* Stats grid */}
      <div style={{ display: 'flex', gap: 8 }}>
        <SkeletonBox width="50%" height={50} borderRadius={12} />
        <SkeletonBox width="50%" height={50} borderRadius={12} />
      </div>
    </div>
  );
});

PortfolioSummarySkeleton.displayName = 'PortfolioSummarySkeleton';

/**
 * Generic loading skeleton (use as fallback)
 */
export const PageSkeleton = React.memo(function PageSkeleton() {
  return (
    <div style={{ padding: 16 }}>
      <PortfolioSummarySkeleton />
      <StockCardSkeleton />
      <StockCardSkeleton />
      <StockCardSkeleton />
    </div>
  );
});

PageSkeleton.displayName = 'PageSkeleton';

export default PageSkeleton;
