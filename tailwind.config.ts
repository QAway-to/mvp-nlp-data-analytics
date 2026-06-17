import type { Config } from "tailwindcss"

export default <Config>{
    content: [
        "./components/**/*.{js,vue,ts}",
        "./layouts/**/*.vue",
        "./pages/**/*.vue",
        "./plugins/**/*.{js,ts}",
        "./app.vue",
        "./error.vue"
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                here: {
                    purple: {
                        50:  "#EEF2FF",
                        100: "#E0E7FF",
                        400: "#818CF8",
                        500: "#6366F1",
                        600: "#6366F1",
                        700: "#4F46E5",
                        900: "#312E81",
                    },
                    gray: {
                        50:  "#0F0F13",
                        100: "#13131A",
                        200: "#1E1E2E",
                        900: "#E2E8F0",
                    }
                }
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            }
        }
    },
    plugins: []
}