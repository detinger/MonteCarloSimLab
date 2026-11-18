// Random123 Philox2x32-10. Split the 32-bit product so both halves are
// exactly representable using IEEE-754 doubles. See tests for upstream KATs.
export function philox(index, stream, key) {
  let x = index >>> 0
  let y = stream >>> 0
  for (let round = 0; round < 10; round++) {
    const lo = x & 65535
    const hi = x >>> 16
    const middle = hi * 0xd193 + lo * 0xd256 + Math.floor(lo * 0xd193 / 65536)
    const upper = hi * 0xd256 + Math.floor(middle / 65536)
    const lower = Math.imul(x, 0xd256d193) >>> 0
    x = (upper ^ y ^ key) >>> 0
    y = lower
    key = (key + 0x9e3779b9) >>> 0
  }
  return [x, y]
}

export function streamId(name) {
  let hash = 2166136261
  for (const ch of name) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619)
  return hash >>> 0
}
