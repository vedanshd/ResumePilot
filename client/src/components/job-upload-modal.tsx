import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CloudUpload, FileText, Plus, CheckCircle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface JobUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobUploadModal({ open, onOpenChange }: JobUploadModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [jobText, setJobText] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [recentlyAdded, setRecentlyAdded] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Text upload mutation
  const textUploadMutation = useMutation({
    mutationFn: async (data: { text: string; title?: string; company?: string }) => {
      const response = await apiRequest('POST', '/api/jds', data);
      return response.json();
    },
    onSuccess: (data) => {
      setRecentlyAdded(prev => [data, ...prev.slice(0, 4)]); // Keep last 5
      setJobText('');
      setCompanyName('');
      setJobTitle('');
      queryClient.invalidateQueries({ queryKey: ['/api/jds'] });
      toast({
        title: "Job description added",
        description: `Successfully parsed "${data.title}" from ${data.company}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: "Failed to parse job description. Please check the format and try again.",
        variant: "destructive"
      });
    }
  });

  // File upload mutation
  const fileUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/jds/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'user-id': 'anonymous'
        }
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setRecentlyAdded(prev => [data, ...prev.slice(0, 4)]);
      queryClient.invalidateQueries({ queryKey: ['/api/jds'] });
      toast({
        title: "File uploaded",
        description: `Successfully parsed "${data.title}" from file`,
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: "Failed to process uploaded file. Please try a different format.",
        variant: "destructive"
      });
    }
  });

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (file.type === 'text/plain' || file.type === 'application/pdf' || file.name.endsWith('.txt')) {
        fileUploadMutation.mutate(file);
      } else {
        toast({
          title: "Unsupported file type",
          description: "Please upload PDF or TXT files only.",
          variant: "destructive"
        });
      }
    });
  }, [fileUploadMutation, toast]);

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.txt,.docx';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      files.forEach(file => fileUploadMutation.mutate(file));
    };
    input.click();
  };

  const handleAddJobText = () => {
    if (!jobText.trim()) {
      toast({
        title: "Missing job description",
        description: "Please paste a job description before adding.",
        variant: "destructive"
      });
      return;
    }

    textUploadMutation.mutate({
      text: jobText,
      title: jobTitle || undefined,
      company: companyName || undefined
    });
  };

  const handleClose = () => {
    setJobText('');
    setCompanyName('');
    setJobTitle('');
    setRecentlyAdded([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Upload Job Descriptions</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Drag and Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-primary-400 bg-primary-50' 
                : 'border-gray-300 hover:border-primary-400'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <CloudUpload className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop job descriptions here
            </h3>
            <p className="text-gray-600 mb-4">
              Support for PDF, TXT, or DOCX files (max 20 files)
            </p>
            <Button 
              variant="outline" 
              onClick={handleFileSelect}
              disabled={fileUploadMutation.isPending}
            >
              <FileText className="w-4 h-4 mr-2" />
              {fileUploadMutation.isPending ? 'Uploading...' : 'Choose Files'}
            </Button>
          </div>

          {/* Paste Text Area */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Or paste job description text
            </h4>
            <Textarea
              className="min-h-[120px] resize-none"
              placeholder="Paste the job description here..."
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-2">
                <Input
                  className="w-40"
                  placeholder="Company name (optional)"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
                <Input
                  className="w-40"
                  placeholder="Job title (optional)"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
              <Button 
                size="sm" 
                onClick={handleAddJobText}
                disabled={!jobText.trim() || textUploadMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-1" />
                {textUploadMutation.isPending ? 'Adding...' : 'Add Job'}
              </Button>
            </div>
          </div>

          {/* Recently Added */}
          {recentlyAdded.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Recently Added</h4>
              <div className="space-y-2">
                {recentlyAdded.map((jd, index) => (
                  <Card key={index} className="p-3 bg-green-50 border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {jd.title} @ {jd.company}
                          </div>
                          <div className="text-xs text-gray-500">Parsed successfully</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ready
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button variant="ghost" onClick={handleClose}>
            Close
          </Button>
          <Button variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            View All Jobs
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
