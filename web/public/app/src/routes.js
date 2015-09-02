import App from './views/app';
import Home from './views/home';

const routes = [
  {component: App, childRoutes: [
    {path: '/', component: Home},
  ]},
];

export default routes;
