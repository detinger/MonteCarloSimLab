# 🎲 Monte Carlo Simulation Lab

An interactive, high-performance web application designed for students and researchers to explore the power of **Monte Carlo Simulations**. This lab provides a hands-on environment to visualize probability theories, mathematical constants, and real-world risk assessments using repeated random sampling.

---

## 🚀 Overview

The **Monte Carlo Lab** allows users to interactively adjust parameters for various complex scenarios and immediately see the results converge through dynamic visualizations. Every simulation includes:

- **Interactive Controls**: Tune sample sizes, probability weights, and environmental variables.
- **Dynamic Visuals**: Watch results emerge in real-time via HTML5 Canvas or Recharts.
- **Mathematical Foundations**: Beautifully rendered LaTeX formulas for all underlying models.
- **Algorithm Export**: Get ready-to-use **Python** and **R** code snippets to replicate simulations locally.

---

## 🛠️ Included Simulations

### 1. 🎯 Estimating Pi ($\pi$)

The classic geometric Monte Carlo approach. By "throwing darts" into a square bounding a circle, we use the ratio of hits to estimate $\pi$ using the area formula: $A = \pi r^2$.

### 2. 📈 Stock Price Prediction

Simulates future stock price paths using **Geometric Brownian Motion (GBM)**.

- **Equation**: $dS_t = \mu S_t dt + \sigma S_t dW_t$
- Users can adjust initial price, drift ($\mu$), and volatility ($\sigma$) to see a "fan" of potential future trajectories.

### 3. 📐 Monte Carlo Integration

Calculates definite integrals where analytical solutions might be difficult. The lab visualizes the area under the curve for functions like $\sin(x)$ from $0$ to $\pi$, empirically proving the Fundamental Theorem of Calculus.

### 4. 🚪 Monty Hall Problem

A counter-intuitive simulation of the famous game show paradox. Observe how the "Switch" strategy consistently outperforms the "Stay" strategy over thousands of trials.

### 5. 🗺️ 2D Random Walk (Brownian Motion)

Visualizes the drunkard's walk or particle drift. Adjust steps and the number of walkers to see how the displacement from the origin follows the $\sqrt{N}$ rule.

### 6. 📅 Project Scheduling & Risk

A real-world application for project managers. Simulates procurement, construction, and inspection delays using Gaussian distributions to predict the probability of hitting deadlines (e.g., 100 vs 120 days).

### 7. 🏭 Manufacturing Quality Control

Predicts monthly factory output by accounting for random machine breakdowns, material shortages, and labor availability fluctuations.

---

## 💻 Tech Stack

- **Frontend Framework**: [React 19](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Styling**: Vanilla CSS with a focus on dark-mode aesthetics and responsiveness.
- **Visualizations**:
  - [Recharts](https://recharts.org/) for pathing and histograms.
  - HTML5 Canvas for high-frequency point rendering.
- **Math Rendering**: [KaTeX](https://katex.org/) for crisp, publication-quality formulas.
- **Syntax Highlighting**: [Prism](https://prismjs.com/) via `react-syntax-highlighter` for exported code chunks.
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 📦 Installation & Setup

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

1. **Clone the repository** (or download the source):

   ```bash
   git clone <your-repository-url>
   cd MonteCarloSimLab
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Start the development server**:

   ```bash
   npm run dev
   ```

   *The app will be available at `http://localhost:5173`.*

4. **Build for production**:

   ```bash
   npm run build
   ```

   *Static assets will be generated in the `dist/` folder.*

---

## 📖 How To Use

1. **Select a Simulation**: Use the sidebar navigation on the left to choose a concept.
2. **Read the Theory**: Every page starts with a brief overview of the mathematical concept.
3. **Adjust Parameters**: Use the sliders and input fields to change the number of simulations, time horizons, or probabilities.
4. **Observe the Results**: The charts and canvases will update automatically as you change inputs (Law of Large Numbers in action!).
5. **Export the Code**: Scroll down to find the Python and R implementations of your specific current parameters. Click **Copy** to use them in your own local scripts.

---

## 📄 License

This project is intended for educational purposes. Feel free to use, modify, and extend it for your own learning or teaching materials.
