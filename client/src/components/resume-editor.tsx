import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Eye, FileText, Plus, X, Linkedin, Loader2, Link, Trash2, PenTool } from "lucide-react";
import { useResumeStore } from "@/store/resume-store";
import { useATSStore } from "@/store/ats-store";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/contexts/theme-context";
import { ResumePreview } from "@/components/resume-preview";
import { mockResumeData } from "@/data/mock-resume";

export function ResumeEditor() {
  const { currentResumeId, setCurrentResumeData, setCurrentResume } = useResumeStore();
  const { debouncedTriggerATSScore } = useATSStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  // Fetch current resume
  const { data: resume, isLoading } = useQuery({
    queryKey: ["/api/resumes", currentResumeId],
    enabled: !!currentResumeId
  });

  const [resumeData, setResumeData] = useState<any>(null);
  const [entryMode, setEntryMode] = useState<'manual' | 'linkedin'>('manual'); // Radio button state
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [isImporting, setIsImporting] = useState(false); // Flag to disable auto-save during import
  const [showPreview, setShowPreview] = useState(false);
  const [optimizedResumeData, setOptimizedResumeData] = useState<any>(null);
  const [hasImportedFromLinkedIn, setHasImportedFromLinkedIn] = useState(false);

  useEffect(() => {
    if (resume?.json) {
      // Ensure data structure is properly initialized
      const data = {
        personalInfo: resume.json.personalInfo || {},
        summary: resume.json.summary || "",
        experience: resume.json.experience || [],
        skills: resume.json.skills || {},
        education: resume.json.education || [],
        ...resume.json
      };
      setResumeData(data);
      setCurrentResumeData(data);
    } else if (entryMode === 'manual' && !resumeData && !isLoading) {
      // Initialize empty structure for manual entry when no resume exists
      const emptyData = {
        personalInfo: {
          name: "",
          email: "",
          phone: "",
          location: "",
          linkedin: "",
          github: "",
          website: ""
        },
        summary: "",
        experience: [],
        skills: {},
        education: [],
        projects: [],
        certifications: [],
        achievements: []
      };
      setResumeData(emptyData);
      setCurrentResumeData(emptyData);
    }
  }, [resume, setCurrentResumeData, entryMode, isLoading]);

  // Auto-save mutation
  const saveResumeMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!currentResumeId) throw new Error("No resume selected");
      const response = await apiRequest("PATCH", `/api/resumes/${currentResumeId}`, { json: data });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes", currentResumeId] });
      setCurrentResumeData(resumeData);
      debouncedTriggerATSScore();
    }
  });

  // Create resume mutation (for LinkedIn imports when no resume exists)
  const createResumeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/resumes", { 
        title: `${data.personalInfo?.name || 'LinkedIn'} Resume`,
        json: data 
      });
      return await response.json();
    },
    onSuccess: (newResume) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      setCurrentResume(newResume.id);
      debouncedTriggerATSScore();
    }
  });

  // Auto-save with debouncing
  useEffect(() => {
    if (!resumeData || !currentResumeId || isImporting) return;
    
    const timeout = setTimeout(() => {
      // Only save if we have valid data and resume is loaded and not importing
      if (resumeData && currentResumeId && !isLoading && !isImporting) {
        saveResumeMutation.mutate(resumeData);
      }
    }, 3000); // Further increased delay to reduce frequency

    return () => clearTimeout(timeout);
  }, [resumeData, currentResumeId, isLoading]);

  const updateField = (path: string, value: any) => {
    setResumeData((prev: any) => {
      if (!prev) {
        // Initialize with default structure if prev is null
        prev = {
          personalInfo: {},
          summary: "",
          experience: [],
          skills: {},
          education: []
        };
      }
      
      const keys = path.split('.');
      const updated = JSON.parse(JSON.stringify(prev)); // Deep clone to avoid mutation
      let current = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          // Initialize as array or object based on context
          current[keys[i]] = isNaN(Number(keys[i + 1])) ? {} : [];
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const addExperience = () => {
    const newExp = {
      title: "",
      company: "",
      startDate: "",
      endDate: "",
      bullets: [""]
    };
    setResumeData((prev: any) => ({
      ...prev,
      experience: [...(prev?.experience || []), newExp]
    }));
  };

  const addBullet = (expIndex: number) => {
    setResumeData((prev: any) => {
      const updated = { ...prev };
      updated.experience[expIndex].bullets.push("");
      return updated;
    });
  };

  const removeBullet = (expIndex: number, bulletIndex: number) => {
    setResumeData((prev: any) => {
      const updated = { ...prev };
      updated.experience[expIndex].bullets.splice(bulletIndex, 1);
      return updated;
    });
  };

  const removeExperience = (expIndex: number) => {
    setResumeData((prev: any) => {
      const updated = { ...prev };
      const newExperience = [...updated.experience];
      newExperience.splice(expIndex, 1);
      return {
        ...updated,
        experience: newExperience
      };
    });
  };

  const addSkill = (category: string, skill: string) => {
    if (!skill.trim()) return;
    setResumeData((prev: any) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: [...(prev.skills?.[category] || []), skill.trim()]
      }
    }));
  };

  const removeSkill = (category: string, index: number) => {
    setResumeData((prev: any) => {
      const updated = { ...prev };
      updated.skills[category].splice(index, 1);
      return updated;
    });
  };

  // LinkedIn scraping mutation
  const scrapeLinkedInMutation = useMutation({
    mutationFn: async (url: string) => {
      setIsScraping(true);
      setIsImporting(true);
      const response = await apiRequest("POST", "/api/linkedin/scrape", { url });
      return await response.json();
    },
    onSuccess: (response) => {
      setIsScraping(false);
      if (response?.data || response) {
        // Handle both wrapped and unwrapped responses
        const data = response.data || response;
        
        // Ensure data has the required structure with defaults for required fields
        const structuredData = {
          personalInfo: {
            name: data.personalInfo?.name || "Your Name",
            email: data.personalInfo?.email || "",
            phone: data.personalInfo?.phone || "",
            location: data.personalInfo?.location || "",
            linkedin: data.personalInfo?.linkedin || "",
            github: data.personalInfo?.github || "",
            website: data.personalInfo?.website || ""
          },
          summary: data.summary || "",
          experience: data.experience || [],
          skills: data.skills || {},
          education: data.education || [],
          projects: data.projects || [],
          certifications: data.certifications || [],
          achievements: data.achievements || []
        };
        
        setResumeData(structuredData);
        setCurrentResumeData(structuredData);
        setHasImportedFromLinkedIn(true);
        
        // If no current resume exists, create a new one with the LinkedIn data
        if (!currentResumeId) {
          createResumeMutation.mutate(structuredData);
        } else {
          // If current resume exists, update it with LinkedIn data
          saveResumeMutation.mutate(structuredData);
        }
        
        // Auto-show preview after successful import
        setTimeout(() => {
          setShowPreview(true);
          setIsImporting(false); // Clear importing flag after preview
        }, 500);
        
        toast({
          title: "LinkedIn Profile Imported Successfully! ✅",
          description: "Your profile has been imported. Review it in the preview and export as PDF when ready.",
        });
      }
    },
    onError: (error: any) => {
      setIsScraping(false);
      setIsImporting(false); // Clear importing flag on error
      const errorMessage = error?.message || 
                          "Failed to import LinkedIn profile. Please check the URL and try again.";
      
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleLinkedInImport = () => {
    if (!linkedInUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a LinkedIn profile URL.",
        variant: "destructive",
      });
      return;
    }

    // Basic LinkedIn URL validation
    if (!linkedInUrl.includes("linkedin.com/in/")) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid LinkedIn profile URL.",
        variant: "destructive",
      });
      return;
    }

    scrapeLinkedInMutation.mutate(linkedInUrl);
  };


  // Preview and Export handlers
  const handlePreview = () => {
    const dataToPreview = optimizedResumeData || resumeData;
    
    // For LinkedIn mode, only use mock data if truly no data exists
    // For manual mode, always use the current data (even if partially empty)
    if (entryMode === 'linkedin' && (!dataToPreview || !dataToPreview.personalInfo || 
        ((!dataToPreview.personalInfo?.name || dataToPreview.personalInfo?.name === "Your Name") && 
         (!dataToPreview.experience || dataToPreview.experience.length === 0)))) {
      // If no LinkedIn data, use mock data
      setOptimizedResumeData(mockResumeData);
    } else if (entryMode === 'manual' && !dataToPreview) {
      // For manual mode, create empty structure if no data
      setOptimizedResumeData({
        personalInfo: {
          name: "Your Name",
          email: "",
          phone: "",
          location: "",
          linkedin: "",
          github: "",
          website: ""
        },
        summary: "",
        experience: [],
        skills: {},
        education: [],
        projects: [],
        certifications: [],
        achievements: []
      });
    }
    setShowPreview(true);
  };

  const handleExport = () => {
    // Use existing data for export
    const dataToPreview = optimizedResumeData || resumeData;
    if (!dataToPreview || (!dataToPreview.personalInfo?.name && !dataToPreview.experience?.length)) {
      setOptimizedResumeData(mockResumeData);
    }
    setShowPreview(true);
  };

  if (isLoading || !resumeData) {
    return (
      <div 
        className="flex-1 flex items-center justify-center"
        style={{ backgroundColor: colors.card }}
      >
        <div className="text-center">
          <div 
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: colors.primary, borderTopColor: 'transparent' }}
          ></div>
          <p style={{ color: colors.mutedForeground }}>Loading resume...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1" style={{ backgroundColor: colors.card }}>
      <div 
        className="h-16 flex items-center justify-between px-6"
        style={{ borderBottom: `1px solid ${colors.border}` }}
      >
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold" style={{ color: colors.foreground }}>
            {resume?.title || "Resume"}
          </h2>
          <Badge 
            variant="outline" 
            style={{ 
              backgroundColor: colors.secondary + '20',
              color: colors.secondary,
              borderColor: colors.secondary
            }}
          >
            {saveResumeMutation.isPending ? "Saving..." : "Saved"}
          </Badge>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handlePreview}
            style={{ color: colors.foreground }}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button 
            size="sm"
            onClick={handleExport}
            style={{ 
              backgroundColor: colors.primary,
              color: colors.primaryForeground
            }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Entry Mode Selection */}
        <Card 
          className="p-6"
          style={{ 
            backgroundColor: colors.accent + '10',
            borderColor: colors.accent,
            borderStyle: 'solid',
            borderWidth: '2px'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.foreground }}>
            Choose Resume Entry Method
          </h3>
          
          <RadioGroup 
            value={entryMode} 
            onValueChange={(value) => setEntryMode(value as 'manual' | 'linkedin')}
            className="space-y-4"
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="manual" id="manual-entry" />
              <div className="flex-1">
                <Label htmlFor="manual-entry" className="flex items-center cursor-pointer">
                  <PenTool className="w-4 h-4 mr-2" style={{ color: colors.primary }} />
                  <span className="font-medium" style={{ color: colors.foreground }}>Manual Entry</span>
                </Label>
                <p className="text-sm mt-1" style={{ color: colors.mutedForeground }}>
                  Create your resume from scratch by filling in the fields below
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="linkedin" id="linkedin-entry" />
              <div className="flex-1">
                <Label htmlFor="linkedin-entry" className="flex items-center cursor-pointer">
                  <Linkedin className="w-4 h-4 mr-2" style={{ color: colors.primary }} />
                  <span className="font-medium" style={{ color: colors.foreground }}>Import from LinkedIn</span>
                  {hasImportedFromLinkedIn && (
                    <Badge 
                      className="ml-2"
                      variant="outline"
                      style={{ 
                        backgroundColor: colors.secondary + '20',
                        color: colors.secondary,
                        borderColor: colors.secondary
                      }}
                    >
                      ✓ Imported
                    </Badge>
                  )}
                </Label>
                <p className="text-sm mt-1" style={{ color: colors.mutedForeground }}>
                  Automatically import your professional data from LinkedIn
                </p>
              </div>
            </div>
          </RadioGroup>
          
          {/* LinkedIn Import Section - Only show when LinkedIn mode is selected */}
          {entryMode === 'linkedin' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Link className="w-5 h-5 mt-2" style={{ color: colors.mutedForeground }} />
                  <div className="flex-1">
                    <Input
                      type="url"
                      placeholder="https://www.linkedin.com/in/your-profile"
                      value={linkedInUrl}
                      onChange={(e) => setLinkedInUrl(e.target.value)}
                      disabled={isScraping}
                      style={{ 
                        backgroundColor: colors.background,
                        color: colors.foreground,
                        borderColor: colors.border
                      }}
                    />
                    <p className="text-xs mt-1" style={{ color: colors.mutedForeground }}>
                      Enter your LinkedIn profile URL to automatically import your resume data
                    </p>
                  </div>
                </div>
                
                <Button
                  onClick={handleLinkedInImport}
                  disabled={isScraping || !linkedInUrl.trim()}
                  className="w-full"
                  style={{ 
                    backgroundColor: colors.primary,
                    color: colors.primaryForeground
                  }}
                >
                  {isScraping ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing Profile...
                    </>
                  ) : (
                    <>
                      <Linkedin className="w-4 h-4 mr-2" />
                      Import from LinkedIn
                    </>
                  )}
                </Button>
                
                <div 
                  className="text-sm p-3 rounded-lg"
                  style={{ 
                    backgroundColor: colors.muted,
                    color: colors.mutedForeground
                  }}
                >
                  <p className="font-medium mb-1">What happens when you import:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Your LinkedIn profile data will be scraped and populated in all fields</li>
                    <li>The preview will automatically open showing your formatted resume</li>
                    <li>You can then export it as a PDF directly from the preview</li>
                    <li>All manual entries will be replaced with LinkedIn data</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </Card>

        {/* Personal Information */}
        <Card 
          className="p-6"
          style={{ 
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.cardForeground,
            opacity: entryMode === 'linkedin' ? 0.5 : 1,
            pointerEvents: entryMode === 'linkedin' ? 'none' : 'auto'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.foreground }}>
            Personal Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.foreground }}>
                Full Name
              </label>
              <Input
                value={resumeData.personalInfo?.name || ""}
                onChange={(e) => updateField("personalInfo.name", e.target.value)}
                placeholder="John Smith"
                style={{ 
                  backgroundColor: colors.background,
                  color: colors.foreground,
                  borderColor: colors.border
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.foreground }}>
                Email
              </label>
              <Input
                type="email"
                value={resumeData.personalInfo?.email || ""}
                onChange={(e) => updateField("personalInfo.email", e.target.value)}
                placeholder="john.smith@email.com"
                style={{ 
                  backgroundColor: colors.background,
                  color: colors.foreground,
                  borderColor: colors.border
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.foreground }}>
                Phone
              </label>
              <Input
                type="tel"
                value={resumeData.personalInfo?.phone || ""}
                onChange={(e) => updateField("personalInfo.phone", e.target.value)}
                placeholder="+1 (555) 123-4567"
                style={{ 
                  backgroundColor: colors.background,
                  color: colors.foreground,
                  borderColor: colors.border
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.foreground }}>
                Location
              </label>
              <Input
                value={resumeData.personalInfo?.location || ""}
                onChange={(e) => updateField("personalInfo.location", e.target.value)}
                placeholder="San Francisco, CA"
                style={{ 
                  backgroundColor: colors.background,
                  color: colors.foreground,
                  borderColor: colors.border
                }}
              />
            </div>
          </div>
        </Card>

        {/* Professional Summary */}
        <Card 
          className="p-6"
          style={{ 
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: entryMode === 'linkedin' ? 0.5 : 1,
            pointerEvents: entryMode === 'linkedin' ? 'none' : 'auto'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.foreground }}>
            Professional Summary
          </h3>
          <Textarea
            className="min-h-[100px] resize-none"
            value={resumeData.summary || ""}
            onChange={(e) => updateField("summary", e.target.value)}
            placeholder="Experienced software engineer with 8+ years developing scalable web applications..."
            style={{ 
              backgroundColor: colors.background,
              color: colors.foreground,
              borderColor: colors.border
            }}
          />
          <div className="mt-2 flex items-center text-sm" style={{ color: colors.mutedForeground }}>
            <span>💡 Add quantified achievements to improve ATS score</span>
          </div>
        </Card>

        {/* Experience */}
        <Card 
          className="p-6"
          style={{ 
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: entryMode === 'linkedin' ? 0.5 : 1,
            pointerEvents: entryMode === 'linkedin' ? 'none' : 'auto'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: colors.foreground }}>
              Work Experience
            </h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addExperience}
              style={{ 
                borderColor: colors.border,
                color: colors.foreground
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Position
            </Button>
          </div>

          <div className="space-y-6">
            {(resumeData.experience || []).map((exp: any, expIndex: number) => (
              <div 
                key={expIndex} 
                className="rounded-lg p-4"
                style={{ 
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.background
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-sm font-semibold" style={{ color: colors.foreground }}>
                    Position {expIndex + 1}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExperience(expIndex)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete this position"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.foreground }}>
                      Job Title
                    </label>
                    <Input
                      value={exp.title || ""}
                      onChange={(e) => updateField(`experience.${expIndex}.title`, e.target.value)}
                      placeholder="Senior Software Engineer"
                      style={{ 
                        backgroundColor: colors.card,
                        color: colors.foreground,
                        borderColor: colors.border
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.foreground }}>
                      Company
                    </label>
                    <Input
                      value={exp.company || ""}
                      onChange={(e) => updateField(`experience.${expIndex}.company`, e.target.value)}
                      placeholder="TechCorp Inc."
                      style={{ 
                        backgroundColor: colors.card,
                        color: colors.foreground,
                        borderColor: colors.border
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.foreground }}>
                      Start Date
                    </label>
                    <Input
                      value={exp.startDate || ""}
                      onChange={(e) => updateField(`experience.${expIndex}.startDate`, e.target.value)}
                      placeholder="Jan 2020"
                      style={{ 
                        backgroundColor: colors.card,
                        color: colors.foreground,
                        borderColor: colors.border
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.foreground }}>
                      End Date
                    </label>
                    <Input
                      value={exp.endDate || ""}
                      onChange={(e) => updateField(`experience.${expIndex}.endDate`, e.target.value)}
                      placeholder="Present"
                      style={{ 
                        backgroundColor: colors.card,
                        color: colors.foreground,
                        borderColor: colors.border
                      }}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.foreground }}>
                    Achievements & Responsibilities
                  </label>
                  <div className="space-y-3">
                    {(exp.bullets || []).map((bullet: string, bulletIndex: number) => (
                      <div key={bulletIndex} className="flex items-start space-x-2">
                        <span className="mt-2" style={{ color: colors.mutedForeground }}>•</span>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Input
                              value={bullet}
                              onChange={(e) => updateField(`experience.${expIndex}.bullets.${bulletIndex}`, e.target.value)}
                              placeholder="Led development of microservices architecture serving 2M+ daily active users"
                              style={{ 
                                backgroundColor: colors.card,
                                color: colors.foreground,
                                borderColor: colors.border
                              }}
                            />
                            {bulletIndex > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeBullet(expIndex, bulletIndex)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <div className="mt-1 flex items-center space-x-2">
                            {/\d+[%$]?|\$\d+|\d+\+?\s*(users?|customers?|projects?|team|people|million|thousand|k\b)/i.test(bullet) && (
                              <Badge 
                                variant="outline" 
                                style={{ 
                                  backgroundColor: colors.secondary + '20',
                                  color: colors.secondary,
                                  borderColor: colors.secondary
                                }}
                              >
                                📊 Quantified
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    style={{ color: colors.primary }}
                    onClick={() => addBullet(expIndex)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Achievement
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Skills */}
        <Card 
          className="p-6"
          style={{ 
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: entryMode === 'linkedin' ? 0.5 : 1,
            pointerEvents: entryMode === 'linkedin' ? 'none' : 'auto'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.foreground }}>
            Technical Skills
          </h3>
          <div className="space-y-4">
            {Object.entries(resumeData.skills || {}).map(([category, skills]) => (
              <SkillCategory
                key={category}
                category={category}
                skills={skills as string[]}
                onAddSkill={(skill) => addSkill(category, skill)}
                onRemoveSkill={(index) => removeSkill(category, index)}
                colors={colors}
              />
            ))}
            
            {/* Always show default skill categories in manual mode */}
            {entryMode === 'manual' && (
              <>
                {/* Show programming category */}
                {!resumeData.skills?.programming && (
                  <SkillCategory
                    category="programming"
                    skills={[]}
                    onAddSkill={(skill) => addSkill("programming", skill)}
                    onRemoveSkill={(index) => removeSkill("programming", index)}
                    colors={colors}
                  />
                )}
                {/* Show frameworks category */}
                {!resumeData.skills?.frameworks && (
                  <SkillCategory
                    category="frameworks"
                    skills={[]}
                    onAddSkill={(skill) => addSkill("frameworks", skill)}
                    onRemoveSkill={(index) => removeSkill("frameworks", index)}
                    colors={colors}
                  />
                )}
                {/* Show tools category */}
                {!resumeData.skills?.tools && (
                  <SkillCategory
                    category="tools"
                    skills={[]}
                    onAddSkill={(skill) => addSkill("tools", skill)}
                    onRemoveSkill={(index) => removeSkill("tools", index)}
                    colors={colors}
                  />
                )}
                {/* Show soft skills category */}
                {!resumeData.skills?.soft && (
                  <SkillCategory
                    category="soft"
                    skills={[]}
                    onAddSkill={(skill) => addSkill("soft", skill)}
                    onRemoveSkill={(index) => removeSkill("soft", index)}
                    colors={colors}
                  />
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Resume Preview Modal */}
      {showPreview && (
        <ResumePreview
          resumeData={optimizedResumeData || resumeData || mockResumeData}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

function SkillCategory({ 
  category, 
  skills, 
  onAddSkill, 
  onRemoveSkill,
  colors
}: { 
  category: string; 
  skills: string[]; 
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (index: number) => void;
  colors: any;
}) {
  const [newSkill, setNewSkill] = useState("");
  
  const categoryLabels: Record<string, string> = {
    programming: "Programming Languages",
    frameworks: "Frameworks & Libraries", 
    tools: "Tools & Technologies",
    other: "Other Skills"
  };

  const handleAddSkill = () => {
    if (newSkill.trim()) {
      onAddSkill(newSkill);
      setNewSkill("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSkill();
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: colors.foreground }}>
        {categoryLabels[category] || category}
      </label>
      <div className="flex flex-wrap gap-2">
        {skills?.map((skill, index) => (
          <Badge 
            key={index} 
            variant="outline" 
            style={{ 
              backgroundColor: colors.primary + '20',
              color: colors.primary,
              borderColor: colors.primary
            }}
          >
            {skill}
            <button
              className="ml-2"
              style={{ color: colors.primary }}
              onClick={() => onRemoveSkill(index)}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <Input
          className="w-32"
          size="sm"
          placeholder="Add skill..."
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{ 
            backgroundColor: colors.background,
            color: colors.foreground,
            borderColor: colors.border
          }}
        />
      </div>
    </div>
  );
}
