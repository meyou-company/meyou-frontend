import { useEffect } from "react";
import { profileApi } from "../services/profileApi.js";

export function usePrefillProfile({
  setProfileCompleted,
  setValues,
  interestOptions,
  hobbyOptions,
  maritalStatusOptions,
  setCityOptions,
  setIsCitiesLoading,
  locationApi,
}) {
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await profileApi.getProfileStatus(); // { profileCompleted, user }
        if (!alive || !res?.user) return;

        setProfileCompleted(Boolean(res.profileCompleted));
        const u = res.user;

        const interestsSelected = Array.isArray(u.interests) && interestOptions
          ? interestOptions.filter((o) => u.interests.includes(o.value))
          : [];

        const hobbiesSelected = Array.isArray(u.hobbies) && hobbyOptions
          ? hobbyOptions.filter((o) => u.hobbies.includes(o.value))
          : [];

        const maritalSelected =
          maritalStatusOptions.find((o) => o.value === u.maritalStatus) || null;

        const countrySelected = u.country ? { value: u.country, label: u.country } : null;
        const citySelected = u.city ? { value: u.city, label: u.city } : null;

        const rawBirth = u.birthDate || u.birth_date;
        const birthDate =
          rawBirth
            ? (typeof rawBirth === "string" && /^\d{4}-\d{2}-\d{2}/.test(rawBirth)
                ? rawBirth.slice(0, 10)
                : (() => {
                    const d = new Date(rawBirth);
                    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
                  })())
            : "";

        setValues((prev) => ({
          ...prev,
          firstName: u.firstName || "",
          lastName: u.lastName || "",
          phone: u.phone || "",
          nationality: u.nationality || "",
          username: u.username || "",
          bio: u.bio || "",
          interests: interestsSelected,
          hobbies: hobbiesSelected,
          maritalStatus: maritalSelected,
          country: countrySelected,
          city: citySelected,
          gender: u.gender === "MALE" || u.gender === "FEMALE" ? u.gender : null,
          birthDate: birthDate || "",
        }));

        if (u.country) {
          setIsCitiesLoading(true);
          const cities = await locationApi.getCitiesByCountry(u.country);
          if (!alive) return;
          setCityOptions(cities);
        } else {
          setCityOptions([]);
        }
      } catch {
        // ignore
      } finally {
        alive && setIsCitiesLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);
}
