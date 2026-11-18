import test from 'node:test'
import assert from 'node:assert/strict'
import { createExperiment, validate } from '../src/engine/index.js'
import { initialPiModel, piBundle, piModelFromFields, readPiBundle } from '../src/pages/piSession.js'

test('Pi import replays a completed run from its recorded configuration', () => {
  const model = { ...initialPiModel, samples: 4000, seed: 0 }
  const experiment = createExperiment(model)
  experiment.advance(model.samples)
  const result = experiment.summary()
  const runFile = piBundle(model, result)
  const saved = readPiBundle(JSON.parse(JSON.stringify(runFile)))
  const replay = createExperiment(saved.model)
  replay.advance(500)
  replay.advance(3500)
  assert.equal(saved.hits, replay.summary().hits)
  assert.deepEqual(replay.summary(), result)
})

test('Pi rejects incompatible, incomplete and invalid run files', () => {
  const model = initialPiModel
  const experiment = createExperiment(model)
  experiment.advance(model.samples)
  const bundle = piBundle(model, experiment.summary())
  for (const invalid of [null, {}, { ...bundle, schemaVersion: 2 }, { ...bundle, engineVersion: 'different' },
    { ...bundle, model: { ...model, seed: -1 } }, { ...bundle, result: { completed: 1, hits: 0 } },
    { ...bundle, result: { completed: model.samples, hits: model.samples + 1 } }]) {
    assert.throws(() => readPiBundle(invalid))
  }
})

test('Pi fields retain partial or invalid input until an integer is entered', () => {
  for (const field of ['', ' ', '-', '1e', '1.4', '0x10']) {
    assert.ok(validate(piModelFromFields(field, '1000')).length > 0)
    assert.ok(validate(piModelFromFields('42', field)).length > 0)
  }
  assert.deepEqual(piModelFromFields('0', '1'), { kind: 'pi', seed: 0, samples: 1 })
})
