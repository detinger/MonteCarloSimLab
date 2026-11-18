import test from 'node:test'
import assert from 'node:assert/strict'
import {parseBuilderLink,templateIds,template} from '../src/pages/builder/project.js'
import {curriculum} from '../src/learning/curriculum.js'

test('Builder deep links open known templates and nodes only',()=>{
  assert.deepEqual(parseBuilderLink('builder/template/budget/event'),{template:'budget',node:'event'})
  assert.deepEqual(parseBuilderLink('/builder/template/revenue/'),{template:'revenue',node:null})
  assert.deepEqual(parseBuilderLink('builder/template/rare/failure'),{template:'rare',node:'failure'})
  assert.deepEqual(parseBuilderLink('builder/node/labor'),{template:null,node:'labor'})
  for(const bad of ['builder','pi','builder/template/unknown','builder/template/budget/failure',
    'builder/template/budget/event/extra','builder/node/','builder/node/a b','builder/node/<img>',
    'builder/template/__proto__',null,undefined]) assert.equal(parseBuilderLink(bad),null,String(bad))
  for(const id of templateIds) assert.ok(template(id).inputs.length)
})

test('every lesson that points at the Builder carries a valid deep link',()=>{
  const builderLessons=curriculum.filter(l=>l.labs.includes('builder'))
  assert.ok(builderLessons.length>0)
  for(const lesson of builderLessons){
    assert.ok(lesson.builder,lesson.id+' has no Builder link')
    const {template:id,node}=lesson.builder
    assert.deepEqual(parseBuilderLink(`builder/template/${id}/${node}`),{template:id,node},lesson.id)
    assert.ok(lesson.builder.label.length>0)
  }
})
