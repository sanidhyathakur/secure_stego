import { useEffect, useRef } from 'react';

interface HistogramData {
  red: number[];
  green: number[];
  blue: number[];
}

interface HistogramChartProps {
  coverHist: HistogramData;
  stegoHist: HistogramData;
}

/**
 * Renders overlaid RGB histograms comparing cover vs stego images.
 * Near-identical histograms prove that LSB embedding is visually imperceptible.
 */
export default function HistogramChart({ coverHist, stegoHist }: HistogramChartProps) {
  const channels: { key: keyof HistogramData; label: string; color: string; coverColor: string; stegoColor: string }[] = [
    { key: 'red', label: 'Red Channel', color: '#ef4444', coverColor: 'rgba(239,68,68,0.3)', stegoColor: 'rgba(239,68,68,0.7)' },
    { key: 'green', label: 'Green Channel', color: '#22c55e', coverColor: 'rgba(34,197,94,0.3)', stegoColor: 'rgba(34,197,94,0.7)' },
    { key: 'blue', label: 'Blue Channel', color: '#3b82f6', coverColor: 'rgba(59,130,246,0.3)', stegoColor: 'rgba(59,130,246,0.7)' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 justify-center">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gray-300 dark:bg-gray-600 opacity-60 inline-block" />
          Cover (Original)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gray-700 dark:bg-gray-200 inline-block" />
          Stego (Embedded)
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {channels.map((ch) => (
          <SingleChannelHistogram
            key={ch.key}
            label={ch.label}
            coverData={coverHist[ch.key]}
            stegoData={stegoHist[ch.key]}
            coverColor={ch.coverColor}
            stegoColor={ch.stegoColor}
          />
        ))}
      </div>
    </div>
  );
}

function SingleChannelHistogram({
  label,
  coverData,
  stegoData,
  coverColor,
  stegoColor,
}: {
  label: string;
  coverData: number[];
  stegoData: number[];
  coverColor: string;
  stegoColor: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const padding = { top: 8, bottom: 20, left: 4, right: 4 };
    const drawW = W - padding.left - padding.right;
    const drawH = H - padding.top - padding.bottom;

    ctx.clearRect(0, 0, W, H);

    // Find global max for normalization
    const maxVal = Math.max(...coverData, ...stegoData, 1);

    const barWidth = drawW / 256;

    // Draw cover histogram (behind)
    for (let i = 0; i < 256; i++) {
      const h = (coverData[i] / maxVal) * drawH;
      ctx.fillStyle = coverColor;
      ctx.fillRect(padding.left + i * barWidth, padding.top + drawH - h, barWidth, h);
    }

    // Draw stego histogram (in front, semi-transparent)
    for (let i = 0; i < 256; i++) {
      const h = (stegoData[i] / maxVal) * drawH;
      ctx.fillStyle = stegoColor;
      ctx.fillRect(padding.left + i * barWidth, padding.top + drawH - h, Math.max(barWidth * 0.6, 0.5), h);
    }

    // X-axis labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('0', padding.left, H - 4);
    ctx.fillText('128', padding.left + drawW / 2, H - 4);
    ctx.fillText('255', padding.left + drawW, H - 4);
  }, [coverData, stegoData, coverColor, stegoColor]);

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 text-center">{label}</p>
      <canvas ref={canvasRef} width={300} height={120} className="w-full" />
    </div>
  );
}
