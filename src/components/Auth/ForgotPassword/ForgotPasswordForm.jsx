import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import "./ForgotPasswordForm.scss";
import { useAuthStore } from "../../../zustand/useAuthStore";
import { useForceDarkTheme } from "../../../hooks/useForceDarkTheme";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage";
import { EMAIL_REGEX } from "../../../utils/validationRegister";

export default function ForgotPasswordForm({ onBack, onSuccess }) {
  useForceDarkTheme();
  const { t } = useTranslation();
  const forgotPassword = useAuthStore((s) => s.forgotPassword);

  const [form, setForm] = useState({ email: "" });
  const [touched, setTouched] = useState({ email: false });
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errors = useMemo(() => {
    const e = {};
    const email = (form.email || "").trim();

    if (!email) e.email = t("auth.forgotPassword.errors.emailRequired");
    else if (!EMAIL_REGEX.test(email)) e.email = t("auth.forgotPassword.errors.emailInvalid");

    return e;
  }, [form.email, t]);

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
      const res = await forgotPassword(email);

      if (!res?.ok) {
        const msg = getApiErrorMessage(res?.error) || t("auth.forgotPassword.errors.sendFailed");
        toast.error(msg);
        setSubmitError(msg);
        return;
      }

      toast.success(t("auth.forgotPassword.toastSuccess"));
      onSuccess?.(email);
    } catch (err) {
      const msg = getApiErrorMessage(err) || t("auth.forgotPassword.errors.sendFailed");
      toast.error(msg);
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="forgot auth">
      <button type="button" className="back-arrow" onClick={onBack} aria-label={t("common.back")}>
        <img src="/icon1/Vector.png" alt="" aria-hidden="true" className="back-arrow__icon" />
      </button>

      <div className="forgot__logoCard" aria-hidden="true">
        <img className="forgot__logoImg" src="/Logo/photo.png" alt={t("auth.common.logoAlt")} />
      </div>

      <h1 className="forgot__title">{t("auth.forgotPassword.title")}</h1>

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
              placeholder={t("auth.forgotPassword.emailPlaceholder")}
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

        <button type="submit" className="btn-gradient btn-gradient--forgot" disabled={isSubmitting}>
          {isSubmitting ? t("auth.forgotPassword.submitting") : t("auth.forgotPassword.submit")}
        </button>
      </form>
    </section>
  );
}
