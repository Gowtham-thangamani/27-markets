/**
 * Legal document content for the /legal/:doc pages.
 *
 * ⚠️ DRAFT / TEMPLATE CONTENT — these are professional boilerplate documents
 * populated with 27 Markets' real entity details. They MUST be reviewed and
 * approved by qualified legal counsel (for the Saint Lucia entity and each
 * jurisdiction served) before being relied upon or published as final.
 *
 * Kept English-only, as legal copy typically is; swap or extend per counsel.
 */

export interface LegalSection {
  heading: string
  /** Body paragraphs. */
  body?: string[]
  /** Optional bulleted list rendered after the body. */
  bullets?: string[]
}

export interface LegalDoc {
  slug: string
  title: string
  /** Human month/year the draft was last touched. */
  updated: string
  intro: string
  sections: LegalSection[]
}

const ENTITY = '27 Markets Ltd'
const ADDRESS =
  'Ground Floor, The Sotheby Building, Rodney Village, Rodney Bay, Gros-Islet, Saint Lucia'
const REG_NO = '2026-00485'
const EMAIL = 'info@27markets.com'
const UPDATED = 'July 2026'

const contactSection: LegalSection = {
  heading: 'Contact us',
  body: [
    `If you have any questions about this document, please contact ${ENTITY} at ${EMAIL}.`,
    `${ENTITY} · ${ADDRESS} · Registration No. ${REG_NO}.`,
  ],
}

const statusNotice =
  '27 Markets is finalising its regulatory authorization and currently operates as a demonstration product. It is not yet a live, licensed brokerage, and no real client funds are held or transferred. This document will be updated as our authorization and live services progress.'

