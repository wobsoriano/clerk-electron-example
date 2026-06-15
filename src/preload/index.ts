import { exposeClerkBridge } from '@clerk/electron/preload'
import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

exposeClerkBridge()

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('electron', electronAPI)
} else {
  ;(window as unknown as Window & { electron: typeof electronAPI }).electron = electronAPI
}
