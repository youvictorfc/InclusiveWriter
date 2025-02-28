import { type AnalysisResult } from '@shared/schema';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'high':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case 'medium':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    default:
      return <Info className="h-5 w-5 text-blue-500" />;
  }
};

const getSeverityDescription = (severity: string) => {
  switch (severity) {
    case 'high':
      return "Critical issue that requires immediate attention. This type of issue should be addressed as soon as possible to maintain document quality and inclusivity.";
    case 'medium':
      return "Warning that should be addressed soon. While not critical, this issue may impact the document's effectiveness or inclusivity.";
    default:
      return "Suggestion for improvement. Consider this feedback to enhance the document's clarity and inclusivity.";
  }
};

export function SuggestionsPanel({ analysis }: { analysis: AnalysisResult | null }) {
  if (!analysis) {
    return (
      <Card className="w-full h-full p-4">
        <div className="text-center text-muted-foreground">
          No analysis results yet. Click "Analyze Text" to begin.
        </div>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="w-full h-full">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Suggestions</h2>
        </div>
        <ScrollArea className="h-[calc(100vh-300px)] p-4">
          <div className="space-y-4">
            {analysis.issues.map((issue, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start gap-3">
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div className="cursor-help hover:opacity-80">
                        {getSeverityIcon(issue.severity)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="right"
                      className="p-3 max-w-[300px] bg-white border shadow-lg rounded-lg z-50"
                    >
                      {getSeverityDescription(issue.severity)}
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex-1">
                    <div className="font-medium">Found: "{issue.text}"</div>
                    <div className="text-sm text-muted-foreground mt-1">{issue.reason}</div>
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Suggestion: </span>
                      {issue.suggestion}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </TooltipProvider>
  );
}