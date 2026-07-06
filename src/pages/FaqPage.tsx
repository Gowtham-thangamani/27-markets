import { Link } from 'react-router-dom'
import { UserPlus, Wallet, ShieldCheck, MonitorSmartphone } from 'lucide-react'
import { PageHeader } from '@/components/marketing/PageHeader'
import { Reveal } from '@/components/Reveal'
import { CTABand } from '@/components/marketing/CTABand'
import { Accordion, type AccordionItem } from '@/components/ui/Accordion'

const groups: { icon: typeof UserPlus; title: string; items: AccordionItem[] }[] = [
  {
    icon: UserPlus,
    title: 'Getting started',
    items: [
      { id: 'open', question: 'How do I open an account, and how long does it take?', answer: 'Registration takes about two minutes with just your email. After a quick identity (KYC) check you can fund your account and start trading — often the same day.' },
      { id: 'kyc', question: 'What documents do I need for verification (KYC)?', answer: 'A government-issued ID for identity, and a recent utility bill or bank statement for proof of address. Verification is tiered, so each level unlocks more features and higher limits.' },
      { id: 'demo', question: 'Do you offer a demo account, and how does it work?', answer: 'Yes. Open a free demo funded with virtual capital and trade the live platform with real market data — no deposit and no risk. Switch to a live account whenever you are ready.' },
    ],
  },
  {
    icon: Wallet,
    title: 'Funding',
    items: [
      { id: 'min', question: 'What is the minimum deposit, and are there fees?', answer: 'You can start from $50. All accounts are held in USD. We keep funding transparent — any applicable provider fee is shown before you confirm a transaction.' },
      { id: 'methods', question: 'Which payment methods can I use?', answer: 'Cards (Visa/Mastercard), e-wallets, bank transfer, and crypto (USDT and major coins). Cards and e-wallets are typically instant; bank transfers take 1–3 business days.' },
      { id: 'withdraw', question: 'How and when can I withdraw my funds?', answer: 'There is no minimum withdrawal. Request a payout anytime from your portal and we return funds to your original method as quickly as possible, after a finance review.' },
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Safety & security',
    items: [
      { id: 'safe', question: 'Is my money safe? How are client funds held?', answer: 'Client funds are kept in segregated accounts, separate from company operating capital. Every session is protected with encryption and optional two-factor authentication.' },
      { id: 'reg', question: 'Is 27 Markets regulated?', answer: 'We are finalising our regulatory authorization and state this plainly rather than implying protections we do not yet hold. See our Trust & Safety page for current status.' },
      { id: 'data', question: 'How is my personal data handled?', answer: 'Your data is processed in line with our privacy and AML policies and shared only where legally required. We never store your full card number.' },
    ],
  },
  {
    icon: MonitorSmartphone,
    title: 'Platforms & trading',
    items: [
      { id: 'platforms', question: 'Which platforms and devices can I trade on?', answer: 'One account works across our web trader, mobile, and desktop experiences, synced so you can pick up exactly where you left off.' },
      { id: 'markets', question: 'What can I trade, and what are the conditions?', answer: 'Trade 100+ instruments across forex, metals, indices, commodities, shares, and crypto CFDs. Spreads, leverage, and swap details are shown per account type on our Accounts page.' },
      { id: 'accounts', question: "What's the difference between the account types?", answer: 'Standard, Raw Spread, and VIP accounts differ in spreads, commission, and features. Compare them on the Accounts page to find the right fit.' },
    ],
  },
]

export default function FaqPage() {
  return (
    <>
      <PageHeader
        breadcrumb={['Home', 'Help & FAQ']}
        title="Help &amp; frequently asked questions"
        description="Answers on accounts, funding, safety, and platforms — organised so you can find what you need fast."
      />

      <section className="container-x space-y-12 py-14">
        {groups.map((g) => (
          <Reveal key={g.title}>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                <g.icon className="h-5 w-5" />
              </span>
              <h2 className="font-display text-xl font-semibold text-white">{g.title}</h2>
            </div>
            <Accordion items={g.items} />
          </Reveal>
        ))}

        <Reveal className="text-center text-sm text-gray-400">
          Still have a question?{' '}
          <Link to="/contact" className="font-semibold text-brand-400 hover:text-brand-300">
            Contact support →
          </Link>
        </Reveal>
      </section>

      <Reveal>
        <CTABand />
      </Reveal>
    </>
  )
}
