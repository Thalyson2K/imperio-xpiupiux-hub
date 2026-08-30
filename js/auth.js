function exibirMensagem(node, texto, tipo) {
  if (!node) return;
  node.className = `mt-4 text-center text-sm font-bold block ${tipo === 'erro' ? 'text-red-500' : tipo === 'ok' ? 'text-green-400' : 'text-amber-400'}`;
  node.textContent = texto;
}

function normalizarMembro(membro) {
  return {
    ...membro,
    id: membro.id || Date.now(),
    name: membro.name || membro.nick,
    nick: membro.nick || membro.name,
    className: membro.className || membro.classe,
    classe: membro.classe || membro.className,
    approved: membro.approved ?? membro.status === 'aprovado',
    status: membro.status || (membro.approved ? 'aprovado' : 'pendente')
  };
}

function isAdminLogin(form) {
  const user = form.querySelector('#adminUser, #adm-email')?.value?.trim();
  const password = form.querySelector('#adminPassword, #adm-senha')?.value?.trim();
  return user === APP_CONFIG.defaults.adminUser || (user === 'admin@imperio.com' && password === 'imperio123');
}

async function cadastrarMembro(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const nick = document.getElementById('cad-nick')?.value.trim();
  const classe = document.getElementById('cad-classe')?.value;
  const email = document.getElementById('cad-email')?.value.trim();
  const senha = document.getElementById('cad-senha')?.value.trim();
  const msg = document.getElementById('msg-cadastro');

  exibirMensagem(msg, '⏳ Enviando solicitação...', 'aguarde');

  if (!nick || !classe || !email || !senha) {
    exibirMensagem(msg, '❌ Preencha todos os campos.', 'erro');
    return;
  }

  const duplicado = [...MEMBERS, ...PENDING_MEMBERS].some((membro) => {
    const membroNick = (membro.nick || membro.name || '').toLowerCase();
    return membroNick === nick.toLowerCase() || (membro.email || '').toLowerCase() === email.toLowerCase();
  });
  if (duplicado) {
    exibirMensagem(msg, '❌ O Nick ou e-mail já foi cadastrado.', 'erro');
    return;
  }

  const registro = { nick, classe, email, senha, status: 'pendente', is_admin: false, acesso_mercado: false, resets: 0, cargo: 'Membro' };
  let inseridoNoBanco = false;

  if (window.db && typeof window.db.from === 'function') {
    try {
      const { data: nickExistente } = await window.db.from('membros').select('nick').ilike('nick', nick).maybeSingle();
      if (nickExistente) {
        exibirMensagem(msg, `❌ O Nick "${nick}" já está cadastrado!`, 'erro');
        return;
      }

      const { data: emailExistente } = await window.db.from('membros').select('email').eq('email', email).maybeSingle();
      if (emailExistente) {
        exibirMensagem(msg, `❌ O E-mail "${email}" já foi cadastrado!`, 'erro');
        return;
      }

      const { error } = await window.db.from('membros').insert([registro]);
      if (!error) inseridoNoBanco = true;
    } catch (error) {
      console.warn('Supabase indisponível; usando fila local.', error);
    }
  }

  const membroPendente = normalizarMembro({ ...registro, id: Date.now(), name: nick, className: classe, password: senha, level: 150, approved: false });
  PENDING_MEMBERS.push(membroPendente);
  MEMBERS.push(membroPendente);

  exibirMensagem(msg, inseridoNoBanco ? '✅ Solicitação enviada! Aguarde a validação do Guild Master.' : '✅ Solicitação salva localmente! Aguarde a validação do Guild Master.', 'ok');
  form.reset();
}