export const legalDocs: Record<string, LegalDoc> = {
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    updated: UPDATED,
    intro: `How ${ENTITY} collects, uses, and protects your personal information.`,
    sections: [
      {
        heading: '1. Introduction',
        body: [
          `${ENTITY} ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains what personal information we collect, how we use and safeguard it, and the rights you have in relation to it.`,
          statusNotice,
        ],
      },
      {
        heading: '2. Information we collect',
        body: ['We collect information you provide to us and information generated when you use our platform, including:'],
        bullets: [
          'Identity and contact details — name, date of birth, nationality, email, phone, and address.',
          'Verification (KYC) data — identity documents, proof of address, and related records.',
          'Financial information — account balances, transactions, and payment details.',
          'Technical and usage data — device, browser, IP address, and how you interact with the platform.',
          'Communications — messages, support tickets, and correspondence with us.',
        ],
      },
      {
        heading: '3. How we use your information',
        body: ['We use your personal information to:'],
        bullets: [
          'Open, operate, and administer your account.',
          'Verify your identity and meet our legal and regulatory obligations (including AML/KYC).',
          'Process transactions and provide our services.',
          'Communicate with you, including service and security notices.',
          'Detect, prevent, and investigate fraud or misuse.',
          'Improve and secure our platform.',
        ],
      },
      {
        heading: '4. Legal bases for processing',
        body: [
          'We process personal information where it is necessary to perform our contract with you, to comply with a legal obligation, for our legitimate business interests, or on the basis of your consent where required by law.',
        ],
      },
      {
        heading: '5. Sharing and disclosure',
        body: ['We do not sell your personal information. We may share it with:'],
        bullets: [
          'Service providers who support our operations (e.g. verification, payments, hosting) under appropriate confidentiality obligations.',
          'Regulators, law enforcement, and authorities where required by law.',
          'Professional advisers and, in the event of a corporate transaction, prospective successors.',
        ],
      },
      {
        heading: '6. International transfers',
        body: [
          'Your information may be processed in countries other than your own. Where it is transferred internationally, we take steps to ensure it remains protected in line with applicable law.',
        ],
      },
      {
        heading: '7. Data retention',
        body: [
          'We retain personal information for as long as necessary to provide our services and to meet our legal, regulatory, and record-keeping obligations, after which it is securely deleted or anonymised.',
        ],
      },
      {
        heading: '8. Security',
        body: [
          'We use technical and organisational measures — including encryption in transit, access controls, and monitoring — to protect your information. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.',
        ],
      },
      {
        heading: '9. Your rights',
        body: ['Subject to applicable law, you may have the right to:'],
        bullets: [
          'Access the personal information we hold about you.',
          'Request correction of inaccurate or incomplete information.',
          'Request deletion of your information in certain circumstances.',
          'Object to or restrict certain processing.',
          'Withdraw consent where processing is based on consent.',
        ],
      },
      {
        heading: '10. Cookies',
        body: [
          'Our platform uses cookies and similar technologies to operate, secure, and improve the service. You can control cookies through your browser settings; disabling some may affect functionality.',
        ],
      },
      contactSection,
    ],
  },

  aml: {
    slug: 'aml',
    title: 'AML & KYC Policy',
    updated: UPDATED,
    intro: `${ENTITY}'s commitment to anti-money-laundering and know-your-customer standards.`,
    sections: [
      {
        heading: '1. Our commitment',
        body: [
          `${ENTITY} is committed to preventing money laundering, terrorist financing, and other financial crime. We maintain policies and controls designed to identify and mitigate these risks.`,
          statusNotice,
        ],
      },
      {
        heading: '2. Regulatory framework',
        body: [
          'We seek to align our practices with applicable anti-money-laundering laws and international standards, including the recommendations of the Financial Action Task Force (FATF).',
        ],
      },
      {
        heading: '3. Customer Due Diligence (KYC)',
        body: ['Before providing services, we verify the identity of each client. This typically includes collecting:'],
        bullets: [
          'Full name, date of birth, nationality, and residential address.',
          'A valid government-issued photo identity document.',
          'Proof of address (e.g. a recent utility bill or bank statement).',
          'Source of funds information where appropriate.',
        ],
      },
      {
        heading: '4. Enhanced Due Diligence',
        body: [
          'We apply enhanced due diligence to higher-risk clients and situations, including politically exposed persons (PEPs) and clients from higher-risk jurisdictions, which may involve additional documentation and senior approval.',
        ],
      },
      {
        heading: '5. Ongoing monitoring',
        body: [
          'We monitor accounts and transactions on a risk-sensitive basis to identify activity that is unusual or inconsistent with what we know about a client, and we keep client information up to date.',
        ],
      },
      {
        heading: '6. Sanctions and screening',
        body: [
          'We screen clients against applicable sanctions and watchlists. We do not knowingly provide services to sanctioned individuals or entities.',
        ],
      },
      {
        heading: '7. Reporting suspicious activity',
        body: [
          'Where we identify activity we suspect may involve money laundering or financial crime, we will take appropriate action, which may include reporting to the relevant authorities and, where lawful, without notifying the client.',
        ],
      },
      {
        heading: '8. Record keeping',
        body: [
          'We retain client identification and transaction records for the period required by applicable law.',
        ],
      },
      {
        heading: '9. Restricted jurisdictions',
        body: [
          'We do not offer services where doing so would be contrary to local law or regulation. Information on our platform is not directed at residents of any jurisdiction where such distribution or use would be unlawful.',
        ],
      },
      contactSection,
    ],
  },

  'client-agreement': {
    slug: 'client-agreement',
    title: 'Client Agreement',
    updated: UPDATED,
    intro: `The terms governing your use of ${ENTITY}'s platform and services.`,
    sections: [
      {
        heading: '1. Introduction',
        body: [
          `This Client Agreement ("Agreement") is between you ("Client") and ${ENTITY} ("Company", "we", "us"). It sets out the terms on which we provide access to our platform and services. By opening an account or using the platform, you accept this Agreement.`,
          statusNotice,
        ],
      },
      {
        heading: '2. Eligibility and account opening',
        body: [
          'You must be of legal age and have full capacity to enter into this Agreement, and you must not be resident in a jurisdiction where use of our services is prohibited. Account opening is subject to our verification and acceptance procedures.',
        ],
      },
      {
        heading: '3. Services',
        body: [
          'We provide an online platform for trading and related account services. During the demonstration phase, activity is simulated and no real money or real market execution takes place.',
        ],
      },
      {
        heading: '4. Client obligations',
        body: ['You agree to:'],
        bullets: [
          'Provide accurate, current, and complete information, and keep it updated.',
          'Keep your login credentials confidential and secure.',
          'Use the platform lawfully and only for your own account.',
          'Comply with all applicable laws and this Agreement.',
        ],
      },
      {
        heading: '5. Deposits and withdrawals',
        body: [
          'When live services are available, deposits and withdrawals will be subject to our funding terms, verification requirements, and applicable minimums and processing times. We may decline or delay a transaction where required for legal, security, or compliance reasons.',
        ],
      },
      {
        heading: '6. Fees and charges',
        body: [
          'Applicable spreads, commissions, and charges will be published on the platform and may be amended from time to time. You are responsible for any taxes arising from your activity.',
        ],
      },
      {
        heading: '7. Risk acknowledgement',
        body: [
          'Trading leveraged products carries a high level of risk and can result in the loss of some or all of your capital. You confirm that you understand these risks. Please read our Risk Disclosure.',
        ],
      },
      {
        heading: '8. Limitation of liability',
        body: [
          'To the maximum extent permitted by law, we are not liable for indirect or consequential losses, or for losses arising from events beyond our reasonable control, including market conditions and interruptions to technology or connectivity.',
        ],
      },
      {
        heading: '9. Termination',
        body: [
          'Either party may close the account in accordance with this Agreement. We may suspend or terminate access where required by law or where you breach this Agreement.',
        ],
      },
      {
        heading: '10. Governing law',
        body: [
          'This Agreement is governed by the laws of Saint Lucia, and the courts of Saint Lucia shall have jurisdiction, subject to any mandatory rights you have under the law of your country of residence.',
        ],
      },
      {
        heading: '11. Amendments',
        body: [
          'We may update this Agreement from time to time. The current version will always be available on our platform, and your continued use constitutes acceptance of the updated terms.',
        ],
      },
      contactSection,
    ],
  },

  'risk-disclosure': {
    slug: 'risk-disclosure',
    title: 'Risk Disclosure',
    updated: UPDATED,
    intro: 'Important information about the risks of trading leveraged financial products.',
    sections: [
      {
        heading: '1. General risk warning',
        body: [
          'Trading in derivatives and other leveraged financial products carries a high level of risk and may not be suitable for all investors. You may lose some or all of your invested capital, and in some cases you could lose more than your original investment. Do not trade with money you cannot afford to lose.',
        ],
      },
      {
        heading: '2. No advice',
        body: [
          `${ENTITY} does not provide investment, financial, legal, or tax advice. Nothing on our platform should be construed as a recommendation. You are strongly advised to obtain independent professional advice before trading.`,
        ],
      },
      {
        heading: '3. Leverage and margin',
        body: [
          'Leverage allows you to open positions larger than your deposit. While this can magnify profits, it equally magnifies losses, and a small market move can have a proportionately larger effect on your account. You are responsible for maintaining sufficient margin.',
        ],
      },
      {
        heading: '4. Market volatility and liquidity',
        body: [
          'Prices can move rapidly and unpredictably, and market conditions may make it difficult to execute orders at expected prices. Gaps and reduced liquidity can result in losses greater than anticipated.',
        ],
      },
      {
        heading: '5. Technology and execution',
        body: [
          'Online trading depends on hardware, software, and internet connectivity. Disruptions, delays, or failures in these systems may affect order execution and the information available to you.',
        ],
      },
      {
        heading: '6. Demonstration product notice',
        body: [
          statusNotice,
          'Simulated performance is not indicative of, and does not guarantee, future or real-money results.',
        ],
      },
      {
        heading: '7. Suitability and jurisdiction',
        body: [
          'Trading may not be permitted in some countries. Before trading, ensure it is lawful in your jurisdiction. Information on this site is not directed at residents of any country or jurisdiction where such distribution or use would be contrary to local law or regulation.',
        ],
      },
      contactSection,
    ],
  },
}

export function getLegalDoc(slug: string): LegalDoc | undefined {
  return legalDocs[slug]
}
