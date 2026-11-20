import { DownloadSimple } from '@phosphor-icons/react';
import { copy } from '../copy.ts';
import { androidAppVersion } from '../device.ts';

declare const __ANDROID_APP_VERSION__: number;

/**
 * Inside an older Android app (installed from the site, so it never updates itself): a note with
 * the new one's download. Installing it over the old one keeps everything.
 */
export function AppUpdateNote() {
  const v = androidAppVersion();
  if (!v || typeof __ANDROID_APP_VERSION__ !== 'number' || v >= __ANDROID_APP_VERSION__) return null;
  return (
    <div className="note" role="status">
      <DownloadSimple aria-hidden />
      <span>
        {copy.appUpdate.text}{' '}
        <a href={`${import.meta.env.BASE_URL}downloads/wish-list-helper.apk`} download><b>{copy.appUpdate.download}</b></a>
      </span>
    </div>
  );
}
