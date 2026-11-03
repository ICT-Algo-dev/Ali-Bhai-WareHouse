import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter } from 'react-router-dom'
import ContactForm from '../components/sections/ContactForm'
import QuoteForm from '../components/sections/QuoteForm'
import InventoryIntake from '../pages/InventoryIntake'
import { submitContact, submitIntake, submitQuote, uploadIntakeFile } from '../lib/api'

vi.mock('../lib/api', () => ({
  applyServerFieldErrors: vi.fn(),
  getSubmissionError: vi.fn(() => 'Submission failed'),
  submitContact: vi.fn(),
  submitQuote: vi.fn(),
  submitIntake: vi.fn(),
  uploadIntakeFile: vi.fn(),
  downloadIntakePdf: vi.fn(),
}))

function renderIntake() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <InventoryIntake />
      </MemoryRouter>
    </HelmetProvider>,
  )
}

function renderPublicForm(form) {
  return render(<MemoryRouter>{form}</MemoryRouter>)
}

function getHoneypot(container) {
  const input = container.querySelector('[name="hp_field_x7"]')
  expect(input).toBeInTheDocument()
  expect(input).toHaveAttribute('id', 'hp_field_x7')
  expect(input).toHaveAttribute('autocomplete', 'off')
  expect(input).toHaveAttribute('inputmode', 'none')
  expect(input).toHaveAttribute('tabindex', '-1')
  expect(input).not.toHaveAttribute('name', 'website')
  return input
}

async function fillContactForm(user) {
  await user.type(screen.getByLabelText('Full name'), 'Alex Tester')
  await user.type(screen.getByLabelText('Business name'), 'Test Warehouse Ltd')
  await user.type(screen.getByLabelText('Phone number'), '07123456789')
  await user.type(screen.getByLabelText('Email address'), 'alex@example.co.uk')
  await user.selectOptions(screen.getByLabelText('Estimated monthly orders'), 'under-100')
  await user.click(screen.getByLabelText('Inventory receiving'))
  await user.type(screen.getByLabelText('How can we help?'), 'We need help with fulfilment.')
  await user.click(screen.getByRole('checkbox', { name: /agree to be contacted/i }))
}

async function fillQuoteForm(user) {
  await user.type(screen.getByLabelText('Business name'), 'Test Warehouse Ltd')
  await user.type(screen.getByLabelText('Contact person'), 'Alex Tester')
  await user.type(screen.getByLabelText('Phone Number'), '07123456789')
  await user.type(screen.getByLabelText('Email address'), 'alex@example.co.uk')
  await user.type(screen.getByLabelText('Business type'), 'Online retail')
  await user.selectOptions(screen.getByLabelText('Estimated inventory volume'), 'under-5-pallets')
  await user.selectOptions(screen.getByLabelText('Estimated monthly orders'), 'under-100')
  await user.click(screen.getByLabelText('Inventory receiving'))
  await user.click(screen.getByRole('checkbox', { name: /agree to be contacted/i }))
}

async function fillIntakeThroughReview(user, container, continueToReview = true) {
  await user.type(screen.getByLabelText('Contact person'), 'Alex Tester')
  await user.type(screen.getByLabelText('Business name'), 'Test Warehouse Ltd')
  await user.type(screen.getByLabelText('Phone number'), '07123456789')
  await user.type(screen.getByLabelText('Email address'), 'alex@example.co.uk')
  await user.click(screen.getByRole('button', { name: 'Continue' }))

  await user.type(screen.getByLabelText('Product name'), 'Test product')
  await user.type(screen.getByLabelText('Brand name'), 'Test brand')
  await user.type(container.querySelector('[name="products.0.sku"]'), 'TEST-001')
  await user.type(screen.getByLabelText('Barcode (UPC/EAN/GTIN)'), '12345678')
  await user.selectOptions(screen.getByLabelText('Category'), 'general-merchandise')
  for (const [field, value] of [
    ['cartons', '1'],
    ['unitsPerCarton', '1'],
    ['cartonWeightKg', '1'],
    ['cartonLengthCm', '10'],
    ['cartonWidthCm', '10'],
    ['cartonHeightCm', '10'],
  ]) {
    await user.type(container.querySelector(`[name="products.0.uniform.${field}"]`), value)
  }
  const barcodePdf = new File(['%PDF-1.4 test'], 'barcode.pdf', { type: 'application/pdf' })
  await user.upload(container.querySelector('#intake-product-0-upload-barcode-pdf'), barcodePdf)
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  await user.click(container.querySelector('[data-section="intake-services"] input[type="checkbox"]'))
  if (continueToReview) {
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('checkbox', { name: /agree to be contacted about this inventory/i }))
  }
}

