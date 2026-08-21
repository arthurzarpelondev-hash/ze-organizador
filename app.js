/* Zé - Organizador Financeiro
   100% local: todos os dados ficam salvos no localStorage do navegador. */

const STORAGE_KEY = 'ze_app_data_v1';

const CATEGORIES = {
  income: [
    { id: 'salario', label: 'Salário', icon: '💼' },
    { id: 'freela', label: 'Freelance', icon: '🧾' },
    { id: 'investimento', label: 'Investimento', icon: '📈' },
    { id: 'outros_receita', label: 'Outros', icon: '➕' },
  ],
  expense: [
    { id: 'alimentacao', label: 'Alimentação', icon: '🍔' },
    { id: 'transporte', label: 'Transporte', icon: '🚗' },
    { id: 'moradia', label: 'Moradia', icon: '🏠' },
    { id: 'lazer', label: 'Lazer', icon: '🎮' },
    { id: 'saude', label: 'Saúde', icon: '💊' },
    { id: 'educacao', label: 'Educação', icon: '📚' },
    { id: 'assinaturas', label: 'Assinaturas', icon: '🔁' },
    { id: 'outros_despesa', label: 'Outros', icon: '📦' },
  ],
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('Falha ao ler dados salvos', e); }
  return { transactions: [], subscriptions: [], goals: [], tasks: [], notes: [] };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const state = loadData();
