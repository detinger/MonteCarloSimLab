import { Cloud, Rocket, Users, ShieldAlert, Gauge, Bug, Headphones, Server, FileCheck, Laptop, Wallet, TrendingUp, Wrench, ChartNoAxesCombined } from 'lucide-react'
import { saveProject, template } from './pages/builder/project'

// Pull title/question/unit/threshold/assumptions/expression/inputs from a Builder template.
function fromTemplate(meta) {
  const { title, question, unit, threshold, comparator, assumptions, expression, inputs } = template(meta.id)
  return { ...meta, title, question, unit, threshold, comparator, assumptions, expression, inputs }
}

// Ready-to-run Monte Carlo models ordered Beginner → Intermediate → Advanced.
// Each IT model carries a challenge. GN models share a definition with the Builder wizard.
export const itModels = [

  // ─── Beginner ─────────────────────────────────────────────────────────────
  { id:'cloud-cost', code:'IT01', name:'Cloud Cost Overrun', icon:Cloud, field:'Cloud · FinOps', level:'Beginner',
    description:"Estimate the chance next month's cloud bill blows past the budget.",
    challenge:'Move storage to a cheaper tier so its maximum falls to €2,200. Can you push P(bill > €20,000) below 20%?',
    title:'Cloud Cost Overrun', unit:'EUR', threshold:'20000',
    question:'What is the chance the monthly cloud bill exceeds €20,000?',
    assumptions:'Compute, storage, egress and support are independent monthly costs. Illustrative ranges.',
    expression:'compute + storage + egress + support',
    inputs:[
      {name:'compute',  label:'Compute',      distribution:'triangular', a:'8000', b:'12000', c:'18000'},
      {name:'storage',  label:'Storage',      distribution:'uniform',   a:'1500', b:'3000'},
      {name:'egress',   label:'Data egress',  distribution:'triangular', a:'500',  b:'1200', c:'3000'},
      {name:'support',  label:'Support plan', distribution:'constant',  a:'2000'},
    ] },

  { id:'delivery-risk', code:'IT02', name:'Software Delivery Risk', icon:Rocket, field:'Delivery', level:'Beginner',
    description:'How likely is a feature to overrun its person-day budget?',
    challenge:'Add a second backend engineer so the backend mode drops to ~18 days. Does P(effort > 120 days) fall under 30%?',
    title:'Software Delivery Risk', unit:'days', threshold:'120',
    question:'What is the chance delivery exceeds 120 person-days?',
    assumptions:'Module efforts are independent and additive. Contingency covers unplanned work.',
    expression:'backend + frontend + integration + contingency',
    inputs:[
      {name:'backend',     label:'Backend',     distribution:'triangular', a:'20', b:'35', c:'60'},
      {name:'frontend',    label:'Frontend',    distribution:'triangular', a:'15', b:'25', c:'45'},
      {name:'integration', label:'Integration', distribution:'triangular', a:'10', b:'18', c:'40'},
      {name:'contingency', label:'Contingency', distribution:'uniform',   a:'5',  b:'15'},
    ] },

  fromTemplate({ id:'budget', code:'GN01', name:'Project Budget', icon:Wallet, field:'Project finance', level:'Beginner',
    description:'Chance a project with three uncertain cost components exceeds its budget.' }),

  fromTemplate({ id:'rare', code:'GN03', name:'Rare Equipment Loss', icon:Wrench, field:'Risk', level:'Beginner',
    description:'A rare failure with a heavy loss: how often does one mission cost more than €50,000?' }),

  // ─── Intermediate ─────────────────────────────────────────────────────────
  // IT03: enhanced from a simple 3-input product to a 5-input net-MRR model.
  { id:'saas-churn', code:'IT03', name:'SaaS Net MRR Impact', icon:Users, field:'SaaS', level:'Intermediate',
    description:'Net monthly MRR change: how often does churn loss outpace new and expansion revenue?',
    challenge:'A retention campaign caps churn at 4.5% and product improvements lift expansion to Uniform(1%, 3%). Does P(net loss > €2,500) drop below 25%?',
    title:'SaaS Net MRR Impact', unit:'EUR', threshold:'2500',
    question:'What is the chance monthly MRR shrinks by more than €2,500 after churn and expansion?',
    assumptions:'Churn rate, ARPU, expansion rate and expansion uplift are independent. Customer base held constant at 1,200.',
    expression:'customers * churn * arpu - customers * expansion * arpu_uplift',
    inputs:[
      {name:'customers',    unit:'', label:'Active customers',              distribution:'constant', a:'1200'},
      {name:'churn',        unit:'', label:'Monthly churn rate',           distribution:'uniform',  a:'0.02', b:'0.06'},
      {name:'arpu',         label:'Revenue per churned customer (EUR)', distribution:'triangular', a:'40', b:'60', c:'90'},
      {name:'expansion',    unit:'', label:'Monthly expansion rate',       distribution:'uniform',  a:'0.005', b:'0.02'},
      {name:'arpu_uplift',  label:'Expansion MRR per customer (EUR)', distribution:'uniform', a:'15', b:'40'},
    ] },

  { id:'devops-incident', code:'IT06', name:'DevOps Incident Cost', icon:Bug, field:'DevOps', level:'Intermediate',
    description:'Monthly cost of production incidents and downtime.',
    challenge:'Better runbooks cut the MTTR mode to 30 min. Does P(cost > €120,000) fall below 20%?',
    title:'DevOps Incident Cost', unit:'EUR', threshold:'120000',
    question:'What is the chance monthly incident cost exceeds €120,000?',
    assumptions:'Incident count, resolution time and per-minute cost are independent.',
    expression:'incidents * mttr * cost_min',
    inputs:[
      {name:'incidents', unit:'', label:'Incidents this month',       distribution:'poisson',   a:'3'},
      {name:'mttr',      unit:'min', label:'Mean time to resolve (min)', distribution:'triangular', a:'20', b:'45', c:'120'},
      {name:'cost_min',  unit:'EUR/min', label:'Downtime cost per minute (EUR)', distribution:'constant', a:'300'},
    ] },

  // IT07: enhanced from 2-input (tickets * handle) to a 5-input model with escalations and admin.
  { id:'helpdesk', code:'IT07', name:'Help Desk Workload', icon:Headphones, field:'Operations', level:'Intermediate',
    description:'Daily agent workload across ticket handling, escalations and administrative overhead.',
    challenge:'A self-service portal drops daily tickets to Poisson(60) and an escalation workflow cuts mean escalation time to Triangular(20, 45, 90) min. Does P(workload > 2,500 min) drop below 20%?',
    title:'Help Desk Daily Workload', unit:'min', threshold:'2500',
    question:'What is the chance daily workload exceeds 2,500 agent-minutes?',
    assumptions:'Ticket arrivals and escalations are independent Poisson processes. Handle and escalation times are independent of volume.',
    expression:'tickets * handle + escalations * escalation_time + admin',
    inputs:[
      {name:'tickets',         unit:'', label:'Daily tickets',           distribution:'poisson',   a:'80'},
      {name:'handle',          label:'Handle time (min)',        distribution:'triangular', a:'10', b:'18', c:'35'},
      {name:'escalations',     unit:'', label:'Escalations per day',     distribution:'poisson',   a:'8'},
      {name:'escalation_time', label:'Escalation time (min)',   distribution:'triangular', a:'30', b:'60', c:'120'},
      {name:'admin',           label:'Admin & meetings (min)',  distribution:'uniform',   a:'60', b:'120'},
    ] },

  { id:'server-load', code:'IT08', name:'Server Peak Load', icon:Server, field:'Infrastructure', level:'Intermediate',
    description:'Chance peak traffic exceeds provisioned capacity.',
    challenge:'Autoscaling raises capacity to 1,300 req/s. Change the threshold — what is the new breach probability?',
    title:'Server Peak Load', unit:'rps', threshold:'1000',
    question:'What is the chance peak load exceeds the 1,000 req/s capacity?',
    assumptions:'Baseline, promo and bot traffic are independent and additive at peak.',
    expression:'base + promo + bots',
    inputs:[
      {name:'base',  label:'Baseline traffic', distribution:'normal',      a:'400', b:'60'},
      {name:'promo', label:'Promo spike',       distribution:'triangular',  a:'0',   b:'200', c:'800'},
      {name:'bots',  label:'Bot traffic',       distribution:'exponential', a:'0.005'},
    ] },

  // IT09: enhanced from 3-input overage cost to a 5-input model that also includes audit penalty risk.
  { id:'license-overage', code:'IT09', name:'License Overage & Audit Risk', icon:FileCheck, field:'Compliance', level:'Intermediate',
    description:'Monthly cost of overage seats plus the risk of an audit-triggered penalty.',
    challenge:'An audit prep program reduces the audit probability to 2%. Does P(total cost > €10,000) drop below 3%?',
    title:'License Overage & Audit Risk', unit:'EUR', threshold:'10000',
    question:'What is the chance license overage and audit costs exceed €10,000?',
    assumptions:'Seats in use and over-contract fraction are independent. Audit occurs independently of overage fraction. Flat per-seat overage price.',
    expression:'seats * overage * price + audit * penalty',
    inputs:[
      {name:'seats',   unit:'', label:'Seats in use',             distribution:'triangular', a:'800', b:'1100', c:'1500'},
      {name:'overage', unit:'', label:'Fraction over contract',   distribution:'uniform',   a:'0',   b:'0.15'},
      {name:'price',   label:'Price per seat (EUR)',      distribution:'constant',  a:'45'},
      {name:'audit',   unit:'', label:'Audit occurs',             distribution:'bernoulli', a:'0.08'},
      {name:'penalty', label:'Audit penalty (EUR)',       distribution:'triangular', a:'5000', b:'20000', c:'50000'},
    ] },

  { id:'hardware-refresh', code:'IT10', name:'Hardware Refresh Budget', icon:Laptop, field:'Procurement', level:'Intermediate',
    description:'Chance a laptop refresh program overruns its budget.',
    challenge:'A bulk discount lowers the price mode to €1,050. Does P(spend > €180,000) drop below 40%?',
    title:'Hardware Refresh Budget', unit:'EUR', threshold:'180000',
    question:'What is the chance the hardware refresh exceeds €180,000?',
    assumptions:'Unit count, unit price and accessory cost are independent across devices.',
    expression:'laptops * (price + extras)',
    inputs:[
      {name:'laptops', unit:'', label:'Laptops to refresh',       distribution:'discrete',  a:'80',  b:'140'},
      {name:'price',   label:'Unit price (EUR)',          distribution:'triangular', a:'900', b:'1200', c:'1800'},
      {name:'extras',  label:'Accessories per unit (EUR)', distribution:'uniform', a:'50',  b:'150'},
    ] },

  fromTemplate({ id:'revenue', code:'GN02', name:'Product Revenue & Profit', icon:TrendingUp, field:'Sales', level:'Intermediate',
    description:'How often does net profit (after variable and fixed costs) exceed the target?' }),

  fromTemplate({ id:'stock', code:'GN04', name:'Stock Price (GBM)', icon:ChartNoAxesCombined, field:'Finance', level:'Intermediate',
    description:'One-year geometric Brownian motion: how likely is the price to end above where it started?' }),

  // ─── Advanced ─────────────────────────────────────────────────────────────
  // IT04: enhanced from a 3-input model to a 6-input model with incident response and regulatory fine risk.
  { id:'data-breach', code:'IT04', name:'Data Breach Total Cost', icon:ShieldAlert, field:'Security', level:'Advanced',
    description:'Total breach cost: remediation, incident response and the risk of a regulatory fine.',
    challenge:'Better perimeter security cuts breach probability to 8% and encryption reduces cost per record to Triangular(50, 90, 150). Does P(total loss > €3M) drop below 5%?',
    title:'Data Breach Total Cost', unit:'EUR', threshold:'3000000',
    question:'What is the chance a breach causes more than €3,000,000 in total losses?',
    assumptions:'At most one breach per period. Record count, remediation cost, incident response and regulatory fine are independent given a breach.',
    expression:'breach * (records * cost_rec + response + regulatory * fine)',
    inputs:[
      {name:'breach',     unit:'', label:'Breach occurs',                   distribution:'bernoulli', a:'0.15'},
      {name:'records',    unit:'', label:'Records exposed',                  distribution:'triangular', a:'5000', b:'20000', c:'80000'},
      {name:'cost_rec',   label:'Remediation per record (EUR)',     distribution:'triangular', a:'80',   b:'140',   c:'220'},
      {name:'response',   label:'Incident response cost (EUR)',     distribution:'uniform',   a:'50000', b:'200000'},
      {name:'regulatory', unit:'', label:'Regulatory action',               distribution:'bernoulli', a:'0.4'},
      {name:'fine',       label:'Regulatory fine (EUR)',           distribution:'triangular', a:'100000', b:'300000', c:'1000000'},
    ] },

  { id:'api-latency', code:'IT05', name:'API Latency SLA', icon:Gauge, field:'Reliability', level:'Advanced',
    description:'Chance a request breaches the 250 ms latency SLA under realistic tail distributions.',
    challenge:'A read replica lowers the database log-mean to 2.6. Can you keep P(latency > 250 ms) under 5%?',
    title:'API Latency SLA', unit:'ms', threshold:'250',
    question:'What is the chance request latency breaches the 250 ms SLA?',
    assumptions:'Compute, database and queue times are independent and additive per request. Database latency has a heavy right tail modelled with a lognormal distribution; queue waits use an exponential model.',
    expression:'base + db + queue',
    inputs:[
      {name:'base',  label:'App compute (ms)',  distribution:'normal',      a:'120', b:'15'},
      {name:'db',    label:'Database (ms)',      distribution:'lognormal',   a:'3.0', b:'0.4'},
      {name:'queue', label:'Queue wait (ms)',    distribution:'exponential', a:'0.03'},
    ] },
]

// Materialise a model into a fresh Builder project (new id each time).
export function buildModel(m) {
  return {
    version: 1, id: crypto.randomUUID(), kind: 'builder',
    title: m.title, question: m.question, unit: m.unit,
    expression: m.expression, comparator: m.comparator || '>', threshold: m.threshold,
    samples: '10000', seed: '42', assumptions: m.assumptions,
    inputs: m.inputs.map(i => ({ unit: m.unit, ...i })),
    relations: [], positions: {},
  }
}

// Save a model as a new Builder project and switch to the Builder.
export async function openModel(m) {
  const draft = buildModel(m)
  const record = { id: draft.id, project: draft, run: null, updatedAt: new Date().toISOString() }
  try {
    await saveProject(record, null)
    window.dispatchEvent(new Event('mc-project-change'))
    sessionStorage.setItem('mc-builder-open', draft.id)
  } catch { /* storage unavailable — the Builder opens a blank model instead */ }
  window.dispatchEvent(new CustomEvent('mc-builder-open', { detail: draft.id }))
  window.location.assign('#/builder')
}
