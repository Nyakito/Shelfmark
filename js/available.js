import { createBookCard, initShelf } from "./shelf.js";

const titles = [
  "Between the World and Me", "Bobok", "Coraline", "Crime and Punishment",
  "Dark Matter", "Eloquent JavaScript", "Head First JavaScript", "Laura's Poems",
  "Love in the Time of Cholera", "Love Poems", "Metamorphoses", "Owl Moon",
  "Perfect Your Chess", "Poems of Black Africa", "Poetry", "The Brothers Karamazov",
  "The Essential Rumi", "The Picture of Dorian Gray", "The Art of Seduction",
  "The Coloring Crook", "The Girl", "The Key to the Self", "White Nights",
  "Tomorrow I Become a Woman", "unplugged alpha", "War and Peace"
];
// IDs are taken from the public folder, so each catalogue record opens its own PDF.
const driveIds = [
  "1Ngq1edDd3vkTSoWxrxqwe02JV3Fg0z3u", "17KKus2tLSVvJKRBvPEttE8k2hy4fracJ",
  "1l__6Hf8A4hChHuOxMiVv_58EcdQvIN8j", "1kt3g53yh-vaFX4hUAf290vhhXHOPiIZn",
  "1AJR_I0coWSNsF3XBztbYz8ZbW4L0tEF8", "1nGT6zwJvCeqzAg_LdX7763yMgcl2-eur",
  "1JVyUwQv8sb8HyiQF4tnVl4kLflAG-Bw0", "1ucvGxWD2H1D1regESMldbttvMV7ZmOe9",
  "1ex5xkCscCeBdB7KTmO-EBp49MCj4_6DT", "1OLn8aDpYjjrgd-Ge8ovR88Reql-zvJgN",
  "1pjIyDNqMxNPLVdWoIf6eoNg7dDCzlztD", "1h8Cn2mb0oqA1c1tkLCXtiaJu0WH9syu5",
  "1DsN3ByOqqOKcJZSwJUN_PGV5PWKRGisJ", "1ohizb4dLjJ5NJc7ND6fUZn0iwAFvqn6G",
  "1_sitR6tNGjcCp7pJfQcFeJB_JqanlTOR", "1KoL5VUbKlXF2omZJSPSczMsJQvham9y_",
  "1_87xahdQJItPzZ09JprOhdMgMa-Rg16z", "1koKh7BJVZ0JpRiItPYsRcubHk964LS_N",
  "1grG4_lht7xKNo9JeM5AAW_wabuacqr_S", "19LXtKVMo5uWSlRBRbJd-jUZv5DshGGyq",
  "1It_22Oo2IgGZepIo3fqtKPwtC6J2r0o4", "1heP-tDd4RxgXd0O52ls5Cbhd5Mn_dlh4",
  "1FS4WPIRMBSM2GqvlCjctUqe7IWBGoAd0", "1TuMnmJ8QLW7PH2zks-7S52OMtH9db7zD",
  "1-NyLkfABahFpd7TJYq6m8jNADt3x_R6i", "18EtxN9GRFgcVrxvV82MH0Ob3Q5s69_xc",
];

const list = document.querySelector("#available-list");
const books = titles.map((title, index) => ({
  key: `drive:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  title,
  authors: [],
  year: null,
  subject: "Available in the reading room",
  editions: 0,
  sourceUrl: `https://drive.google.com/file/d/${driveIds[index]}/view`,
  sourceLabel: "Read on Google Drive",
  searchTitle: title,
  coverId: null,
  order: index,
}));

initShelf();
const fragment = document.createDocumentFragment();
for (const book of books) fragment.append(createBookCard(book));
list.append(fragment);
