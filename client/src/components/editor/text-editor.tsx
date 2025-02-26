import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { analyzeText } from '@/lib/openai';
import { useState, useEffect } from 'react';
import { type AnalysisResult, type AnalysisMode } from '@shared/schema';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TextEditorProps {
  onAnalysis: (result: AnalysisResult) => void;
  mode: AnalysisMode;
  content: string;
  onContentChange: (content: string) => void;
}

export function TextEditor({ onAnalysis, mode, content, onContentChange }: TextEditorProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const { toast } = useToast();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'min-h-[400px] prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      onContentChange(text);
      const words = text.trim().split(/\s+/).length;
      setWordCount(text.trim() ? words : 0);
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      // Only update content if it's actually different to avoid unnecessary rerenders
      const currentContent = editor.getText();
      if (content !== currentContent) {
        // Store the current selection
        const { from, to } = editor.state.selection;

        // Update content
        editor.commands.setContent(content || '');

        // Restore selection if it was within bounds
        if (from <= (content?.length || 0) && to <= (content?.length || 0)) {
          editor.commands.setTextSelection({ from, to });
        }
      }
    }
  }, [content, editor]);

  const analyze = async () => {
    if (!editor) return;

    const currentContent = editor.getText().trim();
    if (!currentContent) {
      toast({
        variant: "destructive",
        title: "Empty Content",
        description: "Please enter some text to analyze.",
      });
      return;
    }

    if (wordCount > 10000) {
      toast({
        variant: "destructive",
        title: "Content Too Long",
        description: "Please limit your text to 10,000 words.",
      });
      return;
    }

    setAnalyzing(true);
    try {
      const result = await analyzeText(currentContent, mode);

      // Clear existing highlights
      editor.commands.unsetHighlight();

      // Apply new highlights based on found issues
      result.issues.forEach(issue => {
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

      onAnalysis(result);
      toast({
        title: "Analysis Complete",
        description: `Found ${result.issues.length} issues to review.`,
      });
    } catch (error: any) {
      console.error('Analysis failed:', error);

      // Handle different error cases
      if (error.message?.includes('429')) {
        toast({
          variant: "destructive",
          title: "API Rate Limit Reached",
          description: "The API quota has been exceeded. Please try again later.",
        });
      } else if (error.message?.includes('401')) {
        toast({
          variant: "destructive",
          title: "API Authentication Error",
          description: "There's an issue with the API key. Please contact support.",
        });
      } else if (error.message?.includes('500')) {
        toast({
          variant: "destructive",
          title: "Service Error",
          description: "The analysis service is temporarily unavailable. Please try again later.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: error.message || "There was an error analyzing your text. Please try again.",
        });
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {wordCount} / 10,000 words
          </div>
        </div>
        <div className="p-4">
          <EditorContent 
            editor={editor} 
            className="min-h-[400px] focus-within:outline-none"
            placeholder="Enter your text here to analyze (10,000 words max)..."
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