import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuthStore } from "../../../zustand/useAuthStore";
import { resolvedApiBaseUrl } from "../../../services/api";
import { useForceDarkTheme } from "../../../hooks/useForceDarkTheme";
import {
  validateRegister,
  translateRegisterValidation,
  isEmptyErrors,
} from "../../../utils/validationRegister";
import { getApiErrorMessage } from "../../../utils/getApiErrorMessage";
import LanguageSwitcher from "../../LanguageSwitcher/LanguageSwitcher";
import "./RegisterForm.scss";

export default function RegisterForm({ onBack, onGoLogin, onSuccess }) {
  useForceDarkTheme();
  const { t, i18n } = useTranslation();
  const register = useAuthStore((s) => s.register);

  const [form, setForm] = useState({
    firstName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptPolicy: false,
  });

  const [touched, setTouched] = useState({
    firstName: false,
    email: false,
    password: false,
    confirmPassword: false,
    acceptPolicy: false,
  });

  const [focused, setFocused] = useState({
    firstName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [submitError, setSubmitError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errorCodes = useMemo(() => validateRegister(form), [form]);
  const errors = useMemo(
    () => translateRegisterValidation(errorCodes, t),
    [errorCodes, t],
  );

  const handleGoogle = () => {
    if (!form.acceptPolicy) {
      setTouched((prev) => ({ ...prev, acceptPolicy: true }));
      setSubmitError(t("auth.validation.acceptPolicy"));
      return;
    }
    window.location.href = `${resolvedApiBaseUrl}/auth/google`;
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setSubmitError("");
  };

  const onFocus = (e) => {
    const name = e.target.name;
    setFocused((prev) => ({ ...prev, [name]: true }));
  };

  const onBlur = (e) => {
    const name = e.target.name;
    setFocused((prev) => ({ ...prev, [name]: false }));
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const fieldError = (key) => (touched[key] ? errors[key] : "");
  const isFieldError = (key) => Boolean(fieldError(key));
  const shouldShowHint = (key) =>
    Boolean(focused[key]) || Boolean(touched[key]) || String(form[key] ?? "").length > 0;

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    setTouched({
      firstName: true,
      email: true,
      password: true,
      confirmPassword: true,
      acceptPolicy: true,
    });

    const currentErrors = translateRegisterValidation(validateRegister(form), t);
    if (!isEmptyErrors(validateRegister(form))) {
      setSubmitError(currentErrors.acceptPolicy || t("auth.register.errors.checkForm"));
      return;
    }

    const payload = {
      firstName: form.firstName.trim(),
      email: form.email.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword,
      acceptedTerms: true,
      language: (i18n.language || 'uk').split('-')[0].toLowerCase(),
    };

    setIsSubmitting(true);

    try {
      const res = await register(payload);

      if (!res?.ok) {
        const msg = getApiErrorMessage(res?.error) || t("auth.register.errors.registerFailed");
        toast.error(msg);
        setSubmitError(msg);
        return;
      }

      toast.success(t("auth.register.toastSuccess"));
      onSuccess?.();
    } catch (err) {
      const msg = getApiErrorMessage(err) || t("auth.register.errors.registerFailed");
      toast.error(msg);
      setSubmitError(msg || t("auth.common.somethingWentWrong"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordHint = `*${t("auth.validation.passwordHint")}`;

  return (
    <section className="auth auth--register">
      <div className="auth__langSwitchWrap">
        <LanguageSwitcher />
      </div>
      <button type="button" className="back-arrow" onClick={onBack} aria-label={t("common.back")}>
        <img src="/icon1/Vector.png" alt="" aria-hidden="true" className="back-arrow__icon" />
      </button>

      <div className="auth__logoCard" aria-hidden="true">
        <img className="auth__logoImg" src="/Logo/photo.png" alt={t("auth.common.logoAlt")} />
      </div>

      <h1 className="auth__title">{t("auth.register.title")}</h1>

      <form className="auth__form" onSubmit={onSubmit} noValidate>
        <div className={`authField ${isFieldError("firstName") ? "is-error" : ""}`}>
          <div className="authField__control">
            <span className="authField__iconLeft" aria-hidden="true">
              <img className="authField__iconImg" src="/icon1/name.png" alt="" aria-hidden="true" />
            </span>

            <input
              className="authField__input"
              type="text"
              name="firstName"
              placeholder={t("auth.register.firstNamePlaceholder")}
              value={form.firstName}
              onChange={onChange}
              onFocus={onFocus}
              onBlur={onBlur}
              autoComplete="name"
              required
            />
          </div>

          {shouldShowHint("firstName") && (
            <p className="authField__hint">
              {fieldError("firstName") || t("auth.register.firstNameHint")}
            </p>
          )}
        </div>

        <div className={`authField ${isFieldError("email") ? "is-error" : ""}`}>
          <div className="authField__control">
            <span className="authField__iconLeft" aria-hidden="true">
              <img className="authField__iconImg" src="/icon1/emeil.png" alt="" aria-hidden="true" />
            </span>

            <input
              className="authField__input"
              type="email"
              name="email"
              placeholder={t("auth.register.emailPlaceholder")}
              value={form.email}
              onChange={onChange}
              onFocus={onFocus}
              onBlur={onBlur}
              autoComplete="email"
              required
            />
          </div>

          {shouldShowHint("email") && (
            <p className="authField__hint">{fieldError("email") || t("auth.register.emailHint")}</p>
          )}
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
              placeholder={t("auth.register.passwordPlaceholder")}
              value={form.password}
              onChange={onChange}
              onFocus={onFocus}
              onBlur={onBlur}
              autoComplete="new-password"
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

          {shouldShowHint("password") && (
            <p className="authField__hint">{fieldError("password") || passwordHint}</p>
          )}
        </div>

        <div className={`authField ${isFieldError("confirmPassword") ? "is-error" : ""}`}>
          <div className="authField__control">
            <span className="authField__iconLeft" aria-hidden="true">
              <img className="authField__iconImg" src="/icon1/password.svg" alt="" aria-hidden="true" />
            </span>

            <input
              className="authField__input"
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder={t("auth.register.confirmPasswordPlaceholder")}
              value={form.confirmPassword}
              onChange={onChange}
              onFocus={onFocus}
              onBlur={onBlur}
              autoComplete="new-password"
              required
            />

            <button
              type="button"
              className="authField__iconRight"
              aria-label={
                showConfirmPassword ? t("auth.common.hidePassword") : t("auth.common.showPassword")
              }
              onClick={() => setShowConfirmPassword((v) => !v)}
            >
              <img
                src={showConfirmPassword ? "/icon1/oko-off.svg" : "/icon1/oko.svg"}
                alt=""
                aria-hidden="true"
                className="authField__iconImg"
              />
            </button>
          </div>

          {shouldShowHint("confirmPassword") && (
            <p className="authField__hint">
              {fieldError("confirmPassword") || t("auth.register.confirmPasswordHint")}
            </p>
          )}
        </div>

        <div className={`authPolicy ${touched.acceptPolicy && errors.acceptPolicy ? "is-error" : ""}`}>
          <input
            className="authPolicy__checkbox"
            type="checkbox"
            name="acceptPolicy"
            checked={form.acceptPolicy}
            onChange={onChange}
            onBlur={onBlur}
          />
          <p className="authPolicy__text">
            {t("auth.register.policyPrefix")}{" "}
            <Link className="authPolicy__link" to="/legal/privacy">
              {t("auth.register.policyPrivacyLink")}
            </Link>{" "}
            {t("auth.register.policyAnd")}{" "}
            <Link className="authPolicy__link" to="/legal/terms">
              {t("auth.register.policyTermsLink")}
            </Link>
            .
          </p>
        </div>

        {submitError && <div className="auth__error">{submitError}</div>}

        <div className="authActions">
          <button className="btn-gradient btn-gradient--auth-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("auth.register.submitting") : t("auth.register.submit")}
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

        <button type="button" className="btn-gradient btn-gradient--auth-bottom" onClick={onGoLogin}>
          {t("auth.register.hasAccount")}
        </button>
      </form>
    </section>
  );
}
