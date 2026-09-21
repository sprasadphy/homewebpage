/*
  Publication list renderer.
  Data source: scripts/publications_data.js
*/

(function () {
  "use strict";

  var pubList = document.getElementById("pub-list");
  var statusEl = document.getElementById("pub-status");
  var countEl = document.getElementById("pub-count");
  var filtersForm = document.getElementById("pub-filters");
  var filterTypeEl = document.getElementById("filter-type");
  var filterAuthorsEl = document.getElementById("filter-authors");
  var filterYearFromEl = document.getElementById("filter-year-from");
  var filterYearToEl = document.getElementById("filter-year-to");
  var filterRefereedEl = document.getElementById("filter-refereed");
  var filterFirstAuthorEl = document.getElementById("filter-first-author");
  var filterResetEl = document.getElementById("filter-reset");
  var activeFiltersEl = document.getElementById("active-filters");

  var allRecords = [];

  if (
    !pubList ||
    !statusEl ||
    !countEl ||
    !filtersForm ||
    !filterTypeEl ||
    !filterAuthorsEl ||
    !filterYearFromEl ||
    !filterYearToEl ||
    !filterRefereedEl ||
    !filterFirstAuthorEl ||
    !filterResetEl ||
    !activeFiltersEl
  ) {
    return;
  }

  function createElement(tagName, className, textContent) {
    var node = document.createElement(tagName);
    if (className) {
      node.className = className;
    }
    if (typeof textContent === "string") {
      node.textContent = textContent;
    }
    return node;
  }

  function clearNode(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function getTitle(metadata) {
    var titles = metadata.titles || [];
    var title = titles[0] && titles[0].title ? normalizeMathText(titles[0].title) : "Untitled";
    var citation = extractCitationFromRaw(metadata);
    if ((!citation || !citation.title) && title && title !== "Untitled") {
      citation = parseCitationLikeText(title);
    }
    if (citation && looksLikeAuthorBlob(title) && citation.title) {
      return citation.title;
    }
    return title;
  }

  function decodeLatexEscapes(value) {
    var text = String(value || "");

    function replaceAccent(regex, map) {
      text = text.replace(regex, function (_, letter) {
        var lower = letter.toLowerCase();
        var mapped = map[lower];
        if (!mapped) {
          return letter;
        }
        return letter === lower ? mapped : mapped.toUpperCase();
      });
    }

    replaceAccent(/\\\"([A-Za-z])/g, { a: "ä", e: "ë", i: "ï", o: "ö", u: "ü", y: "ÿ" });
    replaceAccent(/\\'([A-Za-z])/g, { a: "á", e: "é", i: "í", o: "ó", u: "ú", y: "ý", c: "ć", n: "ń" });
    replaceAccent(/\\`([A-Za-z])/g, { a: "à", e: "è", i: "ì", o: "ò", u: "ù" });
    replaceAccent(/\\\^([A-Za-z])/g, { a: "â", e: "ê", i: "î", o: "ô", u: "û" });
    replaceAccent(/\\~([A-Za-z])/g, { a: "ã", n: "ñ", o: "õ" });

    text = text.replace(/\\c\{?([Cc])\}?/g, function (_, letter) {
      return letter === "C" ? "Ç" : "ç";
    });

    text = text.replace(/\\"/g, '"');
    text = text.replace(/\\'/g, "'");
    text = text.replace(/\\,/g, ",");
    text = text.replace(/\\-/g, "-");
    return text;
  }

  function normalizeMathText(value) {
    var text = decodeLatexEscapes(value);
    text = text.replace(/\\sqrtsnn\b/g, "\\sqrt{s_{\\mathrm{NN}}}");
    text = text.replace(/\\sqrts\b/g, "\\sqrt{s}");
    text = text.replace(/\\rm\s+([A-Za-z]+)/g, "\\mathrm{$1}");
    text = text.replace(/\\textrm\s*\{?\s*([A-Za-z]+)\s*\}?/g, "\\mathrm{$1}");
    text = text.replace(/\\sqrt\{\s*s_\{\s*\\rm\s+NN\s*\}\s*\}/g, "\\sqrt{s_{\\mathrm{NN}}}");
    // Normalize isotope notation: ^16O -> ^{16}O, ^20Ne -> ^{20}Ne, ^238U -> ^{238}U, ^129Xe -> ^{129}Xe, etc.
    // Handles any element symbol (single or two-letter: C, O, U, Ne, Xe, Pb, Ca, etc.)
    text = text.replace(/\^\s*\{?\s*(\d{1,3})\s*\}?\s*([A-Z][a-z]?)/g, "^{$1}$2");
    return text;
  }

  function getYear(metadata) {
    var dateString = metadata.earliest_date || metadata.preprint_date || "";
    if (!dateString) {
      return "n.d.";
    }
    return String(dateString).slice(0, 4);
  }

  function getYearNumber(metadata) {
    var year = Number.parseInt(getYear(metadata), 10);
    return Number.isNaN(year) ? null : year;
  }

  function getVenue(metadata) {
    var publicationInfo = metadata.publication_info || [];
    if (!publicationInfo[0]) {
      return "Publication";
    }
    var venue = sanitizeDisplayText(
      publicationInfo[0].journal_title ||
      publicationInfo[0].conference_title ||
      publicationInfo[0].book_title ||
      "Publication"
    );
    return venue || "Publication";
  }

  function sanitizeDisplayText(value) {
    var text = decodeLatexEscapes(value);
    text = text.replace(/\\textbf\s*\{([^}]*)\}/g, "$1");
    text = text.replace(/\\textbf\s*/g, "");
    text = text.replace(/\\bf\s*/g, "");
    text = text.replace(/[{}]/g, "");
    text = text.replace(/~/g, " ");
    text = text.replace(/^[-,:;\s]+/, "");
    text = text.replace(/\s+/g, " ").trim();
    return text;
  }

  function getDocTypes(metadata) {
    var docTypes = metadata.document_type || [];
    return docTypes.map(function (entry) {
      return String(entry).toLowerCase();
    });
  }

  function getRecordCategory(metadata) {
    var docTypes = getDocTypes(metadata);
    if (docTypes.indexOf("article") !== -1) {
      return "article";
    }
    if (docTypes.indexOf("conference paper") !== -1 || docTypes.indexOf("proceedings") !== -1) {
      return "proceedings";
    }
    return "other";
  }

  function getAuthorCount(metadata) {
    if (typeof metadata.author_count === "number") {
      return metadata.author_count;
    }
    var authors = metadata.authors || [];
    return authors.length;
  }

  function formatAuthors(metadata) {
    var authors = metadata.authors || [];
    var names = authors.map(function (author) {
      return sanitizeDisplayText(author.full_name || "Unknown");
    }).filter(function (name) {
      return name && !looksLikeTitleOrVenueFragment(name);
    });

    if (names.length === 0 || names.some(looksLikeAuthorBlob)) {
      var citation = extractCitationFromRaw(metadata);
      if ((!citation || !citation.authors.length) && metadata.titles && metadata.titles[0] && metadata.titles[0].title) {
        citation = parseCitationLikeText(metadata.titles[0].title);
      }
      if (citation && citation.authors.length) {
        names = citation.authors;
      }
    }

    if (names.length === 0) {
      return "Unknown authors";
    }

    var authorCount = getAuthorCount(metadata);
    if (authorCount === 1) {
      return names[0];
    }
    if (authorCount <= names.length) {
      return names.join(", ");
    }
    return names.join(", ") + ", et al.";
  }

  function isRefereed(metadata) {
    return metadata.refereed === true;
  }

  function looksLikeTitleOrVenueFragment(text) {
    var value = String(text || "").toLowerCase();
    return (
      value.indexOf("\"") !== -1 ||
      value.indexOf("phys.") !== -1 ||
      value.indexOf("arxiv") !== -1 ||
      value.indexOf("springer") !== -1 ||
      value.indexOf("symp.") !== -1 ||
      value.indexOf("proc.") !== -1 ||
      value.indexOf("collider") !== -1
    );
  }

  function looksLikeAuthorBlob(text) {
    var value = String(text || "");
    var lower = value.toLowerCase();
    if (lower.indexOf("\"") !== -1) {
      return true;
    }
    if (lower.indexOf(" and ") !== -1 && value.split(",").length >= 3) {
      return true;
    }
    return /(^|,\s*)([A-Z]\.)\s*[A-Za-z-]+/.test(value) && value.split(",").length >= 3;
  }

  function extractCitationFromRaw(metadata) {
    var raw = metadata && metadata.raw_text ? String(metadata.raw_text) : "";
    if (!raw) {
      return null;
    }

    var parsed = parseCitationLikeText(raw);
    if (parsed) {
      return parsed;
    }

    var cleaned = sanitizeDisplayText(raw);
    var quoteMatch = cleaned.match(/"([^"]{6,})"/);
    if (!quoteMatch) {
      return null;
    }

    var title = normalizeMathText(quoteMatch[1].trim());
    var beforeTitle = cleaned.slice(0, quoteMatch.index).replace(/[,\s]+$/, "");
    if (!beforeTitle) {
      return { title: title, authors: [] };
    }

    var normalizedAuthors = beforeTitle
      .replace(/\s+and\s+/gi, ", ")
      .split(",")
      .map(function (piece) {
        return sanitizeDisplayText(piece).replace(/^\.+|\.+$/g, "").trim();
      })
      .filter(function (piece) {
        return piece && !looksLikeTitleOrVenueFragment(piece);
      });

    return {
      title: title,
      authors: normalizedAuthors
    };
  }

  function parseCitationLikeText(value) {
    var cleaned = sanitizeDisplayText(value);
    var firstQuote = cleaned.indexOf('"');
    if (firstQuote < 0) {
      return null;
    }

    var beforeTitle = cleaned.slice(0, firstQuote).replace(/[\s,]+$/, "");
    var rest = cleaned.slice(firstQuote + 1);

    var endQuote = rest.indexOf('"');
    var titlePart = "";
    if (endQuote >= 0) {
      titlePart = rest.slice(0, endQuote);
    } else {
      var stopMatch = rest.match(/,\s*(Phys\.|Sci\.|Eur\.|DAE|Springer|PoS|arXiv|J\.|Int\.|Nucl\.)/);
      if (stopMatch) {
        titlePart = rest.slice(0, stopMatch.index);
      } else {
        titlePart = rest;
      }
    }

    titlePart = normalizeMathText(titlePart.replace(/[\s,]+$/, "").trim());
    if (!titlePart) {
      return null;
    }

    var authors = beforeTitle
      .replace(/\s+and\s+/gi, ", ")
      .split(",")
      .map(function (piece) {
        return sanitizeDisplayText(piece).replace(/^\.+|\.+$/g, "").trim();
      })
      .filter(function (piece) {
        return piece && !looksLikeTitleOrVenueFragment(piece);
      });

    return {
      title: titlePart,
      authors: authors
    };
  }

  function isTargetAuthor(author) {
    if (!author) {
      return false;
    }
    var name = (author.full_name || "").toLowerCase();
    return name.indexOf("suraj") !== -1 && name.indexOf("prasad") !== -1;
  }

  function isFirstAuthorBySuraj(metadata) {
    var authors = metadata.authors || [];
    if (authors.length === 0) {
      return false;
    }
    return isTargetAuthor(authors[0]);
  }

  function getDoi(metadata) {
    var dois = metadata.dois || [];
    return dois[0] && dois[0].value ? dois[0].value : "";
  }

  function getArxivId(metadata) {
    var arxiv = metadata.arxiv_eprints || [];
    return arxiv[0] && arxiv[0].value ? arxiv[0].value : "";
  }

  function venueContainsYear(venue, year) {
    if (!venue || !year || year === "n.d.") {
      return false;
    }
    var yearPattern = new RegExp("(?:^|[^0-9])" + year + "(?:[^0-9]|$)");
    return yearPattern.test(venue);
  }

  function getRecordUrl(record) {
    if (record.links && record.links.self) {
      return record.links.self;
    }
    return "https://inspirehep.net/authors/1945401";
  }

  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.classList.toggle("is-error", Boolean(isError));
  }

  function createChip(text, filterKey) {
    var chip = createElement("button", "filter-chip");
    chip.type = "button";
    chip.setAttribute("data-filter-key", filterKey);
    chip.setAttribute("aria-label", "Remove filter: " + text);

    chip.appendChild(createElement("span", "filter-chip-text", text));
    chip.appendChild(createElement("span", "filter-chip-close", "\u00D7"));
    return chip;
  }

  function renderActiveFilterChips(state) {
    clearNode(activeFiltersEl);

    var chips = [];
    if (state.typeFilter === "article") {
      chips.push(createChip("Type: Articles", "type"));
    } else if (state.typeFilter === "proceedings") {
      chips.push(createChip("Type: Proceedings", "type"));
    }

    if (state.authorFilter === "single") {
      chips.push(createChip("Authorship: Single author", "authors"));
    } else if (state.authorFilter === "ten_or_less") {
      chips.push(createChip("Authorship: <=10 authors", "authors"));
    }

    if (state.hasYearFrom) {
      chips.push(createChip("Year from: " + state.yearFrom, "year_from"));
    }
    if (state.hasYearTo) {
      chips.push(createChip("Year to: " + state.yearTo, "year_to"));
    }
    if (state.refereedOnly) {
      chips.push(createChip("Refereed only", "refereed"));
    }
    if (state.firstAuthorOnly) {
      chips.push(createChip("First author: Suraj Prasad", "first_author"));
    }

    if (chips.length === 0) {
      activeFiltersEl.textContent = "Active filters: none";
      return;
    }

    activeFiltersEl.appendChild(createElement("span", "active-filters-label", "Active filters:"));
    chips.forEach(function (chip) {
      activeFiltersEl.appendChild(chip);
    });
  }

  function renderRecords(records) {
    clearNode(pubList);

    if (!records.length) {
      pubList.appendChild(createElement("li", "pub-item", "No records match the current filters."));
      return;
    }

    records.forEach(function (record, index) {
      var metadata = record.metadata || {};
      var title = getTitle(metadata);
      var authors = formatAuthors(metadata);
      var venue = getVenue(metadata);
      var year = getYear(metadata);
      var category = getRecordCategory(metadata);
      var doi = getDoi(metadata);
      var arxivId = getArxivId(metadata);
      var recordUrl = getRecordUrl(record);

      var item = createElement("li", "pub-item");
      item.style.setProperty("--pub-index", index);
      item.appendChild(createElement("strong", "pub-title", title));
      item.appendChild(document.createElement("br"));
      item.appendChild(createElement("span", "pub-authors", authors));
      item.appendChild(document.createElement("br"));
      var detailsText = venue;
      if (year !== "n.d." && !venueContainsYear(venue, year)) {
        detailsText += " (" + year + ")";
      }
      if (category !== "other") {
        detailsText += " | " + category;
      }
      if (doi) {
        var detailsLink = createElement("a", "pub-meta pub-meta-link", detailsText);
        detailsLink.href = "https://doi.org/" + doi;
        detailsLink.target = "_blank";
        detailsLink.rel = "noopener noreferrer";
        item.appendChild(detailsLink);
      } else {
        item.appendChild(createElement("span", "pub-meta", detailsText));
      }

      var linksWrap = createElement("div", "pub-links");
      var sourceLink = createElement("a", "pub-link", "Source");
      sourceLink.href = recordUrl;
      sourceLink.target = "_blank";
      sourceLink.rel = "noopener noreferrer";
      linksWrap.appendChild(sourceLink);

      if (arxivId) {
        var arxivLink = createElement("a", "pub-link", "arXiv");
        arxivLink.href = "https://arxiv.org/abs/" + arxivId;
        arxivLink.target = "_blank";
        arxivLink.rel = "noopener noreferrer";
        linksWrap.appendChild(arxivLink);
      }

      var cites = metadata.citation_count;
      if (typeof cites === "number" && cites > 0) {
        var indep = metadata.citation_count_without_self_citations;
        var citeLabel = cites + " citation" + (cites === 1 ? "" : "s");
        if (typeof indep === "number" && indep > 0 && indep !== cites) {
          citeLabel += " (" + indep + " indep.)";
        }
        var citeBadge = createElement("span", "pub-cite-badge", citeLabel);
        linksWrap.appendChild(citeBadge);
      }

      item.appendChild(linksWrap);
      pubList.appendChild(item);
    });

    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      window.MathJax.typesetPromise([pubList]).catch(function (error) {
        console.error(error);
      });
    }
  }

  function applyFiltersAndRender() {
    var typeFilter = filterTypeEl.value;
    var authorFilter = filterAuthorsEl.value;
    var yearFrom = Number.parseInt(filterYearFromEl.value, 10);
    var yearTo = Number.parseInt(filterYearToEl.value, 10);
    var hasYearFrom = !Number.isNaN(yearFrom);
    var hasYearTo = !Number.isNaN(yearTo);
    var refereedOnly = filterRefereedEl.checked;
    var firstAuthorOnly = filterFirstAuthorEl.checked;

    var state = {
      typeFilter: typeFilter,
      authorFilter: authorFilter,
      yearFrom: yearFrom,
      yearTo: yearTo,
      hasYearFrom: hasYearFrom,
      hasYearTo: hasYearTo,
      refereedOnly: refereedOnly,
      firstAuthorOnly: firstAuthorOnly
    };

    renderActiveFilterChips(state);

    if (hasYearFrom && hasYearTo && yearFrom > yearTo) {
      setStatus("Invalid year range: 'Year From' must be less than or equal to 'Year To'.", true);
      countEl.textContent = "";
      renderRecords([]);
      return;
    }

    var filtered = allRecords.filter(function (record) {
      var metadata = record.metadata || {};
      var authorCount = getAuthorCount(metadata);
      var year = getYearNumber(metadata);

      if (typeFilter !== "all" && getRecordCategory(metadata) !== typeFilter) {
        return false;
      }
      if (authorFilter === "single" && authorCount !== 1) {
        return false;
      }
      if (authorFilter === "ten_or_less" && (authorCount <= 0 || authorCount > 10)) {
        return false;
      }
      if (hasYearFrom && (!year || year < yearFrom)) {
        return false;
      }
      if (hasYearTo && (!year || year > yearTo)) {
        return false;
      }
      if (refereedOnly && !isRefereed(metadata)) {
        return false;
      }
      if (firstAuthorOnly && !isFirstAuthorBySuraj(metadata)) {
        return false;
      }
      return true;
    });

    setStatus("", false);
    countEl.textContent = "Showing " + filtered.length + " of " + allRecords.length + " records.";
    renderRecords(filtered);
  }

  function resetFilters() {
    filterTypeEl.value = "all";
    filterAuthorsEl.value = "ten_or_less";
    filterYearFromEl.value = "";
    filterYearToEl.value = "";
    filterRefereedEl.checked = false;
    filterFirstAuthorEl.checked = false;
    applyFiltersAndRender();
  }

  filtersForm.addEventListener("change", applyFiltersAndRender);
  filtersForm.addEventListener("input", applyFiltersAndRender);

  filterResetEl.addEventListener("click", resetFilters);

  activeFiltersEl.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    var chip = target.closest(".filter-chip");
    if (!chip) {
      return;
    }

    var filterKey = chip.getAttribute("data-filter-key");
    chip.classList.add("is-removing");

    window.setTimeout(function () {
      if (filterKey === "type") {
        filterTypeEl.value = "all";
      } else if (filterKey === "authors") {
        filterAuthorsEl.value = "any";
      } else if (filterKey === "year_from") {
        filterYearFromEl.value = "";
      } else if (filterKey === "year_to") {
        filterYearToEl.value = "";
      } else if (filterKey === "refereed") {
        filterRefereedEl.checked = false;
      } else if (filterKey === "first_author") {
        filterFirstAuthorEl.checked = false;
      }
      applyFiltersAndRender();
    }, 140);
  });

  if (window.PUBLICATIONS_TEX_DATA && Array.isArray(window.PUBLICATIONS_TEX_DATA.records)) {
    allRecords = window.PUBLICATIONS_TEX_DATA.records;
  }

  if (!allRecords.length) {
    setStatus("No local publication records found.", true);
    countEl.textContent = "";
    renderRecords([]);
    return;
  }

  applyFiltersAndRender();
})();
