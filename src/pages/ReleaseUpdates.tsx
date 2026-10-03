import { useNavigate } from 'react-router';
import { UpdateScreen } from '../components/updates/UpdateScreen';
import { useAuth } from '../providers/AuthProvider';
import { markReleaseSeen } from '../lib/releaseUpdates';
import { CURRENT_RELEASE } from '../data/releases';

export default function ReleaseUpdates() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const close = () => {
    if (user) markReleaseSeen(localStorage, user.id, CURRENT_RELEASE.id);
    navigate('/dashboard');
  };
  return <UpdateScreen open onClose={close} release={CURRENT_RELEASE} />;
}
