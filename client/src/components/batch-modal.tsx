import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Wand2, Download, CheckCircle, AlertCircle, Briefcase, Mail } from 'lucide-react';
import { useResumeStore } from '@/store/resume-store';
import { useATSStore } from '@/store/ats-store';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useWebSocket } from '@/lib/websocket';
import { useTheme } from '@/contexts/theme-context';

interface BatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Predefined color schemes for job descriptions (same as JobDescriptionsList)
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

export function BatchModal({ open, onOpenChange }: BatchModalProps) {
  const { resumes, currentResumeId } = useResumeStore();
  const { jobDescriptions } = useATSStore();
  const { toast } = useToast();
  const { colors, isDark } = useTheme();
  
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [selectedJDIds, setSelectedJDIds] = useState<string[]>([]);
  const [tone, setTone] = useState('professional');
  const [wordCount, setWordCount] = useState('250');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'generating' | 'completed' | 'error'>('idle');
  const [results, setResults] = useState<any[]>([]);

  // Function to get job color by index
  const getJobColor = (jdId: string) => {
    const index = jobDescriptions?.findIndex(jd => jd.id === jdId) || 0;
    return colorSchemes[index % colorSchemes.length];
  };

  // Set default resume when modal opens
  useEffect(() => {
    if (open && currentResumeId && !selectedResumeId) {
      setSelectedResumeId(currentResumeId);
    }
  }, [open, currentResumeId, selectedResumeId]);

  // WebSocket connection for batch job progress
  useWebSocket({
    onMessage: (data) => {
      if (data.channel?.startsWith('batch:') && currentJobId && data.channel.includes(currentJobId)) {
        if (data.data.progress !== undefined) {
          setProgress(data.data.progress);
        }
        if (data.data.status === 'completed') {
          setStatus('completed');
          setResults(data.data.results || []);
          toast({
            title: "Cover letters generated!",
            description: `Successfully generated ${data.data.results?.filter((r: any) => r.success).length || 0} cover letters.`,
          });
        }
        if (data.data.status === 'error') {
          setStatus('error');
          toast({
            title: "Generation failed",
            description: "Failed to generate cover letters. Please try again.",
            variant: "destructive"
          });
        }
      }
    }
  });

  const batchMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/covers/batch', data);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentJobId(data.jobId);
      setStatus('generating');
      setProgress(0);
    },
    onError: (error) => {
      toast({
        title: "Failed to start generation",
        description: "Could not start batch cover letter generation. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleJDToggle = (jdId: string, checked: boolean) => {
    setSelectedJDIds(prev => 
      checked 
        ? [...prev, jdId]
        : prev.filter(id => id !== jdId)
    );
  };

  const handleSelectAll = () => {
    const allIds = jobDescriptions?.map(jd => jd.id) || [];
    setSelectedJDIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedJDIds([]);
  };

  const handleGenerate = () => {
    if (!selectedResumeId || selectedJDIds.length === 0) {
      toast({
        title: "Missing selection",
        description: "Please select a resume and at least one job description.",
        variant: "destructive"
      });
      return;
    }

    batchMutation.mutate({
      resumeId: selectedResumeId,
      jdIds: selectedJDIds,
      tone,
      wordCount: parseInt(wordCount)
    });
  };

  const handleClose = () => {
    if (status === 'generating') {
      toast({
        title: "Generation in progress",
        description: "Cover letters are still being generated. You can check progress later.",
      });
    }
    
    // Reset state
    setSelectedJDIds([]);
    setProgress(0);
    setStatus('idle');
    setResults([]);
    setCurrentJobId(null);
    
    onOpenChange(false);
  };

  const estimatedTime = selectedJDIds.length * 30; // 30 seconds per letter

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Generate Cover Letters</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full max-h-[calc(90vh-120px)] overflow-hidden">
          {status === 'generating' ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 p-8">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <Wand2 className="w-8 h-8 text-primary-600 animate-pulse" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Generating Cover Letters
                </h3>
                <p className="text-gray-600 mb-4">
                  AI is crafting personalized cover letters for each position...
                </p>
                <div className="w-80 mx-auto">
                  <Progress value={progress} className="mb-2" />
                  <p className="text-sm text-gray-500">{progress}% complete</p>
                </div>
              </div>
            </div>
          ) : status === 'completed' ? (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="text-center mb-6">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Cover Letters Generated!
                </h3>
                <p className="text-gray-600">
                  Successfully generated {results.filter(r => r.success).length} cover letters
                </p>
              </div>
              
              <div className="space-y-3">
                {results.map((result, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                        <div>
                          <h4 className="font-medium text-gray-900">{result.jdTitle}</h4>
                          {result.success ? (
                            <p className="text-sm text-green-600">Generated successfully</p>
                          ) : (
                            <p className="text-sm text-red-600">{result.error}</p>
                          )}
                        </div>
                      </div>
                      {result.success && (
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6">
              {/* Settings */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base Resume</label>
                  <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select resume" />
                    </SelectTrigger>
                    <SelectContent>
                      {resumes?.map((resume) => (
                        <SelectItem key={resume.id} value={resume.id}>
                          {resume.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Length</label>
                  <Select value={wordCount} onValueChange={setWordCount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="250">250 words</SelectItem>
                      <SelectItem value="350">350 words</SelectItem>
                      <SelectItem value="500">500 words</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Job Selection */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Select Job Descriptions</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>{selectedJDIds.length} of {jobDescriptions?.length || 0} selected</span>
                    <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                  {jobDescriptions?.map((jd) => (
                    <Card key={jd.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={selectedJDIds.includes(jd.id)}
                          onCheckedChange={(checked) => handleJDToggle(jd.id, checked as boolean)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {jd.title}
                            </h4>
                            <span className="text-xs text-gray-500 ml-2">
                              {jd.company}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {jd.parsed?.summary || 'Job description parsed successfully'}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Parsed
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-500">Ready</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            {status === 'idle' && (
              <>
                <div className="text-sm text-gray-600">
                  Estimated time: <span className="font-medium">{Math.ceil(estimatedTime / 60)} minutes</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Button variant="ghost" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleGenerate}
                    disabled={!selectedResumeId || selectedJDIds.length === 0 || batchMutation.isPending}
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate All
                  </Button>
                </div>
              </>
            )}
            
            {status === 'generating' && (
              <>
                <div className="text-sm text-gray-600">
                  Generating {selectedJDIds.length} cover letters...
                </div>
                <Button variant="ghost" onClick={handleClose}>
                  Background
                </Button>
              </>
            )}
            
            {status === 'completed' && (
              <>
                <div className="text-sm text-gray-600">
                  Generation complete
                </div>
                <div className="flex items-center space-x-3">
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download All
                  </Button>
                  <Button onClick={handleClose}>
                    Done
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
