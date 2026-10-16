import { Check, ChevronDown, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui'
import { Dropdown } from '@/components/ui/Dropdown'
import { usePortalData } from '@/context/PortalDataContext'
import { formatCurrency } from '@/lib/format'

/**
 * Picks the account the whole portal acts on.
 *
 * This used to be a <select> on the Dashboard only, so switching there changed
 * the Dashboard and nothing else — Trade, Funds and the history table each
 * kept their own idea of the current account. Living in the topbar, it applies
 * everywhere and is visible on every page.
 */
export function AccountSwitcher() {
  const { accounts, selectedAccount, selectAccount } = usePortalData()

  if (accounts.length === 0) return null

  return (
    <Dropdown
      align="right"
      className="w-72"
      trigger={
        <span
          className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-ink-800/60 px-3 text-sm text-gray-200 transition-colors hover:border-white/20 hover:text-white"
          role="button"
          aria-label="Switch trading account"
        >
          <Wallet className="h-4 w-4 shrink-0 text-brand-400" />
          <span className="hidden font-medium sm:inline">
            {selectedAccount?.number ?? 'Select account'}
          </span>
          {selectedAccount && (
            <Badge tone={selectedAccount.mode === 'Live' ? 'success' : 'neutral'}>
              {selectedAccount.mode}
            </Badge>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
        </span>
      }
    >
      <p className="px-3 py-2 text-xs uppercase tracking-wide text-gray-500">Trading account</p>
      <div className="max-h-80 overflow-y-auto">
        {accounts.map((a) => {
          const active = a.id === selectedAccount?.id
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => selectAccount(a.id)}
              aria-current={active}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/[0.04]"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-white">{a.number}</span>
                  <Badge tone={a.mode === 'Live' ? 'success' : 'neutral'}>{a.mode}</Badge>
                </span>
                <span className="block text-xs text-gray-500">
                  {a.type} · {a.leverage}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-gray-200">
                  {formatCurrency(a.balance)}
                </span>
                {active && <Check className="h-4 w-4 text-brand-400" />}
              </span>
            </button>
          )
        })}
      </div>
    </Dropdown>
  )
}
