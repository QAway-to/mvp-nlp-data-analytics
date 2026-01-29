import type { Config } from 'tailwindcss'

export default <Config>{
    content: [
        './components/**/*.{js,vue,ts}',
        './layouts/**/*.vue',
        './pages/**/*.vue',
        './plugins/**/*.{js,ts}',
        './app.vue',
        './error.vue'
    ],
    theme: {
        extend: {
            colors: {
                // HereCRM Palette
                here: {
                    purple: {
                        50: '#F5F3FF',
                        100: '#EDE9FE',
                        500: '#8B5CF6',
                        600: '#7C3AED', // Primary action color
                        700: '#6D28D9',
                    },
                    gray: {
                        50: '#F9FAFB', // App background
                        100: '#F3F4F6', // Secondary background
                        200: '#E5E7EB', // Borders
                        900: '#111827', // Headings
                    }
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        }
    },
    plugins: []
}
