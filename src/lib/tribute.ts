import { create } from 'zustand'

interface TributeState {
  open: boolean
  /** station index to walk back to when the full-screen tribute closes */
  returnTo: number
  setOpen: (open: boolean) => void
}

export const useTribute = create<TributeState>((set) => ({
  open: false,
  returnTo: 0,
  setOpen: (open) => set({ open }),
}))