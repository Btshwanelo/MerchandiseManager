/**
 * Regression Test Suite for InvenTrack Application
 * 
 * This test script validates the core functionalities:
 * 1. User Login
 * 2. Store Assignment of merchandisers
 * 3. Completion of work items assigned to merchandisers
 * 4. Notifications
 * 5. Admins Viewing of completed work items by merchandisers
 */

// Importing directly from server/db.ts would require TypeScript compilation
// Instead, we'll use a direct database connection for tests
import pg from 'pg';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});
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
    console.log(`Authenticating as ${username}...`);

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
        console.log(`Received cookies from server for ${username}`);
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
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed with status: ${loginResponse.status}`);
    }
    
    // Verify the user is actually logged in
    try {
      const userResponse = await agent.get('/api/user');
      console.log(`Authenticated as ${userResponse.data.username} (${userResponse.data.role})`);
    } catch (verifyError) {
      console.error(`Failed to verify user session for ${username}:`, verifyError.message);
      throw new Error(`Could not verify user session for ${username}`);
    }
    
    return agent;
  } catch (error) {
    // Try alternative password if this is admin
    if (username === 'admin' && password === 'admin123') {
      console.log('Trying alternative admin password...');
      try {
        return await createAuthenticatedClient('admin', 'password');
      } catch (altError) {
        throw new Error(`Authentication failed for admin with both passwords: ${error.message}, ${altError.message}`);
      }
    }
    throw new Error(`Authentication failed for ${username}: ${error.message}`);
  }
}

// Test Suite 1: User Login
async function testUserLogin() {
  console.log('\n--- Test Suite 1: User Login ---');
  
  // Test 1.1: Admin Login
  try {
    const adminClient = await createAuthenticatedClient('admin', 'admin123');
    const userResponse = await adminClient.get('/api/user');
    // The role field in response is lowercase 'admin' not uppercase 'ADMIN'
    recordTest('Admin Login', userResponse.data.role === 'admin');
  } catch (error) {
    recordTest('Admin Login', false, error);
  }
  
  // Test 1.2: Manager Login
  try {
    const managerClient = await createAuthenticatedClient('manager', 'manager123');
    const userResponse = await managerClient.get('/api/user');
    // The role field in response is lowercase 'manager' not uppercase 'MANAGER' 
    recordTest('Manager Login', userResponse.data.role === 'manager');
  } catch (error) {
    recordTest('Manager Login', false, error);
  }
  
  // Test 1.3: Merchandiser Login
  try {
    const merchandiserClient = await createAuthenticatedClient('merchandiser', 'merchandiser123');
    const userResponse = await merchandiserClient.get('/api/user');
    // The role field in response is lowercase 'merchandiser' not uppercase 'MERCHANDISER'
    recordTest('Merchandiser Login', userResponse.data.role === 'merchandiser');
  } catch (error) {
    recordTest('Merchandiser Login', false, error);
  }
  
  // Test 1.4: Invalid Login
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

// Test Suite 2: Store Assignment of Merchandisers
async function testStoreAssignment() {
  console.log('\n--- Test Suite 2: Store Assignment of Merchandisers ---');
  
  // Get authenticated client for admin
  let adminClient;
  try {
    adminClient = await createAuthenticatedClient('admin', 'admin123');
  } catch (error) {
    console.error('Failed to authenticate admin for store assignment tests:', error);
    for (let i = 1; i <= 3; i++) {
      recordTest(`Store Assignment Test ${i}`, false, new Error('Admin authentication failed'));
    }
    return;
  }
  
  // Test 2.1: List All Merchandisers
  let merchandisers;
  try {
    const response = await adminClient.get('/api/users');
    // Role names are lowercase in the database
    merchandisers = response.data.filter(user => user.role === 'merchandiser');
    recordTest('List All Merchandisers', merchandisers.length > 0);
  } catch (error) {
    recordTest('List All Merchandisers', false, error);
    return; // Can't continue without merchandisers
  }
  
  // Test 2.2: List All Stores
  let stores;
  try {
    const response = await adminClient.get('/api/stores');
    stores = response.data;
    recordTest('List All Stores', stores.length > 0);
  } catch (error) {
    recordTest('List All Stores', false, error);
    return; // Can't continue without stores
  }
  
  // Test 2.3: Assign Store to Merchandiser
  if (merchandisers.length > 0 && stores.length > 0) {
    try {
      const merchandiser = merchandisers[0];
      const store = stores[0];
      
      // Create a store assignment
      const assignmentData = {
        userId: merchandiser.id,
        storeId: store.id,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        status: 'ACTIVE',
        stockTakeType: 'FULL'
      };
      
      const response = await adminClient.post('/api/store-assignments', assignmentData);
      recordTest('Assign Store to Merchandiser', response.status === 201);
      
      // Verify assignment exists
      const verifyResponse = await adminClient.get(`/api/users/${merchandiser.id}/stores`);
      const assigned = verifyResponse.data.some(assignment => 
        assignment.storeId === store.id && assignment.status === 'ACTIVE'
      );
      recordTest('Verify Store Assignment', assigned);
    } catch (error) {
      recordTest('Assign Store to Merchandiser', false, error);
    }
  } else {
    recordTest('Assign Store to Merchandiser', false, new Error('No merchandisers or stores available for testing'));
  }
}

// Test Suite 3: Completion of Work Items
async function testWorkItemCompletion() {
  console.log('\n--- Test Suite 3: Completion of Work Items ---');
  
  // Get authenticated clients
  let adminClient, merchandiserClient;
  try {
    adminClient = await createAuthenticatedClient('admin', 'admin123');
    merchandiserClient = await createAuthenticatedClient('merchandiser', 'merchandiser123');
  } catch (error) {
    console.error('Failed to authenticate for work item tests:', error);
    for (let i = 1; i <= 3; i++) {
      recordTest(`Work Item Test ${i}`, false, new Error('Authentication failed'));
    }
    return;
  }
  
  // Test 3.1: Get Merchandiser's Assigned Work Items
  let workItems;
  let merchandiserUser;
  try {
    const userResponse = await merchandiserClient.get('/api/user');
    merchandiserUser = userResponse.data;
    
    const response = await merchandiserClient.get('/api/work-items?status=ASSIGNED');
    workItems = response.data;
    recordTest('Get Merchandiser Work Items', true);
  } catch (error) {
    recordTest('Get Merchandiser Work Items', false, error);
    return; // Can't continue without work items
  }
  
  // If no work items exist, create a test work item
  if (!workItems || workItems.length === 0) {
    try {
      // Get stores
      const storesResponse = await adminClient.get('/api/stores');
      const stores = storesResponse.data;
      
      if (stores.length === 0) {
        recordTest('Create Test Work Item', false, new Error('No stores available to create work item'));
        return;
      }
      
      // Create a test work item
      const workItemData = {
        title: 'Regression Test Work Item',
        storeId: stores[0].id,
        userId: merchandiserUser.id,
        type: 'STOCK_TAKE',
        status: 'ASSIGNED',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
        priority: 'MEDIUM',
        description: 'This is a test work item created for regression testing'
      };
      
      const createResponse = await adminClient.post('/api/work-items', workItemData);
      workItems = [createResponse.data];
      recordTest('Create Test Work Item', createResponse.status === 201);
    } catch (error) {
      recordTest('Create Test Work Item', false, error);
      return;
    }
  } else {
    recordTest('Found Existing Work Items', true);
  }
  
  // Test 3.2: Update Work Item Status to In Progress
  try {
    const workItem = workItems[0];
    const updateResponse = await merchandiserClient.patch(`/api/work-items/${workItem.id}`, {
      status: 'IN_PROGRESS'
    });
    recordTest('Update Work Item to IN_PROGRESS', updateResponse.status === 200);
  } catch (error) {
    recordTest('Update Work Item to IN_PROGRESS', false, error);
  }
  
  // Test 3.3: Complete Work Item
  try {
    const workItem = workItems[0];
    const completeResponse = await merchandiserClient.patch(`/api/work-items/${workItem.id}`, {
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      notes: 'Completed during regression testing'
    });
    recordTest('Complete Work Item', completeResponse.status === 200);
  } catch (error) {
    recordTest('Complete Work Item', false, error);
  }
}

// Test Suite 4: Notifications
async function testNotifications() {
  console.log('\n--- Test Suite 4: Notifications ---');
  
  // Get authenticated clients
  let adminClient, merchandiserClient;
  try {
    adminClient = await createAuthenticatedClient('admin', 'admin123');
    merchandiserClient = await createAuthenticatedClient('merchandiser', 'merchandiser123');
  } catch (error) {
    console.error('Failed to authenticate for notification tests:', error);
    for (let i = 1; i <= 3; i++) {
      recordTest(`Notification Test ${i}`, false, new Error('Authentication failed'));
    }
    return;
  }
  
  // Test 4.1: Get Admin Notifications
  try {
    const response = await adminClient.get('/api/user-alerts');
    recordTest('Get Admin Notifications', Array.isArray(response.data));
  } catch (error) {
    recordTest('Get Admin Notifications', false, error);
  }
  
  // Test 4.2: Get Merchandiser Notifications
  try {
    const response = await merchandiserClient.get('/api/user-alerts');
    recordTest('Get Merchandiser Notifications', Array.isArray(response.data));
  } catch (error) {
    recordTest('Get Merchandiser Notifications', false, error);
  }
  
  // Test 4.3: Create Test Notification
  try {
    // Get merchandiser user id
    const userResponse = await merchandiserClient.get('/api/user');
    const merchandiserId = userResponse.data.id;
    
    // Create notification for merchandiser
    const notificationData = {
      userId: merchandiserId,
      title: 'Regression Test Notification',
      message: 'This is a test notification created during regression testing',
      type: 'GENERAL',
      status: 'UNREAD'
    };
    
    const createResponse = await adminClient.post('/api/user-alerts', notificationData);
    recordTest('Create Test Notification', createResponse.status === 201);
    
    // Verify notification was created
    const verifyResponse = await merchandiserClient.get('/api/user-alerts/unread');
    const found = verifyResponse.data.some(alert => 
      alert.title === 'Regression Test Notification' && 
      alert.status === 'UNREAD'
    );
    recordTest('Verify Unread Notification', found);
  } catch (error) {
    recordTest('Create Test Notification', false, error);
  }
  
  // Test 4.4: Mark Notification as Read
  try {
    const unreadResponse = await merchandiserClient.get('/api/user-alerts/unread');
    const unreadNotifications = unreadResponse.data;
    
    if (unreadNotifications.length > 0) {
      const notification = unreadNotifications[0];
      const markReadResponse = await merchandiserClient.patch(`/api/user-alerts/${notification.id}/read`);
      recordTest('Mark Notification as Read', markReadResponse.status === 200);
    } else {
      recordTest('Mark Notification as Read', false, new Error('No unread notifications found'));
    }
  } catch (error) {
    recordTest('Mark Notification as Read', false, error);
  }
}

// Test Suite 5: Admins Viewing Completed Work Items
async function testViewCompletedItems() {
  console.log('\n--- Test Suite 5: Admins Viewing Completed Work Items ---');
  
  // Get authenticated client for admin
  let adminClient;
  try {
    adminClient = await createAuthenticatedClient('admin', 'admin123');
  } catch (error) {
    console.error('Failed to authenticate admin for viewing completed items:', error);
    for (let i = 1; i <= 2; i++) {
      recordTest(`View Completed Items Test ${i}`, false, new Error('Admin authentication failed'));
    }
    return;
  }
  
  // Test 5.1: View All Completed Work Items
  try {
    const response = await adminClient.get('/api/work-items?status=COMPLETED');
    recordTest('View All Completed Work Items', Array.isArray(response.data));
  } catch (error) {
    recordTest('View All Completed Work Items', false, error);
  }
  
  // Test 5.2: View Completed Work Item Details
  try {
    const completedResponse = await adminClient.get('/api/work-items?status=COMPLETED');
    const completedItems = completedResponse.data;
    
    if (completedItems.length > 0) {
      const item = completedItems[0];
      const detailsResponse = await adminClient.get(`/api/work-items/${item.id}`);
      recordTest('View Completed Work Item Details', detailsResponse.status === 200);
    } else {
      recordTest('View Completed Work Item Details', false, new Error('No completed work items found'));
    }
  } catch (error) {
    recordTest('View Completed Work Item Details', false, error);
  }
}

// Generate test report in markdown format
function generateMarkdownReport() {
  let report = `
# Regression Test Report

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
    console.log('Starting Regression Tests...');
    
    // Run all test suites
    await testUserLogin();
    await testStoreAssignment();
    await testWorkItemCompletion();
    await testNotifications();
    await testViewCompletedItems();
    
    // Generate and output report
    const report = generateMarkdownReport();
    console.log('\n--- Test Report ---');
    console.log(report);
    
    // Write report to file
    fs.writeFileSync('regression-test-report.md', report);
    console.log('Report saved to regression-test-report.md');
    
    // Clean up and exit
    await pool.end();
    
    // Return exit code based on test results
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('Error running tests:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run the tests
runTests();