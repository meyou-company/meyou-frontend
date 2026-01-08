import { useEffect, useMemo, useRef, useState } from "react";
import "./VerifyEmailForm.scss";

const CODE_LEN = 4;
const START_SECONDS = 59;

export default function VerifyEmailForm({ onBack, onSuccess }) {
  const [code, setCode] = useState(Array(CODE_LEN).fill(""));
  const [seconds, setSeconds] = useState(START_SECONDS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const inputsRef = useRef([]);

  const isComplete = useMemo(() => code.every((c) => c.trim() !== ""), [code]);
  const codeValue = useMemo(() => code.join(""), [code]);

  // timer
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const focusIndex = (idx) => {
    const el = inputsRef.current?.[idx];
    if (el) el.focus();
  };

  const handleChange = (idx, e) => {
    setSubmitError("");
    const v = e.target.value;
    const digit = (v || "").replace(/\D/g, "").slice(0, 1);

    setCode((prev) => {
      const next = [...prev];
      next[idx] = digit;
      return next;
    });

    if (digit && idx < CODE_LEN - 1) focusIndex(idx + 1);
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace") {
      if (code[idx]) {
        setCode((prev) => {
          const next = [...prev];
          next[idx] = "";
          return next;
        });
      } else if (idx > 0) {
        focusIndex(idx - 1);
        setCode((prev) => {
          const next = [...prev];
          next[idx - 1] = "";
          return next;
        });
      }
    }

    if (e.key === "ArrowLeft" && idx > 0) focusIndex(idx - 1);
    if (e.key === "ArrowRight" && idx < CODE_LEN - 1) focusIndex(idx + 1);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    setSubmitError("");

    const pasted = (e.clipboardData.getData("text") || "")
      .replace(/\D/g, "")
      .slice(0, CODE_LEN);

    if (!pasted) return;

    const arr = Array(CODE_LEN).fill("");
    for (let i = 0; i < pasted.length; i++) arr[i] = pasted[i];

    setCode(arr);
    focusIndex(Math.min(pasted.length, CODE_LEN - 1));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!isComplete) {
      setSubmitError("Введите код полностью");
      return;
    }

    try {
      setIsSubmitting(true);

      // TODO: verify API
      await new Promise((r) => setTimeout(r, 600));

      onSuccess?.();
    } catch {
      setSubmitError("Ошибка верификации");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resend = async () => {
    if (seconds > 0) return;

    setSubmitError("");
    setCode(Array(CODE_LEN).fill(""));
    focusIndex(0);

    // TODO: resend API
    await new Promise((r) => setTimeout(r, 300));
    setSeconds(START_SECONDS);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <section className="verify auth">
      {/* back arrow — у тебе глобальна */}
      <button type="button" className="back-arrow" onClick={onBack} aria-label="Назад">
        <img src="/icon1/Vector.png" alt="" aria-hidden="true" className="back-arrow__icon" />
      </button>

      <div className="verify__logoCard" aria-hidden="true">
        <img className="verify__logoImg" src="/Logo/photo.png" alt="Me You logo" />
      </div>

      <h1 className="verify__title">Верификация</h1>
      <p className="verify__subtitle">Код отправлен на емейл</p>

      <form className="verify__form" onSubmit={onSubmit} noValidate>
        <div className="verifyCode" onPaste={handlePaste}>
          {code.map((val, idx) => (
            <input
              key={idx}
              ref={(el) => (inputsRef.current[idx] = el)}
              className="verifyCode__box"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={1}
              value={val}
              onChange={(e) => handleChange(idx, e)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              aria-label={`Цифра ${idx + 1}`}
            />
          ))}
        </div>

        <div className="verify__timer">{mm}:{ss}</div>

        {submitError && <div className="verify__error">{submitError}</div>}

        {/* ✅ Градієнт з глобального .btn-gradient */}
        <button className="btn-gradient verify__btnMain" type="submit" disabled={isSubmitting || !isComplete}>
          {isSubmitting ? "Проверка..." : "Войти"}
        </button>

        {/* ✅ Градієнт з глобального .btn-gradient */}
        <button
          type="button"
          className="btn-gradient verify__btnResend"
          onClick={resend}
          disabled={seconds > 0}
        >
          Отправить код повторно
        </button>

        <input type="hidden" name="code" value={codeValue} readOnly />
      </form>
    </section>
  );
}
