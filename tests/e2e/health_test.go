package e2e

import (
	"net/http"
	"testing"
)

// TestHealthEndpoints tests all health check endpoints.
func TestHealthEndpoints(t *testing.T) {
	t.Run("GET /health returns healthy status", func(t *testing.T) {
		resp, err := Client.Get("/health")
		AssertNoError(t, err, "Failed to call /health")
		AssertStatusCode(t, resp, http.StatusOK)

		var health HealthResponse
		err = DecodeResponse(resp, &health)
		AssertNoError(t, err, "Failed to decode health response")
		AssertEqual(t, "healthy", health.Status, "Health status")
	})

	t.Run("GET /health/ready returns ready status", func(t *testing.T) {
		resp, err := Client.Get("/health/ready")
		AssertNoError(t, err, "Failed to call /health/ready")
		AssertStatusCode(t, resp, http.StatusOK)

		var health HealthResponse
		err = DecodeResponse(resp, &health)
		AssertNoError(t, err, "Failed to decode ready response")
		AssertEqual(t, "ready", health.Status, "Ready status")
	})

	t.Run("GET /health/live returns alive status", func(t *testing.T) {
		resp, err := Client.Get("/health/live")
		AssertNoError(t, err, "Failed to call /health/live")
		AssertStatusCode(t, resp, http.StatusOK)

		var health HealthResponse
		err = DecodeResponse(resp, &health)
		AssertNoError(t, err, "Failed to decode live response")
		AssertEqual(t, "alive", health.Status, "Live status")
	})
}

// TestMetricsEndpoint tests the Prometheus metrics endpoint.
func TestMetricsEndpoint(t *testing.T) {
	t.Run("GET /metrics returns Prometheus metrics", func(t *testing.T) {
		resp, err := Client.Get("/metrics")
		AssertNoError(t, err, "Failed to call /metrics")
		AssertStatusCode(t, resp, http.StatusOK)
		CloseResponse(resp)
	})
}
