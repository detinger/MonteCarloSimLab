// Decision tree for choosing an input distribution. Positions are node centres
// on the Distribution Helper canvas; every leaf names families from distributions.js.

export const questions = {
  root:{x:1090,y:0,text:'Is the data discrete or continuous?',
    help:'Discrete data are counts or categories: 0, 1, 2, … Continuous data are measurements that can take any value in a range, such as time, cost or weight.'},
  dEstimate:{x:289,y:230,text:'Can you estimate the outcomes and their probabilities?',
    help:'If you can list every possible outcome and how likely each one is, use those probabilities directly.'},
  dShape:{x:577,y:470,text:'Is the data symmetric or asymmetric?',
    help:'Symmetric counts spread evenly on both sides of the middle. Asymmetric counts have a longer tail on one side.'},
  dCentre:{x:315,y:710,text:'Are the values clustered around a central value?',
    help:'Clustered counts have a clear most-likely value. Otherwise every value in the range is about equally likely.'},
  dTail:{x:840,y:710,text:'Are the outliers positive or negative?',
    help:'Where does the long tail point: only towards larger counts, mostly larger, or mostly smaller?'},
  cShape:{x:1890,y:230,text:'Is the data symmetric or asymmetric?',
    help:'Symmetric data spread evenly around the middle. Asymmetric data have a longer tail on one side.'},
  cCentre:{x:1470,y:470,text:'Is the data clustered around a central value?',
    help:'Clustered data have a peak. Unclustered data are spread evenly or have several peaks.'},
  cOutliers:{x:1680,y:710,text:'How likely are the outliers?',
    help:'Hard limits mean no value can fall outside a known range. Otherwise, think about how often extreme values occur.'},
  cTail:{x:2310,y:470,text:'Where do the outliers lie?',
    help:'Only positive: the value can never be negative. Mostly positive: a long tail to the right. Mostly negative: a long tail to the left.'},
}

// Thumbnail parameters are chosen to show each family's typical shape.
export const families = {
  categorical:{use:'You list the probability of each outcome 1, 2, 3, … directly.',example:'A customer picks plan A, B or C.',thumb:['0.15, 0.35, 0.3, 0.2']},
  binomial:{use:'Successes in a fixed number of independent trials with the same success probability.',example:'Defective items in a batch of 20.',thumb:[12,.5]},
  discrete:{use:'Every whole number between a minimum and a maximum is equally likely.',example:'The roll of a fair die.',thumb:[1,8]},
  geometric:{use:'Failures before the first success, when every trial has the same success probability.',example:'Sales calls before the first deal.',thumb:[.3]},
  negbinomial:{use:'Failures before reaching a set number of successes.',example:'Rejected applications before the fifth acceptance.',thumb:[5,.5]},
  hypergeometric:{use:'Successes when drawing without replacement from a finite population.',example:'Faulty parts found when inspecting 12 of 50 parts.',thumb:[50,20,12]},
  uniform:{use:'Every value between a minimum and a maximum is equally likely.',example:'An arrival time somewhere within a one-hour window.',thumb:[0,1]},
  empirical:{use:'Resamples your own observations, so it keeps any lumps or multiple peaks in the data.',example:'Historical daily demand.',thumb:['1, 2, 2, 3, 6, 7, 7, 8']},
  triangular:{use:'Minimum, most likely and maximum, with no values outside the limits.',example:'An expert estimate of a task duration.',thumb:[0,.5,1]},
  normal:{use:'Symmetric bell curve; extreme values are very unlikely.',example:'Measurement errors or heights.',thumb:[0,1]},
  logistic:{use:'Like the normal, with somewhat heavier tails.',example:'Growth and demand models.',thumb:[0,1]},
  cauchy:{use:'Symmetric with very heavy tails. It has no mean, so averages never settle down.',example:'Ratios of two noisy measurements.',thumb:[0,1]},
  exponential:{use:'Time between random, independent events. Only positive values.',example:'Time until the next support ticket arrives.',thumb:[1]},
  lognormal:{use:'Positive and right-skewed; arises when many effects multiply.',example:'Costs, incomes or file sizes.',thumb:[0,.5]},
  gamma:{use:'Positive and right-skewed; the total of several waiting stages.',example:'Repair time or monthly rainfall.',thumb:[2,1]},
  weibull:{use:'Positive; a flexible model for lifetimes and failures.',example:'Time until a component fails.',thumb:[1.5,1]},
  minextreme:{use:'Skewed to the left; the smallest of many values.',example:'Weakest-link strength or minimum temperatures.',thumb:[0,1]},
}

export const leaves = {
  categorical:{x:0,y:960,title:'Estimate a probability distribution',kinds:['categorical']},
  binomial:{x:210,y:960,title:'Binomial',kinds:['binomial']},
  discrete:{x:420,y:960,title:'Uniform discrete',kinds:['discrete']},
  geometric:{x:630,y:960,title:'Geometric',kinds:['geometric']},
  negbinomial:{x:840,y:960,title:'Negative binomial',kinds:['negbinomial']},
  hypergeometric:{x:1050,y:960,title:'Hypergeometric',kinds:['hypergeometric']},
  uniform:{x:1260,y:960,title:'Uniform or multimodal',kinds:['uniform','empirical']},
  triangular:{x:1470,y:960,title:'Triangular',kinds:['triangular']},
  normal:{x:1680,y:960,title:'Normal',kinds:['normal']},
  logistic:{x:1890,y:960,title:'Logistic or Cauchy',kinds:['logistic','cauchy']},
  exponential:{x:2100,y:960,title:'Exponential',kinds:['exponential']},
  skewed:{x:2310,y:960,title:'Lognormal, Gamma or Weibull',kinds:['lognormal','gamma','weibull']},
  minextreme:{x:2520,y:960,title:'Minimum extreme',kinds:['minextreme']},
}

// [parent, child, answer]
export const edges = [
  ['root','dEstimate','Discrete'], ['root','cShape','Continuous'],
  ['dEstimate','categorical','Yes'], ['dEstimate','dShape','No'],
  ['dShape','dCentre','Symmetric'], ['dShape','dTail','Asymmetric'],
  ['dCentre','binomial','Yes'], ['dCentre','discrete','No'],
  ['dTail','geometric','Only positive'], ['dTail','negbinomial','More positive'], ['dTail','hypergeometric','More negative'],
  ['cShape','cCentre','Symmetric'], ['cShape','cTail','Asymmetric'],
  ['cCentre','uniform','No'], ['cCentre','cOutliers','Yes'],
  ['cOutliers','triangular','Hard limits'], ['cOutliers','normal','Very low'], ['cOutliers','logistic','Low'],
  ['cTail','exponential','Only positive'], ['cTail','skewed','Mostly positive'], ['cTail','minextreme','Mostly negative'],
]

// Steps from the root to a node, as [{question, answer}], for highlighting and the breadcrumb.
export function pathTo(id) {
  const steps = []
  for (let node = id; node !== 'root';) {
    const edge = edges.find(([, child]) => child === node)
    if (!edge) return []
    steps.unshift({from:edge[0], to:node, answer:edge[2]})
    node = edge[0]
  }
  return steps
}
