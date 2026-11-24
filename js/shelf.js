// Shared by main.js (Discover) and saved.js (My Shelf):
// saved-shelf storage, book-card markup, and screen-reader announcements.

const STORAGE_KEY = "shelfmark:saved";
const COVER_COLORS = [
  "umber",
  "rose",
  "cream",
  "forest",
  "navy",
  "burgundy",
  "ochre",
  "slate",
];

/* ---------------------------------------------------------
   Open Library data
--------------------------------------------------------- */

export function coverUrl(coverId, size = "M") {
  // default=false makes Open Library answer 404 (instead of a 1px
  // placeholder) when there is no image, so our CSS fallback can take over.
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg?default=false`;
}

// Turn one raw API doc into the small object the app uses.
// Returns null when the doc is unusable (no title).
export function normalizeDoc(doc) {
  if (!doc || typeof doc.title !== "string" || !doc.title.trim()) return null;
  const title = doc.title.trim();
  const year = Number.isInteger(doc.first_publish_year)
    ? doc.first_publish_year
    : null;
  return {
    key:
      typeof doc.key === "string" && doc.key
        ? doc.key
        : `${title}|${year ?? ""}`,
    title,
    authors: Array.isArray(doc.author_name)
      ? doc.author_name.filter(Boolean)
      : [],
    year,
    coverId: Number.isInteger(doc.cover_i) ? doc.cover_i : null,
    subject:
      Array.isArray(doc.subject) && doc.subject[0]
        ? String(doc.subject[0])
        : "",
    editions: Number.isInteger(doc.edition_count) ? doc.edition_count : 0,
  };
}

/* ---------------------------------------------------------
   Saved shelf (localStorage)
--------------------------------------------------------- */

export function getSavedBooks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    return parsed.filter((b) => {
      const valid =
        b && typeof b.key === "string" && typeof b.title === "string";
      if (!valid || seen.has(b.key)) return false; // also drops duplicates
      seen.add(b.key);
      return true;
    });
  } catch {
    return []; // corrupted JSON or storage blocked
  }
}

function writeSavedBooks(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false; // private mode, quota, or blocked storage
  }
}

export function isSaved(key) {
  return getSavedBooks().some((b) => b.key === key);
}

// Adds the book if it is not saved, removes it if it is.
// Returns { ok, saved } where saved is the state AFTER the change.
export function toggleSaved(book) {
  const list = getSavedBooks();
  const alreadySaved = list.some((b) => b.key === book.key);
  const next = alreadySaved
    ? list.filter((b) => b.key !== book.key)
    : [...list, book];
  return { ok: writeSavedBooks(next), saved: alreadySaved ? false : true };
}

export function updateSavedCount() {
  const el = document.querySelector("#saved-count");
  if (el) el.textContent = String(getSavedBooks().length);
}

/* ---------------------------------------------------------
   Announcements for screen readers
--------------------------------------------------------- */

let liveRegion = null;

function ensureLiveRegion() {
  if (liveRegion) return;
  liveRegion = document.createElement("div");
  liveRegion.setAttribute("role", "status");
  liveRegion.setAttribute("aria-live", "polite");
  Object.assign(liveRegion.style, {
    position: "absolute",
    width: "1px",
    height: "1px",
    margin: "-1px",
    padding: "0",
    border: "0",
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
  });
  document.body.append(liveRegion);
}

export function announce(message) {
  ensureLiveRegion();
  liveRegion.textContent = "";
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 50);
}

// Call once per page: sets the nav count and keeps it in sync across tabs.
export function initShelf() {
  ensureLiveRegion();
  updateSavedCount();
  initNavigation();
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY || e.key === null) updateSavedCount();
  });
}

function initNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".masthead nav");
  if (!toggle || !nav || toggle.dataset.ready) return;
  toggle.dataset.ready = "true";
  const close = () => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  };
  toggle.addEventListener("click", () => {
    const open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
}

/* ---------------------------------------------------------
   Card markup
   article > .cover + .book-info  (matches styles.css)
--------------------------------------------------------- */

function el(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function hashString(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

function formatAuthors(authors) {
  if (authors.length === 0) return "Unknown author";
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
  return `${authors[0]} et al.`;
}

// onChange(savedNow, article, book) runs after a successful save/remove.
export function createBookCard(book, { onChange } = {}) {
  const article = el("article");
  article.dataset.key = book.key;
  article.classList.add("book-card");
  article.tabIndex = 0;
  article.setAttribute("role", "button");
  article.setAttribute("aria-label", `View details for ${book.title}`);

  // --- Cover (decorative: the text below carries the information) ---
  const kind = (
    book.subject ? truncate(book.subject, 22) : "Book"
  ).toUpperCase();
  const color = COVER_COLORS[hashString(book.key) % COVER_COLORS.length];
  const cover = el("div", `cover cover-${color}`);
  cover.setAttribute("aria-hidden", "true");
  cover.append(el("span", "", kind), el("b", "", truncate(book.title, 46)));

  if (book.coverId) {
    const img = document.createElement("img");
    img.src = coverUrl(book.coverId);
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    // On failure, removing the image reveals the typographic CSS fallback.
    img.addEventListener("error", () => img.remove(), { once: true });
    img.addEventListener(
      "load",
      () => {
        if (img.naturalWidth <= 1) img.remove();
      },
      { once: true },
    );
    cover.append(img);
  }

  // --- Info + save button ---
  const info = el("div", "book-info");
  const meta = [kind, book.year].filter(Boolean).join(" · ");
  info.append(
    el("p", "", meta),
    el("h2", "", book.title),
    el("p", "author", formatAuthors(book.authors)),
  );

  const button = el("button", "save-button");
  button.type = "button";

  const sync = () => {
    const saved = isSaved(book.key);
    button.classList.toggle("saved", saved);
    button.textContent = saved ? "Remove from shelf" : "Save to shelf";
    button.setAttribute(
      "aria-label",
      saved ? `Remove ${book.title} from shelf` : `Save ${book.title} to shelf`,
    );
  };

  button.addEventListener("click", () => {
    const result = toggleSaved(book);
    if (!result.ok) {
      announce("Could not update your shelf. Browser storage is unavailable.");
      button.textContent = "Storage unavailable";
      setTimeout(sync, 2000);
      return;
    }
    sync();
    updateSavedCount();
    announce(
      result.saved
        ? `${book.title} saved to your shelf.`
        : `${book.title} removed from your shelf.`,
    );
    onChange?.(result.saved, article, book);
  });

  sync();
  info.append(button);
  article.append(cover, info);
  article.addEventListener("click", (event) => {
    if (event.target.closest("button, a")) return;
    openBookDetails(book);
  });
  article.addEventListener("keydown", (event) => {
    if (event.target !== article || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    openBookDetails(book);
  });
  return article;
}

/* ---------------------------------------------------------
   Book details
--------------------------------------------------------- */

let detailsDialog = null;

function cleanDescription(value) {
  if (typeof value === "string") return value;
  if (value && typeof value.value === "string") return value.value;
  return "A fuller description is not yet available for this edition.";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
}

function closeDetails() {
  if (!detailsDialog) return;
  detailsDialog.close();
}

function ensureDetailsDialog() {
  if (detailsDialog) return detailsDialog;
  detailsDialog = document.createElement("dialog");
  detailsDialog.className = "book-dialog";
  detailsDialog.innerHTML = `
    <button class="dialog-close" type="button" aria-label="Close book details">×</button>
    <div class="dialog-body"></div>`;
  detailsDialog.querySelector(".dialog-close").addEventListener("click", closeDetails);
  detailsDialog.addEventListener("click", (event) => {
    if (event.target === detailsDialog) closeDetails();
  });
  document.body.append(detailsDialog);
  return detailsDialog;
}

async function findWork(book) {
  if (book.key?.startsWith("/works/")) return book.key;
  const query = book.searchTitle || book.title;
  const response = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=1&fields=key,title,author_name,first_publish_year,cover_i,subject`);
  if (!response.ok) throw new HttpError(response.status);
  return response.json();
}

