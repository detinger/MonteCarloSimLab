import React from 'react';
import { Card } from '../components/ui/Card';

const Theory = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Monte Carlo Simulation</h1>
      <p className="text-muted" style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>
        A computational algorithm that relies on repeated random sampling to obtain numerical results.
      </p>

      <Card title="Concept Overview">
        <p style={{ marginBottom: '1rem' }}>
          The Monte Carlo method allows us to model complex systems or evaluate mathematical expressions by simulating random variables and observing the outcomes. Rather than solving problems analytically, we approximate the solution by drawing random samples from a probability distribution.
        </p>
        <p>
          Its underlying principle relates heavily to the <strong>Law of Large Numbers (LLN)</strong>, which states that as the number of identically distributed, randomly generated variables increases, their sample mean approaches their theoretical mean.
        </p>
      </Card>

      <Card title="How It Works (General Steps)">
        <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <li><strong>Define a Domain of Possible Inputs:</strong> Understand the probability distributions of the factors involved (e.g., normal distributions for stock returns).</li>
          <li><strong>Generate Inputs Randomly:</strong> Draw random samples over this domain using pseudo-random number generators.</li>
          <li><strong>Perform a Deterministic Computation:</strong> Feed the random inputs into a given model (e.g., Pi circle area equation, or Black-Scholes).</li>
          <li><strong>Aggregate the Results:</strong> Calculate the average, variance, and confidence intervals of the outputs.</li>
        </ol>
      </Card>

      <Card title="Why use Monte Carlo?">
        <p style={{ marginBottom: '1rem' }}>
          Many real-world phenomena involve uncertainty and multiple interacting random variables. When analytical (exact) solutions are mathematically too complex or impossible to compute, Monte Carlo simulation provides an extremely robust way to estimate probabilities and expected values.
        </p>
        <p className="text-muted">
          Used extensively in Finance (Option Pricing, Risk Management), Engineering, Physics, and Data Science.
        </p>
      </Card>
    </div>
  );
};

export default Theory;
