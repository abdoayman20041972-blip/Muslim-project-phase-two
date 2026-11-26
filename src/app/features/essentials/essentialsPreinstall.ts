import { PACK_KEY, savePack } from './essentialsPack'

/**
 * Private preinstall. A personal build can carry a content pack without it ever entering the repository:
 * put the JSON at `private/essentials-pack.json` (the folder is git-ignored) before building. On first launch
 * the pack is copied into device storage, exactly as if it had been imported by hand. If the folder is absent
 * (every public build), nothing is bundled and this does nothing. A pack the user imported or cleared is never
 * overwritten: the install runs once per device.
 */
export const PREINSTALL_FLAG = 'essentials-preinstall-done-v1'

const bundled = import.meta.glob('../../../../private/essentials-pack.json', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export function installPreinstalledPack(
  raw: string | undefined = Object.values(bundled)[0],
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): boolean {
  try {
    if (!raw || storage.getItem(PREINSTALL_FLAG) || storage.getItem(PACK_KEY)) return false
    if (!savePack(raw, storage)) return false
    storage.setItem(PREINSTALL_FLAG, '1')
    return true
  } catch { return false }
}
