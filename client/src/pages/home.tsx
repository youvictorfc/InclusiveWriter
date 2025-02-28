import { useState, useEffect } from 'react';
import { TextEditor } from '@/components/editor/text-editor';
import { SuggestionsPanel } from '@/components/editor/suggestions-panel';
import { type AnalysisResult, type AnalysisMode, type Document } from '@shared/schema';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Home() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [mode, setMode] = useState<AnalysisMode>('language');
  const [content, setContent] = useState<string>('');
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [activeTab, setActiveTab] = useState('editor');
  const [location] = useLocation();

  // Extract document ID from location if we're editing an existing document
  const documentId = location.startsWith('/documents/') ? parseInt(location.split('/')[2]) : undefined;

  // Fetch document if we have an ID
  const { data: document, isLoading } = useQuery<Document>({
    queryKey: ['/api/documents', documentId],
    enabled: !!documentId,
  });

  if (documentId && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
              <span className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-primary/80 to-violet-500">
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
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 max-w-[600px] bg-muted/50">
                <TabsTrigger value="editor" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Editor
                </TabsTrigger>
                <TabsTrigger value="analysis" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Analysis
                </TabsTrigger>
                <TabsTrigger value="document" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Saved Document
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
                  setMode={setMode}
                  documentId={documentId}
                />
              </TabsContent>
              <TabsContent value="analysis" className="space-y-4">
                <SuggestionsPanel analysis={analysis} />
              </TabsContent>
              <TabsContent value="document" className="space-y-4">
                {document ? (
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">{document.title}</h2>
                    <ScrollArea className="h-[600px]">
                      <div className="prose dark:prose-invert max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: document.htmlContent }} />
                      </div>
                    </ScrollArea>
                    <div className="mt-4 text-sm text-muted-foreground">
                      Last updated: {new Date(document.updatedAt).toLocaleString()}
                    </div>
                  </Card>
                ) : (
                  <Card className="p-6 text-center text-muted-foreground">
                    {documentId ? 'Loading document...' : 'No document selected'}
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}