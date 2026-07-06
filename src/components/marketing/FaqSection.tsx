import { Link } from 'react-router-dom'
import { SectionHeading } from '@/components/SectionHeading'
import { Reveal } from '@/components/Reveal'
import { Accordion, type AccordionItem } from '@/components/ui/Accordion'

const FAQS: AccordionItem[] = [
  {
    id: 'start',
    question: 'How do I open an account, and how long does it take?',
    answer:
      'Registration takes about two minutes with just your email. After a quick identity (KYC) check you can fund your account and start trading — often the same day.',
  },
  {
    id: 'min-deposit',
    question: 'What is the minimum deposit, and are there fees?',
    answer:
      'You can start from just $50. All accounts are held in USD. We keep funding transparent — any applicable method fees are shown before you confirm a transaction.',
  },
  {
    id: 'withdraw',
    question: 'How and when can I withdraw my funds?',
    answer:
      'There is no minimum withdrawal. Request a withdrawal anytime from your portal and we process it to your original funding method as quickly as possible.',
  },
  {
    id: 'safe',
    question: 'Is my money safe? How are client funds held?',
    answer:
      'Client funds are kept in segregated accounts, separate from company operating capital. Every session is protected with encryption and optional two-factor authentication.',
  },
  {
    id: 'markets',
    question: 'What can I trade, and what are the conditions?',
    answer:
      'Trade 100+ instruments across forex, metals, indices, commodities, shares, and crypto CFDs. Spreads, leverage, and swap details are shown per account type on our Accounts page.',
  },
  {
    id: 'demo',
    question: 'Do you offer a demo account, and how does it work?',
    answer:
      'Yes. Open a free demo funded with virtual capital and trade the live platform with real market data — no deposit and no risk. Switch to a live account whenever you are ready.',
  },
  {
    id: 'platforms',
    question: 'Which platforms and devices can I trade on?',
    answer:
      'One account works across our web trader, mobile, and desktop experiences, synced so you can pick up where you left off.',
  },
]

export function FaqSection() {
  return (
    <section className="section-alt relative overflow-hidden py-20 sm:py-24">
      <div className="container-x relative z-10">
        <SectionHeading
          eyebrow="FAQ"
          title="Answers before you start"
          description="The essentials on accounts, funding, safety, and platforms. Need more? Our team is one message away."
        />
        <div className="mx-auto mt-12 max-w-3xl">
          <Accordion items={FAQS} />
          <Reveal className="mt-6 text-center text-sm text-gray-400">
            Still have a question?{' '}
            <Link to="/contact" className="font-semibold text-brand-400 hover:text-brand-300">
              Contact support →
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
