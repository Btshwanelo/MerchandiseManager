import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Setup proper jest-dom matchers for Vitest
import * as matchers from '@testing-library/jest-dom/matchers';
import { configDefaults } from 'vitest/config';

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Runs a cleanup after each test case
afterEach(() => {
  cleanup();
});