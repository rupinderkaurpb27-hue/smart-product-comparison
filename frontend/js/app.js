const form = document.querySelector('#compare-form');
const keywordInput = document.querySelector('#keyword');
const budgetSlider = document.querySelector('#budget');
const budgetValue = document.querySelector('#budget-value');
const productResults = document.querySelector('#product-results');
const compareButton = form.querySelector('button[type="submit"]');
const toast = document.querySelector('#toast');
const rupeeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  currencyDisplay: 'symbol',
  maximumFractionDigits: 0,
});
const tabs = [...document.querySelectorAll('[role="tab"]')];
let currentComparison = null;

function formatRupees(amount) {
  return rupeeFormatter.format(Number(amount) || 0);
}

function updateBudget() {
  budgetValue.value = formatRupees(budgetSlider.value);
  budgetValue.textContent = budgetValue.value;
}

function showMessage(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(showMessage.timeoutId);
  showMessage.timeoutId = window.setTimeout(() => toast.classList.remove('is-visible'), 4200);
}

function sentimentFor(score) {
  if (score > 0.05) return { label: 'POSITIVE', className: 'sentiment-positive' };
  if (score < -0.05) return { label: 'NEGATIVE', className: 'sentiment-negative' };
  return { label: 'NEUTRAL', className: 'sentiment-neutral' };
}

function renderSummary(selections, budget) {
  const spent = selections.reduce((total, item) => total + item.price * item.fraction, 0);
  const percent = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  document.querySelector('#meter-fill').style.width = `${percent}%`;
  document.querySelector('#meter-percent').textContent = `${Math.round(percent)}%`;
  document.querySelector('.budget-meter').setAttribute('aria-label', `${Math.round(percent)} percent of budget allocated`);
  document.querySelector('#summary-spent').textContent = formatRupees(spent);
  document.querySelector('#summary-remaining').textContent = formatRupees(Math.max(0, budget - spent));
  document.querySelector('#summary-count').textContent = String(selections.length).padStart(2, '0');
  document.querySelector('#summary-footnote').textContent = selections.length
    ? `${selections.length} ${selections.length === 1 ? 'pick' : 'picks'} ranked by value per rupee.`
    : 'No products fit this budget. Try increasing your limit.';
}

function renderProducts(selections) {
  productResults.replaceChildren();
  productResults.classList.remove('is-loading');

  if (!selections.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<div class="empty-mark" aria-hidden="true">↗</div><p class="empty-title">No picks fit this budget.</p><p class="empty-copy">Increase your maximum budget to see more value-ranked products.</p>';
    productResults.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  selections.forEach((product, index) => {
    const sentiment = sentimentFor(Number(product.sentiment_score) || 0);
    const fraction = Math.max(0, Math.min(1, Number(product.fraction) || 0));
    const percentage = Number((fraction * 100).toFixed(1));
    const allocatedCost = Number(product.price) * fraction;
    const card = document.createElement('article');
    card.className = 'product-card';
    card.style.animationDelay = `${Math.min(index * 65, 260)}ms`;
    card.innerHTML = `
      <div class="card-top">
        <h3 class="product-name"></h3>
        <span class="rank-chip">PICK ${String(index + 1).padStart(2, '0')}</span>
      </div>
      <div class="card-price-row">
        <div class="price-breakdown">
          <span class="original-price"></span>
          <span class="product-price"></span>
        </div>
        <span class="fraction-tag">FRACTIONAL INCLUSION<strong>${percentage}%</strong></span>
      </div>
      <div class="card-divider"></div>
      <div class="card-details">
        <span class="sentiment-badge ${sentiment.className}">${sentiment.label}</span>
        <span class="score-label">VADER ${Number(product.sentiment_score || 0).toFixed(2)}</span>
      </div>`;
    card.querySelector('.product-name').textContent = product.name;
    card.querySelector('.original-price').textContent = `Original Price: ${formatRupees(product.price)}`;
    card.querySelector('.product-price').textContent = `Allocated Cost: ${formatRupees(allocatedCost)}`;
    fragment.append(card);
  });
  productResults.append(fragment);
}

function renderAnalysis(comparison) {
  const chart = document.querySelector('#sentiment-chart');
  chart.replaceChildren();
  if (!comparison || comparison.selections.length === 0) {
    document.querySelector('#analysis-average').textContent = '—';
    document.querySelector('#analysis-positive').textContent = '—';
    document.querySelector('#analysis-count').textContent = '—';
    chart.innerHTML = '<div class="empty-state chart-empty"><div class="empty-mark" aria-hidden="true">◌</div><p class="empty-title">No comparison to analyze yet.</p><p class="empty-copy">Run the comparison engine to see its product sentiment breakdown.</p></div>';
    return;
  }

  const scores = comparison.selections.map((product) => Number(product.sentiment_score) || 0);
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const positiveCount = scores.filter((score) => score > 0.05).length;
  document.querySelector('#analysis-average').textContent = average.toFixed(2);
  document.querySelector('#analysis-positive').textContent = `${positiveCount} / ${scores.length}`;
  document.querySelector('#analysis-count').textContent = String(scores.length).padStart(2, '0');

  comparison.selections.forEach((product, index) => {
    const score = Math.max(-1, Math.min(1, scores[index]));
    const bar = document.createElement('div');
    bar.className = 'sentiment-row';
    const name = document.createElement('span');
    name.className = 'sentiment-product';
    name.textContent = product.name;
    const track = document.createElement('span');
    track.className = 'sentiment-track';
    track.setAttribute('role', 'img');
    track.setAttribute('aria-label', `VADER sentiment score ${score.toFixed(2)}`);
    const fill = document.createElement('span');
    fill.className = `sentiment-bar ${score >= 0 ? 'positive' : 'negative'}`;
    fill.style.left = `${score >= 0 ? 50 : 50 + score * 50}%`;
    fill.style.width = `${Math.abs(score) * 50}%`;
    track.append(fill);
    const scoreLabel = document.createElement('span');
    scoreLabel.className = 'sentiment-score';
    scoreLabel.textContent = score.toFixed(2);
    bar.append(name, track, scoreLabel);
    chart.append(bar);
  });
}

async function loadHistory() {
  const state = document.querySelector('#history-state');
  const tableWrap = document.querySelector('#history-table-wrap');
  const rows = document.querySelector('#history-rows');
  state.hidden = false;
  state.textContent = 'Loading saved calculations…';
  tableWrap.hidden = true;

  try {
    const response = await fetch('http://127.0.0.1:5000/api/history');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Saved calculations are unavailable.');
    const history = Array.isArray(data.history) ? data.history : [];
    rows.replaceChildren();
    document.querySelector('#history-count').textContent = `${history.length} ${history.length === 1 ? 'RECORD' : 'RECORDS'}`;

    history.forEach((record) => {
      const selections = Array.isArray(record.selections) ? record.selections : [];
      const allocated = selections.reduce((sum, item) => sum + item.price * item.fraction, 0);
      const row = document.createElement('tr');
      const date = document.createElement('td');
      const keyword = document.createElement('td');
      const budget = document.createElement('td');
      const picks = document.createElement('td');
      const total = document.createElement('td');
      date.textContent = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(record.created_at));
      keyword.textContent = record.keyword;
      budget.textContent = formatRupees(record.budget);
      picks.textContent = String(selections.length).padStart(2, '0');
      total.textContent = formatRupees(allocated);
      row.append(date, keyword, budget, picks, total);
      rows.append(row);
    });

    state.hidden = history.length > 0;
    state.textContent = 'No saved comparisons yet. Run a comparison to add your first record.';
    tableWrap.hidden = history.length === 0;
  } catch (error) {
    document.querySelector('#history-count').textContent = 'DATABASE OFFLINE';
    state.hidden = false;
    state.textContent = error instanceof TypeError
      ? 'Could not connect to the RupeeWise API. Check that the backend and MongoDB are running.'
      : error.message;
  }
}

