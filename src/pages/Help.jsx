import '../styles/analysis.css'

export default function Help(){
  return <article className="research-page help-page"><h1>Lab guide</h1><p className="intro">From a first experiment to a reproducible result.</p>
    <section className="research-panel"><h2>Run an existing experiment</h2><p>Choose a simulation, set its parameters and seed, and run it. Larger samples usually reduce Monte Carlo sampling error. Changing an assumption changes the model itself.</p><a href="#/labs">Browse simulations</a></section>
    <section className="research-panel"><h2>Build a decision model</h2><p>Start with a question and a unit for the output. Add uncertain inputs and connect them with a formula. Set the event you want to count, validate the model, then run. Select a node or its table row to edit it.</p><a href="#/builder">Open the Builder</a></section>
    <section className="research-panel"><h2>Read the uncertainty interval</h2><p>A Wilson interval estimates sampling uncertainty in an event probability. A t interval uses the variation between independent replications to estimate uncertainty in a mean. Outcome percentiles describe the spread of individual model results.</p><a href="#/lessons/L05">Study sampling uncertainty</a></section>
    <section className="research-panel"><h2>Reproduce or share a run</h2><p>Keep the model, engine version, seed and replication count together. Save locally to reopen on this device. Download JSON to move a project between browsers, or download the run bundle for a record of the experiment. Open an exported notebook in Jupyter or upload it with Colab’s File menu.</p><a href="#/projects">View saved projects</a></section>
  </article>
}
