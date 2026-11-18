import {createExperiment, validate, wilson} from '../engine/index.js'
import {parseFormula} from '../engine/formula.js'
import {defaults, replicate} from '../domains/newExamples.js'
import {philox, streamId} from '../engine/rng.js'

export function coinTrace(seed) {
  const p={...defaults('coins'),seed,tosses:1}
  return Array.from({length:12},(_,i)=>replicate(p,i).value?'H':'T').join(' ')
}
const format = n => n.toLocaleString(undefined,{maximumFractionDigits:4})
export function demonstration(id,v) {
  switch(id) {
    case 'L01': return coinTrace(v)
    case 'L02': return 'Exact cumulative probability '+format((v-2)/6)
    case 'L03': {
      const data=createExperiment({kind:'pi',seed:42,samples:v})
      data.advance(v)
      const r=data.summary()
      return r.hits+' hits in '+v+' darts · π estimate '+format(r.mean)
    }
    case 'L04': {
      let sum=0
      for(let i=0;i<v;i++) sum+=-1+3*philox(i,streamId('lesson-integral'),42)[0]/4294967296
      return 'Estimated signed integral '+format(3*sum/v)+' · Exact integral 1.5'
    }
    case 'L05': return '95% Wilson interval ['+wilson(v,100).map(format).join(', ')+']'
    case 'L06': return v===1?'Staying wins. Switching loses.':'Switching wins. Staying loses.'
    case 'L07': return 'Exact ensemble E[R²] = '+v+' squared units · RMS displacement '+format(Math.sqrt(v))+' units'
    case 'L08': return 'Terminal price '+format(100*Math.exp(.05*v))+' currency units'
    case 'L09': return 'Project finish at day '+(Math.max(6,v)+4)
    case 'L10': return 'Series survival '+format((v/100)**3)+' · Parallel survival '+format(1-(1-v/100)**3)
    case 'L11': return 'Total €'+format(135000+v)+' · '+(135000+v>200000?'Over budget':'Within budget')
    case 'L12': {
      const p={...defaults('inventory'),alternate:v}
      let diff=0
      for(let i=0;i<100;i++){const r=replicate(p,i);diff+=r.alt.cost-r.base.cost}
      return 'Mean paired cost difference '+format(diff/100)+' cost units · 100 horizons · seed 42'
    }
  }
}

