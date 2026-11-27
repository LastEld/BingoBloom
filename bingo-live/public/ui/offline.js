let installPrompt;
let offlineStatus = 'Подготавливаем доску и гербарий для открытия без сети…';
const refresh = () => document.querySelectorAll('offline-settings').forEach(panel => panel.update());

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  refresh();
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  refresh();
});

class OfflineSettings extends HTMLElement {
  connectedCallback() { this.update(); }
  update() {
    const section = document.createElement('section');
    section.className = 'backup-controls';
    const heading = document.createElement('h3');
    heading.textContent = 'Без сети и установка';
    const status = document.createElement('p');
    status.className = 'hint';
    status.setAttribute('role', 'status');
    status.textContent = offlineStatus;
    section.append(heading, status);
    if (installPrompt && !matchMedia('(display-mode: standalone)').matches) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn';
      button.textContent = 'Установить Bingo Bloom';
      button.onclick = async () => {
        const prompt = installPrompt;
        if (!prompt) return;
        installPrompt = null;
        refresh();
        try { await prompt.prompt(); } catch { /* The browser may withdraw the prompt. */ }
      };
      section.append(button);
    }
    this.replaceChildren(section);
  }
}
customElements.define('offline-settings', OfflineSettings);

async function prepareOffline() {
  try {
    if (!('serviceWorker' in navigator)) throw new Error();
    const registration = await navigator.serviceWorker.register('/sw.js');
    if (!registration.active && registration.installing) {
      const worker = registration.installing;
      await new Promise((resolve, reject) => {
        const check = () => {
          if (worker.state === 'activated') resolve();
          else if (worker.state === 'redundant') reject(new Error());
        };
        worker.addEventListener('statechange', check);
        check();
      });
    }
    await navigator.serviceWorker.ready;
    offlineStatus = 'Доска, рисунки и гербарий готовы к открытию без сети на этом устройстве.';
  } catch {
    offlineStatus = 'Офлайн-копия недоступна. Для открытия игры потребуется сеть.';
  }
  refresh();
}
prepareOffline();
