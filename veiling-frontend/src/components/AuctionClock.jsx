// AuctionClock.jsx
// Visuele veilingklok: prijs daalt lineair van maxPrice naar minPrice in durationSeconds.
// Geen eigen backend-calls meer; volledig aangestuurd door props.

import { useEffect, useState } from "react";
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

  const [timeRemaining, setTimeRemaining] = useState(safeDuration);
  const [currentPrice, setCurrentPrice] = useState(safeMax);

  // herstart klok wanneer runId, min, max of duration verandert
  useEffect(() => {
    setTimeRemaining(safeDuration);
    setCurrentPrice(safeMax);
    onPriceChange?.(safeMax);

    const intervalMs = 100; // elke 0.1 seconde updaten
    const step = intervalMs / 1000;

    let t = safeDuration;
    const id = setInterval(() => {
      t -= step;
      if (t <= 0) {
        setTimeRemaining(0);
        setCurrentPrice(safeMin);
        onPriceChange?.(safeMin);
        clearInterval(id);
        onFinished?.();
        return;
      }

      const fraction = (safeDuration - t) / safeDuration; // 0 → 1
      const price =
        safeMax - (safeMax - safeMin) * fraction;

      setTimeRemaining(t);
      setCurrentPrice(price);
      onPriceChange?.(price);
    }, intervalMs);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, safeMin, safeMax, safeDuration]);

  const generateTicks = (min, max, num = 10) => {
    if (!Number.isFinite(min) || !Number.isFinite(max) || num < 2) {
      return [];
    }
    const step = (max - min) / (num - 1 || 1);
    return Array.from({ length: num }, (_, i) =>
      (max - i * step).toFixed(2)
    );
  };

  const priceTicks = generateTicks(safeMin, safeMax, 10);
  const timeTicks = generateTicks(0, safeDuration, 10);

  let progressTop = 0;
  if (safeMax > safeMin) {
    progressTop =
      ((safeMax - currentPrice) / (safeMax - safeMin)) * 100;
  }

  return (
    <div className="auction-container">
      <div className="auction-card">
        <h2>Veilingklok</h2>

        <div className="auction-status">
          <p>Huidige prijs: €{currentPrice.toFixed(2)}</p>
          <p>
            Tijd resterend: {Math.max(0, timeRemaining).toFixed(1)}s
          </p>
        </div>
      </div>

      <div className="auction-rectangle-container">
        <div className="price-axis">
          {priceTicks.map((p, idx) => (
            <span key={idx}>€{p}</span>
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

        <div className="time-axis">
          {timeTicks.map((t, idx) => (
            <span key={idx}>{t}s</span>
          ))}
        </div>
      </div>
    </div>
  );
}
