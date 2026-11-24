import {
  getSavedBooks,
  createBookCard,
  createEmptyCard,
  initShelf,
} from "./shelf.js";

const list = document.querySelector("#saved-list");

function emptyCard() {
  return createEmptyCard(
    "Your shelf is waiting.",
    "Books you save on Discover will gather here.",
    { href: "index.html", text: "Browse the stacks →" },
  );
}

function render() {
  list.replaceChildren();
  const books = getSavedBooks();

  if (books.length === 0) {
    list.append(emptyCard());
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const book of books)
    fragment.append(createBookCard(book, { onChange: handleChange }));
  list.append(fragment);
}

// On this page, clicking the button on a saved book removes it from the shelf.
function handleChange(savedNow, article) {
  if (savedNow) return;

  const next = article.nextElementSibling ?? article.previousElementSibling;
  article.remove();

  if (!list.querySelector("article:not(.empty-card)")) {
    const card = emptyCard();
    list.append(card);
    card.querySelector("a")?.focus();
  } else {
    next?.querySelector("button")?.focus(); // keep keyboard focus on the shelf
  }
}

if (list) {
  initShelf();
  render();
  // another tab changed the shelf
  window.addEventListener("storage", render);
}
