package e2e

// Test fixtures - sample function code for different runtimes

// PythonHelloWorld is a simple Python function that returns a greeting.
const PythonHelloWorld = `
def handler(event, context):
    name = event.get('name', 'World')
    return {
        'statusCode': 200,
        'body': f'Hello, {name}!'
    }
`

// PythonEchoEnv is a Python function that echoes environment variables.
const PythonEchoEnv = `
import os

def handler(event, context):
    env_vars = {}
    for key in event.get('keys', []):
        env_vars[key] = os.environ.get(key, '')
    return {
        'statusCode': 200,
        'body': env_vars
    }
`

// PythonError is a Python function that raises an error.
const PythonError = `
def handler(event, context):
    raise ValueError("Intentional error for testing")
`

// PythonSlowFunction is a Python function that sleeps for a specified time.
const PythonSlowFunction = `
import time

def handler(event, context):
    sleep_time = event.get('sleep_seconds', 1)
    time.sleep(sleep_time)
    return {
        'statusCode': 200,
        'body': f'Slept for {sleep_time} seconds'
    }
`

// PythonComputeSum is a Python function that computes the sum of numbers.
const PythonComputeSum = `
def handler(event, context):
    numbers = event.get('numbers', [])
    total = sum(numbers)
    return {
        'statusCode': 200,
        'body': {'sum': total, 'count': len(numbers)}
    }
`

// NodeJSHelloWorld is a simple Node.js function that returns a greeting.
const NodeJSHelloWorld = `
exports.handler = async (event, context) => {
    const name = event.name || 'World';
    return {
        statusCode: 200,
        body: 'Hello, ' + name + '!'
    };
};
`

// NodeJSEchoEnv is a Node.js function that echoes environment variables.
const NodeJSEchoEnv = `
exports.handler = async (event, context) => {
    const envVars = {};
    const keys = event.keys || [];
    keys.forEach(key => {
        envVars[key] = process.env[key] || '';
    });
    return {
        statusCode: 200,
        body: envVars
    };
};
`

// NodeJSError is a Node.js function that throws an error.
const NodeJSError = `
exports.handler = async (event, context) => {
    throw new Error('Intentional error for testing');
};
`

// NodeJSAsyncFunction is a Node.js function that demonstrates async operations.
const NodeJSAsyncFunction = `
exports.handler = async (event, context) => {
    const delay = event.delay_ms || 100;
    await new Promise(resolve => setTimeout(resolve, delay));
    return {
        statusCode: 200,
        body: { message: 'Completed after ' + delay + 'ms delay' }
    };
};
`

// NodeJSComputeFibonacci is a Node.js function that computes Fibonacci numbers.
const NodeJSComputeFibonacci = `
exports.handler = async (event, context) => {
    const n = event.n || 10;
    const fib = (n) => {
        if (n <= 1) return n;
        return fib(n - 1) + fib(n - 2);
    };
    const result = fib(n);
    return {
        statusCode: 200,
        body: { n: n, fibonacci: result }
    };
};
`

// DefaultTestFunctions provides pre-configured test function requests.
var DefaultTestFunctions = map[string]*CreateFunctionRequest{
	"python-hello": {
		Name:        "", // Set dynamically
		Description: "E2E test Python hello world function",
		Runtime:     "python3.11",
		Handler:     "handler",
		Code:        PythonHelloWorld,
		MemoryMB:    256,
		TimeoutSec:  30,
	},
	"python-env": {
		Name:        "", // Set dynamically
		Description: "E2E test Python env echo function",
		Runtime:     "python3.11",
		Handler:     "handler",
		Code:        PythonEchoEnv,
		MemoryMB:    256,
		TimeoutSec:  30,
	},
	"python-error": {
		Name:        "", // Set dynamically
		Description: "E2E test Python error function",
		Runtime:     "python3.11",
		Handler:     "handler",
		Code:        PythonError,
		MemoryMB:    256,
		TimeoutSec:  30,
	},
	"python-slow": {
		Name:        "", // Set dynamically
		Description: "E2E test Python slow function",
		Runtime:     "python3.11",
		Handler:     "handler",
		Code:        PythonSlowFunction,
		MemoryMB:    256,
		TimeoutSec:  60,
	},
	"nodejs-hello": {
		Name:        "", // Set dynamically
		Description: "E2E test Node.js hello world function",
		Runtime:     "nodejs20",
		Handler:     "handler",
		Code:        NodeJSHelloWorld,
		MemoryMB:    256,
		TimeoutSec:  30,
	},
	"nodejs-env": {
		Name:        "", // Set dynamically
		Description: "E2E test Node.js env echo function",
		Runtime:     "nodejs20",
		Handler:     "handler",
		Code:        NodeJSEchoEnv,
		MemoryMB:    256,
		TimeoutSec:  30,
	},
	"nodejs-error": {
		Name:        "", // Set dynamically
		Description: "E2E test Node.js error function",
		Runtime:     "nodejs20",
		Handler:     "handler",
		Code:        NodeJSError,
		MemoryMB:    256,
		TimeoutSec:  30,
	},
	"nodejs-async": {
		Name:        "", // Set dynamically
		Description: "E2E test Node.js async function",
		Runtime:     "nodejs20",
		Handler:     "handler",
		Code:        NodeJSAsyncFunction,
		MemoryMB:    256,
		TimeoutSec:  30,
	},
}

// GetTestFunction returns a copy of a test function configuration.
func GetTestFunction(key string) *CreateFunctionRequest {
	template, ok := DefaultTestFunctions[key]
	if !ok {
		return nil
	}
	// Create a copy
	req := *template
	req.Name = GenerateTestName(key)
	return &req
}
