import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Slider } from '../components/ui/Slider';
import CodeExporter from '../components/CodeExporter';
import { Latex } from '../components/ui/Latex';

const Integration = () => {
  const [numPoints, setNumPoints] = useState(1000);
  const [areaEstimate, setAreaEstimate] = useState(0);
  const canvasRef = useRef(null);

  const exactArea = 2; // Integral of sin(x) from 0 to PI is 2
  const boxArea = Math.PI * 1; // Width (PI) * Height (1)

  // Generate Python Code
  const pythonCode = `import random
import math

def mc_integrate_sin(n):
    inside_area = 0
    box_width = math.pi
    box_height = 1.0
    
    for _ in range(n):
        x = random.uniform(0, box_width)
        y = random.uniform(0, box_height)
        
        if y <= math.sin(x):
            inside_area += 1
            
    estimated_area = (inside_area / n) * (box_width * box_height)
    return estimated_area

n_simulations = ${numPoints}
estimated_area = mc_integrate_sin(n_simulations)
print(f"Estimated area with {n_simulations} points is: {estimated_area:.6f}")
print(f"Exact area is: 2.0")`;

  // Generate R Code
  const rCode = `mc_integrate_sin <- function(n) {
  box_width <- pi
  box_height <- 1.0
  
  x <- runif(n, min = 0, max = box_width)
  y <- runif(n, min = 0, max = box_height)
  
  inside_area <- sum(y <= sin(x))
  estimated_area <- (inside_area / n) * (box_width * box_height)
  
  return(estimated_area)
}

n_simulations <- ${numPoints}
estimated_area <- mc_integrate_sin(n_simulations)
cat(sprintf("Estimated area with %d points is: %f\\n", n_simulations, estimated_area))
cat("Exact area is: 2.0\\n")`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#161b22';
    ctx.fillRect(0, 0, width, height);

    // Draw function sin(x)
    ctx.beginPath();
    for (let px = 0; px <= width; px++) {
      const x = (px / width) * Math.PI;
      const py = height - (Math.sin(x) * height);
      if (px === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#3fb950';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fill function area
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fillStyle = 'rgba(63, 185, 80, 0.1)';
    ctx.fill();

    let inside = 0;

    // Draw points
    for (let i = 0; i < numPoints; i++) {
      const x = Math.random() * Math.PI;
      const y = Math.random();

      const isInside = y <= Math.sin(x);
      if (isInside) inside++;

      const canvasX = (x / Math.PI) * width;
      const canvasY = height - (y * height);

      ctx.fillStyle = isInside ? 'rgba(63, 185, 80, 0.8)' : 'rgba(88, 166, 255, 0.6)';
      ctx.fillRect(canvasX, canvasY, 2, 2);
    }

    setAreaEstimate((inside / numPoints) * boxArea);
  }, [numPoints, boxArea]);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Monte Carlo Integration</h1>

      <div className="grid grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '1.5rem', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Card title="Controls">
            <Slider
              label="Number of Random Points"
              min={100} max={20000} step={100}
              value={numPoints}
              onChange={setNumPoints}
              description="Increase points to improve the accuracy of the integral estimation."
            />

            <div style={{ marginTop: '2rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Exact Area (<Latex math={String.raw`\int_0^\pi \sin(x) dx`} />)</div>
              <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)' }}>{exactArea.toFixed(6)}</div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Estimated Area</div>
              <div className="text-accent" style={{ fontSize: '2rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#3fb950' }}>
                {areaEstimate.toFixed(6)}
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Error</div>
              <div style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)', color: Math.abs(exactArea - areaEstimate) < 0.05 ? '#3fb950' : '#f85149' }}>
                {(Math.abs(exactArea - areaEstimate) / exactArea * 100).toFixed(2)}%
              </div>
            </div>
          </Card>

          <Card title="Concept">
            <p style={{ fontSize: '0.9rem' }}>
              Monte Carlo integration estimates the definite integral of a function.
              Here we evaluate <strong><Latex math={String.raw`f(x) = \sin(x)`} /> from 0 to <Latex math={String.raw`\pi`} /></strong>.
              <br /><br />
              By evaluating the function at uniformly spaced random points within a bounding box, the ratio of points falling under the curve to the total number of points approximates the ratio of the curve's area to the bounding box's area.
            </p>
          </Card>
        </div>

        <div>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'center', background: '#010409', borderRadius: '8px', padding: '1rem', border: '1px solid var(--card-border)' }}>
              <canvas
                ref={canvasRef}
                width={400}
                height={300}
                style={{ background: '#0d1117', borderRadius: '4px', maxWidth: '100%', height: 'auto', border: '1px solid rgba(255,255,255,0.05)' }}
              />
            </div>
            <p className="text-muted" style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem' }}>
              <span style={{ color: '#3fb950' }}>■</span> Area Under Curve &nbsp;&nbsp;&nbsp;
              <span style={{ color: 'rgba(88, 166, 255, 0.6)' }}>■</span> Area Above Curve
            </p>
          </Card>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem' }}>Export Code</h2>
        <Card>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Run this integration simulation in Python or R. The code replicates the Monte Carlo integration visualised above.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <CodeExporter language="Python" code={pythonCode} />
            <CodeExporter language="R" code={rCode} />
          </div>
        </Card>
      </div>

    </div>
  );
};

export default Integration;
