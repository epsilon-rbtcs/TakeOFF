// Ground Health Console — legacy Environmental & Radiation route
// The dedicated environment/radiation workspace was replaced by the
// catalogue-driven domain workspaces (`/domains/environmental` and
// `/domains/radiation`). This module remains only as a redirect shim so old
// bookmarks resolve without mounting a mock-data view.

import React from 'react';
import { Navigate } from 'react-router-dom';

export const EnvironmentalRadiation: React.FC = () => (
  <Navigate to="/domains/environmental" replace />
);

export default EnvironmentalRadiation;
