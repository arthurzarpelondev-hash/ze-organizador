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
    { id: 'delivery', label: 'Delivery', icon: '🛵' },
    { id: 'transporte', label: 'Transporte', icon: '🚗' },
    { id: 'moradia', label: 'Moradia', icon: '🏠' },
    { id: 'contas', label: 'Contas/Boletos', icon: '🧾' },
    { id: 'lazer', label: 'Lazer', icon: '🎮' },
    { id: 'saude', label: 'Saúde', icon: '💊' },
    { id: 'educacao', label: 'Educação', icon: '📚' },
    { id: 'assinaturas', label: 'Assinaturas', icon: '🔁' },
    { id: 'outros_despesa', label: 'Outros', icon: '📦' },
  ],
};

const BIZ_CATEGORIES = {
  income: [
    { id: 'venda', label: 'Venda', icon: '🛍️' },
    { id: 'servico', label: 'Serviço prestado', icon: '🧰' },
    { id: 'outros_biz_receita', label: 'Outros', icon: '➕' },
  ],
  expense: [
    { id: 'fornecedor', label: 'Fornecedor/Insumos', icon: '📦' },
    { id: 'marketing', label: 'Marketing', icon: '📣' },
    { id: 'ferramentas', label: 'Ferramentas/Software', icon: '🛠️' },
    { id: 'frete', label: 'Frete/Entrega', icon: '🚚' },
    { id: 'taxas', label: 'Taxas e impostos', icon: '💸' },
    { id: 'outros_biz_despesa', label: 'Outros', icon: '📦' },
  ],
};

const BIZ_STATUS_LABELS = { planejando: 'Planejando', andamento: 'Em andamento', concluido: 'Concluído' };

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('Falha ao ler dados salvos', e); }
  return {
    transactions: [], subscriptions: [], goals: [], tasks: [], notes: [],
    bizTransactions: [], bizGoals: [], bizPayables: [], bizReceivables: [],
  };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const state = loadData();
for (const key of [
  'transactions', 'subscriptions', 'goals', 'tasks', 'notes', 'incomes',
  'bizTransactions', 'bizGoals', 'bizPayables', 'bizReceivables',
]) {
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

function bizCategoryInfo(type, id) {
  const list = BIZ_CATEGORIES[type] || [];
  return list.find(c => c.id === id) || { icon: '💰', label: 'Outros' };
}

/* ---------- NAVIGATION ---------- */

const TAB_TITLES = {
  financas: 'Finanças', rapido: 'Rápido', relatorio: 'Gastos por categoria', negocio: 'Negócio',
  lembretes: 'Lembretes', diario: 'Diário', ajustes: 'Ajustes',
};
const NO_FAB_TABS = ['ajustes', 'rapido', 'relatorio'];
let currentTab = 'financas';

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
  document.getElementById('page-title').textContent = TAB_TITLES[tab];
  document.getElementById('fab-add').style.display = NO_FAB_TABS.includes(tab) ? 'none' : 'flex';
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
  renderIncomes();
  renderSubscriptions();
  renderTransactions();
  renderReport();
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

function renderIncomes() {
  const el = document.getElementById('income-list');
  if (!state.incomes.length) {
    el.innerHTML = '<div class="empty-hint">Nenhuma renda fixa cadastrada. Cadastre seu salário pra ele ser lançado sozinho todo mês.</div>';
    return;
  }
  const nowMonth = todayISO().slice(0, 7);
  el.innerHTML = state.incomes.map(inc => {
    const launched = inc.lastLaunchedMonth === nowMonth;
    return `
    <div class="card sub-card-wrap">
      <div class="sub-card">
        <div>
          <div class="sub-name">${escapeHTML(inc.name)}</div>
          <div class="sub-due">Todo dia ${inc.payDay} · ${launched ? 'já lançado este mês' : 'ainda não lançado este mês'}</div>
        </div>
        <div class="sub-amount">${brl(inc.amount)}</div>
      </div>
      <div class="sub-actions">
        ${launched ? '' : `<button class="link-btn" data-action="income-launch" data-id="${inc.id}">Lançar agora</button>`}
        <button class="link-btn danger" data-action="income-del" data-id="${inc.id}">Excluir</button>
      </div>
    </div>`;
  }).join('');
}

function launchIncome(inc) {
  state.transactions.push({
    id: uid(), type: 'income', desc: inc.name, category: 'salario',
    amount: inc.amount, date: todayISO(), createdAt: Date.now(),
  });
  inc.lastLaunchedMonth = todayISO().slice(0, 7);
}

function autoLaunchIncomes() {
  const nowMonth = todayISO().slice(0, 7);
  const now = new Date();
  let changed = false;
  for (const inc of state.incomes) {
    if (inc.lastLaunchedMonth === nowMonth) continue;
    if (now.getDate() >= inc.payDay) {
      launchIncome(inc);
      changed = true;
    }
  }
  if (changed) saveData();
}

function openIncomeModal() {
  openModal('Nova renda fixa', `
    <div class="field">
      <label>Nome</label>
      <input type="text" id="income-name" placeholder="Ex: Salário CLT, Salário empresa..." />
    </div>
    <div class="field">
      <label>Valor (R$)</label>
      <input type="number" id="income-amount" inputmode="decimal" step="0.01" min="0" placeholder="0,00" />
    </div>
    <div class="field">
      <label>Dia do mês que cai o pagamento</label>
      <input type="number" id="income-day" min="1" max="31" value="5" />
    </div>
    <button class="btn-submit" id="income-submit">Salvar</button>
  `);
  document.getElementById('income-submit').addEventListener('click', () => {
    const name = document.getElementById('income-name').value.trim();
    const amount = parseFloat(document.getElementById('income-amount').value);
    const payDay = Math.min(31, Math.max(1, parseInt(document.getElementById('income-day').value) || 1));
    if (!name || !amount || amount <= 0) { alert('Preencha nome e valor.'); return; }
    state.incomes.push({ id: uid(), name, amount, payDay, lastLaunchedMonth: null });
    saveData();
    renderIncomes();
    closeModal();
  });
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

/* ---------- RELATÓRIO: GASTOS POR CATEGORIA ---------- */

let reportMonthOffset = 0;

function reportMonthDate() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + reportMonthOffset);
  return d;
}

