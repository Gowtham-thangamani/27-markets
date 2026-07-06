export default {
  plugins: {
    tailwindcss: {},
    // Auto-generates [dir="rtl"] / [dir="ltr"] variants for directional CSS
    // (margins, padding, position, text-align, transforms), so RTL works
    // site-wide without hand-flipping utility classes on every component.
    'postcss-rtlcss': {},
    autoprefixer: {},
  },
}
