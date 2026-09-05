/**
 * §11.6 row 23 `language-switching` — the confirmation is written in the
 * language the operator just chose.
 *
 * The switch flips the whole console; a toast still in the outgoing language is
 * then the only Latin left on an Arabic page, at the moment an operator is
 * checking whether the switch took.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { disableMockLatency, getRouteTable, resetDataLayer } from '@/data/clients'
import { resetDefaultUiStores } from '@/lib'
import { AR, EN } from '@/i18n/dictionaries'
import { Toaster } from '@/components/ui/sonner'
import { AppLayout } from './AppLayout'
import { ShellProvider } from './ShellContext'

const table = getRouteTable()

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  resetDefaultUiStores()
})

afterEach(() => {
  document.documentElement.removeAttribute('dir')
  document.documentElement.removeAttribute('lang')
})

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/operations/people']}>
      <ShellProvider>
        <Routes>
          <Route element={<AppLayout />}>
            {table.subTabs.map((row) => (
              <Route key={row.path} path={row.path} element={<div>screen</div>} />
            ))}
          </Route>
        </Routes>
        <Toaster />
      </ShellProvider>
    </MemoryRouter>,
  )
}

async function chooseLanguage(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole('button', { name: /Account|الحساب/ }))
  await user.click(await screen.findByRole('menuitemradio', { name: label }))
}

describe('the language-switch confirmation', () => {
  it('names Arabic in Arabic when Arabic is chosen', async () => {
    const user = userEvent.setup()
    renderShell()
    await screen.findByRole('main')

    await chooseLanguage(user, EN['shell.language.ar'] as string)

    await waitFor(() => expect(document.documentElement).toHaveAttribute('lang', 'ar'))
    const expected = (AR['state.languageSwitched.toast'] as string).replace(
      '{language}',
      AR['shell.language.ar'] as string,
    )
    expect(await screen.findByText(expected)).toBeTruthy()
  })

  it('names English in English when English is chosen back', async () => {
    const user = userEvent.setup()
    renderShell()
    await screen.findByRole('main')

    await chooseLanguage(user, EN['shell.language.ar'] as string)
    await waitFor(() => expect(document.documentElement).toHaveAttribute('lang', 'ar'))

    await chooseLanguage(user, AR['shell.language.en'] as string)
    await waitFor(() => expect(document.documentElement).toHaveAttribute('lang', 'en'))

    const expected = (EN['state.languageSwitched.toast'] as string).replace(
      '{language}',
      EN['shell.language.en'] as string,
    )
    expect(await screen.findByText(expected)).toBeTruthy()
  })
})
