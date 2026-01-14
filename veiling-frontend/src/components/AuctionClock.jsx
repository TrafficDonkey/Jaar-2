// AuctionClock.jsx
// Visuele veilingklok: prijs daalt lineair van maxPrice naar minPrice in durationSeconds.
// Geen eigen backend-calls meer; volledig aangestuurd door props.

import { useEffect, useRef, useState } from "react";
import "./AuctionClockStyle.css";

export default function AuctionClock({
  minPrice,
  maxPrice,
  durationSeconds = 60,
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

  // herstart klok wanneer runId, min, max of duration verandert
  useEffect(() => {
    const initialTop = safeMax;
    const initialBottom = Math.max(safeMax - windowSpan, safeMin);
    segmentTopRef.current = initialTop;
    segmentBottomRef.current = initialBottom;
    setSegmentTop(initialTop);
    setSegmentBottom(initialBottom);
    setCurrentPrice(safeMax);
    onPriceChange?.(safeMax);

    const intervalMs = 100; // elke 0.1 seconde updaten
    const step = intervalMs / 1000;

    let t = safeDuration;
    const id = setInterval(() => {
      t -= step;
      if (t <= 0) {
        setCurrentPrice(safeMin);
        onPriceChange?.(safeMin);
        clearInterval(id);
        onFinished?.();
        return;
      }

      const fraction = (safeDuration - t) / safeDuration; // 0 -> 1
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
    }, intervalMs);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, safeMin, safeMax, safeDuration, windowSpan]);

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
                top: `${(idx / (arr.length - 1 || 1)) * 100}%`,
              }}
            />
          ))}

          <div
            className="progress-line"
            style={{ top: `${progressTop}%` }}
          />
        </div>
      </div>
    </div>
  );
}
