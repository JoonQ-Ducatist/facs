/** Build-time Tailwind configuration: the public app must not depend on the CDN at runtime. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'primary-container': '#0e1c2d', 'cyan-glow': '#735c00', outline: '#74777d',
        'surface-container-lowest': '#ffffff', 'surface-container-low': '#f5f3ee',
        'surface-container': '#f0eee9', 'surface-container-high': '#eae8e3',
        'surface-container-highest': '#e4e2dd', 'on-background': '#1b1c19',
        'on-surface-variant': '#44474c', background: '#f9f7f2',
      },
      fontFamily: {
        headline: ['Pretendard Variable', 'Pretendard', 'sans-serif'],
        body: ['Pretendard Variable', 'Pretendard', 'sans-serif'],
        mono: ['Inter', 'sans-serif'],
      },
    },
  },
};
