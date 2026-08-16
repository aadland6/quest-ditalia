// router.js — tiny screen router. Screens register render functions; show() swaps them.
const screens = {};
let current = null;
let navUpdate = () => {};

export const registerScreen = (name, render) => { screens[name] = render; };
export const setNavUpdater = fn => { navUpdate = fn; };
export const currentScreen = () => current;

export function show(name, params = {}) {
  const render = screens[name];
  if (!render) { console.error('no screen', name); return; }
  current = { name, params };
  const el = document.getElementById('screen');
  el.scrollTop = 0;
  el.innerHTML = '';
  render(el, params);
  navUpdate(name);
}

// re-render the current screen in place (after state changes)
export function refresh() {
  if (current) show(current.name, current.params);
}
