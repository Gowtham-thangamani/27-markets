export type Lang = 'en' | 'ar'
type Dict = Record<string, string>

/**
 * UI string dictionary. English is the source of truth; missing Arabic keys
 * fall back to English so nothing ever renders a raw key.
 *
 * NOTE: Arabic copy is Modern Standard Arabic and should be reviewed by a native
 * speaker before production launch — especially trading and legal terms.
 */
const en: Dict = {
  // ── Nav ──
  'nav.login': 'Login',
  'nav.openAccount': 'Open Account',
  'nav.trading': 'Trading',
  'nav.platforms': 'Platforms',
  'nav.markets': 'Markets',
  'nav.partner': 'Partner with us',
  'nav.company': 'Company',
  'nav.accountTypes': 'Account Types',
  'nav.conditions': 'Trading Conditions',
  'nav.funding': 'Funding',
  'nav.demo': 'Free Demo',
  'nav.allPlatforms': 'All Platforms',
  'nav.webTrader': 'Web Trader',
  'nav.mobile': 'Mobile',
  'nav.desktop': 'Desktop',
  'nav.forex': 'Forex',
  'nav.metals': 'Metals',
  'nav.indices': 'Indices',
  'nav.commodities': 'Commodities',
  'nav.stocks': 'Stocks',
  'nav.crypto': 'Crypto',
  'nav.ibProgram': 'IB Program',
  'nav.becomePartner': 'Become a Partner',
  'nav.about': 'About Us',
  'nav.trust': 'Trust & Safety',
  'nav.marketNews': 'Market News',
  'nav.help': 'Help & FAQ',
  'nav.contact': 'Contact',

  // ── Hero ──
  'hero.pill': 'Next-generation multi-asset broker',
  'hero.line1': 'Trade',
  'hero.line2': 'Beyond',
  'hero.line3': 'Limits',
  'hero.tagline': 'Precision · Performance · Partnership',
  'hero.desc': 'Access global financial markets through a broker built for traders, partners, and long-term growth.',
  'hero.ctaPrimary': 'Open Live Account',
  'hero.ctaSecondary': 'Try Free Demo',
  'hero.trust1': 'Segregated funds',
  'hero.trust2': 'No dealing desk',
  'hero.trust3': '2-minute setup',

  // ── Footer ──
  'footer.tagline': 'Trade global financial markets through a broker built for traders, partners, and long-term growth.',
  'footer.trading': 'Trading',
  'footer.company': 'Company',
  'footer.legal': 'Legal',
  'footer.accounts': 'Accounts',
  'footer.blog': 'Blog',
  'footer.clientPortal': 'Client Portal',
  'footer.partnership': 'Partnership',
  'footer.clientAgreement': 'Client Agreement',
  'footer.riskDisclosure': 'Risk Disclosure',
  'footer.privacy': 'Privacy Policy',
  'footer.aml': 'AML Policy',
  'footer.segregated': 'Segregated client funds',
  'footer.security': 'Bank-grade security',
  'footer.usd': 'USD accounts',
  'footer.support': '24/5 support',
  'footer.rights': '© 2026 27 Markets. All rights reserved.',
  'footer.riskTitle': 'Risk warning:',
  'footer.riskBody':
    'Trading leveraged products such as CFDs carries a high risk of losing money rapidly due to leverage and may not be suitable for all investors. You should consider whether you understand how these products work and whether you can afford to take the high risk of losing your money.',
  'footer.regTitle': 'Regulatory status:',
  'footer.regBody':
    '27 Markets is finalising its regulatory authorization. This platform currently operates as a demonstration product and is not yet a live, licensed brokerage. Nothing here constitutes investment advice.',

  // ── Language switcher ──
  'lang.label': 'Language',
  'lang.en': 'English',
  'lang.ar': 'العربية',
}

