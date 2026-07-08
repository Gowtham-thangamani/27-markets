import { AlertTriangle } from 'lucide-react'
import { useAppSettings } from '@/lib/useAppSettings'

/** Site-wide banner shown when maintenance mode is enabled in General Settings. */
export function MaintenanceBanner() {
  const { maintenanceMode, maintenanceMessage } = useAppSettings()
  if (!maintenanceMode) return null
  return (
    <div className="relative z-50 flex items-center justify-center gap-2 bg-warning/15 px-4 py-2 text-center text-sm font-medium text-warning ring-1 ring-warning/30">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{maintenanceMessage || 'The platform is undergoing scheduled maintenance.'}</span>
    </div>
  )
}
