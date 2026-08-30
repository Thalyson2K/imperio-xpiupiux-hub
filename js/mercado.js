let usuarioLogado = null;
let filtroMoedaSelecionada = 'TODAS';
let historicoMedias = {};
let radarsDoUsuario = [];
const FAVORITOS_LOCAL_KEY = 'mercado_alertas_vip';
const ITENS_LOCAL_KEY = 'mercado_itens_vip';

function getUsuarioLogado() {
  return typeof obterUsuarioLogado === 'function' ? obterUsuarioLogado() : JSON.parse(localStorage.getItem('usuario_logado') || 'null');
}

function nickUsuario() {
  return usuarioLogado?.nick || usuarioLogado?.name || 'Visitante';
}

function locais(chave) {
  return JSON.parse(localStorage.getItem(chave) || '[]');
}

function salvarLocais(chave, dados) {
  localStorage.setItem(chave, JSON.stringify(dados));
}

function toast(texto) {
  const caixa = document.getElementById('caixa-notificacao-topo');
  const textoNode = document.getElementById('texto-notificacao');
  if (!caixa || !textoNode) return;
  textoNode.textContent = texto;
  caixa.classList.remove('hidden');
  caixa.classList.add('flex');
}

function solicitarPermissaoNotificacao() {
  if (!('Notification' in window)) return toast('Seu navegador não suporta notificações.');
  Notification.requestPermission().then((permission) => toast(permission === 'granted' ? '✅ Notificações ativadas!' : 'Permissão de notificação negada.'));
}

function estiloMoeda(moeda) {
  const valor = String(moeda || '').toUpperCase();
  if (valor.includes('WC')) return 'text-amber-300 bg-amber-950/80 border-amber-600';
  if (valor.includes('HP')) return 'text-purple-300 bg-purple-950/80 border-purple-600';
  if (valor.includes('CREDIT')) return 'text-emerald-300 bg-emerald-950/80 border-emerald-600';
  if (valor.includes('JOIA') || valor.includes('BLESS') || valor.includes('SOUL')) return 'text-cyan-300 bg-cyan-950/80 border-cyan-600';
  return 'text-yellow-300 bg-yellow-950/80 border-yellow-600';
}

function calcularAnalisePreco(nomeItem, precoAtual) {
  const nomeLower = String(nomeItem || '').toLowerCase();
  const precoNumerico = Number(precoAtual);
  let mediaEncontrada = null;

  for (const itemMedio in historicoMedias) {
    if (nomeLower.includes(itemMedio)) {
      mediaEncontrada = Number(historicoMedias[itemMedio]);
      break;
    }
  }

  if (!mediaEncontrada || !Number.isFinite(precoNumerico)) {
    return { percentual: 0, status: 'SEM_DADOS', label: '⚖️ Sem Histórico', badgeCor: 'bg-gray-800 text-gray-400 border-gray-700', media: null };
  }

  const diferenca = ((precoNumerico - mediaEncontrada) / mediaEncontrada) * 100;
  const percentual = Math.abs(Math.round(diferenca));

  if (diferenca <= -15) {
    return { percentual, status: 'SUPER_OFERTA', label: `🔥 ${percentual}% ABAIXO DA MÉDIA (Super Oferta!)`, badgeCor: 'bg-emerald-950/90 text-emerald-400 border-emerald-500/80', media: mediaEncontrada };
  }
  if (diferenca >= 15) {
    return { percentual, status: 'ACIMA_MEDIA', label: `📈 ${percentual}% Acima da Média`, badgeCor: 'bg-red-950/90 text-red-400 border-red-600/80', media: mediaEncontrada };
  }
  return { percentual, status: 'JUSTO', label: '⚖️ Preço Justo (Na Média)', badgeCor: 'bg-blue-950/90 text-blue-300 border-blue-600/80', media: mediaEncontrada };
}

async function carregarHistoricoMedias() {
  if (!window.db || typeof window.db.from !== 'function') return;
  try {
    const resultado = await window.db.from('mercado_historico_precos').select('*');
    (resultado.data || []).forEach((media) => {
      historicoMedias[String(media.nome_item).toLowerCase()] = Number(media.preco_medio);
    });
  } catch (error) {
    console.warn('Histórico de preços indisponível; cards sem média histórica.', error);
  }
}

function normalizarItem(item) {
  return { id: item.id || Date.now(), nome_item: item.nome_item || item.title || 'Item sem nome', categoria: item.categoria || item.category || 'Outros', preco: item.preco ?? item.price ?? 'A combinar', moeda: item.moeda || 'WC', vendedor: item.vendedor || item.seller || 'Anônimo', created_at: item.created_at || new Date().toISOString(), link_anuncio: item.link_anuncio || 'https://mulotus.net' };
}

