
export const interestOptions = [
  { value: "fitness", label: "Фитнес" },
  { value: "sport", label: "Спорт" },
  { value: "travel", label: "Путешествия" },
  { value: "music", label: "Музыка" },
  { value: "fashion", label: "Мода" },
  { value: "food", label: "Еда" },
  { value: "coffee", label: "Кофе" },
  { value: "movies", label: "Кино" },
  { value: "art", label: "Искусство" },
  { value: "photography", label: "Фотография" },
  { value: "tech", label: "Технологии" },
  { value: "gaming", label: "Игры" },
  { value: "business", label: "Бизнес" },
  { value: "self_development", label: "Саморазвитие" },
  { value: "psychology", label: "Психология" },
  { value: "books", label: "Книги" },
  { value: "nature", label: "Природа" },
  { value: "pets", label: "Животные" },
  { value: "dance", label: "Танцы" },
  { value: "yoga", label: "Йога" },
  { value: "party", label: "Вечеринки" },
  { value: "family", label: "Семья" },
  { value: "cars", label: "Авто" },
  { value: "crypto", label: "Криптовалюты" },
  { value: "volunteer", label: "Волонтерство" },
];

/** label за value */
export function getInterestLabel(value) {
  return interestOptions.find((i) => i.value === value)?.label ?? value;
}
