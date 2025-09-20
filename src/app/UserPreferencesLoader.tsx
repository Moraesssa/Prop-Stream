import { memo } from 'react';

import { useUserPreferencesSync } from '@/hooks/useUserPreferencesSync';

function UserPreferencesLoaderComponent() {
  useUserPreferencesSync();
  return null;
}

const UserPreferencesLoader = memo(UserPreferencesLoaderComponent);

export default UserPreferencesLoader;
