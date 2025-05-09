#!/bin/bash

# Check if the server is running
if ! curl -s http://localhost:5000 > /dev/null; then
  echo "The application server doesn't seem to be running at http://localhost:5000."
  echo "Please make sure the server is running and try again."
  exit 1
fi

# Execute the manual regression test
echo "Running manual regression tests..."
node manual-regression-test.js
test_exit_code=$?

# Output results
if [ $test_exit_code -eq 0 ]; then
  echo "All tests passed successfully!"
else
  echo "Some tests failed. Check the manual-regression-test-report.md file for details."
fi

exit $test_exit_code