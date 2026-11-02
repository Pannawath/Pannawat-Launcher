import { create } from 'zustand'

const initialUsername = localStorage.getItem('mc_offline_username') || 'Pannawath'
let initialSavedAccounts = []
try {
  initialSavedAccounts = JSON.parse(localStorage.getItem('mc_saved_offline_accounts') || '[]')
} catch {
  initialSavedAccounts = []
}
if (!initialSavedAccounts.includes(initialUsername)) {
  initialSavedAccounts = [initialUsername, ...initialSavedAccounts]
}

export const useProfileStore = create((set, get) => ({
  profiles: [],
  activeProfileId: null,

  // Offline Account & Skin State
  offlineUsername: initialUsername,
  savedOfflineAccounts: initialSavedAccounts,
  offlineSkin: JSON.parse(localStorage.getItem('mc_offline_skin') || 'null') || {
    id: 'steve',
    name: 'Steve',
    type: 'classic',
    url: 'https://textures.minecraft.net/texture/1a4af718455d4aab528e7a61f86fa25e6a369d1768dcb13f7df319a71824765',
    isCustom: false,
  },
  savedCustomSkins: JSON.parse(localStorage.getItem('mc_saved_custom_skins') || '[]'),

  setOfflineUsername: (username) => {
    const clean = username.trim() || 'Player'
    const accounts = get().savedOfflineAccounts
    const updated = accounts.includes(clean) ? accounts : [clean, ...accounts]
    localStorage.setItem('mc_offline_username', clean)
    localStorage.setItem('mc_saved_offline_accounts', JSON.stringify(updated))
    set({ offlineUsername: clean, savedOfflineAccounts: updated })
  },

  addOfflineAccount: (username) => {
    const clean = username.trim()
    if (!clean) return
    const accounts = get().savedOfflineAccounts
    if (!accounts.includes(clean)) {
      const updated = [clean, ...accounts]
      localStorage.setItem('mc_saved_offline_accounts', JSON.stringify(updated))
      set({ savedOfflineAccounts: updated })
    }
  },

  removeOfflineAccount: (username) => {
    const accounts = get().savedOfflineAccounts.filter((u) => u !== username)
    const nextList = accounts.length > 0 ? accounts : ['Player']
    localStorage.setItem('mc_saved_offline_accounts', JSON.stringify(nextList))
    let current = get().offlineUsername
    if (current === username) {
      current = nextList[0]
      localStorage.setItem('mc_offline_username', current)
    }
    set({ savedOfflineAccounts: nextList, offlineUsername: current })
  },

  setOfflineSkin: (skin) => {
    localStorage.setItem('mc_offline_skin', JSON.stringify(skin))
    set({ offlineSkin: skin })
  },

  addCustomSkin: (newSkin) => {
    const current = get().savedCustomSkins
    const updated = [newSkin, ...current.filter((s) => s.id !== newSkin.id)]
    localStorage.setItem('mc_saved_custom_skins', JSON.stringify(updated))
    localStorage.setItem('mc_offline_skin', JSON.stringify(newSkin))
    set({ savedCustomSkins: updated, offlineSkin: newSkin })
  },

  removeCustomSkin: (id) => {
    const current = get().savedCustomSkins
    const updated = current.filter((s) => s.id !== id)
    localStorage.setItem('mc_saved_custom_skins', JSON.stringify(updated))
    set({ savedCustomSkins: updated })
  },

  setProfiles: (profiles) => set({ profiles }),
  setActiveProfile: (id) => set({ activeProfileId: id }),
  getActiveProfile: () => {
    const { profiles, activeProfileId } = get()
    return profiles.find((p) => p.id === activeProfileId) ?? null
  },
}))