function reportMonthKey() {
  const d = reportMonthDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function renderReport() {
  const key = reportMonthKey();
  const label = reportMonthDate().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  document.getElementById('report-month-label').textContent = label.charAt(0).toUpperCase() + label.slice(1);
  document.getElementById('report-next').disabled = reportMonthOffset >= 0;

  const monthTx = state.transactions.filter(t => t.type === 'expense' && monthKey(t.date) === key);
  const total = monthTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  document.getElementById('report-total').textContent = brl(total);

  const byCategory = {};
  for (const t of monthTx) {
    byCategory[t.category] = (byCategory[t.category] || 0) + (Number(t.amount) || 0);
  }
  const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const el = document.getElementById('report-categories');
  if (!rows.length) {
    el.innerHTML = '<div class="empty-hint">Nenhum gasto registrado nesse mês.</div>';
    return;
  }
  const max = rows[0][1];
  el.innerHTML = rows.map(([catId, value]) => {
    const cat = categoryInfo('expense', catId);
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    const barPct = max > 0 ? Math.round((value / max) * 100) : 0;
    return `
    <div class="card report-row">
      <div class="report-row-top">
        <span>${cat.icon} ${cat.label}</span>
        <span>${brl(value)}</span>
      </div>
      <div class="report-bar-track"><div class="report-bar-fill" style="width:${barPct}%"></div></div>
      <div class="report-row-pct">${pct}% do total do mês</div>
    </div>`;
  }).join('');
}

document.getElementById('report-prev').addEventListener('click', () => { reportMonthOffset--; renderReport(); });
document.getElementById('report-next').addEventListener('click', () => {
  if (reportMonthOffset < 0) { reportMonthOffset++; renderReport(); }
});

/* ---------- NEGÓCIO ---------- */

function renderNegocio() {
  const nowMonth = todayISO().slice(0, 7);
  let saldo = 0, receitasMes = 0, despesasMes = 0;

  for (const tx of state.bizTransactions) {
    const val = Number(tx.amount) || 0;
    if (tx.type === 'income') saldo += val; else saldo -= val;
    if (monthKey(tx.date) === nowMonth) {
      if (tx.type === 'income') receitasMes += val; else despesasMes += val;
    }
  }

  document.getElementById('biz-saldo-total').textContent = brl(saldo);
  document.getElementById('biz-receitas-mes').textContent = brl(receitasMes);
  document.getElementById('biz-despesas-mes').textContent = brl(despesasMes);

  renderBizGoals();
  renderBizPayables();
  renderBizReceivables();
  renderBizTransactions();
}

function renderBizGoals() {
  const el = document.getElementById('biz-goals-list');
  if (!state.bizGoals.length) {
    el.innerHTML = '<div class="empty-hint">Nenhuma meta ou projeto ainda. Toque em "+ Nova" pra criar.</div>';
    return;
  }
  el.innerHTML = state.bizGoals.map(g => {
    const hasTarget = (g.target || 0) > 0;
    const pct = hasTarget ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
    return `
    <div class="card goal-card">
      <div class="goal-top">
        <span class="goal-name">${escapeHTML(g.name)}</span>
        <span class="goal-amounts">${hasTarget ? `${brl(g.saved)} / ${brl(g.target)}` : (BIZ_STATUS_LABELS[g.status] || 'Planejando')}</span>
      </div>
      ${hasTarget ? `<div class="goal-progress-track"><div class="goal-progress-fill" style="width:${pct}%"></div></div>` : ''}
      <div class="goal-actions">
        ${hasTarget ? `<button class="link-btn" data-action="biz-goal-add" data-id="${g.id}">+ Adicionar valor</button>` : ''}
        <button class="link-btn danger" data-action="biz-goal-del" data-id="${g.id}">Excluir</button>
      </div>
    </div>`;
  }).join('');
}

function renderBizTransactions() {
  const el = document.getElementById('biz-tx-list');
  const list = [...state.bizTransactions].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt);
  if (!list.length) {
    el.innerHTML = '<div class="empty-hint">Nenhum lançamento do negócio ainda. Toque no botão + pra registrar.</div>';
    return;
  }
  el.innerHTML = list.slice(0, 100).map(tx => {
    const cat = bizCategoryInfo(tx.type, tx.category);
    const sign = tx.type === 'income' ? '+' : '-';
    return `
    <div class="card tx-row">
      <div class="tx-icon">${cat.icon}</div>
      <div class="tx-info">
        <div class="tx-desc">${escapeHTML(tx.desc || cat.label)}</div>
        <div class="tx-meta">${cat.label} · ${formatDateBR(tx.date)}</div>
      </div>
      <div class="tx-amount ${tx.type}">${sign} ${brl(tx.amount)}</div>
      <button class="tx-del" data-action="biz-tx-del" data-id="${tx.id}">🗑</button>
    </div>`;
  }).join('');
}