for (const key of ['transactions', 'subscriptions', 'goals', 'tasks', 'notes']) {
  if (!Array.isArray(state[key])) state[key] = [];
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function brl(value) {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function formatDateBR(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function categoryInfo(type, id) {
  const list = CATEGORIES[type] || [];
  return list.find(c => c.id === id) || { icon: '💰', label: 'Outros' };
}

/* ---------- NAVIGATION ---------- */

const TAB_TITLES = { financas: 'Finanças', lembretes: 'Lembretes', diario: 'Diário', ajustes: 'Ajustes' };
let currentTab = 'financas';

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
  document.getElementById('page-title').textContent = TAB_TITLES[tab];
  document.getElementById('fab-add').style.display = tab === 'ajustes' ? 'none' : 'flex';
}

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

/* ---------- MODAL ---------- */

const overlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

function openModal(title, bodyHTML) {
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHTML;
  overlay.classList.add('open');
}

function closeModal() {
  overlay.classList.remove('open');
  modalBody.innerHTML = '';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

/* ---------- RENDER: FINANÇAS ---------- */

function monthKey(iso) { return (iso || '').slice(0, 7); }

function renderFinancas() {
  const nowMonth = todayISO().slice(0, 7);
  let saldo = 0, receitasMes = 0, despesasMes = 0;

  for (const tx of state.transactions) {
    const val = Number(tx.amount) || 0;
    if (tx.type === 'income') saldo += val; else saldo -= val;
    if (monthKey(tx.date) === nowMonth) {
      if (tx.type === 'income') receitasMes += val; else despesasMes += val;
    }
  }

  document.getElementById('saldo-total').textContent = brl(saldo);
  document.getElementById('receitas-mes').textContent = brl(receitasMes);
  document.getElementById('despesas-mes').textContent = brl(despesasMes);

  renderGoals();
  renderSubscriptions();
  renderTransactions();
}

function renderGoals() {
  const el = document.getElementById('goals-list');
  if (!state.goals.length) {
    el.innerHTML = '<div class="empty-hint">Nenhuma meta ainda. Toque em "+ Nova" para criar sua primeira meta de economia.</div>';
    return;
  }
  el.innerHTML = state.goals.map(g => {
    const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
    return `
    <div class="card goal-card">
      <div class="goal-top">
        <span class="goal-name">${escapeHTML(g.name)}</span>
        <span class="goal-amounts">${brl(g.saved)} / ${brl(g.target)}</span>
      </div>
      <div class="goal-progress-track"><div class="goal-progress-fill" style="width:${pct}%"></div></div>
      <div class="goal-actions">
        <button class="link-btn" data-action="goal-add" data-id="${g.id}">+ Guardar valor</button>
        <button class="link-btn danger" data-action="goal-del" data-id="${g.id}">Excluir</button>
      </div>
    </div>`;
  }).join('');
}

function nextDueDate(dueDay) {
  const now = new Date();
  let year = now.getFullYear(), month = now.getMonth();
  if (now.getDate() > dueDay) { month += 1; }
  const d = new Date(year, month, dueDay);
  return d;
}

function renderSubscriptions() {
  const el = document.getElementById('subs-list');
  if (!state.subscriptions.length) {
    el.innerHTML = '<div class="empty-hint">Nenhuma assinatura cadastrada.</div>';
    return;
  }
  const now = new Date();
  el.innerHTML = state.subscriptions.map(s => {
    const due = nextDueDate(s.dueDay);
    const diffDays = Math.ceil((due - now) / 86400000);
    const soon = diffDays <= 5;
    return `
    <div class="card sub-card-wrap">
      <div class="sub-card">
        <div>
          <div class="sub-name">${escapeHTML(s.name)}</div>
          <div class="sub-due ${soon ? 'soon' : ''}">Vence dia ${s.dueDay} · ${diffDays >= 0 ? `em ${diffDays}d` : 'atrasada'}</div>
        </div>
        <div class="sub-amount">${brl(s.amount)}</div>
      </div>
      <div class="sub-actions">
        <button class="link-btn" data-action="sub-pay" data-id="${s.id}">Lançar pagamento</button>
        <button class="link-btn danger" data-action="sub-del" data-id="${s.id}">Excluir</button>
      </div>
    </div>`;
  }).join('');
}

function renderTransactions() {
  const el = document.getElementById('tx-list');
  const list = [...state.transactions].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt);
  if (!list.length) {
    el.innerHTML = '<div class="empty-hint">Nenhuma transação ainda. Toque no botão + para registrar um gasto ou receita.</div>';
    return;
  }
  el.innerHTML = list.slice(0, 100).map(tx => {
    const cat = categoryInfo(tx.type, tx.category);
    const sign = tx.type === 'income' ? '+' : '-';
    return `
    <div class="card tx-row">
      <div class="tx-icon">${cat.icon}</div>
      <div class="tx-info">
        <div class="tx-desc">${escapeHTML(tx.desc || cat.label)}</div>
        <div class="tx-meta">${cat.label} · ${formatDateBR(tx.date)}</div>
      </div>
      <div class="tx-amount ${tx.type}">${sign} ${brl(tx.amount)}</div>
      <button class="tx-del" data-action="tx-del" data-id="${tx.id}">🗑</button>
    </div>`;
  }).join('');
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

/* ---------- MODAL FORMS: FINANÇAS ---------- */

function categoryOptions(type) {
  return CATEGORIES[type].map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('');
}

function openTransactionModal() {
  let type = 'expense';
  openModal('Nova transação', `
    <div class="field">
      <div class="segmented" id="tx-type-seg">
        <button type="button" data-type="expense" class="active expense">Despesa</button>
        <button type="button" data-type="income" class="income">Receita</button>
      </div>
    </div>
    <div class="field">
      <label>Descrição</label>
      <input type="text" id="tx-desc" placeholder="Ex: Mercado, Salário..." />
    </div>
    <div class="field">
      <label>Valor (R$)</label>
      <input type="number" id="tx-amount" inputmode="decimal" step="0.01" min="0" placeholder="0,00" />
    </div>
    <div class="field">
      <label>Categoria</label>
      <select id="tx-category">${categoryOptions('expense')}</select>
    </div>
    <div class="field">
      <label>Data</label>
      <input type="date" id="tx-date" value="${todayISO()}" />
    </div>
    <button class="btn-submit" id="tx-submit">Salvar</button>
  `);

  const seg = document.getElementById('tx-type-seg');
  seg.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      type = btn.dataset.type;
      seg.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tx-category').innerHTML = categoryOptions(type);
    });
  });

  document.getElementById('tx-submit').addEventListener('click', () => {
    const desc = document.getElementById('tx-desc').value.trim();
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const category = document.getElementById('tx-category').value;
    const date = document.getElementById('tx-date').value || todayISO();
    if (!amount || amount <= 0) { alert('Informe um valor válido.'); return; }
    state.transactions.push({ id: uid(), type, desc, amount, category, date, createdAt: Date.now() });
    saveData();
    renderFinancas();
    closeModal();
  });
}

function openGoalModal() {
  openModal('Nova meta de economia', `
    <div class="field">
      <label>Nome da meta</label>
      <input type="text" id="goal-name" placeholder="Ex: Viagem, Reserva de emergência..." />
    </div>
    <div class="field">
      <label>Valor objetivo (R$)</label>
      <input type="number" id="goal-target" inputmode="decimal" step="0.01" min="0" placeholder="0,00" />
    </div>
    <div class="field">
      <label>Já tem guardado (R$)</label>
      <input type="number" id="goal-saved" inputmode="decimal" step="0.01" min="0" value="0" />
    </div>
    <button class="btn-submit" id="goal-submit">Criar meta</button>
  `);
  document.getElementById('goal-submit').addEventListener('click', () => {
    const name = document.getElementById('goal-name').value.trim();
    const target = parseFloat(document.getElementById('goal-target').value);
    const saved = parseFloat(document.getElementById('goal-saved').value) || 0;
    if (!name || !target || target <= 0) { alert('Preencha nome e valor objetivo.'); return; }
    state.goals.push({ id: uid(), name, target, saved });
    saveData();
    renderGoals();
    closeModal();
  });
}

