// Package e2e provides end-to-end tests for the Nimbus API.
// These tests verify the complete API functionality by making HTTP requests
// to a running Nimbus gateway service.
package e2e

import (
	"os"
	"testing"
)

// TestMain is the entry point for e2e tests.
// It sets up the test environment and cleans up test data after all tests complete.
func TestMain(m *testing.M) {
	// Initialize the API client
	baseURL := os.Getenv("E2E_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:18080"
	}
	InitClient(baseURL)

	// Run all tests
	code := m.Run()

	// Cleanup: delete all test functions (those with e2e- prefix)
	CleanupTestFunctions()

	os.Exit(code)
}