const numberField=(key,label,answer,tolerance=1e-8)=>({key,label,answer,tolerance})
const choiceField=(key,label,options,answer)=>({key,label,options,answer})
const method=(label,options,answer)=>choiceField('method',label,options,answer)
const calc=(label,answer,tolerance)=>numberField('value',label,answer,tolerance)
const specs=[
  [
    'Run two sets of twelve fair coin flips. Match the seed, model and trace, then identify what replay tells you.',
    [method('What does an identical trace demonstrate?',['A new independent sample','Reproducible computation','A perfectly fair physical coin'],1)],
    ['Each coin trial draws one outcome.','A changed seed changes the pseudorandom stream.','Run both experiments with the same seed and compare all twelve positions.'],
    ['Match the settings and trace of both runs.','Interpret replay correctly.']
  ],[
    'A supplier estimates a duration between 2 and 8 days, with 5 days most likely. Specify a continuous model using all three estimates.',
    [method('Distribution',['Normal','Uniform','Triangular'],2),numberField('low','Minimum (days)',2),numberField('mode','Most likely (days)',5),numberField('high','Maximum (days)',8)],
    ['A count distribution models integers.','A normal law assigns some probability beyond each bound.','A triangular distribution has a minimum, a mode and a maximum.'],
    ['Choose a bounded continuous family with a mode.','Enter all three support parameters in days.']
  ],[
    'A run records 790 hits among 1,000 uniform darts. Compute π̂, then compare typical errors for 1,000 and 4,000 independent darts.',
    [calc('Estimated π',3.16,.0001),method('Effect of quadrupling the count',['Typical sampling error halves','Every estimate gets closer','Typical sampling error doubles'],0)],
    ['The square has area four.','The observed circle fraction is 790/1000.','Standard error scales with the inverse square root of the sample count.'],
    ['Scale the observed hit proportion by four.','Identify the expected standard-error scaling.']
  ],[
    'For f(x)=x on [−1,2], three uniform draws produced −0.8, 0.1 and 1.6. Calculate the Monte Carlo estimate and exact benchmark.',
    [calc('Sample-mean integral estimate',.9,.0001),numberField('exact','Exact integral',1.5),method('Treatment of negative samples',['Omit them','Use their absolute values','Keep their signed values'],2)],
    ['The interval width is 3.','The mean sampled height is 0.3.','Use x²/2 at the upper and lower bounds to check the exact result.'],
    ['Compute width × signed mean.','Compute the analytical benchmark.','Preserve signed contributions.']
  ],[
    'A coin has 50 heads in 100 trials. Give the endpoints of its 95% Wilson interval to three decimals, then interpret coverage.',
    [numberField('low','Lower probability bound',wilson(50,100)[0],.0006),numberField('high','Upper probability bound',wilson(50,100)[1],.0006),
      method('Coverage describes',['Individual future flips','Repeated intervals covering the fixed probability','95% certainty that every coin is fair'],1)],
    ['Work in proportions from zero to one.','Use the Wilson interval in the lesson experiment with 50 heads.','Coverage concerns intervals produced in repeated independent samples.'],
    ['Calculate both Wilson endpoints.','Interpret repeated-experiment coverage.']
  ],[
    'Configure the standard three-door Monty Hall protocol. Calculate the switch probability when the contestant first picks uniformly.',
    [method('Host behavior',['Opens any door at random','Reveals an unchosen goat and always offers a switch','Offers a switch only if the player picked the prize'],1),calc('Probability of a switch win (decimal)',2/3,.0006)],
    ['The host knows where the prize is.','Switching wins whenever the first choice is wrong.','Two of the three initial prize positions are away from the first choice.'],
    ['Specify the host’s information and offer rule.','Calculate the switch probability.']
  ],[
    'Independent walkers take 64 unit steps on a square lattice. Identify the observations and calculate the theoretical mean squared displacement.',
    [method('Observations to average',['64 positions along one walk','Squared endpoints of independent 64-step walks','Maximum displacement along each walk'],1),calc('Expected squared displacement (units²)',64)],
    ['One complete walk is one replication.','The square of a sum has cross terms.','Zero mean and independent steps make their expected cross terms zero.'],
    ['Use replication-level endpoint observations.','Apply E[R²]=N for unit steps.']
  ],[
    'Model a price initially at 100 for two years with annual drift 0.05. Check the deterministic limit at zero volatility, then choose a downside measure when volatility is positive.',
    [calc('Terminal price at zero volatility',100*Math.exp(.1),.01),method('Lower-tail terminal price metric',['Confidence interval for mean drift','First daily increment','5th percentile across independent terminal prices'],2)],
    ['Use continuous compounding.','At zero volatility the normal shock disappears.','A percentile of terminal outcomes measures spread across paths.'],
    ['Evaluate the zero-volatility limit in annual units.','Choose a terminal downside percentile.']
  ],[
    'Procurement and design can start together. Construction requires both. For three projects, their durations (procurement, design, construction) are (6,9,4), (8,5,4), (11,7,4) days. Estimate P(finish ≤ 13).',
    [method('Completion rule',['max(procurement, design) + construction','procurement + design + construction','min(procurement, design) + construction'],0),calc('Fraction on time',2/3,.0006)],
    ['Parallel tasks compete for the critical path.','The three finish times are 13, 12 and 15 days.','Include a completion exactly on the deadline.'],
    ['Honor both predecessor constraints.','Count on-time complete schedules.']
  ],[
    'A line can make 100 units per day. Compare policies at failure probabilities 0.10 and 0.05 using the same daily uniform draws and yield 0.90. Calculate the analytical change in expected good output, then check the seeded comparison.',
    [calc('Expected gain per day (good units)',4.5,.001),method('Common uniform draws compare',['The same uptime shocks under both policies','Two unrelated demand models','An unlimited-capacity plant'],0)],
    ['On an operating day the line produces 90 good units.','Expected daily output is capacity × uptime probability × yield.','The alternative operates whenever the baseline operates and on some additional days.'],
    ['Calculate the change in expected output.','Identify the paired experiment design.','Check replicated output against the physical capacity.']
  ],[
    'Save a Builder project that adds three independent random costs in EUR and counts totals strictly above €200,000. Complete 10,000 replications and select that saved project below.',
    [],['Use three random inputs with matching EUR units.','Reference each input exactly once in the sum and set the threshold to 200000.','Run 10,000 replications and wait for “Saved locally” before checking your project.'],
    ['Inspect three stochastic costs and their sum.','Verify units and the exceedance definition.','Replay the saved run and match the trace and aggregate.']
  ],[
    'Compare two reorder points under paired daily demand. Run the exported inventory notebook in Jupyter or Colab, save the executed .ipynb with its outputs and attach it for checking.',
    [method('Which outcome measures unit service level?',['Mean holding cost','Filled units divided by requested units','Number of orders placed'],1)],
    ['Use a reorder point different from the 10-unit baseline.','Download the notebook for the current challenge settings and execute every code cell.','Save the executed notebook with its fill-rate and cost summaries visible, then attach it.'],
    ['Change the reorder point while preserving the rest of the model.','Choose the unit fill-rate metric.','Verify the matching notebook source and completed output cells.']
  ]
]
export const tasks=specs.map(([task,fields,hints,rubric])=>({task,fields,hints,rubric}))

