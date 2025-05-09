/**
 * Manual Regression Test for InvenTrack Application
 * This script runs regression tests for key functionality
 */

import axios from 'axios';
import fs from 'fs';
const baseURL = 'http://localhost:5000';

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Utility function to record test results
function recordTest(testName, passed, error = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ PASS: ${testName}`);
  } else {
    testResults.failed++;
    const errorMsg = {
      test: testName,
      error: error ? (error.response?.data || error.message || String(error)) : 'Test failed without specific error'
    };
    testResults.errors.push(errorMsg);
    console.log(`❌ FAIL: ${testName}`);
    console.error('  Error:', errorMsg.error);
  }
}

// Utility function to create an HTTP client with authentication
async function createAuthenticatedClient(username, password) {
  try {
    console.log(`Attempting to login as ${username}...`);

    // Create a new axios instance
    const agent = new axios.create({
      baseURL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add cookie jar to handle session cookies across requests
    const cookieJar = [];

    // Interceptor to capture cookies
    agent.interceptors.response.use(response => {
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        console.log('Received cookies from server');
        cookies.forEach(cookie => {
          const cookiePart = cookie.split(';')[0];
          if (!cookieJar.includes(cookiePart)) {
            cookieJar.push(cookiePart);
          }
        });
      }

      // Add cookies to all subsequent requests
      agent.interceptors.request.use(config => {
        if (cookieJar.length > 0) {
          config.headers.Cookie = cookieJar.join('; ');
        }
        return config;
      });

      return response;
    });

    // Login request
    const loginResponse = await agent.post('/api/login', { 
      username, 
      password 
    });
    
    console.log(`Login response status: ${loginResponse.status}`);
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed with status: ${loginResponse.status}`);
    }
    
    // Verify the user is actually logged in
    try {
      const userResponse = await agent.get('/api/user');
      console.log(`User data verified: ${JSON.stringify(userResponse.data)}`);
    } catch (verifyError) {
      console.error('Failed to verify user session:', verifyError.message);
    }
    
    return agent;
  } catch (error) {
    console.error('Authentication error details:', error);
    throw new Error(`Authentication failed for ${username}: ${error.message}`);
  }
}

// Test Suite 1: User Login
async function testUserLogin() {
  console.log('\n--- Test Suite 1: User Login ---');
  
  // Test 1.1: Admin Login
  try {
    // Try with both possible admin passwords
    let adminClient;
    try {
      adminClient = await createAuthenticatedClient('admin', 'admin123');
    } catch (err) {
      console.log('Trying alternative admin password...');
      adminClient = await createAuthenticatedClient('admin', 'password');
    }
    
    const userResponse = await adminClient.get('/api/user');
    console.log('Admin user response:', JSON.stringify(userResponse.data, null, 2));
    recordTest('Admin Login', userResponse.data && userResponse.data.role === 'ADMIN');
  } catch (error) {
    console.error('Admin login error details:', error);
    recordTest('Admin Login', false, error);
  }
  
  // Test 1.2: Invalid Login
  try {
    await axios.post(`${baseURL}/api/login`, { 
      username: 'nonexistent', 
      password: 'wrongpassword' 
    });
    recordTest('Invalid Login Rejection', false, new Error('Invalid login should have been rejected'));
  } catch (error) {
    // This should fail with 401, so it's actually a success
    recordTest('Invalid Login Rejection', error.response && error.response.status === 401);
  }
}

// Test Suite 2: Store and User Listing
async function testListingsAccess() {
  console.log('\n--- Test Suite 2: Store and User Listing ---');
  
  // Get authenticated client for admin
  let adminClient;
  try {
    // Try with both possible admin passwords
    try {
      adminClient = await createAuthenticatedClient('admin', 'admin123');
    } catch (err) {
      console.log('Trying alternative admin password for store tests...');
      adminClient = await createAuthenticatedClient('admin', 'password');
    }
  } catch (error) {
    console.error('Failed to authenticate admin for store tests:', error);
    for (let i = 1; i <= 2; i++) {
      recordTest(`Listing Test ${i}`, false, new Error('Admin authentication failed'));
    }
    return;
  }
  
  // Test 2.1: List All Users
  try {
    const response = await adminClient.get('/api/users');
    recordTest('List All Users', Array.isArray(response.data) && response.data.length > 0);
  } catch (error) {
    recordTest('List All Users', false, error);
  }
  
  // Test 2.2: List All Stores
  try {
    const response = await adminClient.get('/api/stores');
    recordTest('List All Stores', Array.isArray(response.data));
  } catch (error) {
    recordTest('List All Stores', false, error);
  }
}