function renderBizPayables() {
  const el = document.getElementById('biz-payables-list');
  const list = [...state.bizPayables].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  if (!list.length) {
    el.innerHTML = '<div class="empty-hint">Nenhuma conta a pagar pendente.</div>';
    return;
  }
  const today = todayISO();
  el.innerHTML = list.map(p => {
    const overdue = p.dueDate && p.dueDate < today;
    return `
    <div class="card sub-card-wrap">
      <div class="sub-card">
        <div>
          <div class="sub-name">${escapeHTML(p.desc)}</div>
          <div class="sub-due ${overdue ? 'soon' : ''}">Vence em ${formatDateBR(p.dueDate)}${overdue ? ' · atrasada' : ''}</div>
        </div>
        <div class="sub-amount">${brl(p.amount)}</div>
      </div>
      <div class="sub-actions">
        <button class="link-btn" data-action="biz-payable-pay" data-id="${p.id}">Marcar como paga</button>
        <button class="link-btn danger" data-action="biz-payable-del" data-id="${p.id}">Excluir</button>
      </div>
    </div>`;
  }).join('');
}

function renderBizReceivables() {
  const el = document.getElementById('biz-receivables-list');
  const list = [...state.bizReceivables].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  if (!list.length) {
    el.innerHTML = '<div class="empty-hint">Nenhuma conta a receber pendente.</div>';
    return;
  }
  const today = todayISO();
  el.innerHTML = list.map(r => {
    const overdue = r.dueDate && r.dueDate < today;
    return `
    <div class="card sub-card-wrap">
      <div class="sub-card">
        <div>
          <div class="sub-name">${escapeHTML(r.desc)}</div>
          <div class="sub-due ${overdue ? 'soon' : ''}">Previsto para ${formatDateBR(r.dueDate)}${overdue ? ' · atrasada' : ''}</div>
        </div>
        <div class="sub-amount">${brl(r.amount)}</div>
      </div>
      <div class="sub-actions">
        <button class="link-btn" data-action="biz-receivable-receive" data-id="${r.id}">Marcar como recebida</button>
        <button class="link-btn danger" data-action="biz-receivable-del" data-id="${r.id}">Excluir</button>
      </div>
    </div>`;
  }).join('');
}

function bizCategoryOptions(type) {
  return BIZ_CATEGORIES[type].map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('');
}

