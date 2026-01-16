import { useMemo, useRef, useState } from "react";
import { useAuthStore } from "../../../zustand/useAuthStore";
import "../VerifyRegisterEmailForm/VerifyRegisterEmailForm.scss";

const CODE_LEN = 4;

export default function VerifyRegisterEmailForm({ onBack, onSuccess }) {
  const verifyEmailCode = useAuthStore((s) => s.verifyEmailCode);
  const resendEmailCode = useAuthStore((s) => s.resendEmailCode);

  const [code, setCode] = useState(Array(CODE_LEN).fill(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const inputsRef = useRef([]);

  const isComplete = useMemo(() => code.every((c) => c.trim() !== ""), [code]);
  const codeValue = useMemo(() => code.join(""), [code]);

  const focusIndex = (idx) => {
    const el = inputsRef.current?.[idx];
    if (el) el.focus();
  };

  const handleChange = (idx, e) => {
    setSubmitError("");
    const digit = (e.target.value || "").replace(/\D/g, "").slice(0, 1);

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

      const res = await verifyEmailCode?.({ code: codeValue }); // ✅ тільки code

      if (!res?.ok) {
        const msg =
          res?.error?.response?.data?.message?.[0] ||
          res?.error?.response?.data?.message ||
          res?.error?.message ||
          "Ошибка верификации";
        setSubmitError(msg);
        return;
      }

      onSuccess?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message?.[0] ||
        err?.response?.data?.message ||
        err?.message ||
        "Ошибка верификации";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resend = async () => {
    setSubmitError("");
    setCode(Array(CODE_LEN).fill(""));
    focusIndex(0);

    try {
      setIsResending(true);
      const res = await resendEmailCode?.();

      if (res && !res?.ok) {
        const msg =
          res?.error?.response?.data?.message?.[0] ||
          res?.error?.response?.data?.message ||
          res?.error?.message ||
          "Ошибка отправки кода";
        setSubmitError(msg);
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message?.[0] ||
        e?.response?.data?.message ||
        e?.message ||
        "Ошибка отправки кода";
      setSubmitError(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <section className="verify auth">
      <button type="button" className="back-arrow" onClick={onBack} aria-label="Назад">
        <img src="/icon1/Vector.png" alt="" aria-hidden="true" className="back-arrow__icon" />
      </button>

      <div className="verify__logoCard" aria-hidden="true">
        <img className="verify__logoImg" src="/Logo/photo.png" alt="Me You logo" />
      </div>

      <h1 className="verify__title">Верификация</h1>
      <p className="verify__subtitle">Код отправлен на емейл и действителен 15 минут.</p>

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

        {submitError && <div className="verify__error">{submitError}</div>}

        <button className="btn-gradient verify__btnMain" type="submit" disabled={isSubmitting || !isComplete}>
          {isSubmitting ? "Проверка..." : "Подтвердить"}
        </button>

        <button type="button" className="btn-gradient verify__btnResend" onClick={resend} disabled={isResending}>
          {isResending ? "Отправка..." : "Отправить код повторно"}
        </button>

        <input type="hidden" name="code" value={codeValue} readOnly />
      </form>
    </section>
  );
}
