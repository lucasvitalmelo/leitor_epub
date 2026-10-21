import { create } from 'zustand'
import { connectDrive, disconnectDrive, DriveAuthError, getAccessToken } from '@/lib/drive/auth'
import { getDriveAccount, type DriveAccount } from '@/lib/drive/account'
import { setDriveEnabled } from '@/lib/db/deletions'
import { requestPersistentStorage } from '@/lib/storage'
import { debugLog } from '@/lib/debug-log'

// 'verificando' until the first answer. 'indisponivel' when there's no login
// server behind /api (the static deploy, `npm run dev`) or no network; the
// Drive button stays hidden in both.
export type DriveStatus = 'verificando' | 'indisponivel' | 'desconectado' | 'conectado' | 'reconectar'

interface DriveState {
  status: DriveStatus
  account: DriveAccount | null
  check: () => Promise<void>
  connect: () => void
  disconnect: () => Promise<void>
}

// Whether this device is connected decides if its removals are recorded (see
// isDriveEnabled). Fire and forget: a failed write must not break the screen.
function remember(enabled: boolean): void {
  setDriveEnabled(enabled).catch((error) => debugLog('drive: estado não guardado', String(error)))
}

export const useDriveStore = create<DriveState>((set) => ({
  status: 'verificando',
  account: null,
  check: async () => {
    try {
      await getAccessToken()
    } catch (error) {
      const status = error instanceof DriveAuthError ? error.problem : 'indisponivel'
      set({ status, account: null })
      // Only "never connected here" turns recording off. Access that expired,
      // or no network, says nothing about this device having been connected.
      if (status === 'desconectado') remember(false)
      debugLog(`drive: ${status}`)
      return
    }
    remember(true)
    void requestPersistentStorage()
    try {
      set({ status: 'conectado', account: await getDriveAccount() })
      debugLog('drive: conectado')
    } catch (error) {
      // Logged in, but the Drive API refused, e.g. not enabled in the Cloud project.
      set({ status: 'conectado', account: null })
      debugLog('drive: conta ilegível', String(error))
      console.error('Não foi possível ler a conta do Google Drive', error)
    }
  },
  connect: connectDrive,
  // Throws when the server couldn't log out; the state then stays as it is.
  disconnect: async () => {
    await disconnectDrive()
    remember(false)
    set({ status: 'desconectado', account: null })
    debugLog('drive: desconectado')
  },
}))
