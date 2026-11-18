import { useState } from 'react'
import { Latex } from '../components/ui/Latex'

function BellCurve() {
  const pts = Array.from({length:200},(_,i)=>{
    const x=i/199
    const z=(x-0.5)*8
    const y=Math.exp(-z*z/2)/Math.sqrt(2*Math.PI)
    return [20+x*560, 148-y*340]
  })
  const path='M '+pts.map(p=>p.join(' ')).join(' L ')
  const baseline=148
  return <svg viewBox="0 0 600 204" role="img" aria-label="Normal distribution bell curve" className="theory-svg">
    <g transform="translate(0 24)">
    <line x1="20" y1={baseline} x2="580" y2={baseline} stroke="var(--chart-axis)" strokeWidth="1.5"/>
    {[-3,-2,-1,0,1,2,3].map(z=>{
      const x=20+560*(0.5+z/8)
      return <g key={z}><line x1={x} y1={baseline} x2={x} y2={baseline+5} stroke="var(--chart-axis)" strokeWidth="1"/><text x={x} y={baseline+18} textAnchor="middle" fontSize="10" fill="var(--text-subtle)">{z===0?'μ':z+'σ'}</text></g>
    })}
    <path d={path} fill="none" stroke="var(--chart-1)" strokeWidth="2.5" strokeLinejoin="round"/>
    </g>
    <text x="300" y="14" textAnchor="middle" fontSize="11" fill="var(--text-muted)" fontStyle="italic">Normal distribution N(μ, σ²)</text>
  </svg>
}

function LLNChart() {
  const seed=42
  let rng=(seed)=>{let s=seed;return()=>{s=(s*1664525+1013904223)>>>0;return s/0xFFFFFFFF}}
  const r=rng(seed)
  const values=Array.from({length:200},()=>r()*2-1)
  const pts=values.map((_,i)=>{
    const mean=values.slice(0,i+1).reduce((a,b)=>a+b,0)/(i+1)
    return [25+i/199*550, 90-mean*55]
  })
  const pathD='M '+pts.map(p=>p.join(' ')).join(' L ')
  return <svg viewBox="0 0 600 204" role="img" aria-label="Law of large numbers: running mean converges to true mean" className="theory-svg">
    <g transform="translate(0 24)">
    <line x1="25" y1="90" x2="575" y2="90" stroke="var(--chart-2)" strokeWidth="1.5" strokeDasharray="6 3"/>
    <line x1="25" y1="40" x2="25" y2="145" stroke="var(--chart-axis)" strokeWidth="1.5"/>
    <line x1="25" y1="145" x2="575" y2="145" stroke="var(--chart-axis)" strokeWidth="1.5"/>
    <text x="12" y="93" textAnchor="middle" fontSize="10" fill="var(--chart-2)">0</text>
    <text x="300" y="162" textAnchor="middle" fontSize="11" fill="var(--text-muted)">Number of samples (n)</text>
    <text x="12" y="45" textAnchor="middle" fontSize="10" fill="var(--text-subtle)">+1</text>
    <text x="12" y="140" textAnchor="middle" fontSize="10" fill="var(--text-subtle)">−1</text>
    <path d={pathD} fill="none" stroke="var(--chart-1)" strokeWidth="2" strokeLinejoin="round"/>
    <text x="400" y="78" fontSize="10" fill="var(--chart-2)" fontStyle="italic">true mean = 0</text>
    </g>
    <text x="300" y="14" textAnchor="middle" fontSize="11" fill="var(--text-muted)" fontStyle="italic">Running mean converges as n → ∞</text>
  </svg>
}

