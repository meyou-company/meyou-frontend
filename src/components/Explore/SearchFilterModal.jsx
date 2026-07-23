import { useCallback, useEffect, useRef, useState } from "react";
import { useLocationOptions } from "../../hooks/useLocationOptions";
import { interestOptions, getInterestLabel } from "../../constants/interests";
import { maritalStatusOptions } from "../../utils/profileOptions";
import "./SearchFilterModal.scss";

const GENDER_OPTIONS = [
  { id: "male", label: "Мужчина" },
  { id: "female", label: "Женщина" },
  { id: "any", label: "Любой" },
];

const MARITAL_OPTIONS = [
  { id: "any", label: "Любой" },
  ...maritalStatusOptions.map((o) => ({ id: o.value, label: o.label })),
];

const DEFAULT_FILTER = {
  nearMe: true,
  country: "",
  city: "",
  gender: "any",
  maritalStatus: "any",
  ageMin: 18,
  ageMax: 30,
  interestsEnabled: true,
  interestsQuery: "",
  selectedInterests: [],
  online: false,
  vip: false,
  new: false,
};

const INTERESTS_PREVIEW_IDS = ["fitness", "party", "travel", "gaming", "fashion", "food"];

export default function SearchFilterModal({
  isOpen,
  onClose,
  onApply,
  initialParams = {},
  resultCount,
}) {
  const [f, setF] = useState(DEFAULT_FILTER);
  const [interestsPickerOpen, setInterestsPickerOpen] = useState(false);

  const set = useCallback((updater) => {
    setF((prev) => (typeof updater === "function" ? updater(prev) : { ...prev, ...updater }));
  }, []);

  const { countryOptions, cityOptions, isCitiesLoading } = useLocationOptions(
    f.country,
    f.city,
    (updater) => set((prev) => ({ ...prev, ...(typeof updater === "function" ? updater(prev) : updater) }))
  );

  useEffect(() => {
    if (!isOpen) return;
    set({
      ...DEFAULT_FILTER,
      country: initialParams.country ?? "",
      city: initialParams.city ?? "",
      gender: initialParams.gender ?? "any",
      maritalStatus: initialParams.maritalStatus ?? "any",
      ageMin: initialParams.ageMin ?? 18,
      ageMax: initialParams.ageMax ?? 30,
      nearMe: initialParams.nearMe ?? true,
      online: initialParams.online ?? false,
      vip: initialParams.top ?? false,
      new: initialParams.new ?? false,
      selectedInterests: Array.isArray(initialParams.interests) ? [...initialParams.interests] : [],
    });
  }, [isOpen]);

  const reset = useCallback(() => set(DEFAULT_FILTER), [set]);

  const toggleInterest = useCallback((value) => {
    set((prev) => ({
      ...prev,
      selectedInterests: prev.selectedInterests.includes(value)
        ? prev.selectedInterests.filter((x) => x !== value)
        : [...prev.selectedInterests, value],
    }));
  }, []);

  const handleApply = useCallback(() => {
    onApply({
      nearMe: f.nearMe,
      country: f.country || undefined,
      city: f.city || undefined,
      gender: f.gender === "any" ? undefined : f.gender,
      maritalStatus: f.maritalStatus === "any" ? undefined : f.maritalStatus,
      ageMin: f.ageMin,
      ageMax: f.ageMax,
      interests: f.interestsEnabled && f.selectedInterests.length > 0 ? f.selectedInterests : undefined,
      interestsQuery: f.interestsQuery?.trim() || undefined,
      online: f.online,
      top: f.vip,
      new: f.new,
    });
    onClose();
  }, [f, onApply, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="search-filter-overlay" onClick={onClose} aria-hidden="true" />
      <div className="search-filter-wrap search-filter-wrap--single" role="dialog" aria-modal="true" aria-labelledby="search-filter-title" onClick={(e) => e.stopPropagation()}>
        <div className="search-filter search-filter--filters">
          <header className="search-filter__header search-filter__header--withClose">
            <h2 id="search-filter-title" className="search-filter__title">Налаштування пошуку</h2>
            <button type="button" className="search-filter__close" onClick={onClose} aria-label="Закрити">
              ×
            </button>
          </header>

          <div className="search-filter__body">
            {/* Локация */}
            <section className="search-filter__block">
              <h3 className="search-filter__blockTitle">Локация</h3>
              <div className="search-filter__toggleRow">
                <span className="search-filter__toggleLabel">
                  <span className="search-filter__pinIcon" aria-hidden="true">📍</span>
                  Рядом
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={f.nearMe}
                  className={`search-filter__toggle ${f.nearMe ? "search-filter__toggleOn" : ""}`}
                  onClick={() => set((p) => ({ ...p, nearMe: !p.nearMe }))}
                >
                  <span className="search-filter__toggleThumb" />
                </button>
              </div>
              <p className="search-filter__subtitle">GPS Использует GPS</p>
              <div className="search-filter__row">
                <select
                  className="search-filter__select"
                  value={f.country || ""}
                  onChange={(e) => set((p) => ({ ...p, country: e.target.value, city: "" }))}
                  aria-label="Страна"
                >
                  <option value="">Украина</option>
                  {countryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  className="search-filter__select"
                  value={f.city ?? ""}
                  onChange={(e) => set((p) => ({ ...p, city: e.target.value }))}
                  disabled={!f.country || isCitiesLoading}
                  aria-label="Город"
                >
                  <option value="">Город</option>
                  {cityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </section>

            {/* Пол */}
            <section className="search-filter__block">
              <span className="search-filter__blockTitle">Пол</span>
              <div className="search-filter__segmented">
                {GENDER_OPTIONS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`search-filter__segBtn ${f.gender === g.id ? "search-filter__segBtnActive" : ""}`}
                    onClick={() => set((p) => ({ ...p, gender: g.id }))}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Семейное положение */}
            <section className="search-filter__block">
              <span className="search-filter__blockTitle">Семейное положение</span>
              <div className="search-filter__segmented search-filter__segmented--wrap">
                {MARITAL_OPTIONS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`search-filter__segBtn ${f.maritalStatus === m.id ? "search-filter__segBtnActive" : ""}`}
                    onClick={() => set((p) => ({ ...p, maritalStatus: m.id }))}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Возраст */}
            <section className="search-filter__block">
              <span className="search-filter__blockTitle">Возраст</span>
              <div className="search-filter__ageSliderRow">
                <span className="search-filter__ageSliderValue" aria-live="polite">
                  {f.ageMax}
                </span>
                <input
                  type="range"
                  className="search-filter__range search-filter__range--age"
                  min={18}
                  max={100}
                  step={1}
                  value={f.ageMax}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    set((p) => ({ ...p, ageMax: v }));
                  }}
                  onInput={(e) => {
                    const v = Number(e.target.value);
                    set((p) => ({ ...p, ageMax: v }));
                  }}
                  aria-label="Возраст до"
                />
                <span className="search-filter__ageSliderMax">100</span>
              </div>
            </section>

            {/* Интересы */}
            <section className="search-filter__block">
              <div className="search-filter__toggleRow">
                <span className="search-filter__blockTitle" style={{ marginBottom: 0 }}>Интересы</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={f.interestsEnabled}
                  className={`search-filter__toggle ${f.interestsEnabled ? "search-filter__toggleOn" : ""}`}
                  onClick={() => set((p) => ({ ...p, interestsEnabled: !p.interestsEnabled }))}
                >
                  <span className="search-filter__toggleThumb" />
                </button>
              </div>
              <div className="search-filter__fieldWrap search-filter__interestsField">
                <div className="search-filter__interestsFieldInner">
                  {f.selectedInterests.map((value) => (
                    <span key={value} className="search-filter__interestsTag">
                      {getInterestLabel(value)}
                      <button
                        type="button"
                        className="search-filter__interestsTagRemove"
                        onClick={() => toggleInterest(value)}
                        aria-label={`Видалити ${getInterestLabel(value)}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    className="search-filter__input search-filter__input--inline"
                    placeholder={f.selectedInterests.length ? "" : "Ввести интересы"}
                    value={f.interestsQuery}
                    onChange={(e) => set((p) => ({ ...p, interestsQuery: e.target.value }))}
                    aria-label="Интересы"
                  />
                </div>
              </div>
              <div className="search-filter__chipsRow search-filter__chipsRow--wrap">
                {interestOptions.filter((i) => INTERESTS_PREVIEW_IDS.includes(i.value)).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`search-filter__chip ${f.selectedInterests.includes(item.value) ? "search-filter__chipActive" : ""}`}
                    onClick={() => toggleInterest(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="search-filter__chip search-filter__chipAdd"
                  onClick={() => setInterestsPickerOpen(true)}
                  aria-label="Додати інтереси"
                >
                  Add+
                </button>
              </div>
              {interestsPickerOpen && (
                <div className="search-filter__interestsOverlay" role="dialog" aria-label="Вибір інтересів">
                  <div className="search-filter__interestsPicker">
                    <div className="search-filter__interestsPickerHeader">
                      <span className="search-filter__interestsPickerTitle">Выберите интересы</span>
                      <button
                        type="button"
                        className="search-filter__interestsPickerClose"
                        onClick={() => setInterestsPickerOpen(false)}
                        aria-label="Закрити"
                      >
                        ×
                      </button>
                    </div>
                    <div className="search-filter__interestsPickerList">
                      {interestOptions.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          className={`search-filter__chip ${f.selectedInterests.includes(item.value) ? "search-filter__chipActive" : ""}`}
                          onClick={() => toggleInterest(item.value)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="search-filter__interestsPickerFooter">
                      <button
                        type="button"
                        className="search-filter__interestsPickerDone"
                        onClick={() => setInterestsPickerOpen(false)}
                      >
                        Готово
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Только онлайн */}
            <section className="search-filter__block">
              <div className="search-filter__toggleRow">
                <span className="search-filter__toggleLabel">
                  <span className="search-filter__dot search-filter__dot--green" aria-hidden="true" />
                  Только онлайн
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={f.online}
                  className={`search-filter__toggle ${f.online ? "search-filter__toggleOn" : ""}`}
                  onClick={() => set((p) => ({ ...p, online: !p.online }))}
                >
                  <span className="search-filter__toggleThumb" />
                </button>
              </div>
            </section>

            {/* VIP */}
            <section className="search-filter__block">
              <div className="search-filter__toggleRow">
                <span className="search-filter__toggleLabel">
                  <span className="search-filter__dot search-filter__dot--purple" aria-hidden="true" />
                 Топ VIP
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={f.vip}
                  className={`search-filter__toggle ${f.vip ? "search-filter__toggleOn" : ""}`}
                  onClick={() => set((p) => ({ ...p, vip: !p.vip }))}
                >
                  <span className="search-filter__toggleThumb" />
                </button>
              </div>
            </section>

            {/* Новые */}
            <section className="search-filter__block">
              <div className="search-filter__toggleRow">
                <div>
                  <span className="search-filter__toggleLabel">Новые</span>
                  <p className="search-filter__subtitle">Зарегистрированы за 72 часа</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={f.new}
                  className={`search-filter__toggle ${f.new ? "search-filter__toggleOn" : ""}`}
                  onClick={() => set((p) => ({ ...p, new: !p.new }))}
                >
                  <span className="search-filter__toggleThumb" />
                </button>
              </div>
            </section>
          </div>

          <footer className="search-filter__footer search-filter__footer--single">
            <div className="search-filter__footerActions">
              <button type="button" className="search-filter__resetBtn" onClick={reset}>
                Сбросить
              </button>
              <button type="button" className="search-filter__applyBtn" onClick={handleApply}>
                Применить фильтры
              </button>
            </div>
            {typeof resultCount === "number" && (
              <p className="search-filter__resultCount">Найдено {resultCount} пользователей</p>
            )}
          </footer>
        </div>
      </div>
    </>
  );
}
