import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, ChevronDown, ChevronUp, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { type Document } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function Documents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Document Deleted",
        description: "The document has been deleted successfully.",
        className: "bg-green-100 border-green-500",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete document. Please try again.",
        className: "bg-red-100 border-red-500",
      });
    },
    onSettled: () => {
      setDeletingId(null);
    }
  });

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this document?')) {
      setDeletingId(id);
      await deleteMutation.mutate(id);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

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

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center text-sm text-muted-foreground mb-6">
            <span>Documents</span>
          </div>

          <div className="grid gap-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : documents?.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No documents yet. Create one from the editor.
              </Card>
            ) : (
              documents?.map((doc) => (
                <Card key={doc.id} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-grow cursor-pointer hover:text-primary"
                        onClick={() => toggleExpand(doc.id)}
                      >
                        <div className="flex items-center">
                          {expandedId === doc.id ? (
                            <ChevronUp className="h-4 w-4 mr-2" />
                          ) : (
                            <ChevronDown className="h-4 w-4 mr-2" />
                          )}
                          <div>
                            <h3 className="font-medium">{doc.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Last updated: {new Date(doc.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                      >
                        {deletingId === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {expandedId === doc.id && (
                      <div className="pt-4 border-t space-y-4">
                        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                          <div 
                            className="prose dark:prose-invert" 
                            dangerouslySetInnerHTML={{ __html: doc.htmlContent }}
                          />
                        </ScrollArea>

                        {doc.analysisResult && (
                          <div className="mt-4">
                            <h4 className="font-medium mb-2">Analysis Results ({doc.analysisMode} mode)</h4>
                            <div className="space-y-2">
                              {doc.analysisResult.issues.map((issue: any, index: number) => (
                                <Card key={index} className="p-3">
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
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}