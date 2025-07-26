# Testing Strategy Guide

This directory contains manual testing scripts and documentation for the Roo Auto-Grading System.

## Testing Architecture

### Automated Tests (Primary)
- **Location**: `frontend/src/**/*.test.ts`, `functions/src/**/*.test.ts` *(planned)*
- **Framework**: Vitest for unit/integration, Playwright for E2E
- **Coverage**: 85%+ across all components
- **Run Command**: `npm run test`

### Manual Tests (Secondary)
- **Location**: `testing/manual/`
- **Purpose**: Production API testing, integration verification, debugging
- **Usage**: Development debugging and production health checks

## Manual Testing Scripts

### API Testing Scripts
Located in `testing/manual/`:

| Script | Purpose | Usage |
|--------|---------|-------|
| `test-all-endpoints.sh` | **Primary API health check** | Run after deployments |
| `test-functions.sh` | Firebase Functions testing | Debug function issues |
| `test-firestore.sh` | Database operations testing | Verify Firestore connectivity |
| `test-gemini.sh` | AI grading service testing | Test Gemini API integration |
| `test-sheets.sh` | Google Sheets integration | Verify data sync operations |
| `test-validation.sh` | Input validation testing | Test Zod schema validation |

### Legacy Testing Scripts
| Script | Purpose | Status |
|--------|---------|--------|
| `test-parser.js` | Document parsing testing | Legacy - consider converting to automated test |
| `test-parser-improved.js` | Enhanced parser testing | Legacy - consider converting to automated test |
| `test-grade-real-submission.js` | Real submission testing | Useful for debugging - keep |

## When to Use Manual Tests

### ✅ **Use Manual Tests For**:
- **Production Health Checks**: Verify API endpoints are working after deployment
- **Integration Debugging**: When automated tests pass but integration fails
- **Real Data Testing**: Testing with actual Google Sheets data
- **Performance Testing**: Load testing and response time measurement
- **External Service Verification**: Testing third-party API integrations

### ❌ **Don't Use Manual Tests For**:
- **Regression Testing**: Use automated tests instead
- **Unit Testing**: Individual function testing should be automated
- **CI/CD Pipeline**: Automated tests should gate deployments
- **Development Workflow**: Daily development should rely on automated tests

## Running Manual Tests

### Prerequisites
```bash
# Ensure emulators are running for local testing
npm run emulators

# Or test against production (with caution)
export BASE_URL="https://your-production-url"
```

### Quick Health Check
```bash
# Test all endpoints at once
./testing/manual/test-all-endpoints.sh

# Test specific component
./testing/manual/test-gemini.sh
```

### Debugging Workflow
```bash
# 1. Run comprehensive test
./testing/manual/test-all-endpoints.sh

# 2. If failures, run specific tests
./testing/manual/test-functions.sh
./testing/manual/test-firestore.sh

# 3. Check individual components
./testing/manual/test-validation.sh
```

## Test Environment Configuration

### Local Testing (Default)
```bash
# Tests run against Firebase emulators
BASE_URL="http://localhost:5001/your-project/us-central1"
```

### Production Testing
```bash
# Set production URL (use with caution)
export BASE_URL="https://your-production-url"
./testing/manual/test-all-endpoints.sh
```

## Interpreting Test Results

### Success Indicators
- All endpoints return success responses
- Response times under acceptable thresholds
- Data integrity maintained across operations
- No authentication/authorization errors

### Common Failure Patterns
- **Network Issues**: Check Firebase/Google Services status
- **Authentication**: Verify API keys and service account permissions
- **Rate Limiting**: Gemini API limits or Google Sheets quotas
- **Data Format**: Schema validation failures or type mismatches

## Migration to Automated Testing

### Priority for Automation
1. **High Priority**: `test-validation.sh`, `test-functions.sh`
2. **Medium Priority**: `test-firestore.sh`, `test-gemini.sh`
3. **Keep Manual**: `test-all-endpoints.sh` (production health checks)

### Conversion Process
1. **Analyze Script**: Understand what the script tests
2. **Create Unit Tests**: Convert testable logic to automated tests
3. **Keep Integration**: Maintain manual script for integration testing
4. **Update Documentation**: Mark script status and usage

## Best Practices

### Before Running Manual Tests
1. **Check Automated Tests First**: `npm run test`
2. **Verify Environment**: Ensure correct BASE_URL and credentials
3. **Check Dependencies**: Firebase emulators running if testing locally
4. **Have Debugging Tools Ready**: Firebase console, logs, etc.

### After Manual Testing
1. **Document Issues**: Create tickets for any failures found
2. **Update Tests**: If you find new edge cases, add to automated tests
3. **Share Results**: Communication test results to team if needed
4. **Clean Up**: Reset test data if testing modified state

### Script Maintenance
- **Regular Review**: Ensure scripts stay current with API changes
- **Update URLs**: Keep endpoint URLs current
- **Credential Management**: Secure handling of API keys and tokens
- **Documentation**: Keep usage instructions updated

---

**For Automated Testing**: See `frontend/src/**/*.test.ts` and upcoming `functions/src/**/*.test.ts`  
**For Detailed Testing Strategy**: See `docs/testing/testing-strategy.md` *(coming soon)*