function CIChart() {
  const pts=[50,100,200,500,1000,2000,5000,10000]
  return <svg viewBox="0 0 600 204" role="img" aria-label="Confidence interval width narrows with more samples" className="theory-svg">
    <g transform="translate(0 24)">
    <line x1="60" y1="20" x2="60" y2="150" stroke="var(--chart-axis)" strokeWidth="1.5"/>
    <line x1="60" y1="150" x2="580" y2="150" stroke="var(--chart-axis)" strokeWidth="1.5"/>
    {pts.map((n,i)=>{
      const x=60+i*(520/7)
      const half=(1.96/Math.sqrt(n))*120
      return <g key={n}>
        <line x1={x} y1={85-half} x2={x} y2={85+half} stroke="var(--chart-1)" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1={x-5} y1={85-half} x2={x+5} y2={85-half} stroke="var(--chart-1)" strokeWidth="1.5"/>
        <line x1={x-5} y1={85+half} x2={x+5} y2={85+half} stroke="var(--chart-1)" strokeWidth="1.5"/>
        <circle cx={x} cy="85" r="3" fill="var(--chart-1)"/>
        <text x={x} y="165" textAnchor="middle" fontSize="9" fill="var(--text-subtle)">{n>=1000?n/1000+'k':n}</text>
      </g>
    })}
    <line x1="60" y1="85" x2="580" y2="85" stroke="var(--chart-2)" strokeWidth="1" strokeDasharray="5 3"/>
    <text x="12" y="89" textAnchor="middle" fontSize="10" fill="var(--chart-2)">p</text>
    </g>
    <text x="300" y="14" textAnchor="middle" fontSize="11" fill="var(--text-muted)" fontStyle="italic">95% CI width shrinks as 1/√n</text>
  </svg>
}

function IntegrationViz() {
  const f=(x)=>Math.sin(x*Math.PI)*0.6+0.3
  const pts=Array.from({length:200},(_,i)=>{const x=i/199;return [60+x*480,140-f(x)*110]})
  const pathD='M '+pts.map(p=>p.join(' ')).join(' L ')
  const fillD='M 60 140 L '+pts.map(p=>p.join(',')).join(' ')+' L 540 140 Z'
  const darts=[[0.1,0.75],[0.17,0.3],[0.33,0.6],[0.45,0.85],[0.52,0.2],[0.61,0.65],[0.72,0.9],[0.8,0.4],[0.88,0.55],[0.14,0.9],[0.37,0.1],[0.65,0.3],[0.78,0.75],[0.25,0.45],[0.55,0.95]]
  return <svg viewBox="0 0 600 204" role="img" aria-label="Monte Carlo integration: random darts estimate area under a curve" className="theory-svg">
    <g transform="translate(0 24)">
    <line x1="60" y1="25" x2="60" y2="145" stroke="var(--chart-axis)" strokeWidth="1.5"/>
    <line x1="60" y1="145" x2="545" y2="145" stroke="var(--chart-axis)" strokeWidth="1.5"/>
    <path d={fillD} fill="var(--chart-3)" fillOpacity=".18"/>
    <path d={pathD} fill="none" stroke="var(--chart-3)" strokeWidth="2.5" strokeLinejoin="round"/>
    {darts.map(([rx,ry],i)=>{
      const sx=60+rx*480
      const sy=140-ry*110
      const fy=140-f(rx)*110
      const hit=sy>=fy
      return <circle key={i} cx={sx} cy={sy} r="4" fill={hit?'var(--chart-1)':'var(--chart-2)'} fillOpacity=".85"/>
    })}
    </g>
    <text x="300" y="14" textAnchor="middle" fontSize="11" fill="var(--text-muted)" fontStyle="italic">Random samples estimate ∫f(x)dx · blue = under curve, red = above</text>
  </svg>
}

function ConvergenceRates() {
  const data=[
    {n:10,err:0.316},{n:100,err:0.1},{n:1000,err:0.0316},{n:10000,err:0.01},{n:100000,err:0.00316}
  ]
  const logScale=(v,min,max,h)=>{
    const lv=Math.log10(v),lmin=Math.log10(min),lmax=Math.log10(max)
    return h-(lv-lmin)/(lmax-lmin)*(h-20)
  }
  const pts=data.map(d=>[60+Math.log10(d.n/10)/4*480, logScale(d.err,0.001,1,140)])
  const pathD='M '+pts.map(p=>p.join(' ')).join(' L ')
  return <svg viewBox="0 0 600 204" role="img" aria-label="Monte Carlo error converges proportional to 1 over root n" className="theory-svg">
    <g transform="translate(0 24)">
    <line x1="60" y1="20" x2="60" y2="145" stroke="var(--chart-axis)" strokeWidth="1.5"/>
    <line x1="60" y1="145" x2="545" y2="145" stroke="var(--chart-axis)" strokeWidth="1.5"/>
    {data.map((d,i)=>{
      const x=pts[i][0]
      return <text key={d.n} x={x} y="162" textAnchor="middle" fontSize="10" fill="var(--text-subtle)">{d.n>=1000?d.n/1000+'k':d.n}</text>
    })}
    {[1,0.1,0.01,0.001].map(v=>{
      const y=logScale(v,0.001,1,140)
      return <g key={v}><line x1="55" y1={y} x2="60" y2={y} stroke="var(--chart-axis)" strokeWidth="1"/><text x="52" y={y+3} textAnchor="end" fontSize="9" fill="var(--text-subtle)">{v}</text></g>
    })}
    <path d={pathD} fill="none" stroke="var(--chart-1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    {pts.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="4" fill="var(--chart-1)"/>)}
    </g>
    <text x="300" y="14" textAnchor="middle" fontSize="11" fill="var(--text-muted)" fontStyle="italic">Standard error ≈ σ/√n — log scale</text>
  </svg>
}