function openBizTransactionModal() {
  let type = 'expense';
  openModal('Novo lançamento do negócio', `
    <div class="field">
      <div class="segmented" id="biz-tx-type-seg">
        <button type="button" data-type="expense" class="active expense">Despesa</button>
        <button type="button" data-type="income" class="income">Receita</button>
      </div>
    </div>
    <div class="field">
      <label>Descrição</label>
      <input type="text" id="biz-tx-desc" placeholder="Ex: Venda pro cliente X, Compra de material..." />
    </div>
    <div class="field">
      <label>Valor (R$)</label>
      <input type="number" id="biz-tx-amount" inputmode="decimal" step="0.01" min="0" placeholder="0,00" />
    </div>
    <div class="field">
      <label>Categoria</label>
      <select id="biz-tx-category">${bizCategoryOptions('expense')}</select>
    </div>
    <div class="field">
      <label>Data</label>
      <input type="date" id="biz-tx-date" value="${todayISO()}" />
    </div>
    <button class="btn-submit" id="biz-tx-submit">Salvar</button>
  `);

  const seg = document.getElementById('biz-tx-type-seg');
  seg.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      type = btn.dataset.type;
      seg.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('biz-tx-category').innerHTML = bizCategoryOptions(type);
    });
  });

  document.getElementById('biz-tx-submit').addEventListener('click', () => {
    const desc = document.getElementById('biz-tx-desc').value.trim();
    const amount = parseFloat(document.getElementById('biz-tx-amount').value);
    const category = document.getElementById('biz-tx-category').value;
    const date = document.getElementById('biz-tx-date').value || todayISO();
    if (!amount || amount <= 0) { alert('Informe um valor válido.'); return; }
    state.bizTransactions.push({ id: uid(), type, desc, amount, category, date, createdAt: Date.now() });
    saveData();
    renderNegocio();
    closeModal();
  });
}

function openBizGoalModal() {
  openModal('Nova meta ou projeto', `
    <div class="field">
      <label>Nome</label>
      <input type="text" id="biz-goal-name" placeholder="Ex: Comprar equipamento, Lançar novo produto..." />
    </div>
    <div class="field">
      <label>Valor objetivo (R$) — deixe em branco se não for financeiro</label>
      <input type="number" id="biz-goal-target" inputmode="decimal" step="0.01" min="0" placeholder="0,00" />
    </div>
    <div class="field">
      <label>Já investido / guardado (R$)</label>
      <input type="number" id="biz-goal-saved" inputmode="decimal" step="0.01" min="0" value="0" />
    </div>
    <div class="field">
      <label>Status</label>
      <select id="biz-goal-status">
        <option value="planejando">Planejando</option>
        <option value="andamento">Em andamento</option>
        <option value="concluido">Concluído</option>
      </select>
    </div>
    <button class="btn-submit" id="biz-goal-submit">Salvar</button>
  `);
  document.getElementById('biz-goal-submit').addEventListener('click', () => {
    const name = document.getElementById('biz-goal-name').value.trim();
    const target = parseFloat(document.getElementById('biz-goal-target').value) || 0;
    const saved = parseFloat(document.getElementById('biz-goal-saved').value) || 0;
    const status = document.getElementById('biz-goal-status').value;
    if (!name) { alert('Digite um nome para a meta ou projeto.'); return; }
    state.bizGoals.push({ id: uid(), name, target, saved, status });
    saveData();
    renderBizGoals();
    closeModal();
  });
}

function openBizGoalAddModal(goalId) {
  const goal = state.bizGoals.find(g => g.id === goalId);
  if (!goal) return;
  openModal(`Adicionar valor - ${goal.name}`, `
    <div class="field">
      <label>Valor a adicionar (R$)</label>
      <input type="number" id="biz-goal-add-amount" inputmode="decimal" step="0.01" min="0" placeholder="0,00" />
    </div>
    <button class="btn-submit" id="biz-goal-add-submit">Adicionar</button>
  `);
  document.getElementById('biz-goal-add-submit').addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('biz-goal-add-amount').value);
    if (!amount || amount <= 0) { alert('Informe um valor válido.'); return; }
    goal.saved = (goal.saved || 0) + amount;
    saveData();
    renderBizGoals();
    closeModal();
  });
}

function openBizPayableModal() {
  openModal('Nova conta a pagar', `
    <div class="field">
      <label>Descrição</label>
      <input type="text" id="biz-payable-desc" placeholder="Ex: Fornecedor de embalagens, Aluguel do galpão..." />
    </div>
    <div class="field">
      <label>Valor (R$)</label>
      <input type="number" id="biz-payable-amount" inputmode="decimal" step="0.01" min="0" placeholder="0,00" />
    </div>
    <div class="field">
      <label>Categoria</label>
      <select id="biz-payable-category">${bizCategoryOptions('expense')}</select>
    </div>
    <div class="field">
      <label>Vencimento</label>
      <input type="date" id="biz-payable-due" value="${todayISO()}" />
    </div>
    <button class="btn-submit" id="biz-payable-submit">Salvar</button>
  `);
  document.getElementById('biz-payable-submit').addEventListener('click', () => {
    const desc = document.getElementById('biz-payable-desc').value.trim();
    const amount = parseFloat(document.getElementById('biz-payable-amount').value);
    const category = document.getElementById('biz-payable-category').value;
    const dueDate = document.getElementById('biz-payable-due').value || todayISO();
    if (!desc || !amount || amount <= 0) { alert('Preencha descrição e valor.'); return; }
    state.bizPayables.push({ id: uid(), desc, amount, category, dueDate });
    saveData();
    renderBizPayables();
    closeModal();
  });
}