function openGoalAddModal(goalId) {
  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) return;
  openModal(`Guardar valor - ${goal.name}`, `
    <div class="field">
      <label>Valor a adicionar (R$)</label>
      <input type="number" id="goal-add-amount" inputmode="decimal" step="0.01" min="0" placeholder="0,00" />
    </div>
    <button class="btn-submit" id="goal-add-submit">Adicionar</button>
  `);
  document.getElementById('goal-add-submit').addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('goal-add-amount').value);
    if (!amount || amount <= 0) { alert('Informe um valor válido.'); return; }
    goal.saved = (goal.saved || 0) + amount;
    saveData();
    renderGoals();
    closeModal();
  });
}

function openSubscriptionModal() {
  openModal('Nova assinatura', `
    <div class="field">
      <label>Nome</label>
      <input type="text" id="sub-name" placeholder="Ex: Netflix, Academia..." />
    </div>
    <div class="field">
      <label>Valor mensal (R$)</label>
      <input type="number" id="sub-amount" inputmode="decimal" step="0.01" min="0" placeholder="0,00" />
    </div>
    <div class="field">
      <label>Dia de vencimento</label>
      <input type="number" id="sub-day" min="1" max="31" value="1" />
    </div>
    <button class="btn-submit" id="sub-submit">Salvar</button>
  `);
  document.getElementById('sub-submit').addEventListener('click', () => {
    const name = document.getElementById('sub-name').value.trim();
    const amount = parseFloat(document.getElementById('sub-amount').value);
    const dueDay = Math.min(31, Math.max(1, parseInt(document.getElementById('sub-day').value) || 1));
    if (!name || !amount || amount <= 0) { alert('Preencha nome e valor.'); return; }
    state.subscriptions.push({ id: uid(), name, amount, dueDay });
    saveData();
    renderSubscriptions();
    closeModal();
  });
}

/* ---------- RENDER: LEMBRETES ---------- */

function renderTasks() {
  const pendingEl = document.getElementById('tasks-pending');
  const doneEl = document.getElementById('tasks-done');
  const now = new Date();

  const pending = state.tasks.filter(t => !t.done).sort((a, b) => (a.datetime || '').localeCompare(b.datetime || ''));
  const done = state.tasks.filter(t => t.done).sort((a, b) => (b.datetime || '').localeCompare(a.datetime || ''));

  pendingEl.innerHTML = pending.length ? pending.map(t => taskRow(t, now)).join('') :
    '<div class="empty-hint">Nenhum lembrete pendente. Toque em + para criar um.</div>';
  doneEl.innerHTML = done.length ? done.map(t => taskRow(t, now)).join('') :
    '<div class="empty-hint">Nenhum lembrete concluído ainda.</div>';
}

function taskRow(t, now) {
  const dt = t.datetime ? new Date(t.datetime) : null;
  const overdue = dt && !t.done && dt < now;
  const whenText = dt ? dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  return `
  <div class="card task-row ${t.done ? 'done' : ''}">
    <button class="task-check" data-action="task-toggle" data-id="${t.id}">${t.done ? '✓' : ''}</button>
    <div class="task-info">
      <div class="task-title">${escapeHTML(t.title)}</div>
      ${whenText ? `<div class="task-when ${overdue ? 'overdue' : ''}">${whenText}${overdue ? ' · atrasado' : ''}</div>` : ''}
    </div>
    <button class="task-del" data-action="task-del" data-id="${t.id}">🗑</button>
  </div>`;
}

function openTaskModal() {
  openModal('Novo lembrete', `
    <div class="field">
      <label>Título</label>
      <input type="text" id="task-title" placeholder="Ex: Pagar boleto, Ligar pro dentista..." />
    </div>
    <div class="field">
      <label>Data</label>
      <input type="date" id="task-date" value="${todayISO()}" />
    </div>
    <div class="field">
      <label>Hora</label>
      <input type="time" id="task-time" value="09:00" />
    </div>
    <button class="btn-submit" id="task-submit">Salvar</button>
  `);
  document.getElementById('task-submit').addEventListener('click', () => {
    const title = document.getElementById('task-title').value.trim();
    const date = document.getElementById('task-date').value || todayISO();
    const time = document.getElementById('task-time').value || '09:00';
    if (!title) { alert('Digite um título para o lembrete.'); return; }
    state.tasks.push({ id: uid(), title, datetime: `${date}T${time}`, done: false });
    saveData();
    renderTasks();
    closeModal();
  });
}

