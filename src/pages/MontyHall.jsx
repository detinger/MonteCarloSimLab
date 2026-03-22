import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Slider } from '../components/ui/Slider';
import CodeExporter from '../components/CodeExporter';
import { Latex } from '../components/ui/Latex';

const MontyHall = () => {
  const [numGames, setNumGames] = useState(100);
  const [stayWinRate, setStayWinRate] = useState(0);
  const [switchWinRate, setSwitchWinRate] = useState(0);
  const canvasRef = useRef(null);

  // Generate Python Code
  const pythonCode = `import random

def simulate_monty_hall(n):
    stay_wins = 0
    switch_wins = 0
    
    for _ in range(n):
        # 0, 1, 2 represent the three doors
        car_door = random.randint(0, 2)
        chosen_door = random.randint(0, 2)
        
        # Monty opens a door that has a goat and wasn't chosen
        remaining_doors = [d for d in [0, 1, 2] if d != chosen_door and d != car_door]
        monty_opens = random.choice(remaining_doors)
        
        # Determine the switched door
        switched_door = [d for d in [0, 1, 2] if d != chosen_door and d != monty_opens][0]
        
        # Evaluate strategies
        if chosen_door == car_door:
            stay_wins += 1
        if switched_door == car_door:
            switch_wins += 1
            
    return stay_wins / n, switch_wins / n

n_simulations = ${numGames}
stay_rate, switch_rate = simulate_monty_hall(n_simulations)
print(f"After {n_simulations} games:")
print(f"Stay Win Rate: {stay_rate * 100:.2f}%")
print(f"Switch Win Rate: {switch_rate * 100:.2f}%")`;

  // Generate R Code
  const rCode = `simulate_monty_hall <- function(n) {
  stay_wins <- 0
  switch_wins <- 0
  
  for(i in 1:n) {
    doors <- c(1, 2, 3)
    car_door <- sample(doors, 1)
    chosen_door <- sample(doors, 1)
    
    # Monty opens a door with a goat
    monty_options <- setdiff(doors, c(chosen_door, car_door))
    if (length(monty_options) > 1) {
      monty_opens <- sample(monty_options, 1)
    } else {
      monty_opens <- monty_options
    }
    
    # Calculate switched door
    switched_door <- setdiff(doors, c(chosen_door, monty_opens))
    
    # Evaluate strategies
    if (chosen_door == car_door) stay_wins <- stay_wins + 1
    if (switched_door == car_door) switch_wins <- switch_wins + 1
  }
  
  c(stay = stay_wins / n, switch = switch_wins / n)
}

n_simulations <- ${numGames}
rates <- simulate_monty_hall(n_simulations)
cat(sprintf("After %d games:\\n", n_simulations))
cat(sprintf("Stay Win Rate: %.2f%%\\n", rates["stay"] * 100))
cat(sprintf("Switch Win Rate: %.2f%%\\n", rates["switch"] * 100))`;

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
    
    let stayWins = 0;
    let switchWins = 0;
    
    const stayHistory = [];
    const switchHistory = [];

    // Run simulation
    for (let i = 1; i <= numGames; i++) {
        const carDoor = Math.floor(Math.random() * 3);
        const chosenDoor = Math.floor(Math.random() * 3);
        
        // Find which door Monty opens
        let montyOptions = [0, 1, 2].filter(d => d !== chosenDoor && d !== carDoor);
        let montyOpens = montyOptions[Math.floor(Math.random() * montyOptions.length)];
        
        let switchedDoor = [0, 1, 2].find(d => d !== chosenDoor && d !== montyOpens);
        
        if (chosenDoor === carDoor) stayWins++;
        if (switchedDoor === carDoor) switchWins++;
        
        stayHistory.push(stayWins / i);
        switchHistory.push(switchWins / i);
    }
    
    const stayRate = stayWins / numGames;
    const switchRate = switchWins / numGames;
    
    setStayWinRate(stayRate);
    setSwitchWinRate(switchRate);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
        const y = height - (i / 10) * height;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }
    ctx.stroke();
    
    // Expected lines: 1/3 and 2/3
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, height - (1/3) * height);
    ctx.lineTo(width, height - (1/3) * height);
    ctx.moveTo(0, height - (2/3) * height);
    ctx.lineTo(width, height - (2/3) * height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw history lines
    const drawLine = (data, color) => {
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
            const x = (i / (numGames - 1)) * width;
            const y = height - (data[i] * height);
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    };
    
    drawLine(stayHistory, '#f85149'); // Red for staying
    drawLine(switchHistory, '#58a6ff'); // Blue for switching

  }, [numGames]);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Monty Hall Problem</h1>
      
      <div className="grid grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '1.5rem', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Card title="Controls">
            <Slider 
              label="Number of Games Simulated" 
              min={10} max={5000} step={10} 
              value={numGames} 
              onChange={setNumGames} 
              description="Observe how win rates converge towards expected probabilities as N increases."
            />
            
            <div style={{ marginTop: '2rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>"Stay" Win Rate (Exp: ~33.3%)</div>
              <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-mono)', color: '#f85149' }}>
                {(stayWinRate * 100).toFixed(1)}%
              </div>
            </div>
            
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>"Switch" Win Rate (Exp: ~66.7%)</div>
              <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-mono)', color: '#58a6ff' }}>
                {(switchWinRate * 100).toFixed(1)}%
              </div>
            </div>
            
          </Card>
          
          <Card title="Concept">
            <p style={{ fontSize: '0.9rem' }}>
              In the Monty Hall problem, you pick a door to win a car (but two hold goats). The host opens a door to reveal a goat. Should you switch your choice?
              <br/><br/>
              Counterintuitively, switching <strong>doubles</strong> your chances of winning from <Latex math="\sim 33\%" /> to <Latex math="\sim 66\%" />. Monte Carlo simulations empirically prove this law of probability by running the game thousands of times.
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
              <span style={{ color: '#58a6ff' }}>───</span> Switching strategy &nbsp;&nbsp;&nbsp; 
              <span style={{ color: '#f85149' }}>───</span> Staying strategy
            </p>
          </Card>
        </div>
      </div>
      
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem' }}>Export Code</h2>
        <Card>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Simulate the paradox programmatically to prove it to yourself.
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

export default MontyHall;
