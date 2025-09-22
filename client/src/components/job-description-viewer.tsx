import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Briefcase } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

interface JobDescriptionViewerProps {
  job: {
    id: string;
    title: string;
    company: string;
    rawText?: string;
    parsed?: any;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobDescriptionViewer({ job, open, onOpenChange }: JobDescriptionViewerProps) {
  const { colors } = useTheme();

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-3xl max-h-[80vh]" 
        style={{ 
          backgroundColor: colors.card,
          borderColor: colors.border 
        }}
      >
        <DialogHeader>
          <div className="flex items-start space-x-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ 
                backgroundColor: colors.primary + '20',
                border: `2px solid ${colors.primary}`
              }}
            >
              <Briefcase className="w-5 h-5" style={{ color: colors.primary }} />
            </div>
            <div>
              <DialogTitle style={{ color: colors.foreground }}>
                {job.title || 'Untitled Position'}
              </DialogTitle>
              <p className="text-sm mt-1" style={{ color: colors.mutedForeground }}>
                {job.company || 'Unknown Company'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          <div className="mb-4">
            <h3 className="font-medium" style={{ color: colors.foreground }}>
              Job Description
            </h3>
          </div>

          <ScrollArea className="h-[60vh] pr-4">
            <div 
              className="whitespace-pre-wrap text-sm"
              style={{ 
                color: colors.foreground,
                backgroundColor: colors.background,
                padding: '16px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                lineHeight: '1.6'
              }}
            >
              {job.rawText || job.parsed?.description || job.parsed?.summary || "No job description text available. Please check if the job description was properly saved."}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
