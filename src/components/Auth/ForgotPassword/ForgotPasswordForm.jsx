import { useMemo, useState } from "react";
import "./ForgotPasswordForm.scss";
import { useAuthStore } from "../../../zustand/useAuthStore";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export default function ForgotPasswordForm({ onBack, onSuccess }) {
  const forgotPassword = useAuthStore((s) => s.forgotPassword);

  const [form, setForm] = useState({ email: "" });
  const [touched, setTouched] = useState({ email: false });
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errors = useMemo(() => {
    const e = {};
    const email = (form.email || "").trim();

    if (!email) e.email = "Введите E-mail";
    else if (!EMAIL_REGEX.test(email)) e.email = "Введите корректный E-mail";

    return e;
  }, [form.email]);

  const fieldError = (key) => (touched[key] ? errors[key] : "");
  const isFieldError = (key) => Boolean(fieldError(key));

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setSubmitError("");
  };

  const onBlur = (e) => setTouched((p) => ({ ...p, [e.target.name]: true }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    setTouched({ email: true });
    if (errors.email) return;

    const email = form.email.trim();

    try {
      setIsSubmitting(true);

      // store очікує forgotPassword(email: string)
      const res = await forgotPassword(email);

      if (!res?.ok) {
        const msg =
          res?.error?.response?.data?.message?.[0] ||
          res?.error?.response?.data?.message ||
          res?.error?.message ||
          "Ошибка отправки кода. Попробуйте ещё раз.";
        setSubmitError(msg);
        return;
      }

      // ✅ важливо: передаємо email в onSuccess
      onSuccess?.(email);
    } catch (err) {
      const msg =
        err?.response?.data?.message?.[0] ||
        err?.response?.data?.message ||
        err?.message ||
        "Ошибка отправки кода. Попробуйте ещё раз.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="forgot auth">
      <button
        type="button"
        className="back-arrow"
        onClick={onBack}
        aria-label="Назад"
      >
        <img
          src="/icon1/Vector.png"
          alt=""
          aria-hidden="true"
          className="back-arrow__icon"
        />
      </button>

      <div className="forgot__logoCard" aria-hidden="true">
        <img className="forgot__logoImg" src="/Logo/photo.png" alt="Me You logo" />
      </div>

      <h1 className="forgot__title">Смена пароля</h1>

      <form className="forgot__form" onSubmit={onSubmit} noValidate>
        <div className={`authField ${isFieldError("email") ? "is-error" : ""}`}>
          <div className="authField__control">
            <span className="authField__iconLeft" aria-hidden="true">
              <img
                className="authField__iconImg"
                src="/icon1/emeil.png"
                alt=""
                aria-hidden="true"
              />
            </span>

            <input
              className="authField__input"
              type="email"
              name="email"
              placeholder="Введите Email"
              value={form.email}
              onChange={onChange}
              onBlur={onBlur}
              autoComplete="email"
              required
            />
          </div>

          {touched.email && (
            <p className="authField__hint">{fieldError("email")}</p>
          )}
        </div>

        {submitError && <div className="forgot__error">{submitError}</div>}

        <button
          type="submit"
          className="btn-gradient btn-gradient--forgot"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Отправка..." : "Подтвердить"}
        </button>
      </form>
    </section>
  );
}
