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

const ProjectManagement = () => {
  const [numSimulations, setNumSimulations] = useState(5000);
  const [procMean, setProcMean] = useState(30);
  const [constMean, setConstMean] = useState(60);
  const [targetDays, setTargetDays] = useState(100);
  
  const [probTarget, setProbTarget] = useState(0);
  const [prob120, setProb120] = useState(0);
  
  const canvasRef = useRef(null);

  // Generate Python Code
  const pythonCode = `import numpy as np
import matplotlib.pyplot as plt

def simulate_project_schedule(n_simulations):
    # Mean and standard deviation for each sequential task
    procurement = np.random.normal(loc=${procMean}, scale=${procMean * 0.2}, size=n_simulations)
    construction = np.random.normal(loc=${constMean}, scale=${constMean * 0.2}, size=n_simulations)
    inspection = np.random.normal(loc=10, scale=2, size=n_simulations)
    
    # Ensure no task takes negative time
    procurement = np.maximum(procurement, 0)
    construction = np.maximum(construction, 0)
    inspection = np.maximum(inspection, 0)
    
    # Total project duration
    total_duration = procurement + construction + inspection
    
    # Calculate probabilities
    target_days = ${targetDays}
    prob_target = np.mean(total_duration <= target_days)
    prob_120 = np.mean(total_duration <= 120)
    
    print(f"Probability of completion within {target_days} days: {prob_target * 100:.2f}%")
    print(f"Probability of completion within 120 days: {prob_120 * 100:.2f}%")
    
    plt.hist(total_duration, bins=50, color='#58a6ff', alpha=0.7)
    plt.axvline(target_days, color='r', linestyle='dashed', linewidth=2, label=f'Target ({target_days} days)')
    plt.title('Project Completion Time Distribution')
    plt.xlabel('Days')
    plt.ylabel('Frequency')
    plt.legend()
    plt.show()

simulate_project_schedule(${numSimulations})`;

  // Generate R Code
  const rCode = `simulate_project_schedule <- function(n_simulations) {
  proc_mean <- ${procMean}
  proc_sd <- proc_mean * 0.2
  
  const_mean <- ${constMean}
  const_sd <- const_mean * 0.2
  
  insp_mean <- 10
  insp_sd <- 2
  
  procurement <- pmax(0, rnorm(n_simulations, mean=proc_mean, sd=proc_sd))
  construction <- pmax(0, rnorm(n_simulations, mean=const_mean, sd=const_sd))
  inspection <- pmax(0, rnorm(n_simulations, mean=insp_mean, sd=insp_sd))
  
  total_duration <- procurement + construction + inspection
  
  target_days <- ${targetDays}
  prob_target <- mean(total_duration <= target_days)
  prob_120 <- mean(total_duration <= 120)
  
  cat(sprintf("Probability of completion within %d days: %.2f%%\\n", target_days, prob_target * 100))
  cat(sprintf("Probability of completion within 120 days: %.2f%%\\n", prob_120 * 100))
  
  hist(total_duration, breaks=50, col="#58a6ff", main="Project Completion Time", xlab="Days")
  abline(v=target_days, col="red", lwd=2, lty=2)
}

simulate_project_schedule(${numSimulations})`;

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
    
    let underTarget = 0;
    let under120 = 0;
    
    const results = [];
    
    // Standard deviations set dynamically relative to means for variance
    const procSd = procMean * 0.2;
    const constSd = constMean * 0.2;
    const inspMean = 10;
    const inspSd = 2;
    
    for (let i = 0; i < numSimulations; i++) {
        // Sequential task sum
        const proc = Math.max(0, MathUtils.randomNormal(procMean, procSd));
        const cons = Math.max(0, MathUtils.randomNormal(constMean, constSd));
        const insp = Math.max(0, MathUtils.randomNormal(inspMean, inspSd));
        
        const total = proc + cons + insp;
        results.push(total);
        
        if (total <= targetDays) underTarget++;
        if (total <= 120) under120++;
    }
    
    setProbTarget(underTarget / numSimulations);
    setProb120(under120 / numSimulations);
    
    // Plot Histogram
    results.sort((a,b) => a - b);
    const min = results[0];
    const max = results[results.length - 1];
    const bins = 50;
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
    
    ctx.fillStyle = 'rgba(88, 166, 255, 0.6)';
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < bins; i++) {
        const barHeight = histogram[i] * yRatio;
        const x = i * xRatio;
        const y = height - barHeight;
        
        ctx.fillRect(x, y, xRatio - 1, barHeight);
        ctx.strokeRect(x, y, xRatio - 1, barHeight);
    }
    
    // Draw Target Line
    const targetX = ((targetDays - min) / (max - min)) * width;
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
        ctx.fillText('Target', targetX + 5, 20);
    }
    
  }, [numSimulations, procMean, constMean, targetDays]);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Project Mgmt. & Scheduling</h1>
      
      <div className="grid grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '1.5rem', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Card title="Controls">
            <Slider 
              label="Simulations" 
              min={100} max={20000} step={100} 
              value={numSimulations} 
              onChange={setNumSimulations} 
            />
            
            <div style={{ marginTop: '1.5rem' }}>
              <Slider 
                label="Procurement Expected Days" 
                min={10} max={60} step={1} 
                value={procMean} 
                onChange={setProcMean} 
              />
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <Slider 
                label="Construction Expected Days" 
                min={30} max={120} step={1} 
                value={constMean} 
                onChange={setConstMean} 
              />
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <Slider 
                label="Target Deadline" 
                min={60} max={180} step={1} 
                value={targetDays} 
                onChange={setTargetDays} 
                description="Your goal completion time."
              />
            </div>
          </Card>
          
          <Card title="Results">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>P(Finish &le; {targetDays} days)</div>
                <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-mono)', color: '#3fb950' }}>
                  {(probTarget * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>P(Finish &le; 120 days)</div>
                <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-mono)', color: '#58a6ff' }}>
                  {(prob120 * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </Card>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'center', background: '#010409', borderRadius: '8px', padding: '1rem', border: '1px solid var(--card-border)' }}>
              <canvas 
                ref={canvasRef} 
                width={450} 
                height={300} 
                style={{ background: '#0d1117', borderRadius: '4px', maxWidth: '100%', height: 'auto', border: '1px solid rgba(255,255,255,0.05)' }} 
              />
            </div>
            <p className="text-muted" style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
              Histogram of simulated total project durations.<br/> <br/> Model factors in uncertainties across Procurement, Construction, and a fixed Inspection phase using Gaussian random variants (e.g. <Latex math="\sim \mathcal{N}(\mu, \sigma^2)" />).
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

export default ProjectManagement;
