import { afterEach, describe, expect, it, vi } from 'vitest'
import { announce, currentAnnouncement, getLiveRegion, resetAnnouncer } from './announcer'

afterEach(() => resetAnnouncer())

describe('the one live region — AC-29', () => {
  it('creates exactly one region however many times it is asked for', () => {
    getLiveRegion()
    getLiveRegion()
    announce('anything')
    expect(document.querySelectorAll('[aria-live]')).toHaveLength(1)
  })

  it('is polite, atomic and a status role', () => {
    const region = getLiveRegion()
    expect(region.getAttribute('aria-live')).toBe('polite')
    expect(region.getAttribute('aria-atomic')).toBe('true')
    expect(region.getAttribute('role')).toBe('status')
  })

  it('is visually hidden but not display:none — a hidden region is never announced', () => {
    const region = getLiveRegion()
    expect(region.style.display).not.toBe('none')
    expect(region.style.position).toBe('absolute')
    expect(region.style.width).toBe('1px')
  })

  it('announces the result of an asynchronous mutation', async () => {
    announce('3 captains paused.')
    await vi.waitFor(() => expect(currentAnnouncement()).toBe('3 captains paused.'))
  })

  it('re-announces the same message, which a plain assignment would not', async () => {
    announce('Saved.')
    await vi.waitFor(() => expect(currentAnnouncement()).toBe('Saved.'))
    announce('Saved.')
    // Cleared first, so the second call is a real mutation a reader will speak.
    expect(currentAnnouncement()).toBe('')
    await vi.waitFor(() => expect(currentAnnouncement()).toBe('Saved.'))
  })

  it('keeps only the latest of two announcements in the same tick', async () => {
    announce('First.')
    announce('Second.')
    await vi.waitFor(() => expect(currentAnnouncement()).toBe('Second.'))
  })

  it('handles an empty message without throwing', async () => {
    announce('')
    await vi.waitFor(() => expect(currentAnnouncement()).toBe(''))
  })

  it('announces Arabic unchanged', async () => {
    announce('تم إيقاف ٣ كباتن.')
    await vi.waitFor(() => expect(currentAnnouncement()).toBe('تم إيقاف ٣ كباتن.'))
  })

  it('leaves no region behind after a reset', () => {
    getLiveRegion()
    resetAnnouncer()
    expect(document.querySelectorAll('[aria-live]')).toHaveLength(0)
    expect(currentAnnouncement()).toBe('')
  })
})
