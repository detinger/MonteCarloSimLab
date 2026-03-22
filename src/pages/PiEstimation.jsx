import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Slider } from '../components/ui/Slider';
import CodeExporter from '../components/CodeExporter';
import { Latex } from '../components/ui/Latex';

const PiEstimation = () => {
  const [numPoints, setNumPoints] = useState(1000);
  const [piEstimate, setPiEstimate] = useState(0);
  const canvasRef = useRef(null);

  // Generate Python Code
  const pythonCode = `import random

def estimate_pi_mc(n):
    inside_circle = 0
    for _ in range(n):
        x = random.uniform(-1, 1)
        y = random.uniform(-1, 1)
        if x**2 + y**2 <= 1:
            inside_circle += 1
            
    pi_estimate = 4 * inside_circle / n
    return pi_estimate

n_simulations = ${numPoints}
estimated_pi = estimate_pi_mc(n_simulations)
print(f"Estimated Pi with {n_simulations} points is: {estimated_pi}")`;

  // Generate R Code
  const rCode = `estimate_pi_mc <- function(n) {
  x <- runif(n, min = -1, max = 1)
  y <- runif(n, min = -1, max = 1)
  
  inside_circle <- sum((x^2 + y^2) <= 1)
  pi_estimate <- 4 * inside_circle / n
  
  return(pi_estimate)
}

n_simulations <- ${numPoints}
estimated_pi <- estimate_pi_mc(n_simulations)
cat(sprintf("Estimated Pi with %d points is: %f\\n", n_simulations, estimated_pi))`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw circle background
    ctx.fillStyle = '#161b22';
    ctx.fillRect(0, 0, width, height);

    ctx.beginPath();
    ctx.arc(width / 2, height / 2, width / 2, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(88, 166, 255, 0.3)';
    ctx.stroke();

    let inside = 0;

    // Draw points
    for (let i = 0; i < numPoints; i++) {
      // x, y mapped to -1 to 1
      const x = Math.random() * 2 - 1;
      const y = Math.random() * 2 - 1;

      const isInside = (x * x + y * y) <= 1;
      if (isInside) inside++;

      // Map to canvas coordinates
      const canvasX = (x + 1) * width / 2;
      const canvasY = (y + 1) * height / 2;

      ctx.fillStyle = isInside ? 'rgba(88, 166, 255, 0.8)' : 'rgba(163, 113, 247, 0.6)';
      ctx.fillRect(canvasX, canvasY, 2, 2);
    }

    setPiEstimate(4 * (inside / numPoints));
  }, [numPoints]);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Estimating Pi (<Latex math={String.raw`\pi`} />)</h1>

      <div className="grid grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '1.5rem', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Card title="Controls">
            <Slider
              label="Number of Points"
              min={100} max={20000} step={100}
              value={numPoints}
              onChange={setNumPoints}
              description="Adjust to see the Law of Large Numbers in action. More points yield a better approximation."
            />

            <div style={{ marginTop: '2rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Actual Pi (Math.PI)</div>
              <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)' }}>{Math.PI.toFixed(6)}</div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Estimated Pi</div>
              <div className="text-accent" style={{ fontSize: '2rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {piEstimate.toFixed(6)}
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Error</div>
              <div style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)', color: Math.abs(Math.PI - piEstimate) < 0.05 ? '#3fb950' : '#f85149' }}>
                {(Math.abs(Math.PI - piEstimate) / Math.PI * 100).toFixed(2)}%
              </div>
            </div>
          </Card>

          <Card title="Concept">
            <p style={{ fontSize: '0.9rem' }}>
              By inscribing a circle of radius 1 inside a 2x2 square, the ratio of the circle's area to the square's area is <strong><Latex math={String.raw`\frac{\pi}{4}`} /></strong>.
              <br /><br />
              If we throw darts randomly into the square, the fraction of darts that hit inside the circle will approximate <Latex math={String.raw`\frac{\pi}{4}`} />.
            </p>
          </Card>
        </div>

        <div>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'center', background: '#010409', borderRadius: '8px', padding: '1rem', border: '1px solid var(--card-border)' }}>
              <canvas
                ref={canvasRef}
                width={400}
                height={400}
                style={{ background: '#0d1117', borderRadius: '4px', maxWidth: '100%', height: 'auto', border: '1px solid rgba(255,255,255,0.05)' }}
              />
            </div>
            <p className="text-muted" style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--accent-color)' }}>■</span> Inside Circle &nbsp;&nbsp;&nbsp;
              <span style={{ color: '#a371f7' }}>■</span> Outside Circle
            </p>
          </Card>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem' }}>Export Code</h2>
        <Card>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Run this simulation locally. The code dynamically updates based on the parameters chosen above.
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

export default PiEstimation;
