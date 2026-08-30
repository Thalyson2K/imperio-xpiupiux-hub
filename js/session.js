const STORAGE_KEYS = {
  session: 'imperio_session',
  admin: 'imperio_admin_session'
};

const NAV_ITEMS = [
  { label: 'Home', href: 'index.html', public: true },
  { label: 'Mercado VIP', href: 'mercado.html', public: true },
  { label: 'Presença', href: 'presenca.html', public: true },
  { label: 'Admin', href: 'admin.html', public: true },
  { label: 'Membros', href: 'login.html', public: true }
];

function saveSession(user) {
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(user));
  localStorage.setItem('usuario_logado', JSON.stringify(user));
}

function saveAdminSession(user) {
  localStorage.setItem(STORAGE_KEYS.admin, JSON.stringify(user));
  localStorage.setItem('usuario_logado', JSON.stringify({
    ...user,
    is_admin: true,
    nick: user.nick || user.name || 'Guild Master',
    name: user.name || user.nick || 'Guild Master'
  }));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.session);
  localStorage.removeItem(STORAGE_KEYS.admin);
  localStorage.removeItem('usuario_logado');
}

function getStoredSession() {
  const raw = localStorage.getItem(STORAGE_KEYS.session);
  return raw ? JSON.parse(raw) : null;
}

function getStoredAdminSession() {
  const raw = localStorage.getItem(STORAGE_KEYS.admin);
  return raw ? JSON.parse(raw) : null;
}

function obterUsuarioLogado() {
  const dados = localStorage.getItem('usuario_logado');
  return dados ? JSON.parse(dados) : null;
}

function fazerLogout() {
  clearSession();
  window.location.href = 'login.html';
}

function getUserName() {
  const session = obterUsuarioLogado() || getStoredSession();
  if (session && (session.name || session.nick)) return session.name || session.nick;
  const admin = getStoredAdminSession();
  if (admin && (admin.name || admin.nick)) return admin.name || admin.nick;
  return 'Visitante';
}

function renderHeaderNav() {
  const navContainer = document.getElementById('header-nav') || document.querySelector('nav div.flex.space-x-6');
  if (!navContainer) return;

  const usuario = obterUsuarioLogado() || getStoredSession() || getStoredAdminSession();
  const isLogged = !!usuario;

  if (!isLogged) {
    navContainer.innerHTML = NAV_ITEMS.map(({ label, href }) => {
      const isActive = window.location.pathname.endsWith(href) || (href === 'index.html' && window.location.pathname.endsWith('index.html'));
      return `<a class="${isActive ? 'text-red-400' : 'text-gray-300 hover:text-red-300'} transition-colors" href="${href}">${label}</a>`;
    }).join('');
    return;
  }

  const htmlLinks = `
    <a href="index.html" class="${window.location.pathname.endsWith('index.html') ? 'text-red-400' : 'text-gray-300 hover:text-red-300'} transition-colors">Dashboard</a>
    <a href="presenca.html" class="${window.location.pathname.endsWith('presenca.html') ? 'text-red-400' : 'text-gray-300 hover:text-red-300'} transition-colors">Bater Ponto</a>
    ${usuario.acesso_mercado || usuario.is_admin || usuario.role === 'admin' ? `<a href="mercado.html" class="${window.location.pathname.endsWith('mercado.html') ? 'text-amber-400' : 'text-amber-300 hover:text-amber-200'} transition-colors"><i class="fa-solid fa-cart-shopping mr-1"></i> Mercado VIP</a>` : ''}
    ${usuario.is_admin || usuario.role === 'admin' ? `<a href="admin.html" class="${window.location.pathname.endsWith('admin.html') ? 'text-red-400 font-bold' : 'text-red-300 hover:text-red-200'} transition-colors"><i class="fa-solid fa-crown mr-1"></i> Painel GM</a>` : ''}
    <span class="text-gray-400 font-normal">| <strong class="text-white">${usuario.nick || usuario.name || 'Usuário'}</strong></span>
    <button type="button" class="text-xs bg-red-950/80 border border-red-800 text-red-300 px-2.5 py-1 rounded" onclick="fazerLogout()"><i class="fa-solid fa-right-from-bracket mr-1"></i> Sair</button>
  `;

  navContainer.innerHTML = htmlLinks;
}

function updateSessionView() {
  const nameNode = document.getElementById('sessionName');
  if (nameNode) {
    nameNode.textContent = getUserName();
  }

  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      fazerLogout();
    });
  }
}

function enforcePageAccess() {
  const path = window.location.pathname.split('/').pop();
  const session = obterUsuarioLogado() || getStoredSession();
  const adminSession = getStoredAdminSession();

  if (['index.html', 'presenca.html', 'admin.html', 'mercado.html'].includes(path) && !session && !adminSession) {
    window.location.href = 'login.html';
    return;
  }

  if (path === 'admin.html' && (!session || !session.is_admin)) {
    alert('⛔ Acesso Negado! Área exclusiva do Guild Master.');
    window.location.href = 'index.html';
    return;
  }

  if (path === 'mercado.html' && (!session || (!session.acesso_mercado && !session.is_admin))) {
    alert('⛔ Acesso Restrito ao Radar VIP!');
    window.location.href = 'index.html';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const usuario = obterUsuarioLogado() || getStoredSession() || getStoredAdminSession();

  renderHeaderNav();
  updateSessionView();
  enforcePageAccess();

  const paginaAtual = window.location.pathname.split('/').pop();
  const paginasProtegidas = ['index.html', 'presenca.html', 'admin.html', 'mercado.html'];

  if (paginasProtegidas.includes(paginaAtual) && !usuario) {
    window.location.href = 'login.html';
    return;
  }

  if (paginaAtual === 'admin.html' && (!usuario || !usuario.is_admin)) {
    alert('⛔ Acesso Negado! Área exclusiva do Guild Master.');
    window.location.href = 'index.html';
    return;
  }

  if (usuario) {
    atualizarNavbar(usuario);
  }
});

function atualizarNavbar(usuario) {
  const user = usuario || obterUsuarioLogado() || getStoredSession() || getStoredAdminSession();
  const navContainer = document.getElementById('header-nav') || document.querySelector('nav div.flex.space-x-6');

  if (!navContainer || !user) return;

  let htmlLinks = `
    <a href="index.html" class="hover:text-red-400 transition">Dashboard</a>
    <a href="presenca.html" class="hover:text-red-400 transition">Bater Ponto</a>
  `;

  if (user.acesso_mercado || user.is_admin || user.role === 'admin') {
    htmlLinks += `<a href="mercado.html" class="text-amber-400 hover:underline"><i class="fa-solid fa-radar mr-1"></i> Radar VIP</a>`;
  }

  if (user.is_admin || user.role === 'admin') {
    htmlLinks += `<a href="admin.html" class="text-red-400 font-bold hover:underline"><i class="fa-solid fa-crown mr-1"></i> Painel GM</a>`;
  }

  htmlLinks += `
    <span class="text-gray-400 font-normal">| <strong class="text-white">${user.nick || user.name || 'Usuário'}</strong></span>
    <button onclick="fazerLogout()" class="text-xs bg-red-950/80 border border-red-800 text-red-300 px-2.5 py-1 rounded">
      <i class="fa-solid fa-right-from-bracket mr-1"></i> Sair
    </button>
  `;

  navContainer.innerHTML = htmlLinks;
}
