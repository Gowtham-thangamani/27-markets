import { motion } from 'framer-motion'
import { Plus, Copy, Wallet } from 'lucide-react'
import { Badge, Button, EmptyState } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { statusTone } from '@/components/portal/statusTone'
import { usePortalUI } from '@/layouts/PortalLayout'
import { usePortalData } from '@/context/PortalDataContext'
import { useToast } from '@/context/ToastContext'
import { formatCurrency, formatDate } from '@/lib/format'
import { fadeUp, staggerContainer } from '@/lib/motion'

export default function PortalAccountsPage() {
  const { accounts } = usePortalData()
  const { openNewAccount } = usePortalUI()
  const toast = useToast()

  const copy = (id: string) => {
    navigator.clipboard?.writeText(id)
    toast.success('Copied', `Account ${id} copied to clipboard.`)
  }

  return (
    <>
      <PageTitle
        title="Accounts"
        subtitle="Manage your live and demo trading accounts."
        action={
          <Button onClick={openNewAccount} className="gap-1.5">
            <Plus className="h-4 w-4" /> Open New Account
          </Button>
        }
      />

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          description="Open your first trading account to get started."
          action={<Button onClick={openNewAccount}>Open New Account</Button>}
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-2"
        >
          {accounts.map((a) => (
            <motion.div key={a.id} variants={fadeUp} className="glass-panel card-lift p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-bold text-white">{a.number}</h3>
                    <button
                      onClick={() => copy(a.number)}
                      className="text-gray-500 hover:text-white"
                      aria-label="Copy account number"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge tone={a.mode === 'Demo' ? 'info' : 'brand'}>{a.mode}</Badge>
                    <span className="text-sm text-gray-400">{a.type}</span>
                  </div>
                </div>
                <Badge tone={statusTone(a.status)} dot>
                  {a.status}
                </Badge>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Balance</p>
                  <p className="font-display text-xl font-bold text-white">
                    {formatCurrency(a.balance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Equity</p>
                  <p className="font-display text-xl font-bold text-white">
                    {formatCurrency(a.equity)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Leverage</p>
                  <p className="font-medium text-gray-200">{a.leverage}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Free margin</p>
                  <p className="font-medium text-gray-200">{formatCurrency(a.freeMargin)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Opened</p>
                  <p className="font-medium text-gray-200">{formatDate(a.createdAt)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </>
  )
}
