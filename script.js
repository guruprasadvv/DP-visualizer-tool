let currentAlgorithm = 'lcs';
let dpTable = [];
let backtrackInfo = [];

// Animation state
let animationSteps = [];
let currentStep = -1;
let animationInterval = null;
let isPlaying = false;
let animationSpeed = 400; // ms per step

// ─── Event listeners ───────────────────────────────────────────────────────
document.querySelectorAll('input[name="algorithm"]').forEach(radio => {
    radio.addEventListener('change', function () {
        currentAlgorithm = this.value;
        updateParameterFields();
        resetTable();
    });
});

document.getElementById('compute-btn').addEventListener('click', computeTable);
document.getElementById('reset-btn').addEventListener('click', resetTable);

// ─── Parameter field toggling ───────────────────────────────────────────────
function updateParameterFields() {
    ['lcs','knapsack','assembly','floyd','subset','mcm','tsp','countsubsets','palindrome'].forEach(id => {
        document.getElementById(id + '-params').classList.add('hidden');
    });
    const el = document.getElementById(currentAlgorithm + '-params');
    if (el) el.classList.remove('hidden');
}

// ─── Speed slider ──────────────────────────────────────────────────────────
document.getElementById('speed-slider')?.addEventListener('input', function () {
    animationSpeed = 1050 - parseInt(this.value); // invert: higher = faster
});

// ─── Playback controls ─────────────────────────────────────────────────────
function setupPlaybackControls() {
    document.getElementById('play-pause-btn')?.addEventListener('click', togglePlayPause);
    document.getElementById('step-back-btn')?.addEventListener('click', stepBack);
    document.getElementById('step-fwd-btn')?.addEventListener('click', stepForward);
    document.getElementById('restart-btn')?.addEventListener('click', restartAnimation);
}

function togglePlayPause() {
    if (isPlaying) pauseAnimation();
    else playAnimation();
}

function playAnimation() {
    if (currentStep >= animationSteps.length - 1) restartAnimation();
    isPlaying = true;
    updatePlayBtn();
    animationInterval = setInterval(() => {
        if (currentStep < animationSteps.length - 1) {
            stepForward();
        } else {
            pauseAnimation();
        }
    }, animationSpeed);
}

function pauseAnimation() {
    isPlaying = false;
    clearInterval(animationInterval);
    updatePlayBtn();
}

function stepForward() {
    if (currentStep < animationSteps.length - 1) {
        currentStep++;
        applyStep(currentStep);
        updateProgressBar();
        updateStepInfo(currentStep);
    }
}

function stepBack() {
    pauseAnimation();
    if (currentStep > 0) {
        currentStep--;
        rebuildUpTo(currentStep);
        updateProgressBar();
        updateStepInfo(currentStep);
    }
}

function restartAnimation() {
    pauseAnimation();
    currentStep = -1;
    clearTableCells();
    updateProgressBar();
    clearStepInfo();
}

function updatePlayBtn() {
    const btn = document.getElementById('play-pause-btn');
    if (!btn) return;
    btn.innerHTML = isPlaying
        ? '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><polygon points="5,3 19,12 5,21"/></svg>';
}

function updateProgressBar() {
    const bar = document.getElementById('progress-fill');
    const label = document.getElementById('step-counter');
    if (!bar) return;
    const pct = animationSteps.length ? ((currentStep + 1) / animationSteps.length) * 100 : 0;
    bar.style.width = pct + '%';
    if (label) label.textContent = `Step ${currentStep + 1} / ${animationSteps.length}`;
}

function clearTableCells() {
    document.querySelectorAll('.dp-cell[data-step]').forEach(td => {
        td.textContent = '·';
        td.className = 'cell-value dp-cell unfilled';
        td.removeAttribute('data-step');
    });
    document.getElementById('recursive-panel-content')?.replaceChildren();
}

function rebuildUpTo(targetStep) {
    clearTableCells();
    for (let s = 0; s <= targetStep; s++) applyStep(s, true);
}

// ─── Apply a single animation step ─────────────────────────────────────────
function applyStep(stepIdx, silent = false) {
    const step = animationSteps[stepIdx];
    if (!step) return;

    const cellId = `dp-cell-${step.row}-${step.col}`;
    const td = document.getElementById(cellId);
    if (td) {
        td.textContent = step.display ?? step.value;
        td.className = `cell-value dp-cell ${step.highlight ? 'cell-match' : ''} ${step.special ? 'cell-special' : ''}`;
        td.setAttribute('data-step', stepIdx);
        if (!silent) {
            td.classList.add('cell-active');
            setTimeout(() => td.classList.remove('cell-active'), 600);
        }
    }

    // Highlight source cells
    if (!silent && step.sources) {
        step.sources.forEach(([r, c]) => {
            const src = document.getElementById(`dp-cell-${r}-${c}`);
            if (src) {
                src.classList.add('cell-source');
                setTimeout(() => src.classList.remove('cell-source'), 600);
            }
        });
    }
}

function updateStepInfo(stepIdx) {
    const step = animationSteps[stepIdx];
    if (!step) return;

    // DP explanation panel
    const dpInfo = document.getElementById('dp-step-info');
    if (dpInfo && step.explanation) {
        dpInfo.innerHTML = `
            <div class="step-badge">Step ${stepIdx + 1}</div>
            <div class="step-formula">${step.formula || ''}</div>
            <div class="step-desc">${step.explanation}</div>
        `;
    }

    // Recursive panel
    const recPanel = document.getElementById('recursive-panel-content');
    if (recPanel && step.recursive) {
        const entry = document.createElement('div');
        entry.className = 'rec-entry' + (step.highlight ? ' rec-highlight' : '');
        entry.innerHTML = step.recursive;
        recPanel.prepend(entry);
        // keep at most 12 entries
        while (recPanel.children.length > 12) recPanel.removeChild(recPanel.lastChild);
    }
}

function clearStepInfo() {
    const dpInfo = document.getElementById('dp-step-info');
    if (dpInfo) dpInfo.innerHTML = '<div class="step-placeholder">Press ▶ to start</div>';
    const recPanel = document.getElementById('recursive-panel-content');
    if (recPanel) recPanel.innerHTML = '';
}

