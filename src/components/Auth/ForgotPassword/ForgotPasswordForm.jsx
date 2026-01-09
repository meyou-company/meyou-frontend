import { useMemo, useState } from "react";
import { EMAIL_REGEX } from "../../../utils/validationRegister";
import "./ForgotPasswordForm.scss";

export default function ForgotPasswordForm({ onBack, onSuccess }) {
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
  }, [form]);

  const fieldError = (key) => (touched[key] ? errors[key] : "");
  const isFieldError = (key) => Boolean(fieldError(key));

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setSubmitError("");
  };

  const onBlur = (e) =>
    setTouched((p) => ({ ...p, [e.target.name]: true }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    setTouched({ email: true });
    if (errors.email) return;

    try {
      setIsSubmitting(true);

      // TODO: тут буде реальний запит на бекенд "send reset code"
      await new Promise((r) => setTimeout(r, 500));

      onSuccess?.();
    } catch (err) {
      setSubmitError("Ошибка отправки кода. Попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="forgot auth">
      {/* back arrow — GLOBAL */}
      <button type="button" className="back-arrow" onClick={onBack} aria-label="Назад">
        <img src="/icon1/Vector.png" alt="" aria-hidden="true" className="back-arrow__icon" />
      </button>

      {/* logo */}
      <div className="forgot__logoCard" aria-hidden="true">
        <img className="forgot__logoImg" src="/Logo/photo.png" alt="Me You logo" />
      </div>

      <h1 className="forgot__title">Смена пароля</h1>

      <form className="forgot__form" onSubmit={onSubmit} noValidate>
        <div className={`authField ${isFieldError("email") ? "is-error" : ""}`}>
          <div className="authField__control">
            <span className="authField__iconLeft" aria-hidden="true">
              <img className="authField__iconImg" src="/icon1/emeil.png" alt="" aria-hidden="true" />
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

          {touched.email && <p className="authField__hint">{fieldError("email")}</p>}
        </div>

        {submitError && <div className="forgot__error">{submitError}</div>}

        {/* кнопка — GLOBAL */}
        <button type="submit" className="btn-gradient btn-gradient--forgot" disabled={isSubmitting}>
          {isSubmitting ? "Отправка..." : "Подтвердить"}
        </button>
      </form>
    </section>
  );
}
