import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { analyzeText } from '@/lib/openai';
import { useState, useEffect } from 'react';
import { type AnalysisResult, type AnalysisMode, type Document } from '@shared/schema';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from "wouter";

interface TextEditorProps {
  onAnalysis: (result: AnalysisResult) => void;
  mode: AnalysisMode;
  content: string;
  htmlContent: string;
  onContentChange: (content: string) => void;
  onHtmlContentChange: (html: string) => void;
  onShowAnalysis: () => void;
  setMode: (mode: AnalysisMode) => void;
  documentId?: number;
}

export function TextEditor({
  onAnalysis,
  mode,
  content,
  htmlContent,
  onContentChange,
  onHtmlContentChange,
  onShowAnalysis,
  setMode,
  documentId,
}: TextEditorProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const saveMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; htmlContent: string }) => {
      if (documentId) {
        const response = await apiRequest('PATCH', `/api/documents/${documentId}`, data);
        return response.json();
      } else {
        const response = await apiRequest('POST', '/api/documents', data);
        return response.json();
      }
    },
    onSuccess: (savedDoc: Document) => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Document Saved",
        description: "Your document has been saved successfully.",
        className: "bg-green-100 border-green-500",
      });

      // Only navigate if this is a new document
      if (!documentId) {
        setLocation(`/documents/${savedDoc.id}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save document. Please try again.",
        className: "bg-red-100 border-red-500",
      });
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
    ],
    content: htmlContent || content || '',
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-lg focus:outline-none leading-relaxed min-h-[400px] placeholder:text-muted-foreground',
        placeholder: 'Enter your text here to analyze (10,000 words max)...'
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const html = editor.getHTML();
      onContentChange(text);
      onHtmlContentChange(html);
      const words = text.trim().split(/\s+/).length;
      setWordCount(text.trim() ? words : 0);
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      if (htmlContent && editor.getHTML() !== htmlContent) {
        editor.commands.setContent(htmlContent);
      } else if (content && editor.getText() !== content) {
        editor.commands.setContent(content);
      }
    }
  }, [htmlContent, content, editor]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-[1200px] mx-auto space-y-6">
          <Card className="shadow-lg overflow-hidden">
            <div className="border-b px-6 py-3 flex items-center justify-between bg-card">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => saveMutation.mutate({
                    title: editor?.getText().split('\n')[0].slice(0, 50) || 'Untitled Document',
                    content: editor?.getText() || '',
                    htmlContent: editor?.getHTML() || '',
                  })}
                  disabled={saving || !editor?.getText().trim()}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                {wordCount} / 10,000 words
              </div>
            </div>
            <div className="px-8 py-6">
              <EditorContent
                editor={editor}
                className="focus-within:outline-none w-full prose dark:prose-invert prose-lg max-w-none"
              />
            </div>
          </Card>
          <div className="flex justify-end">
            <Button
              onClick={async () => {
                if (!editor?.getText().trim()) {
                  toast({
                    title: "Empty Content",
                    description: "Please enter some text to analyze.",
                    className: "bg-red-100 border-red-500",
                  });
                  return;
                }

                if (wordCount > 10000) {
                  toast({
                    title: "Content Too Long",
                    description: "Please limit your text to 10,000 words.",
                    className: "bg-red-100 border-red-500",
                  });
                  return;
                }

                setAnalyzing(true);
                try {
                  const result = await analyzeText(editor.getText(), mode);
                  onAnalysis(result.analysis);
                  onShowAnalysis();

                  if (result.modeSuggestion) {
                    toast({
                      title: "Mode Suggestion",
                      description: (
                        <div className="space-y-2">
                          <p>{result.modeSuggestion.explanation}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2 bg-white hover:bg-yellow-50"
                            onClick={() => setMode(result.modeSuggestion!.suggestedMode)}
                          >
                            Switch to {result.modeSuggestion.suggestedMode} mode
                          </Button>
                        </div>
                      ),
                      className: "bg-yellow-100 border-yellow-500",
                      duration: 7000,
                    });
                  }
                } catch (error: any) {
                  toast({
                    title: "Analysis Failed",
                    description: error.message || "Failed to analyze text. Please try again.",
                    className: "bg-red-100 border-red-500",
                  });
                } finally {
                  setAnalyzing(false);
                }
              }}
              disabled={analyzing || !editor?.getText().trim() || wordCount > 10000}
              className="w-[140px]"
            >
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze Text'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}