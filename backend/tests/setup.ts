// Jest setup file for backend tests
import { config } from 'dotenv';

// Load environment variables for testing
config({ path: '.env.test' });

// Global test configuration
beforeAll(async () => {
  // Setup global test environment
});

afterAll(async () => {
  // Cleanup global test environment
});

// Mock console.log in tests unless explicitly needed
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};