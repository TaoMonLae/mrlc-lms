import { Navigate, useParams } from 'react-router';

/** A bookmark opens readiness; only the explicit Start action creates an attempt. */
export default function ExamTake() {
  const { id } = useParams();
  return <Navigate to={`/exam2/resume${id ? `?exam=${encodeURIComponent(id)}` : ''}`} replace />;
}
