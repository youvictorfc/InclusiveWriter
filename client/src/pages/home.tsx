import { useState } from 'react';
import { TextEditor } from '@/components/editor/text-editor';
import { SuggestionsPanel } from '@/components/editor/suggestions-panel';
import { type AnalysisResult } from '@shared/schema';

export default function Home() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            NotOnMyWatch
          </h1>
          <p className="mt-2 text-muted-foreground">
            Create more inclusive content with AI-powered writing assistance
          </p>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <TextEditor onAnalysis={setAnalysis} />
          <SuggestionsPanel analysis={analysis} />
        </div>
      </main>
    </div>
  );
}
