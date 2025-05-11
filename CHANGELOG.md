# InvenTrack Change Log

## May 11, 2025

### Read-Only View for Completed Work Items
- Enhanced the merchandisers' ability to view completed work items in read-only mode, showing all submitted data
- Added clear "View Summary" badges to completed work items in the listings to improve discoverability
- Created a visually distinct read-only mode with green status indicators for easier recognition
- Improved product cards with better formatting and visual hierarchy for better readability
- Enhanced shelf images display with better grid layout and improved empty state handling
- Improved comments section with formatted display for better readability
- Fixed issues with work item completion by updating the API endpoints to properly handle status updates
- Updated PATCH request to PUT for status updates at the appropriate endpoint

### API Improvements
- Fixed work item completion mechanism to properly use the `/api/work-items/:id/status` endpoint
- Updated all references to work item status updates to use the correct endpoint
- Fixed issues with stock take retrieval to use the correct API URL format

### UI Enhancements
- Added visual indicators in both desktop and mobile views to clearly show when work items are in completed state
- Improved the formatting of product data in read-only mode with better visual separation
- Highlighted low stock items with red indicators for better visibility in the summary view
- Enhanced mobile view with improved layout and clearer action buttons
