(function () {
  "use strict";

  var data = window.PUBLICATIONS;
  var root = document.getElementById("pub-sections");
  var firstOnly = document.getElementById("first-only");
  var countEl = document.getElementById("pub-count");
  if (!data || !root) {
    return;
  }

  var groups = [
    { key: "published", title: "Journal articles" },
    { key: "submitted", title: "Preprints" },
    { key: "conference", title: "Conference proceedings and other contributions" }
  ];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // Titles may carry <sup>, <sub> and <i> from the LaTeX source; keep only those tags.
  function safeTitle(s) {
    return esc(s).replace(/&lt;(\/?)(sup|sub|i)&gt;/g, "<$1$2>");
  }

  function boldMe(authors) {
    return esc(authors).replace(/S\.\s?Prasad/g, "<strong>$&</strong>");
  }

  function item(r) {
    var links = [];
    if (r.url && r.url.indexOf("arxiv.org") === -1) {
      links.push('<a href="' + esc(r.url) + '">' + (r.doi ? "DOI" : "Link") + "</a>");
    }
    if (r.arxiv) {
      links.push('<a href="https://arxiv.org/abs/' + esc(r.arxiv) + '">arXiv:' + esc(r.arxiv) + "</a>");
    }
    var venue = r.venue ? esc(r.venue) : r.section === "submitted" ? "Submitted" : "";
    return (
      "<li>" +
      '<span class="pub-title">' + safeTitle(r.title) + "</span>" +
      (r.review ? ' <span class="tag">Review</span>' : "") +
      '<span class="pub-authors">' + boldMe(r.authors) + "</span>" +
      '<span class="pub-venue">' + venue + (venue && links.length ? " · " : "") +
      '<span class="pub-links">' + links.join("") + "</span></span>" +
      "</li>"
    );
  }

  function render() {
    var onlyFirst = firstOnly && firstOnly.checked;
    var html = "";
    var total = 0;
    groups.forEach(function (g) {
      var recs = data.records
        .map(function (r, i) { return { r: r, i: i }; })
        .filter(function (x) { return x.r.section === g.key && (!onlyFirst || x.r.first_author); })
        .sort(function (a, b) {
          var byYear = (b.r.year || 0) - (a.r.year || 0);
          if (byYear) { return byYear; }
          if (g.key === "submitted" && a.r.arxiv && b.r.arxiv) { return b.r.arxiv.localeCompare(a.r.arxiv); }
          return a.i - b.i;
        })
        .map(function (x) { return x.r; });
      if (!recs.length) {
        return;
      }
      total += recs.length;
      html += "<h2>" + g.title + ' <span class="muted small">(' + recs.length + ")</span></h2>";
      html += '<ol class="pubs" reversed>' + recs.map(item).join("") + "</ol>";
    });
    root.innerHTML = html;
    if (countEl) {
      countEl.textContent = total + " records";
    }
  }

  if (firstOnly) {
    firstOnly.addEventListener("change", render);
  }
  render();
})();
