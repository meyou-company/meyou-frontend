import { useMemo, useState } from "react";
import "./CompleteProfileForm.scss";
import { profileApi } from "../../../../services/profileApi";
import { useAuthStore } from "../../../../zustand/useAuthStore";

export default function CompleteProfileForm({ onBack, onSuccess }) {
  const refreshMe = useAuthStore((s) => s.refreshMe);

  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    phone: "",
    nationality: "",
    username: "",
    about: "",
    hobbies: "",
    maritalStatus: "",
    country: "",
    city: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const canSubmit = useMemo(() => {
    return form.firstName.trim().length > 0 && form.lastName.trim().length > 0;
  }, [form.firstName, form.lastName]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setSubmitError("");
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!canSubmit) {
      setSubmitError("Заповніть, будь ласка, ім’я та прізвище");
      return;
    }

    const payload = {
      lastName: form.lastName.trim(),
      firstName: form.firstName.trim(),
      phone: form.phone.trim() || null,
      nationality: form.nationality.trim() || null,
      username: form.username.trim() || null,
      about: form.about.trim() || null,
      hobbies: form.hobbies ? [form.hobbies] : [],
      maritalStatus: form.maritalStatus || null,
      country: form.country || null,
      city: form.city || null,
    };

    try {
      setIsSubmitting(true);

      await profileApi.completeProfile(payload);
      await refreshMe();

      onSuccess?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message?.[0] ||
        err?.response?.data?.message ||
        err?.message ||
        "Помилка збереження профілю";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="complete-profile">
      <header className="complete-profile__header">
        <button
          type="button"
          className="complete-profile__back"
          onClick={onBack}
          aria-label="Назад"
        >
          ←
        </button>

      </header>

      <main className="complete-profile__content">
        <h1 className="complete-profile__title">Профіль</h1>

        <div className="complete-profile__avatar">
          <div className="complete-profile__avatar-circle" />
          <button type="button" className="complete-profile__avatar-btn">
            Додати фото профілю
          </button>
         
        </div>

        <form className="complete-profile__form" onSubmit={handleSubmit}>
          <input
            className="complete-profile__input"
            name="lastName"
            value={form.lastName}
            onChange={onChange}
            placeholder="Прізвище"
          />
          <input
            className="complete-profile__input"
            name="firstName"
            value={form.firstName}
            onChange={onChange}
            placeholder="Ім’я"
          />
          <input
            className="complete-profile__input"
            name="phone"
            value={form.phone}
            onChange={onChange}
            placeholder="Номер телефону"
          />
          <input
            className="complete-profile__input"
            name="nationality"
            value={form.nationality}
            onChange={onChange}
            placeholder="Національність"
          />
          <input
            className="complete-profile__input"
            name="username"
            value={form.username}
            onChange={onChange}
            placeholder="Нік"
          />
          <textarea
            className="complete-profile__textarea"
            name="about"
            value={form.about}
            onChange={onChange}
            placeholder="Про себе"
          />

          <select
            className="complete-profile__select"
            name="hobbies"
            value={form.hobbies}
            onChange={onChange}
          >
            <option value="">Хобі</option>
            <option value="sport">Спорт</option>
            <option value="music">Музика</option>
            <option value="travel">Подорожі</option>
          </select>

          <select
            className="complete-profile__select"
            name="maritalStatus"
            value={form.maritalStatus}
            onChange={onChange}
          >
            <option value="">Сімейне положення</option>
            <option value="single">Не одружений/не заміжня</option>
            <option value="married">Одружений/заміжня</option>
          </select>

          <div className="complete-profile__row2">
            <select
              className="complete-profile__select"
              name="country"
              value={form.country}
              onChange={onChange}
            >
              <option value="">Країна</option>
              <option value="ua">Україна</option>
              <option value="es">Іспанія</option>
            </select>

            <select
              className="complete-profile__select"
              name="city"
              value={form.city}
              onChange={onChange}
            >
              <option value="">Місто</option>
              <option value="kyiv">Київ</option>
              <option value="barcelona">Барселона</option>
            </select>
          </div>

          {submitError && <div className="complete-profile__error">{submitError}</div>}

          <button
            className="complete-profile__save"
            type="submit"
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting ? "Збереження..." : "Зберегти"}
          </button>
        </form>
      </main>
    </div>
  );
}