import { useQuery } from '@tanstack/react-query';
import { type Document } from '@shared/schema';

export default function DocumentViewer({ params }: { params: { id: string } }) {
  const documentId = parseInt(params.id);
  console.log('DocumentViewer mounted with ID:', documentId);

  const { data: document, isLoading, error } = useQuery<Document>({
    queryKey: ['/api/documents', documentId],
    enabled: !!documentId && !isNaN(documentId),
    staleTime: 0,
  });

  if (isLoading) {
    return <div>Loading document...</div>;
  }

  if (error) {
    return <div>Error loading document: {error.message}</div>;
  }

  if (!document) {
    return <div>No document found</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>{document.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: document.htmlContent }} />
    </div>
  );
}