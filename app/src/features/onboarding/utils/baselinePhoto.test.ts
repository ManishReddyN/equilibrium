import {describe, expect, it} from '@jest/globals';
import type {ImagePickerResponse} from 'react-native-image-picker';

import {
  BASELINE_PHOTO_MAX_DIMENSION,
  BASELINE_PHOTO_PICKER_OPTIONS,
  baselinePhotoStoragePath,
  resolveBaselinePhotoPickerResponse,
} from './baselinePhoto';

describe('baselinePhotoStoragePath', () => {
  it('joins household and chore id with the household_id/chore_id.jpg convention', () => {
    expect(baselinePhotoStoragePath('house-1', 'chore-1')).toBe('house-1/chore-1.jpg');
  });
});

describe('BASELINE_PHOTO_PICKER_OPTIONS', () => {
  it('caps resize dimensions at BASELINE_PHOTO_MAX_DIMENSION', () => {
    expect(BASELINE_PHOTO_PICKER_OPTIONS.maxWidth).toBe(BASELINE_PHOTO_MAX_DIMENSION);
    expect(BASELINE_PHOTO_PICKER_OPTIONS.maxHeight).toBe(BASELINE_PHOTO_MAX_DIMENSION);
  });

  it('requests photo media only, never saving a copy to the camera roll', () => {
    expect(BASELINE_PHOTO_PICKER_OPTIONS.mediaType).toBe('photo');
    expect(BASELINE_PHOTO_PICKER_OPTIONS.saveToPhotos).toBe(false);
  });
});

describe('resolveBaselinePhotoPickerResponse', () => {
  it('reports cancellation', () => {
    expect(resolveBaselinePhotoPickerResponse({didCancel: true})).toEqual({status: 'cancelled'});
  });

  it('reports a native error with its message', () => {
    const response: ImagePickerResponse = {errorCode: 'camera_unavailable', errorMessage: 'No camera found.'};
    expect(resolveBaselinePhotoPickerResponse(response)).toEqual({
      status: 'error',
      message: 'No camera found.',
    });
  });

  it('falls back to a generic message when an error has no message', () => {
    const response: ImagePickerResponse = {errorCode: 'others'};
    expect(resolveBaselinePhotoPickerResponse(response)).toEqual({
      status: 'error',
      message: 'Could not access the camera.',
    });
  });

  it('reports an error when there are no assets', () => {
    expect(resolveBaselinePhotoPickerResponse({assets: []})).toEqual({
      status: 'error',
      message: 'No photo was captured.',
    });
  });

  it('reports an error when the first asset has no uri', () => {
    expect(resolveBaselinePhotoPickerResponse({assets: [{fileName: 'a.jpg'}]})).toEqual({
      status: 'error',
      message: 'No photo was captured.',
    });
  });

  it('resolves a successful capture, defaulting fileName/contentType when absent', () => {
    expect(resolveBaselinePhotoPickerResponse({assets: [{uri: 'file:///tmp/a.jpg'}]})).toEqual({
      status: 'success',
      asset: {uri: 'file:///tmp/a.jpg', fileName: 'baseline.jpg', contentType: 'image/jpeg'},
    });
  });

  it('resolves a successful capture, preserving provided fileName/contentType', () => {
    const response: ImagePickerResponse = {
      assets: [{uri: 'file:///tmp/b.png', fileName: 'b.png', type: 'image/png'}],
    };
    expect(resolveBaselinePhotoPickerResponse(response)).toEqual({
      status: 'success',
      asset: {uri: 'file:///tmp/b.png', fileName: 'b.png', contentType: 'image/png'},
    });
  });
});