function SectionAnchor({id,children}) {
  return <h2 id={id} className="theory-h2">{children}</h2>
}

export default function Theory() {
  const [activeSection,setActiveSection]=useState('')
  const toc=[
    {id:'what-is-mc',label:'What is Monte Carlo?'},
    {id:'probability',label:'Probability & distributions'},
    {id:'lln',label:'Law of large numbers'},
    {id:'clt',label:'Central limit theorem'},
    {id:'confidence',label:'Confidence intervals'},
    {id:'integration',label:'Monte Carlo integration'},
    {id:'convergence',label:'Convergence & sample size'},
    {id:'applications',label:'Applications'},
  ]
  return <div className="theory-layout">
    <aside className="theory-toc">
      <h3>Contents</h3>
      <ul>
        {toc.map(t=><li key={t.id}><a href={'#theory-'+t.id} className={'theory-toc-link'+(activeSection===t.id?' active':'')} onClick={e=>{e.preventDefault();document.getElementById('theory-'+t.id)?.scrollIntoView({behavior:'smooth'});setActiveSection(t.id)}}>{t.label}</a></li>)}
      </ul>
    </aside>
    <article className="theory-article">
      <h1>Theory & Concepts</h1>
      <p className="theory-lead">A reference guide to the mathematical ideas behind Monte Carlo simulation — from probability foundations to confidence intervals and convergence.</p>

      <section id={'theory-what-is-mc'}>
        <SectionAnchor id="theory-what-is-mc">What is Monte Carlo simulation?</SectionAnchor>
        <p>Monte Carlo simulation is a broad class of computational algorithms that use repeated random sampling to obtain numerical results. When a problem involves uncertainty — many interacting variables, intractable integrals, or complex dependencies — random sampling often yields a good approximation where exact analytic solutions fail.</p>
        <p>The name comes from the Casino de Monte-Carlo in Monaco and was popularized by Stanislaw Ulam and John von Neumann during the Manhattan Project, where nuclear chain reaction simulations required statistical modeling of particle behavior.</p>
        <div className="theory-callout">
          <strong>Core idea</strong>
          <p>Instead of solving <em>P(event)</em> analytically, draw <em>n</em> independent samples from the input distributions, evaluate the model for each sample, and count how often the event occurs. As <em>n</em> grows, the sample fraction converges to the true probability.</p>
        </div>
        <div className="theory-steps">
          {[
            ['1','Define uncertainty','Identify each uncertain input and choose a probability distribution for it.'],
            ['2','Sample','Draw random numbers from each distribution — one complete draw per replication.'],
            ['3','Evaluate','Run each set of drawn inputs through the model to produce an output.'],
            ['4','Aggregate','Compute the mean, standard deviation, histogram and probabilities across all replications.'],
          ].map(([n,title,desc])=><div key={n} className="theory-step"><span className="theory-step-num">{n}</span><div><strong>{title}</strong><p>{desc}</p></div></div>)}
        </div>
      </section>

      <section id={'theory-probability'}>
        <SectionAnchor id="theory-probability">Probability distributions</SectionAnchor>
        <p>A probability distribution describes how likely different values are for a random variable. Choosing the right distribution for each uncertain input is the most important modeling decision in a Monte Carlo study.</p>
        <BellCurve/>
        <p>The <strong>normal distribution</strong> N(μ, σ²) is symmetric around its mean μ. Its shape is fully determined by the mean and standard deviation σ. The 68–95–99.7 rule states that roughly 68% of outcomes fall within one σ of the mean, 95% within two, and 99.7% within three.</p>
        <div className="theory-dist-table">
          <table>
            <thead><tr><th>Distribution</th><th>Typical use</th><th>Parameters</th></tr></thead>
            <tbody>
              {[
                ['Normal','Measurement error, financial returns','μ (mean), σ (std. dev.)'],
                ['Uniform','Equal-probability ranges, lack of information','a (min), b (max)'],
                ['Triangular','Expert estimates with min/mode/max','a, b (mode), c (max)'],
                ['Exponential','Time between events, service times','λ (rate)'],
                ['Bernoulli','Binary outcomes (success/failure)','p (success probability)'],
                ['Log-normal','Strictly positive, right-skewed quantities','μ, σ of the log'],
                ['Poisson','Count of events in a fixed interval','λ (rate per interval)'],
                ['Beta','Proportions, probabilities between 0 and 1','α, β (shape)'],
              ].map(([n,u,p])=><tr key={n}><td><strong>{n}</strong></td><td>{u}</td><td className="theory-params">{p}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section id={'theory-lln'}>
        <SectionAnchor id="theory-lln">Law of large numbers</SectionAnchor>
        <p>The <strong>Law of Large Numbers (LLN)</strong> is the mathematical foundation that makes Monte Carlo work. It states that the sample mean X̄ₙ of independent, identically distributed random variables converges to the true expected value E[X] as n → ∞.</p>
        <div className="theory-formula"><Latex block math="\bar{X}_n = \frac{X_1 + X_2 + \cdots + X_n}{n} \xrightarrow{n\to\infty} \mathbb{E}[X]"/></div>
        <LLNChart/>
        <p>In practice this means: run enough replications and your estimate will be close to the true answer. The chart above shows the running mean of uniform(−1, 1) samples converging to its true mean of zero. Early estimates are noisy; with many samples the mean settles reliably.</p>
        <div className="theory-callout warning">
          <strong>What LLN does not guarantee</strong>
          <p>LLN guarantees convergence, but says nothing about <em>how fast</em> you converge, or how close any finite estimate is to the truth. For that you need the Central Limit Theorem and confidence intervals.</p>
        </div>
      </section>

      <section id={'theory-clt'}>
        <SectionAnchor id="theory-clt">Central limit theorem</SectionAnchor>
        <p>The <strong>Central Limit Theorem (CLT)</strong> tells us not only that the sample mean converges, but also how the error is distributed. For large n, the sampling distribution of X̄ₙ is approximately normal regardless of the shape of the underlying distribution:</p>
        <div className="theory-formula"><Latex block math="\frac{\sqrt{n}\,(\bar{X}_n - \mu)}{\sigma} \xrightarrow{d} \mathcal{N}(0,\,1) \quad \text{as } n \to \infty"/></div>
        <p>This is why Monte Carlo error follows a predictable pattern: the standard error of the mean is σ/√n. Doubling precision requires four times as many samples.</p>
        <div className="theory-insight-row">
          <div className="theory-insight-box"><span className="theory-kpi">×4</span><p>samples needed to halve the standard error</p></div>
          <div className="theory-insight-box"><span className="theory-kpi">×100</span><p>samples needed to reduce error by a factor of 10</p></div>
          <div className="theory-insight-box"><span className="theory-kpi">σ/√n</span><p>standard error of the sample mean</p></div>
        </div>
      </section>

      <section id={'theory-confidence'}>
        <SectionAnchor id="theory-confidence">Confidence intervals</SectionAnchor>
        <p>A <strong>95% confidence interval</strong> is a range computed from your samples such that if you repeated the whole procedure many times, 95% of those intervals would contain the true parameter. It is <em>not</em> the probability that the fixed true value falls in this specific interval.</p>
        <div className="theory-formula"><Latex block math="\text{CI} = \bar{X} \pm z^* \cdot \frac{\sigma}{\sqrt{n}} \qquad (z^* = 1.96 \text{ for 95\% confidence})"/></div>
        <CIChart/>
        <p>The chart above shows how the 95% confidence interval for a proportion narrows as sample size grows from 50 to 10,000. For a proportion near 0.5 and n = 10,000 the half-width is about ±1%.</p>
        <p>For a binary event (hits/trials) the <strong>Wilson score interval</strong> is preferred over the simple ±z√(p(1−p)/n) formula because it performs better when p is near 0 or 1.</p>
        <div className="theory-callout">
          <strong>Practical rule of thumb</strong>
          <p>To estimate a probability with ±1 percentage point precision at 95% confidence, run roughly 10,000 replications. For ±0.1% you need about 1,000,000.</p>
        </div>
      </section>

      <section id={'theory-integration'}>
        <SectionAnchor id="theory-integration">Monte Carlo integration</SectionAnchor>
        <p>One of the oldest applications: estimating the area under a curve (definite integral) by counting how many uniformly distributed random points fall under it.</p>
        <IntegrationViz/>
        <p>To estimate ∫ᵃᵇ f(x) dx, draw N uniform points (xᵢ, yᵢ) in the bounding box of dimensions (b−a) × h. Count the fraction f̂ that satisfy yᵢ ≤ f(xᵢ). The integral estimate is:</p>
        <div className="theory-formula"><Latex block math="\int_a^b f(x)\,dx \approx (b - a) \cdot h \cdot \hat{f}"/></div>
        <p>This generalises to arbitrarily high dimensions — the classic example being estimating π by counting darts that land inside a unit circle. In d dimensions the error still scales as σ/√n regardless of dimension, making Monte Carlo the method of choice for high-dimensional integrals where grid-based methods suffer from the curse of dimensionality.</p>
      </section>

      <section id={'theory-convergence'}>
        <SectionAnchor id="theory-convergence">Convergence and sample size</SectionAnchor>
        <p>The standard error decreases proportionally to 1/√n. On a log-log scale this is a straight line with slope −½, as shown below.</p>
        <ConvergenceRates/>
        <div className="theory-dist-table">
          <table>
            <thead><tr><th>Target precision (±)</th><th>Approximate n needed</th><th>Notes</th></tr></thead>
            <tbody>
              {[
                ['10%','100','Quick sanity check'],
                ['3.2%','1,000','Rough estimate'],
                ['1%','10,000','Standard simulation run'],
                ['0.32%','100,000','High precision'],
                ['0.1%','1,000,000','Very high precision'],
              ].map(([p,n,note])=><tr key={p}><td>{p}</td><td><strong>{n}</strong></td><td>{note}</td></tr>)}
            </tbody>
          </table>
        </div>
        <p>These figures assume a proportion near 0.5 (worst case). For rare events, a much larger n may be needed to observe even a single occurrence — alternatively use <strong>importance sampling</strong> or <strong>stratified sampling</strong> to focus draws where they matter most.</p>
      </section>

      <section id={'theory-applications'}>
        <SectionAnchor id="theory-applications">Applications</SectionAnchor>
        <div className="theory-app-grid">
          {[
            {domain:'Finance',color:'var(--chart-1)',items:['Option pricing (Black-Scholes via paths)','Portfolio risk (VaR, CVaR)','Credit default simulation','Geometric Brownian motion paths']},
            {domain:'Engineering',color:'var(--chart-2)',items:['System reliability (series/parallel)','Tolerance stack-up analysis','Structural load uncertainty','Component lifetime distributions']},
            {domain:'Operations',color:'var(--chart-3)',items:['Project schedule risk (CPM + MC)','Queueing and service level','Inventory reorder policies','Capacity planning under uncertainty']},
            {domain:'Physics & Science',color:'var(--chart-4)',items:['Particle transport (neutrons, photons)','Radiative heat transfer','Bayesian posterior sampling (MCMC)','Numerical integration in high dimensions']},
          ].map(d=><div key={d.domain} className="theory-app-card" style={{'--app-color':d.color}}>
            <h3>{d.domain}</h3>
            <ul>{d.items.map(item=><li key={item}>{item}</li>)}</ul>
          </div>)}
        </div>
      </section>
    </article>
  </div>
}
