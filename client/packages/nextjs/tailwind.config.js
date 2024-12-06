/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
  theme: {
  	extend: {
  		colors: {
  			border: '#E2E8F0',
  			input: '#EDF2F7',
  			ring: '#CBD5E0',
  			background: '#FFFFFF',
  			foreground: '#1A202C',
  			primary: {
  				DEFAULT: '#1A202C',
  				foreground: '#FFFFFF'
  			},
  			secondary: {
  				DEFAULT: '#F97316', // Orange
  				foreground: '#FFFFFF'
  			},
  			destructive: {
  				DEFAULT: '#E53E3E',
  				foreground: '#FFFFFF'
  			},
  			muted: {
  				DEFAULT: '#F7FAFC',
  				foreground: '#4A5568'
  			},
  			accent: {
  				DEFAULT: '#F97316', // Orange
  				foreground: '#FFFFFF'
  			},
  			popover: {
  				DEFAULT: '#FFFFFF',
  				foreground: '#1A202C'
  			},
  			card: {
  				DEFAULT: '#FFFFFF',
  				foreground: '#1A202C'
  			}
  		},
  		borderRadius: {
  			lg: '0.5rem',
  			md: '0.375rem',
  			sm: '0.25rem'
  		},
  		animation: {
  			gradient: 'gradient 8s linear infinite',
  			meteor: 'meteor 5s linear infinite'
  		},
  		keyframes: {
  			gradient: {
  				to: {
  					backgroundPosition: 'var(--bg-size) 0'
  				}
  			},
  			meteor: {
  				'0%': {
  					transform: 'rotate(215deg) translateX(0)',
  					opacity: '1'
  				},
  				'70%': {
  					opacity: '1'
  				},
  				'100%': {
  					transform: 'rotate(215deg) translateX(-500px)',
  					opacity: '0'
  				}
  			}
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
