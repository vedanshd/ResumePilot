import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { ResumeEditor } from "@/components/resume-editor";
import { ATSPanel } from "@/components/ats-panel";
import { BatchModal } from "@/components/batch-modal";
import { JobUploadModal } from "@/components/job-upload-modal";
import { JobDescriptionsList } from "@/components/job-descriptions-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Briefcase, Mail, Moon, Sun, Eye } from "lucide-react";
import { useResumeStore } from "@/store/resume-store";
import { useATSStore } from "@/store/ats-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/theme-context";
import { useToast } from "@/hooks/use-toast";
import { coverLetterService, CoverLetter } from "@/services/cover-letter-service";
import { CoverLetterViewer } from "@/components/cover-letter-viewer";
import { Trash2, Download } from "lucide-react";

// Color schemes for job descriptions
const colorSchemes = [
  { bg: "#E3F2FD", border: "#1976D2", text: "#0D47A1" },
  { bg: "#F3E5F5", border: "#7B1FA2", text: "#4A148C" },
  { bg: "#E8F5E9", border: "#388E3C", text: "#1B5E20" },
  { bg: "#FFF3E0", border: "#F57C00", text: "#E65100" },
  { bg: "#FCE4EC", border: "#C2185B", text: "#880E4F" },
  { bg: "#E0F2F1", border: "#00796B", text: "#004D40" },
  { bg: "#FFF8E1", border: "#FBC02D", text: "#F57F17" },
  { bg: "#F1F8E9", border: "#689F38", text: "#33691E" },
  { bg: "#E8EAF6", border: "#3F51B5", text: "#1A237E" },
  { bg: "#EFEBE9", border: "#5D4037", text: "#3E2723" },
];

