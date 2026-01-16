import { useEffect, useRef } from "react";
import "./NeuralSphere.css";

export default function NeuralSphere({ className = "", style }) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  const nodesRef = useRef([]);
  const connectionsRef = useRef([]);
  const rotationRef = useRef(0);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;

    const readVar = (name, fallback) => {
      const v = getComputedStyle(wrapper).getPropertyValue(name)?.trim();
      return v || fallback;
    };

    const palette = {
      line: readVar("--ns-line", "rgba(20, 83, 45, 0.14)"),
      node: readVar("--ns-node", "rgba(20, 83, 45, 0.22)"),
      nodeDim: readVar("--ns-node-dim", "rgba(15, 23, 42, 0.35)"),
      glow: readVar("--ns-glow", "#e1c17a"),
    };

    const latLines = 12;
    const lonLines = 16;

    const generateNodes = () => {
      const nodes = [];
      for (let lat = 0; lat <= latLines; lat++) {
        const theta = (lat * Math.PI) / latLines;
        for (let lon = 0; lon < lonLines; lon++) {
          const phi = (lon * 2 * Math.PI) / lonLines;
          nodes.push({
            lat,
            lon,
            unit: {
              x: Math.sin(theta) * Math.cos(phi),
              y: Math.cos(theta),
              z: Math.sin(theta) * Math.sin(phi),
            },
            glowIntensity: 0,
            nextGlowTime: Math.random() * 5000 + Date.now(),
          });
        }
      }
      return nodes;
    };

    const generateConnections = () => {
      const edges = [];
      const idx = (lat, lon) => lat * lonLines + lon;

      for (let lat = 0; lat <= latLines; lat++) {
        for (let lon = 0; lon < lonLines; lon++) {
          edges.push([idx(lat, lon), idx(lat, (lon + 1) % lonLines)]);
        }
      }

      for (let lat = 0; lat < latLines; lat++) {
        for (let lon = 0; lon < lonLines; lon++) {
          edges.push([idx(lat, lon), idx(lat + 1, lon)]);
        }
      }

      return edges;
    };

    nodesRef.current = generateNodes();
    connectionsRef.current = generateConnections();

    const rotateY = (p, a) => {
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      return { x: p.x * cos - p.z * sin, y: p.y, z: p.x * sin + p.z * cos };
    };

    const rotateX = (p, a) => {
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos };
    };

    const project = (p, width, height, perspective) => {
      const scale = perspective / (perspective + p.z);
      return { x: width / 2 + p.x * scale, y: height / 2 + p.y * scale, scale };
    };

    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      sizeRef.current = { width: rect.width, height: rect.height, dpr };

      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);

    const drawOnce = () => {
      const { width, height } = sizeRef.current;
      if (width <= 1 || height <= 1) return;

      ctx.clearRect(0, 0, width, height);

      const radius = Math.min(width, height) * 0.42;
      const perspective = radius * 2.2;
      const tilt = Math.PI / 10;
      const now = Date.now();

      const projectedByIndex = nodesRef.current.map((node) => {
          if (now >= node.nextGlowTime && node.glowIntensity === 0) {
            node.glowIntensity = 1;
            node.nextGlowTime = now + Math.random() * 5000 + 2000;
          }
          if (node.glowIntensity > 0) {
            node.glowIntensity = Math.max(0, node.glowIntensity - 0.008);
          }

          let p = {
            x: node.unit.x * radius,
            y: node.unit.y * radius,
            z: node.unit.z * radius,
          };
          p = rotateY(p, rotationRef.current);
          p = rotateX(p, tilt);

          const proj = project(p, width, height, perspective);
          return { ...proj, z: p.z, glowIntensity: node.glowIntensity };
        });

      const projectedSorted = [...projectedByIndex].sort((a, b) => a.z - b.z);

      ctx.lineWidth = 1;
      ctx.strokeStyle = palette.line;
      ctx.beginPath();
      for (const [a, b] of connectionsRef.current) {
        const p1 = projectedByIndex[a];
        const p2 = projectedByIndex[b];
        if (!p1 || !p2) continue;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      }
      ctx.stroke();

      for (const p of projectedSorted) {
        const baseSize = 2.2 * p.scale;
        const glowSize = baseSize + p.glowIntensity * 8;

        if (p.glowIntensity > 0) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize * 2);
          g.addColorStop(0, `rgba(225,193,122,${p.glowIntensity * 0.7})`);
          g.addColorStop(0.55, `rgba(225,193,122,${p.glowIntensity * 0.25})`);
          g.addColorStop(1, "rgba(225,193,122,0)");

          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowSize * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = p.glowIntensity > 0 ? palette.glow : palette.nodeDim;
        ctx.beginPath();
        ctx.arc(p.x, p.y, baseSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = palette.node;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.8, baseSize * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const animate = () => {
      rotationRef.current += 0.0013;
      drawOnce();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    if (reducedMotion) {
      drawOnce();
    } else {
      animate();
    }

    return () => {
      ro.disconnect();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={`neuralSphere ${className}`.trim()}
      style={style}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="neuralSphere__canvas" />
    </div>
  );
}
