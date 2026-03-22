import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Slider } from '../components/ui/Slider';
import CodeExporter from '../components/CodeExporter';

const MathUtils = {
  // Box-Muller transform to generate normally distributed numbers
  generateRandomNormal: (mean = 0, stdDev = 1) => {
    let u1 = Math.random();
    let u2 = Math.random();
    let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }
};

const RandomWalk = () => {
  const [numSteps, setNumSteps] = useState(100);
  const [numWalkers, setNumWalkers] = useState(5);
  const canvasRef = useRef(null);

  // Generate Python Code
  const pythonCode = `import random
import matplotlib.pyplot as plt

def simulate_random_walk(steps, walkers):
    plt.figure(figsize=(8,8))
    
    for _ in range(walkers):
        x, y = 0, 0
        x_path, y_path = [0], [0]
        
        for _ in range(steps):
            # Move in a random direction (North, South, East, West)
            direction = random.choice([(0,1), (0,-1), (1,0), (-1,0)])
            x += direction[0]
            y += direction[1]
            x_path.append(x)
            y_path.append(y)
            
        plt.plot(x_path, y_path, alpha=0.7)
        
    plt.title(f"2D Random Walk: {walkers} paths with {steps} steps")
    plt.grid(True)
    plt.show()

simulate_random_walk(${numSteps}, ${numWalkers})`;

  // Generate R Code
  const rCode = `simulate_random_walk <- function(steps, walkers) {
  plot(0, 0, xlim=c(-sqrt(steps)*2, sqrt(steps)*2), 
       ylim=c(-sqrt(steps)*2, sqrt(steps)*2), 
       type="n", xlab="X", ylab="Y", 
       main=sprintf("2D Random Walk: %d paths", walkers))
  
  directions <- list(c(0,1), c(0,-1), c(1,0), c(-1,0))
  colors <- rainbow(walkers)
  
  for(w in 1:walkers) {
    x <- 0; y <- 0
    x_path <- numeric(steps+1); x_path[1] <- 0
    y_path <- numeric(steps+1); y_path[1] <- 0
    
    for(s in 1:steps) {
      dir <- sample(directions, 1)[[1]]
      x <- x + dir[1]
      y <- y + dir[2]
      x_path[s+1] <- x
      y_path[s+1] <- y
    }
    
    lines(x_path, y_path, col=colors[w])
  }
}

simulate_random_walk(${numSteps}, ${numWalkers})`;

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
    
    // Draw origin guidelines
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(width/2, 0); ctx.lineTo(width/2, height);
    ctx.moveTo(0, height/2); ctx.lineTo(width, height/2);
    ctx.stroke();

    const colors = ['#f85149', '#58a6ff', '#3fb950', '#a371f7', '#d29922', '#e34c26', '#1f6feb', '#238636'];

    // Expected drift vs scale factor (adjust scale to keep paths within canvas mostly)
    // Range is rough bounded theoretically by sqrt(numSteps) for standard dev.
    const standardDevBound = Math.sqrt(numSteps);
    // Scale ensures about 3 standard devs fit within the half-width
    const scale = (width / 2) / (standardDevBound * 3);
    
    for(let w = 0; w < numWalkers; w++) {
        let x = 0;
        let y = 0;
        const color = colors[w % colors.length];
        
        ctx.beginPath();
        ctx.moveTo(width/2, height/2);
        
        for (let s = 0; s < numSteps; s++) {
            // Pick standard compass directions or use Gaussian random for generic Brownian
            // Discrete 2D choices: up, down, left, right
            const rand = Math.random();
            if (rand < 0.25) y -= 1;
            else if (rand < 0.5) y += 1;
            else if (rand < 0.75) x -= 1;
            else x += 1;
            
            ctx.lineTo((width/2) + x * scale, (height/2) + y * scale);
        }
        
        ctx.strokeStyle = color + 'AA'; // add transparency
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Final point marker
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc((width/2) + x * scale, (height/2) + y * scale, 3, 0, 2*Math.PI);
        ctx.fill();
    }
  }, [numSteps, numWalkers]);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>2D Random Walk (Brownian Motion)</h1>
      
      <div className="grid grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '1.5rem', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Card title="Controls">
            <Slider 
              label="Number of Steps" 
              min={10} max={5000} step={10} 
              value={numSteps} 
              onChange={setNumSteps} 
              description="How many discrete moves each particle makes over time."
            />
            
            <div style={{ marginTop: '1.5rem' }}>
              <Slider 
                label="Number of Walkers/Particles" 
                min={1} max={20} step={1} 
                value={numWalkers} 
                onChange={setNumWalkers} 
                description="Simulate the paths of multiple entities simultaneously."
              />
            </div>
            
            <div style={{ marginTop: '2rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Expected Distance from Origin</div>
              <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-mono)', color: '#a371f7' }}>
                {Math.sqrt(numSteps).toFixed(1)} <span style={{fontSize: '1rem'}}>units</span>
              </div>
            </div>
          </Card>
          
          <Card title="Concept">
            <p style={{ fontSize: '0.9rem' }}>
              Random walks map the trajectory of a particle taking successive, random steps. It is a foundational component of many Monte Carlo simulations tracking molecular drift, stock price fluctuations, or search strategies over vast networks.
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

export default RandomWalk;
