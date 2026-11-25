(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var COLORS = { ols: '#4f46e5', fe: '#0284c7', re: '#0f766e', fd: '#d97706', slope: '#4f46e5' };

  var EXPERIMENTS = {
    re: {
      no: '01',
      tab: 'FE vs RE vs OLS',
      title: 'Pooled OLS vs FE vs RE — does the individual effect correlate with x?',
      question: 'Predict first: when α<sub>i</sub> and x<sub>it</sub> are correlated, which estimator still centers on β = 1? Set λ to 0 to see who becomes efficient.',
      formula: 'y<sub>it</sub> = βx<sub>it</sub> + α<sub>i</sub> + η<sub>it</sub>, β = 1<br>x<sub>it</sub> = λα<sub>i</sub> + b<sub>i</sub> + u<sub>it</sub>',
      defaults: { n: 200, T: 8, reps: 500, lambda: 0.8, sigmaAlpha: 1, sigmaB: 2, sigmaU: 1, sigmaEta: 1, seed: 42 },
      fields: [
        { key: 'n', label: 'Individuals n', min: 20, max: 1000, step: 10 },
        { key: 'T', label: 'Periods T', min: 3, max: 30, step: 1 },
        { key: 'lambda', label: 'α–x correlation λ', min: -2, max: 2, step: 0.1 },
        { key: 'sigmaAlpha', label: 'SD of α<sub>i</sub>', min: 0.1, max: 3, step: 0.1 },
        { key: 'sigmaB', label: 'SD of b<sub>i</sub>', min: 0, max: 4, step: 0.1 },
        { key: 'sigmaU', label: 'SD of u<sub>it</sub>', min: 0.1, max: 3, step: 0.1 },
        { key: 'sigmaEta', label: 'SD of η<sub>it</sub>', min: 0.1, max: 3, step: 0.1 },
        { key: 'reps', label: 'Replications R', min: 100, max: 2000, step: 100 },
        { key: 'seed', label: 'Random seed', min: 1, max: 99999, step: 1 }
      ],
      presets: [
        { label: 'RE biased: λ = 0.8', values: { lambda: 0.8 } },
        { label: 'RE valid: λ = 0', values: { lambda: 0 } },
        { label: 'Reverse bias: λ = −0.8', values: { lambda: -0.8 } }
      ]
    },

    fefd: {
      no: '02',
      tab: 'FE vs FD + serial SEs',
      title: 'FE vs FD — measurement error and serial correlation',
      question: 'Predict first: which slope mean is closer to the true β, FE or FD? Then: does the conventional FE standard error match the actual spread of β̂?',
      formula: 'y<sub>it</sub> = βx*<sub>it</sub> + α<sub>i</sub> + η<sub>it</sub><br>x<sub>it</sub> = x*<sub>it</sub> + v<sub>it</sub><br>x*<sub>it</sub> = ρ<sub>x</sub>x*<sub>i,t−1</sub> + ε<sub>it</sub><br>η<sub>it</sub> = ρ<sub>η</sub>η<sub>i,t−1</sub> + e<sub>it</sub>',
      defaults: { n: 200, T: 8, reps: 500, beta: 1, rhoX: 0.9, sigmaV: 1, rhoE: 0.8, sigmaE: 1, seed: 42 },
      fields: [
        { key: 'n', label: 'Individuals n', min: 20, max: 1000, step: 10 },
        { key: 'T', label: 'Periods T', min: 4, max: 30, step: 1 },
        { key: 'beta', label: 'True β', min: 0, max: 2, step: 0.1 },
        { key: 'rhoX', label: 'Persistence ρ<sub>x</sub> of x*', min: 0, max: 0.98, step: 0.05 },
        { key: 'sigmaV', label: 'Measurement error σ<sub>v</sub>', min: 0, max: 3, step: 0.1 },
        { key: 'rhoE', label: 'AR(1) coefficient ρ<sub>η</sub>', min: 0, max: 0.95, step: 0.05 },
        { key: 'sigmaE', label: 'SD of e<sub>it</sub>', min: 0.1, max: 3, step: 0.1 },
        { key: 'reps', label: 'Replications R', min: 100, max: 2000, step: 100 },
        { key: 'seed', label: 'Random seed', min: 1, max: 99999, step: 1 }
      ],
      presets: [
        { label: 'Attenuation, iid η (β = 1, ρ<sub>η</sub> = 0)', values: { beta: 1, rhoE: 0, n: 200, T: 8 } },
        { label: 'Test size (β = 0, ρ<sub>η</sub> = 0.8)', values: { beta: 0, rhoE: 0.8, n: 100, T: 10 } },
        { label: 'No measurement error (σ<sub>v</sub> = 0)', values: { beta: 1, sigmaV: 0, rhoE: 0 } }
      ]
    },

    nickell: {
      no: '03',
      tab: 'Nickell bias',
      title: 'Nickell bias — FE is biased downward in short dynamic panels',
      question: 'Predict first: at T = 4, which estimator is biased upward more, pooled OLS or FE? What changes when T = 30?',
      formula: 'y<sub>it</sub> = φ y<sub>i,t−1</sub> + α<sub>i</sub> + η<sub>it</sub><br>n = 200; φ = 0.7; η ~ N(0,1)',
      defaults: { n: 200, T: 4, reps: 500, phi: 0.7, sigmaAlpha: 1, sigmaEta: 1, seed: 42 },
      fields: [
        { key: 'n', label: 'Individuals n', min: 20, max: 1000, step: 10 },
        { key: 'T', label: 'Periods T', min: 3, max: 50, step: 1 },
        { key: 'phi', label: 'True φ', min: 0, max: 0.95, step: 0.05 },
        { key: 'sigmaAlpha', label: 'SD of α<sub>i</sub>', min: 0.1, max: 3, step: 0.1 },
        { key: 'sigmaEta', label: 'SD of η<sub>it</sub>', min: 0.1, max: 3, step: 0.1 },
        { key: 'reps', label: 'Replications R', min: 100, max: 2000, step: 100 },
        { key: 'seed', label: 'Random seed', min: 1, max: 99999, step: 1 }
      ],
      presets: [
        { label: 'Default: T = 4', values: { n: 200, T: 4, phi: 0.7, sigmaAlpha: 1, sigmaEta: 1 } },
        { label: 'Switch to T = 30', values: { T: 30 } }
      ]
    }
  };

  var state = {
    active: 're',
    params: {},
    result: null,
    running: false,
    cancelled: false,
    runner: null,
    done: 0
  };

  Object.keys(EXPERIMENTS).forEach(function (key) {
    state.params[key] = Object.assign({}, EXPERIMENTS[key].defaults);
  });

  function cfg() { return EXPERIMENTS[state.active]; }
  function params() { return state.params[state.active]; }

  function fmt(v, d) {
    if (v == null || !isFinite(v)) return '—';
    return Number(v).toFixed(d == null ? 3 : d);
  }
  function signed(v, d) {
    if (v == null || !isFinite(v)) return '—';
    return (v >= 0 ? '+' : '') + fmt(v, d);
  }
  function pct(v) { return fmt(v * 100, 1) + '%'; }

  function setText(id, text) { $(id).textContent = text; }

  function renderTabs() {
    $('experimentTabs').innerHTML = Object.keys(EXPERIMENTS).map(function (key) {
      var e = EXPERIMENTS[key];
      return '<button type="button" class="tab' + (key === state.active ? ' active' : '') + '" data-key="' + key + '">' +
        '<span class="tab-num">' + e.no + '</span><span>' + e.tab + '</span></button>';
    }).join('');
  }

  function renderFields() {
    var p = params();
    $('fields').innerHTML = cfg().fields.map(function (f) {
      return '<label class="field"><span>' + f.label + '</span>' +
        '<input type="number" data-key="' + f.key + '" value="' + p[f.key] + '" min="' + f.min +
        '" max="' + f.max + '" step="' + f.step + '" /></label>';
    }).join('');
    $('presetRow').innerHTML = cfg().presets.map(function (preset, i) {
      return '<button type="button" class="preset" data-preset="' + i + '">' + preset.label + '</button>';
    }).join('');
  }

  function renderIntro() {
    var e = cfg();
    $('dgpFormula').innerHTML = e.formula;
    $('experimentIntro').innerHTML =
      '<div class="intro-kicker">DGP ' + e.no + ' / Monte Carlo</div>' +
      '<h2>' + e.title + '</h2>' +
      '<p>' + e.formula.replace(/<br\s*\/?>/g, '; ') + '</p>' +
      '<div class="question">' + e.question + '</div>';
  }

  function clearOutputs() {
    $('summaryCards').innerHTML = '';
    $('resultsTable').innerHTML = '<div class="empty-state">Running simulation…</div>';
    $('resultsTable').className = 'table-wrap empty-state';
    $('histogram').innerHTML = '';
    $('chartLegend').innerHTML = '';
    $('interpretation').innerHTML = '<div class="empty-state">Running simulation…</div>';
    $('checklist').innerHTML = '';
    setText('resultSubtitle', '');
    $('csvBtn').disabled = true;
  }

  function setExperiment(key) {
    state.active = key;
    renderTabs();
    renderFields();
    renderIntro();
    clearOutputs();
    $('runBtn').textContent = 'Run ' + params().reps + ' replications';
    run();
  }

  function updateProgress(frac, text) {
    $('progressBar').style.width = (frac * 100).toFixed(1) + '%';
    setText('progressText', text);
  }

  function run() {
    if (state.running) return;
    var p = params();
    state.cancelled = false;
    state.running = true;
    state.result = null;
    state.done = 0;
    $('runBtn').disabled = true;
    $('cancelBtn').disabled = false;
    clearOutputs();
    state.runner = window.PanelLabSim.createRunner(state.active, p);
    updateProgress(0, '0 / ' + state.runner.reps + ' runs');

    var chunk = Math.max(4, Math.round(state.runner.reps / 45));
    function tick() {
      if (state.cancelled) { finish(false); return; }
      var end = Math.min(state.done + chunk, state.runner.reps);
      for (; state.done < end; state.done++) state.runner.step(state.done);
      updateProgress(state.done / state.runner.reps, state.done + ' / ' + state.runner.reps + ' runs');
      if (state.done < state.runner.reps) {
        requestAnimationFrame(tick);
      } else {
        finish(true);
      }
    }
    requestAnimationFrame(tick);
  }

  function finish(success) {
    state.running = false;
    $('runBtn').disabled = false;
    $('cancelBtn').disabled = true;
    if (success) {
      state.result = state.runner.result();
      renderResults();
      updateProgress(1, 'Done — ' + state.runner.reps + ' replications');
    } else {
      updateProgress(state.done / state.runner.reps, 'Stopped — ' + state.done + ' / ' + state.runner.reps + ' runs');
    }
  }

  function metricCard(label, value, hint, cls) {
    return '<div class="metric ' + (cls || '') + '"><div class="metric-label">' + label +
      '</div><div class="metric-value">' + value + '</div><div class="metric-hint">' + hint + '</div></div>';
  }

  function renderSummary() {
    var r = state.result, s = r.stats, p = params(), html = '';
    if (state.active === 're') {
      html = metricCard('Pooled OLS mean', fmt(s.ols.mean), 'Bias ' + signed(s.ols.bias), 'accent') +
        metricCard('FE (within) mean', fmt(s.fe.mean), 'Bias ' + signed(s.fe.bias), 'sky') +
        metricCard('RE (GLS) mean', fmt(s.re.mean), 'Bias ' + signed(s.re.bias), 'amber') +
        metricCard('RE SD', fmt(s.re.sd), 'FE SD = ' + fmt(s.fe.sd));
    } else if (state.active === 'nickell') {
      html = metricCard('Pooled OLS mean', fmt(s.ols.mean), 'Bias ' + signed(s.ols.bias), 'accent') +
        metricCard('FE (within) mean', fmt(s.fe.mean), 'Bias ' + signed(s.fe.bias), 'sky') +
        metricCard('True φ', fmt(p.phi, 2), 'T = ' + p.T + ' periods');
    } else if (state.active === 'fefd') {
      if (Math.abs(p.beta) < 1e-9) {
        html = metricCard('Conventional SE rejection', pct(s.rejectConv), 'Nominal size 5%', 'accent') +
          metricCard('Clustered SE rejection', pct(s.rejectCl), 'Nominal size 5%', 'sky') +
          metricCard('Mean SE ratio', fmt(s.seConv.mean / s.seCl.mean, 2), 'Conventional / clustered', 'amber');
      } else {
        html = metricCard('FE mean slope', fmt(s.fe.mean), 'Bias ' + signed(s.fe.bias), 'accent') +
          metricCard('FD mean slope', fmt(s.fd.mean), 'Bias ' + signed(s.fd.bias), 'amber') +
          metricCard('Conv. SE ÷ MC SD', fmt(s.seConv.mean / s.fe.sd, 2), 'Below 1 = over-confident', 'sky') +
          metricCard('Clustered SE ÷ MC SD', fmt(s.seCl.mean / s.fe.sd, 2), 'Near 1 = calibrated');
      }
    }
    $('summaryCards').innerHTML = html;
  }

  function tableHTML(headers, rows) {
    var html = '<table><thead><tr>';
    headers.forEach(function (h) { html += '<th>' + h + '</th>'; });
    html += '</tr></thead><tbody>';
    rows.forEach(function (row) {
      html += '<tr>';
      row.forEach(function (cell, i) {
        html += '<td' + (i === 0 ? '' : ' class="num"') + '>' + cell + '</td>';
      });
      html += '</tr>';
    });
    return html + '</tbody></table>';
  }

  function statRow(label, st, truth) {
    var bias = truth == null ? '—' : signed(st.bias);
    return [label, fmt(st.mean), bias, fmt(st.median), fmt(st.sd), fmt(st.p05) + ' ~ ' + fmt(st.p95)];
  }

  function renderTables() {
    var r = state.result, s = r.stats, html = '';
    var common = ['Estimator', 'Mean', 'Bias', 'Median', 'SD', '5% ~ 95%'];
    $('resultsTable').className = 'table-wrap';

    if (state.active === 're') {
      setText('resultSubtitle', 'RE uses true variance components for quasi-demeaning (θ = ' + fmt(r.meta.theta) + '); FE uses within transformation and OLS uses a common intercept.');
      html = tableHTML(common, [
        statRow('Pooled OLS', s.ols, r.meta.truth),
        statRow('FE (within)', s.fe, r.meta.truth),
        statRow('RE (GLS)', s.re, r.meta.truth)
      ]);
    } else if (state.active === 'nickell') {
      setText('resultSubtitle', 'Each replication generates an n × T panel; FE uses within transformation and OLS includes a common intercept.');
      html = tableHTML(common, [
        statRow('Pooled OLS', s.ols, r.meta.truth),
        statRow('FE (within)', s.fe, r.meta.truth)
      ]);
    } else if (state.active === 'fefd') {
      var p0 = params(), showSize = Math.abs(p0.beta) < 1e-9, mcSd = s.fe.sd;
      setText('resultSubtitle', showSize
        ? 'β = 0, so the rejection rate is the test size; critical value |t| > 1.96. With no signal in x, measurement error cannot bias β̂.'
        : 'True β = ' + fmt(p0.beta, 2) + '; observed x contains measurement error and η is AR(1). Rejection rates appear only at β = 0, where they measure test size.');
      html = '<div class="table-title">Slope estimates</div>' +
        tableHTML(common, [
          statRow('FE (within)', s.fe, r.meta.truth),
          statRow('FD (first difference)', s.fd, r.meta.truth)
        ]) +
        '<div class="table-title">FE standard errors vs. actual sampling variation</div>' +
        tableHTML(['Metric', 'Mean', 'Ratio to MC SD'], [
          ['Conventional FE SE', fmt(s.seConv.mean), fmt(s.seConv.mean / mcSd)],
          ['Clustered FE SE (by unit)', fmt(s.seCl.mean), fmt(s.seCl.mean / mcSd)],
          ['Monte Carlo SD of β̂', fmt(mcSd), '1.00']
        ]);
      if (showSize) {
        html += '<div class="table-title">Rejection rate of the 5% two-sided test (H0: β = 0)</div>' +
          tableHTML(['Test', 'Rejection rate', 'Nominal', 'Verdict'], [
            ['Conventional FE SE', pct(s.rejectConv), '5.0%', s.rejectConv > 0.1 ? 'Strongly over-rejects' : 'Close to nominal'],
            ['Clustered SE (by unit)', pct(s.rejectCl), '5.0%', s.rejectCl > 0.1 ? 'Still over-rejects' : 'Close to nominal']
          ]);
      }
    }
    $('resultsTable').innerHTML = html;
    $('csvBtn').disabled = false;
  }

  function quantile(sorted, q) {
    var pos = (sorted.length - 1) * q;
    var lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  function renderChart() {
    var r = state.result, series, truth, xLabel;
    if (state.active === 're') {
      series = [
        { label: 'Pooled OLS', values: r.arrays.ols, color: COLORS.ols },
        { label: 'FE (within)', values: r.arrays.fe, color: COLORS.fe },
        { label: 'RE (GLS)', values: r.arrays.re, color: COLORS.re }
      ];
      truth = r.meta.truth;
      xLabel = 'Slope estimate (truth ' + fmt(truth, 1) + ')';
    } else if (state.active === 'nickell') {
      series = [
        { label: 'Pooled OLS', values: r.arrays.ols, color: COLORS.ols },
        { label: 'FE (within)', values: r.arrays.fe, color: COLORS.fe }
      ];
      truth = r.meta.truth;
      xLabel = 'Lag coefficient estimate';
    } else {
      series = [
        { label: 'FE (within)', values: r.arrays.fe, color: COLORS.fe },
        { label: 'FD (first difference)', values: r.arrays.fd, color: COLORS.fd }
      ];
      truth = r.meta.truth;
      xLabel = 'Slope estimate (truth ' + fmt(truth, 2) + ')';
    }

    var all = [];
    series.forEach(function (s) { all = all.concat(s.values); });
    all.sort(function (a, b) { return a - b; });
    var lo = quantile(all, 0.01), hi = quantile(all, 0.99);
    if (truth != null) { lo = Math.min(lo, truth); hi = Math.max(hi, truth); }
    if (!isFinite(lo) || !isFinite(hi) || hi <= lo) { lo -= 1; hi += 1; }
    var pad = (hi - lo) * 0.06; lo -= pad; hi += pad;

    var bins = 26, span = hi - lo, bw = span / bins;
    var counts = series.map(function () { return new Array(bins).fill(0); });
    series.forEach(function (s, si) {
      s.values.forEach(function (v) {
        var idx = Math.floor((Math.min(hi, Math.max(lo, v)) - lo) / bw);
        idx = Math.max(0, Math.min(bins - 1, idx));
        counts[si][idx]++;
      });
    });
    var maxCount = 0;
    counts.forEach(function (c) { c.forEach(function (v) { if (v > maxCount) maxCount = v; }); });
    var yMax = Math.max(5, Math.ceil(maxCount / 5) * 5);

    var W = 760, H = 300, left = 48, right = 14, top = 16, bottom = 46;
    var pw = W - left - right, ph = H - top - bottom;
    var parts = [];

    for (var g = 0; g <= 4; g++) {
      var yy = top + ph * (g / 4);
      parts.push('<line x1="' + left + '" y1="' + yy.toFixed(2) + '" x2="' + (W - right) + '" y2="' + yy.toFixed(2) +
        '" stroke="#e8ecf5" stroke-dasharray="3 4" />');
      parts.push('<text x="' + (left - 8) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="10" fill="#8291a8">' +
        Math.round(yMax * (1 - g / 4)) + '</text>');
    }

    var groupW = pw / bins;
    var barW = groupW / (series.length + 0.45);
    for (var b = 0; b < bins; b++) {
      series.forEach(function (s, si) {
        var h = ph * counts[si][b] / yMax;
        if (h <= 0) return;
        var x = left + b * groupW + si * barW + 1;
        var cap = Math.min(3, Math.max(1.2, (barW - 1.5) / 2));
        parts.push('<rect x="' + x.toFixed(2) + '" y="' + (top + ph - h).toFixed(2) +
          '" width="' + (barW - 1.5).toFixed(2) + '" height="' + h.toFixed(2) +
          '" fill="' + s.color + '" fill-opacity="0.72" rx="' + cap.toFixed(2) + '" />');
      });
    }

    if (truth != null && truth >= lo && truth <= hi) {
      var tx = left + (truth - lo) / span * pw;
      parts.push('<line x1="' + tx.toFixed(2) + '" y1="' + top + '" x2="' + tx.toFixed(2) + '" y2="' + (top + ph) +
        '" stroke="#b91c1c" stroke-width="1.6" stroke-dasharray="5 4" />');
      parts.push('<rect x="' + (tx + 5).toFixed(2) + '" y="' + (top - 1) + '" width="40" height="16" rx="8" fill="#fef2f2" stroke="#f3cac6" />');
      parts.push('<text x="' + (tx + 11).toFixed(2) + '" y="' + (top + 11) +
        '" font-size="9.5" font-weight="600" fill="#b91c1c">Truth</text>');
    }

    parts.push('<line x1="' + left + '" y1="' + (top + ph) + '" x2="' + (W - right) + '" y2="' + (top + ph) + '" stroke="#d4dae6" />');
    for (var k = 0; k <= 4; k++) {
      var xv = lo + span * (k / 4);
      var px = left + pw * (k / 4);
      parts.push('<text x="' + px.toFixed(2) + '" y="' + (top + ph + 18) + '" text-anchor="middle" font-size="10" fill="#8291a8">' +
        xv.toFixed(2) + '</text>');
    }
    parts.push('<text x="' + (left + pw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="#45536b">' + xLabel + '</text>');
    parts.push('<text x="12" y="' + (top + ph / 2) + '" text-anchor="middle" font-size="10" fill="#8291a8" transform="rotate(-90 12 ' + (top + ph / 2) + ')">Count</text>');

    $('histogram').innerHTML = parts.join('');
    $('chartLegend').innerHTML = series.map(function (s) {
      return '<span class="legend-item"><span class="legend-swatch" style="background:' + s.color + '"></span>' + s.label + '</span>';
    }).join('');
  }

  function renderChecklist(checks) {
    $('checklist').innerHTML = checks.map(function (c) {
      return '<div class="check ' + (c.pass ? 'pass' : 'fail') + '"><span class="check-dot"></span><span>' +
        (c.pass ? 'As expected: ' : 'Not met: ') + c.label + '</span></div>';
    }).join('');
  }

  function renderInterpretation() {
    var r = state.result, s = r.stats, html = '', checks = [];
    if (state.active === 're') {
      var lam = params().lambda, truth = r.meta.truth;
      if (Math.abs(lam) >= 0.05) {
        html = '<p>λ = <span class="key">' + fmt(lam, 2) + '</span>, so α<sub>i</sub> and x<sub>it</sub> are correlated. FE mean <span class="key">' +
          fmt(s.fe.mean) + '</span> still centers on β = ' + fmt(truth, 1) + '; RE mean <span class="key">' + fmt(s.re.mean) +
          '</span> and pooled OLS mean <span class="key">' + fmt(s.ols.mean) + '</span> are pulled away, with OLS biased the most.</p>' +
          '<p>RE quasi-demeaning (θ = ' + fmt(r.meta.theta) + ') only partly downweights the between variation, while pooled OLS ignores α<sub>i</sub> entirely. Move λ to 0 to see RE become unbiased and efficient again.</p>';
        checks = [
          { label: 'FE close to truth (|bias| < 0.05)', pass: Math.abs(s.fe.bias) < 0.05 },
          { label: 'RE bias has the sign of λ', pass: lam * s.re.bias > 0 },
          { label: 'Pooled OLS bias exceeds RE bias', pass: Math.abs(s.ols.bias) > Math.abs(s.re.bias) }
        ];
      } else {
        html = '<p>λ = 0, so α<sub>i</sub> is uncorrelated with x<sub>it</sub>. All three estimators are centered on β = ' +
          fmt(truth, 1) + ': FE <span class="key">' + fmt(s.fe.mean) + '</span>, RE <span class="key">' + fmt(s.re.mean) +
          '</span>, pooled OLS <span class="key">' + fmt(s.ols.mean) + '</span>.</p>' +
          '<p>RE is the most efficient: SD <span class="key">' + fmt(s.re.sd) + '</span> versus FE ' + fmt(s.fe.sd) +
          ' and OLS ' + fmt(s.ols.sd) + ', because it also uses the between variation. Move λ away from 0 and that efficiency gain turns into bias.</p>';
        checks = [
          { label: 'FE close to truth (|bias| < 0.05)', pass: Math.abs(s.fe.bias) < 0.05 },
          { label: 'RE close to truth (|bias| < 0.05)', pass: Math.abs(s.re.bias) < 0.05 },
          { label: 'RE SD lower than FE SD (more efficient)', pass: s.re.sd < s.fe.sd }
        ];
      }
    } else if (state.active === 'nickell') {
      var f = s.fe, o = s.ols, phi = r.meta.truth;
      html = '<p>FE mean <span class="key">' + fmt(f.mean) + '</span> is well below the true φ = ' + fmt(phi, 2) +
        ', while pooled OLS mean <span class="key">' + fmt(o.mean) + '</span> is above it. ' +
        'Because α<sub>i</sub> is positively correlated with the lagged dependent variable, OLS loads the individual effect into the lag, while FE makes the demeaned error negatively correlated with that lag.</p>' +
        '<p>This run has T = ' + params().T + '. ' + (params().T <= 6
          ? 'Set T = 30 and the FE bias shrinks from ' + fmt(f.bias) + ' toward the 1/(T−1) order of magnitude, while the OLS overestimate persists.'
          : 'Compared with a short panel, the FE bias has already shrunk toward the 1/(T−1) order of magnitude, while the OLS overestimate is essentially unchanged.') + '</p>';
      checks = [
        { label: 'FE mean < truth ' + fmt(phi, 2), pass: f.mean < phi },
        { label: 'OLS mean > truth ' + fmt(phi, 2), pass: o.mean > phi },
        { label: 'δ̂<sub>FE</sub> &lt; δ &lt; δ̂<sub>OLS</sub>', pass: f.mean < phi && phi < o.mean }
      ];
    } else {
      var feAtt = s.fe.mean, fdAtt = s.fd.mean, beta0 = r.meta.truth;
      var mcSd = s.fe.sd, ratioC = s.seConv.mean / mcSd, ratioCl = s.seCl.mean / mcSd;
      if (Math.abs(beta0) < 1e-9) {
        html = '<p>With β = 0 both slopes center on zero: FE <span class="key">' + fmt(feAtt) + '</span>, FD <span class="key">' + fmt(fdAtt) +
          '</span>. Measurement error cannot attenuate a zero effect, so the point estimates look fine.</p>' +
          '<p>Inference is where it breaks. Conventional FE SE averages <span class="key">' + fmt(s.seConv.mean) +
          '</span> against an actual spread of <span class="key">' + fmt(mcSd) + '</span> (ratio ' + fmt(ratioC, 2) +
          '), while the clustered SE averages ' + fmt(s.seCl.mean) + ' (ratio ' + fmt(ratioCl, 2) +
          '). Ignoring the AR(1) dependence in η<sub>it</sub> makes the test over-reject: <span class="key">' + pct(s.rejectConv) +
          '</span> versus ' + pct(s.rejectCl) + ' at the 5% level.</p>';
        checks = [
          { label: 'Both slopes centered on 0 (|bias| < 0.05)', pass: Math.abs(s.fe.bias) < 0.05 && Math.abs(s.fd.bias) < 0.05 },
          { label: 'Conventional SE understates the MC SD (< 0.9)', pass: ratioC < 0.9 },
          { label: 'Clustered SE close to the MC SD (0.9 ~ 1.1)', pass: ratioCl >= 0.9 && ratioCl <= 1.1 },
          { label: 'Conventional test over-rejects (> 10%)', pass: s.rejectConv > 0.1 }
        ];
      } else {
        html = '<p>True β = ' + fmt(beta0, 2) + ', but FE averages <span class="key">' + fmt(feAtt) + '</span> and FD <span class="key">' + fmt(fdAtt) +
          '</span>: both are attenuated. With ρ<sub>x</sub> = ' + fmt(params().rhoX, 2) +
          ', the within transformation leaves little genuine signal in x* relative to the measurement noise.</p>' +
          '<p>FD also removes α<sub>i</sub>, but differencing turns v<sub>it</sub> into v<sub>it</sub> − v<sub>i,t−1</sub>, so ' +
          (fdAtt < feAtt ? 'FD is more attenuated here' : 'FE is more attenuated here') + '. Bias and uncertainty are separate problems: the conventional FE SE averages ' +
          fmt(s.seConv.mean) + ' against an actual spread of ' + fmt(mcSd) + ' (ratio ' + fmt(ratioC, 2) +
          '), while the clustered SE averages ' + fmt(s.seCl.mean) + ' (ratio ' + fmt(ratioCl, 2) + ').</p>' +
          '<p>Set β = 0 (preset) to read rejection rates as test size.</p>';
        checks = [
          { label: 'FE slope attenuated below ' + fmt(beta0, 2), pass: feAtt < beta0 },
          { label: 'FD slope attenuated below ' + fmt(beta0, 2), pass: fdAtt < beta0 },
          { label: 'At this ρ<sub>x</sub>, FD is more attenuated', pass: fdAtt < feAtt },
          { label: 'Clustered SE close to the MC SD (0.9 ~ 1.1)', pass: ratioCl >= 0.9 && ratioCl <= 1.1 }
        ];
      }
    }
    $('interpretation').className = 'interpretation';
    $('interpretation').innerHTML = html;
    renderChecklist(checks);
  }

  function renderResults() {
    renderSummary();
    renderTables();
    renderChart();
    renderInterpretation();
  }

  function exportCSV() {
    if (!state.result) return;
    var r = state.result, header, keys;
    if (state.active === 're') {
      header = ['rep', 'pooled_ols', 'fe_within', 're_gls']; keys = ['ols', 'fe', 're'];
    } else if (state.active === 'nickell') {
      header = ['rep', 'pooled_ols', 'fe_within']; keys = ['ols', 'fe'];
    } else {
      header = ['rep', 'fe_within', 'fd', 'se_conventional', 'se_clustered', 'reject_conventional', 'reject_clustered'];
      keys = ['fe', 'fd', 'seConv', 'seCl', 'rejectConv', 'rejectCl'];
    }
    var lines = [header.join(',')];
    var n = r.arrays[keys[0]].length;
    for (var i = 0; i < n; i++) {
      lines.push([i + 1].concat(keys.map(function (k) { return r.arrays[k][i]; })).join(','));
    }
    var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'panel-lab-' + state.active + '-seed' + params().seed + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  $('experimentTabs').addEventListener('click', function (e) {
    var btn = e.target.closest('.tab');
    if (btn && !state.running) setExperiment(btn.dataset.key);
  });

  $('fields').addEventListener('input', function (e) {
    var input = e.target;
    if (!input.dataset.key) return;
    var v = parseFloat(input.value);
    if (isFinite(v)) params()[input.dataset.key] = v;
    $('runBtn').textContent = 'Run ' + params().reps + ' replications';
  });

  $('presetRow').addEventListener('click', function (e) {
    var btn = e.target.closest('.preset');
    if (!btn) return;
    var preset = cfg().presets[Number(btn.dataset.preset)];
    Object.keys(preset.values).forEach(function (k) { params()[k] = preset.values[k]; });
    renderFields();
    $('runBtn').textContent = 'Run ' + params().reps + ' replications';
    run();
  });

  $('runBtn').addEventListener('click', run);
  $('cancelBtn').addEventListener('click', function () { state.cancelled = true; });
  $('csvBtn').addEventListener('click', exportCSV);

  setExperiment('re');
})();
