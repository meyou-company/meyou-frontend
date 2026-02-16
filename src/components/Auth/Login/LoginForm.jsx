import { useMemo, useState } from "react";
import { toast } from "sonner";
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

  const handleGoogle = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

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

      if (res?.ok) {
        toast.success("Успішний вхід");
        onSuccess?.();
      } else {
        const msg =
          res?.error?.response?.data?.message?.[0] ||
          res?.error?.response?.data?.message ||
          res?.error?.message ||
          "Помилка входу";
        toast.error(msg);
        setSubmitError(msg);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message?.[0] ||
        err?.response?.data?.message ||
        err?.message ||
        "Помилка входу";
      toast.error(msg);
      setSubmitError(msg || "Щось пішло не так");
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

        <div className="authActions">
          <button className="btn-gradient btn-gradient--auth-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Вход..." : "Войти"}
          </button>
          <button type="button" className="btn-gradient btn-gradient--auth-google" onClick={handleGoogle}>
            <img src="/icon1/google.png" alt="Google" className="google-auth-btn__icon" />
          </button>
        </div>
      </form>
    </section>
  );
}
