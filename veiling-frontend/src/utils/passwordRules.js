export const passwordMinLength = 8;
export const passwordPlaceholder =
  "Minimaal 8 tekens, combinatie van letters en cijfers";

export const passwordHints = [
  "Minimaal 8 tekens lang",
  "Minstens een letter (A-Z of a-z)",
  "Minstens een cijfer (0-9)",
];

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export function validatePassword(pw, pw2) {
  if (!pw) return "Wachtwoord is verplicht.";
  if (pw.length < passwordMinLength) {
    return "Wachtwoord moet minstens 8 tekens hebben.";
  }
  if (!passwordRegex.test(pw)) {
    return "Wachtwoord moet minstens 1 letter en 1 cijfer bevatten.";
  }
  if (pw !== pw2) return "Beide wachtwoorden moeten gelijk zijn.";
  return null;
}