function openBizReceivableModal() {
  openModal('Nova conta a receber', `
    <div class="field">
      <label>Descrição</label>
      <input type="text" id="biz-receivable-desc" placeholder="Ex: Cliente Y, Parcela do projeto Z..." />
    </div>
    <div class="field">
      <label>Valor (R$)</label>
      <input type="number" id="biz-receivable-amount" inputmode="decimal" step="0.01" min="0" placeholder="0,00" />
    </div>
    <div class="field">
      <label>Categoria</label>
      <select id="biz-receivable-category">${bizCategoryOptions('income')}</select>
    </div>
    <div class="field">
      <label>Previsão de recebimento</label>
      <input type="date" id="biz-receivable-due" value="${todayISO()}" />
    </div>
    <button class="btn-submit" id="biz-receivable-submit">Salvar</button>
  `);
  document.getElementById('biz-receivable-submit').addEventListener('click', () => {
    const desc = document.getElementById('biz-receivable-desc').value.trim();
    const amount = parseFloat(document.getElementById('biz-receivable-amount').value);
    const category = document.getElementById('biz-receivable-category').value;
    const dueDate = document.getElementById('biz-receivable-due').value || todayISO();
    if (!desc || !amount || amount <= 0) { alert('Preencha descrição e valor.'); return; }
    state.bizReceivables.push({ id: uid(), desc, amount, category, dueDate });
    saveData();
    renderBizReceivables();
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
    syncReminders();
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

/* ---------- RÁPIDO: texto, voz, comprovante ---------- */

const QUICK_EXPENSE_VERBS = ['gastei', 'paguei', 'comprei', 'gasto'];
const QUICK_INCOME_VERBS = ['recebi', 'ganhei', 'caiu', 'entrou'];

const CATEGORY_KEYWORDS = {
  alimentacao: ['mercado', 'supermercado', 'feira', 'restaurante', 'lanche', 'comida', 'padaria', 'acougue'],
  delivery: ['ifood', 'delivery', 'rappi', 'entrega'],
  transporte: ['uber', '99', 'gasolina', 'combustivel', 'onibus', 'metro', 'estacionamento', 'pedagio'],
  moradia: ['aluguel', 'condominio'],
  contas: ['luz', 'agua', 'internet', 'gas', 'boleto', 'fatura', 'conta'],
  lazer: ['cinema', 'bar', 'festa', 'show', 'viagem', 'passeio', 'jogo'],
  saude: ['farmacia', 'remedio', 'medico', 'consulta', 'dentista'],
  educacao: ['curso', 'livro', 'faculdade', 'escola', 'mensalidade'],
  assinaturas: ['netflix', 'spotify', 'amazon', 'academia', 'assinatura'],
};
const INCOME_CATEGORY_KEYWORDS = {
  salario: ['salario'],
  freela: ['freela', 'freelance', 'bico'],
  investimento: ['investimento', 'dividendo', 'rendimento'],
};

function stripAccents(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function parseQuickEntry(rawText) {
  const text = (rawText || '').trim();
  if (!text) return null;
  const norm = stripAccents(text.toLowerCase());

  let type = 'expense';
  if (QUICK_INCOME_VERBS.some(v => norm.includes(v))) type = 'income';
  else if (QUICK_EXPENSE_VERBS.some(v => norm.includes(v))) type = 'expense';

  const amountMatch = norm.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1].replace(',', '.'));
  if (!amount || amount <= 0) return null;

  const keywordMap = type === 'income' ? INCOME_CATEGORY_KEYWORDS : CATEGORY_KEYWORDS;
  let category = type === 'income' ? 'outros_receita' : 'outros_despesa';
  for (const [cat, words] of Object.entries(keywordMap)) {
    if (words.some(w => norm.includes(w))) { category = cat; break; }
  }

  return { type, amount, category, desc: text };
}

function renderQuickRecent() {
  const el = document.getElementById('quick-recent');
  const list = state.transactions.filter(t => t.quick).sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  if (!list.length) {
    el.innerHTML = '<div class="empty-hint">Nada lançado por aqui ainda.</div>';
    return;
  }
  el.innerHTML = list.map(tx => {
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

function handleQuickSubmit() {
  const input = document.getElementById('quick-text');
  const parsed = parseQuickEntry(input.value);
  const feedbackEl = document.getElementById('quick-feedback');
  if (!parsed) {
    feedbackEl.innerHTML = `<div class="quick-feedback-card error">Não entendi o valor. Tente algo como "gastei 25 no mercado" ou "recebi 3000 de salário".</div>`;
    return;
  }
  const tx = {
    id: uid(), type: parsed.type, desc: parsed.desc, category: parsed.category,
    amount: parsed.amount, date: todayISO(), createdAt: Date.now(), quick: true,
  };
  state.transactions.push(tx);
  saveData();
  renderFinancas();
  renderQuickRecent();
  const cat = categoryInfo(parsed.type, parsed.category);
  const label = parsed.type === 'income' ? 'Receita' : 'Despesa';
  feedbackEl.innerHTML = `
    <div class="quick-feedback-card">
      ✅ ${label} de ${brl(parsed.amount)} em ${cat.label} adicionada.
      <div class="qf-actions">
        <button class="link-btn danger" data-action="quick-undo" data-id="${tx.id}">Desfazer</button>
      </div>
    </div>`;
  input.value = '';
}

document.getElementById('quick-submit').addEventListener('click', handleQuickSubmit);
document.getElementById('quick-text').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); handleQuickSubmit(); }
});

/* Voz: só aparece se o navegador suportar (ex: Chrome Android). iOS Safari não suporta. */
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRec) {
  const recognition = new SpeechRec();
  recognition.lang = 'pt-BR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  const micBtn = document.getElementById('quick-mic');
  micBtn.hidden = false;
  let listening = false;

  micBtn.addEventListener('click', () => {
    if (listening) { recognition.stop(); return; }
    recognition.start();
  });
  recognition.addEventListener('start', () => { listening = true; micBtn.classList.add('listening'); });
  recognition.addEventListener('end', () => { listening = false; micBtn.classList.remove('listening'); });
  recognition.addEventListener('result', (e) => {
    const text = e.results[0][0].transcript;
    document.getElementById('quick-text').value = text;
    handleQuickSubmit();
  });
  recognition.addEventListener('error', () => { listening = false; micBtn.classList.remove('listening'); });
}

