import { useQuery } from '@tanstack/react-query';
import { type Document } from '@shared/schema';
import { Link } from 'wouter';

export default function DocumentViewer({ params }: { params: { id: string } }) {
  // Add debug logging for params
  console.log('Document Viewer Params:', { params, id: params.id });

  const { data: document, isLoading, error } = useQuery<Document>({
    queryKey: ['/api/documents', parseInt(params.id)],
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
    onSuccess: (data) => {
      console.log('Document fetched successfully:', {
        id: data.id,
        title: data.title,
        contentLength: data.content.length,
        htmlContentLength: data.htmlContent.length
      });
    },
    onError: (err) => {
      console.error('Error fetching document:', err);
    }
  });

  // Add debug logging for component state
  console.log('Document Viewer State:', {
    isLoading,
    hasError: !!error,
    hasDocument: !!document,
    documentId: document?.id
  });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-4">
        <Link href="/documents" className="text-blue-500 hover:underline">
          ← Back to Documents
        </Link>
      </div>

      {isLoading && (
        <div className="text-gray-600">Loading document...</div>
      )}

      {error && (
        <div className="text-red-500">
          Error loading document: {error.message}
        </div>
      )}

      {!isLoading && !error && !document && (
        <div className="text-gray-600">No document found</div>
      )}

      {document && (
        <>
          <h1 className="text-2xl font-bold mb-4">{document.title}</h1>
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: document.htmlContent }}
          />
        </>
      )}
    </div>
  );
}