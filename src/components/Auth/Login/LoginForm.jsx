import { useMemo, useState } from "react";
import { useAuthStore } from "../../../zustand/useAuthStore";
import { useForceDarkTheme } from "../../../hooks/useForceDarkTheme";
import "./LoginForm.scss";

export default function LoginForm({ onBack, onForgot, onSuccess }) {
  useForceDarkTheme();
  const login = useAuthStore((s) => s.login);

  const [form, setForm] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitError, setSubmitError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errors = useMemo(() => {
    const e = {};
    if (!form.email.trim()) e.email = "Введите E-mail";
    if (!form.password) e.password = "Введите пароль";
    return e;
  }, [form]);

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

    setTouched({ email: true, password: true });
    if (errors.email || errors.password) return;

    try {
      setIsSubmitting(true);
      const res = await login({
        email: form.email.trim(),
        password: form.password,
      });

      if (res?.ok) onSuccess?.();
      else {
        const msg =
          res?.error?.response?.data?.message?.[0] ||
          res?.error?.response?.data?.message ||
          res?.error?.message ||
          "Помилка входу";
        setSubmitError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth auth--login">
      {/* back arrow (GLOBAL) */}
      <button type="button" className="back-arrow" onClick={onBack} aria-label="Назад">
        <img src="/icon1/Vector.png" alt="" aria-hidden="true" className="back-arrow__icon" />
      </button>

      {/* logo */}
      <div className="auth__logoCard" aria-hidden="true">
        <img className="auth__logoImg" src="/Logo/photo.png" alt="Me You logo" />
      </div>

      <h1 className="auth__title auth__title--login">Вход</h1>

      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {/* Email */}
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

        {/* Password */}
        <div className={`authField ${isFieldError("password") ? "is-error" : ""}`}>
          <div className="authField__control">
            <span className="authField__iconLeft" aria-hidden="true">
              <img className="authField__iconImg" src="/icon1/password.png" alt="" aria-hidden="true" />
            </span>

            <input
              className="authField__input"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Введите пароль"
              value={form.password}
              onChange={onChange}
              onBlur={onBlur}
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              className="authField__iconRight"
              aria-label={showPassword ? "Сховати пароль" : "Показати пароль"}
              onClick={() => setShowPassword((v) => !v)}
            >
              <img
                src={showPassword ? "/icon1/oko-off.png" : "/icon1/oko.png"}
                alt=""
                aria-hidden="true"
                className="authField__iconImg"
              />
            </button>
          </div>

          {touched.password && <p className="authField__hint">{fieldError("password")}</p>}
        </div>

        {/* Forgot */}
        <button type="button" className="authForgot" onClick={onForgot}>
          Забули пароль?
        </button>

        {submitError && <div className="auth__error">{submitError}</div>}

        <button className="btn-gradient btn-gradient--auth-single" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Вход..." : "Войти"}
        </button>
      </form>
    </section>
  );
}
