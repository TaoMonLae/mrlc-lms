import { Navigate, useParams } from 'react-router-dom';

/**
 * The classic exam builder has been removed — the Guided Studio
 * (`/exams/:id/studio`) is now the only exam builder. This component is kept
 * only as a redirect so any lingering links or bookmarks to the old edit URL
 * resolve to the Studio instead of 404-ing.
 */
export default function ExamEdit() {
  const { id } = useParams();
  return <Navigate to={id ? `/exams/${id}/studio` : '/exams'} replace />;
}
