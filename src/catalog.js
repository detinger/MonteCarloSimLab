import { CircleDot, Spline, PanelsTopLeft, Route, ChartNoAxesCombined, CalendarRange, Factory, Dices, Cake, Network, UsersRound, Package } from 'lucide-react'

export const labs = [
  // ─── Beginner ────────────────────────────────────────────────────────────
  { id: 'pi',          name: 'Estimating Pi',                   icon: CircleDot,           field: 'Geometry',            level: 'Beginner',     method: 'Geometric sampling',         description: 'Estimate π from the fraction of random darts that land inside a circle.' },
  { id: 'montyhall',   name: 'Monty Hall Problem',              icon: PanelsTopLeft,       field: 'Probability',         level: 'Beginner',     method: 'Conditional probability',    description: 'Compare staying and switching when the host reveals a goat.' },
  { id: 'coins',       name: 'Coin & Dice Experiments',         icon: Dices,               field: 'Probability',         level: 'Beginner',     method: 'Discrete sampling',          description: 'Compare observed coin and dice frequencies against their model probabilities.' },
  { id: 'birthday',    name: 'Birthday Paradox',                icon: Cake,                field: 'Combinatorics',       level: 'Beginner',     method: 'Collision counting',         description: 'Estimate how often a group contains at least one shared birthday.' },
  // ─── Intermediate ────────────────────────────────────────────────────────
  { id: 'integration', name: 'Monte Carlo Integration',         icon: Spline,              field: 'Numerical methods',   level: 'Intermediate', method: 'Mean-value integration',     description: 'Estimate a signed integral and compare it with an analytical reference.' },
  { id: 'randomwalk',  name: '2D Random Walk',                  icon: Route,               field: 'Stochastic processes',level: 'Intermediate', method: 'Lattice path',               description: 'Follow independent walkers taking random steps on a square lattice.' },
  { id: 'stock',       name: 'Stock Price Prediction (GBM)',    icon: ChartNoAxesCombined, field: 'Finance',             level: 'Intermediate', method: 'Geometric Brownian motion',  description: 'Explore illustrative price paths under assumed drift and volatility.' },
  { id: 'projectmgmt', name: 'Project Scheduling & Risk',       icon: CalendarRange,       field: 'Operations',          level: 'Intermediate', method: 'Precedence network',         description: 'Estimate the chance of finishing three sequential activities by a deadline.' },
  { id: 'manufacturing',name: 'Manufacturing Quality Control',  icon: Factory,             field: 'Operations',          level: 'Intermediate', method: 'Daily capacity',             description: 'Study how daily breakdowns and resource availability affect monthly output.' },
  { id: 'reliability', name: 'System Reliability',              icon: Network,             field: 'Engineering',         level: 'Intermediate', method: 'Series and parallel systems', description: 'Compare series and parallel systems built from independent components.' },
  // ─── Advanced ────────────────────────────────────────────────────────────
  { id: 'queue',       name: 'Queueing & Service Operations',   icon: UsersRound,          field: 'Operations',          level: 'Advanced',     method: 'First-come, first-served',   description: 'Follow a single server and measure waiting times as demand changes.' },
  { id: 'inventory',   name: 'Inventory & Reorder Planning',    icon: Package,             field: 'Operations',          level: 'Advanced',     method: 'Periodic review',            description: 'Test replenishment policies under uncertain demand and a specified lead time.' },
].map((lab,index)=>({...lab,code:'EX'+String(index+1).padStart(2,'0')}))