function detailContent(book, work = {}) {
  const authors = Array.isArray(work.authorNames) && work.authorNames.length
    ? work.authorNames
    : Array.isArray(work.authors) && work.authors.length
    ? work.authors.map((author) => author.name).filter(Boolean)
    : book.authors;
  const coverId = work.covers?.[0] || book.coverId;
  const source = book.sourceUrl
    ? `<a class="source-link" href="${book.sourceUrl}" target="_blank" rel="noopener">${book.sourceLabel || "Open source"} ↗</a>`
    : "";
  return `
    <div class="dialog-cover ${coverId ? "has-cover" : ""}">${coverId ? `<img src="${coverUrl(coverId, "L")}" alt="Cover of ${escapeHtml(book.title)}">` : `<span>${escapeHtml(book.title)}</span>`}</div>
    <div class="dialog-copy">
      <p class="dialog-kicker">${book.sourceUrl ? "AVAILABLE IN THE READING ROOM" : "OPEN LIBRARY RECORD"}</p>
      <h2>${escapeHtml(book.title)}</h2>
      <p class="dialog-author">${escapeHtml(formatAuthors(authors || []))}${book.year ? ` · First published ${book.year}` : ""}</p>
      <p class="dialog-description">${escapeHtml(cleanDescription(work.description))}</p>
      <div class="dialog-actions"><button class="save-button dialog-save" type="button"></button>${source}</div>
    </div>`;
}

export async function openBookDetails(book) {
  const dialog = ensureDetailsDialog();
  const body = dialog.querySelector(".dialog-body");
  body.innerHTML = `<p class="dialog-loading">Opening the catalogue record…</p>`;
  if (!dialog.open) dialog.showModal();

  let record = {};
  try {
    let workKey = book.key?.startsWith("/works/") ? book.key : null;
    if (!workKey) {
      const search = await findWork(book);
      const match = search.docs?.[0];
      if (match) {
        workKey = match.key;
        record = { covers: match.cover_i ? [match.cover_i] : [], authorNames: match.author_name || [] };
      }
    }
    if (workKey) {
      const response = await fetch(`https://openlibrary.org${workKey}.json`);
      if (response.ok) record = { ...record, ...(await response.json()) };
    }
  } catch {
    // A graceful local record is still more useful than a failed modal.
  }

  body.innerHTML = detailContent(book, record);
  const button = body.querySelector(".dialog-save");
  const sync = () => {
    const saved = isSaved(book.key);
    button.textContent = saved ? "Remove from shelf" : "Save to shelf";
    button.classList.toggle("saved", saved);
  };
  button.addEventListener("click", () => {
    const result = toggleSaved(book);
    if (result.ok) {
      sync();
      updateSavedCount();
      announce(result.saved ? `${book.title} saved to your shelf.` : `${book.title} removed from your shelf.`);
    }
  });
  sync();
}

class HttpError extends Error {}

export function createEmptyCard(title, text, link) {
  const card = el("article", "empty-card");
  card.append(el("h2", "", title), el("p", "", text));
  if (link) {
    const a = el("a", "", link.text);
    a.href = link.href;
    card.append(a);
  }
  return card;
}
