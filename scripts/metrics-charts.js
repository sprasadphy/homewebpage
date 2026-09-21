/*
  Interactive Academic Metrics and Citation Graphs
  Renders live metrics and responsive SVG charts from window.SCIENTIFIC_METRICS
*/

(function () {
  "use strict";

  var metricsContainer = document.getElementById("academic-metrics-dashboard");
  if (!metricsContainer) {
    return;
  }

  var metrics = window.SCIENTIFIC_METRICS;
  if (!metrics) {
    return;
  }

  // Current active mode for the annual chart: 'all' | 'core' | 'citations'
  var activeChartMode = "core";

  function renderDashboard() {
    metricsContainer.innerHTML = "";

    // 1. KPI Cards Row
    var kpiGrid = document.createElement("div");
    kpiGrid.className = "metrics-kpi-grid";

    var kpis = [
      {
        label: "Total Citations",
        value: metrics.total_citations ? metrics.total_citations.toLocaleString() : "4,274",
        sub: metrics.independent_citations ? (metrics.independent_citations.toLocaleString() + " independent") : "1,629 independent",
        badge: "InspireHEP"
      },
      {
        label: "h-index",
        value: metrics.h_index_overall || 34,
        sub: "Core (≤10 authors): " + (metrics.h_index_core || 12),
        badge: "Overall: 34"
      },
      {
        label: "Publications",
        value: metrics.total_papers || 243,
        sub: "Core focus (≤10 authors): " + (metrics.core_papers || 56),
        badge: "ALICE + Core"
      },
      {
        label: "Cumulative Impact Factor",
        value: (metrics.cumulative_impact_factor_overall || 880.9).toFixed(1),
        sub: "Core (≤10 authors): " + (metrics.cumulative_impact_factor_core || 111.8).toFixed(1),
        badge: "Refereed"
      }
    ];

    kpis.forEach(function (kpi) {
      var card = document.createElement("div");
      card.className = "metric-kpi-card";

      var badgeEl = document.createElement("span");
      badgeEl.className = "metric-kpi-badge";
      badgeEl.textContent = kpi.badge;

      var valEl = document.createElement("div");
      valEl.className = "metric-kpi-value";
      valEl.textContent = kpi.value;

      var labelEl = document.createElement("div");
      labelEl.className = "metric-kpi-label";
      labelEl.textContent = kpi.label;

      var subEl = document.createElement("div");
      subEl.className = "metric-kpi-sub";
      subEl.textContent = kpi.sub;

      card.appendChild(badgeEl);
      card.appendChild(valEl);
      card.appendChild(labelEl);
      card.appendChild(subEl);
      kpiGrid.appendChild(card);
    });

    metricsContainer.appendChild(kpiGrid);

    // 2. Chart Section with Toggles
    var chartWrapper = document.createElement("div");
    chartWrapper.className = "metric-chart-wrapper";

    var chartHeader = document.createElement("div");
    chartHeader.className = "metric-chart-header";

    var chartTitle = document.createElement("h3");
    chartTitle.id = "metric-chart-title";
    chartTitle.textContent = "Research Output by Year (2020 – 2026)";

    var toggleContainer = document.createElement("div");
    toggleContainer.className = "metric-chart-toggles";

    var modes = [
      { key: "core", label: "Core Papers (≤10 Authors)" },
      { key: "all", label: "All Papers (incl. ALICE)" },
      { key: "citations", label: "Annual Citations" }
    ];

    modes.forEach(function (m) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chart-toggle-btn" + (activeChartMode === m.key ? " active" : "");
      btn.textContent = m.label;
      btn.setAttribute("data-mode", m.key);
      btn.addEventListener("click", function () {
        activeChartMode = m.key;
        updateChart();
        // Update active class
        var allBtns = toggleContainer.querySelectorAll(".chart-toggle-btn");
        allBtns.forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
      });
      toggleContainer.appendChild(btn);
    });

    chartHeader.appendChild(chartTitle);
    chartHeader.appendChild(toggleContainer);
    chartWrapper.appendChild(chartHeader);

    var svgBox = document.createElement("div");
    svgBox.id = "metric-svg-container";
    svgBox.className = "metric-svg-container";
    chartWrapper.appendChild(svgBox);

    metricsContainer.appendChild(chartWrapper);

    // 3. Top Cited Papers Preview
    if (Array.isArray(metrics.top_cited) && metrics.top_cited.length > 0) {
      var topCitedSection = document.createElement("div");
      topCitedSection.className = "top-cited-section";

      var topCitedTitle = document.createElement("h3");
      topCitedTitle.textContent = "Top-Cited Core Publications";
      topCitedSection.appendChild(topCitedTitle);

      var topGrid = document.createElement("div");
      topGrid.className = "top-cited-grid";

      metrics.top_cited.slice(0, 4).forEach(function (p) {
        var pCard = document.createElement("div");
        pCard.className = "top-cited-card";

        var pBadge = document.createElement("span");
        pBadge.className = "citation-count-badge";
        pBadge.textContent = p.citations + " citations (" + p.independent + " indep.)";

        var pLink = document.createElement("a");
        pLink.href = p.url || "#";
        pLink.target = "_blank";
        pLink.rel = "noopener noreferrer";
        pLink.textContent = p.title;

        var pYear = document.createElement("span");
        pYear.className = "top-cited-year";
        pYear.textContent = p.year ? "Year: " + p.year : "";

        pCard.appendChild(pBadge);
        pCard.appendChild(pLink);
        pCard.appendChild(pYear);
        topGrid.appendChild(pCard);
      });

      topCitedSection.appendChild(topGrid);
      metricsContainer.appendChild(topCitedSection);
    }

    updateChart();
  }

  function updateChart() {
    var svgBox = document.getElementById("metric-svg-container");
    var titleEl = document.getElementById("metric-chart-title");
    if (!svgBox || !metrics.annual_series) {
      return;
    }

    var series = metrics.annual_series;
    var width = 760;
    var height = 280;
    var padLeft = 50;
    var padRight = 30;
    var padTop = 35;
    var padBottom = 40;

    var chartW = width - padLeft - padRight;
    var chartH = height - padTop - padBottom;

    var values = series.map(function (d) {
      if (activeChartMode === "all") {
        return d.all_papers || 0;
      } else if (activeChartMode === "citations") {
        return d.citations || 0;
      } else {
        return d.core_papers || 0;
      }
    });

    if (activeChartMode === "all") {
      titleEl.textContent = "Annual Output: All Publications (incl. ALICE Collaboration)";
    } else if (activeChartMode === "citations") {
      titleEl.textContent = "Annual Citations Accrued Across Output";
    } else {
      titleEl.textContent = "Annual Output: Core Publications (≤10 Authors)";
    }

    var maxVal = Math.max.apply(null, values);
    if (maxVal <= 0) {
      maxVal = 10;
    }
    // Round maxVal up to a nice number
    var step = activeChartMode === "citations" ? 500 : (activeChartMode === "all" ? 15 : 5);
    maxVal = Math.ceil(maxVal / step) * step;

    var barWidth = Math.min(54, (chartW / series.length) * 0.58);
    var slotWidth = chartW / series.length;

    var svgParts = [];
    svgParts.push('<svg viewBox="0 0 ' + width + ' ' + height + '" class="metric-chart-svg" role="img" aria-label="Scientific metrics chart">');

    // Subtle grid lines
    var numGridLines = 4;
    for (var g = 0; g <= numGridLines; g++) {
      var gridYVal = Math.round((maxVal / numGridLines) * g);
      var gridY = padTop + chartH - (gridYVal / maxVal) * chartH;
      svgParts.push(
        '<line x1="' + padLeft + '" y1="' + gridY + '" x2="' + (width - padRight) + '" y2="' + gridY + '" stroke="var(--border)" stroke-dasharray="3,3" opacity="0.6" />'
      );
      svgParts.push(
        '<text x="' + (padLeft - 10) + '" y="' + (gridY + 4) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + gridYVal + '</text>'
      );
    }

    // Colors
    var barFill = activeChartMode === "all" ? "var(--indigo)" : (activeChartMode === "citations" ? "var(--orange)" : "var(--accent)");
    var barAccent = activeChartMode === "all" ? "var(--accent-2)" : (activeChartMode === "citations" ? "var(--red)" : "var(--accent-3)");

    // Bars
    series.forEach(function (d, i) {
      var val = values[i];
      var barH = (val / maxVal) * chartH;
      var x = padLeft + i * slotWidth + (slotWidth - barWidth) / 2;
      var y = padTop + chartH - barH;

      // Bar rect
      svgParts.push(
        '<rect class="chart-bar" x="' + x + '" y="' + y + '" width="' + barWidth + '" height="' + Math.max(2, barH) + '" rx="5" fill="' + barFill + '">'
      );
      svgParts.push('<title>' + d.year + ': ' + val + (activeChartMode === "citations" ? ' citations' : ' papers') + '</title>');
      svgParts.push('</rect>');

      // Value label on top of bar
      if (val > 0) {
        svgParts.push(
          '<text x="' + (x + barWidth / 2) + '" y="' + (y - 8) + '" text-anchor="middle" font-size="12" font-weight="600" fill="var(--text)">' + val + '</text>'
        );
      }

      // X-axis Year label
      svgParts.push(
        '<text x="' + (x + barWidth / 2) + '" y="' + (height - 14) + '" text-anchor="middle" font-size="12" font-weight="500" fill="var(--muted)">' + d.year + '</text>'
      );
    });

    // Base axis line
    var baseY = padTop + chartH;
    svgParts.push(
      '<line x1="' + padLeft + '" y1="' + baseY + '" x2="' + (width - padRight) + '" y2="' + baseY + '" stroke="var(--border)" stroke-width="1.5" />'
    );

    svgParts.push('</svg>');
    svgBox.innerHTML = svgParts.join("");
  }

  // Initial render
  renderDashboard();
})();
