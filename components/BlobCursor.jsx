'use client';

import { useCallback, useEffect, useRef } from 'react';
import gsap from 'gsap';

// React Bits' Blob Cursor, mounted as a global click-through layer so it can
// follow the pointer while remaining a sibling of the routed application.
export default function BlobCursor({
  blobType = 'circle',
  fillColor = '#5227FF',
  trailCount = 3,
  sizes = [60, 125, 75],
  innerSizes = [20, 35, 25],
  innerColor = 'rgba(255,255,255,0.8)',
  opacities = [0.6, 0.6, 0.6],
  shadowColor = 'rgba(0,0,0,0.75)',
  shadowBlur = 5,
  shadowOffsetX = 10,
  shadowOffsetY = 10,
  filterId = 'global-blob-cursor',
  filterStdDeviation = 30,
  filterColorMatrixValues = '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 35 -10',
  useFilter = true,
  fastDuration = 0.1,
  slowDuration = 0.5,
  fastEase = 'power3.out',
  slowEase = 'power1.out',
  zIndex = 100
}) {
  const containerRef = useRef(null);
  const blobsRef = useRef([]);

  const updateOffset = useCallback(() => {
    if (!containerRef.current) return { left: 0, top: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return { left: rect.left, top: rect.top };
  }, []);

  const handleMove = useCallback(
    event => {
      const point = 'clientX' in event ? event : event.touches?.[0];
      if (!point) return;

      if (containerRef.current) containerRef.current.style.opacity = '1';

      const { left, top } = updateOffset();
      blobsRef.current.forEach((element, index) => {
        if (!element) return;
        const isLead = index === 0;
        gsap.to(element, {
          x: point.clientX - left,
          y: point.clientY - top,
          duration: isLead ? fastDuration : slowDuration,
          ease: isLead ? fastEase : slowEase,
          overwrite: 'auto'
        });
      });
    },
    [updateOffset, fastDuration, slowDuration, fastEase, slowEase]
  );

  useEffect(() => {
    const onResize = () => updateOffset();
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', handleMove, { passive: true });

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', handleMove);
      gsap.killTweensOf(blobsRef.current.filter(Boolean));
    };
  }, [handleMove, updateOffset]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      data-cursor-effect="blob"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex, opacity: 0, transition: 'opacity 120ms ease-out' }}
    >
      {useFilter && (
        <svg aria-hidden="true" className="absolute h-0 w-0">
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation={filterStdDeviation} />
            <feColorMatrix in="blur" values={filterColorMatrixValues} />
          </filter>
        </svg>
      )}

      <div
        className="pointer-events-none absolute inset-0 select-none overflow-hidden"
        style={{ filter: useFilter ? `url(#${filterId})` : undefined }}
      >
        {Array.from({ length: trailCount }).map((_, index) => (
          <div
            key={index}
            ref={element => {
              blobsRef.current[index] = element;
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 transform will-change-transform"
            style={{
              width: sizes[index],
              height: sizes[index],
              borderRadius: blobType === 'circle' ? '50%' : '0',
              backgroundColor: fillColor,
              opacity: opacities[index],
              boxShadow: `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px 0 ${shadowColor}`
            }}
          >
            <div
              className="absolute"
              style={{
                width: innerSizes[index],
                height: innerSizes[index],
                top: (sizes[index] - innerSizes[index]) / 2,
                left: (sizes[index] - innerSizes[index]) / 2,
                backgroundColor: innerColor,
                borderRadius: blobType === 'circle' ? '50%' : '0'
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
