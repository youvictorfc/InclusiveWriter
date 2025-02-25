import { type AnalysisResult } from '@shared/schema';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

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
    <Card className="w-full h-full">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Suggestions</h2>
      </div>
      <ScrollArea className="h-[calc(100vh-300px)] p-4">
        <div className="space-y-4">
          {analysis.issues.map((issue, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start gap-3">
                {issue.severity === 'high' ? (
                  <AlertCircle className="h-5 w-5 text-red-500 mt-1" />
                ) : issue.severity === 'medium' ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-1" />
                ) : (
                  <Info className="h-5 w-5 text-blue-500 mt-1" />
                )}
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
  );
}
