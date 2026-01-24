
export const maritalStatusOptions = [
  { value: "SINGLE", label: "Неодружений/Неодружена" },
  { value: "MARRIED", label: "Одружений/Заміжня" },
  { value: "DIVORCED", label: "Розлучений/Розлучена" },
  { value: "WIDOWED", label: "Вдівець/Вдова" },
  { value: "IN_RELATIONSHIP", label: "У стосунках" },
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