describe('honeypot form submissions', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    submitContact.mockResolvedValue({ success: true })
    submitQuote.mockResolvedValue({ success: true })
    submitIntake.mockResolvedValue({
      success: true,
      data: { reference: 'INT-TEST-1', uploadToken: 'test-token', documentsStatus: 'incomplete' },
    })
    uploadIntakeFile.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    window.sessionStorage.clear()
  })

  it('does not let a populated honeypot block Contact or change its payload key', async () => {
    const user = userEvent.setup()
    const { container } = renderPublicForm(<ContactForm />)
    await fillContactForm(user)
    await user.type(getHoneypot(container), 'autofilled.example')
    await user.click(screen.getByRole('button', { name: /send message/i }))

    await waitFor(() => expect(submitContact).toHaveBeenCalledOnce())
    expect(submitContact.mock.calls[0][0]).toMatchObject({ website: 'autofilled.example' })
    expect(await screen.findByText(/thank you for getting in touch/i)).toBeInTheDocument()
  })

  it('does not let a populated honeypot block Get a Quote or change its payload key', async () => {
    const user = userEvent.setup()
    const { container } = renderPublicForm(<QuoteForm />)
    await fillQuoteForm(user)
    await user.type(getHoneypot(container), 'autofilled.example')
    await user.click(screen.getByRole('button', { name: /request my quote/i }))

    await waitFor(() => expect(submitQuote).toHaveBeenCalledOnce())
    expect(submitQuote.mock.calls[0][0]).toMatchObject({ website: 'autofilled.example' })
    expect(await screen.findByText(/quote request has been received/i)).toBeInTheDocument()
  })

  it('submits Inventory Intake with the honeypot value and never stores it in the draft', async () => {
    const user = userEvent.setup()
    const { container } = renderIntake()
    await fillIntakeThroughReview(user, container)
    await user.type(getHoneypot(container), 'autofilled.example')
    await waitFor(() => {
      const savedDraft = window.sessionStorage.getItem('intakeDraft:v3')
      expect(savedDraft).not.toBeNull()
      expect(JSON.parse(savedDraft)).not.toHaveProperty('website')
    })
    await user.click(screen.getByRole('button', { name: 'Submit inventory intake' }))

    await waitFor(() => expect(submitIntake).toHaveBeenCalledOnce())
    expect(submitIntake.mock.calls[0][0]).toMatchObject({ website: 'autofilled.example' })
    expect(window.sessionStorage.getItem('intakeDraft:v3')).toBeNull()
    expect(await screen.findByText(/INT-TEST-1/)).toBeInTheDocument()
  })

  it('clears a stale honeypot value when restoring a saved intake draft', () => {
    window.sessionStorage.setItem('warehouse_inventory_intake_draft', JSON.stringify({
      website: 'stale-autofill',
      products: [{ boxes: [{}] }],
    }))

    renderIntake()

    expect(window.sessionStorage.getItem('warehouse_inventory_intake_draft')).toBeNull()
  })

  it('continues from Services to Review without submitting and requires consent there', async () => {
    const user = userEvent.setup()
    const { container } = renderIntake()
    await fillIntakeThroughReview(user, container, false)

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('heading', { name: 'Review your inventory' })).toBeInTheDocument()
    expect(submitIntake).not.toHaveBeenCalled()
    expect(screen.getByRole('checkbox', { name: /agree to be contacted about this inventory/i })).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Submit inventory intake' }))
    expect(await screen.findByText('Please agree to be contacted about this inventory.', { selector: 'p' })).toBeInTheDocument()
    expect(submitIntake).not.toHaveBeenCalled()
  })
})
