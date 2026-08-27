import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useFocusCapture } from './useFocusCapture'

afterEach(() => {
  document.body.innerHTML = ''
})

interface FrozenConsole {
  amountField: HTMLInputElement
  saveButton: HTMLButtonElement
  layerControl: HTMLButtonElement
}

/** A payout adjustment mid-edit, which is §8.1's own worked example. */
function buildConsole(): FrozenConsole {
  const amountField = document.createElement('input')
  amountField.value = '250.00'
  const saveButton = document.createElement('button')
  saveButton.textContent = 'Save'
  const layerControl = document.createElement('button')
  layerControl.textContent = 'Notifications'
  document.body.append(amountField, saveButton, layerControl)
  return { amountField, saveButton, layerControl }
}

const render = () =>
  renderHook(({ captured }: { captured: boolean }) => useFocusCapture({ captured }), {
    initialProps: { captured: false },
  })

describe('useFocusCapture — AC-565, focus survives the freeze', () => {
  it('records the focused element at freeze and restores it on success', () => {
    const { amountField } = buildConsole()
    amountField.focus()

    const { result, rerender } = render()
    rerender({ captured: true })
    expect(result.current.capturedElement()).toBe(amountField)

    /* The freeze is on: the modal owns focus, so the console's element does
       not. Nothing here moves focus — the modal does that. */
    act(() => document.body.focus())

    rerender({ captured: false })
    expect(document.activeElement).toBe(amountField)
  })

  it('captures BEFORE the freeze commits, not after the layers have closed', () => {
    const { amountField, layerControl } = buildConsole()
    amountField.focus()

    const { result, rerender } = render()

    /* §8.1 rule 5: every open shell layer closes when the session freezes, and
       each closing layer restores focus to its own opener on the way out. If
       the capture ran in an effect it would see `layerControl` — the layer's
       opener — instead of the field the operator was actually in. The capture
       runs during render, before any of that commits. */
    rerender({ captured: true })
    act(() => layerControl.focus())

    expect(result.current.capturedElement()).toBe(amountField)
    rerender({ captured: false })
    expect(document.activeElement).toBe(amountField)
  })

  it('captures once per freeze, not on every render while frozen', () => {
    const { amountField, saveButton } = buildConsole()
    amountField.focus()

    const { result, rerender } = render()
    rerender({ captured: true })
    act(() => saveButton.focus())
    rerender({ captured: true })

    expect(result.current.capturedElement()).toBe(amountField)
  })

  it('does nothing at all while the session is healthy', () => {
    const { amountField } = buildConsole()
    amountField.focus()

    const { result, rerender } = render()
    rerender({ captured: false })
    expect(result.current.capturedElement()).toBeNull()
    expect(document.activeElement).toBe(amountField)
  })

  it('captures nothing when nothing was focused', () => {
    buildConsole()
    const { result, rerender } = render()
    rerender({ captured: true })
    /* `document.activeElement` is <body> when nothing has focus. Storing it
       would make the restore look successful while doing nothing. */
    expect(result.current.capturedElement()).toBeNull()
  })

  it('leaves focus alone when the captured element was unmounted meanwhile', () => {
    const { amountField, saveButton } = buildConsole()
    amountField.focus()

    const { rerender } = render()
    rerender({ captured: true })

    /* A background refresh replaced the row. Focusing a detached node silently
       sends focus to <body>, which loses the operator's place rather than
       keeping it — the same judgement `useFocusEntry` makes. */
    amountField.remove()
    saveButton.focus()

    rerender({ captured: false })
    expect(document.activeElement).toBe(saveButton)
  })

  it('release() drops the target, so Sign out does not focus a torn-down console', () => {
    const { amountField, saveButton } = buildConsole()
    amountField.focus()

    const { result, rerender } = render()
    rerender({ captured: true })
    act(() => result.current.release())
    expect(result.current.capturedElement()).toBeNull()

    act(() => saveButton.focus())
    rerender({ captured: false })
    expect(document.activeElement).toBe(saveButton)
  })

  it('does not re-arm the capture after release while still frozen', () => {
    const { amountField, saveButton } = buildConsole()
    amountField.focus()

    const { result, rerender } = render()
    rerender({ captured: true })
    act(() => result.current.release())

    act(() => saveButton.focus())
    rerender({ captured: true })
    expect(result.current.capturedElement()).toBeNull()
  })

  it('handles a second freeze after the first was restored', () => {
    const { amountField, saveButton } = buildConsole()
    amountField.focus()

    const { result, rerender } = render()
    rerender({ captured: true })
    rerender({ captured: false })
    expect(document.activeElement).toBe(amountField)

    /* The absolute 12-hour expiry can land on a session that already survived
       an idle expiry. The hook has to be armed again, not spent. */
    act(() => saveButton.focus())
    rerender({ captured: true })
    expect(result.current.capturedElement()).toBe(saveButton)
    rerender({ captured: false })
    expect(document.activeElement).toBe(saveButton)
  })

  it('restores a caret position, not just the element', () => {
    const { amountField } = buildConsole()
    amountField.focus()
    amountField.setSelectionRange(2, 2)

    const { rerender } = render()
    rerender({ captured: true })
    act(() => document.body.focus())
    rerender({ captured: false })

    /* AC-586 wants the value selectable; the freeze uses `readOnly` rather
       than `disabled` precisely so the selection survives, and refocusing the
       same node keeps it. */
    expect(document.activeElement).toBe(amountField)
    expect(amountField.selectionStart).toBe(2)
  })

  it('hands out a stable handle across renders', () => {
    const { result, rerender } = render()
    const first = result.current
    rerender({ captured: true })
    rerender({ captured: false })
    /* It goes in dependency arrays; a new object every render would re-run
       every effect that touches it. */
    expect(result.current).toBe(first)
  })

  it('mounting already frozen captures whatever had focus at mount', () => {
    const { amountField } = buildConsole()
    amountField.focus()
    const { result } = renderHook(() => useFocusCapture({ captured: true }))
    expect(result.current.capturedElement()).toBe(amountField)
  })
})
