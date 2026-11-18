import { useEffect, useRef, useState } from 'react'

const number = new Intl.NumberFormat().format

export function Dartboard({ result }) {
  const ref = useRef(null)
  const [selected, setSelected] = useState('')
  const [zoom, setZoom] = useState(false)
  const index = Number(selected)
  const point = selected && result?.points[index - 1]
  const zoomed = Boolean(point && zoom)
  useEffect(() => {
    const canvas = ref.current
    function draw() {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const styles = getComputedStyle(canvas)
      const color = key => styles.getPropertyValue(key).trim()
      const offset = 26
      const side = canvas.width - offset * 2
      const visibleRange = zoomed ? 0.5 : 2
      const xmin = zoomed ? Math.max(-1, Math.min(1 - visibleRange, point.x - visibleRange / 2)) : -1
      const ymin = zoomed ? Math.max(-1, Math.min(1 - visibleRange, point.y - visibleRange / 2)) : -1
      const px = x => offset + (x - xmin) / visibleRange * side
      const py = y => offset + (ymin + visibleRange - y) / visibleRange * side
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = color('--canvas-bg')
      ctx.fillRect(offset, offset, side, side)
      ctx.strokeStyle = color('--border')
      for (let i = 0; i <= 8; i++) {
        const coordinate = offset + side * i / 8
        ctx.beginPath()
        ctx.moveTo(coordinate, offset)
        ctx.lineTo(coordinate, offset + side)
        ctx.moveTo(offset, coordinate)
        ctx.lineTo(offset + side, coordinate)
        ctx.stroke()
      }
      ctx.save()
      ctx.beginPath()
      ctx.rect(offset, offset, side, side)
      ctx.clip()
      ctx.beginPath()
      ctx.arc(px(0), py(0), side / visibleRange, 0, Math.PI * 2)
      ctx.strokeStyle = color('--primary')
      ctx.stroke()
      const hitColor = color('--chart-1')
      const missColor = color('--chart-2')
      for (const { x, y, inside } of result?.points ?? []) {
        ctx.beginPath()
        if (inside) ctx.arc(px(x), py(y), 1.9, 0, Math.PI * 2)
        else ctx.rect(px(x) - 2, py(y) - 2, 4, 4)
        ctx.fillStyle = inside ? hitColor : missColor
        ctx.fill()
      }
      if (point) {
        ctx.beginPath()
        ctx.arc(px(point.x), py(point.y), 7, 0, Math.PI * 2)
        ctx.strokeStyle = color('--text')
        ctx.lineWidth = 2
        ctx.stroke()
      }
      ctx.restore()
      ctx.fillStyle = color('--text-muted')
      ctx.font = '12px system-ui'
      ctx.textAlign = 'center'
      for (let i = 0; i < 3; i++) {
        ctx.fillText(String(+(xmin + i * visibleRange / 2).toFixed(2)), offset + i * side / 2, canvas.height - 8)
        ctx.fillText(String(+(ymin + visibleRange - i * visibleRange / 2).toFixed(2)), 12, offset + i * side / 2 + 4, 22)
      }
    }
    draw()
    const themeChanges = new MutationObserver(draw)
    themeChanges.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', draw)
    return () => {
      themeChanges.disconnect()
      media.removeEventListener('change', draw)
    }
  }, [result, point, zoomed])
  return <figure className="pi-darts">
    <canvas width="470" height="470" ref={ref} role="img" aria-label={`Unit circle on a square from −1 to 1 on both axes. ${number(result?.hits ?? 0)} of ${number(result?.n ?? 0)} darts landed inside.`}/>
    <figcaption><span className="pi-dot"/> Inside circle <span className="pi-square"/> Outside circle</figcaption>
    <small>Displaying {number(result?.points.length ?? 0)} of {number(result?.n ?? 0)} darts in draw order.</small>
    {result?.points.length > 0 && <details className="pi-point">
      <summary>Inspect a dart</summary>
      <label>Draw number (1–{number(result.points.length)})
        <input type="number" min="1" max={result.points.length} step="1" value={selected} onChange={e => setSelected(e.target.value)}/>
      </label>
      {point ? <>
        <p>x = {point.x.toFixed(5)}, y = {point.y.toFixed(5)} · {point.inside ? 'Inside circle' : 'Outside circle'}</p>
        <label className="pi-overlay"><input type="checkbox" checked={zoom} onChange={e => setZoom(e.target.checked)}/> Zoom around selected dart</label>
      </> : <p>Choose a displayed draw to locate its coordinates.</p>}
    </details>}
  </figure>
}

export function Convergence({ result, previous }) {
  const points = result?.convergence ?? []
  if (!points.length) return <p>Run the experiment to see how the estimate changes with sample size.</p>
  const previousPoints = previous?.convergence ?? []
  const estimates = [...points, ...previousPoints].map(p => p.mean)
  const maxCount = Math.max(result.n, previous?.n ?? 0)
  const min = Math.max(0, Math.min(Math.PI, ...estimates) - 0.05)
  const max = Math.min(4, Math.max(Math.PI, ...estimates) + 0.05)
  const y = value => 88 - (value - min) / (max - min) * 72
  const x = n => 44 + 436 * n / maxCount
  return <div className="pi-convergence">
    <svg viewBox="0 0 500 114" role="img" aria-label="Convergence of the Pi estimate by completed darts, with a dashed analytical reference at Pi.">
      <path d="M44,10V88H480" fill="none" stroke="var(--border-strong)"/>
      <path d={`M44,${y(Math.PI)}H480`} stroke="var(--text-muted)" strokeDasharray="5 4"/>
      {previousPoints.length > 0 && <polyline points={previousPoints.map(p => `${x(p.n)},${y(p.mean)}`).join(' ')} fill="none" stroke="var(--chart-2)" strokeDasharray="3 2" strokeWidth="2"/>}
      <polyline points={points.map(p => `${x(p.n)},${y(p.mean)}`).join(' ')} fill="none" stroke="var(--chart-1)" strokeWidth="2"/>
      <circle cx={x(points.at(-1).n)} cy={y(points.at(-1).mean)} r="3" fill="var(--chart-1)"/>
      <g fill="var(--text-muted)" fontSize="10" textAnchor="end">
        <text x="38" y="19">{max.toFixed(2)}</text><text x="38" y="88">{min.toFixed(2)}</text>
        <text x="480" y="105">{number(maxCount)}</text>
      </g><text x="42" y="105" fill="var(--text-muted)" fontSize="10">0</text>
      <text x="260" y="109" textAnchor="middle" fill="var(--text-muted)" fontSize="10">Completed darts</text>
    </svg>
    <small>Solid line · current run. Dashed horizontal line · π.{previousPoints.length > 0 && ' Dotted curve · previous run.'}</small>
    <details><summary>Convergence data</summary>
      <div className="pi-table-scroll"><table><thead><tr><th>Darts</th><th>Estimate</th></tr></thead>
        <tbody>{points.map(p => <tr key={p.n}><td>{number(p.n)}</td><td>{p.mean.toFixed(5)}</td></tr>)}</tbody>
      </table></div>
    </details>
  </div>
}
