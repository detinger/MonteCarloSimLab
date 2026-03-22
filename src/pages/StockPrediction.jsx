import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import CodeExporter from '../components/CodeExporter';
import { Latex } from '../components/ui/Latex';

const StockPrediction = () => {
  const [s0, setS0] = useState(100);
  const [mu, setMu] = useState(0.05);
  const [sigma, setSigma] = useState(0.2);
  const [days, setDays] = useState(252);
  const [numPaths, setNumPaths] = useState(5);

  // Generate data for Recharts
  const data = useMemo(() => {
    const paths = Array.from({ length: numPaths }, () => [s0]);
    const dt = 1 / 252; // Trade days in a year

    for (let p = 0; p < numPaths; p++) {
      for (let t = 1; t <= days; t++) {
        // Standard normal approx using Box-Muller
        const u1 = Math.random() || 0.00000001; // prevent log(0)
        const u2 = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

        const prevS = paths[p][t - 1];
        const dS = prevS * (mu * dt + sigma * Math.sqrt(dt) * z);
        paths[p].push(prevS + dS);
      }
    }

    const chartData = [];
    for (let t = 0; t <= days; t++) {
      const point = { day: t };
      for (let p = 0; p < numPaths; p++) {
        point[`path${p}`] = paths[p][t];
      }
      chartData.push(point);
    }
    return chartData;
  }, [s0, mu, sigma, days, numPaths]);

  const colors = ['#58a6ff', '#a371f7', '#3fb950', '#f85149', '#d29922', '#e6edf3', '#2f81f7', '#8957e5', '#ff7b72', '#f2cc60'];

  const pythonCode = `import numpy as np
import matplotlib.pyplot as plt

S0 = ${s0}       # Initial stock price
mu = ${mu}       # Expected return (drift)
sigma = ${sigma}    # Volatility
T = ${days} / 252  # Time horizon in years
dt = 1 / 252     # Time step 
paths = ${numPaths}        # Number of simulated paths
N = ${days}        # Number of time steps

# Array to store simulated paths
S = np.zeros((N + 1, paths))
S[0] = S0

# Simulate paths
for t in range(1, N + 1):
    Z = np.random.standard_normal(paths)
    S[t] = S[t-1] * np.exp((mu - 0.5 * sigma**2) * dt + sigma * np.sqrt(dt) * Z)

# Plotting the results
plt.figure(figsize=(10, 6))
plt.plot(S)
plt.title("Monte Carlo Simulation: Geometric Brownian Motion")
plt.xlabel("Days")
plt.ylabel("Stock Price")
plt.grid(True)
plt.show()`;

  const rCode = `S0 <- ${s0}
mu <- ${mu}
sigma <- ${sigma}
days <- ${days}
dt <- 1 / 252
paths <- ${numPaths}
T <- days * dt

# Create matrix to store paths
S <- matrix(0, nrow = days + 1, ncol = paths)
S[1, ] <- S0

# Simulate paths
for (t in 2:(days + 1)) {
  Z <- rnorm(paths, mean = 0, sd = 1)
  S[t, ] <- S[t-1, ] * exp((mu - 0.5 * sigma^2) * dt + sigma * sqrt(dt) * Z)
}

# Plotting
matplot(S, type = "l", lty = 1, col = rainbow(paths), 
        main = "Monte Carlo Sim: Geometric Brownian Motion",
        xlab = "Days", ylab = "Stock Price")`;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Stock Price Prediction (GBM)</h1>

      <div className="grid" style={{ gridTemplateColumns: '1fr 2.5fr', gap: '1.5rem', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Card title="Parameters">
            <Input label={<span>Initial Price (<Latex math={String.raw`S_0`} />)</span>} value={s0} onChange={setS0} min={1} />
            <Input label={<span>Expected Return (<Latex math={String.raw`\mu`} />)</span>} value={mu} onChange={setMu} step={0.01} />
            <Input label={<span>Volatility (<Latex math={String.raw`\sigma`} />)</span>} value={sigma} onChange={setSigma} step={0.01} min={0.01} />
            <Input label="Time Horizon (Days)" value={days} onChange={setDays} min={1} max={1000} />
            <Input label="Number of Paths" value={numPaths} onChange={setNumPaths} min={1} max={20} />
          </Card>
        </div>

        <div>
          <Card title="Simulated Paths">
            <div style={{ height: '400px', width: '100%', background: '#010409', borderRadius: '8px', padding: '1rem', border: '1px solid var(--card-border)' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickMargin={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} domain={['auto', 'auto']} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                  {Array.from({ length: numPaths }).map((_, i) => (
                    <Line key={i} type="monotone" dataKey={`path${i}`} stroke={colors[i % colors.length]} dot={false} strokeWidth={1.5} isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '1rem' }}>
              Using the Geometric Brownian Motion model: <Latex math={String.raw`dS_t = \mu S_t dt + \sigma S_t dW_t`} block={true} />
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

export default StockPrediction;
