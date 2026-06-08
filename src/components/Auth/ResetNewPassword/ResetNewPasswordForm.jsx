import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { PASSWORD_REGEX } from "../../../utils/validationRegister";
import { useForceDarkTheme } from "../../../hooks/useForceDarkTheme";
import "./ResetNewPasswordForm.scss";

export default function ResetNewPasswordForm({ onBack, onSuccess }) {
  useForceDarkTheme();
  const { t } = useTranslation();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [touched, setTouched] = useState({ password: false, confirmPassword: false });
  const [show, setShow] = useState({ password: false, confirmPassword: false });

  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errors = useMemo(() => {
    const e = {};
    const passwordHint = t("auth.validation.passwordHint");

    if (!form.password.trim()) e.password = t("auth.resetPassword.errors.passwordRequired");
    else if (!PASSWORD_REGEX.test(form.password)) e.password = passwordHint;

    if (!form.confirmPassword.trim()) e.confirmPassword = t("auth.resetPassword.errors.confirmRequired");
    else if (form.confirmPassword !== form.password)
      e.confirmPassword = t("auth.resetPassword.errors.mismatch");

    return e;
  }, [form, t]);

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
      await new Promise((r) => setTimeout(r, 600));

      toast.success(t("auth.resetPassword.toastSuccess"));
      onSuccess?.();
    } catch {
      const msg = t("auth.resetPassword.errors.saveFailed");
      toast.error(msg);
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordHint = t("auth.validation.passwordHint");

  return (
    <section className="auth auth--login">
      <button type="button" className="back-arrow" onClick={onBack} aria-label={t("common.back")}>
        <img src="/icon1/Vector.png" alt="" aria-hidden="true" className="back-arrow__icon" />
      </button>

      <div className="auth__logoCard" aria-hidden="true">
        <img className="auth__logoImg" src="/Logo/photo.png" alt={t("auth.common.logoAlt")} />
      </div>

      <h1 className="auth__title">{t("auth.resetPassword.title")}</h1>

      <form className="auth__form" onSubmit={onSubmit} noValidate>
        <div className={`authField ${isFieldError("password") ? "is-error" : ""}`}>
          <div className="authField__control">
            <span className="authField__iconLeft" aria-hidden="true">
              <img className="authField__iconImg" src="/icon1/password.svg" alt="" aria-hidden="true" />
            </span>

            <input
              className="authField__input"
              type={show.password ? "text" : "password"}
              name="password"
              placeholder={t("auth.resetPassword.passwordPlaceholder")}
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
              aria-label={show.password ? t("auth.common.hidePassword") : t("auth.common.showPassword")}
            >
              <img
                className="authField__iconImg"
                src={show.password ? "/icon1/oko-off.svg" : "/icon1/oko.svg"}
                alt=""
                aria-hidden="true"
              />
            </button>
          </div>

          {touched.password && fieldError("password") ? (
            <p className="authField__hint">{fieldError("password")}</p>
          ) : (
            <p className="authField__hint">{passwordHint}</p>
          )}
        </div>

        <div className={`authField ${isFieldError("confirmPassword") ? "is-error" : ""}`}>
          <div className="authField__control">
            <span className="authField__iconLeft" aria-hidden="true">
              <img className="authField__iconImg" src="/icon1/password.svg" alt="" aria-hidden="true" />
            </span>

            <input
              className="authField__input"
              type={show.confirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder={t("auth.resetPassword.confirmPasswordPlaceholder")}
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
              aria-label={
                show.confirmPassword ? t("auth.common.hidePassword") : t("auth.common.showPassword")
              }
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

        <button type="submit" className="btn-gradient btn-gradient--auth-single" disabled={isSubmitting}>
          {isSubmitting ? t("auth.resetPassword.submitting") : t("auth.resetPassword.submit")}
        </button>
      </form>
    </section>
  );
}
