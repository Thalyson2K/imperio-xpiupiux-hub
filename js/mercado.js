let usuarioLogado = null;
const FAVORITOS_LOCAL_KEY = 'mercado_alertas_vip';

function getUsuarioLogado() {
  return typeof obterUsuarioLogado === 'function'
    ? obterUsuarioLogado()
    : JSON.parse(localStorage.getItem('usuario_logado') || 'null');
}

function obterNickUsuario() {
  return usuarioLogado?.nick || usuarioLogado?.name || 'Visitante';
}

function obterFavoritosLocais() {
  return JSON.parse(localStorage.getItem(FAVORITOS_LOCAL_KEY) || '[]');
}

function salvarFavoritosLocais(favoritos) {
  localStorage.setItem(FAVORITOS_LOCAL_KEY, JSON.stringify(favoritos));
}

function notificar(texto) {
  const caixa = document.getElementById('caixa-notificacao-topo');
  const txt = document.getElementById('texto-notificacao');
  if (caixa && txt) {
    txt.textContent = texto;
    caixa.classList.remove('hidden');
    caixa.classList.add('flex');
  }
}

function solicitarPermissaoNotificacao() {
  if (!('Notification' in window)) {
    notificar('Seu navegador não suporta notificações pop-up.');
    return;
  }

  Notification.requestPermission().then((permission) => {
    notificar(permission === 'granted' ? '✅ Notificações ativadas no seu navegador!' : 'Permissão de notificação negada.');
  });
}

async function carregarFavoritos() {
  const container = document.getElementById('lista-favoritos');
  if (!container) return;

  let favoritos = obterFavoritosLocais();
  if (window.db && typeof window.db.from === 'function') {
    try {
      const resultado = await window.db.from('mercado_favoritos').select('*').eq('nick_membro', obterNickUsuario());
      if (resultado.data) favoritos = resultado.data;
    } catch (error) {
      console.warn('Favoritos do Supabase indisponíveis; usando dados locais.', error);
    }
  }

  if (!favoritos.length) {
    container.innerHTML = '<p class="text-xs text-gray-500">Nenhum alerta ativo.</p>';
    return;
  }

  container.innerHTML = favoritos.map((favorito) => {
    const termo = favorito.termo_busca || favorito.termo;
    const preco = favorito.preco_maximo ?? favorito.preco;
    const moeda = favorito.moeda || favorito.moeda_pagamento || 'Qualquer';
    return `<div class="bg-gray-800/70 p-2.5 rounded border border-gray-700 flex justify-between items-center text-xs mb-2"><div><strong class="text-amber-400 block">${termo}</strong><span class="text-gray-400 text-[10px]">Moeda: <b class="text-white">${moeda}</b> ${preco ? `| Máx: ${preco}` : ''}</span></div><button type="button" onclick="deletarFavorito('${favorito.id}')" class="text-red-400 hover:text-red-300 p-1"><i class="fa-solid fa-trash-can"></i></button></div>`;
  }).join('');
}

async function criarFavorito(event) {
  event.preventDefault();

  const termo = document.getElementById('fav-termo')?.value.trim();
  const moeda = document.getElementById('fav-moeda')?.value || 'Qualquer';
  const preco = document.getElementById('fav-preco')?.value ? Number(document.getElementById('fav-preco').value) : null;
  if (!termo) return;

  const favorito = { id: Date.now(), nick_membro: obterNickUsuario(), termo_busca: termo, preco_maximo: preco, moeda, moeda_pagamento: moeda, termo, preco };
  let salvoNoBanco = false;

  if (window.db && typeof window.db.from === 'function') {
    try {
      const { error } = await window.db.from('mercado_favoritos').insert([{ nick_membro: favorito.nick_membro, termo_busca: termo, preco_maximo: preco, moeda }]);
      salvoNoBanco = !error;
    } catch (error) {
      console.warn('Não foi possível salvar o alerta no Supabase.', error);
    }
  }

  if (!salvoNoBanco) {
    const favoritos = obterFavoritosLocais();
    favoritos.push(favorito);
    salvarFavoritosLocais(favoritos);
  }

  document.getElementById('form-favorito')?.reset();
  await carregarFavoritos();
  notificar(`Alerta criado para "${termo}".`);
}

async function deletarFavorito(id) {
  let removidoDoBanco = false;
  if (window.db && typeof window.db.from === 'function') {
    try {
      const { error } = await window.db.from('mercado_favoritos').delete().eq('id', id);
      removidoDoBanco = !error;
    } catch (error) {
      console.warn('Não foi possível remover o alerta do Supabase.', error);
    }
  }

  if (!removidoDoBanco) salvarFavoritosLocais(obterFavoritosLocais().filter((favorito) => String(favorito.id) !== String(id)));
  carregarFavoritos();
}

function normalizarItem(item) {
  return {
    id: item.id,
    nome_item: item.nome_item || item.title,
    categoria: item.categoria || item.category || 'VIP',
    preco: item.preco ?? item.price,
    moeda: item.moeda || 'WCoins',
    vendedor: item.vendedor || item.seller,
    created_at: item.created_at || new Date().toISOString(),
    link_anuncio: item.link_anuncio || 'https://mulotus.net'
  };
}

