import {
  normalizeDoc,
  createBookCard,
  createEmptyCard,
  initShelf,
} from "./shelf.js";

/* ---------------------------------------------------------
   Elements
--------------------------------------------------------- */
const form = document.querySelector("#book-search");
const input = document.querySelector("#book-input");
const searchButton = document.querySelector("#search-button");
const sortSelect = document.querySelector("#sort-select");
const grid = document.querySelector("#book-grid");
const loadingState = document.querySelector("#loading-state");
const errorState = document.querySelector("#error-state");

if (
  ![
    form,
    input,
    searchButton,
    sortSelect,
    grid,
    loadingState,
    errorState,
  ].every(Boolean)
) {
  throw new Error("Shelfmark: a required element is missing from index.html.");
}

/* ---------------------------------------------------------
   Config + state
--------------------------------------------------------- */
const API_URL = "https://openlibrary.org/search.json";
const FIELDS =
  "key,title,author_name,first_publish_year,cover_i,edition_count,subject";
const LIMIT = 20;
const DEFAULT_QUERY = "essays"; // fills the shelf on first load; set to "" to keep the static sample books

let results = []; // normalized books in the API's (relevance) order. Never sorted in place.
let lastQuery = "";
let hasSearched = false;
let activeController = null;
let latestRequest = 0;

class HttpError extends Error {
  constructor(status) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

/* ---------------------------------------------------------
   UI state helpers
--------------------------------------------------------- */
function showError(message) {
  errorState.hidden = false; // reveal first so the alert is announced
  errorState.textContent = message;
}

function clearError() {
  errorState.hidden = true;
  errorState.textContent = "";
}

function setLoading(isLoading) {
  loadingState.hidden = !isLoading;
  grid.setAttribute("aria-busy", String(isLoading));
  searchButton.textContent = isLoading ? "Searching…" : "Search";
}

/* ---------------------------------------------------------
   Sorting (always on a copy)
--------------------------------------------------------- */
function sortedBooks(list, mode) {
  const copy = [...list];
  if (mode === "title") {
    return copy.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, {
        sensitivity: "base",
        numeric: true,
      }),
    );
  }
  if (mode === "year") {
    // newest first; books with no year sink to the bottom; ties keep relevance order
    return copy.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  }
  return copy; // relevance = API order
}

/* ---------------------------------------------------------
   Rendering
--------------------------------------------------------- */
function render() {
  grid.replaceChildren();

  const books = sortedBooks(results, sortSelect.value);
  if (books.length === 0) {
    grid.append(
      createEmptyCard(
        "Nothing on the shelves.",
        `No books found for “${lastQuery}”. Try a different title, author, or subject.`,
      ),
    );
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const book of books) fragment.append(createBookCard(book));
  grid.append(fragment);
}

/* ---------------------------------------------------------
   Search
--------------------------------------------------------- */
async function search(query) {
  activeController?.abort(); // cancel the previous request
  const controller = new AbortController();
  activeController = controller;
  const requestId = ++latestRequest;

  clearError();
  setLoading(true);

  try {
    const url = new URL(API_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(LIMIT));
    url.searchParams.set("fields", FIELDS);

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new HttpError(response.status);

    const data = await response.json();
    if (requestId !== latestRequest) return; // a newer search took over

    const docs = Array.isArray(data?.docs) ? data.docs : [];

    // normalize, drop unusable docs, and drop duplicate works by key
    const byKey = new Map();
    for (const doc of docs) {
      const book = normalizeDoc(doc);
      if (book && !byKey.has(book.key)) byKey.set(book.key, book);
    }

    results = [...byKey.values()];
    lastQuery = query;
    hasSearched = true;
    render(); // shows the empty card when results is empty
  } catch (error) {
    if (error.name === "AbortError" || requestId !== latestRequest) return;

    if (error instanceof HttpError) {
      showError(
        `Open Library returned an error (${error.status}). Please try again in a moment.`,
      );
    } else if (error instanceof SyntaxError) {
      showError(
        "Open Library sent a response we couldn't read. Please try again.",
      );
    } else if (error instanceof TypeError) {
      showError(
        "Couldn't reach Open Library. Check your connection and try again.",
      );
    } else {
      showError("Something went wrong while searching. Please try again.");
    }
  } finally {
    if (requestId === latestRequest) setLoading(false);
  }
}

/* ---------------------------------------------------------
   Events
--------------------------------------------------------- */
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (!query) {
    showError("Enter a title, author, or subject to search.");
    input.focus();
    return;
  }
  search(query);
});

sortSelect.addEventListener("change", () => {
  if (hasSearched) render();
});

// Another tab saved or removed a book: refresh button states.
window.addEventListener("storage", () => {
  if (hasSearched) render();
});

/* ---------------------------------------------------------
   Start
--------------------------------------------------------- */
initShelf();
if (DEFAULT_QUERY) search(DEFAULT_QUERY);