// Test Suite 3: Work Items Listing
async function testWorkItems() {
  console.log('\n--- Test Suite 3: Work Items Listing ---');
  
  // Get authenticated client for admin
  let adminClient;
  try {
    // Try with both possible admin passwords
    try {
      adminClient = await createAuthenticatedClient('admin', 'admin123');
    } catch (err) {
      console.log('Trying alternative admin password for work item tests...');
      adminClient = await createAuthenticatedClient('admin', 'password');
    }
  } catch (error) {
    console.error('Failed to authenticate admin for work item tests:', error);
    recordTest(`Work Items Listing`, false, new Error('Admin authentication failed'));
    return;
  }
  
  // Test 3.1: List All Work Items
  try {
    const response = await adminClient.get('/api/work-items');
    recordTest('List All Work Items', Array.isArray(response.data));
  } catch (error) {
    recordTest('List All Work Items', false, error);
  }
}

// Test Suite 4: Notifications
async function testNotifications() {
  console.log('\n--- Test Suite 4: Notifications ---');
  
  // Get authenticated client for admin
  let adminClient;
  try {
    // Try with both possible admin passwords
    try {
      adminClient = await createAuthenticatedClient('admin', 'admin123');
    } catch (err) {
      console.log('Trying alternative admin password for notification tests...');
      adminClient = await createAuthenticatedClient('admin', 'password');
    }
  } catch (error) {
    console.error('Failed to authenticate admin for notification tests:', error);
    recordTest(`Notifications Test`, false, new Error('Admin authentication failed'));
    return;
  }
  
  // Test 4.1: Get Admin Notifications
  try {
    const response = await adminClient.get('/api/user-alerts');
    recordTest('Get Admin Notifications', Array.isArray(response.data));
  } catch (error) {
    recordTest('Get Admin Notifications', false, error);
  }
}

// Test Suite 5: User Details With Stores and Activities
async function testUserDetails() {
  console.log('\n--- Test Suite 5: User Details With Stores and Activities ---');
  
  // Get authenticated client for admin
  let adminClient;
  try {
    // Try with both possible admin passwords
    try {
      adminClient = await createAuthenticatedClient('admin', 'admin123');
    } catch (err) {
      console.log('Trying alternative admin password for user details tests...');
      adminClient = await createAuthenticatedClient('admin', 'password');
    }
  } catch (error) {
    console.error('Failed to authenticate admin for user details tests:', error);
    for (let i = 1; i <= 3; i++) {
      recordTest(`User Details Test ${i}`, false, new Error('Admin authentication failed'));
    }
    return;
  }
  
  // Test 5.1: Get Users List
  let users;
  try {
    const response = await adminClient.get('/api/users');
    users = response.data;
    recordTest('Get Users List', Array.isArray(users) && users.length > 0);
  } catch (error) {
    recordTest('Get Users List', false, error);
    return; // Can't continue without users
  }
  
  if (users && users.length > 0) {
    const userId = users[0].id;
    
    // Test 5.2: Get User Details
    try {
      const response = await adminClient.get(`/api/users/${userId}`);
      recordTest('Get User Details', response.status === 200);
    } catch (error) {
      recordTest('Get User Details', false, error);
    }
    
    // Test 5.3: Get User Stores
    try {
      const response = await adminClient.get(`/api/users/${userId}/stores`);
      recordTest('Get User Stores', Array.isArray(response.data));
    } catch (error) {
      recordTest('Get User Stores', false, error);
    }
    
    // Test 5.4: Get User Activities
    try {
      const response = await adminClient.get(`/api/users/${userId}/activities`);
      recordTest('Get User Activities', Array.isArray(response.data));
    } catch (error) {
      recordTest('Get User Activities', false, error);
    }
  }
}

// Generate test report in markdown format
function generateMarkdownReport() {
  let report = `
# Manual Regression Test Report

## Summary
- **Total Tests:** ${testResults.total}
- **Passed:** ${testResults.passed}
- **Failed:** ${testResults.failed}
- **Pass Rate:** ${Math.round((testResults.passed / testResults.total) * 100)}%

## Test Results

`;

  if (testResults.failed === 0) {
    report += `✅ All tests passed successfully.\n\n`;
  } else {
    report += `### Failed Tests\n\n`;
    
    testResults.errors.forEach((error, index) => {
      report += `#### ${index + 1}. ${error.test}\n`;
      report += `\`\`\`\n${error.error}\n\`\`\`\n\n`;
    });
  }

  return report;
}

// Main test runner
async function runTests() {
  try {
    console.log('Starting Manual Regression Tests...');
    
    // Run all test suites
    await testUserLogin();
    await testListingsAccess();
    await testWorkItems();
    await testNotifications();
    await testUserDetails();
    
    // Generate and output report
    const report = generateMarkdownReport();
    console.log('\n--- Test Report ---');
    console.log(report);
    
    // Write report to file
    fs.writeFileSync('manual-regression-test-report.md', report);
    console.log('Report saved to manual-regression-test-report.md');
    
    // Return exit code based on test results
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();