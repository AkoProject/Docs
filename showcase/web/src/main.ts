import { createApp } from 'vue'
import { Ako, AkoBootView } from '@ako-dev/ako'

createApp(AkoBootView)
  .use(new Ako(), { baseUrl: '/api/ako/' })
  .mount('#app')