const ar: Dict = {
  // ── Nav ──
  'nav.login': 'تسجيل الدخول',
  'nav.openAccount': 'افتح حساباً',
  'nav.trading': 'التداول',
  'nav.platforms': 'المنصات',
  'nav.markets': 'الأسواق',
  'nav.partner': 'شارك معنا',
  'nav.company': 'الشركة',
  'nav.accountTypes': 'أنواع الحسابات',
  'nav.conditions': 'شروط التداول',
  'nav.funding': 'الإيداع والسحب',
  'nav.demo': 'حساب تجريبي مجاني',
  'nav.allPlatforms': 'جميع المنصات',
  'nav.webTrader': 'منصة الويب',
  'nav.mobile': 'الجوال',
  'nav.desktop': 'سطح المكتب',
  'nav.forex': 'الفوركس',
  'nav.metals': 'المعادن',
  'nav.indices': 'المؤشرات',
  'nav.commodities': 'السلع',
  'nav.stocks': 'الأسهم',
  'nav.crypto': 'العملات الرقمية',
  'nav.ibProgram': 'برنامج الوسيط المُعرِّف',
  'nav.becomePartner': 'كن شريكاً',
  'nav.about': 'من نحن',
  'nav.trust': 'الأمان والثقة',
  'nav.marketNews': 'أخبار السوق',
  'nav.help': 'المساعدة والأسئلة الشائعة',
  'nav.contact': 'اتصل بنا',

  // ── Hero ──
  'hero.pill': 'وسيط متعدد الأصول من الجيل الجديد',
  'hero.line1': 'تداول',
  'hero.line2': 'بلا',
  'hero.line3': 'حدود',
  'hero.tagline': 'الدقة · الأداء · الشراكة',
  'hero.desc': 'ادخل إلى الأسواق المالية العالمية عبر وسيط مبني للمتداولين والشركاء والنمو طويل الأمد.',
  'hero.ctaPrimary': 'افتح حساباً حقيقياً',
  'hero.ctaSecondary': 'جرّب حساباً تجريبياً',
  'hero.trust1': 'أموال منفصلة',
  'hero.trust2': 'بدون مكتب تداول',
  'hero.trust3': 'تسجيل في دقيقتين',

  // ── Footer ──
  'footer.tagline': 'تداول في الأسواق المالية العالمية عبر وسيط مبني للمتداولين والشركاء والنمو طويل الأمد.',
  'footer.trading': 'التداول',
  'footer.company': 'الشركة',
  'footer.legal': 'قانوني',
  'footer.accounts': 'الحسابات',
  'footer.blog': 'المدونة',
  'footer.clientPortal': 'بوابة العملاء',
  'footer.partnership': 'الشراكة',
  'footer.clientAgreement': 'اتفاقية العميل',
  'footer.riskDisclosure': 'إفصاح المخاطر',
  'footer.privacy': 'سياسة الخصوصية',
  'footer.aml': 'سياسة مكافحة غسل الأموال',
  'footer.segregated': 'أموال عملاء منفصلة',
  'footer.security': 'أمان بمستوى البنوك',
  'footer.usd': 'حسابات بالدولار الأمريكي',
  'footer.support': 'دعم 24/5',
  'footer.rights': '© 2026 27 ماركتس. جميع الحقوق محفوظة.',
  'footer.riskTitle': 'تحذير المخاطر:',
  'footer.riskBody':
    'ينطوي تداول المنتجات ذات الرافعة المالية مثل عقود الفروقات على مخاطر عالية لخسارة الأموال بسرعة بسبب الرافعة المالية، وقد لا يكون مناسباً لجميع المستثمرين. ينبغي أن تدرك كيفية عمل هذه المنتجات وأن تتأكد من قدرتك على تحمل مخاطر خسارة أموالك.',
  'footer.regTitle': 'الوضع التنظيمي:',
  'footer.regBody':
    'تعمل 27 ماركتس على استكمال ترخيصها التنظيمي. تعمل هذه المنصة حالياً كمنتج تجريبي وليست بعد وساطة مرخّصة. لا يُعدّ أي شيء هنا نصيحة استثمارية.',

  // ── Language switcher ──
  'lang.label': 'اللغة',
  'lang.en': 'English',
  'lang.ar': 'العربية',
}

export const translations: Record<Lang, Dict> = { en, ar }
