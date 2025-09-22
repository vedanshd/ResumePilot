import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, RefreshCw, Lightbulb, TrendingUp } from "lucide-react";
import { useATSStore } from "@/store/ats-store";
import { useResumeStore } from "@/store/resume-store";
import { useWebSocket } from "@/lib/websocket";
import { useTheme } from "@/contexts/theme-context";

export function ATSPanel() {
  const { 
    currentJDId, 
    jobDescriptions, 
    atsScore, 
    setATSScore,
    isScoring,
    setIsScoring,
    scoreHistory,
    addToHistory,
    requestATSScore
  } = useATSStore();
  
  const { currentResumeId } = useResumeStore();
  const { colors } = useTheme();
  
  const currentJD = jobDescriptions?.find(jd => jd.id === currentJDId);

  // WebSocket connection for live updates
  const { subscribe } = useWebSocket({
    onMessage: (data) => {
      console.log('WebSocket message received:', data);
      if (data.channel?.startsWith('ats:') && data.data) {
        console.log('ATS score update:', data.data);
        setATSScore(data.data);
        if (data.data.final) {
          setIsScoring(false);
          addToHistory(data.data.overall);
        }
      }
    }
  });
  
  // Subscribe to ATS channel when resume/JD changes
  useEffect(() => {
    if (currentResumeId && currentJDId) {
      const channel = `ats:${currentResumeId}:${currentJDId}`;
      console.log('Subscribing to ATS channel:', channel);
      subscribe(channel);
      
      // Only trigger ATS scoring if we don't have a recent score
      if (!atsScore || atsScore.overall === 0) {
        setIsScoring(true);
        // Small delay to ensure WebSocket subscription is processed
        setTimeout(() => {
          requestATSScore(currentResumeId);
        }, 100);
      }
    }
  }, [currentResumeId, currentJDId]);

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return colors.secondary;
    if (percentage >= 60) return colors.accent;
    return colors.mutedForeground;
  };

  const getScoreLabel = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return { color: colors.secondary, bg: colors.secondary + '20' };
    if (percentage >= 60) return { color: colors.accent, bg: colors.accent + '20' };
    return { color: colors.mutedForeground, bg: colors.muted };
  };

  return (
    <div 
      className="w-80 overflow-y-auto"
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
            Live ATS Score
          </h3>
          <div className="flex items-center space-x-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ 
                backgroundColor: isScoring ? colors.secondary : colors.muted,
                animation: isScoring ? 'pulse 2s infinite' : 'none'
              }}
            ></div>
            <span className="text-sm" style={{ color: colors.mutedForeground }}>
              {isScoring ? 'Analyzing' : 'Ready'}
            </span>
          </div>
        </div>
        
        {/* Overall Score */}
        <div className="text-center mb-4">
          <div className="text-3xl font-bold" style={{ color: colors.foreground }}>
            {atsScore?.overall || 0}
          </div>
          <div className="text-sm" style={{ color: colors.mutedForeground }}>out of 100</div>
          <div 
            className="w-full rounded-full h-2 mt-2"
            style={{ backgroundColor: colors.muted }}
          >
            <div 
              className="h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${atsScore?.overall || 0}%`,
                backgroundColor: getScoreColor(atsScore?.overall || 0, 100)
              }}
            ></div>
          </div>
        </div>

        {/* Active Job Match */}
        {currentJD && (
          <div 
            className="rounded-lg p-3 mb-4"
            style={{ backgroundColor: colors.muted }}
          >
            <div className="text-sm font-medium mb-1" style={{ color: colors.foreground }}>
              Matching Against
            </div>
            <div className="text-sm truncate" style={{ color: colors.foreground }}>
              {currentJD.title}
            </div>
            <div className="text-xs truncate" style={{ color: colors.mutedForeground }}>
              {currentJD.company}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs p-0 h-auto mt-1"
              onClick={() => {
                if (currentResumeId && currentJDId) {
                  setIsScoring(true);
                  requestATSScore(currentResumeId);
                }
              }}
              style={{ color: colors.primary }}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh Score
            </Button>
          </div>
        )}

      </div>

      <div className="p-4 space-y-4">
        {/* Score Breakdown */}
        {atsScore?.breakdown && (
          <div className="space-y-4">
            {/* Keywords */}
            <Card 
              className="p-4"
              style={{ 
                backgroundColor: colors.card,
                borderColor: colors.border
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: colors.foreground }}>Keywords</span>
                <span className="text-sm font-semibold" style={{ color: colors.foreground }}>
                  {atsScore.breakdown.keywords?.score || 0}/40
                </span>
              </div>
              <Progress 
                value={(atsScore.breakdown.keywords?.score || 0) / 40 * 100} 
                className="mb-2" 
              />
              <div className="text-xs mb-2" style={{ color: colors.mutedForeground }}>
                {atsScore.breakdown.keywords?.matched || 0} of {atsScore.breakdown.keywords?.total || 0} keywords matched
              </div>
              {atsScore.breakdown.keywords?.missing?.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs" style={{ color: colors.mutedForeground }}>Missing:</div>
                  <div className="flex flex-wrap gap-1">
                    {atsScore.breakdown.keywords.missing.slice(0, 6).map((keyword, index) => (
                      <Badge key={index} variant="destructive" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Relevancy */}
            <Card 
              className="p-4"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: colors.foreground }}>Relevancy</span>
                <span className="text-sm font-semibold" style={{ color: colors.foreground }}>
                  {atsScore.breakdown.relevancy?.score || 0}/25
                </span>
              </div>
              <Progress 
                value={(atsScore.breakdown.relevancy?.score || 0) / 25 * 100} 
                className="mb-2" 
              />
              <div className="text-xs" style={{ color: colors.mutedForeground }}>AI-powered semantic analysis</div>
              <div className="text-xs mt-1 flex items-center" style={{ color: colors.mutedForeground }}>
                <Activity className="w-3 h-3 mr-1" />
                Based on Gemini embeddings
              </div>
            </Card>

            {/* Quantification */}
            <Card 
              className="p-4"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: colors.foreground }}>Quantification</span>
                <span className="text-sm font-semibold" style={{ color: colors.foreground }}>
                  {atsScore.breakdown.quantification?.score || 0}/15
                </span>
              </div>
              <Progress 
                value={(atsScore.breakdown.quantification?.score || 0) / 15 * 100} 
                className="mb-2" 
              />
              <div className="text-xs mb-2" style={{ color: colors.mutedForeground }}>
                {atsScore.breakdown.quantification?.quantifiedBullets || 0} of {atsScore.breakdown.quantification?.totalBullets || 0} bullets quantified
              </div>
              <div className="text-xs flex items-center" style={{ color: colors.mutedForeground }}>
                <Lightbulb className="w-3 h-3 mr-1" />
                Add more metrics (%, $, #users)
              </div>
            </Card>

            {/* Formatting */}
            <Card 
              className="p-4"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: colors.foreground }}>Formatting</span>
                <span className="text-sm font-semibold" style={{ color: colors.foreground }}>
                  {atsScore.breakdown.formatting?.score || 0}/10
                </span>
              </div>
              <Progress 
                value={(atsScore.breakdown.formatting?.score || 0) / 10 * 100} 
                className="mb-2" 
              />
              <div className="text-xs" style={{ color: colors.mutedForeground }}>ATS-friendly structure</div>
            </Card>

            {/* Readability */}
            <Card 
              className="p-4"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: colors.foreground }}>Readability</span>
                <span className="text-sm font-semibold" style={{ color: colors.foreground }}>
                  {atsScore.breakdown.readability?.score || 0}/10
                </span>
              </div>
              <Progress 
                value={(atsScore.breakdown.readability?.score || 0) / 10 * 100} 
                className="mb-2" 
              />
              <div className="text-xs" style={{ color: colors.mutedForeground }}>
                Grade level: {atsScore.breakdown.readability?.gradeLevel || 12}
              </div>
              <div className="text-xs mt-1 flex items-center" style={{ color: colors.mutedForeground }}>
                <Lightbulb className="w-3 h-3 mr-1" />
                Simplify sentence structure
              </div>
            </Card>
          </div>
        )}

        {/* Suggestions */}
        {atsScore?.suggestions && atsScore.suggestions.length > 0 && (
          <Card 
            className="p-4"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <h4 className="text-sm font-medium mb-3" style={{ color: colors.foreground }}>Top Suggestions</h4>
            <div className="space-y-3">
              {atsScore.suggestions.slice(0, 3).map((suggestion, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div 
                    className="w-2 h-2 rounded-full mt-2"
                    style={{ backgroundColor: colors.primary }}
                  ></div>
                  <div className="flex-1">
                    <div className="text-sm" style={{ color: colors.foreground }}>{suggestion}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Score History */}
        {scoreHistory.length > 0 && (
          <Card 
            className="p-4"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <h4 className="text-sm font-medium mb-3 flex items-center" style={{ color: colors.foreground }}>
              <TrendingUp className="w-4 h-4 mr-1" />
              Score Trend
            </h4>
            <div className="space-y-2">
              {scoreHistory.slice(-5).map((score, index) => {
                const isLatest = index === scoreHistory.length - 1;
                return (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span style={{ color: colors.mutedForeground }}>
                      {isLatest ? 'Now' : `${(5 - index) * 2} min ago`}
                    </span>
                    <span 
                      className="font-medium"
                      style={{ color: isLatest ? colors.primary : colors.foreground }}
                    >
                      {score}/100
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
