// AuctionClock.jsx
// Visuele veilingklok: prijs daalt lineair van maxPrice naar minPrice in durationSeconds.
// Geen eigen backend-calls meer; volledig aangestuurd door props.

import { useEffect, useRef, useState } from "react";
import "./AuctionClockStyle.css";
import { toTimeMs } from "../utils/date";

export default function AuctionClock({
  minPrice,
  maxPrice,
  durationSeconds = 60,
  startTime, // ISO string van backend; bepaalt "waar" de klok nu is
  runId, // verander dit getal om de klok opnieuw te starten
  onPriceChange,
  onFinished,
}) {
  const safeMin = Number.isFinite(minPrice) ? minPrice : 0;
  const safeMax =
    Number.isFinite(maxPrice) && maxPrice > safeMin
      ? maxPrice
      : safeMin + 100;
  const safeDuration =
    Number.isFinite(durationSeconds) && durationSeconds > 0
      ? durationSeconds
      : 60;

  const windowSpan = Math.max(safeMax * 0.1, 1);

  const segmentTopRef = useRef(safeMax);
  const segmentBottomRef = useRef(Math.max(safeMax - windowSpan, safeMin));

  const [segmentTop, setSegmentTop] = useState(segmentTopRef.current);
  const [segmentBottom, setSegmentBottom] = useState(
    segmentBottomRef.current
  );

  const [currentPrice, setCurrentPrice] = useState(safeMax);
  const [nowMs, setNowMs] = useState(Date.now());
  const finishedRef = useRef(false);
  const fallbackStartRef = useRef(Date.now());

  const startMs = toTimeMs(startTime);
  const totalMs = safeDuration * 1000;

  useEffect(() => {
    const intervalMs = 100; // elke 0.1 seconde updaten
    const id = setInterval(() => setNowMs(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, []);

  // Reset venster/ticks wanneer inputs veranderen
  useEffect(() => {
    const initialTop = safeMax;
    const initialBottom = Math.max(safeMax - windowSpan, safeMin);
    segmentTopRef.current = initialTop;
    segmentBottomRef.current = initialBottom;
    setSegmentTop(initialTop);
    setSegmentBottom(initialBottom);
    finishedRef.current = false;
    fallbackStartRef.current = Date.now();
  }, [runId, safeMin, safeMax, safeDuration, windowSpan, startTime]);

  // Sync prijs op basis van backend starttijd + client klok.
  useEffect(() => {
    if (finishedRef.current) {
      setCurrentPrice(safeMin);
      return;
    }

    const hasStart = Number.isFinite(startMs);
    const effectiveStartMs = hasStart ? startMs : fallbackStartRef.current;

    const elapsedMs = nowMs - effectiveStartMs;
    const fraction =
      totalMs <= 0 ? 1 : Math.min(1, Math.max(0, elapsedMs / totalMs));
    const price = safeMax - (safeMax - safeMin) * fraction;

    setCurrentPrice(price);
    onPriceChange?.(price);

    if (
      price <= segmentBottomRef.current &&
      segmentBottomRef.current > safeMin
    ) {
      const newTop = segmentBottomRef.current;
      const newBottom = Math.max(newTop - windowSpan, safeMin);
      segmentTopRef.current = newTop;
      segmentBottomRef.current = newBottom;
      setSegmentTop(newTop);
      setSegmentBottom(newBottom);
    }

    if (fraction >= 1 && !finishedRef.current) {
      finishedRef.current = true;
      onFinished?.();
    }
  }, [nowMs, safeMax, safeMin, totalMs, startMs, windowSpan, onPriceChange, onFinished]);

  const generateTicks = (min, max, num = 10) => {
    if (!Number.isFinite(min) || !Number.isFinite(max) || num < 2) {
      return [];
    }
    const step = (max - min) / (num - 1 || 1);
    return Array.from({ length: num }, (_, i) =>
      (max - i * step).toFixed(2)
    );
  };

  const priceTicks = generateTicks(segmentBottom, segmentTop, 10);

  let progressTop = 0;
  if (segmentTop > segmentBottom) {
    const clamped = Math.min(
      segmentTop,
      Math.max(currentPrice, segmentBottom)
    );
    progressTop =
      ((segmentTop - clamped) / (segmentTop - segmentBottom)) * 100;
  }

  return (
    <div className="auction-container">
      <div className="auction-card">
        <h2>Veilingklok</h2>

        <div className="auction-status">
          <p>Huidige prijs: EUR {currentPrice.toFixed(2)}</p>
        </div>
      </div>

      <div className="auction-rectangle-container">
        <div className="price-axis">
          {priceTicks.map((p, idx) => (
            <span key={idx}>EUR {p}</span>
          ))}
        </div>

        <div className="auction-rectangle">
          {priceTicks.map((_, idx, arr) => (
            <div
              key={idx}
              className="tick-line"
              style={{
                "--tick-top": `${(idx / (arr.length - 1 || 1)) * 100}%`,
              }}
            />
          ))}

          <div
            className="progress-line"
            style={{ "--progress-top": `${progressTop}%` }}
          />
        </div>
      </div>
    </div>
  );
}