const feedbackByTask=[
  ['A seed recreates a deterministic stream. Replaying that stream repeats the same observations.'],
  ['The input needs finite bounds and a most likely value.','Use the shortest possible duration.','Use the supplier’s most likely duration.','Use the longest possible duration.'],
  ['Multiply the observed hit fraction by the area of the square.','Standard error scales with the inverse square root of the number of independent darts.'],
  ['Average all three signed heights, then multiply by the interval width.','Evaluate x²/2 at each endpoint and subtract.','Values below the axis contribute negative area.'],
  ['Use k = 50, n = 100 and z ≈ 1.96 in the Wilson lower bound.','Use the same Wilson center and add its radius.','Repeatedly sampling and constructing intervals defines coverage.'],
  ['The informed host reveals a goat and always makes the offer.','Count the initial choices for which switching wins.'],
  ['Consecutive locations are dependent. Use one final squared displacement per independently simulated path.','Every independent unit step adds one squared unit in expectation.'],
  ['Use two years in the exponential S₀ exp(μT).','Terminal percentiles describe modeled outcomes across paths.'],
  ['Wait for the slower parallel task before construction.','Count finishes equal to 13 days as on time.'],
  ['Expected good units per day equals 100 times the uptime probability times 0.90. Subtract baseline from alternative.','Using the same daily shock isolates the policy effect in each pair.'],
  [],
  ['A unit fill rate weights every requested unit equally.'],
]
tasks.forEach((spec,i)=>spec.fields.forEach((field,j)=>{field.feedback=feedbackByTask[i][j]}))

export function assessFields(fields,answers) {
  return fields.map(f=>{
    const a=answers[f.key]
    const ok=f.options ? a===String(f.answer) : typeof a==='string' && a.trim()!=='' && Number.isFinite(Number(a)) && Math.abs(Number(a)-f.answer)<=f.tolerance
    return {ok,text:f.label+(ok?' · Correct':' · '+f.feedback)}
  })
}
export function checkModelRecord(record) {
  const model=record?.run?.model,r=record?.run?.result
  if(!model||model.kind!=='builder'||validate(model).length||model.samples!==10000||r?.status!=='complete') return false
  if(model.inputs.length!==3 || model.inputs.some(v=>v.distribution==='constant'||v.unit!=='EUR') || model.threshold!==200000 || (model.comparator??'>')!=='>' || model.unit!=='EUR') return false
  const vars=[]
  function sumLeaves(ast) {
    if(ast.op==='ref'){vars.push(ast.name);return true}
    return ast.op==='+'&&sumLeaves(ast.left)&&sumLeaves(ast.right)
  }
  if(!sumLeaves(parseFormula(model.expression,model.inputs.map(v=>v.name))) || vars.length!==3 || new Set(vars).size!==3) return false
  const experiment=createExperiment(model)
  experiment.advance(model.samples)
  const replay=experiment.summary()
  return replay.mean===r.mean && replay.hits===r.hits && replay.n===r.n && JSON.stringify(replay.trace)===JSON.stringify(r.trace)
}
export function factoryTrials() {
  let baseline=0, alternative=0
  for(let i=0;i<1000;i++){
    const u=philox(i,streamId('factory-challenge'),42)[0]/4294967296
    baseline+=u>=.1?90:0
    alternative+=u>=.05?90:0
  }
  return {baseline:baseline/1000,alternative:alternative/1000}
}
export function checkedNotebook(upload,original,config) {
  if(upload?.nbformat!==4 || !Array.isArray(upload.cells)) return false
  const expected=JSON.parse(original).cells.filter(c=>c.cell_type==='code')
  const actual=upload.cells.filter(c=>c?.cell_type==='code')
  const source=x=>Array.isArray(x)?x.join(''):x
  if(expected.length!==actual.length || !actual.every((c,i)=>source(c.source)===source(expected[i].source) && Number.isInteger(c.execution_count) && Array.isArray(c.outputs) && c.outputs.every(o=>o.output_type!=='error'))) return false
  const displayed=actual.flatMap(c=>c.outputs.filter(o=>o.output_type==='stream').map(o=>source(o.text))).join('\n')
  const totals={cost:0,baseFilled:0,altFilled:0,demand:0}
  for(let i=0;i<config.samples;i++){
    const row=replicate(config,i)
    totals.cost+=row.alt.cost
    totals.baseFilled+=row.base.served
    totals.altFilled+=row.alt.served
    totals.demand+=row.base.served+row.base.unfilled
  }
  const metrics=[
    ['Mean alternative cost',totals.cost/config.samples],
    ['baseline fill rate',totals.baseFilled/totals.demand],
    ['alternative fill rate',totals.altFilled/totals.demand],
  ]
  return metrics.every(([label,expected])=>{
    const value=displayed.split('\n').find(line=>line.startsWith(label+' '))?.slice(label.length+1)
    return value?.trim() && Math.abs(Number(value)-expected)<=1e-7*Math.max(1,Math.abs(expected))
  })
}
