import { useSettingsStore } from '@stores';
import { i18n } from '@utils';

export const useTranslation = () => {
  const language = useSettingsStore((s) => s.language);
  return i18n(language).t;
};