function activateTab(tab, focus = false) {
  tabs.forEach((item) => {
    const active = item === tab;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
    document.querySelector(`#${item.getAttribute('aria-controls')}`).hidden = !active;
  });
  if (focus) tab.focus();
  if (tab.id === 'tab-analysis') renderAnalysis(currentComparison);
  if (tab.id === 'tab-history') loadHistory();
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', (event) => {
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex !== undefined) {
      event.preventDefault();
      activateTab(tabs[nextIndex], true);
    }
  });
});

budgetSlider.addEventListener('input', updateBudget);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const keyword = keywordInput.value.trim();
  const budget = Number(budgetSlider.value);
  if (!keyword) {
    keywordInput.focus();
    return;
  }

  compareButton.disabled = true;
  compareButton.querySelector('.button-text').textContent = 'Finding your best picks…';
  productResults.setAttribute('aria-busy', 'true');
  productResults.innerHTML = '<div class="empty-state loading-state"><div class="empty-mark" aria-hidden="true">✳</div><p class="empty-title">Finding your best-value picks…</p><p class="empty-copy">Reviewing sentiment and balancing your budget.</p></div>';
  productResults.classList.add('is-loading');
  document.querySelector('#summary-footnote').textContent = 'Sorting the shortlist by fractional value…';

  try {
    const response = await fetch('http://127.0.0.1:5000/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, budget }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The comparison could not be completed.');
    if (!Array.isArray(data.selections)) throw new Error('The API returned an unexpected response.');

    currentComparison = { keyword, budget, selections: data.selections };
    renderProducts(data.selections);
    renderSummary(data.selections, budget);
    if (data.history_saved === false) {
      document.querySelector('#summary-footnote').textContent = 'Comparison complete, but MongoDB could not save this run.';
    }
  } catch (error) {
    productResults.classList.remove('is-loading');
    productResults.innerHTML = '<div class="empty-state"><div class="empty-mark" aria-hidden="true">!</div><p class="empty-title">Comparison unavailable.</p><p class="empty-copy">Check that the product API is running, then try again.</p></div>';
    document.querySelector('#summary-footnote').textContent = 'Could not calculate this comparison.';
    showMessage(error instanceof TypeError ? 'Could not reach the API at 127.0.0.1:5000. Start the Flask backend and try again.' : error.message);
  } finally {
    compareButton.disabled = false;
    compareButton.querySelector('.button-text').textContent = 'Compare products';
    productResults.setAttribute('aria-busy', 'false');
  }
});

updateBudget();