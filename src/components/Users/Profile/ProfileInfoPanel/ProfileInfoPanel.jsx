import { Fragment, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Select from 'react-select';
import { toast } from 'sonner';

import profileIcons from '../../../../constants/profileIcons';
import { interestOptions } from '../../../../constants/interests';
import { useLocationOptions } from '../../../../hooks/useLocationOptions';
import {
  useGenderOptions,
  useMaritalStatusOptions,
} from '../../../../hooks/useProfileFormOptions';
import { profileApi } from '../../../../services/profileApi';
import { getApiErrorMessage } from '../../../../utils/getApiErrorMessage';
import MultiSelect from '../EditProfileForm/MultiSelect';
import ProfileInfoSection from './ProfileInfoSection';
import {
  formatLanguages,
  getAboutText,
  getProfileVisibility,
  getUserInterests,
  parseLanguagesInput,
} from './profileInfoHelpers';
import './ProfileInfoPanel.scss';

function VisibilityTable({ rows, visibility, onChange }) {
  const { t } = useTranslation();
  const multi = rows.length > 1;

  return (
    <div className="infoVisibility">
      <div className="infoVisibility__grid">
        {!multi && rows[0] ? (
          <>
            <div className="infoVisibility__labelCell">
              <span className="infoVisibility__label">{rows[0].label}</span>
            </div>
            <div className="infoVisibility__titleCell infoVisibility__titleCell--span">
              {t('profile.info.visibleTo')}
            </div>
          </>
        ) : (
          <>
            <div className="infoVisibility__labelCell" aria-hidden="true" />
            <div className="infoVisibility__titleCell infoVisibility__titleCell--span">
              {t('profile.info.visibleTo')}
            </div>
          </>
        )}

        <div className="infoVisibility__labelCell" aria-hidden="true" />
        <div className="infoVisibility__colHead">{t('profile.info.onlyMe')}</div>
        <div className="infoVisibility__colHead">{t('profile.info.everyone')}</div>

        {rows.map((row) => (
          <Fragment key={row.key}>
            <div className="infoVisibility__valueCell">
              {multi ? (
                <>
                  <span className="infoVisibility__label">{row.label}</span>
                  <span className="infoVisibility__value">{row.value}</span>
                </>
              ) : (
                <span className="infoVisibility__value">{row.value}</span>
              )}
            </div>
            <div className="infoVisibility__radioCell">
              <label className="infoVisibility__radio">
                <input
                  type="radio"
                  name={`vis-${row.key}`}
                  checked={visibility[row.key] === false}
                  onChange={() => onChange(row.key, false)}
                />
              </label>
            </div>
            <div className="infoVisibility__radioCell">
              <label className="infoVisibility__radio">
                <input
                  type="radio"
                  name={`vis-${row.key}`}
                  checked={visibility[row.key] !== false}
                  onChange={() => onChange(row.key, true)}
                />
              </label>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export default function ProfileInfoPanel({
  user,
  isOpen,
  editable = false,
  onUserUpdated,
  id,
}) {
  const { t } = useTranslation();
  const genderOptions = useGenderOptions();
  const maritalStatusOptions = useMaritalStatusOptions();

  const [editingSection, setEditingSection] = useState(null);
  const [draft, setDraft] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const visibility = useMemo(() => getProfileVisibility(user), [user]);
  const interests = useMemo(() => getUserInterests(user), [user]);
  const aboutText = getAboutText(user);

  const interestLabels = useMemo(
    () =>
      interests.map((value) => {
        const option = interestOptions.find((o) => o.value === value);
        return option?.label || value;
      }),
    [interests],
  );

  const genderLabel =
    genderOptions.find((o) => o.value === user?.gender)?.label ||
    user?.gender ||
    t('profile.notSpecified');

  const maritalLabel =
    maritalStatusOptions.find(
      (o) => o.value === (user?.maritalStatus || user?.relationshipStatus),
    )?.label ||
    user?.maritalStatus ||
    user?.relationshipStatus ||
    t('profile.notSpecified');

  const languagesText = formatLanguages(user?.languages) || t('profile.notSpecified');

  const {
    countryOptions,
    cityOptions,
    isCitiesLoading,
  } = useLocationOptions(draft.country?.value, draft.city?.value, setDraft);

  useEffect(() => {
    if (!isOpen) setEditingSection(null);
  }, [isOpen]);

  const startEdit = (section) => {
    setEditingSection(section);

    if (section === 'about') {
      setDraft({
        about: aboutText,
        visibilityAbout: visibility.about,
      });
      return;
    }

    if (section === 'interests') {
      setDraft({
        interests: interestOptions.filter((o) => interests.includes(o.value)),
        visibilityInterests: visibility.interests,
      });
      return;
    }

    if (section === 'personal') {
      setDraft({
        gender: user?.gender || null,
        maritalStatus:
          maritalStatusOptions.find(
            (o) => o.value === (user?.maritalStatus || user?.relationshipStatus),
          ) || null,
        nationality: user?.nationality || '',
        profession: user?.profession || user?.job || '',
        languagesText: formatLanguages(user?.languages),
        visibility: {
          maritalStatus: visibility.maritalStatus,
          nationality: visibility.nationality,
          profession: visibility.profession,
          languages: visibility.languages,
        },
      });
      return;
    }

    if (section === 'location') {
      setDraft({
        country: user?.country ? { value: user.country, label: user.country } : null,
        city: user?.city ? { value: user.city, label: user.city } : null,
        visibilityLocation: visibility.location,
      });
      return;
    }

    if (section === 'contacts') {
      setDraft({
        telegram: user?.telegram || '',
        instagram: user?.instagram || '',
        visibility: {
          telegram: visibility.telegram,
          instagram: visibility.instagram,
        },
      });
    }
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setDraft({});
  };

  const saveSection = async (buildPayload) => {
    try {
      setIsSaving(true);
      const payload = buildPayload();
      await profileApi.updateProfile(payload);
      await onUserUpdated?.();
      toast.success(t('profile.info.saved'));
      setEditingSection(null);
      setDraft({});
    } catch (err) {
      toast.error(getApiErrorMessage(err) || t('profile.editForm.errors.updateError'));
    } finally {
      setIsSaving(false);
    }
  };

  const friendsCount = user?.friendsCount ?? user?.friends?.length ?? 0;
  const giftsCount = user?.giftsCount ?? user?.stats?.giftsCount ?? 0;
  const postsCount = user?.postsCount ?? user?.stats?.postsCount ?? 0;

  const sectionProps = (section) => ({
    editable,
    isEditing: editingSection === section,
    isSaving,
    onEdit: () => startEdit(section),
    onCancel: cancelEdit,
  });

  return (
    <div className={`infoPanel ${isOpen ? 'isOpen' : ''}`} id={id}>
      <ProfileInfoSection
        title={t('profile.info.title')}
        icon={profileIcons.profileInfoUser}
        {...sectionProps('about')}
        onSave={() =>
          saveSection(() => ({
            about: draft.about?.trim() || '',
            profileVisibility: { about: draft.visibilityAbout !== false },
          }))
        }
        editContent={
          <>
            <textarea
              className="infoField infoField--textarea"
              value={draft.about || ''}
              onChange={(e) => setDraft((d) => ({ ...d, about: e.target.value }))}
              rows={4}
              maxLength={2000}
            />
            <VisibilityTable
              rows={[
                {
                  key: 'about',
                  label: t('profile.info.title'),
                  value: draft.about?.trim() || t('profile.notSpecified'),
                },
              ]}
              visibility={{ about: draft.visibilityAbout !== false }}
              onChange={(_, value) =>
                setDraft((d) => ({ ...d, visibilityAbout: value }))
              }
            />
          </>
        }
      >
        {aboutText ? <p className="infoSection__body infoSection__text">{aboutText}</p> : null}
      </ProfileInfoSection>

      <ProfileInfoSection
        title={t('profile.info.interests')}
        icon={profileIcons.profileInfoStar}
        {...sectionProps('interests')}
        onSave={() =>
          saveSection(() => ({
            interests: (draft.interests || []).map((item) => item.value),
            profileVisibility: {
              interests: draft.visibilityInterests !== false,
            },
          }))
        }
        editContent={
          <>
            <MultiSelect
              value={draft.interests || []}
              onChange={(val) => setDraft((d) => ({ ...d, interests: val }))}
              options={interestOptions}
              placeholder={t('profile.editForm.fields.interests')}
              maxItemsNote={t('profile.editForm.maxItemsNote', { max: 10 })}
            />
            <VisibilityTable
              rows={[
                {
                  key: 'interests',
                  label: t('profile.info.interests'),
                  value:
                    (draft.interests || []).map((item) => item.label).join(', ') ||
                    t('profile.info.noInterests'),
                },
              ]}
              visibility={{ interests: draft.visibilityInterests !== false }}
              onChange={(_, value) =>
                setDraft((d) => ({ ...d, visibilityInterests: value }))
              }
            />
          </>
        }
      >
        <div className="infoSection__body chips">
          {interestLabels.length ? (
            interestLabels.map((item) => (
              <span key={item} className="chip">
                {item}
              </span>
            ))
          ) : (
            <span className="chip">{t('profile.info.noInterests')}</span>
          )}
          {interestLabels.length > 4 ? (
            <span className="chip">+{interestLabels.length - 4}</span>
          ) : null}
        </div>
      </ProfileInfoSection>

      <ProfileInfoSection
        title={t('profile.info.personalInfo')}
        icon={profileIcons.profileInfoList}
        className="grid gridBlock"
        {...sectionProps('personal')}
        onSave={() =>
          saveSection(() => ({
            gender:
              draft.gender === 'MALE' || draft.gender === 'FEMALE'
                ? draft.gender
                : undefined,
            maritalStatus: draft.maritalStatus?.value || undefined,
            nationality: draft.nationality?.trim() || '',
            profession: draft.profession?.trim() || '',
            languages: parseLanguagesInput(draft.languagesText),
            profileVisibility: {
              maritalStatus: draft.visibility?.maritalStatus !== false,
              nationality: draft.visibility?.nationality !== false,
              profession: draft.visibility?.profession !== false,
              languages: draft.visibility?.languages !== false,
            },
          }))
        }
        editContent={
          <div className="infoEditGrid">
            <label className="infoField">
              <span>{t('profile.info.gender')}</span>
              <div className="infoField__gender">
                {genderOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`infoField__genderBtn${
                      draft.gender === opt.value ? ' is-active' : ''
                    }`}
                    onClick={() => setDraft((d) => ({ ...d, gender: opt.value }))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </label>

            <label className="infoField">
              <span>{t('profile.info.maritalStatus')}</span>
              <Select
                classNamePrefix="rs"
                placeholder={t('profile.editForm.select')}
                value={draft.maritalStatus}
                options={maritalStatusOptions}
                onChange={(opt) => setDraft((d) => ({ ...d, maritalStatus: opt }))}
              />
            </label>

            <label className="infoField">
              <span>{t('profile.info.nationality')}</span>
              <input
                className="infoField__input"
                value={draft.nationality || ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, nationality: e.target.value }))
                }
                maxLength={120}
              />
            </label>

            <label className="infoField">
              <span>{t('profile.info.profession')}</span>
              <input
                className="infoField__input"
                value={draft.profession || ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, profession: e.target.value }))
                }
                maxLength={200}
              />
            </label>

            <label className="infoField">
              <span>{t('profile.info.languages')}</span>
              <input
                className="infoField__input"
                value={draft.languagesText || ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, languagesText: e.target.value }))
                }
                placeholder={t('profile.info.languagesPlaceholder')}
              />
            </label>

            <VisibilityTable
              rows={[
                {
                  key: 'maritalStatus',
                  label: t('profile.info.maritalStatus'),
                  value: draft.maritalStatus?.label || t('profile.notSpecified'),
                },
                {
                  key: 'nationality',
                  label: t('profile.info.nationality'),
                  value: draft.nationality?.trim() || t('profile.notSpecified'),
                },
                {
                  key: 'profession',
                  label: t('profile.info.profession'),
                  value: draft.profession?.trim() || t('profile.notSpecified'),
                },
                {
                  key: 'languages',
                  label: t('profile.info.languages'),
                  value: draft.languagesText?.trim() || t('profile.notSpecified'),
                },
              ]}
              visibility={{
                maritalStatus: draft.visibility?.maritalStatus !== false,
                nationality: draft.visibility?.nationality !== false,
                profession: draft.visibility?.profession !== false,
                languages: draft.visibility?.languages !== false,
              }}
              onChange={(key, value) =>
                setDraft((d) => ({
                  ...d,
                  visibility: { ...d.visibility, [key]: value },
                }))
              }
            />
          </div>
        }
      >
        <div className="infoSection__body">
        <div className="gridRow">
          <span>{t('profile.info.gender')}</span>
          <span>{genderLabel}</span>
        </div>
        <div className="gridRow">
          <span>{t('profile.info.maritalStatus')}</span>
          <span>{maritalLabel}</span>
        </div>
        <div className="gridRow">
          <span>{t('profile.info.nationality')}</span>
          <span>{user?.nationality || t('profile.notSpecified')}</span>
        </div>
        <div className="gridRow">
          <span>{t('profile.info.profession')}</span>
          <span>{user?.profession || user?.job || t('profile.notSpecified')}</span>
        </div>
        <div className="gridRow">
          <span>{t('profile.info.languages')}</span>
          <span>{languagesText}</span>
        </div>
        </div>
      </ProfileInfoSection>

      <ProfileInfoSection
        title={t('profile.info.location')}
        icon={profileIcons.profileInfoLocation}
        className="grid gridBlock"
        {...sectionProps('location')}
        onSave={() =>
          saveSection(() => ({
            country: draft.country?.value || '',
            city: draft.city?.value || '',
            profileVisibility: {
              location: draft.visibilityLocation !== false,
            },
          }))
        }
        editContent={
          <div className="infoEditGrid">
            <label className="infoField">
              <span>{t('profile.info.country')}</span>
              <Select
                classNamePrefix="rs"
                placeholder={t('profile.editForm.fields.country')}
                value={draft.country}
                options={countryOptions}
                onChange={(opt) =>
                  setDraft((d) => ({ ...d, country: opt, city: null }))
                }
              />
            </label>
            <label className="infoField">
              <span>{t('profile.info.city')}</span>
              <Select
                classNamePrefix="rs"
                placeholder={t('profile.editForm.fields.city')}
                value={draft.city}
                options={cityOptions}
                isDisabled={!draft.country}
                isLoading={isCitiesLoading}
                onChange={(opt) => setDraft((d) => ({ ...d, city: opt }))}
              />
            </label>
            <VisibilityTable
              rows={[
                {
                  key: 'location',
                  label: t('profile.info.location'),
                  value: [draft.city?.label, draft.country?.label]
                    .filter(Boolean)
                    .join(', ') || t('profile.notSpecified'),
                },
              ]}
              visibility={{ location: draft.visibilityLocation !== false }}
              onChange={(_, value) =>
                setDraft((d) => ({ ...d, visibilityLocation: value }))
              }
            />
          </div>
        }
      >
        <div className="infoSection__body">
        <div className="gridRow">
          <span>{t('profile.info.country')}</span>
          <span>{user?.country || t('profile.notSpecified')}</span>
        </div>
        <div className="gridRow">
          <span>{t('profile.info.city')}</span>
          <span>{user?.city || t('profile.notSpecified')}</span>
        </div>
        </div>
      </ProfileInfoSection>

      <ProfileInfoSection
        title={t('profile.info.socialActivity')}
        icon={profileIcons.profileInfoSocial}
        editable={editable}
        canEdit={false}
      >
        <div className="stats">
          <div className="statCard">
            <img src={profileIcons.profileInfoPeople} alt="" />
            <p className="statText">{friendsCount}</p>
            <p className="statText">{t('profile.info.friendsStat')}</p>
          </div>
          <div className="statCard">
            <img src={profileIcons.profileInfoVip} alt="" />
            <span className="statText">{t('profile.info.vipStatus')}</span>
            <p className="statText">{t('profile.info.status')}</p>
          </div>
          <div className="statCard">
            <img src={profileIcons.profileInfoPresent} alt="" />
            <p className="statText">{giftsCount}</p>
            <p className="statText">{t('profile.info.giftsStat')}</p>
          </div>
          <div className="statCard">
            <img src={profileIcons.profileInfoPencil} alt="" />
            <p className="statText">{postsCount}</p>
            <p className="statText">{t('profile.info.postsStat')}</p>
          </div>
        </div>
      </ProfileInfoSection>

      <ProfileInfoSection
        title={t('profile.info.contacts')}
        icon={profileIcons.profileInfoPhone}
        {...sectionProps('contacts')}
        onSave={() =>
          saveSection(() => ({
            telegram: draft.telegram?.trim() || '',
            instagram: draft.instagram?.trim() || '',
            profileVisibility: {
              telegram: draft.visibility?.telegram !== false,
              instagram: draft.visibility?.instagram !== false,
            },
          }))
        }
        editContent={
          <>
            <label className="infoField">
              <span>Telegram</span>
              <input
                className="infoField__input"
                value={draft.telegram || ''}
                onChange={(e) => setDraft((d) => ({ ...d, telegram: e.target.value }))}
                maxLength={200}
              />
            </label>
            <label className="infoField">
              <span>Instagram</span>
              <input
                className="infoField__input"
                value={draft.instagram || ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, instagram: e.target.value }))
                }
                maxLength={200}
              />
            </label>
            <VisibilityTable
              rows={[
                {
                  key: 'telegram',
                  label: 'Telegram',
                  value: draft.telegram?.trim() || t('profile.notSpecified'),
                },
                {
                  key: 'instagram',
                  label: 'Instagram',
                  value: draft.instagram?.trim() || t('profile.notSpecified'),
                },
              ]}
              visibility={{
                telegram: draft.visibility?.telegram !== false,
                instagram: draft.visibility?.instagram !== false,
              }}
              onChange={(key, value) =>
                setDraft((d) => ({
                  ...d,
                  visibility: { ...d.visibility, [key]: value },
                }))
              }
            />
          </>
        }
      >
        <div className="contacts">
          <button type="button" className="contactsText" disabled={!user?.telegram}>
            <img src={profileIcons.profileInfoTelegram} alt="" />
            Telegram
          </button>
          <button type="button" className="contactsText" disabled={!user?.instagram}>
            <img src={profileIcons.profileInfoInstagram} alt="" />
            Instagram
          </button>
          <button type="button" className="contactsText" disabled>
            <img src={profileIcons.profileInfoLock} alt="" />
            {t('profile.info.emailHidden')}
          </button>
        </div>
      </ProfileInfoSection>
    </div>
  );
}
