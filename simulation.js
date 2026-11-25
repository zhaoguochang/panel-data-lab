/* Panel Data Lab — Monte Carlo engines.
 * Dependency-free, deterministic (seed + replication index), UMD-style.
 */
(function (global) {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function mix(seed, salt) {
    var h = (seed ^ salt) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }

  function rngFor(seed, rep) {
    return mulberry32(mix(seed >>> 0, Math.imul(rep + 1, 0x9e3779b1)));
  }

  function randn(rng) {
    var u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function quantile(sorted, q) {
    var pos = (sorted.length - 1) * q;
    var lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  function summarize(values, truth) {
    var arr = Array.from(values);
    var n = arr.length;
    var mean = 0;
    for (var i = 0; i < n; i++) mean += arr[i];
    mean /= n || 1;
    var varSum = 0;
    for (var j = 0; j < n; j++) varSum += (arr[j] - mean) * (arr[j] - mean);
    var sd = Math.sqrt(varSum / Math.max(1, n - 1));
    var sorted = arr.slice().sort(function (a, b) { return a - b; });
    return {
      n: n,
      mean: mean,
      median: quantile(sorted, 0.5),
      sd: sd,
      p05: quantile(sorted, 0.05),
      p95: quantile(sorted, 0.95),
      bias: truth == null ? null : mean - truth,
      rmse: truth == null ? null : Math.sqrt(varSum / n + mean * mean - 2 * mean * truth + truth * truth)
    };
  }

  function rate(values) {
    var s = 0;
    for (var i = 0; i < values.length; i++) s += values[i] ? 1 : 0;
    return s / (values.length || 1);
  }

  /* ------------------------------------------------------------------ *
   * 1. Nickell bias: y_it = phi*y_i,t-1 + alpha_i + eta_it
   *    pooled OLS (with intercept) vs. within/FE, both on t >= 2.
   * ------------------------------------------------------------------ */
  function makeNickell(p) {
    var n = Math.max(5, p.n | 0);
    var T = Math.max(3, p.T | 0);
    var phi = p.phi;
    var sa = p.sigmaAlpha;
    var se = p.sigmaEta;
    var reps = p.reps | 0;
    var ols = new Float64Array(reps);
    var fe = new Float64Array(reps);
    var statSd = se / Math.sqrt(Math.max(1e-12, 1 - phi * phi));

    return {
      reps: reps,
      step: function (r) {
        var rng = rngFor(p.seed, r);
        var y = new Array(n);
        var i, t;

        for (i = 0; i < n; i++) {
          var yi = new Float64Array(T);
          var alpha = sa * randn(rng);
          var level = alpha / (1 - phi) + statSd * randn(rng);
          yi[0] = level;
          for (t = 1; t < T; t++) {
            level = phi * level + alpha + se * randn(rng);
            yi[t] = level;
          }
          y[i] = yi;
        }

        var K = T - 1;
        var M = n * K;
        var sx = 0, sy = 0, sxx = 0, sxy = 0;
        for (i = 0; i < n; i++) {
          for (t = 1; t < T; t++) {
            var x = y[i][t - 1], yy = y[i][t];
            sx += x; sy += yy; sxx += x * x; sxy += x * yy;
          }
        }
        ols[r] = (M * sxy - sx * sy) / (M * sxx - sx * sx);

        var wxx = 0, wxy = 0;
        for (i = 0; i < n; i++) {
          var mx = 0, my = 0;
          for (t = 1; t < T; t++) { mx += y[i][t - 1]; my += y[i][t]; }
          mx /= K; my /= K;
          for (t = 1; t < T; t++) {
            var dx = y[i][t - 1] - mx, dy = y[i][t] - my;
            wxx += dx * dx; wxy += dx * dy;
          }
        }
        fe[r] = wxy / wxx;
      },
      result: function () {
        return {
          stats: {
            ols: summarize(ols, phi),
            fe: summarize(fe, phi)
          },
          arrays: { ols: Array.from(ols), fe: Array.from(fe) },
          meta: { truth: phi, truthLabel: 'φ = ' + phi.toFixed(2) }
        };
      }
    };
  }

  /* ------------------------------------------------------------------ *
   * 2. Serial correlation in SEs: beta = 0, x persistent,
   *    eta_it = rhoE*eta_i,t-1 + e_it. n=100, T=10.
   *    Conventional homoskedastic FE SE vs. unit-clustered SE.
   * ------------------------------------------------------------------ */
  function makeSerial(p) {
    var n = Math.max(5, p.n | 0);
    var T = Math.max(3, p.T | 0);
    var rhoX = p.rhoX;
    var rhoE = p.rhoE;
    var su = p.sigmaU;
    var se = p.sigmaE;
    var reps = p.reps | 0;
    var crit = 1.96;
    var slope = new Float64Array(reps);
    var seConv = new Float64Array(reps);
    var seCl = new Float64Array(reps);
    var rejConv = new Uint8Array(reps);
    var rejCl = new Uint8Array(reps);
    var xSd = su / Math.sqrt(Math.max(1e-12, 1 - rhoX * rhoX));
    var eSd = se / Math.sqrt(Math.max(1e-12, 1 - rhoE * rhoE));
    var df = n * (T - 1) - 1;

    return {
      reps: reps,
      step: function (r) {
        var rng = rngFor(p.seed, r);
        var xd = new Array(n), yd = new Array(n);
        var i, t;

        for (i = 0; i < n; i++) {
          var xi = new Float64Array(T), yi = new Float64Array(T);
          var alpha = randn(rng);
          var xv = xSd * randn(rng);
          var ev = eSd * randn(rng);
          for (t = 0; t < T; t++) {
            xi[t] = xv;
            yi[t] = alpha + ev; // beta = 0
            xv = rhoX * xv + su * randn(rng);
            ev = rhoE * ev + se * randn(rng);
          }
          var xbar = 0, ybar = 0;
          for (t = 0; t < T; t++) { xbar += xi[t]; ybar += yi[t]; }
          xbar /= T; ybar /= T;
          var dx = new Float64Array(T), dy = new Float64Array(T);
          for (t = 0; t < T; t++) { dx[t] = xi[t] - xbar; dy[t] = yi[t] - ybar; }
          xd[i] = dx; yd[i] = dy;
        }

        var sxx = 0, sxy = 0;
        for (i = 0; i < n; i++) {
          for (t = 0; t < T; t++) { sxx += xd[i][t] * xd[i][t]; sxy += xd[i][t] * yd[i][t]; }
        }
        var b = sxy / sxx;
        slope[r] = b;

        var ss = 0, meat = 0;
        for (i = 0; i < n; i++) {
          var score = 0;
          for (t = 0; t < T; t++) {
            var resid = yd[i][t] - b * xd[i][t];
            ss += resid * resid;
            score += xd[i][t] * resid;
          }
          meat += score * score;
        }
        var conv = Math.sqrt((ss / df) / sxx);
        var cl = Math.sqrt(meat / (sxx * sxx) * (n / (n - 1)));
        seConv[r] = conv;
        seCl[r] = cl;
        rejConv[r] = Math.abs(b / conv) > crit ? 1 : 0;
        rejCl[r] = Math.abs(b / cl) > crit ? 1 : 0;
      },
      result: function () {
        return {
          stats: {
            slope: summarize(slope, 0),
            seConv: summarize(seConv, null),
            seCl: summarize(seCl, null),
            rejectConv: rate(rejConv),
            rejectCl: rate(rejCl)
          },
          arrays: {
            slope: Array.from(slope),
            seConv: Array.from(seConv),
            seCl: Array.from(seCl),
            rejectConv: Array.from(rejConv),
            rejectCl: Array.from(rejCl)
          },
          meta: { truth: 0, truthLabel: 'β = 0', crit: crit }
        };
      }
    };
  }

  /* ------------------------------------------------------------------ *
   * 3. FE vs FD with measurement error:
   *    y_it = x*_it + alpha_i + eta_it, x*_it AR(1) rho=0.9,
   *    observed x_it = x*_it + v_it. Compare attenuation of FE and FD.
   * ------------------------------------------------------------------ */
  function makeMeasurement(p) {
    var n = Math.max(5, p.n | 0);
    var T = Math.max(3, p.T | 0);
    var rho = p.rhoX;
    var sv = p.sigmaV;
    var se = p.sigmaEta;
    var reps = p.reps | 0;
    var fe = new Float64Array(reps);
    var fd = new Float64Array(reps);
    var xSd = 1 / Math.sqrt(Math.max(1e-12, 1 - rho * rho));

    return {
      reps: reps,
      step: function (r) {
        var rng = rngFor(p.seed, r);
        var xo = new Array(n), y = new Array(n);
        var i, t;

        for (i = 0; i < n; i++) {
          var xi = new Float64Array(T), yi = new Float64Array(T);
          var alpha = randn(rng);
          var xs = xSd * randn(rng);
          for (t = 0; t < T; t++) {
            xi[t] = xs + sv * randn(rng);
            yi[t] = xs + alpha + se * randn(rng);
            xs = rho * xs + randn(rng);
          }
          xo[i] = xi; y[i] = yi;
        }

        var wxx = 0, wxy = 0;
        for (i = 0; i < n; i++) {
          var mx = 0, my = 0;
          for (t = 0; t < T; t++) { mx += xo[i][t]; my += y[i][t]; }
          mx /= T; my /= T;
          for (t = 0; t < T; t++) {
            var dx = xo[i][t] - mx, dy = y[i][t] - my;
            wxx += dx * dx; wxy += dx * dy;
          }
        }
        fe[r] = wxy / wxx;

        var dxx = 0, dxy = 0;
        for (i = 0; i < n; i++) {
          for (t = 1; t < T; t++) {
            var dx2 = xo[i][t] - xo[i][t - 1];
            var dy2 = y[i][t] - y[i][t - 1];
            dxx += dx2 * dx2; dxy += dx2 * dy2;
          }
        }
        fd[r] = dxy / dxx;
      },
      result: function () {
        return {
          stats: {
            fe: summarize(fe, 1),
            fd: summarize(fd, 1)
          },
          arrays: { fe: Array.from(fe), fd: Array.from(fd) },
          meta: { truth: 1, truthLabel: 'β = 1' }
        };
      }
    };
  }

  /* ------------------------------------------------------------------ *
   * 4. Pooled OLS vs FE vs RE: y_it = beta*x_it + alpha_i + eta_it,
   *    x_it = lambda*alpha_i + b_i + u_it.
   *    Pooled OLS has a common intercept; FE uses within transformation;
   *    RE uses quasi-demeaning with the TRUE variance components.
   * ------------------------------------------------------------------ */
  function makeRE(p) {
    var n = Math.max(5, p.n | 0);
    var T = Math.max(3, p.T | 0);
    var reps = p.reps | 0;
    var beta = p.beta == null ? 1 : p.beta;
    var lam = p.lambda;
    var sa = p.sigmaAlpha;
    var sb = p.sigmaB;
    var su = p.sigmaU;
    var se = p.sigmaEta;
    var theta = 1 - Math.sqrt(se * se / (T * sa * sa + se * se));
    var fe = new Float64Array(reps);
    var re = new Float64Array(reps);
    var ols = new Float64Array(reps);

    return {
      reps: reps,
      step: function (r) {
        var rng = rngFor(p.seed, r);
        var x = new Array(n), y = new Array(n);
        var sx = 0, sy = 0, sxx = 0, sxy = 0;
        var M = n * T;
        var i, t;

        for (i = 0; i < n; i++) {
          var xi = new Float64Array(T), yi = new Float64Array(T);
          var alpha = sa * randn(rng);
          var b = sb * randn(rng);
          for (t = 0; t < T; t++) {
            var ut = su * randn(rng);
            xi[t] = lam * alpha + b + ut;
            yi[t] = beta * xi[t] + alpha + se * randn(rng);
            sx += xi[t]; sy += yi[t]; sxx += xi[t] * xi[t]; sxy += xi[t] * yi[t];
          }
          x[i] = xi; y[i] = yi;
        }

        var feXX = 0, feXY = 0;
        var qxSum = 0, qySum = 0, qxxSum = 0, qxySum = 0;
        for (i = 0; i < n; i++) {
          var xbar = 0, ybar = 0;
          for (t = 0; t < T; t++) { xbar += x[i][t]; ybar += y[i][t]; }
          xbar /= T; ybar /= T;
          for (t = 0; t < T; t++) {
            var dx = x[i][t] - xbar, dy = y[i][t] - ybar;
            feXX += dx * dx; feXY += dx * dy;
            var qx = x[i][t] - theta * xbar;
            var qy = y[i][t] - theta * ybar;
            qxSum += qx; qySum += qy; qxxSum += qx * qx; qxySum += qx * qy;
          }
        }
        fe[r] = feXY / feXX;
        re[r] = (M * qxySum - qxSum * qySum) / (M * qxxSum - qxSum * qxSum);
        ols[r] = (M * sxy - sx * sy) / (M * sxx - sx * sx);
      },
      result: function () {
        return {
          stats: {
            ols: summarize(ols, beta),
            fe: summarize(fe, beta),
            re: summarize(re, beta)
          },
          arrays: { ols: Array.from(ols), fe: Array.from(fe), re: Array.from(re) },
          meta: { truth: beta, truthLabel: 'β = ' + beta, theta: theta, lambda: lam }
        };
      }
    };
  }

  var api = {
    createRunner: function (key, p) {
      if (key === 'nickell') return makeNickell(p);
      if (key === 'serial') return makeSerial(p);
      if (key === 'measurement') return makeMeasurement(p);
      if (key === 're') return makeRE(p);
      throw new Error('Unknown experiment: ' + key);
    },
    summarize: summarize,
    randn: randn,
    rngFor: rngFor
  };

  global.PanelLabSim = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
