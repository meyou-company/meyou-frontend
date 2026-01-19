export const maritalStatusOptions = [
  { value: "SINGLE", label: "Не одружений/не заміжня" },
  { value: "MARRIED", label: "Одружений/заміжня" },
  { value: "DIVORCED", label: "Розлучений/розлучена" },
];

export const hobbyOptions = [
  { value: "Программирование", label: "Програмування" },
  { value: "Спорт", label: "Спорт" },
  { value: "Чтение", label: "Читання" },
  { value: "Музыка", label: "Музика" },
  { value: "Путешествия", label: "Подорожі" },
];

export const mapStringToSelect = (value, options) =>
  options.find((o) => o.value === value) || null;

export const mapArrayToSelect = (arr, options) => {
  const set = new Set((arr || []).map(String));
  return options.filter((o) => set.has(o.value));
};
