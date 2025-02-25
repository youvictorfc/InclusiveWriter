import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { analyzeText } from '@/lib/openai';
import { useState } from 'react';
import { type AnalysisResult, type AnalysisMode } from '@shared/schema';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TextEditorProps {
  onAnalysis: (result: AnalysisResult | null) => void;
  mode: AnalysisMode;
}

export function TextEditor({ onAnalysis, mode }: TextEditorProps) {
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
    editorProps: {
      attributes: {
        class: 'min-h-[400px] prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const words = editor.getText().trim().split(/\s+/).length;
      setWordCount(editor.getText().trim() ? words : 0);
      // Save content to localStorage whenever it changes
      localStorage.setItem('editorContent', editor.getHTML());
    },
    // Preserve content between component re-renders
    autofocus: 'end',
    content: '',
    editable: true,
    onCreate: ({ editor }) => {
      // Restore any existing highlights when editor is created
      if (editor.isEmpty) {
        const savedContent = localStorage.getItem('editorContent');
        if (savedContent) {
          editor.commands.setContent(savedContent);
        }
      }
    },
  });

  const analyze = async () => {
    if (!editor) return;

    setAnalyzing(true);
    try {
      const content = editor.getText();

      if (!content.trim()) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please enter some text to analyze.",
        });
        return;
      }

      const result = await analyzeText(content, mode);

      // Save the current state before applying highlights
      localStorage.setItem('editorContent', editor.getHTML());

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

      // Save the highlighted state
      localStorage.setItem('editorContent', editor.getHTML());

      onAnalysis(result);

      toast({
        title: "Analysis Complete",
        description: `Found ${result.issues.length} issues to review.`,
      });
    } catch (error) {
      console.error('Analysis failed:', error);

      let errorMessage = "There was an error analyzing your text. Please try again.";

      // Handle empty error objects
      if (!error || (error instanceof Error && !error.message)) {
        errorMessage = "The analysis service encountered an unexpected error. Please try again later.";
      } else if (error instanceof Error) {
        if (error.message.includes('insufficient_quota') || error.message.includes('exceeded your OpenAI API quota')) {
          errorMessage = "Our analysis service has reached its quota limit. Please try again later.";
        } else if (error.message.includes('429') || error.message.includes('rate limiting')) {
          errorMessage = "The analysis service is temporarily unavailable. Please try again in a few minutes.";
        } else if (error.message.includes('Content cannot be empty')) {
          errorMessage = "Please enter some text to analyze.";
        } else if (error.message.includes('invalid_union') || error.message.includes('Invalid input')) {
          errorMessage = "The analysis service returned an invalid response. Please try again.";
        }
      }

      // Clear any partial analysis
      onAnalysis(null);

      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: errorMessage,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                if (editor) {
                  editor.commands.clearContent();
                  localStorage.removeItem('editorContent');
                  onAnalysis(null);
                }
              }}
            >
              Clear
            </Button>
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