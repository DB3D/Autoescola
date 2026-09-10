const STORE = "autoescola-gate";
const SALT = "ac-2024-gate";
// FNV-1a/base36 of SALT + code, so the code itself appears nowhere in the source
// or the bundle. To change the code, run digest() on the new value in a console
// and replace EXPECTED with the result.
const EXPECTED = "1pxmupl";
function digest(value: string) {
  let h = 0x811c9dc5;
  for (const ch of SALT + value) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}
function remembered() {
  try {
    return localStorage.getItem(STORE) === EXPECTED;
  } catch {
    return false;
  }
}
function remember() {
  try {
    localStorage.setItem(STORE, EXPECTED);
  } catch {
    // Storage blocked: the gate simply reappears on the next launch.
  }
}
export function unlock(root: HTMLElement): Promise<void> {
  if (remembered()) return Promise.resolve();
  return new Promise((resolve) => {
    root.innerHTML = `<div class="app-shell gate"><form id="gate-form"><span class="brand-car" aria-hidden="true">🚗</span><h1>AutoEscola</h1><label for="gate-code">Entre le code d’accès</label><input id="gate-code" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="12" aria-describedby="gate-error"><p class="gate-error" id="gate-error" role="alert" hidden>Code incorrect. Réessaie.</p><button class="primary full" type="submit">Déverrouiller</button></form></div>`;
    const input = root.querySelector<HTMLInputElement>("#gate-code")!;
    const error = root.querySelector<HTMLParagraphElement>("#gate-error")!;
    input.focus();
    input.oninput = () => (error.hidden = true);
    root.querySelector<HTMLFormElement>("#gate-form")!.onsubmit = (e) => {
      e.preventDefault();
      if (digest(input.value.trim()) !== EXPECTED) {
        error.hidden = false;
        input.value = "";
        input.focus();
        return;
      }
      remember();
      resolve();
    };
  });
}