/* Comprovante: OCR local via Tesseract.js (grátis, roda no navegador, sem chave de API) */
let tesseractLoadPromise = null;
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve();
  if (tesseractLoadPromise) return tesseractLoadPromise;
  tesseractLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Falha ao carregar leitor de imagem.'));
    document.head.appendChild(s);
  });
  return tesseractLoadPromise;
}

function extractAmountFromText(text) {
  const lower = text.toLowerCase();
  const lines = lower.split('\n');
  const amountRegex = /\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?/g;
  function parseNum(str) {
    const s = str.replace(/\.(?=\d{3})/g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }
  const candidates = [];
  for (const line of lines) {
    const matches = line.match(amountRegex);
    if (!matches) continue;
    for (const m of matches) {
      const n = parseNum(m);
      if (n && n > 0 && n < 1000000) candidates.push({ n, isTotal: line.includes('total') });
    }
  }
  if (!candidates.length) return null;
  const totals = candidates.filter(c => c.isTotal);
  const pool = totals.length ? totals : candidates;
  return Math.max(...pool.map(c => c.n));
}

function showReceiptConfirm(amount) {
  const el = document.getElementById('receipt-confirm');
  el.innerHTML = `
    <div class="field">
      <label>Descrição</label>
      <input type="text" id="receipt-desc" value="Comprovante" />
    </div>
    <div class="field">
      <label>Valor (R$)</label>
      <input type="number" id="receipt-amount" inputmode="decimal" step="0.01" min="0" value="${amount ? amount.toFixed(2) : ''}" />
    </div>
    <div class="field">
      <label>Categoria</label>
      <select id="receipt-category">${categoryOptions('expense')}</select>
    </div>
    <button class="btn-submit" id="receipt-save">Salvar despesa</button>
  `;
  document.getElementById('receipt-save').addEventListener('click', () => {
    const desc = document.getElementById('receipt-desc').value.trim() || 'Comprovante';
    const amt = parseFloat(document.getElementById('receipt-amount').value);
    const category = document.getElementById('receipt-category').value;
    if (!amt || amt <= 0) { alert('Informe um valor válido.'); return; }
    state.transactions.push({
      id: uid(), type: 'expense', desc, category, amount: amt,
      date: todayISO(), createdAt: Date.now(), quick: true,
    });
    saveData();
    renderFinancas();
    renderQuickRecent();
    el.innerHTML = '';
    document.getElementById('receipt-status').textContent = '✅ Despesa salva!';
  });
}

document.getElementById('receipt-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const statusEl = document.getElementById('receipt-status');
  document.getElementById('receipt-confirm').innerHTML = '';
  statusEl.textContent = 'Carregando leitor de imagem...';
  try {
    await loadTesseract();
    statusEl.textContent = '📖 Lendo comprovante, pode levar alguns segundos...';
    const { data } = await Tesseract.recognize(file, 'por');
    const amount = extractAmountFromText(data.text || '');
    statusEl.textContent = amount
      ? `Valor encontrado: ${brl(amount)}. Confira e salve abaixo.`
      : 'Não consegui identificar o valor automaticamente. Preencha manualmente abaixo.';
    showReceiptConfirm(amount);
  } catch (err) {
    statusEl.textContent = 'Não consegui ler a imagem (verifique sua internet). Preencha manualmente abaixo.';
    showReceiptConfirm(null);
  }
  e.target.value = '';
});

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
    case 'new-income': openIncomeModal(); break;
    case 'income-launch': {
      const inc = state.incomes.find(i => i.id === id);
      if (inc) { launchIncome(inc); saveData(); renderFinancas(); }
      break;
    }
    case 'income-del':
      if (confirm('Excluir esta renda fixa?')) {
        state.incomes = state.incomes.filter(i => i.id !== id);
        saveData(); renderIncomes();
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
      saveData(); renderFinancas(); renderQuickRecent();
      break;
    case 'quick-undo':
      state.transactions = state.transactions.filter(t => t.id !== id);
      saveData(); renderFinancas(); renderQuickRecent();
      document.getElementById('quick-feedback').innerHTML = '';
      break;
    case 'task-toggle': {
      const task = state.tasks.find(t => t.id === id);
      if (task) { task.done = !task.done; saveData(); renderTasks(); syncReminders(); }
      break;
    }
    case 'task-del':
      state.tasks = state.tasks.filter(t => t.id !== id);
      saveData(); renderTasks(); syncReminders();
      break;
    case 'note-del':
      if (confirm('Excluir esta nota?')) {
        state.notes = state.notes.filter(n => n.id !== id);
        saveData(); renderNotes();
      }
      break;
    case 'new-biz-goal': openBizGoalModal(); break;
    case 'biz-goal-add': openBizGoalAddModal(id); break;
    case 'biz-goal-del':
      if (confirm('Excluir esta meta ou projeto?')) {
        state.bizGoals = state.bizGoals.filter(g => g.id !== id);
        saveData(); renderBizGoals();
      }
      break;
    case 'biz-tx-del':
      state.bizTransactions = state.bizTransactions.filter(t => t.id !== id);
      saveData(); renderNegocio();
      break;
    case 'new-biz-payable': openBizPayableModal(); break;
    case 'biz-payable-pay': {
      const payable = state.bizPayables.find(p => p.id === id);
      if (payable) {
        state.bizTransactions.push({
          id: uid(), type: 'expense', desc: payable.desc, category: payable.category,
          amount: payable.amount, date: todayISO(), createdAt: Date.now(),
        });
        state.bizPayables = state.bizPayables.filter(p => p.id !== id);
        saveData();
        renderNegocio();
      }
      break;
    }
    case 'biz-payable-del':
      if (confirm('Excluir esta conta a pagar?')) {
        state.bizPayables = state.bizPayables.filter(p => p.id !== id);
        saveData(); renderBizPayables();
      }
      break;
    case 'new-biz-receivable': openBizReceivableModal(); break;
    case 'biz-receivable-receive': {
      const receivable = state.bizReceivables.find(r => r.id === id);
      if (receivable) {
        state.bizTransactions.push({
          id: uid(), type: 'income', desc: receivable.desc, category: receivable.category,
          amount: receivable.amount, date: todayISO(), createdAt: Date.now(),
        });
        state.bizReceivables = state.bizReceivables.filter(r => r.id !== id);
        saveData();
        renderNegocio();
      }
      break;
    }
    case 'biz-receivable-del':
      if (confirm('Excluir esta conta a receber?')) {
        state.bizReceivables = state.bizReceivables.filter(r => r.id !== id);
        saveData(); renderBizReceivables();
      }
      break;
  }
});

