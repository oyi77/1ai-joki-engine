import { describe, test, expect } from 'vitest'
import { parseCookies } from './http-client'

describe('parseCookies', () => {
  test('returns plain string as-is', () => {
    expect(parseCookies('sessionid=abc; csrftoken=tok')).toBe('sessionid=abc; csrftoken=tok')
  })

  test('returns empty string for empty input', () => {
    expect(parseCookies('')).toBe('')
    expect(parseCookies('  ')).toBe('')
  })

  test('parses JSON array and URL-decodes values', () => {
    const json = JSON.stringify([
      { name: 'sessionid', value: '277%3Aabc%3A9%3AXYZ' },
      { name: 'csrftoken', value: 'tok123' },
    ])
    const result = parseCookies(json)
    expect(result).toBe('sessionid=277:abc:9:XYZ; csrftoken=tok123')
  })

  test('parses JSON array and URL-decodes names', () => {
    const json = JSON.stringify([
      { name: 'my%20cookie', value: 'val' },
    ])
    const result = parseCookies(json)
    expect(result).toBe('my cookie=val')
  })

  test('falls back to string on invalid JSON array', () => {
    expect(parseCookies('[not valid json')).toBe('[not valid json')
  })

  test('handles JSON array with already-decoded values', () => {
    const json = JSON.stringify([
      { name: 'sessionid', value: '277:abc:9:XYZ' },
    ])
    const result = parseCookies(json)
    expect(result).toBe('sessionid=277:abc:9:XYZ')
  })
})