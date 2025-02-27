import { useQuery } from '@tanstack/react-query';
import { type Document } from '@shared/schema';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Link } from 'wouter';

export default function DocumentViewer({ params }: { params: { id: string } }) {
  const documentId = parseInt(params.id);

  const { data: document, isLoading, error } = useQuery<Document>({
    queryKey: ['/api/documents', documentId],
    enabled: !!documentId,
    retry: false,
    staleTime: 0,
    refetchOnMount: true,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        Error loading document. Please try again.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center text-sm text-muted-foreground">
            <Link href="/documents" className="hover:text-primary">Documents</Link>
            <span className="mx-2">/</span>
            <span>{document.title}</span>
          </div>
          <Link href={`/documents/${documentId}/edit`} className="text-primary hover:underline">
            Edit Document
          </Link>
        </div>

        <Card className="p-6">
          <h1 className="text-2xl font-semibold mb-4">{document.title}</h1>
          <div className="prose dark:prose-invert max-w-none" 
               dangerouslySetInnerHTML={{ __html: document.htmlContent }} />
        </Card>
      </div>
    </div>
  );
}
