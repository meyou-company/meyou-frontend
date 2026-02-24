import { useCallback, useEffect, useState } from "react";
import { useLocationOptions } from "../../hooks/useLocationOptions";
import { INTERESTS } from "../../constants/interests";
import "./SearchFilterModal.scss";

const SORT_CHIPS = [
  { id: "recommended", label: "Рекомендованные" },
  { id: "popular", label: "Популярные" },
  { id: "new", label: "Новые профили" },
  { id: "nearby", label: "Профили рядом" },
];
const MARITAL_CHIPS = [
  { id: "", label: "Не указано" },
  { id: "SINGLE", label: "Свободен" },
  { id: "IN_RELATIONSHIP", label: "В отношениях" },
  { id: "MARRIED", label: "Женат / Замужем" },
  { id: "DIVORCED", label: "Разведен / Разведена" },
  { id: "WIDOWED", label: "Вдова / Вдовец" },
];


const GENDER_OPTIONS = [
  { id: "male", label: "Мужской" },
  { id: "female", label: "Женский" },
  { id: "any", label: "Любой" },
];

const defaultSimple = () => ({
  sortChip: "recommended",
  name: "",
  country: "",
  city: "",
  age: "",
  maritalStatus: "",
});

const defaultAdvanced = () => ({
  nearMe: false,
  country: "",
  city: "",
  gender: "any",
  online: false,
  top: false,
  new: false,
  age: "",
});

