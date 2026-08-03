import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

// Dos capas de tokens:
// - shadcn (--background, --primary…) para los componentes de ui/ y la landing.
// - Capa "surface / on-surface" estilo Material 3, igual estructura que
//   EcomfyCalls v2, pero con los colores de OMNI Scale sacados del logo:
//   navy #16243d, azul acero #364a6f y crimson #d10754.
export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // --- Capa surface / on-surface (panel interno) ---
        "surface-bright": "#f7f9fc",
        surface: "#f7f9fc",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f1f5fa",
        "surface-container": "#e9eff7",
        "surface-container-high": "#dde5f0",
        "surface-container-highest": "#d3dded",
        "surface-variant": "#e9eff7",
        "on-surface": "#16243d",
        "on-surface-variant": "#4b5a72",
        outline: "#7b879b",
        "outline-variant": "#d8dfe9",
        "inverse-surface": "#16243d",
        "inverse-on-surface": "#eef2f8",
        // marca
        brand: "#16243d",
        "brand-steel": "#364a6f",
        "brand-crimson": "#d10754",
        "primary-container": "#223454",
        "on-primary-container": "#a9b8d4",
        // estados
        success: "#0ca30c",
        "on-success": "#ffffff",
        warning: "#ec835a",
        error: "#d03b3b",
        "on-error": "#ffffff",
        "error-container": "#fdeaea",
      },
      spacing: {
        base: "4px",
        xs: "8px",
        sm: "16px",
        md: "24px",
        gutter: "24px",
        lg: "32px",
        margin: "32px",
        xl: "48px",
      },
      fontSize: {
        "label-sm": ["11px", { lineHeight: "14px", fontWeight: "500" }],
        "label-md": [
          "12px",
          { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "600" },
        ],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "headline-sm": ["18px", { lineHeight: "24px", fontWeight: "600" }],
        "headline-md": [
          "24px",
          { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600" },
        ],
        "headline-lg": [
          "32px",
          { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" },
        ],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "0.75rem",
      },
      backgroundImage: {
        // Cuadrícula tenue del hero, igual que en omniscale.pe
        grid: `linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)`,
      },
      backgroundSize: {
        "grid-cell": "72px 72px",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
