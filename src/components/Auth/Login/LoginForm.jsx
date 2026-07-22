import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuthStore } from "../../../zustand/useAuthStore";
import { resolvedApiBaseUrl } from "../../../services/api";
import { useForceDarkTheme } from "../../../hooks/useForceDarkTheme";
import { getApiErrorCode, getApiErrorMessage } from "../../../utils/getApiErrorMessage";
import "./LoginForm.scss";

function getLoginErrorMessage(error, t) {
  const status = error?.response?.status || error?.status;
  const code = getApiErrorCode(error);

  if (status === 401 || code === "UNAUTHORIZED") {
    return t("errors.INVALID_CREDENTIALS", {
      defaultValue: t("auth.login.errors.loginFailed"),
    });
  }

  return getApiErrorMessage(error) || t("auth.login.errors.loginFailed");
}

export default function LoginForm({ onBack, onForgot, onSuccess }) {
  useForceDarkTheme();
  const { t } = useTranslation();
  const login = useAuthStore((s) => s.login);

  const [form, setForm] = useState({ email: "", password: "" });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitError, setSubmitError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errors = useMemo(() => {
    const e = {};
    if (!form.email.trim()) e.email = t("auth.login.errors.emailRequired");
    if (!form.password) e.password = t("auth.login.errors.passwordRequired");
    return e;
  }, [form, t]);

  const fieldError = (key) => (touched[key] ? errors[key] : "");
  const isFieldError = (key) => Boolean(fieldError(key));

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setSubmitError("");
  };

  const onBlur = (e) => setTouched((p) => ({ ...p, [e.target.name]: true }));

  const handleGoogle = () => {
    window.location.href = `${resolvedApiBaseUrl}/auth/google`;
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
        toast.success(t("auth.login.toastSuccess"));
        onSuccess?.();
      } else {
        const msg = getLoginErrorMessage(res?.error, t);
        toast.error(msg);
        setSubmitError(msg);
      }
    } catch (err) {
      const msg = getLoginErrorMessage(err, t);
      toast.error(msg);
      setSubmitError(msg || t("auth.common.somethingWentWrong"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth auth--login">
      <button type="button" className="back-arrow" onClick={onBack} aria-label={t("common.back")}>
        <img src="/icon1/Vector.png" alt="" aria-hidden="true" className="back-arrow__icon" />
      </button>

      <div className="auth__logoCard" aria-hidden="true">
        <img className="auth__logoImg" src="/Logo/photo.png" alt={t("auth.common.logoAlt")} />
      </div>

      <h1 className="auth__title auth__title--login">{t("auth.login.title")}</h1>

      <form className="auth__form" onSubmit={onSubmit} noValidate>
        <div className={`authField ${isFieldError("email") ? "is-error" : ""}`}>
          <div className="authField__control">
            <span className="authField__iconLeft" aria-hidden="true">
              <img className="authField__iconImg" src="/icon1/emeil.png" alt="" aria-hidden="true" />
            </span>

            <input
              className="authField__input"
              type="email"
              name="email"
              placeholder={t("auth.login.emailPlaceholder")}
              value={form.email}
              onChange={onChange}
              onBlur={onBlur}
              autoComplete="email"
              required
            />
          </div>

          {touched.email && <p className="authField__hint">{fieldError("email")}</p>}
        </div>

        <div className={`authField ${isFieldError("password") ? "is-error" : ""}`}>
          <div className="authField__control">
            <span className="authField__iconLeft" aria-hidden="true">
              <img className="authField__iconImg" src="/icon1/password.svg" alt="" aria-hidden="true" />
            </span>

            <input
              className="authField__input"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder={t("auth.login.passwordPlaceholder")}
              value={form.password}
              onChange={onChange}
              onBlur={onBlur}
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              className="authField__iconRight"
              aria-label={showPassword ? t("auth.common.hidePassword") : t("auth.common.showPassword")}
              onClick={() => setShowPassword((v) => !v)}
            >
              <img
                src={showPassword ? "/icon1/oko-off.svg" : "/icon1/oko.svg"}
                alt=""
                aria-hidden="true"
                className="authField__iconImg"
              />
            </button>
          </div>

          {touched.password && <p className="authField__hint">{fieldError("password")}</p>}
        </div>

        <button type="button" className="authForgot" onClick={onForgot}>
          {t("auth.login.forgotPassword")}
        </button>

        {submitError && <div className="auth__error">{submitError}</div>}

        <div className="authActions">
          <button className="btn-gradient btn-gradient--auth-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("auth.login.submitting") : t("auth.login.submit")}
          </button>
          <button
            type="button"
            className="btn-gradient btn-gradient--auth-google"
            onClick={handleGoogle}
            aria-label={t("auth.common.googleAlt")}
          >
            <img src="/icon1/google.png" alt="" className="google-auth-btn__icon" aria-hidden="true" />
          </button>
        </div>
      </form>
    </section>
  );
}
