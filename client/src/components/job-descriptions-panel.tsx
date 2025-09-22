import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase } from "lucide-react";
import { useATSStore } from "@/store/ats-store";
import { useTheme } from "@/contexts/theme-context";
import { JobDescriptionsList } from "@/components/job-descriptions-list";
import { JobUploadModal } from "@/components/job-upload-modal";
import { useQuery } from "@tanstack/react-query";

export function JobDescriptionsPanel() {
  const { colors } = useTheme();
  const { jobDescriptions, setJobDescriptions, currentJDId, setCurrentJD } = useATSStore();
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Fetch job descriptions
  const { data: jdsData } = useQuery({
    queryKey: ["/api/jds"],
    enabled: true
  });

  // Update store when data is fetched
  useEffect(() => {
    if (jdsData) {
      setJobDescriptions(jdsData);
    }
  }, [jdsData, setJobDescriptions]);

  const handleSelectJob = (job: any) => {
    setCurrentJD(job.id);
  };

  return (
    <div 
      className="w-96 overflow-y-auto"
      style={{ 
        backgroundColor: colors.background,
        borderLeft: `1px solid ${colors.border}`
      }}
    >
      <div 
        className="p-4"
        style={{ 
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: colors.card
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold" style={{ color: colors.foreground }}>
            Job Descriptions
          </h3>
          <Button
            size="sm"
            onClick={() => setShowUploadModal(true)}
            style={{
              backgroundColor: colors.primary,
              color: colors.primaryForeground
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Job
          </Button>
        </div>
        
        <p className="text-sm" style={{ color: colors.mutedForeground }}>
          Upload multiple job descriptions to generate tailored cover letters
        </p>
      </div>

      <div className="p-4">
        <JobDescriptionsList
          jobDescriptions={jobDescriptions || []}
          onSelectJob={handleSelectJob}
          selectedJobId={currentJDId}
        />
      </div>

      {/* Job Upload Modal */}
      <JobUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
      />
    </div>
  );
}
