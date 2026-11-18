const format=n=>Number(n.toPrecision(5)).toLocaleString(undefined,{maximumSignificantDigits:5})
const escape=text=>String(text).replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[char]))

export function convergenceSvg(run) {
  const rows=run.result.convergence
  if(!rows.length) throw Error('Run at least one replication to plot convergence.')
  const values=rows.map(p=>p.mean)
  const min=Math.min(...values),max=Math.max(...values),n=rows.at(-1).n
  const x=i=>86+488*(i-1)/Math.max(1,n-1)
  const y=v=>max===min?91:154-126*(v-min)/(max-min)
  const line=rows.map(p=>x(p.n).toFixed(2)+','+y(p.mean).toFixed(2)).join(' ')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 610 205" role="img" aria-labelledby="chart-title">
    <title id="chart-title">Running mean output by completed replication</title>
    <rect width="610" height="205" fill="#ffffff"/>
    <g stroke="#d6dce5"><path d="M86 25V155H575" fill="none"/><path d="M86 28H575 M86 91H575"/></g>
    <g font-family="system-ui,sans-serif" fill="#334155" font-size="12">
      <text x="10" y="15">Mean output ${escape(run.model.unit)}</text>
      <text x="80" y="34" text-anchor="end">${format(max)}</text><text x="80" y="155" text-anchor="end">${format(min)}</text>
      <text x="86" y="175">1</text><text x="575" y="175" text-anchor="end">${format(n)}</text>
      <text x="330" y="194" text-anchor="middle">Completed replications</text></g>
    <polyline points="${line}" fill="none" stroke="#22678e" stroke-width="2.25"/>
    <circle cx="${x(n)}" cy="${y(rows.at(-1).mean)}" fill="#22678e" r="3"/></svg>`
}

export function traceCsv(run) {
  const keys=run.model.inputs.map(v=>v.name)
  const rows=run.result.trace.map(t=>[t.index,...keys.map(key=>t.inputs[key]),t.output,Number(t.event)])
  return [['replication',...keys,'output','threshold_event'],...rows].map(row=>row.join(',')).join('\r\n')+'\r\n'
}
