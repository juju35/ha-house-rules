// One file per language; scripts/bundle.mjs inlines them back into a single object literal at build, which
// scripts/i18n-split.mjs then splits per language (English stays in the bundle).
import en from "./en.js";
import fr from "./fr.js";
import de from "./de.js";
import es from "./es.js";
import it from "./it.js";
import nl from "./nl.js";
import pt from "./pt.js";
import pl from "./pl.js";
import sr from "./sr.js";
import ro from "./ro.js";
import da from "./da.js";
import sv from "./sv.js";
import bg from "./bg.js";
import ru from "./ru.js";
import uk from "./uk.js";
import hu from "./hu.js";
import sk from "./sk.js";
import cs from "./cs.js";
import sl from "./sl.js";
import lv from "./lv.js";
import el from "./el.js";
import srLatn from "./sr-Latn.js";

export const HR_STRINGS = {
  "en": en,
  "fr": fr,
  "de": de,
  "es": es,
  "it": it,
  "nl": nl,
  "pt": pt,
  "pl": pl,
  "sr": sr,
  "ro": ro,
  "da": da,
  "sv": sv,
  "bg": bg,
  "ru": ru,
  "uk": uk,
  "hu": hu,
  "sk": sk,
  "cs": cs,
  "sl": sl,
  "lv": lv,
  "el": el,
  "sr-Latn": srLatn
};
