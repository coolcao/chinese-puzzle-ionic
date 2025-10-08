/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: "class", // 启用基于类的黑暗模式
  theme: {
    extend: {
      colors: {
        wood: {
          // 白天模式木质色系 - 基于主色(183,162,125)
          DEFAULT: 'rgb(183, 162, 125)',
          main: 'rgb(183, 162, 125)',
          light: 'rgb(205, 181, 144)',
          lighter: 'rgb(225, 208, 175)',
          dark: 'rgb(166, 143, 106)',
          darker: 'rgb(139, 119, 85)',
          text: 'rgb(93, 78, 55)',
          border: 'rgb(139, 115, 85)',
          hover: 'rgb(195, 172, 135)',
          bg: 'rgb(225, 208, 175)',
        },
        'dark-wood': {
          // 黑暗模式木质色系 - 非常暗的木色搭配
          DEFAULT: 'rgb(32, 27, 20)',
          main: 'rgb(45, 38, 28)',
          light: 'rgb(58, 49, 36)',
          lighter: 'rgb(72, 61, 45)',
          dark: 'rgb(32, 27, 20)',
          darker: 'rgb(32, 27, 20)',
          text: 'rgb(180, 170, 160)',
          border: 'rgb(65, 55, 40)',
          hover: 'rgb(52, 44, 32)',
          bg: 'rgb(25, 20, 15)',
        },
      },
    },
  },
  plugins: [],
}
