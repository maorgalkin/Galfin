/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Grid columns
    'grid',
    'grid-cols-1',
    'grid-cols-2',
    'grid-cols-3',
    'sm:grid-cols-1',
    'sm:grid-cols-2',
    'sm:grid-cols-3',
    'md:grid-cols-2',
    'md:grid-cols-3',
    'lg:grid-cols-2',
    'lg:grid-cols-3',
    'xl:grid-cols-5',
    // Layout
    'gap-3',
    'text-center',
    'justify-center',
    'items-center',
    'flex-1',
    'flex-shrink-0',
    'min-h-[100px]',
    // Text sizes
    'text-lg',
    'sm:text-xl',
    'lg:text-2xl'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
