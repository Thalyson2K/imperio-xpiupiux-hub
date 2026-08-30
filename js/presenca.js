const EVENT_CODES = {
  'Castle Siege': 'castlesiege',
  'Kill de Kundun': 'kundun',
  'Blood Castle Raid': 'bloodcastle',
  'Treino de Guild': 'guildtraining'
};

function mostrarMensagem(texto, ok = true) {
  const node = document.getElementById('mensagem');
  if (!node) return;

  node.textContent = texto;
  node.classList.remove('hidden');
  node.classList.remove('text-green-400', 'text-red-400', 'text-amber-300');
  node.classList.add(ok ? 'text-green-400' : 'text-red-400');
}

function handleCheckin(event) {
  event.preventDefault();

  const nick = document.getElementById('nick')?.value.trim();
  const evento = document.getElementById('evento-nome')?.value || '';
  const codigo = document.getElementById('codigo-evento')?.value.trim() || '';

  if (!nick || !evento || !codigo) {
    mostrarMensagem('Preencha todos os campos para confirmar a presença.', false);
    return;
  }

  const codigoEsperado = EVENT_CODES[evento];

  if (!codigoEsperado || codigo.toLowerCase() !== codigoEsperado) {
    mostrarMensagem('Código da chamada inválido para este evento.', false);
    return;
  }

  const nome = nick || 'Membro';
  mostrarMensagem(`Presença confirmada para ${nome} no evento ${evento}.`, true);
  document.getElementById('form-ponto')?.reset();
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeaderNav();

  const form = document.getElementById('form-ponto');
  if (form) {
    form.addEventListener('submit', handleCheckin);
  }
});