// ─── Shared visualization scaffold ─────────────────────────────────────────
function renderVisualizationScaffold(title, description, recurrenceCode) {
    document.getElementById('table-section').innerHTML = `
        <div class="viz-scaffold">
            <!-- Top bar -->
            <div class="viz-header">
                <div>
                    <h2 class="viz-title">${title}</h2>
                    <p class="viz-desc">${description}</p>
                </div>
                <div class="playback-controls">
                    <button class="ctrl-btn" id="restart-btn-inner" title="Restart">⏮</button>
                    <button class="ctrl-btn" id="step-back-btn" title="Step Back">⏪</button>
                    <button class="ctrl-btn ctrl-primary" id="play-pause-btn" title="Play/Pause">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><polygon points="5,3 19,12 5,21"/></svg>
                    </button>
                    <button class="ctrl-btn" id="step-fwd-btn" title="Step Forward">⏩</button>
                    <div class="speed-wrap">
                        <span>Speed</span>
                        <input type="range" id="speed-slider" min="50" max="1000" value="600">
                    </div>
                </div>
            </div>

            <!-- Progress -->
            <div class="progress-bar-wrap">
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" id="progress-fill"></div>
                </div>
                <span class="step-counter" id="step-counter">Step 0 / ${animationSteps.length}</span>
            </div>

            <!-- Side-by-side layout -->
            <div class="side-by-side">
                <!-- Left: Recursive trace -->
                <div class="panel rec-panel">
                    <div class="panel-head">
                        <span class="panel-badge rec-badge">REC</span>
                        Recursive Call Stack
                    </div>
                    <div class="rec-code">${recurrenceCode}</div>
                    <div class="rec-log" id="recursive-panel-content"></div>
                </div>

                <!-- Right: DP Table -->
                <div class="panel dp-panel">
                    <div class="panel-head">
                        <span class="panel-badge dp-badge">DP</span>
                        Memoization Table
                    </div>
                    <div id="dp-step-info" class="dp-step-info">
                        <div class="step-placeholder">Press ▶ to start</div>
                    </div>
                    <div class="dp-body-row">
                        <div class="dp-table-wrap" id="dp-table-container"></div>
                        <div class="answer-panel" id="answer-panel">
                            <div class="answer-panel-placeholder">Answer<br>appears<br>here</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Legend -->
            <div class="color-legend">
                <div class="legend-item"><span class="swatch swatch-active"></span>Current cell</div>
                <div class="legend-item"><span class="swatch swatch-source"></span>Source cells</div>
                <div class="legend-item"><span class="swatch swatch-match"></span>Match / True</div>
                <div class="legend-item"><span class="swatch swatch-unfilled"></span>Not yet filled</div>
            </div>
        </div>
    `;

    // wire up controls
    document.getElementById('play-pause-btn').addEventListener('click', togglePlayPause);
    document.getElementById('step-back-btn').addEventListener('click', stepBack);
    document.getElementById('step-fwd-btn').addEventListener('click', stepForward);
    document.getElementById('restart-btn-inner').addEventListener('click', restartAnimation);
    document.getElementById('speed-slider').addEventListener('input', function () {
        animationSpeed = 1050 - parseInt(this.value);
        if (isPlaying) { pauseAnimation(); playAnimation(); }
    });
}

