import { useTranslation } from "react-i18next";
import type { ChartData, ChartDataPoint, InteractiveResult } from "../types";

interface Props {
  data: ChartData;
  disabled: boolean;
  onSubmit: (result: InteractiveResult) => void;
}

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6"];

function BarChart({ data, onSubmit, disabled }: { data: ChartDataPoint[]; onSubmit: Props["onSubmit"]; disabled: boolean }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.max(Math.floor(260 / data.length) - 8, 24);
  const chartW = data.length * (barWidth + 8) + 16;
  const chartH = 140;
  return (
    <div className="kui-interactive-chart-bar" style={{ overflowX: "auto" }}>
      <svg width={chartW} height={chartH + 30} viewBox={`0 0 ${chartW} ${chartH + 30}`}>
        {data.map((d, i) => {
          const h = (d.value / maxVal) * chartH;
          const x = i * (barWidth + 8) + 8;
          const color = d.color || COLORS[i % COLORS.length];
          return (
            <g
              key={i}
              className={!disabled ? "kui-interactive-chart-clickable" : ""}
              onClick={() => !disabled && onSubmit({ type: "chart", selected: d.label })}
              style={{ cursor: disabled ? "default" : "pointer" }}
            >
              <rect x={x} y={chartH - h} width={barWidth} height={h} rx={4} fill={color} opacity={0.85} />
              <text x={x + barWidth / 2} y={chartH + 12} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.7}>
                {d.label.length > 5 ? d.label.slice(0, 5) + "…" : d.label}
              </text>
              <text x={x + barWidth / 2} y={chartH - h - 4} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
                {d.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function LineChart({ data, onSubmit, disabled }: { data: ChartDataPoint[]; onSubmit: Props["onSubmit"]; disabled: boolean }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const W = 280, H = 140, padX = 16, padY = 10;
  const stepX = (W - padX * 2) / (data.length - 1);
  const points = data.map((d, i) => ({
    x: padX + i * stepX,
    y: padY + (1 - d.value / maxVal) * (H - padY * 2),
  }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  return (
    <svg width={W} height={H + 24} viewBox={`0 0 ${W} ${H + 24}`}>
      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g
          key={i}
          className={!disabled ? "kui-interactive-chart-clickable" : ""}
          onClick={() => !disabled && onSubmit({ type: "chart", selected: data[i].label })}
          style={{ cursor: disabled ? "default" : "pointer" }}
        >
          <circle cx={p.x} cy={p.y} r={4} fill="#6366f1" />
          <text x={p.x} y={H + 14} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.6}>
            {data[i].label.length > 4 ? data[i].label.slice(0, 4) + "…" : data[i].label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function PieChart({ data, onSubmit, disabled }: { data: ChartDataPoint[]; onSubmit: Props["onSubmit"]; disabled: boolean }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 70, cy = 70, r = 64;
  let angle = -90;
  const slices = data.map((d, i) => {
    const slice = (d.value / total) * 360;
    const startAngle = angle;
    angle += slice;
    const endAngle = angle;
    const largeArc = slice > 180 ? 1 : 0;
    const rad = (a: number) => (a * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(startAngle));
    const y1 = cy + r * Math.sin(rad(startAngle));
    const x2 = cx + r * Math.cos(rad(endAngle));
    const y2 = cy + r * Math.sin(rad(endAngle));
    const color = d.color || COLORS[i % COLORS.length];
    return { d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`, color, label: d.label, pct: Math.round((d.value / total) * 100) };
  });
  return (
    <div className="kui-interactive-chart-pie-wrap">
      <svg width={140} height={140} viewBox="0 0 140 140">
        {slices.map((s, i) => (
          <path
            key={i}
            d={s.d}
            fill={s.color}
            opacity={0.85}
            style={{ cursor: disabled ? "default" : "pointer" }}
            onClick={() => !disabled && onSubmit({ type: "chart", selected: data[i].label })}
          />
        ))}
      </svg>
      <div className="kui-interactive-chart-pie-legend">
        {slices.map((s, i) => (
          <div key={i} className="kui-interactive-chart-legend-item">
            <span className="kui-interactive-chart-legend-dot" style={{ background: s.color }} />
            <span>{s.label}</span>
            <span className="kui-interactive-chart-legend-pct">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartRenderer({ data, disabled, onSubmit }: Props) {
  const { t } = useTranslation();
  if (!data || !Array.isArray(data.data)) {
    return <div className="kui-interactive-error">Chart: invalid data</div>;
  }
  return (
    <div className="kui-interactive-chart">
      {data.chartType === "bar" && <BarChart data={data.data} onSubmit={onSubmit} disabled={disabled} />}
      {data.chartType === "line" && (data.data.length < 2 ? (
        <div className="kui-interactive-error">{t("interactive.lineChartMinPoints")}</div>
      ) : (
        <LineChart data={data.data} onSubmit={onSubmit} disabled={disabled} />
      ))}
      {data.chartType === "pie" && <PieChart data={data.data} onSubmit={onSubmit} disabled={disabled} />}
      {data.showLegend && data.chartType !== "pie" && (
        <div className="kui-interactive-chart-legend">
          {data.data.map((d, i) => (
            <div key={i} className="kui-interactive-chart-legend-item">
              <span className="kui-interactive-chart-legend-dot" style={{ background: d.color || COLORS[i % COLORS.length] }} />
              <span>{d.label}: {d.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