function obterEstiloMoeda(moeda) {
  const valor = moeda ? moeda.toUpperCase() : 'WC';
  if (valor.includes('WC')) return 'text-amber-400 bg-amber-950/80 border-amber-600';
  if (valor.includes('HP')) return 'text-purple-400 bg-purple-950/80 border-purple-600';
  if (valor.includes('CREDIT')) return 'text-emerald-400 bg-emerald-950/80 border-emerald-600';
  if (valor.includes('JOIA') || valor.includes('BLESS') || valor.includes('SOUL')) return 'text-cyan-400 bg-cyan-950/80 border-cyan-600';
  return 'text-yellow-300 bg-yellow-950/80 border-yellow-600';
}

async function carregarItensMercado() {
  const tabela = document.getElementById('tabela-mercado');
  if (!tabela) return;

  let itens = [];
  if (window.db && typeof window.db.from === 'function') {
    try {
      const resultado = await window.db.from('mercado_itens').select('*').order('created_at', { ascending: false }).limit(20);
      if (resultado.data) itens = resultado.data.map(normalizarItem);
    } catch (error) {
      console.warn('Itens do Supabase indisponíveis; usando catálogo local.', error);
    }
  }

  if (!itens.length && typeof MARKET_OFFERS !== 'undefined') itens = MARKET_OFFERS.map(normalizarItem);

  if (!itens.length) {
    tabela.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">Nenhum item anunciado recentemente.</td></tr>';
    return;
  }

  tabela.innerHTML = itens.map((item) => `<tr class="hover:bg-gray-800/50 border-b border-gray-800 transition"><td class="p-3 font-bold text-white">${item.nome_item}</td><td class="p-3 text-xs text-gray-400">${item.categoria}</td><td class="p-3"><span class="px-2 py-0.5 rounded text-xs border font-bold ${obterEstiloMoeda(item.moeda)}">${item.preco} ${item.moeda}</span></td><td class="p-3 text-gray-300 text-xs">${item.vendedor}</td><td class="p-3 text-xs text-gray-500">${new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td><td class="p-3 text-center"><a href="${item.link_anuncio}" target="_blank" rel="noopener noreferrer" class="bg-amber-600 hover:bg-amber-700 text-black font-bold text-xs px-2.5 py-1 rounded transition">Ver no Site <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i></a></td></tr>`).join('');
}

async function verificarMatchFavorito(novoItem) {
  const item = normalizarItem(novoItem);
  let favoritos = obterFavoritosLocais();

  if (window.db && typeof window.db.from === 'function') {
    try {
      const resultado = await window.db.from('mercado_favoritos').select('*').eq('nick_membro', obterNickUsuario());
      if (resultado.data) favoritos = resultado.data;
    } catch (error) {
      console.warn('Não foi possível verificar alertas no Supabase.', error);
    }
  }

  favoritos.forEach((favorito) => {
    const termo = favorito.termo_busca || favorito.termo || '';
    const preco = favorito.preco_maximo ?? favorito.preco;
    const moeda = favorito.moeda || favorito.moeda_pagamento || 'Qualquer';
    const bateuMoeda = moeda === 'Qualquer' || item.moeda.toUpperCase().includes(moeda.toUpperCase());
    if (item.nome_item.toLowerCase().includes(termo.toLowerCase()) && bateuMoeda && (!preco || Number(item.preco) <= Number(preco))) dispararAlerta(item);
  });
}

function dispararAlerta(item) {
  const texto = `🔥 ALERTA DE MERCADO: ${item.nome_item} postado por ${item.preco} ${item.moeda}!`;
  notificar(texto);
  tocarSomNotificacao();

  if ('Notification' in window && Notification.permission === 'granted') new Notification('🚨 ALERTA DE MERCADO MU LOTUS!', { body: texto });
}

function tocarSomNotificacao() {
  try {
    const contexto = new (window.AudioContext || window.webkitAudioContext)();
    const oscilador = contexto.createOscillator();
    oscilador.frequency.setValueAtTime(880, contexto.currentTime);
    oscilador.connect(contexto.destination);
    oscilador.start();
    oscilador.stop(contexto.currentTime + 0.3);
  } catch (error) {
    console.warn('Som de notificação indisponível.', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  usuarioLogado = getUsuarioLogado();

  if (!usuarioLogado || (!usuarioLogado.acesso_mercado && !usuarioLogado.is_admin && usuarioLogado.role !== 'admin')) {
    alert('⛔ Acesso Restrito! Esta área é exclusiva para o Mercado VIP.');
    window.location.href = 'index.html';
    return;
  }

  carregarFavoritos();
  carregarItensMercado();

  const form = document.getElementById('form-favorito');
  if (form) form.addEventListener('submit', criarFavorito);

  if (window.db && typeof window.db.channel === 'function') {
    window.db.channel('mercado_realtime').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mercado_itens' }, (payload) => {
      carregarItensMercado();
      verificarMatchFavorito(payload.new);
    }).subscribe();
  }

  window.solicitarPermissaoNotificacao = solicitarPermissaoNotificacao;
});
