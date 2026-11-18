import test from 'node:test'
import assert from 'node:assert/strict'
import {distributions, lawFor} from '../src/science/distributions.js'
import {questions, leaves, families, edges, pathTo} from '../src/science/distributionTree.js'

test('every Distribution Helper answer leads to a question or a supported family',()=>{
  for(const [from,to,answer] of edges){
    assert.ok(questions[from],from)
    assert.ok(questions[to] || leaves[to],to)
    assert.ok(answer.trim())
  }
  for(const [id,leaf] of Object.entries(leaves)){
    assert.ok(pathTo(id).length>0,'unreachable leaf '+id)
    for(const kind of leaf.kinds){
      assert.ok(Object.hasOwn(distributions,kind),kind)
      assert.ok(families[kind],kind)
      lawFor(kind,families[kind].thumb)
    }
  }
  for(const id of Object.keys(questions)) if(id!=='root') assert.ok(pathTo(id).length>0,'unreachable question '+id)
})
