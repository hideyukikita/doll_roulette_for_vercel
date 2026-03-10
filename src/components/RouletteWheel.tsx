"use client";

import { useEffect, useState, useRef } from "react";
import type { Doll } from "@/types/doll";
import { getDollFillColor, getDollSegmentTextColor } from "@/utils/colors";

const SPIN_DURATION_MS = 2500;
const WHEEL_SIZE = 280;

interface RouletteWheelProps {
  dolls: Doll[];
  winnerId: string | null;
  spinning: boolean;
  onSpinComplete?: () => void;
}

export default function RouletteWheel({ dolls, winnerId, spinning, onSpinComplete }: RouletteWheelProps) {
  const [rotation, setRotation] = useState(0);
  const onSpinCompleteRef = useRef(onSpinComplete);
  onSpinCompleteRef.current = onSpinComplete;

  useEffect(() => {
    if (!spinning || dolls.length === 0 || !winnerId) return;
    const winnerIndex = Math.max(0, dolls.findIndex((d) => d.id === winnerId));
    const n = dolls.length;
    const segmentAngle = 360 / n;
    const randomOffset = (Math.random() - 0.5) * segmentAngle * 0.8;
    const finalRotation = 6 * 360 - winnerIndex * segmentAngle - segmentAngle / 2 - randomOffset;
    const startTime = Date.now();
    const startRotation = rotation % 360;
    let completed = false;
    const callComplete = () => {
      if (!completed) {
        completed = true;
        onSpinCompleteRef.current?.();
      }
    };
    const timer = requestAnimationFrame(function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / SPIN_DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + (finalRotation - startRotation) * eased;
      setRotation(currentRotation);
      if (progress < 1) requestAnimationFrame(animate);
      else callComplete();
    });
    const fallbackTimer = setTimeout(callComplete, SPIN_DURATION_MS + 200);
    return () => {
      cancelAnimationFrame(timer);
      clearTimeout(fallbackTimer);
    };
  }, [spinning, winnerId]);

  if (dolls.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-stone-400">
        回すと選ばれるよ
      </div>
    );
  }

  const segmentAngle = 360 / dolls.length;
  const radius = WHEEL_SIZE / 2 - 4;
  const fullCircleRadius = WHEEL_SIZE / 2;

  return (
    <div className="relative my-6 inline-block">
      <div
        className="absolute z-20 h-0 w-0"
        style={{
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          borderLeft: "16px solid transparent",
          borderRight: "16px solid transparent",
          borderTop: "48px solid #f472b6",
        }}
      />
      <div
        className="absolute z-20 h-5 w-5 rounded-full border-2 border-white bg-pink-400"
        style={{ top: 42, left: "50%", transform: "translateX(-50%)" }}
      />
      <div
        className="relative overflow-hidden rounded-full shadow-lg"
        style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
      >
        <svg
          width={WHEEL_SIZE}
          height={WHEEL_SIZE}
          viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
          style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? "none" : "transform 0.1s linear" }}
        >
          <g transform={`translate(${WHEEL_SIZE / 2}, ${WHEEL_SIZE / 2})`}>
            {dolls.map((doll, i) => {
              const startAngle = (i * segmentAngle - 90) * (Math.PI / 180);
              const endAngle = ((i + 1) * segmentAngle - 90) * (Math.PI / 180);
              const x1 = radius * Math.cos(startAngle);
              const y1 = radius * Math.sin(startAngle);
              const x2 = radius * Math.cos(endAngle);
              const y2 = radius * Math.sin(endAngle);
              const largeArc = segmentAngle > 180 ? 1 : 0;
              const path = `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
              const midAngle = dolls.length === 1 ? 0 : (i * segmentAngle + segmentAngle / 2 - 90) * (Math.PI / 180);
              const labelRadius = radius * 0.65;
              const labelX = labelRadius * Math.cos(midAngle);
              const labelY = labelRadius * Math.sin(midAngle);
              const textRotation = dolls.length === 1 ? 0 : i * segmentAngle + segmentAngle / 2 - 90 + (labelY > 0 ? 180 : 0);
              const fillColor = getDollFillColor(doll.color);
              return (
                <g key={doll.id}>
                  {dolls.length === 1 ? (
                    <circle cx="0" cy="0" r={fullCircleRadius} fill={fillColor} stroke="#fafaf9" strokeWidth="2" />
                  ) : (
                    <path d={path} fill={fillColor} stroke="#fafaf9" strokeWidth="2" />
                  )}
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${textRotation}, ${labelX}, ${labelY})`}
                    fontSize={Math.max(10, 18 - dolls.length)}
                    fontWeight="bold"
                    fill={getDollSegmentTextColor(doll.color)}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {doll.name.length > 8 ? `${doll.name.slice(0, 7)}…` : doll.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
