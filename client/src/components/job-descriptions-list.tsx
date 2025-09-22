import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Trash2, Eye, CheckCircle, FileText, Loader2, Sparkles } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { JobDescriptionViewer } from "@/components/job-description-viewer";
import { CoverLetterViewer } from "@/components/cover-letter-viewer";
import { useResumeStore } from "@/store/resume-store";

interface JobDescription {
  id: string;
  title: string;
  company: string;
  rawText?: string;
  parsed?: any;
  color?: string;
  createdAt: string;
}

interface JobDescriptionsListProps {
  jobDescriptions: JobDescription[];
  onSelectJob: (job: JobDescription) => void;
  selectedJobId?: string;
}

// Predefined color schemes for job descriptions
const colorSchemes = [
  { bg: "#E3F2FD", border: "#1976D2", text: "#0D47A1" }, // Blue
  { bg: "#F3E5F5", border: "#7B1FA2", text: "#4A148C" }, // Purple
  { bg: "#E8F5E9", border: "#388E3C", text: "#1B5E20" }, // Green
  { bg: "#FFF3E0", border: "#F57C00", text: "#E65100" }, // Orange
  { bg: "#FCE4EC", border: "#C2185B", text: "#880E4F" }, // Pink
  { bg: "#E0F2F1", border: "#00796B", text: "#004D40" }, // Teal
  { bg: "#FFF8E1", border: "#FBC02D", text: "#F57F17" }, // Yellow
  { bg: "#F1F8E9", border: "#689F38", text: "#33691E" }, // Light Green
  { bg: "#E8EAF6", border: "#3F51B5", text: "#1A237E" }, // Indigo
  { bg: "#EFEBE9", border: "#5D4037", text: "#3E2723" }, // Brown
];

export function JobDescriptionsList({ 
  jobDescriptions, 
  onSelectJob, 
  selectedJobId 
}: JobDescriptionsListProps) {
  const { colors, isDark } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentResumeId } = useResumeStore();
  const [viewingJob, setViewingJob] = useState<JobDescription | null>(null);
  const [generatingCover, setGeneratingCover] = useState<string | null>(null);
  const [viewingCover, setViewingCover] = useState<any>(null);

  // Assign colors to job descriptions based on their index
  const getJobColor = (index: number) => {
    return colorSchemes[index % colorSchemes.length];
  };

  // Delete job description mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("DELETE", `/api/jds/${jobId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jds"] });
      toast({
        title: "Job Description Deleted",
        description: "The job description has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the job description.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Use a more user-friendly confirmation dialog
    const confirmed = window.confirm(
      "Are you sure you want to delete this job description?\n\nThis action cannot be undone."
    );
    if (confirmed) {
      deleteJobMutation.mutate(jobId);
    }
  };


  // Generate cover letter mutation
  const generateCoverMutation = useMutation({
    mutationFn: async ({ jdId }: { jdId: string }) => {
      if (!currentResumeId) {
        throw new Error("No resume selected");
      }
      const response = await apiRequest("POST", "/api/covers/generate", {
        resumeId: currentResumeId,
        jdId,
        tone: 'professional',
        length: 'medium'
      });
      return response.json();
    },
    onSuccess: (response, { jdId }) => {
      setGeneratingCover(null);
      // Invalidate cover letters cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/covers"] });
      const job = jobDescriptions.find(j => j.id === jdId);
      setViewingCover({
        ...response,
        jobTitle: job?.title,
        company: job?.company
      });
      toast({
        title: "Cover Letter Generated",
        description: "Your cover letter has been created successfully.",
      });
    },
    onError: (error) => {
      setGeneratingCover(null);
      toast({
        title: "Generation Failed",
        description: "Failed to generate cover letter. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleGenerateCover = (job: JobDescription, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentResumeId) {
      toast({
        title: "No Resume Selected",
        description: "Please select or create a resume first.",
        variant: "destructive",
      });
      return;
    }
    setGeneratingCover(job.id);
    generateCoverMutation.mutate({ jdId: job.id });
  };

  if (!jobDescriptions || jobDescriptions.length === 0) {
    return (
      <Card 
        className="p-6 text-center"
        style={{ 
          backgroundColor: colors.card,
          borderColor: colors.border
        }}
      >
        <Briefcase className="w-12 h-12 mx-auto mb-4" style={{ color: colors.mutedForeground }} />
        <h3 className="text-lg font-semibold mb-2" style={{ color: colors.foreground }}>
          No Job Descriptions
        </h3>
        <p className="text-sm" style={{ color: colors.mutedForeground }}>
          Upload job descriptions to start generating tailored cover letters
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: colors.foreground }}>
          Job Descriptions ({jobDescriptions.length})
        </h3>
      </div>

      <div className="grid gap-3">
        {jobDescriptions.map((job, index) => {
          const colorScheme = getJobColor(index);
          const isSelected = selectedJobId === job.id;
          
          return (
            <Card
              key={job.id}
              className="p-4 cursor-pointer transition-all duration-200 hover:shadow-lg"
              style={{
                backgroundColor: isDark ? colors.card : colorScheme.bg,
                borderColor: isSelected ? colorScheme.border : colors.border,
                borderWidth: isSelected ? "2px" : "1px",
                borderStyle: "solid"
              }}
              onClick={() => onSelectJob(job)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ 
                      backgroundColor: colorScheme.bg,
                      border: `2px solid ${colorScheme.border}`
                    }}
                  >
                    <Briefcase 
                      className="w-5 h-5" 
                      style={{ color: colorScheme.text }}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 
                        className="font-semibold text-sm truncate"
                        style={{ color: isDark ? colors.foreground : colorScheme.text }}
                      >
                        {job.title}
                      </h4>
                      {isSelected && (
                        <Badge 
                          variant="default"
                          style={{ 
                            backgroundColor: colorScheme.border,
                            color: "#FFFFFF"
                          }}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                    
                    <p 
                      className="text-sm font-medium mb-2"
                      style={{ color: isDark ? colors.mutedForeground : colorScheme.border }}
                    >
                      {job.company}
                    </p>
                    
                    <p 
                      className="text-xs line-clamp-2"
                      style={{ color: colors.mutedForeground }}
                    >
                      {(job.rawText || job.parsed?.summary || 'No description available').substring(0, 150)}...
                    </p>
                    
                    <div className="flex items-center space-x-2 mt-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingJob(job);
                        }}
                        className="text-xs"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleGenerateCover(job, e)}
                        disabled={generatingCover === job.id}
                        className="text-xs"
                        style={{ color: colors.primary }}
                      >
                        {generatingCover === job.id ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 mr-1" />
                            Cover Letter
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => handleDelete(job.id, e)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Job Description Viewer Modal */}
      <JobDescriptionViewer
        job={viewingJob}
        open={!!viewingJob}
        onOpenChange={(open) => !open && setViewingJob(null)}
      />

      {/* Cover Letter Viewer Modal */}
      <CoverLetterViewer
        coverLetter={viewingCover}
        jobTitle={viewingCover?.jobTitle}
        company={viewingCover?.company}
        open={!!viewingCover}
        onOpenChange={(open) => !open && setViewingCover(null)}
      />
    </div>
  );
}
