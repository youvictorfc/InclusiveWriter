import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { analyzeText } from '@/lib/openai';
import { useState } from 'react';
import { type AnalysisResult } from '@shared/schema';
import { Loader2 } from 'lucide-react';

export function TextEditor({ onAnalysis }: { onAnalysis: (result: AnalysisResult) => void }) {
  const [analyzing, setAnalyzing] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-5 focus:outline-none',
      },
    },
  });

  const analyze = async () => {
    if (!editor) return;
    
    setAnalyzing(true);
    try {
      const content = editor.getText();
      const result = await analyzeText(content);
      
      // Clear existing highlights
      editor.commands.unsetHighlight();
      
      // Apply new highlights
      result.issues.forEach(issue => {
        editor.commands.setHighlight({
          from: issue.startIndex,
          to: issue.endIndex,
          attributes: {
            class: `bg-${issue.severity === 'high' ? 'red' : issue.severity === 'medium' ? 'yellow' : 'blue'}-200`,
          },
        });
      });
      
      onAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card className="w-full">
      <div className="border-b p-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Content Editor</h2>
        <Button 
          onClick={analyze}
          disabled={analyzing || !editor?.getText().trim()}
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
      <EditorContent editor={editor} className="min-h-[400px] p-4" />
    </Card>
  );
}