async function buscarItens() {
  if (window.db && typeof window.db.from === 'function') {
    try {
      const resultado = await window.db.from('mercado_itens').select('*').order('created_at', { ascending: false }).limit(40);
      if (resultado.data?.length) return resultado.data.map(normalizarItem);
    } catch (error) {
      console.warn('Feed Supabase indisponível; usando dados locais.', error);
    }
  }
  const locaisItens = locais(ITENS_LOCAL_KEY).map(normalizarItem);
  if (locaisItens.length) return locaisItens;
  return typeof MARKET_OFFERS !== 'undefined' ? MARKET_OFFERS.map(normalizarItem) : [];
}

function renderizarFiltrosMoeda(itens) {
  const container = document.getElementById('filtro-moedas-mercado');
  if (!container) return;
  const moedas = ['TODAS', 'WC', 'HP', 'CREDITOS', 'ZEN', 'PACK_BLESS', 'PACK_SOUL', 'TROCA_ITEM'];
  container.innerHTML = moedas.map((moeda) => `<button type="button" data-moeda="${moeda}" class="px-2.5 py-1 rounded-lg text-xs font-bold border transition ${filtroMoedaSelecionada === moeda ? 'bg-amber-500 text-black border-amber-400' : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-amber-300'}">${moeda === 'TODAS' ? 'Todas' : moeda}</button>`).join('');
  container.querySelectorAll('[data-moeda]').forEach((button) => button.addEventListener('click', () => {
    filtroMoedaSelecionada = button.dataset.moeda;
    renderizarFiltrosMoeda(itens);
    renderizarCards(itens);
  }));
}

function renderizarCards(itens) {
  const container = document.getElementById('grid-achados-radar') || document.getElementById('grid-mercado-cards');
  if (!container) return;
  const filtrados = filtroMoedaSelecionada === 'TODAS' ? itens : itens.filter((item) => item.moeda === filtroMoedaSelecionada);
  if (!filtrados.length) {
    container.innerHTML = '<div class="col-span-full text-center text-gray-500 border border-dashed border-gray-700 rounded-2xl p-8">Nenhum item anunciado nesta moeda.</div>';
    return;
  }
  container.innerHTML = filtrados.map((item) => {
    const analise = calcularAnalisePreco(item.nome_item, item.preco);
    const ehMatch = radarsDoUsuario.some((radar) => {
      const moeda = radar.moeda || 'Qualquer';
      const precoMaximo = radar.preco_maximo;
      return item.nome_item.toLowerCase().includes(String(radar.termo_busca || '').toLowerCase())
        && (moeda === 'Qualquer' || item.moeda.toUpperCase().includes(moeda.toUpperCase()))
        && (!precoMaximo || Number(item.preco) <= Number(precoMaximo));
    });
    const destaque = ehMatch ? 'border-amber-500 glow-amber' : analise.status === 'SUPER_OFERTA' ? 'border-emerald-500/50' : '';
    const badge = ehMatch ? '<span class="text-xs px-2.5 py-1 rounded-lg border font-extrabold bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg"><i class="fa-solid fa-crosshairs mr-1"></i> MATCH DO SEU RADAR!</span>' : `<span class="px-2 py-1 rounded text-[10px] border font-bold ${estiloMoeda(item.moeda)}">${item.moeda}</span>`;
    return `<article class="market-card glass-panel ${destaque} rounded-2xl p-5 flex flex-col justify-between shadow-xl"><div><div class="flex justify-between items-start gap-2 mb-4"><span class="text-[10px] uppercase tracking-wider text-gray-500">${item.categoria}</span>${badge}</div><h3 class="font-gamer text-2xl font-extrabold text-white leading-tight">${item.nome_item}</h3></div><div class="space-y-2 mt-4"><div class="bg-gray-950/70 p-3 rounded-xl border border-gray-800/80 flex justify-between items-center"><span class="text-xs text-gray-400 font-semibold">Valor encontrado:</span><strong class="text-lg text-amber-300">${item.preco} ${item.moeda}</strong></div><div class="text-[11px] font-bold p-2 rounded-lg border flex justify-between items-center ${analise.badgeCor}"><span>${analise.label}</span>${analise.media ? `<span class="text-[10px] font-normal">Média: ${analise.media} ${item.moeda}</span>` : ''}</div></div><div class="mt-5 pt-4 border-t border-gray-800 flex items-end justify-between gap-3"><div><span class="block text-[10px] uppercase text-gray-500">Anunciante</span><strong class="text-sm text-gray-300"><i class="fa-solid fa-user-ninja mr-1 text-red-500"></i>${item.vendedor}</strong></div><a href="${item.link_anuncio}" target="_blank" rel="noopener noreferrer" class="bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs px-3 py-2 rounded-lg whitespace-nowrap">Abrir no Site</a></div></article>`;
  }).join('');
}

