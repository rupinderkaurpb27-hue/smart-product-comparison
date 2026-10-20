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

function renderSummary(bundle, budget) {
  const spent = bundle ? bundle.total_cost : 0;
  const percent = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  document.querySelector('#meter-fill').style.width = `${percent}%`;
  document.querySelector('#meter-percent').textContent = `${Math.round(percent)}%`;
  document.querySelector('.budget-meter').setAttribute('aria-label', `${Math.round(percent)} percent of budget allocated`);
  document.querySelector('#summary-spent').textContent = formatRupees(spent);
  document.querySelector('#summary-remaining').textContent = formatRupees(Math.max(0, budget - spent));
  document.querySelector('#summary-count').textContent = bundle
    ? String(bundle.items.length).padStart(2, '0')
    : '00';
  document.querySelector('#summary-footnote').textContent = bundle
    ? `${bundle.name} selected — saving ${formatRupees(bundle.savings)} on the bundle items.`
    : 'No complete bundle fits this budget. Try increasing your limit.';
}

function renderProducts(bundles, budget) {
  productResults.replaceChildren();
  productResults.classList.remove('is-loading');

  let selectedBundle = bundles.find((bundle) => bundle.available) || null;
  const fragment = document.createDocumentFragment();
  bundles.forEach((bundle, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'bundle-card';
    card.disabled = !bundle.available;
    card.setAttribute('aria-pressed', String(bundle === selectedBundle));
    card.style.animationDelay = `${Math.min(index * 65, 195)}ms`;
    card.innerHTML = `
      <span class="bundle-card-heading">
        <span class="bundle-category"></span>
        <span class="discount-badge"></span>
      </span>
      <span class="bundle-name"></span>
      <span class="bundle-caption">COMPLETE PACKAGE · WHOLE ITEMS ONLY</span>
      <span class="bundle-allowance"></span>
      <span class="bundle-checklist"></span>
      <span class="bundle-divider"></span>
      <span class="bundle-pricing"><span>PACKAGE TOTAL</span><strong class="bundle-total"></strong></span>
      <span class="bundle-savings"></span>
      <span class="bundle-status"></span>`;
    card.querySelector('.bundle-category').textContent = bundle.category;
    card.querySelector('.discount-badge').textContent = `${bundle.discount_percent}% OFF`;
    card.querySelector('.bundle-name').textContent = bundle.name;
    card.querySelector('.bundle-allowance').textContent = `ADD-ON ALLOWANCE ${formatRupees(bundle.remaining_allowance)}`;
    card.querySelector('.bundle-total').textContent = bundle.available
      ? formatRupees(bundle.total_cost)
      : 'Not available';
    card.querySelector('.bundle-savings').textContent = bundle.available
      ? `You save ${formatRupees(bundle.savings)}`
      : `Need ${formatRupees(bundle.shortfall)} more in your remaining budget`;
    card.querySelector('.bundle-status').textContent = bundle.available
      ? 'SELECT PACKAGE'
      : 'INCREASE BUDGET TO UNLOCK';

    const checklist = card.querySelector('.bundle-checklist');
    bundle.items.forEach((item) => {
      const row = document.createElement('span');
      row.className = 'bundle-item';
      const check = document.createElement('span');
      check.className = 'bundle-check';
      check.setAttribute('aria-hidden', 'true');
      check.textContent = '✓';
      const name = document.createElement('span');
      name.className = 'bundle-item-name';
      name.textContent = item.name;
      const price = document.createElement('span');
      price.className = 'bundle-item-price';
      price.textContent = formatRupees(item.price);
      row.append(check, name, price);
      checklist.append(row);
    });

    card.addEventListener('click', () => {
      if (!bundle.available) return;
      selectedBundle = bundle;
      productResults.querySelectorAll('.bundle-card').forEach((option) => {
        option.setAttribute('aria-pressed', String(option === card));
      });
      renderSummary(selectedBundle, budget);
    });
    fragment.append(card);
  });
  productResults.append(fragment);
  renderSummary(selectedBundle, budget);
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
      const availableBundles = Array.isArray(record.bundles)
        ? record.bundles.filter((bundle) => bundle.available)
        : [];
      const bestPackage = availableBundles.reduce(
        (best, bundle) => !best || bundle.total_cost < best.total_cost ? bundle : best,
        null,
      );
      const row = document.createElement('tr');
      const date = document.createElement('td');
      const keyword = document.createElement('td');
      const budget = document.createElement('td');
      const picks = document.createElement('td');
      const total = document.createElement('td');
      date.textContent = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(record.created_at));
      keyword.textContent = record.keyword;
      budget.textContent = formatRupees(record.budget);
      picks.textContent = String(availableBundles.length).padStart(2, '0');
      total.textContent = bestPackage ? formatRupees(bestPackage.total_cost) : '—';
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
  compareButton.querySelector('.button-text').textContent = 'Building your bundles…';
  productResults.setAttribute('aria-busy', 'true');
  productResults.innerHTML = '<div class="empty-state loading-state"><div class="empty-mark" aria-hidden="true">✳</div><p class="empty-title">Building your package options…</p><p class="empty-copy">Finding complete add-ons and applying the best combo discounts.</p></div>';
  productResults.classList.add('is-loading');
  document.querySelector('#summary-footnote').textContent = 'Building three complete, discounted package options…';

  try {
    const response = await fetch('http://127.0.0.1:5000/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, budget }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The comparison could not be completed.');
    if (!Array.isArray(data.selections) || !Array.isArray(data.bundles)) {
      throw new Error('The API returned an unexpected response.');
    }

    currentComparison = { keyword, budget, selections: data.selections };
    renderProducts(data.bundles, budget);
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