import { useCallback, useEffect, useState } from 'react'
import { Plug, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import { Badge, Button, Input, Modal } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { api, ApiError } from '@/lib/api'
import { tradingApi, type Mt5Status } from '@/lib/tradingApi'

/** Lets a client link their own MetaTrader 5 account (login / password / server). */
export function Mt5Card() {
  const toast = useToast()
  const [status, setStatus] = useState<Mt5Status | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [server, setServer] = useState('')

  const load = useCallback(async () => {
    try {
      setStatus(await tradingApi.mt5Status())
    } catch {
      /* best-effort */
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const connect = async () => {
    if (!login || !password || !server) {
      toast.warning('Missing details', 'Enter your MT5 login, password, and server.')
      return
    }
    setBusy(true)
    try {
      await tradingApi.connectMt5({ login, password, server })
      toast.success('MT5 submitted', 'Your account is being linked.')
      setOpen(false)
      setPassword('')
      await load()
    } catch (e) {
      toast.error('Could not connect', e instanceof ApiError ? e.message : (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    setBusy(true)
    try {
      await api.del('/trading/mt5')
      toast.success('MT5 disconnected', 'Your MT5 account was unlinked.')
      await load()
    } catch (e) {
      toast.error('Could not disconnect', (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const tone = status?.status === 'CONNECTED' ? 'success' : status?.status === 'FAILED' ? 'danger' : 'warning'
  const StatusIcon = status?.status === 'CONNECTED' ? CheckCircle2 : status?.status === 'FAILED' ? AlertTriangle : Clock

  return (
    <div className="glass-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
            <Plug className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold text-white">MetaTrader 5</h3>
            {status ? (
              <p className="text-xs text-gray-500">
                {status.login} · {status.server}
              </p>
            ) : (
              <p className="text-xs text-gray-500">Link your MT5 account to route real trades.</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status && (
            <Badge tone={tone}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {status.status === 'CONNECTED' ? 'Connected' : status.status === 'FAILED' ? 'Failed' : 'Pending'}
            </Badge>
          )}
          {status ? (
            <Button size="sm" variant="outline" loading={busy} onClick={disconnect}>
              Disconnect
            </Button>
          ) : (
            <Button size="sm" onClick={() => setOpen(true)}>
              Connect MT5
            </Button>
          )}
        </div>
      </div>
      {status?.status === 'FAILED' && status.error && <p className="mt-2 text-xs text-danger">{status.error}</p>}

      <Modal open={open} onClose={() => setOpen(false)} title="Connect MetaTrader 5" description="Use your MT5 trade (master) password — it's sent securely to link the account and never stored.">
        <div className="space-y-3">
          <Input label="MT5 login (account number)" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="51234567" />
          <Input label="MT5 password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="trade/master password" />
          <Input label="MT5 server" value={server} onChange={(e) => setServer(e.target.value)} placeholder="ICMarkets-Demo" />
          <Button fullWidth loading={busy} onClick={connect}>
            Link account
          </Button>
          <p className="text-center text-[11px] text-gray-500">We store only your login + server. The password is used once to link via MetaApi.</p>
        </div>
      </Modal>
    </div>
  )
}