document.getElementById('fab-add').addEventListener('click', () => {
  if (currentTab === 'financas') openTransactionModal();
  else if (currentTab === 'lembretes') openTaskModal();
  else if (currentTab === 'diario') openNoteModal();
  else if (currentTab === 'negocio') openBizTransactionModal();
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
      for (const key of [
        'transactions', 'subscriptions', 'goals', 'tasks', 'notes', 'incomes',
        'bizTransactions', 'bizGoals', 'bizPayables', 'bizReceivables',
      ]) {
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

/* ---------- AJUSTES: NOTIFICAÇÕES PUSH ---------- */

const VAPID_PUBLIC_KEY = 'BOT9UN52kNVeOs2DwTEdZQTYRydt8k5W7MUgBLddtiD3sIHhUYET9sKoONTzQbUZwBOxUTbW6YP92nwJ43vrKnI';
const NOTIF_CONFIG_KEY = 'ze_notif_config_v1';

function loadNotifConfig() {
  try {
    const raw = localStorage.getItem(NOTIF_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('Falha ao ler config de notificações', e); }
  return { workerUrl: '', secret: '' };
}

function saveNotifConfig(cfg) {
  localStorage.setItem(NOTIF_CONFIG_KEY, JSON.stringify(cfg));
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function setNotifStatus(msg) {
  const el = document.getElementById('notif-status');
  if (el) el.textContent = msg;
}

async function syncReminders() {
  const cfg = loadNotifConfig();
  if (!cfg.workerUrl || !cfg.secret) return;
  const reminders = state.tasks
    .filter(t => !t.done && t.datetime)
    .map(t => ({ id: t.id, title: t.title, datetimeUTC: new Date(t.datetime).toISOString() }));
  try {
    await fetch(`${cfg.workerUrl}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Ze-Secret': cfg.secret },
      body: JSON.stringify({ reminders }),
    });
  } catch (err) {
    console.warn('Falha ao sincronizar lembretes com o servidor de notificações', err);
  }
}

async function enableNotifications() {
  const cfg = loadNotifConfig();
  if (!cfg.workerUrl || !cfg.secret) {
    setNotifStatus('Preencha e salve o endereço do servidor e a chave secreta antes.');
    return;
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    setNotifStatus('Esse navegador não suporta notificações push.');
    return;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setNotifStatus('Permissão negada. Ative nas configurações de notificação do navegador/celular.');
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await fetch(`${cfg.workerUrl}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Ze-Secret': cfg.secret },
      body: JSON.stringify(sub),
    });
    setNotifStatus('Notificações ativadas! ✅');
    syncReminders();
  } catch (err) {
    console.error(err);
    setNotifStatus('Erro ao ativar notificações: ' + err.message);
  }
}

document.getElementById('btn-save-notif-config').addEventListener('click', () => {
  const workerUrl = document.getElementById('notif-worker-url').value.trim().replace(/\/+$/, '');
  const secret = document.getElementById('notif-secret').value.trim();
  saveNotifConfig({ workerUrl, secret });
  setNotifStatus('Configuração salva.');
});

document.getElementById('btn-enable-notif').addEventListener('click', enableNotifications);

/* ---------- ADICIONAR À TELA DE INÍCIO ---------- */

const INSTALL_DISMISS_KEY = 'ze_install_dismissed_v1';
let deferredInstallPrompt = null;

function isStandaloneApp() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIOSDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function showInstallBanner() {
  if (isStandaloneApp()) return;
  if (localStorage.getItem(INSTALL_DISMISS_KEY)) return;
  document.getElementById('install-banner').hidden = false;
}

function hideInstallBanner() {
  document.getElementById('install-banner').hidden = true;
}

async function triggerInstall() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    if (outcome === 'accepted') hideInstallBanner();
    return;
  }
  if (isIOSDevice()) {
    openModal('Adicionar à tela de início', `
      <p class="muted">No Safari, toque no ícone de compartilhar <strong>⬆️</strong> (barra de baixo, ou de cima no iPad) e depois em <strong>"Adicionar à Tela de Início"</strong>.</p>
    `);
    return;
  }
  openModal('Adicionar à tela de início', `
    <p class="muted">Abra o menu do seu navegador (⋮ ou •••) e procure a opção <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</p>
  `);
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  showInstallBanner();
});

window.addEventListener('appinstalled', hideInstallBanner);

document.getElementById('btn-install').addEventListener('click', triggerInstall);
document.getElementById('btn-install-settings').addEventListener('click', triggerInstall);
document.getElementById('install-dismiss').addEventListener('click', () => {
  hideInstallBanner();
  localStorage.setItem(INSTALL_DISMISS_KEY, '1');
});

if (isIOSDevice() && !isStandaloneApp() && !localStorage.getItem(INSTALL_DISMISS_KEY)) {
  showInstallBanner();
}

/* ---------- INIT ---------- */

function renderAll() {
  renderFinancas();
  renderNegocio();
  renderTasks();
  renderNotes();
  renderQuickRecent();
}

autoLaunchIncomes();
renderAll();
switchTab('financas');

const savedNotifConfig = loadNotifConfig();
document.getElementById('notif-worker-url').value = savedNotifConfig.workerUrl || '';
document.getElementById('notif-secret').value = savedNotifConfig.secret || '';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
