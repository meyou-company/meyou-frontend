import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PASSWORD_REGEX } from "../../../utils/validationRegister";
import { useForceDarkTheme } from "../../../hooks/useForceDarkTheme";
import "./ResetNewPasswordForm.scss";

export default function ResetNewPasswordForm({ onBack, onSuccess }) {
  useForceDarkTheme();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [touched, setTouched] = useState({ password: false, confirmPassword: false });
  const [show, setShow] = useState({ password: false, confirmPassword: false });

  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errors = useMemo(() => {
    const e = {};

    if (!form.password.trim()) e.password = "Введите новый пароль";
    else if (!PASSWORD_REGEX.test(form.password))
      e.password = "Минимум 8 символов, 1 буква и 1 цифра";

    if (!form.confirmPassword.trim()) e.confirmPassword = "Повторите пароль";
    else if (form.confirmPassword !== form.password) e.confirmPassword = "Пароли не совпадают";

    return e;
  }, [form]);

  const fieldError = (key) => (touched[key] ? errors[key] : "");
  const isFieldError = (key) => Boolean(fieldError(key));
  const isValid = Object.keys(errors).length === 0;

  const onChange = (e) => {
    const { name, value } = e.target;
    setSubmitError("");
    setForm((p) => ({ ...p, [name]: value }));
  };

  const onBlur = (e) => {
    const { name } = e.target;
    setTouched((p) => ({ ...p, [name]: true }));
  };

  const toggle = (key) => setShow((p) => ({ ...p, [key]: !p[key] }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setTouched({ password: true, confirmPassword: true });

    if (!isValid) return;

    try {
      setIsSubmitting(true);

      // TODO: backend "reset password"
      await new Promise((r) => setTimeout(r, 600));

      toast.success("Пароль змінено");
      onSuccess?.();
    } catch {
      const msg = "Ошибка. Попробуйте ещё раз.";
      toast.error(msg);
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth auth--login">
      {/* back arrow — GLOBAL */}
      <button type="button" className="back-arrow" onClick={onBack} aria-label="Назад">
        <img src="/icon1/Vector.png" alt="" aria-hidden="true" className="back-arrow__icon" />
      </button>

      {/* logo — GLOBAL */}
      <div className="auth__logoCard" aria-hidden="true">
        <img className="auth__logoImg" src="/Logo/photo.png" alt="Me You logo" />
      </div>

      <h1 className="auth__title">Смена пароля</h1>

      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {/* New password */}
        <div className={`authField ${isFieldError("password") ? "is-error" : ""}`}>
          <div className="authField__control">
            <span className="authField__iconLeft" aria-hidden="true">
              <img className="authField__iconImg" src="/icon1/password.svg" alt="" aria-hidden="true" />
            </span>

            <input
              className="authField__input"
              type={show.password ? "text" : "password"}
              name="password"
              placeholder="Введите новый пароль"
              value={form.password}
              onChange={onChange}
              onBlur={onBlur}
              autoComplete="new-password"
              required
            />

            <button
              type="button"
              className="authField__iconRight"
              onClick={() => toggle("password")}
              aria-label={show.password ? "Скрыть пароль" : "Показать пароль"}
            >
              <img
                className="authField__iconImg"
                src={show.password ? "/icon1/oko-off.svg" : "/icon1/oko.svg"}
                alt=""
                aria-hidden="true"
              />
            </button>
          </div>

          {touched.password && <p className="authField__hint">{fieldError("password")}</p>}
        </div>

        {/* Confirm password */}
        <div className={`authField ${isFieldError("confirmPassword") ? "is-error" : ""}`}>
          <div className="authField__control">
            <span className="authField__iconLeft" aria-hidden="true">
              <img className="authField__iconImg" src="/icon1/password.svg" alt="" aria-hidden="true" />
            </span>

            <input
              className="authField__input"
              type={show.confirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Повторите пароль"
              value={form.confirmPassword}
              onChange={onChange}
              onBlur={onBlur}
              autoComplete="new-password"
              required
            />

            <button
              type="button"
              className="authField__iconRight"
              onClick={() => toggle("confirmPassword")}
              aria-label={show.confirmPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              <img
                className="authField__iconImg"
                src={show.confirmPassword ? "/icon1/oko-off.svg" : "/icon1/oko.svg"}
                alt=""
                aria-hidden="true"
              />
            </button>
          </div>

          {touched.confirmPassword && (
            <p className="authField__hint">{fieldError("confirmPassword")}</p>
          )}
        </div>

        {submitError && <div className="auth__error">{submitError}</div>}

        {/* кнопка — GLOBAL */}
        <button
          type="submit"
          className="btn-gradient btn-gradient--auth-single"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Сохранение..." : "Сохранить"}
        </button>
      </form>
    </section>
  );
}
