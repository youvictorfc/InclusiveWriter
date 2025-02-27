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
  htmlContent: string;
  onContentChange: (content: string) => void;
  onHtmlContentChange: (html: string) => void;
  onShowAnalysis: () => void;
  setMode: (mode: AnalysisMode) => void;
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
}: TextEditorProps) {
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
    content: htmlContent || content || '',
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
    if (editor && !editor.isDestroyed) {
      if (htmlContent && editor.getHTML() !== htmlContent) {
        const { from, to } = editor.state.selection;
        const scrollPos = window.scrollY;

        editor.commands.setContent(htmlContent);

        if (from <= editor.getText().length && to <= editor.getText().length) {
          editor.commands.setTextSelection({ from, to });
          window.scrollTo(0, scrollPos);
        }
      }
    }
  }, [htmlContent, editor]);

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
      console.log('Analysis result:', result); 

      editor.commands.unsetHighlight();

      result.analysis.issues.forEach(issue => {
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
      onAnalysis(result.analysis);

      if (result.modeSuggestion) {
        console.log('Showing mode suggestion:', result.modeSuggestion); 
        toast({
          variant: "default",
          className: "bg-yellow-100 border-yellow-500",
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
          duration: 10000, 
        });
      }

      setTimeout(() => {
        toast({
          variant: "default",
          className: "bg-green-100 border-green-500",
          title: "Analysis Complete",
          description: (
            <div onClick={onShowAnalysis} className="cursor-pointer hover:underline text-green-700">
              Found {result.analysis.issues.length} issues to review. Click to view analysis.
            </div>
          ),
        });
      }, result.modeSuggestion ? 500 : 0); 

    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message || "There was an error analyzing your text. Please try again.",
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