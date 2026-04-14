import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts'

function getColor(score) {
  if (score >= 75) return '#1cbe7a'
  if (score >= 50) return '#f2b94b'
  return '#e35d7b'
}

function getLabel(score) {
  if (score >= 85) return 'Сильный документ'
  if (score >= 70) return 'Хороший уровень'
  if (score >= 50) return 'Нужно усилить'
  return 'Нужна переработка'
}

export default function ScoreGauge({ score = 0 }) {
  const color = getColor(score)
  const data = [{ value: score, fill: color }]

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <RadialBarChart
          width={180}
          height={180}
          cx={90}
          cy={90}
          innerRadius={58}
          outerRadius={84}
          barSize={18}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar
            background={{ fill: '#eef2f7' }}
            dataKey="value"
            angleAxisId={0}
            cornerRadius={12}
          />
        </RadialBarChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums tracking-tight" style={{ color }}>
            {Math.round(score)}
          </span>
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">из 100</span>
        </div>
      </div>

      <div
        className="rounded-full px-3 py-1 text-xs font-semibold"
        style={{ color, backgroundColor: `${color}18` }}
      >
        {getLabel(score)}
      </div>
    </div>
  )
}
