import { useState } from 'react';
import { TextEditor } from '@/components/editor/text-editor';
import { SuggestionsPanel } from '@/components/editor/suggestions-panel';
import { type AnalysisResult, type AnalysisMode } from '@shared/schema';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Home() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [mode, setMode] = useState<AnalysisMode>('language');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">EquiWrite</h1>
          <div className="flex items-center gap-4">
            <Select value={mode} onValueChange={(value) => setMode(value as AnalysisMode)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="language">Inclusive Language</SelectItem>
                <SelectItem value="policy">Inclusive Policy</SelectItem>
                <SelectItem value="recruitment">Inclusive Recruitment</SelectItem>
              </SelectContent>
            </Select>
            <button className="text-sm text-muted-foreground">Logout</button>
          </div>
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
                <TextEditor onAnalysis={setAnalysis} mode={mode} />
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