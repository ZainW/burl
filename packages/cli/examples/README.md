# burl Configuration Examples

## Config File (.burlrc)

burl supports configuration files to set default options and create reusable profiles.

### Config File Location

burl looks for config files in this order:
1. `./.burlrc` (current directory)
2. `~/.burlrc` (home directory)

CLI arguments always override config file values.

### Basic Example

```json
{
  "connections": 20,
  "duration": "30s",
  "timeout": "10s",
  "http2": true
}
```

Save this as `.burlrc` in your project directory, and these values will be used as defaults:

```bash
# Uses connections=20, duration=30s from config
burl https://api.example.com

# Override config with CLI args
burl https://api.example.com -c 50 -d 60s
```

### Profiles

Create reusable profiles for different scenarios:

```json
{
  "profiles": {
    "quick": {
      "connections": 5,
      "duration": "5s"
    },
    "load-test": {
      "connections": 100,
      "duration": "60s",
      "qps": 1000
    }
  }
}
```

Use profiles with the `--profile` flag (coming soon):

```bash
burl https://api.example.com --profile load-test
```

### Common Use Cases

#### API Development

```json
{
  "connections": 10,
  "duration": "10s",
  "warmup": 5,
  "headers": {
    "Authorization": "Bearer ${DEV_TOKEN}",
    "X-Environment": "development"
  }
}
```

#### CI/CD Integration

```json
{
  "connections": 20,
  "duration": "30s",
  "format": "json",
  "output": "benchmark-results.json",
  "noTui": true,
  "quiet": true
}
```

#### GraphQL Testing

```json
{
  "method": "POST",
  "contentType": "application/json",
  "headers": {
    "Accept": "application/json"
  }
}
```

Then use it:

```bash
burl https://api.example.com/graphql \
  -b '{"query": "{ users { id name } }"}'
```

#### Load Testing

```json
{
  "connections": 100,
  "duration": "60s",
  "warmup": 10,
  "qps": 5000,
  "timeout": "5s"
}
```

### Environment Variables

You can reference environment variables in config files using `${VAR_NAME}` syntax:

```json
{
  "headers": {
    "Authorization": "Bearer ${API_TOKEN}",
    "X-API-Key": "${API_KEY}"
  },
  "auth": "bearer:${BEARER_TOKEN}"
}
```

Before running burl, set the environment variables:

```bash
export API_TOKEN="your-token-here"
burl https://api.example.com
```

### All Available Options

```json
{
  "connections": 10,
  "duration": "30s",
  "requests": 1000,
  "qps": 100,
  "timeout": "10s",
  "warmup": 0,

  "method": "GET",
  "headers": {
    "Custom-Header": "value"
  },
  "body": "{\"key\": \"value\"}",
  "bodyFile": "./payload.json",
  "contentType": "application/json",

  "http1": false,
  "http2": true,
  "http3": false,

  "auth": "bearer:token",

  "llm": "json",
  "output": "results.json",
  "format": "text",
  "noTui": false,
  "noColor": false,
  "verbose": false,
  "quiet": false,

  "insecure": false,
  "latencyCorrection": false
}
```

### Tips

1. **Project-specific configs**: Keep `.burlrc` in your project root for team-wide defaults
2. **Personal configs**: Use `~/.burlrc` for your personal preferences across all projects
3. **CLI overrides**: CLI arguments always win, so you can override config values as needed
4. **Validation**: If your config has errors, burl will show a warning and continue with CLI args only

### See Also

- Full example: [.burlrc.example](./.burlrc.example)
- Documentation: [Config file docs](../../../packages/docs/content/2.guide/6.configuration.md)
