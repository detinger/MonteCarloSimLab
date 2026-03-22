import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Slider } from '../components/ui/Slider';
import CodeExporter from '../components/CodeExporter';
import { Latex } from '../components/ui/Latex';

const MathUtils = {
  // Box-Muller transform for normal distribution
  randomNormal: (mean, stdDev) => {
    let u1 = Math.random();
    let u2 = Math.random();
    let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }
};

const Manufacturing = () => {
  const [numSimulations, setNumSimulations] = useState(2000);
  const [breakdownProb, setBreakdownProb] = useState(5); // %
  const [targetDemand, setTargetDemand] = useState(2400); // units over 30 days
  const [successProb, setSuccessProb] = useState(0);

  const canvasRef = useRef(null);

  const daysInPeriod = 30;
  const maxCapacityPerDay = 100;

  // Generate Python Code
  const pythonCode = `import numpy as np
import matplotlib.pyplot as plt

def simulate_manufacturing(n_simulations, breakdown_prob, target_demand):
    days = 30
    max_daily_capacity = 100
    
    total_yields = []
    
    for _ in range(n_simulations):
        # Machine breaks down with given probability (e.g., 5% = 0.05)
        # 1 means fine, 0 means breakdown
        machines_active = np.random.choice([0, 1], p=[breakdown_prob, 1 - breakdown_prob], size=days)
        
        # Working capacity (80% to 100% capacity) due to worker availability
        worker_cap = np.random.normal(loc=0.9, scale=0.05, size=days)
        worker_cap = np.clip(worker_cap, 0.5, 1.0)
        
        # Raw material availability (70% to 100%)
        material_cap = np.random.normal(loc=0.85, scale=0.1, size=days)
        material_cap = np.clip(material_cap, 0.4, 1.0)
        
        # Actual production per day
        daily_production = max_daily_capacity * machines_active * worker_cap * material_cap
        
        total_yields.append(np.sum(daily_production))
        
    total_yields = np.array(total_yields)
    prob_success = np.mean(total_yields >= target_demand)
    
    print(f"Probability of meeting demand ({target_demand} units): {prob_success * 100:.2f}%")
    print(f"Average expected monthly output: {np.mean(total_yields):.0f} units")
    
    plt.hist(total_yields, bins=40, color='#3fb950', alpha=0.7)
    plt.axvline(target_demand, color='r', linestyle='dashed', linewidth=2, label='Target Demand')
    plt.title('Monthly Manufacturing Yield Distribution')
    plt.xlabel('Total Units Produced')
    plt.ylabel('Frequency')
    plt.legend()
    plt.show()

simulate_manufacturing(n_simulations=${numSimulations}, breakdown_prob=${breakdownProb / 100}, target_demand=${targetDemand})`;

  // Generate R Code
  const rCode = `simulate_manufacturing <- function(n_simulations, breakdown_prob, target_demand) {
  days <- 30
  max_daily_capacity <- 100
  
  total_yields <- numeric(n_simulations)
  
  for(i in 1:n_simulations) {
    machines_active <- rbinom(days, 1, 1 - breakdown_prob)
    
    worker_cap <- pmin(1.0, pmax(0.5, rnorm(days, mean=0.9, sd=0.05)))
    material_cap <- pmin(1.0, pmax(0.4, rnorm(days, mean=0.85, sd=0.1)))
    
    daily_production <- max_daily_capacity * machines_active * worker_cap * material_cap
    total_yields[i] <- sum(daily_production)
  }
  
  prob_success <- mean(total_yields >= target_demand)
  
  cat(sprintf("Probability of meeting demand (%d units): %.2f%%\\n", target_demand, prob_success * 100))
  cat(sprintf("Average expected monthly output: %.0f units\\n", mean(total_yields)))
  
  hist(total_yields, breaks=40, col="#3fb950", main="Monthly Manufacturing Yield", xlab="Total Units Produced")
  abline(v=target_demand, col="red", lwd=2, lty=2)
}

simulate_manufacturing(n_simulations=${numSimulations}, breakdown_prob=${breakdownProb / 100}, target_demand=${targetDemand})`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#161b22';
    ctx.fillRect(0, 0, width, height);

    let meetDemandCount = 0;
    const results = [];
    const pBreakdown = breakdownProb / 100;

    for (let i = 0; i < numSimulations; i++) {
      let totalMonthlyYield = 0;

      for (let day = 0; day < daysInPeriod; day++) {
        // 1 = active, 0 = breakdown
        const machineActive = Math.random() >= pBreakdown ? 1 : 0;

        // Worker Capacity ~ N(0.9, 0.05) bounded [0.5, 1.0]
        let workerCap = MathUtils.randomNormal(0.9, 0.05);
        if (workerCap > 1.0) workerCap = 1.0;
        if (workerCap < 0.5) workerCap = 0.5;

        // Material Capacity ~ N(0.85, 0.1) bounded [0.4, 1.0]
        let materialCap = MathUtils.randomNormal(0.85, 0.1);
        if (materialCap > 1.0) materialCap = 1.0;
        if (materialCap < 0.4) materialCap = 0.4;

        const dailyYield = maxCapacityPerDay * machineActive * workerCap * materialCap;
        totalMonthlyYield += dailyYield;
      }

      results.push(totalMonthlyYield);
      if (totalMonthlyYield >= targetDemand) {
        meetDemandCount++;
      }
    }

    setSuccessProb(meetDemandCount / numSimulations);

    // Plot Histogram
    results.sort((a, b) => a - b);
    const min = results[0];
    const max = results[results.length - 1];
    const bins = 40;
    const binWidth = (max - min) / bins;

    const histogram = new Array(bins).fill(0);
    for (const val of results) {
      let binIdx = Math.floor((val - min) / binWidth);
      if (binIdx >= bins) binIdx = bins - 1;
      histogram[binIdx]++;
    }

    const maxFreq = Math.max(...histogram);
    const xRatio = width / bins;
    const yRatio = height / maxFreq;

    ctx.fillStyle = 'rgba(63, 185, 80, 0.6)';
    ctx.strokeStyle = '#3fb950';
    ctx.lineWidth = 1;

    for (let i = 0; i < bins; i++) {
      const barHeight = histogram[i] * yRatio;
      const x = i * xRatio;
      const y = height - barHeight;

      ctx.fillRect(x, y, xRatio - 1, barHeight);
      ctx.strokeRect(x, y, xRatio - 1, barHeight);
    }

    // Draw Target Line
    const targetX = ((targetDemand - min) / (max - min)) * width;
    if (targetX >= 0 && targetX <= width) {
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.moveTo(targetX, 0);
      ctx.lineTo(targetX, height);
      ctx.strokeStyle = '#f85149';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f85149';
      ctx.font = '12px sans-serif';
      ctx.fillText('Demand', targetX + 5, 20);
    }

  }, [numSimulations, breakdownProb, targetDemand]);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Manufacturing & QC</h1>

      <div className="grid grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '1.5rem', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Card title="Controls">
            <Slider
              label="Simulations"
              min={100} max={10000} step={100}
              value={numSimulations}
              onChange={setNumSimulations}
            />

            <div style={{ marginTop: '1.5rem' }}>
              <Slider
                label="Machine Breakdown Probability (%)"
                min={0} max={30} step={1}
                value={breakdownProb}
                onChange={setBreakdownProb}
                description="Daily chance a machine fails completely."
              />
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <Slider
                label="Target Monthly Demand"
                min={1500} max={3000} step={50}
                value={targetDemand}
                onChange={setTargetDemand}
              />
            </div>
          </Card>

          <Card title="Concept">
            <p style={{ fontSize: '0.9rem' }}>
              Real-world manufacturing is heavily impacted by random events: <strong>machine failures, supply chain delays, and raw material shortages</strong>.<br /> <br />
              By simulating standard operations yielding <Latex math={String.raw`\sim\mathcal{N}(\mu, \sigma^2)`} /> limits across 30 days multiplied by failure rates, we can gauge risk exposure to miss orders.
            </p>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', padding: '0 1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>P(Meeting Demand)</div>
                <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-mono)', color: successProb > 0.5 ? '#3fb950' : '#f85149' }}>{(successProb * 100).toFixed(1)}%</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', background: '#010409', borderRadius: '8px', padding: '1rem', border: '1px solid var(--card-border)' }}>
              <canvas
                ref={canvasRef}
                width={450}
                height={280}
                style={{ background: '#0d1117', borderRadius: '4px', maxWidth: '100%', height: 'auto', border: '1px solid rgba(255,255,255,0.05)' }}
              />
            </div>
            <p className="text-muted" style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem' }}>
              Distribution of 30-day production output over {numSimulations} iterations.
            </p>
          </Card>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem' }}>Export Code</h2>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <CodeExporter language="Python" code={pythonCode} />
            <CodeExporter language="R" code={rCode} />
          </div>
        </Card>
      </div>

    </div>
  );
};

export default Manufacturing;
