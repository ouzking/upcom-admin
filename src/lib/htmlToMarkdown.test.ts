import { describe, expect, it } from "vitest";
import { htmlToMarkdown } from "./htmlToMarkdown";

describe("collage HTML nettoyé (Word, Google Docs, web)", () => {
  it("conserve la structure utile", () => {
    const html = `<h1>Notre offre</h1><p>Un texte avec <strong>du gras</strong>, de l'<em>italique</em> et un <a href="https://upcomagency.com">lien</a>.</p>
      <h3>Étapes</h3><ul><li>Audit</li><li>Stratégie</li></ul><ol><li>Un</li><li>Deux</li></ol><blockquote>Citation</blockquote>`;
    expect(htmlToMarkdown(html)).toBe(
      "## Notre offre\n\nUn texte avec **du gras**, de l'*italique* et un [lien](https://upcomagency.com).\n\n### Étapes\n\n- Audit\n- Stratégie\n\n1. Un\n2. Deux\n\n> Citation",
    );
  });

  it("supprime styles, scripts, images et liens dangereux", () => {
    const html = `<p style="color:red;font-family:Calibri"><span class="x">Texte</span><script>alert(1)</script><img src="x" onerror="alert(1)"></p><p><a href="javascript:alert(1)">piège</a></p>`;
    const result = htmlToMarkdown(html);
    expect(result).toBe("Texte\n\npiège");
    expect(result).not.toMatch(/script|alert|javascript|style|<|>/);
  });

  it("gère le gras de Google Docs (span font-weight:700) et ignore l'enveloppe font-weight:normal", () => {
    const html = `<b style="font-weight:normal" id="docs-internal-guid"><p><span style="font-weight:700">Important</span> : à lire</p></b>`;
    expect(htmlToMarkdown(html)).toBe("**Important** : à lire");
  });

  it("retours à la ligne et espaces insécables", () => {
    expect(htmlToMarkdown("<p>Ligne 1<br>Ligne&nbsp;2</p>")).toBe("Ligne 1\nLigne 2");
  });
});

describe("collage — texte contenant des codes", () => {
  it("ne modifie pas un texte qui contient « 00a0 »", () => {
    expect(htmlToMarkdown("<p>Référence 00a0-2026</p>")).toBe("Référence 00a0-2026");
  });
});
