import { File, Briefcase, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useResumeStore } from "@/store/resume-store";
import { useATSStore } from "@/store/ats-store";
import { useTheme } from "@/contexts/theme-context";
import { useState } from "react";

export function Sidebar({ onNavigate }: { onNavigate?: (section: string) => void }) {
  const { resumes } = useResumeStore();
  const { jobDescriptions } = useATSStore();
  const { colors } = useTheme();
  const [activeSection, setActiveSection] = useState('resumes');

  const handleNavigation = (section: string) => {
    setActiveSection(section);
    if (onNavigate) {
      onNavigate(section);
    }
  };

  return (
    <div 
      className="w-64 shadow-lg transition-colors duration-300"
      style={{ 
        backgroundColor: colors.card,
        borderRight: `1px solid ${colors.border}`
      }}
    >
      <div 
        className="p-6"
        style={{ borderBottom: `1px solid ${colors.border}` }}
      >
        <div className="flex items-center space-x-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: colors.primary }}
          >
            <FileText className="h-4 w-4" style={{ color: colors.primaryForeground }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: colors.foreground }}>Live ATS</h1>
            <p className="text-xs" style={{ color: colors.mutedForeground }}>Suite</p>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-2">
        <button
          onClick={() => handleNavigation('resumes')}
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer"
          style={{ 
            backgroundColor: activeSection === 'resumes' ? colors.accent + '20' : 'transparent',
            color: colors.foreground
          }}
        >
          <File className="h-4 w-4" />
          <span className="font-medium">Resumes</span>
          <Badge 
            variant="default" 
            className="ml-auto"
            style={{ 
              backgroundColor: colors.primary,
              color: colors.primaryForeground
            }}
          >
            {resumes?.length || 0}
          </Badge>
        </button>
        
        <button
          onClick={() => handleNavigation('jobs')}
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer hover:opacity-80"
          style={{ 
            color: colors.foreground,
            backgroundColor: activeSection === 'jobs' ? colors.accent + '20' : 'transparent'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = activeSection === 'jobs' ? colors.accent + '20' : colors.muted}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = activeSection === 'jobs' ? colors.accent + '20' : 'transparent'}
        >
          <Briefcase className="h-4 w-4" />
          <span className="font-medium">Job Descriptions</span>
          <Badge 
            variant="secondary" 
            className="ml-auto"
            style={{ 
              backgroundColor: colors.secondary,
              color: colors.secondaryForeground
            }}
          >
            {jobDescriptions?.length || 0}
          </Badge>
        </button>
      </nav>
    </div>
  );
}
