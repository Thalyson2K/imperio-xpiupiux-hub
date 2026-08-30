let categoriaAtual = 'todos';

document.addEventListener('DOMContentLoaded', () => {
    renderizarBotoesFiltro();
    carregarEventos();
    carregarRankingSupabase();

    setInterval(carregarEventos, 1000);

    if (typeof db !== 'undefined' && db && typeof db.channel === 'function') {
        db.channel('dashboard_realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'presencas' }, () => carregarRankingSupabase())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'membros' }, () => carregarRankingSupabase())
          .subscribe();
    }
});

function renderizarBotoesFiltro() {
    const header = document.getElementById('filtro-categorias');
    if (!header) return;

    header.innerHTML = `
        <button onclick="filtrarCategoria('todos')" class="px-2.5 py-1 rounded text-xs font-bold transition ${categoriaAtual === 'todos' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}">Todos</button>
        <button onclick="filtrarCategoria('boss')" class="px-2.5 py-1 rounded text-xs font-bold transition ${categoriaAtual === 'boss' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}">👑 Bosses Fase 2</button>
        <button onclick="filtrarCategoria('miniboss')" class="px-2.5 py-1 rounded text-xs font-bold transition ${categoriaAtual === 'miniboss' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}">⚔️ Mini Bosses</button>
        <button onclick="filtrarCategoria('evento')" class="px-2.5 py-1 rounded text-xs font-bold transition ${categoriaAtual === 'evento' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}">🏆 Eventos</button>
    `;
}

function filtrarCategoria(cat) {
    categoriaAtual = cat;
    renderizarBotoesFiltro();
    carregarEventos();
}

function calcularProximoSpawn(horarios) {
    if (!horarios || horarios.length === 0 || String(horarios[0]).includes('Domingo')) return 'Domingo 20:00';

    const agora = new Date();
    const minutosAtuais = agora.getHours() * 60 + agora.getMinutes();

    let proximoMinutos = null;

    for (const h of horarios) {
        const [horas, mins] = String(h).split(':').map(Number);
        const totalMin = horas * 60 + mins;
        if (totalMin > minutosAtuais) {
            proximoMinutos = totalMin;
            break;
        }
    }

    if (proximoMinutos === null) {
        const [horas, mins] = String(horarios[0]).split(':').map(Number);
        proximoMinutos = (24 * 60) + (horas * 60 + mins);
    }

    const difMinutos = proximoMinutos - minutosAtuais;
    const horasFaltando = Math.floor(difMinutos / 60);
    const minsFaltando = difMinutos % 60;
    const segsFaltando = 59 - agora.getSeconds();

    return `${String(horasFaltando).padStart(2, '0')}:${String(minsFaltando).padStart(2, '0')}:${String(segsFaltando).padStart(2, '0')}`;
}

function carregarEventos() {
    const container = document.getElementById('lista-eventos');
    if (!container) return;

    const baseEventos = Array.isArray(CONFIG?.eventos) ? CONFIG.eventos : APP_CONFIG?.eventos || [];
    const filtrados = baseEventos.filter((ev) => categoriaAtual === 'todos' || ev.categoria === categoriaAtual);
    container.innerHTML = '';

    filtrados.forEach((ev) => {
        const tempoRestante = calcularProximoSpawn(ev.horarios);
        const corBadge = ev.categoria === 'boss'
            ? 'bg-amber-950 border-amber-600 text-amber-400'
            : ev.categoria === 'miniboss'
                ? 'bg-purple-950 border-purple-600 text-purple-300'
                : 'bg-red-950 border-red-800 text-red-300';

        const card = document.createElement('div');
        card.className = 'bg-gray-800/60 border border-gray-700/60 p-4 rounded-xl flex flex-col justify-between shadow-lg';
        card.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-2">
                    <span class="font-bold text-white text-base">${ev.nome}</span>
                    <span class="text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${corBadge}">${ev.categoria}</span>
                </div>
                <p class="text-xs text-amber-400 font-semibold mb-1"><i class="fa-solid fa-location-dot mr-1"></i> Mapa: ${ev.mapa}</p>
                <p class="text-xs text-gray-400 mb-2"><i class="fa-solid fa-gift mr-1"></i> Drop: ${ev.drop}</p>
            </div>
            <div class="mt-3 pt-2 border-t border-gray-700/50 flex justify-between items-center text-xs">
                <span class="text-gray-400">Próximo Spawn:</span>
                <span class="font-mono font-bold text-sm text-green-400 bg-gray-900 px-2 py-1 rounded border border-gray-700">⏱️ ${tempoRestante}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

async function carregarRankingSupabase() {
    const tabela = document.getElementById('tabela-top-membros');
    const totalMembrosEl = document.getElementById('total-membros');
    if (!tabela) return;

    if (typeof db !== 'undefined' && db && typeof db.from === 'function') {
        try {
            const { data: membros } = await db.from('membros').select('*').eq('status', 'aprovado');
            const { data: presencas } = await db.from('presencas').select('nick');

            if (membros && membros.length) {
                if (totalMembrosEl) totalMembrosEl.innerText = membros.length;

                const contagemPresencas = {};
                if (presencas) {
                    presencas.forEach((p) => {
                        contagemPresencas[p.nick] = (contagemPresencas[p.nick] || 0) + 1;
                    });
                }

                const ranking = membros.map((m) => ({
                    ...m,
                    totalPresencas: contagemPresencas[m.nick] || 0
                })).sort((a, b) => b.totalPresencas - a.totalPresencas || b.resets - a.resets);

                if (!ranking.length) {
                    tabela.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">Aguardando aprovação de novos membros pelo Guild Master.</td></tr>';
                    if (totalMembrosEl) totalMembrosEl.innerText = 0;
                    return;
                }

                renderRankingTable(ranking);
                return;
            }
        } catch (error) {
            console.warn('Supabase ranking unavailable, falling back to local data.', error);
        }
    }

    if (totalMembrosEl) totalMembrosEl.innerText = MEMBERS.length;
    renderRankingTable(APP_CONFIG.ranking.map((member, index) => ({
        ...member,
        nick: member.name,
        classe: member.className,
        resets: member.resets,
        totalPresencas: member.participations,
        __index: index + 1
    })));
}

const carregarRanking = carregarRankingSupabase;

function renderRankingTable(ranking) {
    const tabela = document.getElementById('tabela-top-membros');
    if (!tabela) return;

    tabela.innerHTML = '';
    ranking.forEach((m, idx) => {
        const nick = m.nick || m.name;
        const classe = m.classe || m.className;
        const resets = m.resets || 0;
        const totalPresencas = m.totalPresencas || m.participations || 0;
        const freq = Math.min(Math.round((totalPresencas / 20) * 100), 100);

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-800/40 transition border-b border-gray-800/50';
        tr.innerHTML = `
            <td class="p-3 font-bold ${idx === 0 ? 'text-amber-400' : 'text-gray-400'}">${idx + 1}º</td>
            <td class="p-3 font-semibold text-white">${nick}</td>
            <td class="p-3 text-gray-400">${classe}</td>
            <td class="p-3 text-red-400 font-bold">${resets}</td>
            <td class="p-3 text-amber-300 font-semibold">${totalPresencas} presenças</td>
            <td class="p-3">
                <div class="w-full bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-700">
                    <div class="bg-gradient-to-r from-red-600 to-amber-500 h-2" style="width: ${freq}%"></div>
                </div>
            </td>
        `;
        tabela.appendChild(tr);
    });
}
