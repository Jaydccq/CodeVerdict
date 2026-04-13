import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';

import './styles/main.css';
import { initThemeColors } from './config/theme';

initThemeColors();

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