export default function Dashboard() {
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [jobUploadModalOpen, setJobUploadModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('resumes');
  const [viewingCoverLetter, setViewingCoverLetter] = useState<CoverLetter | null>(null);
  const { isDark, toggleTheme, colors } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch cover letters
  const { data: coverLetters } = useQuery({
    queryKey: ["/api/covers"],
    enabled: true
  });

  const getJobColor = (index: number) => {
    return colorSchemes[index % colorSchemes.length];
  };
  
  const { 
    currentResumeId, 
    setCurrentResume, 
    resumes, 
    setResumes 
  } = useResumeStore();
  
  const { 
    currentJDId,
    setCurrentJD,
    jobDescriptions,
    setJobDescriptions
  } = useATSStore();

  // Fetch resumes
  const { data: resumesData } = useQuery({
    queryKey: ["/api/resumes"],
    enabled: true
  });

  // Fetch job descriptions
  const { data: jdsData } = useQuery({
    queryKey: ["/api/jds"],
    enabled: true
  });

  useEffect(() => {
    if (resumesData) {
      setResumes(resumesData);
      if (resumesData.length > 0 && !currentResumeId) {
        setCurrentResume(resumesData[0].id);
      }
    }
  }, [resumesData, setResumes, currentResumeId, setCurrentResume]);

  useEffect(() => {
    console.log('JDS Data from query:', jdsData);
    console.log('Current jobDescriptions in store:', jobDescriptions);
    if (jdsData) {
      console.log('Setting job descriptions:', jdsData);
      setJobDescriptions(jdsData);
      if (jdsData.length > 0 && !currentJDId) {
        setCurrentJD(jdsData[0].id);
      }
    }
  }, [jdsData, setJobDescriptions, currentJDId, setCurrentJD]);

  // Delete cover letter mutation
  const deleteCoverLetterMutation = useMutation({
    mutationFn: async (id: string) => {
      return coverLetterService.deleteCoverLetter(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/covers"] });
      toast({
        title: "Cover Letter Deleted",
        description: "The cover letter has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the cover letter.",
        variant: "destructive",
      });
    },
  });

  const handleViewCoverLetter = async (letter: any) => {
    try {
      const fullCoverLetter = await coverLetterService.getCoverLetter(letter.id);
      const job = jobDescriptions?.find(jd => jd.id === letter.jdId);
      setViewingCoverLetter({
        ...fullCoverLetter,
        jobTitle: job?.title,
        company: job?.company
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load cover letter.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadCoverLetter = async (letter: any) => {
    try {
      const job = jobDescriptions?.find(jd => jd.id === letter.jdId);
      const result = await coverLetterService.exportCoverLetterPDF(letter.id);
      
      // Create PDF blob and download
      const pdfBlob = new Blob([atob(result.document)], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cover-letter-${job?.company || 'company'}-${job?.title || 'position'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded",
        description: "Cover letter has been downloaded as a PDF.",
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Error",
        description: "Failed to download cover letter as PDF.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCoverLetter = (letterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      "Are you sure you want to delete this cover letter?\n\nThis action cannot be undone."
    );
    if (confirmed) {
      deleteCoverLetterMutation.mutate(letterId);
    }
  };

  // Delete all cover letters mutation
  const deleteAllCoverLettersMutation = useMutation({
    mutationFn: async () => {
      return coverLetterService.deleteAllCoverLetters();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/covers"] });
      toast({
        title: "All Cover Letters Deleted",
        description: `Successfully deleted ${result.deletedCount} cover letters.`,
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete all cover letters.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteAllCoverLetters = () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete ALL cover letters?\n\nThis action cannot be undone and will remove all your generated cover letters."
    );
    if (confirmed) {
      deleteAllCoverLettersMutation.mutate();
    }
  };

  const handleSectionNavigation = (section: string) => {
    setActiveSection(section);
  };

  const renderMainContent = () => {
    switch (activeSection) {
      case 'resumes':
        return (
          <>
            <ResumeEditor />
            <ATSPanel />
          </>
        );
      case 'jobs':
        return (
          <div className="flex-1 flex flex-col" style={{ backgroundColor: colors.card }}>
            <div 
              className="h-16 flex items-center justify-between px-6"
              style={{ borderBottom: `1px solid ${colors.border}` }}
            >
              <h2 className="text-lg font-semibold" style={{ color: colors.foreground }}>
                Job Descriptions Management
              </h2>
              <Button
                size="sm"
                onClick={() => setJobUploadModalOpen(true)}
                style={{ 
                  backgroundColor: colors.primary,
                  color: colors.primaryForeground
                }}
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Add Jobs
              </Button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              {console.log('Rendering jobs section, jobDescriptions:', jobDescriptions)}
              {!jdsData ? (
                <Card 
                  className="p-6 text-center"
                  style={{ 
                    backgroundColor: colors.card,
                    borderColor: colors.border
                  }}
                >
                  <Briefcase className="w-12 h-12 mx-auto mb-4 animate-pulse" style={{ color: colors.mutedForeground }} />
                  <h3 className="text-lg font-semibold mb-2" style={{ color: colors.foreground }}>
                    Loading Job Descriptions...
                  </h3>
                </Card>
              ) : (
                <JobDescriptionsList
                  jobDescriptions={jdsData || []}
                  onSelectJob={(job) => {
                    setCurrentJD(job.id);
                    setActiveSection('resumes');
                  }}
                  selectedJobId={currentJDId}
                />
              )}
            </div>
          </div>
        );
      case 'covers':
        return (
          <div className="flex-1 flex flex-col" style={{ backgroundColor: colors.card }}>
            <div 
              className="h-16 flex items-center justify-between px-6"
              style={{ borderBottom: `1px solid ${colors.border}` }}
            >
              <h2 className="text-lg font-semibold" style={{ color: colors.foreground }}>
                Cover Letters
              </h2>
              <div className="flex items-center space-x-2">
                {coverLetters && coverLetters.length > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDeleteAllCoverLetters}
                    disabled={deleteAllCoverLettersMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setBatchModalOpen(true)}
                  style={{ 
                    backgroundColor: colors.primary,
                    color: colors.primaryForeground
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Generate Cover Letters
                </Button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              {coverLetters && coverLetters.length > 0 ? (
                <div className="grid gap-4">
                  {coverLetters.map((letter: any, index: number) => {
                    const job = jobDescriptions?.find(jd => jd.id === letter.jdId);
                    const jobIndex = jobDescriptions?.findIndex(jd => jd.id === letter.jdId) || 0;
                    const colorScheme = getJobColor(jobIndex);
                    return (
                      <Card 
                        key={letter.id}
                        className="p-4"
                        style={{
                          backgroundColor: isDark ? colors.card : colorScheme.bg,
                          borderColor: colorScheme.border,
                          borderWidth: "1px",
                          borderStyle: "solid"
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ 
                                backgroundColor: colorScheme.bg,
                                border: `2px solid ${colorScheme.border}`
                              }}
                            >
                              <Mail className="w-5 h-5" style={{ color: colorScheme.text }} />
                            </div>
                            <div>
                              <h3 className="font-semibold" style={{ color: isDark ? colors.foreground : colorScheme.text }}>
                                {job?.title || letter.jobTitle || "Cover Letter"}
                              </h3>
                              <p className="text-sm" style={{ color: isDark ? colors.mutedForeground : colorScheme.border }}>
                                {job?.company || letter.company || "Company"}
                              </p>
                              <p className="text-xs mt-2" style={{ color: colors.mutedForeground }}>
                                Generated: {new Date(letter.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewCoverLetter(letter)}
                              style={{
                                borderColor: colors.border,
                                color: colors.foreground
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDownloadCoverLetter(letter)}
                              style={{
                                borderColor: colors.border,
                                color: colors.foreground
                              }}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => handleDeleteCoverLetter(letter.id, e)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="p-8 text-center" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                  <Mail className="w-12 h-12 mx-auto mb-4" style={{ color: colors.mutedForeground }} />
                  <h3 className="text-lg font-semibold mb-2" style={{ color: colors.foreground }}>
                    No Cover Letters Yet
                  </h3>
                  <p className="text-sm mb-4" style={{ color: colors.mutedForeground }}>
                    Generate personalized cover letters for your job applications
                  </p>
                  <Button
                    onClick={() => setBatchModalOpen(true)}
                    style={{ 
                      backgroundColor: colors.primary,
                      color: colors.primaryForeground
                    }}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Generate Cover Letters
                  </Button>
                </Card>
              )}
            </div>
          </div>
        );
      default:
        return (
          <>
            <ResumeEditor />
            <ATSPanel />
          </>
        );
    }
  };

  return (
    <div 
      className="min-h-screen flex transition-colors duration-300"
      style={{ backgroundColor: colors.background }}
    >
      <Sidebar onNavigate={handleSectionNavigation} />
      
      <div className="flex-1 flex overflow-hidden">
        {renderMainContent()}
      </div>

      {/* Theme Toggle Button */}
      <div className="fixed top-6 right-6 z-50">
        <Button
          size="icon"
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full shadow-lg transition-all duration-300"
          style={{ 
            backgroundColor: colors.primary,
            color: colors.primaryForeground
          }}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>


      {/* Modals */}
      <BatchModal 
        open={batchModalOpen} 
        onOpenChange={setBatchModalOpen} 
      />
      
      <JobUploadModal 
        open={jobUploadModalOpen} 
        onOpenChange={setJobUploadModalOpen} 
      />
      
      {/* Cover Letter Viewer Modal */}
      <CoverLetterViewer
        coverLetter={viewingCoverLetter}
        jobTitle={viewingCoverLetter?.jobTitle}
        company={viewingCoverLetter?.company}
        open={!!viewingCoverLetter}
        onOpenChange={(open) => !open && setViewingCoverLetter(null)}
      />
    </div>
  );
}