function renderPendingMembers() {
  const container = document.getElementById('pendingMembers');
  const counter = document.getElementById('pendingCounter');
  if (!container) return;

  if (!PENDING_MEMBERS.length) {
    container.innerHTML = '<div class="empty-state">Nenhuma solicitação pendente no momento.</div>';
    if (counter) counter.textContent = '0 pendentes';
    return;
  }

  container.innerHTML = PENDING_MEMBERS.map((member) => `
    <div class="member-item">
      <div class="details">
        <strong>${member.name}</strong>
        <span>${member.className} • Nível ${member.level}</span>
        <span>${member.email}</span>
      </div>
      <div class="member-actions">
        <button class="primary-button small-button" type="button" data-action="approve" data-id="${member.id}">Aprovar</button>
        <button class="ghost-button" type="button" data-action="reject" data-id="${member.id}">Rejeitar</button>
      </div>
    </div>
  `).join('');

  if (counter) {
    counter.textContent = `${PENDING_MEMBERS.length} pendentes`;
  }
}

function renderMarketAdmin() {
  const container = document.getElementById('vipMarketAdmin');
  if (!container) return;

  container.innerHTML = MARKET_OFFERS.map((offer) => `
    <div class="admin-offer-item">
      <div class="details">
        <strong>${offer.title}</strong>
        <span>${offer.seller} • ${offer.price}</span>
        <span>${offer.description}</span>
      </div>
      <div class="offer-actions">
        <button class="ghost-button" type="button" data-offer-action="toggle" data-offer-id="${offer.id}">${offer.favorite ? 'Desfavoritar' : 'Favoritar'}</button>
      </div>
    </div>
  `).join('');
}

function bindMemberActions() {
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const { action, id } = button.dataset;
      const index = PENDING_MEMBERS.findIndex((member) => String(member.id) === String(id));
      if (index === -1) return;

      if (action === 'approve') {
        const approved = PENDING_MEMBERS.splice(index, 1)[0];
        MEMBERS.push({ ...approved, approved: true, password: '123456' });
      } else {
        PENDING_MEMBERS.splice(index, 1);
      }

      renderPendingMembers();
    });
  });
}

function bindMarketActions() {
  document.querySelectorAll('[data-offer-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const { offerId } = button.dataset;
      const offer = MARKET_OFFERS.find((item) => String(item.id) === String(offerId));
      if (!offer) return;
      offer.favorite = !offer.favorite;
      renderMarketAdmin();
      bindMarketActions();
    });
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'empty-state';
  toast.style.position = 'fixed';
  toast.style.right = '20px';
  toast.style.bottom = '20px';
  toast.style.zIndex = '1000';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

function setupAuthForms() {
  const memberLoginForm = document.getElementById('memberLoginForm');
  if (memberLoginForm) {
    memberLoginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value.trim();
      const user = MEMBERS.find((member) => member.email === email && member.password === password && member.approved);

      if (user) {
        saveSession({ id: user.id, name: user.name, email: user.email, role: 'member' });
        window.location.href = 'index.html';
      } else {
        showToast('Credenciais inválidas ou usuário não aprovado.');
      }
    });
  }

  const adminLoginForm = document.getElementById('adminLoginForm');
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (isAdminLogin(adminLoginForm)) {
        saveAdminSession({ name: 'Guild Master', role: 'admin' });
        window.location.href = 'admin.html';
      } else {
        showToast('Credenciais de admin inválidas.');
      }
    });
  }

  const formCadastro = document.getElementById('form-cadastro');
  if (formCadastro) {
    formCadastro.addEventListener('submit', cadastrarMembro);
  }

  const addOfferButton = document.getElementById('addOfferButton');
  if (addOfferButton) {
    addOfferButton.addEventListener('click', () => {
      const nextId = MARKET_OFFERS.length ? Math.max(...MARKET_OFFERS.map((offer) => offer.id)) + 1 : 1;
      MARKET_OFFERS.push({
        id: nextId,
        title: `Oferta ${nextId}`,
        price: '10.000',
        seller: 'Guild Master',
        description: 'Nova oferta cadastrada pelo painel administrativo.',
        favorite: false
      });
      renderMarketAdmin();
      bindMarketActions();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderPendingMembers();
  renderMarketAdmin();
  bindMemberActions();
  bindMarketActions();
  setupAuthForms();
});
