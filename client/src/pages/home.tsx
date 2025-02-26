import { useState } from 'react';
import { TextEditor } from '@/components/editor/text-editor';
import { SuggestionsPanel } from '@/components/editor/suggestions-panel';
import { type AnalysisResult, type AnalysisMode } from '@shared/schema';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Home() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [mode, setMode] = useState<AnalysisMode>('language');
  const [content, setContent] = useState<string>('');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [activeTab, setActiveTab] = useState('editor');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary/90 via-violet-500 to-primary animate-gradient">
              NOMW
            </h1>
            <div className="flex flex-col">
              <span className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-primary/80 to-violet-500">
                Inclusive Language
              </span>
              <span className="text-xs text-muted-foreground">
                Assistant
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Select value={mode} onValueChange={(value) => setMode(value as AnalysisMode)}>
              <SelectTrigger className="w-[180px] bg-white/50 backdrop-blur-sm border-primary/20">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="language" className="focus:bg-primary/10">
                  Inclusive Language
                </SelectItem>
                <SelectItem value="policy" className="focus:bg-primary/10">
                  Inclusive Policy
                </SelectItem>
                <SelectItem value="recruitment" className="focus:bg-primary/10">
                  Inclusive Recruitment
                </SelectItem>
              </SelectContent>
            </Select>
            <button className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-[400px] bg-muted/50">
                <TabsTrigger value="editor" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Editor
                </TabsTrigger>
                <TabsTrigger value="analysis" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Analysis
                </TabsTrigger>
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