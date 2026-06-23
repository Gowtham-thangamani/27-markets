import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// RTL auto-cleanup requires a global `afterEach`. With Vitest globals:false we
// must wire it up explicitly so each test starts with a clean DOM.
afterEach(() => cleanup());