function renderizarRadarsAtivos() {
  const container = document.getElementById('lista-radars-ativos');
  const total = document.getElementById('total-radars');
  if (!container) return;

  const radars = radarsDoUsuario.length ? radarsDoUsuario : locais(FAVORITOS_LOCAL_KEY);
  if (total) total.textContent = radars.length;
  container.innerHTML = radars.length
    ? radars.map((radar) => `<div class="bg-gray-900/90 p-2.5 rounded-xl border border-gray-800 flex justify-between items-center text-xs"><div><strong class="text-amber-400 block">${radar.termo_busca}</strong><span class="text-gray-400 text-[10px]">${radar.moeda || 'Qualquer'}${radar.preco_maximo ? ` | Máx: ${radar.preco_maximo}` : ''}</span></div><button type="button" onclick="deletarFavorito('${radar.id}')" class="text-red-400 hover:text-red-300"><i class="fa-solid fa-trash-can"></i></button></div>`).join('')
    : '<p class="text-xs text-gray-500">Nenhum radar ativo.</p>';
}

async function carregarItensMercadoCards() {
  const itens = await buscarItens();
  renderizarFiltrosMoeda(itens);
  renderizarCards(itens);
}

const carregarItensMercado = carregarItensMercadoCards;

async function publicarItem(event) {
  event.preventDefault();
  const item = normalizarItem({ nome_item: document.getElementById('post-nome')?.value.trim(), categoria: document.getElementById('post-categoria')?.value, moeda: document.getElementById('post-moeda')?.value, preco: document.getElementById('post-preco')?.value.trim(), vendedor: document.getElementById('post-vendedor')?.value.trim() || nickUsuario() });
  if (!item.nome_item || !item.preco) return;
  let publicado = false;
  if (window.db && typeof window.db.from === 'function') {
    try {
      const { error } = await window.db.from('mercado_itens').insert([{ nome_item: item.nome_item, categoria: item.categoria, moeda: item.moeda, preco: item.preco, vendedor: item.vendedor, link_anuncio: item.link_anuncio }]);
      publicado = !error;
    } catch (error) {
      console.warn('Não foi possível publicar no Supabase.', error);
    }
  }
  if (!publicado) {
    const itens = locais(ITENS_LOCAL_KEY);
    itens.unshift(item);
    salvarLocais(ITENS_LOCAL_KEY, itens);
  }
  document.getElementById('form-postar-item')?.reset();
  await carregarItensMercadoCards();
  toast(publicado ? 'Oferta publicada no radar!' : 'Oferta salva localmente no radar.');
}

async function carregarFavoritos() {
  const container = document.getElementById('lista-favoritos') || document.getElementById('lista-radars-ativos');
  if (!container) return;
  let favoritos = locais(FAVORITOS_LOCAL_KEY);
  if (window.db && typeof window.db.from === 'function') {
    try {
      const resultado = await window.db.from('mercado_favoritos').select('*').eq('nick_membro', nickUsuario());
      if (resultado.data) favoritos = resultado.data;
    } catch (error) { console.warn('Favoritos Supabase indisponíveis.', error); }
  }
  const total = document.getElementById('total-radars');
  if (total) total.textContent = favoritos.length;
  container.innerHTML = favoritos.length ? favoritos.map((item) => `<div class="bg-gray-800/70 p-2.5 rounded border border-gray-700 flex justify-between items-center text-xs"><div><strong class="text-amber-400 block">${item.termo_busca || item.termo}</strong><span class="text-gray-400 text-[10px]">${item.moeda || 'Qualquer'} ${item.preco_maximo ? `| Máx: ${item.preco_maximo}` : ''}</span></div><button type="button" onclick="deletarFavorito('${item.id}')" class="text-red-400 hover:text-red-300 p-1"><i class="fa-solid fa-trash-can"></i></button></div>`).join('') : '<p class="text-xs text-gray-500">Nenhum radar ativo.</p>';
  radarsDoUsuario = favoritos;
}

async function carregarRadarsAtivos() {
  await carregarFavoritos();
  renderizarRadarsAtivos();
}

async function carregarAchadosRadar() {
  await carregarItensMercadoCards();
}

