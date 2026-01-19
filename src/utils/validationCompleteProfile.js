const onlyLettersSpaces = (v) =>
  /^[\p{L}\p{M}\s'-]+$/u.test(String(v || "").trim());

export function validateCompleteProfile(values) {
  const e = {};

  const req = (key, msg) => {
    const v = values[key];
    if (v === null || v === undefined) return (e[key] = msg);
    if (typeof v === "string" && !v.trim()) return (e[key] = msg);
    if (Array.isArray(v) && v.length === 0) return (e[key] = msg);
  };

  // required
  req("lastName", "Вкажіть прізвище");
  req("firstName", "Вкажіть ім'я");
  req("phone", "Вкажіть номер телефону");
  req("nationality", "Вкажіть національність");
  req("maritalStatus", "Оберіть сімейне положення");
  req("country", "Оберіть країну");
  req("city", "Оберіть місто");
  req("hobbies", "Оберіть хобі");

  // правила
  if (values.firstName && !onlyLettersSpaces(values.firstName)) {
    e.firstName = "Ім'я має містити лише літери";
  }
  if (values.lastName && !onlyLettersSpaces(values.lastName)) {
    e.lastName = "Прізвище має містити лише літери";
  }
  if (values.nationality && !onlyLettersSpaces(values.nationality)) {
    e.nationality = "Національність має містити лише літери";
  }

  // username optional
  if (values.username) {
    const u = String(values.username).trim();
    if (u.length < 3) e.username = "Нік має містити мінімум 3 символи";
    else if (u.length > 30) e.username = "Нік має бути до 30 символів";
    else if (!/^[a-zA-Z0-9._-]+$/.test(u)) {
      e.username = "Нік: тільки латиниця/цифри та . _ -";
    }
  }

  // bio optional
  if (values.bio && String(values.bio).length > 500) {
    e.bio = "Максимум 500 символів";
  }

  // phone (react-international-phone дає строку з +)
  if (values.phone) {
    const digits = String(values.phone).replace(/\D/g, "");
    if (digits.length < 8) e.phone = "Номер занадто короткий";
    if (digits.length > 16) e.phone = "Номер занадто довгий";
  }

  return e;
}
