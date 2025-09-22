import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Download, X, Printer, Mail, Phone, MapPin, Linkedin, Github, Globe, Activity, TrendingUp } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { useATSStore } from "@/store/ats-store";
import { useResumeStore } from "@/store/resume-store";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./resume-preview.css";

interface ResumePreviewProps {
  resumeData: any;
  onClose: () => void;
}

export function ResumePreview({ resumeData, onClose }: ResumePreviewProps) {
  const { colors, isDark } = useTheme();
  const resumeRef = useRef<HTMLDivElement>(null);
  const { atsScore, isScoring, triggerATSScore, currentJDId, jobDescriptions } = useATSStore();
  const { currentResumeId } = useResumeStore();
  const [showATSPanel, setShowATSPanel] = useState(true);

  // Trigger ATS score calculation when preview opens
  useEffect(() => {
    if (currentResumeId && currentJDId) {
      triggerATSScore();
    }
  }, [currentResumeId, currentJDId]);

  const handleDownloadPDF = async () => {
    if (!resumeRef.current) return;

    try {
      // Create canvas from the resume element
      const canvas = await html2canvas(resumeRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });

      // Convert to PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download the PDF
      pdf.save(`${resumeData.personalInfo?.name || "resume"}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return colors.secondary;
    if (score >= 60) return colors.accent;
    return colors.destructive;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Improvement";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full h-[90vh] bg-white rounded-lg shadow-2xl flex">
        {/* Main Preview Container */}
        <div className="flex-1 flex flex-col" style={{ maxWidth: showATSPanel && currentJDId ? 'calc(100% - 320px)' : '100%' }}>
          {/* Header */}
          <div 
            className="flex items-center justify-between p-4 border-b"
            style={{ borderColor: colors.border }}
          >
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold" style={{ color: colors.foreground }}>
                Resume Preview
              </h2>
              {currentJDId && atsScore && (
                <Badge 
                  variant="outline"
                  style={{ 
                    backgroundColor: getScoreColor(atsScore.overall) + '20',
                    color: getScoreColor(atsScore.overall),
                    borderColor: getScoreColor(atsScore.overall)
                  }}
                >
                  ATS Score: {atsScore.overall}/100
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="hidden md:flex"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPDF}
              style={{
                backgroundColor: colors.primary,
                color: colors.primaryForeground
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
            {currentJDId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowATSPanel(!showATSPanel)}
              >
                <Activity className="w-4 h-4 mr-2" />
                {showATSPanel ? 'Hide' : 'Show'} ATS
              </Button>
            )}
          </div>
          </div>

        {/* Resume Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
          <div 
            ref={resumeRef}
            className="bg-white shadow-lg mx-auto"
            style={{ 
              maxWidth: "850px",
              minHeight: "1100px",
              padding: "40px",
              fontFamily: "'Times New Roman', serif"
            }}
          >
            {/* Personal Info Section */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold mb-2" style={{ color: "#000" }}>
                {resumeData.personalInfo?.name || "Your Name"}
              </h1>
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                {resumeData.personalInfo?.email && (
                  <div className="flex items-center">
                    <Mail className="w-3 h-3 mr-1" />
                    {resumeData.personalInfo.email}
                  </div>
                )}
                {resumeData.personalInfo?.phone && (
                  <div className="flex items-center">
                    <Phone className="w-3 h-3 mr-1" />
                    {resumeData.personalInfo.phone}
                  </div>
                )}
                {resumeData.personalInfo?.location && (
                  <div className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {resumeData.personalInfo.location}
                  </div>
                )}
              </div>
              {(resumeData.personalInfo?.linkedin || resumeData.personalInfo?.github) && (
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-600 mt-1">
                  {resumeData.personalInfo?.linkedin && (
                    <div className="flex items-center">
                      <Linkedin className="w-3 h-3 mr-1" />
                      {resumeData.personalInfo.linkedin}
                    </div>
                  )}
                  {resumeData.personalInfo?.github && (
                    <div className="flex items-center">
                      <Github className="w-3 h-3 mr-1" />
                      {resumeData.personalInfo.github}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Professional Summary */}
            {resumeData.summary && (
              <div className="mb-6">
                <h2 className="text-lg font-bold uppercase tracking-wide border-b-2 border-gray-800 mb-2">
                  Professional Summary
                </h2>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {resumeData.summary}
                </p>
              </div>
            )}

            {/* Experience Section */}
            {resumeData.experience && resumeData.experience.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold uppercase tracking-wide border-b-2 border-gray-800 mb-2">
                  Experience
                </h2>
                {resumeData.experience.map((exp: any, index: number) => (
                  <div key={index} className="mb-4">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h3 className="font-bold text-base">{exp.title}</h3>
                        <p className="text-sm text-gray-600">
                          {exp.company} {exp.location && `| ${exp.location}`}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">
                        {exp.startDate} - {exp.endDate}
                      </p>
                    </div>
                    {exp.bullets && exp.bullets.length > 0 && (
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {exp.bullets.map((bullet: string, bIndex: number) => (
                          <li key={bIndex} className="text-sm text-gray-700 leading-relaxed">
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Education Section */}
            {resumeData.education && resumeData.education.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold uppercase tracking-wide border-b-2 border-gray-800 mb-2">
                  Education
                </h2>
                {resumeData.education.map((edu: any, index: number) => (
                  <div key={index} className="mb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-base">{edu.degree}</h3>
                        <p className="text-sm text-gray-600">
                          {edu.school} {edu.location && `| ${edu.location}`}
                        </p>
                        {edu.gpa && (
                          <p className="text-sm text-gray-600">GPA: {edu.gpa}</p>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{edu.graduation}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Skills Section */}
            {resumeData.skills && Object.keys(resumeData.skills).length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold uppercase tracking-wide border-b-2 border-gray-800 mb-2">
                  Technical Skills
                </h2>
                <div className="space-y-1">
                  {Object.entries(resumeData.skills).map(([category, skills]: [string, any]) => (
                    <div key={category} className="flex">
                      <span className="font-semibold text-sm capitalize mr-2">
                        {category}:
                      </span>
                      <span className="text-sm text-gray-700">
                        {Array.isArray(skills) ? skills.join(", ") : skills}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects Section */}
            {resumeData.projects && resumeData.projects.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold uppercase tracking-wide border-b-2 border-gray-800 mb-2">
                  Projects
                </h2>
                {resumeData.projects.map((project: any, index: number) => (
                  <div key={index} className="mb-3">
                    <h3 className="font-bold text-base">
                      {project.name}
                      {project.link && (
                        <span className="font-normal text-sm text-gray-600 ml-2">
                          ({project.link})
                        </span>
                      )}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-gray-700 mb-1">{project.description}</p>
                    )}
                    {project.bullets && project.bullets.length > 0 && (
                      <ul className="list-disc list-inside space-y-1">
                        {project.bullets.map((bullet: string, bIndex: number) => (
                          <li key={bIndex} className="text-sm text-gray-700">
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}
                    {project.technologies && project.technologies.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-semibold">Technologies:</span> {project.technologies.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Certifications */}
            {resumeData.certifications && resumeData.certifications.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold uppercase tracking-wide border-b-2 border-gray-800 mb-2">
                  Certifications
                </h2>
                {resumeData.certifications.map((cert: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm mb-1">
                    <span>
                      <span className="font-semibold">{cert.name}</span> - {cert.issuer}
                    </span>
                    <span className="text-gray-600">{cert.date}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Achievements */}
            {resumeData.achievements && resumeData.achievements.length > 0 && (
              <div>
                <h2 className="text-lg font-bold uppercase tracking-wide border-b-2 border-gray-800 mb-2">
                  Achievements
                </h2>
                <ul className="list-disc list-inside space-y-1">
                  {resumeData.achievements.map((achievement: string, index: number) => (
                    <li key={index} className="text-sm text-gray-700">
                      {achievement}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* ATS Score Panel */}
        {showATSPanel && currentJDId && (
          <div 
            className="w-80 border-l overflow-y-auto"
            style={{ 
              backgroundColor: colors.background,
              borderColor: colors.border
            }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold" style={{ color: colors.foreground }}>
                  ATS Analysis
                </h3>
                {isScoring && (
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: colors.primary }}
                    />
                    <span className="text-xs" style={{ color: colors.mutedForeground }}>
                      Analyzing...
                    </span>
                  </div>
                )}
              </div>

              {atsScore ? (
                <div className="space-y-4">
                  {/* Overall Score */}
                  <Card className="p-4">
                    <div className="text-center">
                      <div 
                        className="text-3xl font-bold mb-1"
                        style={{ color: getScoreColor(atsScore.overall) }}
                      >
                        {atsScore.overall}
                      </div>
                      <div className="text-sm" style={{ color: colors.mutedForeground }}>
                        out of 100
                      </div>
                      <Badge 
                        className="mt-2"
                        variant="outline"
                        style={{ 
                          backgroundColor: getScoreColor(atsScore.overall) + '20',
                          color: getScoreColor(atsScore.overall),
                          borderColor: getScoreColor(atsScore.overall)
                        }}
                      >
                        {getScoreLabel(atsScore.overall)}
                      </Badge>
                    </div>
                  </Card>

                  {/* Score Breakdown */}
                  {atsScore.breakdown && (
                    <Card className="p-4 space-y-3">
                      <h4 className="font-medium mb-2" style={{ color: colors.foreground }}>
                        Score Breakdown
                      </h4>
                      
                      {/* Keywords */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span style={{ color: colors.mutedForeground }}>Keywords</span>
                          <span style={{ color: colors.foreground }}>
                            {atsScore.breakdown.keywords?.score || 0}/40
                          </span>
                        </div>
                        <Progress 
                          value={(atsScore.breakdown.keywords?.score || 0) / 40 * 100}
                          className="h-2"
                        />
                      </div>

                      {/* Relevancy */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span style={{ color: colors.mutedForeground }}>Relevancy</span>
                          <span style={{ color: colors.foreground }}>
                            {atsScore.breakdown.relevancy?.score || 0}/25
                          </span>
                        </div>
                        <Progress 
                          value={(atsScore.breakdown.relevancy?.score || 0) / 25 * 100}
                          className="h-2"
                        />
                      </div>

                      {/* Quantification */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span style={{ color: colors.mutedForeground }}>Quantification</span>
                          <span style={{ color: colors.foreground }}>
                            {atsScore.breakdown.quantification?.score || 0}/15
                          </span>
                        </div>
                        <Progress 
                          value={(atsScore.breakdown.quantification?.score || 0) / 15 * 100}
                          className="h-2"
                        />
                      </div>

                      {/* Formatting */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span style={{ color: colors.mutedForeground }}>Formatting</span>
                          <span style={{ color: colors.foreground }}>
                            {atsScore.breakdown.formatting?.score || 0}/10
                          </span>
                        </div>
                        <Progress 
                          value={(atsScore.breakdown.formatting?.score || 0) / 10 * 100}
                          className="h-2"
                        />
                      </div>

                      {/* Readability */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span style={{ color: colors.mutedForeground }}>Readability</span>
                          <span style={{ color: colors.foreground }}>
                            {atsScore.breakdown.readability?.score || 0}/10
                          </span>
                        </div>
                        <Progress 
                          value={(atsScore.breakdown.readability?.score || 0) / 10 * 100}
                          className="h-2"
                        />
                      </div>
                    </Card>
                  )}

                  {/* Suggestions */}
                  {atsScore.suggestions && atsScore.suggestions.length > 0 && (
                    <Card className="p-4">
                      <h4 className="font-medium mb-2" style={{ color: colors.foreground }}>
                        Improvement Tips
                      </h4>
                      <ul className="space-y-2">
                        {atsScore.suggestions.slice(0, 5).map((suggestion, index) => (
                          <li 
                            key={index} 
                            className="text-xs flex items-start"
                            style={{ color: colors.mutedForeground }}
                          >
                            <span className="mr-2">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </div>
              ) : (
                <Card className="p-4 text-center">
                  <p className="text-sm" style={{ color: colors.mutedForeground }}>
                    {currentJDId ? 'Calculating ATS score...' : 'No job description selected'}
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
