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
import { supabase } from '@/lib/supabase';

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
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: htmlContent || '<p></p>',
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm focus:outline-none text-sm leading-relaxed max-w-none min-h-[400px] placeholder:text-muted-foreground',
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
    if (editor && !editor.isDestroyed && htmlContent) {
      console.log('Setting editor content:', { htmlContent });
      editor.commands.setContent(htmlContent);
    }
  }, [editor, htmlContent]);

  useEffect(() => {
    console.log('TextEditor props updated:', { content, htmlContent, documentId });
  }, [content, htmlContent, documentId]);

  const saveMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; htmlContent: string; analysisMode: AnalysisMode; analysisResult: AnalysisResult | null }) => {
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
    },
    onError: (error: Error) => {
      console.error('Save error:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save document. Please try again.",
        className: "bg-red-100 border-red-500",
      });
    },
  });

  const handleSave = async () => {
    if (!editor) return;

    const text = editor.getText().trim();
    if (!text) {
      toast({
        title: "Empty Content",
        description: "Please enter some text before saving.",
        className: "bg-red-100 border-red-500",
      });
      return;
    }

    const title = text.split('\n')[0].slice(0, 50) || 'Untitled Document';
    setSaving(true);

    try {
      await saveMutation.mutateAsync({
        title,
        content: text,
        htmlContent: editor.getHTML(),
        analysisMode: mode,
        analysisResult: analysis,
      });
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const analyze = async () => {
    if (!editor) return;

    const currentContent = editor.getText().trim();
    if (!currentContent) {
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
      // First check if we have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to analyze text.",
          className: "bg-red-100 border-red-500",
        });
        return;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          content: currentContent,
          mode
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `Analysis failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('Analysis result:', data);

      if (!data.analysis || !Array.isArray(data.analysis.issues)) {
        throw new Error('Invalid analysis response format');
      }

      editor.commands.unsetHighlight();

      data.analysis.issues.forEach((issue: any) => {
        const text = editor.getText();
        const index = text.indexOf(issue.text);
        if (index !== -1) {
          editor.chain()
            .focus()
            .setTextSelection({ from: index, to: index + issue.text.length })
            .setHighlight({ color: issue.severity === 'high' ? '#fecaca' : issue.severity === 'medium' ? '#fef08a' : '#bfdbfe' })
            .run();
        }
      });

      onHtmlContentChange(editor.getHTML());
      onAnalysis(data.analysis);
      setAnalysis(data.analysis);

      if (data.modeSuggestion) {
        toast({
          title: "Mode Suggestion",
          description: (
            <div className="space-y-2">
              <p>{data.modeSuggestion.explanation}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 bg-white hover:bg-yellow-50"
                onClick={() => setMode(data.modeSuggestion!.suggestedMode)}
              >
                Switch to {data.modeSuggestion.suggestedMode} mode
              </Button>
            </div>
          ),
          className: "bg-yellow-100 border-yellow-500",
          duration: 7000,
        });
      }

      toast({
        title: "Analysis Complete",
        description: (
          <div onClick={onShowAnalysis} className="cursor-pointer hover:underline text-green-700">
            Found {data.analysis.issues.length} issues to review. Click to view analysis.
          </div>
        ),
        className: "bg-green-100 border-green-500",
        duration: 7000,
      });

    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "There was an error analyzing your text. Please try again.",
        className: "bg-red-100 border-red-500",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card w-full">
        <div className="border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={handleSave}
              disabled={saving}
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
        <div className="p-4">
          <EditorContent
            editor={editor}
            className="focus-within:outline-none w-full"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          onClick={analyze}
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
  );
}