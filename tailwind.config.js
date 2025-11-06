/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Theme colors - ensure these are never purged
    'bg-purple-600', 'bg-blue-600', 'bg-green-600',
    'hover:bg-purple-700', 'hover:bg-blue-700', 'hover:bg-green-700',
    'bg-purple-500', 'bg-blue-500', 'bg-green-500',
    'bg-purple-100', 'bg-blue-100', 'bg-green-100',
    'bg-purple-200', 'bg-blue-200', 'bg-green-200',
    'border-purple-300', 'border-blue-300', 'border-green-300',
    'border-purple-600', 'border-blue-600', 'border-green-600',
    'text-purple-700', 'text-blue-700', 'text-green-700',
    'text-purple-900', 'text-blue-900', 'text-green-900',
    'text-purple-600', 'text-blue-600', 'text-green-600',
    'text-purple-400', 'text-blue-400', 'text-green-400',
    'bg-purple-400/30', 'bg-blue-400/30', 'bg-green-400/30',
    'from-purple-500', 'from-blue-500', 'from-green-500',
    'to-purple-600', 'to-blue-600', 'to-green-600',
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
