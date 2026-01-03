import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../zustand/useAuthStore";
import { validateRegister, isEmptyErrors } from "../../utils/validationRegister";
import "./Register.scss";

export default function Register() {
  const navigate = useNavigate();
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

  // ✅ щоб підказки зʼявлялись тільки коли користувач взаємодіє з полем
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

  const errors = useMemo(() => validateRegister(form), [form]);

  const handleGoogle = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

  const markTouched = (name) =>
    setTouched((prev) => ({ ...prev, [name]: true }));

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setSubmitError("");
  };

  const onFocus = (e) => {
    const name = e.target.name;
    setFocused((prev) => ({ ...prev, [name]: true }));
  };

  const onBlur = (e) => {
    const name = e.target.name;
    setFocused((prev) => ({ ...prev, [name]: false }));
    markTouched(name);
  };

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

    const currentErrors = validateRegister(form);
    if (!isEmptyErrors(currentErrors)) {
      setSubmitError(currentErrors.acceptPolicy || "Перевірте, будь ласка, форму");
      return;
    }

    const payload = {
      firstName: form.firstName.trim(),
      email: form.email.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword,
    };

    try {
      setIsSubmitting(true);
      await register(payload);
      navigate("/");
    } catch (err) {
      const msg =
        err?.response?.data?.message?.[0] ||
        err?.response?.data?.message ||
        err?.message ||
        "Помилка реєстрації";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldError = (key) => (touched[key] ? errors[key] : "");
  const isFieldError = (key) => Boolean(fieldError(key));

  // ✅ показувати підказку тільки якщо: focus || touched || є текст
  const shouldShowHint = (key) =>
    Boolean(focused[key]) || Boolean(touched[key]) || String(form[key] ?? "").length > 0;

  return (
    <section className="auth auth--register">
      {/* back arrow */}
      <button
        type="button"
        className="auth__back"
        onClick={() => navigate(-1)}
        aria-label="Назад"
      >
        <img
          src="/icon1/Vector.png"
          alt=""
          aria-hidden="true"
          className="auth__backIcon"
        />
      </button>

      {/* logo */}
      <div className="auth__logoCard" aria-hidden="true">
        <img className="auth__logoImg" src="/Logo/photo.png" alt="Me You logo" />
      </div>

      <h1 className="auth__title">Регистрация</h1>

      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {/* First name */}
        <div className={`authField ${isFieldError("firstName") ? "is-error" : ""}`}>
          <div className="authField__control">
            <span className="authField__iconLeft" aria-hidden="true">
              <img className="authField__iconImg" src="/icon1/name.png" alt="" aria-hidden="true" />
            </span>

            <input
              className="authField__input"
              type="text"
              name="firstName"
              placeholder="Введите имя"
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
              {fieldError("firstName") ||
                "Введите ваше имя. Имя может содержать буквы, пробелы и цифры."}
            </p>
          )}
        </div>

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
              onFocus={onFocus}
              onBlur={onBlur}
              autoComplete="email"
              required
            />
          </div>

          {shouldShowHint("email") && (
            <p className="authField__hint">{fieldError("email") || "Введите E-mail"}</p>
          )}
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
              onFocus={onFocus}
              onBlur={onBlur}
              autoComplete="new-password"
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

          {shouldShowHint("password") && (
            <p className="authField__hint">
              {fieldError("password") || "*пароль должен содержать не менее 8 символов"}
            </p>
          )}
        </div>

        {/* Confirm password */}
        <div className={`authField ${isFieldError("confirmPassword") ? "is-error" : ""}`}>
          <div className="authField__control">
            <span className="authField__iconLeft" aria-hidden="true">
              <img className="authField__iconImg" src="/icon1/password.png" alt="" aria-hidden="true" />
            </span>

            <input
              className="authField__input"
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Повторно ввести пароль"
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
              aria-label={showConfirmPassword ? "Сховати пароль" : "Показати пароль"}
              onClick={() => setShowConfirmPassword((v) => !v)}
            >
              <img
                src={showConfirmPassword ? "/icon1/oko-off.png" : "/icon1/oko.png"}
                alt=""
                aria-hidden="true"
                className="authField__iconImg"
              />
            </button>
          </div>

          {shouldShowHint("confirmPassword") && (
            <p className="authField__hint">
              {fieldError("confirmPassword") || "*пожалуйста, подтвердите ваш пароль"}
            </p>
          )}
        </div>

        {/* Policy */}
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
            Нажимая на кнопку «Регистрация», вы принимаете Политику конфиденциальности и
            Условия использования.
          </p>
        </div>

        {/* submit error */}
        {submitError && <div className="auth__error">{submitError}</div>}

        <div className="authActions">
          <button
            className="btn-gradient btn-gradient--auth-primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Создание..." : "Создать аккаунт"}
          </button>

          <button
            type="button"
            className="btn-gradient btn-gradient--auth-google"
            onClick={handleGoogle}
            aria-label="Sign in with Google"
          >
            <img src="/icon1/google.png" alt="Google" className="google-auth-btn__icon" />
          </button>
        </div>

        <button
          type="button"
          className="btn-gradient btn-gradient--auth-bottom"
          onClick={() => navigate("/login")}
        >
          У меня есть аккаунт
        </button>
      </form>
    </section>
  );
}
