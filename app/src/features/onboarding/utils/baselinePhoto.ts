/**
 * Pure logic for baseline photo capture (plan section 4.4): the
 * `react-native-image-picker` options used to resize on-device to a max of
 * 1600px (the plan explicitly says the picker's own resize is "sufficient" --
 * no separate `react-native-image-resizer` dependency), the
 * `baseline-photos/{household_id}/{chore_id}.jpg` storage path convention, and
 * a response-normalizer that turns the picker's callback-style
 * `ImagePickerResponse` into a discriminated union the screen can switch on.
 * Extracted so this is unit-testable without mounting the screen or invoking
 * the (jest-mocked) native module -- same split as `../../rotation/utils/carouselMath.ts`.
 */
import type {CameraOptions, ImagePickerResponse} from 'react-native-image-picker';

/** Client-side resize cap (plan section 4.4: "resize to max 1600px"). */
export const BASELINE_PHOTO_MAX_DIMENSION = 1600;

/** Options passed to `launchCamera` when capturing a chore's baseline photo. */
export const BASELINE_PHOTO_PICKER_OPTIONS: CameraOptions = {
  mediaType: 'photo',
  maxWidth: BASELINE_PHOTO_MAX_DIMENSION,
  maxHeight: BASELINE_PHOTO_MAX_DIMENSION,
  quality: 0.8,
  saveToPhotos: false,
};

/** Storage path convention enforced server-side by the `baseline_photos_*` RLS policies. */
export function baselinePhotoStoragePath(householdId: string, choreId: string): string {
  return `${householdId}/${choreId}.jpg`;
}

export interface BaselinePhotoAsset {
  uri: string;
  fileName: string;
  contentType: string;
}

export type BaselinePhotoPickResult =
  | {status: 'cancelled'}
  | {status: 'error'; message: string}
  | {status: 'success'; asset: BaselinePhotoAsset};

/**
 * Normalizes `launchCamera`'s response into a discriminated union: the raw
 * response can represent a user cancellation, a native error (permission
 * denied, camera unavailable, ...), or -- even without `didCancel`/`errorCode`
 * -- an empty `assets` array/missing `uri`, which the picker's own types
 * allow but which the caller must still treat as failure.
 */
export function resolveBaselinePhotoPickerResponse(
  response: ImagePickerResponse,
): BaselinePhotoPickResult {
  if (response.didCancel) {
    return {status: 'cancelled'};
  }
  if (response.errorCode) {
    return {status: 'error', message: response.errorMessage ?? 'Could not access the camera.'};
  }
  const asset = response.assets?.[0];
  if (!asset?.uri) {
    return {status: 'error', message: 'No photo was captured.'};
  }
  return {
    status: 'success',
    asset: {
      uri: asset.uri,
      fileName: asset.fileName ?? 'baseline.jpg',
      contentType: asset.type ?? 'image/jpeg',
    },
  };
}
