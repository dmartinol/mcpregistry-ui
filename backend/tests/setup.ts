// Jest setup file for backend tests
import { config } from 'dotenv';
import { KubernetesClient } from '../src/services/KubernetesClient';

// Load environment variables for testing
config({ path: '.env.test' });

// Global test configuration
beforeAll(async () => {
  // Setup global test environment
});

afterAll(async () => {
  // Cleanup global test environment
});

// Clear mock data before each test for isolation
beforeEach(async () => {
  // Clear and re-initialize global mock data for test isolation
  KubernetesClient.initializeGlobalMockData();
});

// Mock console.log in tests unless explicitly needed
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error enabled for debugging
  // error: jest.fn(),
};