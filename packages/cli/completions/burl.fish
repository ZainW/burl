# Fish completion for burl

# Connection options
complete -c burl -s c -l connections -d "Concurrent connections" -x
complete -c burl -s d -l duration -d "Test duration (e.g., 10s, 1m)" -x
complete -c burl -s n -l requests -d "Total requests" -x
complete -c burl -s q -l qps -d "Rate limit in queries per second" -x
complete -c burl -s t -l timeout -d "Request timeout" -x
complete -c burl -s w -l warmup -d "Warmup requests" -x

# Request options
complete -c burl -s m -l method -d "HTTP method" -xa "GET POST PUT PATCH DELETE HEAD OPTIONS"
complete -c burl -s H -l header -d "Custom header (repeatable)" -x
complete -c burl -s b -l body -d "Request body" -x
complete -c burl -s B -l body-file -d "Request body from file" -r
complete -c burl -s T -l content-type -d "Content-Type header" -xa "application/json application/x-www-form-urlencoded text/plain text/html"

# HTTP version
complete -c burl -l http1 -d "Force HTTP/1.1"
complete -c burl -l http2 -d "Force HTTP/2"

# Authentication
complete -c burl -s a -l auth -d "Authentication (basic:user:pass or bearer:token)" -x

# Output options
complete -c burl -l llm -d "LLM output format" -xa "json markdown"
complete -c burl -s o -l output -d "Write results to file" -r
complete -c burl -s f -l format -d "Output format" -xa "text json csv markdown"
complete -c burl -l no-tui -d "Disable rich TUI"
complete -c burl -l no-color -d "Disable colors"

# Other options
complete -c burl -s k -l insecure -d "Skip TLS verification"
complete -c burl -l latency-correction -d "Enable latency correction"
complete -c burl -l diagnose -d "Run diagnostic mode"
complete -c burl -l upgrade -d "Upgrade to latest version"
complete -c burl -s V -l version -d "Show version"
complete -c burl -s h -l help -d "Show help"
