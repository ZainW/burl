#!/bin/bash
# Bash completion for burl

_burl_completions() {
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    # All available options
    opts="--connections -c --duration -d --requests -n --qps -q --timeout -t --warmup -w
          --method -m --header -H --body -b --body-file -B --content-type -T
          --http1 --http2 --auth -a --llm --output -o --format -f --no-tui --no-color
          --insecure -k --latency-correction --version -V --help -h --diagnose --upgrade"

    # Handle option-specific completions
    case "${prev}" in
        --method|-m)
            COMPREPLY=( $(compgen -W "GET POST PUT PATCH DELETE HEAD OPTIONS" -- ${cur}) )
            return 0
            ;;
        --format|-f)
            COMPREPLY=( $(compgen -W "text json csv markdown" -- ${cur}) )
            return 0
            ;;
        --llm)
            COMPREPLY=( $(compgen -W "json markdown" -- ${cur}) )
            return 0
            ;;
        --body-file|-B|--output|-o)
            # File completion
            COMPREPLY=( $(compgen -f -- ${cur}) )
            return 0
            ;;
        --auth|-a)
            # Suggest auth types
            if [[ ${cur} == *:* ]]; then
                # User is typing the value after the colon
                COMPREPLY=()
            else
                COMPREPLY=( $(compgen -W "basic: bearer:" -- ${cur}) )
            fi
            return 0
            ;;
        --content-type|-T)
            COMPREPLY=( $(compgen -W "application/json application/x-www-form-urlencoded text/plain text/html" -- ${cur}) )
            return 0
            ;;
        --connections|-c|--duration|-d|--requests|-n|--qps|-q|--timeout|-t|--warmup|-w|--header|-H|--body|-b)
            # No completion for these
            return 0
            ;;
    esac

    # Complete options
    if [[ ${cur} == -* ]]; then
        COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
        return 0
    fi

    # Complete URLs (basic http/https)
    if [[ ${cur} == http* ]]; then
        COMPREPLY=( $(compgen -W "http:// https://" -- ${cur}) )
        return 0
    fi
}

complete -F _burl_completions burl
