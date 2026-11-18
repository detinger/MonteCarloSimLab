import { ENGINE_VERSION, validate } from '../engine/index.js'

export const initialPiModel = { kind: 'pi', seed: 42, samples: 1000 }

export function piModelFromFields(seed, samples) {
  const readInteger = (value) => /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN
  return { kind: 'pi', seed: readInteger(seed), samples: readInteger(samples) }
}

export function piBundle(model, result) {
  return {
    schemaVersion: 1,
    experiment: 'estimating-pi',
    engineVersion: ENGINE_VERSION,
    model,
    result: {
      completed: result.n,
      hits: result.hits,
      estimate: result.mean,
      scaledWilson95: result.meanCI,
    },
  }
}

export function readPiBundle(data) {
  if (!data || data.schemaVersion !== 1 || data.experiment !== 'estimating-pi' ||
      data.engineVersion !== ENGINE_VERSION || data.model?.kind !== 'pi') {
    throw new Error('Choose an Estimating Pi run exported by this engine version.')
  }
  const model = { kind: 'pi', samples: data.model.samples, seed: data.model.seed }
  const issues = validate(model)
  if (issues.length) throw new Error(issues.join(' '))
  if (data.result?.completed !== model.samples || !Number.isInteger(data.result.hits) ||
      data.result.hits < 0 || data.result.hits > model.samples) {
    throw new Error('The file must contain a completed run with a valid hit count.')
  }
  return { model, hits: data.result.hits }
}

// One explicitly saved Pi run. Resolve writes on transaction commit, including quota errors.
export async function savedPiRun(action, value) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('monte-carlo-pi', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('runs')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Close other lab tabs to open saved runs.'))
  })
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('runs', action === 'save' ? 'readwrite' : 'readonly')
      const store = transaction.objectStore('runs')
      const request = action === 'save' ? store.put(value, 'latest') : store.get('latest')
      transaction.oncomplete = () => resolve(request.result)
      transaction.onabort = () => reject(transaction.error || new Error('Storage unavailable.'))
      transaction.onerror = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

export function downloadPiFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
