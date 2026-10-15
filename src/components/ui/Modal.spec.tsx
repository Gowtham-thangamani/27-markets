import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'

/**
 * Mirrors how every caller uses Modal: a parent that holds the field's state,
 * so each keystroke re-renders it and hands Modal a BRAND NEW onClose.
 */
function Host() {
  const [value, setValue] = useState('')
  return (
    <Modal open onClose={() => setValue('')} title="Switch to IB Partner">
      <label htmlFor="code">Verification code</label>
      <input id="code" value={value} onChange={(e) => setValue(e.target.value)} />
    </Modal>
  )
}

describe('Modal focus handling', () => {
  it('keeps focus in the field while typing, instead of stealing it back', async () => {
    const user = userEvent.setup()
    render(<Host />)

    const field = await screen.findByLabelText('Verification code')
    await user.click(field)
    await user.type(field, '724775')

    // Before the fix the focus-trap effect re-ran on every keystroke (because
    // onClose changed identity) and moved focus to the close button, so only
    // the first character landed.
    expect((field as HTMLInputElement).value).toBe('724775')
    expect(document.activeElement).toBe(field)
  })
})