/* ---------- RENDER: DIÁRIO ---------- */

function renderNotes() {
  const el = document.getElementById('notes-list');
  const list = [...state.notes].sort((a, b) => b.createdAt - a.createdAt);
  if (!list.length) {
    el.innerHTML = '<div class="empty-hint">Nenhuma nota ainda. Toque em + para escrever algo.</div>';
    return;
  }
  el.innerHTML = list.map(n => `
    <div class="card note-card">
      <div class="note-date">${new Date(n.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      <div class="note-text">${escapeHTML(n.text)}</div>
      <div class="note-actions">
        <button class="link-btn danger" data-action="note-del" data-id="${n.id}">Excluir</button>
      </div>
    </div>
  `).join('');
}

function openNoteModal() {
  openModal('Nova nota', `
    <div class="field">
      <label>O que você quer anotar?</label>
      <textarea id="note-text" placeholder="Escreva aqui..."></textarea>
    </div>
    <button class="btn-submit" id="note-submit">Salvar</button>
  `);
  document.getElementById('note-submit').addEventListener('click', () => {
    const text = document.getElementById('note-text').value.trim();
    if (!text) { alert('Escreva algo antes de salvar.'); return; }
    state.notes.push({ id: uid(), text, createdAt: Date.now() });
    saveData();
    renderNotes();
    closeModal();
  });
}

/* ---------- CLICK DELEGATION ---------- */

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  switch (action) {
    case 'new-goal': openGoalModal(); break;
    case 'goal-add': openGoalAddModal(id); break;
    case 'goal-del':
      if (confirm('Excluir esta meta?')) {
        state.goals = state.goals.filter(g => g.id !== id);
        saveData(); renderGoals();
      }
      break;
    case 'new-subscription': openSubscriptionModal(); break;
    case 'sub-del':
      if (confirm('Excluir esta assinatura?')) {
        state.subscriptions = state.subscriptions.filter(s => s.id !== id);
        saveData(); renderSubscriptions();
      }
      break;
    case 'sub-pay': {
      const sub = state.subscriptions.find(s => s.id === id);
      if (sub) {
        state.transactions.push({
          id: uid(), type: 'expense', desc: sub.name, category: 'assinaturas',
          amount: sub.amount, date: todayISO(), createdAt: Date.now(),
        });
        saveData();
        renderFinancas();
        alert(`Pagamento de ${sub.name} lançado nas transações.`);
      }
      break;
    }
    case 'tx-del':
      state.transactions = state.transactions.filter(t => t.id !== id);
      saveData(); renderFinancas();
      break;
    case 'task-toggle': {
      const task = state.tasks.find(t => t.id === id);
      if (task) { task.done = !task.done; saveData(); renderTasks(); }
      break;
    }
    case 'task-del':
      state.tasks = state.tasks.filter(t => t.id !== id);
      saveData(); renderTasks();
      break;
    case 'note-del':
      if (confirm('Excluir esta nota?')) {
        state.notes = state.notes.filter(n => n.id !== id);
        saveData(); renderNotes();
      }
      break;
  }
});

document.getElementById('fab-add').addEventListener('click', () => {
  if (currentTab === 'financas') openTransactionModal();
  else if (currentTab === 'lembretes') openTaskModal();
  else if (currentTab === 'diario') openNoteModal();
});

/* ---------- AJUSTES: BACKUP ---------- */

document.getElementById('btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ze-backup-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!confirm('Importar este backup vai substituir todos os dados atuais. Continuar?')) return;
      for (const key of ['transactions', 'subscriptions', 'goals', 'tasks', 'notes']) {
        state[key] = Array.isArray(data[key]) ? data[key] : [];
      }
      saveData();
      renderAll();
      alert('Backup importado com sucesso!');
    } catch (err) {
      alert('Arquivo inválido.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('btn-clear').addEventListener('click', () => {
  if (confirm('Isso vai apagar TODOS os seus dados permanentemente. Tem certeza?')) {
    if (confirm('Última confirmação: apagar tudo mesmo?')) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  }
});

/* ---------- INIT ---------- */

function renderAll() {
  renderFinancas();
  renderTasks();
  renderNotes();
}

renderAll();
switchTab('financas');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
