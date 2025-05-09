/**
 * Test Runner for Regression Tests
 * 
 * This script ensures the server is running before executing the regression tests.
 */

import axios from 'axios';
import { spawn } from 'child_process';
import { once } from 'events';

// Maximum time to wait for server to be ready (in milliseconds)
const MAX_WAIT_TIME = 30000;
const SERVER_URL = 'http://localhost:3000';

async function isServerReady() {
  try {
    await axios.get(SERVER_URL);
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return false;
    }
    // If it's another error (like 404) it means the server is running
    return true;
  }
}

async function waitForServer() {
  console.log('Waiting for server to be ready...');
  const startTime = Date.now();
  
  while (Date.now() - startTime < MAX_WAIT_TIME) {
    if (await isServerReady()) {
      console.log('Server is ready!');
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.error(`Server did not become ready within ${MAX_WAIT_TIME / 1000} seconds`);
  return false;
}

async function runTests() {
  console.log('Running regression tests...');
  
  // Run the tests
  const testProcess = spawn('node', ['regression-tests.js'], {
    stdio: 'inherit'
  });
  
  // Wait for the process to finish
  const [code] = await once(testProcess, 'exit');
  
  return code === 0;
}

async function main() {
  try {
    // Wait for the server to be ready
    const serverReady = await waitForServer();
    if (!serverReady) {
      process.exit(1);
    }
    
    // Run tests
    const testsSucceeded = await runTests();
    
    // Exit with appropriate code
    process.exit(testsSucceeded ? 0 : 1);
    
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

main();