import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import jsPDF from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  FileText, 
  Copy, 
  Download, 
  Wand2, 
  Loader2, 
  CheckCircle,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/theme-context";
import { CoverLetter } from "@/services/cover-letter-service";
import { coverLetterService } from "@/services/cover-letter-service";
import { apiRequest } from "@/lib/queryClient";

interface CoverLetterViewerProps {
  coverLetter: {
    id: string;
    content?: string;
    contentMd?: string;
    resumeId: string;
    jdId: string;
    tone?: string;
    length?: string;
    createdAt?: string;
  } | null;
  jobTitle?: string;
  company?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImprove?: () => void;
}

export function CoverLetterViewer({ 
  coverLetter, 
  jobTitle, 
  company, 
  open, 
  onOpenChange,
  onImprove 
}: CoverLetterViewerProps) {
  const { colors } = useTheme();
  const { toast } = useToast();
  const [isImproving, setIsImproving] = useState(false);
  const [improvedContent, setImprovedContent] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Improve cover letter mutation
  const improveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/covers/${id}/improve`);
      return response.json();
    },
    onSuccess: (response) => {
      setImprovedContent(response.content);
      setSuggestions(response.suggestions || []);
      setIsImproving(false);
      toast({
        title: "Cover Letter Improved",
        description: "Your cover letter has been enhanced with AI suggestions.",
      });
    },
    onError: () => {
      setIsImproving(false);
      toast({
        title: "Improvement Failed",
        description: "Unable to improve the cover letter at this time.",
        variant: "destructive",
      });
    }
  });

  // PDF export mutation
  const exportPDFMutation = useMutation({
    mutationFn: async (coverId: string) => {
      const response = await coverLetterService.exportCoverLetterPDF(coverId);
      return response;
    },
    onSuccess: (response) => {
      try {
        // Convert base64 to binary data properly
        const binaryString = atob(response.document);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create PDF blob and download
        const pdfBlob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.filename || `cover-letter-${company || 'document'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Exported to PDF",
          description: "Cover letter has been downloaded.",
        });
      } catch (error) {
        console.error('PDF download error:', error);
        generateClientSidePDF();
      }
    },
    onError: () => {
      generateClientSidePDF();
    }
  });

  const generateClientSidePDF = () => {
    try {
      const doc = new jsPDF();
      const lines = doc.splitTextToSize(displayContent, 170);
      doc.text(lines, 20, 20);
      doc.save(`cover-letter-${company || 'document'}.pdf`);
      
      toast({
        title: "Exported to PDF",
        description: "Cover letter has been exported as a PDF (fallback mode).",
      });
    } catch (error) {
      console.error('Client-side PDF generation error:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF.",
        variant: "destructive",
      });
    }
  };

  if (!coverLetter) return null;

  const displayContent = improvedContent || coverLetter.content || coverLetter.contentMd || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent);
    toast({
      title: "Copied to Clipboard",
      description: "Cover letter has been copied.",
    });
  };

  const handleDownload = () => {
    exportPDFMutation.mutate(coverLetter.id);
  };

  const handleImprove = () => {
    setIsImproving(true);
    improveMutation.mutate(coverLetter.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] w-full flex flex-col" 
        style={{ 
          backgroundColor: colors.card,
          borderColor: colors.border 
        }}
      >
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ 
                  backgroundColor: colors.primary + '20',
                  border: `2px solid ${colors.primary}`
                }}
              >
                <FileText className="w-5 h-5" style={{ color: colors.primary }} />
              </div>
              <div>
                <DialogTitle style={{ color: colors.foreground }}>
                  Cover Letter for {jobTitle || 'Position'}
                </DialogTitle>
                <p className="text-sm mt-1" style={{ color: colors.mutedForeground }}>
                  {company || 'Company'} • Generated {new Date(coverLetter.createdAt || Date.now()).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {coverLetter.tone && (
                    <Badge 
                      variant="outline"
                      style={{
                        backgroundColor: colors.secondary + '20',
                        color: colors.secondary,
                        borderColor: colors.secondary
                      }}
                    >
                      {coverLetter.tone}
                    </Badge>
                  )}
                  {coverLetter.length && (
                    <Badge 
                      variant="outline"
                      style={{
                        backgroundColor: colors.accent + '20',
                        color: colors.accent,
                        borderColor: colors.accent
                      }}
                    >
                      {coverLetter.length} length
                    </Badge>
                  )}
                  {improvedContent && (
                    <Badge 
                      variant="outline"
                      style={{
                        backgroundColor: colors.secondary + '20',
                        color: colors.secondary,
                        borderColor: colors.secondary
                      }}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Improved
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 flex-1 flex flex-col min-h-0">
          {/* Action buttons */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                style={{
                  borderColor: colors.border,
                  color: colors.foreground
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={exportPDFMutation.isPending}
                style={{
                  borderColor: colors.border,
                  color: colors.foreground
                }}
              >
                {exportPDFMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <Card 
              className="p-4 mb-4 flex-shrink-0"
              style={{ 
                backgroundColor: colors.accent + '10',
                borderColor: colors.accent
              }}
            >
              <div className="flex items-start space-x-2">
                <Sparkles className="w-5 h-5 mt-0.5" style={{ color: colors.accent }} />
                <div className="flex-1">
                  <h4 className="font-medium mb-2" style={{ color: colors.foreground }}>
                    AI Suggestions
                  </h4>
                  <ul className="space-y-1">
                    {suggestions.map((suggestion, index) => (
                      <li 
                        key={index} 
                        className="text-sm flex items-start"
                        style={{ color: colors.mutedForeground }}
                      >
                        <span className="mr-2">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Cover letter content */}
          <ScrollArea className="flex-1 min-h-0 pr-4">
            <div 
              className="whitespace-pre-wrap text-sm font-mono leading-relaxed"
              style={{ color: colors.foreground }}
            >
              {displayContent}
            </div>
          </ScrollArea>

          {/* Word count */}
          <div 
            className="mt-4 text-xs text-right flex-shrink-0"
            style={{ color: colors.mutedForeground }}
          >
            {displayContent.split(' ').filter(word => word.length > 0).length} words
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}