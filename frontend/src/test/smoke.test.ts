import { describe, expect, it } from 'vitest'

describe('Frontend test setup', () => {
  it('should load the frontend test environment', () => {
    expect(document).toBeDefined()
  })
})