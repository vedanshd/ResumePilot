import { create } from 'zustand';
import { apiRequest } from '@/lib/queryClient';

interface ATSBreakdown {
  keywords: { score: number; matched: number; total: number; missing: string[] };
  relevancy: { score: number; total: number };
  quantification: { score: number; total: number; quantifiedBullets: number; totalBullets: number };
  formatting: { score: number; total: number };
  readability: { score: number; total: number; gradeLevel: number };
}

interface ATSScore {
  overall: number;
  breakdown: ATSBreakdown;
  suggestions: string[];
  partial?: boolean;
  final?: boolean;
}

interface ATSState {
  currentJDId: string | null;
  jobDescriptions: any[] | null;
  atsScore: ATSScore | null;
  isScoring: boolean;
  scoreHistory: number[];
  lastScoredData: string | null;
  pendingScoreTimeout: NodeJS.Timeout | null;
  setCurrentJD: (id: string) => void;
  setJobDescriptions: (jds: any[]) => void;
  setATSScore: (score: ATSScore) => void;
  setIsScoring: (scoring: boolean) => void;
  addToHistory: (score: number) => void;
  requestATSScore: (resumeId: string) => void;
  triggerATSScore: () => void;
  debouncedTriggerATSScore: () => void;
}

export const useATSStore = create<ATSState>((set, get) => ({
  currentJDId: null,
  jobDescriptions: null,
  atsScore: null,
  isScoring: false,
  scoreHistory: [],
  lastScoredData: null,
  pendingScoreTimeout: null,
  
  setCurrentJD: (id: string) => {
    const currentId = get().currentJDId;
    if (currentId !== id) {
      set({ currentJDId: id });
      // Only trigger ATS score if actually changed
      setTimeout(() => {
        get().triggerATSScore();
      }, 500);
    }
  },
  
  setJobDescriptions: (jds: any[]) => {
    set({ jobDescriptions: jds });
  },
  
  setATSScore: (score: ATSScore) => {
    set({ atsScore: score });
  },
  
  setIsScoring: (scoring: boolean) => {
    set({ isScoring: scoring });
  },
  
  addToHistory: (score: number) => {
    set((state) => ({
      scoreHistory: [...state.scoreHistory.slice(-9), score] // Keep last 10 scores
    }));
  },
  
  requestATSScore: async (resumeId: string) => {
    const { currentJDId } = get();
    if (!currentJDId) return;
    
    try {
      set({ isScoring: true });
      
      await apiRequest('POST', '/api/ats/score', {
        resumeId,
        jdId: currentJDId
      });
      
      // The actual score will come via WebSocket
    } catch (error) {
      console.error('Failed to request ATS score:', error);
      set({ isScoring: false });
    }
  },
  
  triggerATSScore: () => {
    // Import useResumeStore dynamically to avoid circular dependency
    import('./resume-store').then(({ useResumeStore }) => {
      const resumeId = useResumeStore.getState().currentResumeId;
      if (resumeId) {
        get().requestATSScore(resumeId);
      }
    });
  },
  
  debouncedTriggerATSScore: () => {
    const { pendingScoreTimeout } = get();
    
    // Clear existing timeout
    if (pendingScoreTimeout) {
      clearTimeout(pendingScoreTimeout);
    }
    
    // Set new timeout with longer delay
    const newTimeout = setTimeout(() => {
      import('./resume-store').then(({ useResumeStore }) => {
        const resumeState = useResumeStore.getState();
        const resumeId = resumeState.currentResumeId;
        const currentData = resumeState.currentResumeData;
        
        if (resumeId && currentData) {
          // Check if data has substantially changed
          const currentDataString = JSON.stringify({
            personalInfo: currentData.personalInfo,
            summary: currentData.summary,
            experience: currentData.experience,
            skills: currentData.skills
          });
          
          const { lastScoredData } = get();
          if (currentDataString !== lastScoredData) {
            set({ lastScoredData: currentDataString });
            get().requestATSScore(resumeId);
          }
        }
      });
      set({ pendingScoreTimeout: null });
    }, 5000); // 5 second debounce for ATS scoring
    
    set({ pendingScoreTimeout: newTimeout });
  }
}));
