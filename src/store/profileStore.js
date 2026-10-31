import { create } from 'zustand'

export const useProfileStore = create((set, get) => ({
  profiles: [],
  activeProfileId: null,

  setProfiles: (profiles) => set({ profiles }),
  setActiveProfile: (id) => set({ activeProfileId: id }),
  getActiveProfile: () => {
    const { profiles, activeProfileId } = get()
    return profiles.find((p) => p.id === activeProfileId) ?? null
  },
}))
