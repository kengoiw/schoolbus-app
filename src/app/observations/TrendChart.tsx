"use client";

interface TrendPoint {
  takenAt: string;
  greenRatio: number;
  avgBrightness: number;
}

const WIDTH = 320;
const HEIGHT = 120;
const PAD_X = 8;
const PAD_Y = 10;

// dataviz skill: categorical slots "green" and "yellow", validated for CVD
// separation (ΔE 24.2). Yellow is sub-3:1 on the light surface, so both
// series carry a legend dot + direct end label (relief rule) rather than
// relying on color alone.
const GREEN = "#008300";
const YELLOW = "#c98500"; // darkened from #eda100 for readability on white card

function xy(index: number, count: number, value01: number) {
  const x = count <= 1 ? WIDTH / 2 : PAD_X + (index / (count - 1)) * (WIDTH - PAD_X * 2);
  const y = HEIGHT - PAD_Y - value01 * (HEIGHT - PAD_Y * 2);
  return { x, y };
}

function linePath(values: number[]) {
  return values
    .map((v, i) => {
      const { x, y } = xy(i, values.length, v);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function TrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) return null;

  const greenValues = points.map((p) => p.greenRatio);
  const brightnessValues = points.map((p) => p.avgBrightness / 100);

  const latest = points[points.length - 1];

  return (
    <div className="card card-body">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-800">推移（緑被率・明るさ）</h3>
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GREEN }} />
            緑被率 {Math.round(latest.greenRatio * 100)}%
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: YELLOW }} />
            明るさ {Math.round(latest.avgBrightness)}
          </span>
        </div>
      </div>

      {points.length < 2 ? (
        <p className="text-xs text-gray-400">記録が2件以上になるとグラフが表示されます。</p>
      ) : (
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-24"
          role="img"
          aria-label="緑被率と明るさの推移グラフ"
        >
          {/* baseline */}
          <line x1={PAD_X} y1={HEIGHT - PAD_Y} x2={WIDTH - PAD_X} y2={HEIGHT - PAD_Y} stroke="#e1e0d9" strokeWidth={1} />

          <path d={linePath(brightnessValues)} fill="none" stroke={YELLOW} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <path d={linePath(greenValues)} fill="none" stroke={GREEN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {points.map((p, i) => {
            const g = xy(i, points.length, p.greenRatio);
            const b = xy(i, points.length, p.avgBrightness / 100);
            return (
              <g key={p.takenAt + i}>
                <circle cx={g.x} cy={g.y} r={2.5} fill={GREEN}>
                  <title>{`${p.takenAt}: 緑被率 ${Math.round(p.greenRatio * 100)}%`}</title>
                </circle>
                <circle cx={b.x} cy={b.y} r={2.5} fill={YELLOW}>
                  <title>{`${p.takenAt}: 明るさ ${Math.round(p.avgBrightness)}`}</title>
                </circle>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
