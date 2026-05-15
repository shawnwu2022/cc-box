import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import i18n from './i18n'

import './styles/global.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)
app.mount('#app')

// 生产环境下禁用右键菜单
if (import.meta.env.PROD) {
  window.addEventListener('contextmenu', (e) => e.preventDefault())
}