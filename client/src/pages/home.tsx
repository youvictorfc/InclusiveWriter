import { useState } from 'react';
import { TextEditor } from '@/components/editor/text-editor';
import { SuggestionsPanel } from '@/components/editor/suggestions-panel';
import { type AnalysisResult } from '@shared/schema';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Home() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">EquiWrite</h1>
          <button className="text-sm text-muted-foreground">Logout</button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Tabs defaultValue="editor" className="w-full">
              <TabsList>
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
              </TabsList>
              <TabsContent value="editor" className="space-y-4">
                <TextEditor onAnalysis={setAnalysis} />
              </TabsContent>
              <TabsContent value="analysis" className="space-y-4">
                <SuggestionsPanel analysis={analysis} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}