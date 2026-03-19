import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0f1117',
          surface: '#1a1d27',
          border: '#2a2d3a',
          accent: '#6c63ff',
          'accent-hover': '#5a52e0',
          text: '#e2e8f0',
          muted: '#94a3b8',
          green: '#22c55e',
          amber: '#f59e0b',
          red: '#ef4444',
        },
      },
    },
  },
  plugins: [],
};

export default config;
