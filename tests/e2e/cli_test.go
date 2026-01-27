package e2e

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// nimbusPath is the path to the nimbus binary used for CLI tests.
var nimbusPath string

func setupCLI(t *testing.T) {
	if nimbusPath != "" {
		return
	}

	// Find the project root by looking for go.mod
	dir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			break
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatal("could not find project root")
		}
		dir = parent
	}

	nimbusPath = filepath.Join(dir, "bin", "nimbus")

	// Build the binary if it doesn't exist
	if _, err := os.Stat(nimbusPath); os.IsNotExist(err) {
		t.Log("Building nimbus binary...")
		cmd := exec.Command("go", "build", "-o", nimbusPath, "./cmd/nimbus")
		cmd.Dir = dir
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("failed to build nimbus: %v\n%s", err, string(out))
		}
	}

	// Configure nimbus to use the test API URL
	baseURL := os.Getenv("E2E_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:18080"
	}
	
	// Create a temporary config file for tests
	tmpConfig := filepath.Join(t.TempDir(), ".nimbus.yaml")
	os.Setenv("NIMBUS_CONFIG", tmpConfig)
	
	runNimbus(t, "context", "set", "test", baseURL)
	runNimbus(t, "context", "use", "test")
}

func runNimbus(t *testing.T, args ...string) (string, string, error) {
	t.Helper()
	var stdout, stderr bytes.Buffer
	cmd := exec.Command(nimbusPath, args...)
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	// Use the same environment but override config
	cmd.Env = os.Environ()
	
	err := cmd.Run()
	return stdout.String(), stderr.String(), err
}

func TestCLIWorkflow(t *testing.T) {
	setupCLI(t)

	t.Run("workflow commands", func(t *testing.T) {
		// 1. List workflows (should be empty or have some)
		out, _, err := runNimbus(t, "workflow", "list")
		if err != nil {
			t.Fatalf("failed to list workflows: %v", err)
		}
		t.Logf("Workflow list: %s", out)

		// 2. Create a workflow
		// First create a temporary definition file
		wfDef := `{
			"start_at": "Hello",
			"states": {
				"Hello": {
					"type": "Pass",
					"end": true
				}
			}
		}`
		tmpFile := filepath.Join(t.TempDir(), "wf.json")
		if err := os.WriteFile(tmpFile, []byte(wfDef), 0644); err != nil {
			t.Fatal(err)
		}

		wfName := GenerateTestName("cli-workflow")
		out, _, err = runNimbus(t, "workflow", "create", wfName, "--file", tmpFile)
		if err != nil {
			t.Fatalf("failed to create workflow: %v", err)
		}
		if !strings.Contains(out, "created") {
			t.Errorf("expected output to contain 'created', got: %s", out)
		}

		// 3. List again and find the workflow
		out, _, err = runNimbus(t, "workflow", "list")
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(out, wfName) {
			t.Errorf("expected workflow list to contain %s, got: %s", wfName, out)
		}

		// Get the ID from the list (simplified parsing)
		lines := strings.Split(out, "\n")
		var wfID string
		for _, line := range lines {
			if strings.Contains(line, wfName) {
				fields := strings.Fields(line)
				if len(fields) > 0 {
					wfID = fields[0]
					break
				}
			}
		}

		if wfID == "" {
			t.Fatal("could not find workflow ID in list")
		}

		// 4. Run the workflow
		out, _, err = runNimbus(t, "workflow", "run", wfID)
		if err != nil {
			t.Fatalf("failed to run workflow: %v", err)
		}
		if !strings.Contains(out, "started") {
			t.Errorf("expected output to contain 'started', got: %s", out)
		}

		// 5. Delete the workflow
		_, _, err = runNimbus(t, "workflow", "delete", wfID)
		if err != nil {
			t.Fatalf("failed to delete workflow: %v", err)
		}
	})
}

