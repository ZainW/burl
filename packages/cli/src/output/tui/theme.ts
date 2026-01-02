type ColorMode = "dark" | "light";

interface ThemePalette {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  text: string;
  textMuted: string;
  textDim: string;
  border: string;
  borderMuted: string;
  surface: string;
}

const darkPalette: ThemePalette = {
  primary: "#7aa2f7",
  secondary: "#bb9af7",
  accent: "#7dcfff",
  success: "#9ece6a",
  warning: "#e0af68",
  error: "#f7768e",
  text: "#c0caf5",
  textMuted: "#565f89",
  textDim: "#414868",
  border: "#565f89",
  borderMuted: "#3b4261",
  surface: "#1a1b26",
};

const lightPalette: ThemePalette = {
  primary: "#2e7de9",
  secondary: "#9854f1",
  accent: "#007197",
  success: "#587539",
  warning: "#8c6c3e",
  error: "#f52a65",
  text: "#3760bf",
  textMuted: "#6172b0",
  textDim: "#8990b3",
  border: "#6172b0",
  borderMuted: "#a8aecb",
  surface: "#e1e2e7",
};

const ansiFallback: ThemePalette = {
  primary: "blue",
  secondary: "magenta",
  accent: "cyan",
  success: "green",
  warning: "yellow",
  error: "red",
  text: "white",
  textMuted: "gray",
  textDim: "blackBright",
  border: "gray",
  borderMuted: "blackBright",
  surface: "black",
};

function detectTrueColorSupport(): boolean {
  const colorterm = process.env.COLORTERM;
  if (colorterm === "truecolor" || colorterm === "24bit") {
    return true;
  }

  const term = process.env.TERM;
  if (term?.includes("256color") || term?.includes("truecolor")) {
    return true;
  }

  const termProgram = process.env.TERM_PROGRAM;
  const trueColorTerminals = [
    "iTerm.app",
    "Apple_Terminal",
    "Hyper",
    "vscode",
    "WarpTerminal",
    "Tabby",
    "Alacritty",
    "kitty",
    "WezTerm",
    "ghostty",
  ];
  if (termProgram && trueColorTerminals.includes(termProgram)) {
    return true;
  }

  if (process.env.WT_SESSION) return true;
  if (process.env.KONSOLE_VERSION) return true;
  if (process.env.GNOME_TERMINAL_SCREEN) return true;

  return false;
}

function detectColorMode(): ColorMode {
  const colorfgbg = process.env.COLORFGBG;
  if (colorfgbg) {
    const parts = colorfgbg.split(";");
    const bg = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(bg)) {
      if (bg === 0 || bg === 8 || (bg >= 232 && bg <= 243)) {
        return "dark";
      }
      if (bg === 7 || bg === 15 || (bg >= 244 && bg <= 255)) {
        return "light";
      }
    }
  }

  const termProgram = process.env.TERM_PROGRAM;
  if (termProgram === "Apple_Terminal") {
    return "light";
  }

  if (process.env.VSCODE_THEME_KIND === "light") {
    return "light";
  }

  return "dark";
}

function createTheme(): ThemePalette {
  const supportsTrueColor = detectTrueColorSupport();

  if (!supportsTrueColor) {
    return ansiFallback;
  }

  const mode = detectColorMode();
  return mode === "light" ? lightPalette : darkPalette;
}

export const theme = createTheme();

export function getThemeInfo(): { trueColor: boolean; mode: ColorMode } {
  return {
    trueColor: detectTrueColorSupport(),
    mode: detectColorMode(),
  };
}
