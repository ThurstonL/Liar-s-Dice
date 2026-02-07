/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'dice-red': '#dc2626',
                'dice-gold': '#f59e0b',
                'felt-green': '#166534',
                'felt-dark': '#14532d',
            },
            fontFamily: {
                'display': ['Outfit', 'sans-serif'],
                'body': ['Inter', 'sans-serif'],
            },
            animation: {
                'dice-roll': 'diceRoll 0.6s ease-out',
                'shake': 'shake 0.5s ease-in-out',
                'pulse-glow': 'pulseGlow 2s infinite',
            },
            keyframes: {
                diceRoll: {
                    '0%': { transform: 'rotateX(0deg) rotateY(0deg)' },
                    '50%': { transform: 'rotateX(180deg) rotateY(180deg)' },
                    '100%': { transform: 'rotateX(360deg) rotateY(360deg)' },
                },
                shake: {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '25%': { transform: 'translateX(-5px)' },
                    '75%': { transform: 'translateX(5px)' },
                },
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0.5)' },
                    '50%': { boxShadow: '0 0 40px rgba(245, 158, 11, 0.8)' },
                },
            },
        },
    },
    plugins: [],
};
