/**
 * ClariMed Document URL Resolver
 * Resolves document objects or URLs to direct backend streaming endpoints
 * to prevent 404 NoSuchKey errors.
 */

export function getDocumentViewUrl(doc) {
  if (!doc) return '#';

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const apiBase = apiUrl.replace(/\/api\/?$/, '');

  // If passed an object with ID (Document or TimelineDocumentMeta)
  if (typeof doc === 'object' && doc.id) {
    return `${apiBase}/api/documents/${doc.id}/view`;
  }

  // If passed a document_id string
  if (typeof doc === 'string') {
    if (doc.startsWith('/api/documents/') && doc.endsWith('/view')) {
      return `${apiBase}${doc}`;
    }
    if (doc.startsWith('/')) {
      return `${apiBase}${doc}`;
    }
    if (doc.startsWith('http')) {
      return doc;
    }
    // Assume it's a document ID UUID
    if (doc.length > 10) {
      return `${apiBase}/api/documents/${doc}/view`;
    }
  }

  // If passed doc.file_url
  if (typeof doc === 'object' && doc.file_url) {
    if (doc.file_url.startsWith('/')) {
      return `${apiBase}${doc.file_url}`;
    }
    return doc.file_url;
  }

  return '#';
}

export function getDocumentDownloadUrl(doc) {
  if (!doc) return '#';

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const apiBase = apiUrl.replace(/\/api\/?$/, '');

  if (typeof doc === 'object' && doc.id) {
    return `${apiBase}/api/documents/${doc.id}/download`;
  }
  if (typeof doc === 'string' && doc.length > 10 && !doc.startsWith('http')) {
    return `${apiBase}/api/documents/${doc}/download`;
  }
  return getDocumentViewUrl(doc);
}
