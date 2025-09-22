import { create } from 'zustand';
import { ResumeJson } from '@shared/schema';

interface ResumeState {
  currentResumeId: string | null;
  currentResumeData: ResumeJson | null;
  resumes: any[] | null;
  setCurrentResume: (id: string) => void;
  setCurrentResumeData: (data: ResumeJson) => void;
  setResumes: (resumes: any[]) => void;
  triggerATSScore: () => void;
}

export const useResumeStore = create<ResumeState>((set, get) => ({
  currentResumeId: null,
  currentResumeData: null,
  resumes: null,
  
  setCurrentResume: (id: string) => {
    const currentId = get().currentResumeId;
    if (currentId !== id) {
      set({ currentResumeId: id });
      // Only trigger ATS score if actually changed
      setTimeout(() => {
        get().triggerATSScore();
      }, 500);
    }
  },
  
  setCurrentResumeData: (data: ResumeJson) => {
    set({ currentResumeData: data });
  },
  
  setResumes: (resumes: any[]) => {
    set({ resumes });
  },
  
  triggerATSScore: () => {
    // This will be handled by the ATS store
    const { currentResumeId } = get();
    if (currentResumeId) {
      // Import dynamically to avoid circular dependency
      import('./ats-store').then(({ useATSStore }) => {
        useATSStore.getState().requestATSScore(currentResumeId);
      });
    }
  }
}));
