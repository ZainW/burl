# Shell Completions for burl

This directory contains shell completion scripts for burl.

## Installation

### Bash

Add to your `~/.bashrc`:

```bash
source /path/to/burl/packages/cli/completions/burl.bash
```

Or copy to system completion directory:

```bash
# Linux
sudo cp burl.bash /etc/bash_completion.d/burl

# macOS (with bash-completion from Homebrew)
cp burl.bash $(brew --prefix)/etc/bash_completion.d/burl
```

### Zsh

Copy to your fpath:

```bash
# Find your fpath
echo $fpath

# Copy completion file (example location)
cp _burl /usr/local/share/zsh/site-functions/_burl
```

Or add to your `~/.zshrc`:

```zsh
fpath=(/path/to/burl/packages/cli/completions $fpath)
autoload -Uz compinit && compinit
```

### Fish

Copy to Fish completions directory:

```bash
cp burl.fish ~/.config/fish/completions/burl.fish
```

## Usage

After installation, you can use Tab completion with burl:

```bash
burl https://api.example.com --<TAB>
# Shows all available options

burl https://api.example.com --method <TAB>
# Shows: GET POST PUT PATCH DELETE HEAD OPTIONS

burl https://api.example.com --format <TAB>
# Shows: text json csv markdown
```

## Features

- **Option completion**: All CLI flags and options
- **Value completion**: Suggests valid values for format, method, content-type, etc.
- **File completion**: For `--body-file` and `--output` options
- **URL hints**: Basic http:// and https:// suggestions