func TestCLILayer(t *testing.T) {
	setupCLI(t)

	t.Run("layer commands", func(t *testing.T) {
		layerName := GenerateTestName("cli-layer")
		
		// 1. Create layer
		out, _, err := runNimbus(t, "layer", "create", layerName, "--runtimes", "python3.11", "--description", "Test Layer")
		if err != nil {
			t.Fatalf("failed to create layer: %v", err)
		}
		if !strings.Contains(out, "created") {
			t.Errorf("expected output to contain 'created', got: %s", out)
		}

		// 2. List layers
		out, _, err = runNimbus(t, "layer", "list")
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(out, layerName) {
			t.Errorf("expected layer list to contain %s, got: %s", layerName, out)
		}

		// Get ID
		lines := strings.Split(out, "\n")
		var layerID string
		for _, line := range lines {
			if strings.Contains(line, layerName) {
				fields := strings.Fields(line)
				if len(fields) > 0 {
					layerID = fields[0]
					break
				}
			}
		}

		// 3. Delete layer
		if layerID != "" {
			_, _, err = runNimbus(t, "layer", "delete", layerID)
			if err != nil {
				t.Fatalf("failed to delete layer: %v", err)
			}
		}
	})
}

func TestCLIEnvironment(t *testing.T) {
	setupCLI(t)

	t.Run("environment commands", func(t *testing.T) {
		envName := GenerateTestName("cli-env")
		
		// 1. Create env
		out, _, err := runNimbus(t, "environment", "create", envName, "--description", "Test Env")
		if err != nil {
			t.Fatalf("failed to create environment: %v", err)
		}

		// 2. List envs
		out, _, err = runNimbus(t, "environment", "list")
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(out, envName) {
			t.Errorf("expected env list to contain %s, got: %s", envName, out)
		}

		// Get ID
		lines := strings.Split(out, "\n")
		var envID string
		for _, line := range lines {
			if strings.Contains(line, envName) {
				fields := strings.Fields(line)
				if len(fields) > 0 {
					envID = fields[0]
					break
				}
			}
		}

		// 3. Delete env
		if envID != "" {
			_, _, err = runNimbus(t, "environment", "delete", envID)
			if err != nil {
				t.Fatalf("failed to delete environment: %v", err)
			}
		}
	})
}

func TestCLIApiKey(t *testing.T) {
	setupCLI(t)

	t.Run("apikey commands", func(t *testing.T) {
		keyName := GenerateTestName("cli-key")
		
		// 1. Create apikey
		out, _, err := runNimbus(t, "apikey", "create", keyName)
		if err != nil {
			t.Fatalf("failed to create apikey: %v", err)
		}
		if !strings.Contains(out, "created") {
			t.Errorf("expected output to contain 'created', got: %s", out)
		}

		// 2. List apikeys
		out, _, err = runNimbus(t, "apikey", "list")
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(out, keyName) {
			t.Errorf("expected apikey list to contain %s, got: %s", keyName, out)
		}

		// Get ID
		lines := strings.Split(out, "\n")
		var keyID string
		for _, line := range lines {
			if strings.Contains(line, keyName) {
				fields := strings.Fields(line)
				if len(fields) > 0 {
					keyID = fields[0]
					break
				}
			}
		}

		// 3. Delete apikey
		if keyID != "" {
			_, _, err = runNimbus(t, "apikey", "delete", keyID)
			if err != nil {
				t.Fatalf("failed to delete apikey: %v", err)
			}
		}
	})
}

func TestCLIStatsAndQuota(t *testing.T) {
	setupCLI(t)

	t.Run("stats command", func(t *testing.T) {
		out, _, err := runNimbus(t, "stats")
		if err != nil {
			t.Fatalf("failed to run stats: %v", err)
		}
		if !strings.Contains(out, "Functions") || !strings.Contains(out, "Invocations") {
			t.Errorf("unexpected stats output: %s", out)
		}
	})

	t.Run("quota command", func(t *testing.T) {
		out, _, err := runNimbus(t, "quota")
		if err != nil {
			t.Fatalf("failed to run quota: %v", err)
		}
		if !strings.Contains(out, "RESOURCE") || !strings.Contains(out, "USAGE") {
			t.Errorf("unexpected quota output: %s", out)
		}
	})
}
