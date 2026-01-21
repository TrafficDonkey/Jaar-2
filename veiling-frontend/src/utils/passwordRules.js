export const passwordMinLength = 8;
export const passwordPlaceholder =
  "Minimaal 8 tekens, hoofdletter, cijfer en speciaal teken";

export const passwordHints = [
  "Minimaal 8 tekens lang",
  "Minstens een hoofdletter (A-Z)",
  "Minstens een cijfer (0-9)",
  "Minstens een speciaal teken (bijv. !@#$)",
];

const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).+$/;

export function validatePassword(pw, pw2) {
  if (!pw) return "Wachtwoord is verplicht.";
  if (pw.length < passwordMinLength) {
    return "Wachtwoord moet minstens 8 tekens hebben.";
  }
  if (!passwordRegex.test(pw)) {
    if (!/[A-Z]/.test(pw)) return "Wachtwoord moet minstens 1 hoofdletter (A-Z) bevatten.";
    if (!/\d/.test(pw)) return "Wachtwoord moet minstens 1 cijfer (0-9) bevatten.";
    if (!/[^A-Za-z0-9\s]/.test(pw)) {
      return "Wachtwoord moet minstens 1 speciaal teken (bijv. !@#$) bevatten.";
    }
    return "Wachtwoord voldoet niet aan de eisen.";
  }
  if (pw !== pw2) return "Beide wachtwoorden moeten gelijk zijn.";
  return null;
}
