import { useState } from 'react';
import { TextEditor } from '@/components/editor/text-editor';
import { SuggestionsPanel } from '@/components/editor/suggestions-panel';
import { type AnalysisResult, type AnalysisMode } from '@shared/schema';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { user, signOut } = useAuth();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [mode, setMode] = useState<AnalysisMode>('language');
  const [content, setContent] = useState<string>('');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [activeTab, setActiveTab] = useState('editor');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">NOMW</h1>
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList>
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
              </TabsList>
              <TabsContent value="editor" className="space-y-4">
                <TextEditor 
                  onAnalysis={setAnalysis} 
                  mode={mode}
                  content={content}
                  htmlContent={htmlContent}
                  onContentChange={setContent}
                  onHtmlContentChange={setHtmlContent}
                  onShowAnalysis={() => setActiveTab('analysis')}
                />
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