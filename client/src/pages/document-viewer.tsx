import { useQuery } from '@tanstack/react-query';
import { type Document } from '@shared/schema';
import { Link } from 'wouter';
import { Loader2 } from 'lucide-react';

export default function DocumentViewer({ params }: { params: { id: string } }) {
  const documentId = parseInt(params.id);
  console.log('DocumentViewer: Attempting to load document ID:', documentId);

  const { data: document, isLoading, error } = useQuery<Document>({
    queryKey: ['/api/documents', documentId],
    enabled: !!documentId && !isNaN(documentId),
    retry: 1,
    refetchOnMount: true,
  });

  console.log('DocumentViewer state:', { 
    documentId, 
    isLoading, 
    hasError: !!error, 
    hasDocument: !!document,
    documentContent: document?.content?.substring(0, 100)
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <Link href="/documents" className="text-primary hover:underline">
            ← Back to Documents
          </Link>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <Link href="/documents" className="text-primary hover:underline">
            ← Back to Documents
          </Link>
        </div>
        <div className="text-red-500">Error loading document. Please try again.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-4">
        <Link href="/documents" className="text-primary hover:underline">
          ← Back to Documents
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">{document.title}</h1>
      <div 
        className="prose dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: document.htmlContent }} 
      />
    </div>
  );
}