export default function SearchFilterModal({
  isOpen,
  onClose,
  onApply,
  initialParams = {},
}) {
  const [panel, setPanel] = useState("simple"); // "simple" | "advanced"
  const [interestsPanelOpen, setInterestsPanelOpen] = useState(false);
  const [simple, setSimple] = useState(defaultSimple);
  const [advanced, setAdvanced] = useState(defaultAdvanced);
  const [selectedInterests, setSelectedInterests] = useState([]);

  const setSimpleValues = useCallback((updater) => {
    setSimple((prev) => (typeof updater === "function" ? updater(prev) : { ...prev, ...updater }));
  }, []);

  const setAdvancedValues = useCallback((updater) => {
    setAdvanced((prev) => (typeof updater === "function" ? updater(prev) : { ...prev, ...updater }));
  }, []);

  const { countryOptions, cityOptions, isCitiesLoading } = useLocationOptions(
    panel === "simple" ? simple.country : advanced.country,
    panel === "simple" ? simple.city : advanced.city,
    panel === "simple" ? setSimpleValues : setAdvancedValues
  );

  useEffect(() => {
    if (!isOpen) return;
    setPanel("simple");
    setInterestsPanelOpen(false);
    setSimple(defaultSimple());
    setAdvanced(defaultAdvanced());
    setSelectedInterests(Array.isArray(initialParams?.interests) ? [...initialParams.interests] : []);
  }, [isOpen]);

  const openAdvanced = useCallback(() => {
    setAdvanced((prev) => ({
      ...prev,
      country: simple.country,
      city: simple.city,
    }));
    setPanel("advanced");
  }, [simple.country, simple.city]);

  const handleApplySimple = useCallback(() => {
    onApply({
      sort: simple.sortChip,
      name: simple.name.trim() || undefined,
      country: simple.country || undefined,
      city: simple.city || undefined,
      age: simple.age ? Number(simple.age) : undefined,
      maritalStatus: simple.maritalStatus || undefined,
      interests: selectedInterests.length > 0 ? selectedInterests : undefined,
    });
    onClose();
  }, [simple, selectedInterests, onApply, onClose]);

  const handleApplyAdvanced = useCallback(() => {
    onApply({
      sort: simple.sortChip,
      nearMe: advanced.nearMe,
      country: advanced.country || undefined,
      city: advanced.city || undefined,
      gender: advanced.gender,
      online: advanced.online,
      top: advanced.top,
      new: advanced.new,
      age: advanced.age ? Number(advanced.age) : undefined,
      name: simple.name.trim() || undefined,
      maritalStatus: simple.maritalStatus || undefined,
      interests: selectedInterests.length > 0 ? selectedInterests : undefined,
    });
    onClose();
  }, [simple, advanced, selectedInterests, onApply, onClose]);

  const resetAdvanced = useCallback(() => {
    setAdvanced(defaultAdvanced());
  }, []);

  const openInterests = useCallback(() => setInterestsPanelOpen(true), []);
  const closeInterests = useCallback(() => setInterestsPanelOpen(false), []);

  const toggleInterest = useCallback((id) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  if (!isOpen) return null;

  return (
    <>
      <div className="search-filter-overlay" onClick={onClose} aria-hidden="true" />
      <div className="search-filter-wrap" role="dialog" aria-modal="true" aria-labelledby="search-filter-title" onClick={(e) => e.stopPropagation()}>
        {interestsPanelOpen ? (
          /* ---------- Під-екран: вибір інтересів ---------- */
          <div className="search-filter search-filter--interests">
            <header className="search-filter__header">
              <button type="button" className="search-filter__back" onClick={closeInterests} aria-label="Назад">
                ‹
              </button>
              <h2 id="search-filter-title" className="search-filter__title">Интересы</h2>
              <span className="search-filter__headerSpacer" />
            </header>
            <p className="search-filter__interestsHint">Выберите один или несколько интересов</p>
            <div className="search-filter__chipsRow search-filter__chipsRow--wrap">
{INTERESTS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`search-filter__chip ${selectedInterests.includes(item.value) ? "search-filter__chipActive" : ""}`}
                    onClick={() => toggleInterest(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
            </div>
            <button type="button" className="search-filter__submit" onClick={closeInterests}>
              Готово
            </button>
          </div>
        ) : panel === "simple" ? (
          /* ---------- Перший рівень: звичайний фільтр ---------- */
          <div className="search-filter search-filter--simple">
            <header className="search-filter__header">
              <h2 id="search-filter-title" className="search-filter__title">Поиск</h2>
              <span className="search-filter__gear" aria-hidden="true">⚙</span>
              <button type="button" className="search-filter__close" onClick={onClose} aria-label="Закрити">
                ×
              </button>
            </header>

            <div className="search-filter__chipsRow">
              {SORT_CHIPS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`search-filter__chip ${simple.sortChip === c.id ? "search-filter__chipActive" : ""}`}
                  onClick={() => setSimpleValues((v) => ({ ...v, sortChip: c.id }))}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <button type="button" className="search-filter__expandBtn" onClick={openAdvanced}>
              Расширенный поиск
            </button>

            <section className="search-filter__block">
              <h3 className="search-filter__blockTitle">Поиск друзей</h3>
              <div className="search-filter__fieldWrap">
                <input
                  type="text"
                  className="search-filter__input"
                  placeholder="Имя"
                  value={simple.name}
                  onChange={(e) => setSimpleValues((v) => ({ ...v, name: e.target.value }))}
                  aria-label="Имя"
                />
                {simple.name && (
                  <button type="button" className="search-filter__inputClear" onClick={() => setSimpleValues((v) => ({ ...v, name: "" }))} aria-label="Очистить">×</button>
                )}
              </div>
              <div className="search-filter__row">
                <select
                  className="search-filter__select"
                  value={simple.country || ""}
                  onChange={(e) => setSimpleValues((v) => ({ ...v, country: e.target.value }))}
                  aria-label="Страна"
                >
                  <option value="">Страна</option>
                  {countryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  className="search-filter__select"
                  value={simple.city ?? ""}
                  onChange={(e) => setSimpleValues((v) => ({ ...v, city: e.target.value }))}
                  disabled={!simple.country || isCitiesLoading}
                  aria-label="Город"
                >
                  <option value="">Город</option>
                  {cityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="search-filter__fieldWrap">
                <input
                  type="number"
                  className="search-filter__input"
                  placeholder="Возраст"
                  min={18}
                  max={100}
                  value={simple.age}
                  onChange={(e) => setSimpleValues((v) => ({ ...v, age: e.target.value }))}
                  aria-label="Возраст"
                />
                {simple.age && (
                  <button type="button" className="search-filter__inputClear" onClick={() => setSimpleValues((v) => ({ ...v, age: "" }))} aria-label="Очистить">×</button>
                )}
              </div>
              <button type="button" className="search-filter__rowBtn" onClick={openInterests}>
                Интересы {selectedInterests.length > 0 && `(${selectedInterests.length})`} <span className="search-filter__arrow">›</span>
              </button>
            </section>

            <section className="search-filter__block">
              <h3 className="search-filter__blockTitle">Семейное положение</h3>
              <div className="search-filter__chipsRow search-filter__chipsRow--wrap">
                {MARITAL_CHIPS.map((c) => (
                  <button
                    key={c.id || "empty"}
                    type="button"
                    className={`search-filter__chip ${simple.maritalStatus === c.id ? "search-filter__chipActive" : ""}`}
                    onClick={() => setSimpleValues((v) => ({ ...v, maritalStatus: c.id }))}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </section>

            <button type="button" className="search-filter__submit" onClick={handleApplySimple}>
              Поиск
            </button>
          </div>
        ) : (
          /* ---------- Другий рівень: розширений фільтр ---------- */
          <div className="search-filter search-filter--advanced">
            <header className="search-filter__header">
              <h2 id="search-filter-title" className="search-filter__title">Поиск</h2>
              <button type="button" className="search-filter__close" onClick={onClose} aria-label="Закрити">
                ×
              </button>
            </header>

            <section className="search-filter__block">
              <div className="search-filter__toggleRow">
                <span className="search-filter__toggleLabel">Возле меня</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={advanced.nearMe}
                  className={`search-filter__toggle ${advanced.nearMe ? "search-filter__toggleOn" : ""}`}
                  onClick={() => setAdvancedValues((v) => ({ ...v, nearMe: !v.nearMe }))}
                >
                  <span className="search-filter__toggleThumb" />
                </button>
              </div>
              <div className="search-filter__row">
                <select
                  className="search-filter__select"
                  value={advanced.country || ""}
                  onChange={(e) => setAdvancedValues((v) => ({ ...v, country: e.target.value }))}
                  aria-label="Страна"
                >
                  <option value="">Страна</option>
                  {countryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  className="search-filter__select"
                  value={advanced.city ?? ""}
                  onChange={(e) => setAdvancedValues((v) => ({ ...v, city: e.target.value }))}
                  disabled={!advanced.country || isCitiesLoading}
                  aria-label="Город"
                >
                  <option value="">Город</option>
                  {cityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </section>

            <section className="search-filter__block">
              <span className="search-filter__blockTitle">Пол</span>
              <div className="search-filter__segmented">
                {GENDER_OPTIONS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`search-filter__segBtn ${advanced.gender === g.id ? "search-filter__segBtnActive" : ""}`}
                    onClick={() => setAdvancedValues((v) => ({ ...v, gender: g.id }))}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="search-filter__block">
              <div className="search-filter__togglesRow">
                <div className="search-filter__toggleRow">
                  <span className="search-filter__toggleLabel">Онлайн</span>
                  <button type="button" role="switch" aria-checked={advanced.online} className={`search-filter__toggle ${advanced.online ? "search-filter__toggleOn" : ""}`} onClick={() => setAdvancedValues((v) => ({ ...v, online: !v.online }))}><span className="search-filter__toggleThumb" /></button>
                </div>
                <div className="search-filter__toggleRow">
                  <span className="search-filter__toggleLabel">TOP</span>
                  <button type="button" role="switch" aria-checked={advanced.top} className={`search-filter__toggle ${advanced.top ? "search-filter__toggleOn" : ""}`} onClick={() => setAdvancedValues((v) => ({ ...v, top: !v.top }))}><span className="search-filter__toggleThumb" /></button>
                </div>
                <div className="search-filter__toggleRow">
                  <span className="search-filter__toggleLabel">Новые</span>
                  <button type="button" role="switch" aria-checked={advanced.new} className={`search-filter__toggle ${advanced.new ? "search-filter__toggleOn" : ""}`} onClick={() => setAdvancedValues((v) => ({ ...v, new: !v.new }))}><span className="search-filter__toggleThumb" /></button>
                </div>
              </div>
            </section>

            <section className="search-filter__block">
              <span className="search-filter__blockTitle">Возраст (18–100)</span>
              <div className="search-filter__fieldWrap">
                <input
                  type="number"
                  className="search-filter__input"
                  placeholder="Возраст"
                  min={18}
                  max={100}
                  value={advanced.age}
                  onChange={(e) => setAdvancedValues((v) => ({ ...v, age: e.target.value }))}
                  aria-label="Возраст"
                />
                {advanced.age && (
                  <button type="button" className="search-filter__inputClear" onClick={() => setAdvancedValues((v) => ({ ...v, age: "" }))} aria-label="Очистить">×</button>
                )}
              </div>
            </section>

            <button type="button" className="search-filter__rowBtn" onClick={openInterests}>
              Интересы {selectedInterests.length > 0 && `(${selectedInterests.length})`} <span className="search-filter__arrow">›</span>
            </button>

            <footer className="search-filter__footer">
              <button type="button" className="search-filter__reset" onClick={resetAdvanced}>
                Сбросить
              </button>
              <button type="button" className="search-filter__apply" onClick={handleApplyAdvanced}>
                Применить
              </button>
            </footer>
          </div>
        )}
      </div>
    </>
  );
}
