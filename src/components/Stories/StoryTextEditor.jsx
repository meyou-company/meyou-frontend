const STORY_TEXT_COLORS = [
  "#ffffff",
  "#111111",
  "#ff4fb1",
  "#4f6bff",
  "#ffd84f",
  "#44d17a",
];

export default function StoryTextEditor({
  isOpen,
  text,
  color,
  fontSize,
  position,
  disabled,
  onTextChange,
  onColorChange,
  onFontSizeChange,
  onPositionChange,
}) {
  const handlePointerDown = (event) => {
    if (disabled) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (disabled || !event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      return;
    }

    const frame = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!frame?.width || !frame?.height) return;

    const x = ((event.clientX - frame.left) / frame.width) * 100;
    const y = ((event.clientY - frame.top) / frame.height) * 100;

    onPositionChange({
      x: Math.min(95, Math.max(5, x)),
      y: Math.min(92, Math.max(8, y)),
    });
  };

  if (!isOpen && !text.trim()) return null;

  return (
    <>
      <div
        className={`storyTextEditor__overlay ${!text.trim() ? "storyTextEditor__overlay--placeholder" : ""}`}
        style={{
          color,
          fontSize: `${fontSize}px`,
          left: `${position.x}%`,
          top: `${position.y}%`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Переместить текст"
      >
        {text.trim() || "Ваш текст"}
      </div>

      {isOpen && (
        <div
          className="storyTextEditor__controls"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <input
            type="text"
            className="storyTextEditor__input"
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            maxLength={100}
            placeholder="Введите текст"
            disabled={disabled}
            autoFocus
          />

          <div className="storyTextEditor__settings">
            <label className="storyTextEditor__size">
              <span className="storyTextEditor__sizeLabel">Aa</span>
              <input
                type="range"
                min="16"
                max="72"
                step="2"
                value={fontSize}
                onChange={(event) => onFontSizeChange(Number(event.target.value))}
                disabled={disabled}
                aria-label="Размер текста"
              />
              <span className="storyTextEditor__sizeValue">{fontSize}</span>
            </label>

            <div className="storyTextEditor__colors" aria-label="Цвет текста">
              {STORY_TEXT_COLORS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`storyTextEditor__color ${color === item ? "storyTextEditor__color--active" : ""}`}
                  style={{ backgroundColor: item }}
                  onClick={() => onColorChange(item)}
                  disabled={disabled}
                  aria-label={`Выбрать цвет ${item}`}
                  aria-pressed={color === item}
                />
              ))}
            </div>
          </div>

          <p className="storyTextEditor__hint">
            Перетащите текст в нужное место на фото
          </p>
        </div>
      )}
    </>
  );
}
