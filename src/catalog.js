import { CircleDot, Spline, PanelsTopLeft, Route, ChartNoAxesCombined, CalendarRange, Factory, Dices, Cake, Network, UsersRound, Package } from 'lucide-react'

const methods = ['Geometric sampling','Mean-value integration','Conditional probability','Lattice path','Geometric Brownian motion','Precedence network','Daily capacity','Discrete sampling','Collision counting','Series and parallel systems','First-come, first-served','Periodic review']
const levels = ['Introductory','Intermediate','Introductory','Intermediate','Intermediate','Intermediate','Intermediate','Introductory','Introductory','Intermediate','Advanced','Advanced']

export const labs = [
  { id: 'pi', name: 'Estimating Pi', icon: CircleDot, field: 'Geometry', description: 'Estimate π from the fraction of random darts that land inside a circle.' },
  { id: 'integration', name: 'Monte Carlo Integration', icon: Spline, field: 'Numerical methods', description: 'Estimate a signed integral and compare it with an analytical reference.' },
  { id: 'montyhall', name: 'Monty Hall Problem', icon: PanelsTopLeft, field: 'Probability', description: 'Compare staying and switching when the host reveals a goat.' },
  { id: 'randomwalk', name: '2D Random Walk', icon: Route, field: 'Stochastic processes', description: 'Follow independent walkers taking random steps on a square lattice.' },
  { id: 'stock', name: 'Stock Price Prediction (GBM)', icon: ChartNoAxesCombined, field: 'Finance', description: 'Explore illustrative price paths under assumed drift and volatility.' },
  { id: 'projectmgmt', name: 'Project Scheduling & Risk', icon: CalendarRange, field: 'Operations', description: 'Estimate the chance of finishing three sequential activities by a deadline.' },
  { id: 'manufacturing', name: 'Manufacturing Quality Control', icon: Factory, field: 'Operations', description: 'Study how daily breakdowns and resource availability affect monthly output.' },
  { id: 'coins', name: 'Coin & Dice Experiments', icon: Dices, field: 'Probability', description: 'Compare observed coin and dice frequencies against their model probabilities.' },
  { id: 'birthday', name: 'Birthday Paradox', icon: Cake, field: 'Combinatorics', description: 'Estimate how often a group contains at least one shared birthday.' },
  { id: 'reliability', name: 'System Reliability', icon: Network, field: 'Engineering', description: 'Compare series and parallel systems built from independent components.' },
  { id: 'queue', name: 'Queueing & Service Operations', icon: UsersRound, field: 'Operations', description: 'Follow a single server and measure waiting times as demand changes.' },
  { id: 'inventory', name: 'Inventory & Reorder Planning', icon: Package, field: 'Operations', description: 'Test replenishment policies under uncertain demand and a specified lead time.' },
].map((lab,index)=>({...lab,code:'EX'+String(index+1).padStart(2,'0'),method:methods[index],level:levels[index]}))