// ─── Build a DP table DOM ──────────────────────────────────────────────────
function buildTableDOM(rowHeaders, colHeaders, defaultVal = '·') {
    let html = '<table class="dp-table"><thead><tr>';
    html += '<td class="header corner">↘</td>';
    colHeaders.forEach(h => { html += `<td class="header">${h}</td>`; });
    html += '</tr></thead><tbody>';
    rowHeaders.forEach((rh, ri) => {
        html += `<tr><td class="header">${rh}</td>`;
        colHeaders.forEach((ch, ci) => {
            html += `<td id="dp-cell-${ri}-${ci}" class="cell-value dp-cell unfilled">${defaultVal}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    document.getElementById('dp-table-container').innerHTML = html;
}

// ══════════════════════════════════════════════════════════════════════════════
//  LCS
// ══════════════════════════════════════════════════════════════════════════════
function computeLCS() {
    const str1 = document.getElementById('input1').value.toUpperCase();
    const str2 = document.getElementById('input2').value.toUpperCase();
    if (!str1 || !str2) { alert('Please enter valid strings'); return; }

    const m = str1.length, n = str2.length;
    dpTable = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    backtrackInfo = Array(m + 1).fill(null).map(() => Array(n + 1).fill(''));
    animationSteps = [];
    currentStep = -1;

    // Fill base row and column
    for (let i = 0; i <= m; i++) {
        animationSteps.push({
            row: i, col: 0, value: 0, display: '0',
            highlight: false,
            formula: `dp[${i}][0] = 0`,
            explanation: `Base case: empty string has LCS 0`,
            recursive: `<span class="rec-base">lcs("${str1.slice(0,i)}","") = 0</span>`
        });
    }
    for (let j = 1; j <= n; j++) {
        animationSteps.push({
            row: 0, col: j, value: 0, display: '0',
            highlight: false,
            formula: `dp[0][${j}] = 0`,
            explanation: `Base case: empty string has LCS 0`,
            recursive: `<span class="rec-base">lcs("","${str2.slice(0,j)}") = 0</span>`
        });
    }

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const ch1 = str1[i - 1], ch2 = str2[j - 1];
            const isMatch = ch1 === ch2;
            if (isMatch) {
                dpTable[i][j] = dpTable[i - 1][j - 1] + 1;
                backtrackInfo[i][j] = '↖';
            } else {
                dpTable[i][j] = Math.max(dpTable[i - 1][j], dpTable[i][j - 1]);
                backtrackInfo[i][j] = dpTable[i - 1][j] >= dpTable[i][j - 1] ? '↑' : '←';
            }
            const val = dpTable[i][j];
            const sources = isMatch ? [[i-1,j-1]] : (dpTable[i-1][j] >= dpTable[i][j-1] ? [[i-1,j]] : [[i,j-1]]);
            animationSteps.push({
                row: i, col: j, value: val, display: `${backtrackInfo[i][j]}${val}`,
                highlight: isMatch,
                sources,
                formula: isMatch
                    ? `dp[${i}][${j}] = dp[${i-1}][${j-1}] + 1 = ${val}`
                    : `dp[${i}][${j}] = max(dp[${i-1}][${j}], dp[${i}][${j-1}]) = ${val}`,
                explanation: isMatch
                    ? `✅ '${ch1}' == '${ch2}' → match! Extend diagonal (${dpTable[i-1][j-1]}) + 1 = <strong>${val}</strong>`
                    : `❌ '${ch1}' ≠ '${ch2}' → take max of ↑(${dpTable[i-1][j]}) and ←(${dpTable[i][j-1]}) = <strong>${val}</strong>`,
                recursive: isMatch
                    ? `<span class="rec-match">lcs("${str1.slice(0,i)}","${str2.slice(0,j)}") = lcs("${str1.slice(0,i-1)}","${str2.slice(0,j-1)}") + 1 = ${val}</span>`
                    : `<span class="rec-nomatch">lcs("${str1.slice(0,i)}","${str2.slice(0,j)}") = max(${dpTable[i-1][j]}, ${dpTable[i][j-1]}) = ${val}</span>`
            });
        }
    }

    // Backtrack to find LCS string
    function traceLCS() {
        let i = m, j = n, result = '';
        while (i > 0 && j > 0) {
            if (str1[i-1] === str2[j-1]) { result = str1[i-1] + result; i--; j--; }
            else if (dpTable[i-1][j] >= dpTable[i][j-1]) i--;
            else j--;
        }
        return result;
    }
    const lcsStr = traceLCS();
    const lcsFormatted = lcsStr.split('').map(c => `<span class="sol-char">${c}</span>`).join('');

    const recCode = `<code>lcs(s1, s2, i, j):
  if i==0 or j==0: return 0
  if s1[i-1]==s2[j-1]:
    return lcs(s1,s2,i-1,j-1) + 1
  return max(
    lcs(s1,s2,i-1,j),
    lcs(s1,s2,i,j-1)
  )</code>`;

    renderVisualizationScaffold(
        'Longest Common Subsequence',
        `str1 = "${str1}"  ·  str2 = "${str2}"`,
        recCode
    );

    // Build table
    const rowH = ['ε', ...str1.split('')];
    const colH = ['ε', ...str2.split('')];
    buildTableDOM(rowH, colH);
    showAnswer({
        label: 'LCS Length',
        value: dpTable[m][n],
        sub: `of "${str1}" &amp; "${str2}"`,
        badges: [`${m}×${n} table`],
        solution: `<div class="sol-label">Matched Subsequence</div><div class="sol-chars">${lcsFormatted}</div>`
    });
    updateProgressBar();
}

// ══════════════════════════════════════════════════════════════════════════════
//  KNAPSACK
// ══════════════════════════════════════════════════════════════════════════════
function computeKnapsack() {
    const capacity = parseInt(document.getElementById('knapsack-capacity').value);
    const weights = document.getElementById('knapsack-weights').value.split(',').map(w => parseInt(w.trim())).filter(w => !isNaN(w));
    const values = document.getElementById('knapsack-values').value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));

    if (!capacity || weights.length === 0 || weights.length !== values.length) { alert('Invalid parameters'); return; }

    const n = weights.length;
    dpTable = Array(n + 1).fill(null).map(() => Array(capacity + 1).fill(0));
    animationSteps = [];
    currentStep = -1;

    // Base cases
    for (let w = 0; w <= capacity; w++) {
        animationSteps.push({
            row: 0, col: w, value: 0, display: '0',
            formula: `dp[0][${w}] = 0`,
            explanation: `Base: 0 items → value = 0`,
            recursive: `<span class="rec-base">knapsack(0, ${w}) = 0</span>`
        });
    }

    for (let i = 1; i <= n; i++) {
        for (let w = 0; w <= capacity; w++) {
            const wi = weights[i - 1], vi = values[i - 1];
            let val, formula, explanation, recursive, sources;
            if (wi > w) {
                val = dpTable[i - 1][w];
                formula = `dp[${i}][${w}] = dp[${i-1}][${w}] = ${val}`;
                explanation = `Item ${i} (w=${wi}) too heavy for capacity ${w} → skip`;
                recursive = `<span class="rec-nomatch">k(${i},${w}) = k(${i-1},${w}) = ${val} [skip, too heavy]</span>`;
                sources = [[i-1, w]];
            } else {
                const include = dpTable[i - 1][w - wi] + vi;
                const exclude = dpTable[i - 1][w];
                val = Math.max(include, exclude);
                const chose = include > exclude ? 'include' : 'exclude';
                formula = `dp[${i}][${w}] = max(${exclude}, ${dpTable[i-1][w-wi]}+${vi}) = ${val}`;
                explanation = chose === 'include'
                    ? `✅ Include item ${i} (w=${wi}, v=${vi}): ${dpTable[i-1][w-wi]}+${vi}=${include} > ${exclude} → <strong>${val}</strong>`
                    : `❌ Exclude item ${i}: ${exclude} ≥ ${include} → <strong>${val}</strong>`;
                recursive = chose === 'include'
                    ? `<span class="rec-match">k(${i},${w}) = k(${i-1},${w-wi})+${vi} = ${val}</span>`
                    : `<span class="rec-nomatch">k(${i},${w}) = k(${i-1},${w}) = ${val}</span>`;
                sources = chose === 'include' ? [[i-1, w-wi]] : [[i-1, w]];
            }
            dpTable[i][w] = val;
            animationSteps.push({ row: i, col: w, value: val, display: String(val), highlight: false, sources, formula, explanation, recursive });
        }
    }

    // Backtrack to find selected items
    function traceKnapsack() {
        const picked = [];
        let w = capacity;
        for (let i = n; i > 0; i--) {
            if (dpTable[i][w] !== dpTable[i-1][w]) {
                picked.unshift(i);
                w -= weights[i-1];
            }
        }
        return picked;
    }
    const pickedItems = traceKnapsack();
    const totalWeight = pickedItems.reduce((s, i) => s + weights[i-1], 0);
    const itemsHTML = pickedItems.map(i =>
        `<span class="sol-item">item${i}(w${weights[i-1]},v${values[i-1]})</span>`
    ).join('');

    const recCode = `<code>knapsack(items, w, i):
  if i==0 or w==0: return 0
  if weight[i] > w:
    return knapsack(items,w,i-1)
  return max(
    knapsack(items,w,i-1),
    val[i]+knapsack(items,w-wt[i],i-1)
  )</code>`;

    renderVisualizationScaffold(
        '0/1 Knapsack',
        `Capacity=${capacity} · W=[${weights.join(',')}] · V=[${values.join(',')}]`,
        recCode
    );
    const rowH = Array.from({length: n+1}, (_, i) => i === 0 ? 'Items→' : `i=${i} (w${i}=${weights[i-1]},v${i}=${values[i-1]})`);
    const colH = Array.from({length: capacity+1}, (_, j) => String(j));
    buildTableDOM(rowH, colH);
    showAnswer({
        label: 'Max Value',
        value: dpTable[n][capacity],
        sub: `capacity = ${capacity}`,
        badges: [`${n} items`, `${n+1}×${capacity+1} table`],
        solution: `<div class="sol-label">Selected Items</div><div class="sol-items">${itemsHTML}</div><div class="sol-stat">Weight used: ${totalWeight}/${capacity}</div>`
    });
    updateProgressBar();
}

// ══════════════════════════════════════════════════════════════════════════════
//  SUBSET SUM
// ══════════════════════════════════════════════════════════════════════════════
function computeSubset() {
    const arr = document.getElementById('subset-array').value.split(',').map(a => parseInt(a.trim())).filter(a => !isNaN(a));
    const target = parseInt(document.getElementById('subset-target').value);
    if (!arr.length || isNaN(target)) { alert('Invalid input'); return; }

    const n = arr.length;
    dpTable = Array(n+1).fill(null).map(() => Array(target+1).fill(false));
    animationSteps = [];
    currentStep = -1;

    for (let i = 0; i <= n; i++) {
        dpTable[i][0] = true;
        animationSteps.push({
            row: i, col: 0, value: true, display: 'T', highlight: true,
            formula: `dp[${i}][0] = true`,
            explanation: `Base: sum=0 is always achievable (empty subset)`,
            recursive: `<span class="rec-base">subset(${i}, 0) = true (empty)</span>`
        });
    }
    for (let j = 1; j <= target; j++) {
        animationSteps.push({
            row: 0, col: j, value: false, display: 'F', highlight: false,
            formula: `dp[0][${j}] = false`,
            explanation: `Base: no items, sum=${j} impossible`,
            recursive: `<span class="rec-base">subset(0, ${j}) = false</span>`
        });
    }

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= target; j++) {
            const exclude = dpTable[i-1][j];
            const canInclude = arr[i-1] <= j && dpTable[i-1][j-arr[i-1]];
            dpTable[i][j] = exclude || canInclude;
            const val = dpTable[i][j];
            let sources = [[i-1, j]];
            if (canInclude) sources.push([i-1, j-arr[i-1]]);
            animationSteps.push({
                row: i, col: j, value: val, display: val ? 'T' : 'F',
                highlight: val,
                sources,
                formula: `dp[${i}][${j}] = dp[${i-1}][${j}] OR dp[${i-1}][${j-arr[i-1]}]`,
                explanation: val
                    ? `✅ Sum ${j} reachable ${canInclude ? `(include ${arr[i-1]})` : '(without item)'} → <strong>TRUE</strong>`
                    : `❌ Sum ${j} not reachable with first ${i} items → <strong>FALSE</strong>`,
                recursive: val
                    ? `<span class="rec-match">subset(${i},${j}) = true</span>`
                    : `<span class="rec-nomatch">subset(${i},${j}) = false</span>`
            });
        }
    }

    // Backtrack to find subset elements
    function traceSubset() {
        if (!dpTable[n][target]) return null;
        const elems = [];
        let i = n, j = target;
        while (i > 0 && j > 0) {
            if (!dpTable[i-1][j]) { elems.unshift(arr[i-1]); j -= arr[i-1]; }
            i--;
        }
        return elems;
    }
    const subsetElems = traceSubset();
    const subsetHTML = subsetElems
        ? `<div class="sol-label">Subset Found</div><div class="sol-chars">${subsetElems.map(e => `<span class="sol-char">${e}</span>`).join('<span class="sol-op">+</span>')}</div><div class="sol-stat">= ${target}</div>`
        : `<div class="sol-label">No subset sums to ${target}</div>`;

    const recCode = `<code>subset(arr, n, target):
  if target==0: return True
  if n==0: return False
  if arr[n-1] > target:
    return subset(arr,n-1,target)
  return (
    subset(arr,n-1,target) or
    subset(arr,n-1,target-arr[n-1])
  )</code>`;

    renderVisualizationScaffold(
        'Subset Sum Problem',
        `Array=[${arr.join(',')}] · Target=${target}`,
        recCode
    );
    const rowH = ['∅', ...arr.map((v,i) => `i=${i+1}(${v})`)];
    const colH = Array.from({length: target+1}, (_,j) => String(j));
    buildTableDOM(rowH, colH, '·');
    showAnswer({
        label: 'Can Reach Target?',
        value: dpTable[n][target] ? '✅ YES' : '❌ NO',
        sub: `target = ${target}`,
        badges: [`[${arr.join(',')}]`],
        solution: subsetHTML
    });
    updateProgressBar();
}
// ══════════════════════════════════════════════════════════════════════════════
function computeFloyd() {
    const matrixStr = document.getElementById('floyd-matrix').value.trim();
    if (!matrixStr) { alert('Please enter a valid matrix'); return; }

    const rows = matrixStr.split('|').map(row =>
        row.split(',').map(val => val.trim().toUpperCase() === 'INF' ? Infinity : parseInt(val.trim()))
    );
    const n = rows.length;
    dpTable = rows.map(row => [...row]);
    // next[i][j] = next hop on shortest path from i to j
    const next = Array(n).fill(null).map((_, i) => Array(n).fill(null).map((__, j) => (rows[i][j] !== Infinity && i !== j) ? j : null));
    animationSteps = [];
    currentStep = -1;

    // Initial state
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const orig = dpTable[i][j];
            animationSteps.push({
                row: i, col: j, value: orig,
                display: orig === Infinity ? '∞' : String(orig),
                highlight: i === j,
                formula: `dist[${i}][${j}] = ${orig === Infinity ? '∞' : orig}`,
                explanation: `Initial direct distance from ${i} to ${j}`,
                recursive: `<span class="rec-base">dist(${i}→${j}) = ${orig === Infinity ? '∞' : orig} (direct)</span>`
            });
        }
    }

    // Run Floyd
    for (let k = 0; k < n; k++) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (dpTable[i][k] + dpTable[k][j] < dpTable[i][j]) {
                    const oldVal = dpTable[i][j];
                    dpTable[i][j] = dpTable[i][k] + dpTable[k][j];
                    next[i][j] = next[i][k];
                    animationSteps.push({
                        row: i, col: j, value: dpTable[i][j],
                        display: String(dpTable[i][j]),
                        highlight: true,
                        sources: [[i,k],[k,j]],
                        formula: `dist[${i}][${j}] = dist[${i}][${k}] + dist[${k}][${j}] = ${dpTable[i][k]}+${dpTable[k][j]}`,
                        explanation: `🔁 Via k=${k}: ${oldVal} → <strong>${dpTable[i][j]}</strong> (shorter path ${i}→${k}→${j})`,
                        recursive: `<span class="rec-match">d(${i},${j}) via ${k}: ${dpTable[i][k]}+${dpTable[k][j]}=${dpTable[i][j]}</span>`
                    });
                }
            }
        }
    }

    const recCode = `<code>floyd(dist, n):
  for k in 0..n:
    for i in 0..n:
      for j in 0..n:
        dist[i][j] = min(
          dist[i][j],
          dist[i][k]+dist[k][j]
        )</code>`;

    renderVisualizationScaffold(
        'Floyd–Warshall All-Pairs Shortest Paths',
        `${n}×${n} graph · updates shown when a shorter path is found`,
        recCode
    );
    // Reconstruct path from V0 to V(n-1)
    function tracePath(src, dst) {
        if (dpTable[src][dst] === Infinity) return null;
        const path = [src];
        let cur = src;
        while (cur !== dst) { cur = next[cur][dst]; if (cur === null) return null; path.push(cur); }
        return path;
    }
    const src = 0, dst = n - 1;
    const path = tracePath(src, dst);
    const pathHTML = path
        ? `<div class="sol-label">V${src} → V${dst} Path</div><div class="sol-path">${path.map(v => `<span class="sol-char">V${v}</span>`).join('<span class="sol-arrow">→</span>')}</div><div class="sol-stat">dist = ${dpTable[src][dst]}</div>`
        : `<div class="sol-label">V${src} → V${dst}: unreachable</div>`;

    const headers = Array.from({length: n}, (_, i) => `V${i}`);
    buildTableDOM(headers, headers, '?');
    showAnswer({
        label: 'Shortest Path',
        value: dpTable[src][dst] === Infinity ? '∞' : dpTable[src][dst],
        sub: `V${src} → V${dst}`,
        badges: [`${n} vertices`, 'all-pairs'],
        solution: pathHTML
    });
    updateProgressBar();
}

// ══════════════════════════════════════════════════════════════════════════════
//  ASSEMBLY LINE
// ══════════════════════════════════════════════════════════════════════════════
function computeAssembly() {
    const time1 = document.getElementById('assembly-time1').value.split(',').map(t => parseInt(t.trim())).filter(t => !isNaN(t));
    const time2 = document.getElementById('assembly-time2').value.split(',').map(t => parseInt(t.trim())).filter(t => !isNaN(t));
    const transfer = document.getElementById('assembly-transfer').value.split(',').map(t => parseInt(t.trim())).filter(t => !isNaN(t));

    if (!time1.length || !time2.length || !transfer.length) { alert('Invalid input'); return; }

    const n = time1.length;
    dpTable = Array(2).fill(null).map(() => Array(n).fill(0));
    backtrackInfo = Array(2).fill(null).map(() => Array(n).fill(''));
    animationSteps = [];
    currentStep = -1;

    dpTable[0][0] = time1[0];
    dpTable[1][0] = time2[0];

    animationSteps.push({
        row: 0, col: 0, value: time1[0], display: String(time1[0]),
        formula: `f1[0] = a1[0] = ${time1[0]}`,
        explanation: `Enter line 1, station 1: time = ${time1[0]}`,
        recursive: `<span class="rec-base">f1(0) = ${time1[0]}</span>`
    });
    animationSteps.push({
        row: 1, col: 0, value: time2[0], display: String(time2[0]),
        formula: `f2[0] = a2[0] = ${time2[0]}`,
        explanation: `Enter line 2, station 1: time = ${time2[0]}`,
        recursive: `<span class="rec-base">f2(0) = ${time2[0]}</span>`
    });

    for (let i = 1; i < n; i++) {
        const cont1 = dpTable[0][i-1] + time1[i];
        const switch1 = dpTable[1][i-1] + transfer[i-1] + time1[i];
        dpTable[0][i] = Math.min(cont1, switch1);
        backtrackInfo[0][i] = cont1 <= switch1 ? 'Continue' : 'Switch';

        const cont2 = dpTable[1][i-1] + time2[i];
        const switch2 = dpTable[0][i-1] + transfer[i-1] + time2[i];
        dpTable[1][i] = Math.min(cont2, switch2);
        backtrackInfo[1][i] = cont2 <= switch2 ? 'Continue' : 'Switch';

        animationSteps.push({
            row: 0, col: i, value: dpTable[0][i], display: String(dpTable[0][i]),
            highlight: backtrackInfo[0][i] === 'Switch',
            sources: backtrackInfo[0][i] === 'Continue' ? [[0,i-1]] : [[1,i-1]],
            formula: `f1[${i}] = min(f1[${i-1}]+${time1[i]}, f2[${i-1}]+${transfer[i-1]}+${time1[i]}) = ${dpTable[0][i]}`,
            explanation: `Line 1 station ${i+1}: ${backtrackInfo[0][i]==='Continue'?'stay on line 1':'switch from line 2'} → <strong>${dpTable[0][i]}</strong>`,
            recursive: `<span class="${backtrackInfo[0][i]==='Switch'?'rec-match':'rec-nomatch'}">f1(${i}) = ${dpTable[0][i]} [${backtrackInfo[0][i]}]</span>`
        });

        animationSteps.push({
            row: 1, col: i, value: dpTable[1][i], display: String(dpTable[1][i]),
            highlight: backtrackInfo[1][i] === 'Switch',
            sources: backtrackInfo[1][i] === 'Continue' ? [[1,i-1]] : [[0,i-1]],
            formula: `f2[${i}] = min(f2[${i-1}]+${time2[i]}, f1[${i-1}]+${transfer[i-1]}+${time2[i]}) = ${dpTable[1][i]}`,
            explanation: `Line 2 station ${i+1}: ${backtrackInfo[1][i]==='Continue'?'stay on line 2':'switch from line 1'} → <strong>${dpTable[1][i]}</strong>`,
            recursive: `<span class="${backtrackInfo[1][i]==='Switch'?'rec-match':'rec-nomatch'}">f2(${i}) = ${dpTable[1][i]} [${backtrackInfo[1][i]}]</span>`
        });
    }

    const recCode = `<code>f1(j):
  if j==0: return a1[0]
  return a1[j] + min(
    f1(j-1),
    f2(j-1)+t[j-1]
  )
f2(j): symmetric</code>`;

    renderVisualizationScaffold(
        'Assembly Line Scheduling',
        `Line1=[${time1.join(',')}] · Line2=[${time2.join(',')}] · Transfer=[${transfer.join(',')}]`,
        recCode
    );
    const rowH = ['Line 1', 'Line 2'];
    const colH = Array.from({length: n}, (_, i) => `S${i+1}`);
    buildTableDOM(rowH, colH);
    const minTime = Math.min(dpTable[0][n-1], dpTable[1][n-1]);
    const bestLine = dpTable[0][n-1] <= dpTable[1][n-1] ? 1 : 2;

    // Trace the station sequence
    function traceAssembly() {
        const seq = [];
        let line = dpTable[0][n-1] <= dpTable[1][n-1] ? 0 : 1;
        seq.unshift({ line: line + 1, station: n });
        for (let i = n - 1; i >= 1; i--) {
            if (backtrackInfo[line][i] === 'Switch') line = 1 - line;
            seq.unshift({ line: line + 1, station: i });
        }
        return seq;
    }
    const stationSeq = traceAssembly();
    const seqHTML = stationSeq.map(({ line, station }) =>
        `<span class="sol-station sol-line${line}">L${line}·S${station}</span>`
    ).join('<span class="sol-arrow">→</span>');

    showAnswer({
        label: 'Min Total Time',
        value: minTime,
        sub: `exit via Line ${bestLine}`,
        badges: [`${n} stations`],
        solution: `<div class="sol-label">Station Sequence</div><div class="sol-path">${seqHTML}</div>`
    });
    updateProgressBar();
}
// ══════════════════════════════════════════════════════════════════════════════
function computeMCM() {
    const dims = document.getElementById('mcm-dimensions').value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
    if (dims.length < 2) { alert('Need at least 2 dimensions'); return; }

    const n = dims.length - 1;
    dpTable = Array(n).fill(null).map(() => Array(n).fill(0));
    animationSteps = [];
    currentStep = -1;

    // Base cases (length 1)
    for (let i = 0; i < n; i++) {
        animationSteps.push({
            row: i, col: i, value: 0, display: '0',
            formula: `dp[${i}][${i}] = 0`,
            explanation: `Single matrix M${i} needs 0 multiplications`,
            recursive: `<span class="rec-base">mcm(${i},${i}) = 0</span>`
        });
    }

    // Store split points
    const splitK = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let len = 2; len <= n; len++) {
        for (let i = 0; i <= n - len; i++) {
            const j = i + len - 1;
            dpTable[i][j] = Infinity;
            let bestK = i;
            for (let k = i; k < j; k++) {
                const cost = dpTable[i][k] + dpTable[k+1][j] + dims[i]*dims[k+1]*dims[j+1];
                if (cost < dpTable[i][j]) {
                    dpTable[i][j] = cost;
                    bestK = k;
                    splitK[i][j] = k;
                }
            }
            animationSteps.push({
                row: i, col: j, value: dpTable[i][j], display: String(dpTable[i][j]),
                highlight: false,
                sources: [[i, bestK], [bestK+1, j]],
                formula: `dp[${i}][${j}] = min over k∈[${i},${j-1}] of dp[${i}][k]+dp[k+1][${j}]+p${i}·p${bestK+1}·p${j+1}`,
                explanation: `Best split at k=${bestK}: cost=<strong>${dpTable[i][j]}</strong> for M${i}..M${j}`,
                recursive: `<span class="rec-match">mcm(${i},${j}) = ${dpTable[i][j]} [split at ${bestK}]</span>`
            });
        }
    }

    function buildBrackets(i, j) {
        if (i === j) return `M${i}`;
        const k = splitK[i][j];
        const left = buildBrackets(i, k);
        const right = buildBrackets(k + 1, j);
        return `(${left} × ${right})`;
    }
    const bracketStr = buildBrackets(0, n - 1);

    const recCode = `<code>mcm(p, i, j):
  if i==j: return 0
  min_cost = ∞
  for k in i..j-1:
    cost = mcm(p,i,k)
         + mcm(p,k+1,j)
         + p[i]*p[k+1]*p[j+1]
    min_cost = min(min_cost, cost)
  return min_cost</code>`;

    renderVisualizationScaffold(
        'Matrix Chain Multiplication',
        `Dimensions=[${dims.join(',')}] → ${n} matrices`,
        recCode
    );
    const headers = Array.from({length: n}, (_, i) => `M${i}`);
    buildTableDOM(headers, headers, '-');
    showAnswer({
        label: 'Min Operations',
        value: dpTable[0][n-1],
        sub: `${n} matrices`,
        badges: [`dims=[${dims.join(',')}]`],
        solution: `<div class="sol-label">Optimal Brackets</div><div class="sol-bracket">${bracketStr}</div>`
    });
    updateProgressBar();
}

// ══════════════════════════════════════════════════════════════════════════════
//  TSP (HELD-KARP)
// ══════════════════════════════════════════════════════════════════════════════
function computeTSP() {
    const matrixStr = document.getElementById('tsp-matrix').value.trim();
    if (!matrixStr) { alert('Please enter a valid distance matrix'); return; }

    const rows = matrixStr.split('|').map(row =>
        row.split(',').map(val => parseInt(val.trim()))
    );
    const n = rows.length;
    if (n > 6) { alert('For animation, max 6 cities is recommended'); return; }

    const dp = Array(1 << n).fill(null).map(() => Array(n).fill(Infinity));
    animationSteps = [];
    currentStep = -1;

    dp[1][0] = 0;
    animationSteps.push({
        row: 0, col: 0, value: 0, display: '0',
        formula: 'dp[{0}][0] = 0',
        explanation: 'Start at city 0, visited set = {0}, cost = 0',
        recursive: `<span class="rec-base">tsp({0}, 0) = 0</span>`
    });

    for (let mask = 1; mask < (1 << n); mask++) {
        for (let u = 0; u < n; u++) {
            if (!(mask & (1 << u))) continue;
            if (dp[mask][u] === Infinity) continue;
            for (let v = 0; v < n; v++) {
                if (mask & (1 << v)) continue;
                const newMask = mask | (1 << v);
                const newCost = dp[mask][u] + rows[u][v];
                if (newCost < dp[newMask][v]) {
                    dp[newMask][v] = newCost;
                    // For table: row = popcount of newMask, col = v
                    const popcount = newMask.toString(2).split('').filter(c=>c==='1').length;
                    const maskBin = newMask.toString(2).padStart(n, '0');
                    animationSteps.push({
                        row: popcount - 1, col: v,
                        value: newCost, display: String(newCost),
                        highlight: true,
                        formula: `dp[${maskBin}][${v}] = dp[${mask.toString(2).padStart(n,'0')}][${u}] + dist[${u}][${v}]`,
                        explanation: `Visiting city ${v} via ${u} (mask=${maskBin}): cost = <strong>${newCost}</strong>`,
                        recursive: `<span class="rec-match">tsp(${maskBin},${v}) = ${dp[mask][u]} + ${rows[u][v]} = ${newCost}</span>`
                    });
                }
            }
        }
    }

    const recCode = `<code>tsp(visited, pos):
  if visited==all: 
    return dist[pos][0]
  min_cost = ∞
  for city not in visited:
    cost = dist[pos][city]
         + tsp(visited|city, city)
    min_cost = min(min_cost, cost)
  return min_cost</code>`;

    renderVisualizationScaffold(
        'Traveling Salesman (Held-Karp)',
        `${n} cities · bitmask DP · O(n²·2ⁿ)`,
        recCode
    );

    // Table: rows = # cities visited (1..n), cols = current city
    const rowH = Array.from({length: n}, (_,i) => `|S|=${i+1}`);
    const colH = Array.from({length: n}, (_,i) => `C${i}`);
    buildTableDOM(rowH, colH, '∞');
    const fullMask = (1 << n) - 1;
    const dp2 = Array(1 << n).fill(null).map(() => Array(n).fill(Infinity));
    const parent = Array(1 << n).fill(null).map(() => Array(n).fill(-1));
    dp2[1][0] = 0;
    for (let mask = 1; mask < (1 << n); mask++) {
        for (let u = 0; u < n; u++) {
            if (!(mask & (1 << u)) || dp2[mask][u] === Infinity) continue;
            for (let v = 0; v < n; v++) {
                if (mask & (1 << v)) continue;
                const nc = dp2[mask][u] + rows[u][v];
                if (nc < dp2[mask | (1 << v)][v]) {
                    dp2[mask | (1 << v)][v] = nc;
                    parent[mask | (1 << v)][v] = u;
                }
            }
        }
    }
    let tspAns = Infinity, lastCity = 1;
    for (let u = 1; u < n; u++) {
        if (dp2[fullMask][u] + rows[u][0] < tspAns) { tspAns = dp2[fullMask][u] + rows[u][0]; lastCity = u; }
    }

    // Trace tour
    function traceTour() {
        const tour = [];
        let mask = fullMask, cur = lastCity;
        while (cur !== -1) {
            tour.unshift(cur);
            const prev = parent[mask][cur];
            mask ^= (1 << cur);
            cur = prev;
        }
        tour.push(0); // return to start
        return tour;
    }
    const tour = tspAns < Infinity ? traceTour() : null;
    const tourHTML = tour
        ? `<div class="sol-label">Tour Order</div><div class="sol-path">${tour.map(c => `<span class="sol-char">C${c}</span>`).join('<span class="sol-arrow">→</span>')}</div>`
        : `<div class="sol-label">No complete tour found</div>`;
    showAnswer({
        label: 'Shortest Tour',
        value: tspAns === Infinity ? '∞' : tspAns,
        sub: `start & end at C0`,
        badges: [`${n} cities`],
        solution: tourHTML
    });
    updateProgressBar();
}

// ══════════════════════════════════════════════════════════════════════════════
//  COUNT SUBSETS WITH SUM K
// ══════════════════════════════════════════════════════════════════════════════
function computeCountSubsets() {
    const arr = document.getElementById('countsubsets-array').value
        .split(',').map(a => parseInt(a.trim())).filter(a => !isNaN(a) && a >= 0);
    const target = parseInt(document.getElementById('countsubsets-target').value);
    if (!arr.length || isNaN(target) || target < 0) { alert('Invalid input — use non-negative integers'); return; }

    const n = arr.length;
    // dp[i][j] = number of subsets using first i items that sum to j
    dpTable = Array(n + 1).fill(null).map(() => Array(target + 1).fill(0));
    animationSteps = [];
    currentStep = -1;

    // Base case: sum = 0 can always be achieved (empty subset) for any number of items
    for (let i = 0; i <= n; i++) {
        dpTable[i][0] = 1;
        animationSteps.push({
            row: i, col: 0, value: 1, display: '1', highlight: true,
            formula: `dp[${i}][0] = 1`,
            explanation: `Base: 1 way to reach sum=0 (pick nothing) with ${i} item(s) available`,
            recursive: `<span class="rec-base">count(${i}, 0) = 1</span>`
        });
    }
    // Base case: 0 items, sum > 0 → 0 ways
    for (let j = 1; j <= target; j++) {
        animationSteps.push({
            row: 0, col: j, value: 0, display: '0', highlight: false,
            formula: `dp[0][${j}] = 0`,
            explanation: `Base: 0 ways to reach sum=${j} with no items`,
            recursive: `<span class="rec-base">count(0, ${j}) = 0</span>`
        });
    }

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= target; j++) {
            const exclude = dpTable[i - 1][j];
            const include = arr[i - 1] <= j ? dpTable[i - 1][j - arr[i - 1]] : 0;
            dpTable[i][j] = exclude + include;
            const val = dpTable[i][j];
            const sources = [[i - 1, j]];
            if (arr[i - 1] <= j) sources.push([i - 1, j - arr[i - 1]]);
            animationSteps.push({
                row: i, col: j, value: val, display: String(val),
                highlight: val > 0,
                sources,
                formula: arr[i-1] <= j
                    ? `dp[${i}][${j}] = dp[${i-1}][${j}] + dp[${i-1}][${j-arr[i-1]}] = ${exclude}+${include} = ${val}`
                    : `dp[${i}][${j}] = dp[${i-1}][${j}] = ${val} (item ${arr[i-1]} too large)`,
                explanation: arr[i-1] <= j
                    ? `Item ${arr[i-1]}: exclude→${exclude} ways, include→${include} ways. Total = <strong>${val}</strong>`
                    : `Item ${arr[i-1]} > sum ${j}: can only exclude → <strong>${val}</strong>`,
                recursive: val > 0
                    ? `<span class="rec-match">count(${i},${j}) = ${exclude}+${include} = ${val}</span>`
                    : `<span class="rec-nomatch">count(${i},${j}) = 0</span>`
            });
        }
    }

    // Enumerate all subsets that sum to target
    function findAllSubsets(arr, target) {
        const results = [];
        function bt(i, rem, current) {
            if (rem === 0) { results.push([...current]); return; }
            if (i >= arr.length || rem < 0) return;
            current.push(arr[i]); bt(i + 1, rem - arr[i], current); current.pop();
            bt(i + 1, rem, current);
        }
        bt(0, target, []);
        return results;
    }
    const allSubsets = findAllSubsets(arr, target);
    const subsetsHTML = allSubsets.length > 0
        ? allSubsets.slice(0, 8).map(s =>
            `<div class="sol-subset">{${s.join(', ')}}</div>`
          ).join('') + (allSubsets.length > 8 ? `<div class="sol-stat">+${allSubsets.length - 8} more…</div>` : '')
        : `<div class="sol-stat">No subsets found</div>`;

    const answer = dpTable[n][target];
    const recCode = `<code>count(arr, n, k):
  if k==0: return 1
  if n==0: return 0
  if arr[n-1] > k:
    return count(arr, n-1, k)
  return (
    count(arr, n-1, k) +
    count(arr, n-1, k-arr[n-1])
  )
// Answer: count(arr,n,k) = ${answer}</code>`;

    renderVisualizationScaffold(
        'Count Subsets with Sum K',
        `Array=[${arr.join(',')}] · K=${target} · Answer: ${answer} subset(s)`,
        recCode
    );
    const rowH = ['∅', ...arr.map((v, i) => `i${i+1}(${v})`)];
    const colH = Array.from({ length: target + 1 }, (_, j) => String(j));
    buildTableDOM(rowH, colH, '·');
    showAnswer({
        label: 'Subset Count',
        value: answer,
        sub: `sum = ${target}`,
        badges: [`[${arr.join(',')}]`, `${n+1}×${target+1} table`],
        solution: `<div class="sol-label">All Subsets</div>${subsetsHTML}`
    });
    updateProgressBar();
}
// ══════════════════════════════════════════════════════════════════════════════
function computePalindrome() {
    const s = document.getElementById('palindrome-string').value.trim().toLowerCase();
    if (!s) { alert('Please enter a string'); return; }
    if (s.length > 12) { alert('String too long — keep it ≤ 12 characters for clear visualization'); return; }

    const n = s.length;
    animationSteps = [];
    currentStep = -1;

    // Step 1: Build isPalin[i][j] table — is s[i..j] a palindrome?
    const isPalin = Array(n).fill(null).map(() => Array(n).fill(false));

    // Every single char is a palindrome
    for (let i = 0; i < n; i++) {
        isPalin[i][i] = true;
        animationSteps.push({
            row: i, col: i, value: 'P', display: 'P', highlight: true,
            formula: `isPalin[${i}][${i}] = true`,
            explanation: `Single char '${s[i]}' is always a palindrome`,
            recursive: `<span class="rec-base">isPalin(${i},${i}) = true ['${s[i]}']</span>`
        });
    }

    // Length-2 substrings
    for (let i = 0; i < n - 1; i++) {
        isPalin[i][i + 1] = s[i] === s[i + 1];
        const val = isPalin[i][i + 1];
        animationSteps.push({
            row: i, col: i + 1, value: val ? 'P' : '✗', display: val ? 'P' : '✗',
            highlight: val,
            sources: [[i, i], [i + 1, i + 1]],
            formula: `isPalin[${i}][${i+1}] = ('${s[i]}'=='${s[i+1]}') = ${val}`,
            explanation: val
                ? `'${s[i]}' == '${s[i+1]}' → "<strong>${s.slice(i,i+2)}</strong>" is a palindrome`
                : `'${s[i]}' ≠ '${s[i+1]}' → "${s.slice(i,i+2)}" is NOT a palindrome`,
            recursive: val
                ? `<span class="rec-match">isPalin(${i},${i+1}) = true ['${s.slice(i,i+2)}']</span>`
                : `<span class="rec-nomatch">isPalin(${i},${i+1}) = false ['${s.slice(i,i+2)}']</span>`
        });
    }

    // Longer substrings
    for (let len = 3; len <= n; len++) {
        for (let i = 0; i <= n - len; i++) {
            const j = i + len - 1;
            isPalin[i][j] = s[i] === s[j] && isPalin[i + 1][j - 1];
            const val = isPalin[i][j];
            animationSteps.push({
                row: i, col: j, value: val ? 'P' : '✗', display: val ? 'P' : '✗',
                highlight: val,
                sources: [[i + 1, j - 1]],
                formula: `isPalin[${i}][${j}] = ('${s[i]}'=='${s[j]}') && isPalin[${i+1}][${j-1}]`,
                explanation: val
                    ? `'${s[i]}'=='${s[j]}' and inner is palindrome → "<strong>${s.slice(i,j+1)}</strong>" ✅`
                    : `'${s[i]}'≠'${s[j]}' or inner not palindrome → "${s.slice(i,j+1)}" ✗`,
                recursive: val
                    ? `<span class="rec-match">isPalin(${i},${j}) = true ['${s.slice(i,j+1)}']</span>`
                    : `<span class="rec-nomatch">isPalin(${i},${j}) = false ['${s.slice(i,j+1)}']</span>`
            });
        }
    }

    // Step 2: dp[i] = min cuts for s[0..i]
    // We store these in a second logical table rendered as row=1
    const dp = Array(n).fill(Infinity);
    for (let i = 0; i < n; i++) {
        if (isPalin[0][i]) {
            dp[i] = 0;
        } else {
            for (let k = 1; k <= i; k++) {
                if (isPalin[k][i] && dp[k - 1] + 1 < dp[i]) {
                    dp[i] = dp[k - 1] + 1;
                }
            }
        }
        animationSteps.push({
            // Render dp[i] below the isPalin table: row = n (extra row), col = i
            row: n, col: i, value: dp[i], display: String(dp[i]),
            highlight: dp[i] === 0,
            sources: isPalin[0][i] ? [[0, i]] : [],
            formula: isPalin[0][i]
                ? `dp[${i}] = 0  (s[0..${i}]="${s.slice(0,i+1)}" is itself a palindrome)`
                : `dp[${i}] = min over k: dp[k-1]+1 where isPalin[k][${i}] = ${dp[i]}`,
            explanation: dp[i] === 0
                ? `"<strong>${s.slice(0, i+1)}</strong>" is a palindrome → 0 cuts needed`
                : `Min cuts for "<strong>${s.slice(0, i+1)}</strong>" = <strong>${dp[i]}</strong>`,
            recursive: dp[i] === 0
                ? `<span class="rec-match">minCut(0,${i}) = 0 ['${s.slice(0,i+1)}' is palindrome]</span>`
                : `<span class="rec-match">minCut(0,${i}) = ${dp[i]}</span>`
        });
    }

    const answer = dp[n - 1];

    // Reconstruct the actual palindrome partition
    function tracePartition() {
        const cuts = [];
        function rec(end) {
            if (end < 0) return;
            if (isPalin[0][end]) { cuts.unshift([0, end]); return; }
            for (let k = 1; k <= end; k++) {
                if (isPalin[k][end] && dp[k - 1] + 1 === dp[end]) {
                    cuts.unshift([k, end]);
                    rec(k - 1);
                    break;
                }
            }
        }
        rec(n - 1);
        return cuts;
    }
    const segments = tracePartition();
    const segHTML = segments.map(([l, r]) =>
        `<span class="sol-palindrome">${s.slice(l, r + 1)}</span>`
    ).join('<span class="sol-cut">|</span>');
    const recCode = `<code>// Phase 1: isPalin[i][j]
isPalin(i, j):
  if i==j: return true
  if j==i+1: return s[i]==s[j]
  return s[i]==s[j] &&
         isPalin(i+1, j-1)

// Phase 2: min cuts
minCut(i):
  if isPalin(0,i): return 0
  ans = ∞
  for k in 1..i:
    if isPalin(k,i):
      ans = min(ans, minCut(k-1)+1)
  return ans
// Answer = ${answer} cut(s)</code>`;

    renderVisualizationScaffold(
        'Palindrome Partitioning — Min Cuts',
        `s = "${s}" · Answer: ${answer} cut(s) · Top = isPalin table, Bottom row = minCuts`,
        recCode
    );

    // Table: rows 0..n-1 for isPalin, row n for dp cuts
    const rowH = Array.from({ length: n }, (_, i) => `i=${i}(${s[i]})`);
    rowH.push('minCut');
    const colH = Array.from({ length: n }, (_, j) => `j=${j}(${s[j]})`);
    buildTableDOM(rowH, colH, '·');
    showAnswer({
        label: 'Min Cuts',
        value: answer,
        sub: `"${s}"`,
        badges: [`${answer + 1} part(s)`, `${n}×${n} isPalin`],
        solution: `<div class="sol-label">Partitioned Segments</div><div class="sol-path sol-segments">${segHTML}</div>`
    });
    updateProgressBar();
}
function showAnswer({ label, value, sub = '', badges = [], solution = null }) {
    const panel = document.getElementById('answer-panel');
    if (!panel) return;
    const badgeHTML = badges.map(b =>
        `<div class="answer-badge">${b}</div>`
    ).join('');
    panel.innerHTML = `
        <div class="answer-label">${label}</div>
        <div class="answer-value">${value}</div>
        ${sub ? `<div class="answer-sub">${sub}</div>` : ''}
        ${badgeHTML}
        ${solution ? `<div class="answer-solution">${solution}</div>` : ''}
    `;
}

// ─── Main dispatcher ────────────────────────────────────────────────────────
function computeTable() {
    pauseAnimation();
    switch (currentAlgorithm) {
        case 'lcs':           computeLCS();          break;
        case 'knapsack':      computeKnapsack();     break;
        case 'assembly':      computeAssembly();     break;
        case 'floyd':         computeFloyd();        break;
        case 'subset':        computeSubset();       break;
        case 'mcm':           computeMCM();          break;
        case 'tsp':           computeTSP();          break;
        case 'countsubsets':  computeCountSubsets(); break;
        case 'palindrome':    computePalindrome();   break;
        default: alert('Unknown algorithm');
    }
}

function resetTable() {
    pauseAnimation();
    dpTable = []; backtrackInfo = []; animationSteps = []; currentStep = -1;
    document.getElementById('table-section').innerHTML = `
        <div class="empty-state">
            <p>Click "Compute" to visualize the DP table</p>
            <p>Watch as each cell is filled — step by step, with recursive context</p>
        </div>`;
}

document.addEventListener('DOMContentLoaded', updateParameterFields);
