import { create } from 'zustand'
import { Activity } from '@/api/activities'

interface ActivityState {
  activities: Activity[]
  setActivities: (a: Activity[]) => void
  addActivity: (a: Activity) => void
}

export const useActivityStore = create<ActivityState>((set) => ({
  activities: [],
  setActivities: (activities) => set({ activities }),
  addActivity: (activity) =>
    set((state) => ({
      // Avoid duplicates
      activities: [activity, ...state.activities.filter(a => a.id !== activity.id)].slice(0, 50),
    })),
}))
