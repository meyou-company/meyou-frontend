import { useEffect } from 'react';

export function usePrefillProfile({
  setProfileCompleted,
  setValues,
  interestOptions,
  hobbiesOptions,
  maritalStatusOptions,
  locationApi,
  profileApi,
}) {
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await profileApi.getProfileStatus(); // { profileCompleted, user }
        console.log(res);
        if (!alive || !res?.user) return;

        const u = res.user;
        setProfileCompleted(Boolean(res.profileCompleted));

        const interestsSelected = Array.isArray(u.interests)
          ? interestOptions.filter((o) => u.interests.includes(o.value))
          : [];

        const hobbiesSelected = Array.isArray(u.hobbies)
          ? hobbiesOptions.filter((o) => u.hobbies.includes(o.value))
          : [];

        const maritalSelected =
          maritalStatusOptions.find((o) => o.value === u.maritalStatus) || null;

        const countrySelected = u.country ? { value: u.country, label: u.country } : null;
        const citySelected = u.city ? { value: u.city, label: u.city } : null;

        const rawBirth = u.birthDate || u.birth_date;
        let birthDate = '';

        if (rawBirth) {
          const d = new Date(rawBirth);
          if (!Number.isNaN(d.getTime())) {
            birthDate = d.toISOString().slice(0, 10);
          }
        }

        setValues((prev) => ({
          ...prev,

          firstName: u.firstName || '',
          lastName: u.lastName || '',
          phone: u.phone || '',

          nationality: u.nationality || '',
          username: u.username || '',

          bio: u.bio || '',
          about: u.about || '',
          profession: u.profession || '',

          interests: interestsSelected,
          hobbies: hobbiesSelected,

          languages: Array.isArray(u.languages) ? u.languages : [],
          languagesInput: Array.isArray(u.languages)
            ? u.languages.join(', ')
            : typeof u.languages === 'string'
              ? u.languages
              : '',

          maritalStatus: maritalSelected,

          country: countrySelected,
          city: citySelected,

          instagram: u.instagram || '',
          telegram: u.telegram || '',
          tiktok: u.tiktok || '',

          gender: u.gender === 'MALE' || u.gender === 'FEMALE' ? u.gender : null,

          birthDate,

          profileVisibility: {
            about: true,
            interests: true,
            hobbies: true,
            languages: true,
            profession: true,
            maritalStatus: true,
            nationality: true,
            location: true,
            instagram: true,
            telegram: true,
            tiktok: true,
            ...u.profileVisibility,
          },
        }));

        // LOCATION PREFILL

        if (!u.country) {
          setValues((prev) => ({
            ...prev,
            city: null,
          }));
          return;
        }

        const cities = await locationApi.getCities(u.country);

        if (!alive) return;

        setValues((prev) => ({
          ...prev,

          city: cities.some((c) => c.value === u.city)
            ? { value: u.city, label: u.city }
            : u.city || null,
        }));
      } catch (e) {
        console.error('usePrefillProfile error:', e);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);
}