async function criarFavorito(event) {
  event.preventDefault();
  const termoNode = document.getElementById('fav-termo') || document.getElementById('radar-termo');
  const moedaNode = document.getElementById('fav-moeda') || document.getElementById('radar-moeda');
  const precoNode = document.getElementById('fav-preco') || document.getElementById('radar-preco');
  const termo = termoNode?.value.trim();
  const moeda = moedaNode?.value || 'Qualquer';
  const preco = precoNode?.value ? Number(precoNode.value) : null;
  if (!termo) return;
  const favorito = { id: Date.now(), nick_membro: nickUsuario(), termo_busca: termo, preco_maximo: preco, moeda };
  let salvo = false;
  if (window.db && typeof window.db.from === 'function') {
    try { const { error } = await window.db.from('mercado_favoritos').insert([{ nick_membro: favorito.nick_membro, termo_busca: termo, preco_maximo: preco, moeda }]); salvo = !error; } catch (error) { console.warn('Não foi possível salvar o alerta.', error); }
  }
  if (!salvo) { const favoritos = locais(FAVORITOS_LOCAL_KEY); favoritos.push(favorito); salvarLocais(FAVORITOS_LOCAL_KEY, favoritos); }
  document.getElementById('form-favorito')?.reset();
  document.getElementById('form-radar-desejo')?.reset();
  carregarFavoritos();
  renderizarRadarsAtivos();
  toast(`Alerta criado para "${termo}".`);
}

async function deletarFavorito(id) {
  if (window.db && typeof window.db.from === 'function') { try { await window.db.from('mercado_favoritos').delete().eq('id', id); } catch (error) { console.warn('Não foi possível remover o alerta.', error); } }
  salvarLocais(FAVORITOS_LOCAL_KEY, locais(FAVORITOS_LOCAL_KEY).filter((item) => String(item.id) !== String(id)));
  carregarFavoritos();
  renderizarRadarsAtivos();
}

function verificarMatchFavorito(item) {
  const novoItem = normalizarItem(item);
  locais(FAVORITOS_LOCAL_KEY).forEach((favorito) => {
    const termo = favorito.termo_busca || favorito.termo || '';
    const moedaOk = !favorito.moeda || favorito.moeda === 'Qualquer' || novoItem.moeda.toUpperCase().includes(favorito.moeda.toUpperCase());
    if (novoItem.nome_item.toLowerCase().includes(termo.toLowerCase()) && moedaOk) {
      const texto = `🔥 ALERTA: ${novoItem.nome_item} por ${novoItem.preco} ${novoItem.moeda}!`;
      toast(texto);
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Alerta Mercado VIP', { body: texto });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  usuarioLogado = getUsuarioLogado();
  if (!usuarioLogado || (!usuarioLogado.acesso_mercado && !usuarioLogado.is_admin && usuarioLogado.role !== 'admin')) {
    alert('⛔ Acesso Restrito! Esta área é exclusiva para o Mercado VIP.');
    window.location.href = 'index.html';
    return;
  }
  renderHeaderNav();
  carregarHistoricoMedias().then(async () => {
    await carregarRadarsAtivos();
    await carregarAchadosRadar();
  });
  document.getElementById('form-favorito')?.addEventListener('submit', criarFavorito);
  document.getElementById('form-radar-desejo')?.addEventListener('submit', criarFavorito);
  document.getElementById('form-radar-desejo')?.addEventListener('submit', criarFavorito);
  document.getElementById('form-postar-item')?.addEventListener('submit', publicarItem);
  if (window.db && typeof window.db.channel === 'function') window.db.channel('mercado_realtime').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mercado_itens' }, (payload) => { carregarItensMercadoCards(); verificarMatchEAnalisarPreco(payload.new); }).subscribe();
  window.solicitarPermissaoNotificacao = solicitarPermissaoNotificacao;
});

async function verificarMatchEAnalisarPreco(novoItem) {
  const item = normalizarItem(novoItem);
  const analise = calcularAnalisePreco(item.nome_item, item.preco);
  let favoritos = locais(FAVORITOS_LOCAL_KEY);

  if (window.db && typeof window.db.from === 'function') {
    try {
      const resultado = await window.db.from('mercado_favoritos').select('*').eq('nick_membro', nickUsuario());
      if (resultado.data) favoritos = resultado.data;
    } catch (error) {
      console.warn('Não foi possível consultar alertas de mercado.', error);
    }
  }

  const corresponde = favoritos.some((favorito) => {
    const termo = favorito.termo_busca || favorito.termo || '';
    const moeda = favorito.moeda || 'Qualquer';
    const preco = favorito.preco_maximo ?? favorito.preco;
    return item.nome_item.toLowerCase().includes(termo.toLowerCase())
      && (moeda === 'Qualquer' || item.moeda.toUpperCase().includes(moeda.toUpperCase()))
      && (!preco || Number(item.preco) <= Number(preco));
  });

  if (corresponde || analise.status === 'SUPER_OFERTA') {
    const texto = `🔥 ${analise.status === 'SUPER_OFERTA' ? 'SUPER OPORTUNIDADE' : 'ALERTA VIP'}: ${item.nome_item} por ${item.preco} ${item.moeda} (${analise.label})!`;
    toast(texto);
    if ('Notification' in window && Notification.permission === 'granted') new Notification('Alerta de Mercado Mu Lotus', { body: texto });
  }
}

const verificarMatchEAlerta = verificarMatchEAnalisarPreco;
